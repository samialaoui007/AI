/**
 * نقطة نهاية MCP — Streamable HTTP (مواصفات Model Context Protocol)
 *
 * POST /mcp : JSON-RPC (initialize | tools/list | tools/call | ping | notifications/*)
 *   - tools/call يُبَث عبر SSE مع:
 *       • notifications/progress أثناء التوليد (لو أرسل العميل progressToken)
 *       • تعليقات keepalive كل 15 ثانية حتى لا تنقطع العملية في الفيديو الطويل
 *       • الاستجابة النهائية ثم الإغلاق
 * GET  /mcp : 405 (لا نوفر قنوات server-initiated)
 * DELETE /mcp : 200 (إنهاء الجلسة)
 * حماية اختيارية: إن ضُبط MCP_ACCESS_TOKEN يلزم Authorization: Bearer <token>
 */
import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { TOOLS, SERVER_INFO, SERVER_INSTRUCTIONS, callTool, type ToolCallResult } from "@/lib/mcp/tools";
import type { ProgressCb } from "@/lib/generator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** على Vercel: أقصى مدة تنفيذ للدالة (استدعاءات الدمج/الفيديو الطويلة تحتاج وقتًا) */
export const maxDuration = 300;

const SUPPORTED_PROTOCOL_VERSIONS = ["2024-11-05", "2025-03-26", "2025-06-18"] as const;
const KEEPALIVE_MS = 15_000;

declare global {
  var __mcpSessions: Map<string, string> | undefined;
}
function sessions(): Map<string, string> {
  if (!globalThis.__mcpSessions) globalThis.__mcpSessions = new Map();
  return globalThis.__mcpSessions;
}

/* ─────────────────────────── أدوات JSON-RPC ─────────────────────────── */

interface RpcRequest {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
}

function rpcResult(id: RpcRequest["id"], result: unknown) {
  return { jsonrpc: "2.0", id, result };
}
function rpcError(id: RpcRequest["id"], code: number, message: string, data?: unknown) {
  return { jsonrpc: "2.0", id, error: { code, message, ...(data !== undefined ? { data } : {}) } };
}
const ERR_PARSE = -32700;
const ERR_INVALID_REQUEST = -32600;
const ERR_METHOD_NOT_FOUND = -32601;
const ERR_INVALID_PARAMS = -32602;
const ERR_INTERNAL = -32603;

function jsonResponse(payload: unknown, headers: Record<string, string> = {}, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

function checkAuth(req: NextRequest): boolean {
  const token = process.env.MCP_ACCESS_TOKEN?.trim();
  if (!token) return true;
  const header = req.headers.get("authorization") ?? "";
  return header === `Bearer ${token}`;
}

function clientAcceptsSse(req: NextRequest): boolean {
  return (req.headers.get("accept") ?? "").includes("text/event-stream");
}

/* ─────────────────────────── المعالجات ─────────────────────────── */

function handleInitialize(msg: RpcRequest, req: NextRequest): Response {
  const requested = String((msg.params as Record<string, unknown> | undefined)?.protocolVersion ?? "");
  const protocolVersion = (SUPPORTED_PROTOCOL_VERSIONS as readonly string[]).includes(requested)
    ? requested
    : SUPPORTED_PROTOCOL_VERSIONS[SUPPORTED_PROTOCOL_VERSIONS.length - 1];

  const sessionId = randomUUID();
  sessions().set(sessionId, protocolVersion);

  return jsonResponse(
    rpcResult(msg.id, {
      protocolVersion,
      capabilities: {
        tools: { listChanged: false },
        logging: {},
      },
      serverInfo: { ...SERVER_INFO },
      instructions: SERVER_INSTRUCTIONS,
    }),
    { "Mcp-Session-Id": sessionId }
  );
}

function handleToolsList(msg: RpcRequest): Response {
  return jsonResponse(
    rpcResult(msg.id, {
      tools: TOOLS.map((t) => ({
        name: t.name,
        title: t.title,
        description: t.description,
        inputSchema: t.inputSchema,
      })),
    })
  );
}

/** tools/call — بث SSE مع إشعارات التقدم و keepalive */
async function handleToolsCall(msg: RpcRequest, req: NextRequest): Promise<Response> {
  const params = (msg.params ?? {}) as {
    name?: string;
    arguments?: Record<string, unknown>;
    _meta?: { progressToken?: string | number };
  };
  const toolName = String(params.name ?? "");
  const toolArgs = params.arguments ?? {};
  const progressToken = params._meta?.progressToken;
  const sse = clientAcceptsSse(req);
  const sessionId = req.headers.get("mcp-session-id") ?? "";

  if (!sse) {
    // عميل لا يقبل SSE: نشغّل الأداة ونعيد JSON مباشرة (بدون إشعارات تقدم)
    try {
      const result = await callTool(toolName, toolArgs, { signal: req.signal });
      return jsonResponse(rpcResult(msg.id, result));
    } catch (err) {
      return jsonResponse(rpcError(msg.id, ERR_INTERNAL, err instanceof Error ? err.message : String(err)));
    }
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const send = (obj: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`event: message\ndata: ${JSON.stringify(obj)}\n\n`));
        } catch {
          closed = true;
        }
      };
      const keepalive = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`: keepalive\n\n`));
        } catch {
          closed = true;
        }
      }, KEEPALIVE_MS);

      const cleanup = () => {
        clearInterval(keepalive);
        if (!closed) {
          closed = true;
          try {
            controller.close();
          } catch { /* مغلق مسبقًا */ }
        }
      };
      req.signal.addEventListener("abort", cleanup, { once: true });

      // إشعارات التقدم — فقط لو طلب العميل progressToken
      const sendProgress: ProgressCb | undefined = progressToken === undefined
        ? undefined
        : (info) => {
            send({
              jsonrpc: "2.0",
              method: "notifications/progress",
              params: {
                progressToken,
                progress: info.progress,
                ...(info.total !== undefined ? { total: info.total } : {}),
                ...(info.message ? { message: `${info.message}${info.percent !== undefined ? ` (${info.percent}%)` : ""}` } : {}),
              },
            });
          };

      try {
        const result: ToolCallResult = await callTool(toolName, toolArgs, { sendProgress, signal: req.signal });
        send(rpcResult(msg.id, result));
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (!req.signal.aborted) {
          send(rpcError(msg.id, ERR_INTERNAL, message));
        }
      } finally {
        cleanup();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      ...(sessionId ? { "Mcp-Session-Id": sessionId } : {}),
    },
  });
}

