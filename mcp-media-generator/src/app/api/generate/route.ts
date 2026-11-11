import {NextRequest,NextResponse} from 'next/server';import {authorized,deny} from '@/lib/auth';import {runGeneration} from '@/lib/orchestrator';import {publicTask} from '@/lib/format';
export const runtime='nodejs';
export async function POST(req:NextRequest){if(!authorized(req))return deny();try{const v=await req.json();if(!['image','video'].includes(v.type))throw Error('نوع غير صالح');const t=await runGeneration({...v,wait_seconds:0});return NextResponse.json(publicTask(t))}catch(e){return NextResponse.json({error:String(e instanceof Error?e.message:e)},{status:400})}}
