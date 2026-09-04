import { NextRequest, NextResponse } from "next/server";
import { bmnrSnapshot, cryptoSnapshot } from "@/lib/providers/binance";
export const runtime="nodejs";
export async function GET(req:NextRequest){
  const s=req.nextUrl.searchParams.get("symbol")?.toUpperCase();
  try{
    if(s==="BTCUSDT"||s==="ETHUSDT")return NextResponse.json(await cryptoSnapshot(s));
    if(s==="BMNRB")return NextResponse.json(await bmnrSnapshot());
    return NextResponse.json({error:"unsupported symbol"},{status:400});
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"unavailable"},{status:503})}
}
