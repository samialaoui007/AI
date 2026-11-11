import {NextRequest,NextResponse} from 'next/server';
import {timingSafeEqual} from 'node:crypto';
function equal(a:string,b:string){const ab=Buffer.from(a),bb=Buffer.from(b);return ab.length===bb.length&&timingSafeEqual(ab,bb)}
export function authorized(req:NextRequest,env:'ADMIN_TOKEN'|'MCP_ACCESS_TOKEN'='ADMIN_TOKEN'){const secret=process.env[env];return !!secret&&equal(req.headers.get('authorization')||'',`Bearer ${secret}`)}
export function deny(){return NextResponse.json({error:'غير مصرح. أضف رمز المسؤول في Authorization Bearer.'},{status:401})}