async function handleSingleMessage(msg: RpcRequest, req: NextRequest): Promise<Response> {
  if (msg.jsonrpc !== "2.0" || typeof msg.method !== "string" || !msg.method) {
    return jsonResponse(rpcError(msg.id ?? null, ERR_INVALID_REQUEST, "Invalid JSON-RPC 2.0 request"), {}, 400);
  }

  // الإشعارات بلا استجابة (202 Accepted)
  if (msg.id === undefined || msg.id === null) {
    return new Response(null, { status: 202 });
  }

  switch (msg.method) {
    case "initialize":
      return handleInitialize(msg, req);
    case "ping":
      return jsonResponse(rpcResult(msg.id, {}));
    case "tools/list":
      return handleToolsList(msg);
    case "tools/call": {
      const params = (msg.params ?? {}) as { name?: unknown; arguments?: unknown };
      if (typeof params.name !== "string") {
        return jsonResponse(rpcError(msg.id, ERR_INVALID_PARAMS, "params.name is required"), {}, 400);
      }
      return handleToolsCall(msg, req);
    }
    default:
      return jsonResponse(
        rpcError(msg.id, ERR_METHOD_NOT_FOUND, `Method not found: ${msg.method}`, { supported: ["initialize", "ping", "tools/list", "tools/call"] })
      );
  }
}

/* ─────────────────────────── نقاط الدخول ─────────────────────────── */

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return jsonResponse({ error: "unauthorized: set MCP_ACCESS_TOKEN on the server and send Authorization: Bearer <token>" }, {}, 401);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(rpcError(null, ERR_PARSE, "Parse error: body must be JSON"), {}, 400);
  }

  // دعم الدفعات (مواصفة 2025-03-26)
  if (Array.isArray(body)) {
    const responses: unknown[] = [];
    for (const item of body) {
      const res = await handleSingleMessage(item as RpcRequest, req);
      if (res.status === 200 && res.headers.get("content-type")?.includes("application/json")) {
        responses.push(await res.json());
      }
    }
    return jsonResponse(responses);
  }

  return handleSingleMessage(body as RpcRequest, req);
}

export async function GET() {
  return jsonResponse(
    { error: "Method Not Allowed: this server does not offer server-initiated SSE streams. Use POST for JSON-RPC." },
    { Allow: "POST, DELETE" },
    405
  );
}

export async function DELETE(req: NextRequest) {
  if (!checkAuth(req)) return jsonResponse({ error: "unauthorized" }, {}, 401);
  const sessionId = req.headers.get("mcp-session-id");
  if (sessionId) sessions().delete(sessionId);
  return new Response(null, { status: 200 });
}
