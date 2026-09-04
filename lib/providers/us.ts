import type {MarketQuote} from "@/lib/types";
import {alpacaConfigured,alpacaQuote} from "./alpaca";
import {twelveConfigured,twelveQuote} from "./twelveData";
import {finnhubConfigured,finnhubQuote} from "./finnhub";
import {alphaConfigured,alphaQuote} from "./alphaVantage";

export const US_SYMBOLS=["BMNU","SOXL","SOXS","SOXX","NVDA","AMD","AVGO","TSM"] as const;
type Provider="alpaca"|"twelvedata"|"finnhub"|"alphavantage";
const enabled=(p:Provider)=>p==="alpaca"?alpacaConfigured():p==="twelvedata"?twelveConfigured():p==="finnhub"?finnhubConfigured():alphaConfigured();
const call=(p:Provider,s:string)=>p==="alpaca"?alpacaQuote(s):p==="twelvedata"?twelveQuote(s):p==="finnhub"?finnhubQuote(s):alphaQuote(s);

export async function usQuote(symbol:string):Promise<MarketQuote>{
 const first=((process.env.US_MARKET_PROVIDER||"alpaca").toLowerCase() as Provider),fallbacks=(process.env.US_MARKET_FALLBACKS||"twelvedata,finnhub,alphavantage").split(",").map(x=>x.trim().toLowerCase() as Provider);
 const order=[first,...fallbacks.filter(x=>x!==first)].filter((x,i,a)=>a.indexOf(x)===i);
 let last:unknown=null;
 for(const p of order){if(!["alpaca","twelvedata","finnhub","alphavantage"].includes(p)||!enabled(p))continue;try{return await call(p,symbol)}catch(e){last=e}}
 throw last instanceof Error?last:new Error("US_MARKET_NOT_CONFIGURED");
}
