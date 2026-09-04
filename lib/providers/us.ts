import type { MarketQuote } from "@/lib/types";
import { alpacaConfigured, alpacaQuote } from "./alpaca";
export const US_SYMBOLS=["BMNU","SOXL","SOXS","SOXX","NVDA","AMD","AVGO","TSM"] as const;
export async function usQuote(symbol:string):Promise<MarketQuote>{
  const provider=(process.env.US_MARKET_PROVIDER||"alpaca").toLowerCase();
  if(provider==="alpaca"&&alpacaConfigured())return alpacaQuote(symbol);
  throw new Error("US_MARKET_NOT_CONFIGURED");
}
