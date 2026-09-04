import { NextRequest, NextResponse } from "next/server";import { companyNews } from "@/lib/providers/news";
const ALLOWED=new Set(["BMNR","BMNU","SOXL","SOXS","NVDA","AMD","AVGO","TSM"]);
export async function GET(req:NextRequest){const s=req.nextUrl.searchParams.get("symbol")?.toUpperCase()??"";if(!ALLOWED.has(s))return NextResponse.json({error:"unsupported symbol"},{status:400});return NextResponse.json(await companyNews(s))}
