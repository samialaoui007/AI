import {NextResponse} from 'next/server';
import {dbHealthy} from '@/lib/turso';
import {MODELS} from '@/lib/models';
import {mergerHealthy} from '@/lib/merger';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(){let db=false;try{db=await dbHealthy()}catch{}return NextResponse.json({ok:db,database:db?'turso-connected':'disconnected',mcpEndpoint:'/mcp',models:MODELS.map(({canonical,type,providers})=>({canonical,type,providers})),merger:{configured:!!process.env.MERGER_API_BASE,healthy:await mergerHealthy()},authRequired:!!process.env.MCP_ACCESS_TOKEN},{status:db?200:503})}
