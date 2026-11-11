import {NextRequest,NextResponse} from 'next/server';import {authorized,deny} from '@/lib/auth';import {listRecentTasks,taskStats} from '@/lib/turso';import {publicTask} from '@/lib/format';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(req:NextRequest){if(!authorized(req))return deny();const tasks=await listRecentTasks(25);return NextResponse.json({stats:await taskStats(),tasks:tasks.map(publicTask)})}
