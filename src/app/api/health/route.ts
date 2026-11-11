import {NextResponse} from 'next/server';
export function GET(){return NextResponse.json({status:'setup-incomplete',message:'The deployment is live, but the full media backend is not installed.'})}
