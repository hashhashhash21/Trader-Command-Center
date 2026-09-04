import { NextRequest, NextResponse } from "next/server";
import { US_SYMBOLS, usQuote } from "@/lib/providers/us";
export const runtime="nodejs";
export async function GET(req:NextRequest){
  const s=req.nextUrl.searchParams.get("symbol")?.toUpperCase()??""; if(!US_SYMBOLS.includes(s as any))return NextResponse.json({error:"unsupported symbol"},{status:400});
  try{return NextResponse.json(await usQuote(s))}catch(e){return NextResponse.json({available:false,symbol:s,error:e instanceof Error?e.message:"unavailable"},{status:200})}
}
