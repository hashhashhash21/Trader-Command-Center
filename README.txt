Trader Command Center v65 — Vercel Production Package

Files:
- index.html: dashboard
- api/market.js: same-origin Vercel proxy for public Binance market data
- vercel.json: Vercel function/headers configuration

Authentication:
- No Binance API key required.
- No user login required for public market data.
- Vercel account authentication is only needed to deploy/manage the project.
- For public access, Vercel Deployment Protection should not require authentication on Production.

Data path:
Browser -> /api/market -> Binance public REST API
Fallback: Browser -> Binance direct REST
WebSocket: Binance direct WS, with REST fallback.
