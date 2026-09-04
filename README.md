# Market Intelligence Dashboard

Production-oriented intraday market-monitoring and technical-scenario dashboard built with Next.js App Router, TypeScript, React and Tailwind CSS.

## Local installation

1. Install Node.js 20 or newer.
2. Run npm install.
3. Copy .env.example to .env.local.
4. Run npm run dev.
5. Open http://localhost:3000.

The application boots without paid providers. BTC and ETH use Binance public Futures data. BMNRB is discovered from Binance exchange metadata and displays DATA UNAVAILABLE when it cannot be found. U.S. equities display DATA UNAVAILABLE until a provider is configured.

## Alpaca

Set ALPACA_API_KEY, ALPACA_API_SECRET and US_MARKET_PROVIDER=alpaca.

The default adapter requests Alpaca IEX. The UI identifies the source as Alpaca IEX. IEX is not a consolidated SIP quote and must not be described as one.

## Optional providers

FINNHUB_API_KEY enables optional recent company news. Environment placeholders are included for Twelve Data and Alpha Vantage for future fallback adapters. Missing providers do not crash the dashboard.

## Free-feed limitations

Free quotas and feed availability can change. Provider-aware caching, fail-closed states and source/freshness labels are used. Delayed or stale quotes are never labeled LIVE. News sentiment is only calculated when at least three recent headlines are available.

## Leveraged products

BMNU is the T-REX 2X Long BMNR Daily Target ETF. Its target is daily. Daily reset, leverage, path dependency and volatility drag mean multi-day returns should not be inferred by multiplying BMNR or BMNRB returns by two.

SOXL and SOXS are leveraged/inverse semiconductor products with daily reset. Compounding, volatility and path dependency mean multi-day returns are not guaranteed to equal a simple plus or minus three-times sector move. SOXX plus NVDA, AMD, AVGO and TSM are used as sector context.

## Technical engine

Technical levels are deterministic and are not LLM-generated. The engine uses available 5-minute candles, swing structure, VWAP, EMA 9/20/50, RSI 14, ATR, volume and optional order-flow, sector and news inputs. Missing categories are excluded.

Confidence is technical scenario confidence, not probability of profit or expected return.

Downside distance = (Current - Support) / Current × 100.
Upside distance = (Resistance - Current) / Current × 100.

These are distances to technical levels, not probabilities.

## Hourly snapshots

The default implementation stores compact hourly snapshots in browser localStorage and compares the current hour with the previous hour. The dashboard remains usable without Supabase.

## Vercel deployment

Push this branch to GitHub, import the repository in Vercel, add only the provider environment variables you intend to use, and deploy with the default Node.js runtime. Verify npm run build before production promotion.

Do not expose provider secrets in NEXT_PUBLIC variables.

## Security

Provider credentials are read only in server-side code. Public API routes validate symbols against allowlists. The application does not expose a generic third-party proxy.

## Attribution

Crypto: Binance public Spot/Futures APIs.
U.S. equities when configured: Alpaca IEX.
Optional news: Finnhub.
