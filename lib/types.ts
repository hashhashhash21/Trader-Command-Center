export type SessionStatus = "LIVE"|"DELAYED"|"STALE"|"CLOSED"|"PRE-MARKET"|"REGULAR"|"AFTER-HOURS"|"DATA UNAVAILABLE";
export type Action = "BUY BIAS"|"WAIT"|"SELL/AVOID";

export interface Bar { time:number; open:number; high:number; low:number; close:number; volume:number; vwap?:number|null; }
export interface MarketQuote {
  symbol:string; price:number|null; bid:number|null; ask:number|null; open:number|null; high:number|null; low:number|null;
  previousClose:number|null; volume:number|null; vwap:number|null; timestamp:string|null; sessionStatus:SessionStatus;
  source:string; delayed:boolean; delayMinutes:number|null; change1h?:number|null; change24h?:number|null; bars?:Bar[];
}
export interface DerivativesSnapshot {
  symbol:string; openInterest:number|null; openInterestChange:number|null; takerBuyVolume:number|null; takerSellVolume:number|null;
  takerRatio:number|null; fundingRate:number|null; longShortRatio:number|null;
}
export interface TechnicalSnapshot {
  symbol:string; direction:"UP"|"DOWN"|"FLAT"|"UNAVAILABLE"; confidence:number|null; support:number|null; resistance:number|null;
  pivot:number|null; breakoutTrigger:number|null; breakdownTrigger:number|null; nextTarget:number|null; invalidation:number|null;
  entryLow:number|null; entryHigh:number|null; takeProfitLow:number|null; takeProfitHigh:number|null; risk:"LOW"|"MODERATE"|"HIGH"|"VERY HIGH"|"EXTREME"|"—";
  action:Action; atr:number|null; rsi:number|null; ema9:number|null; ema20:number|null; ema50:number|null;
}
export interface NewsSnapshot { score:number|null; headlines:number; source:string; items:{headline:string;url?:string}[]; }
export interface AssetSnapshot {
  symbol:string; label:string; quote:MarketQuote; technical:TechnicalSnapshot; derivatives?:DerivativesSnapshot|null; news?:NewsSnapshot|null;
  productBadge?:string; context?:Record<string, unknown>;
}
export interface HealthItem { name:string; state:"LIVE"|"IEX"|"DEGRADED"|"NOT CONFIGURED"|"—"; latencyMs:number|null; detail?:string; }
export interface DashboardSnapshot {
  generatedAt:string; saudiTime:string; usSession:string; assets:AssetSnapshot[]; contextAssets:AssetSnapshot[]; health:HealthItem[];
}
