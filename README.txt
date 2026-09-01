Trader Command Center v73

Production architecture:
- v73.html: read-only production dashboard driven by canonical server snapshots
- lib/engine.js: canonical EMA/RSI/MTF/state/regime/provenance engine
- api/snapshot.js: read-only canonical market snapshot for the browser
- api/market.js: allowlisted market-data facade; futures data uses the service-role-only Supabase DB HTTP transport when Vercel upstream access is blocked
- api/consensus.js: Binance + Bybit derivatives confirmation through the protected database transport
- api/observe.js: authenticated server collector using canonical-v73; BTCUSDT and ETHUSDT only
- api/evaluate.js: authenticated exact-horizon evaluator using nearest Binance Futures 1-minute exchange candle
- api/validation.js: futures-provenance-only directional validation with Wilson intervals and sample guardrails
- api/calibration.js: futures-provenance-only factor, consensus, regime and chronological walk-forward analysis
- api/health.js: provider, consensus, database, collector freshness and engine health
- lib/analytics.js: shared validation statistics with null-safe parsing
- tests/analytics.test.js and tests/engine.test.js: regression tests
- .github/workflows/ci.yml: Node tests and API syntax checks

Data path:
Supabase cron -> authenticated /api/observe -> canonical-v73 engine -> futures-validated observations -> Supabase.
Supabase cron -> authenticated /api/evaluate -> nearest exchange 1-minute horizon candle -> evaluated outcomes.
Browser -> /api/snapshot for state/evidence/regime/MTF. Browser candles are display-only and never recompute canonical state.

Provider integrity:
- Public spot fallback is never accepted as futures validation evidence.
- Futures provenance requires four futures candle sources plus a validated futures ticker/data class.
- Binance/Bybit consensus is normalized in basis-point terms; venue open interest is not aggregated across differing contract specifications.
- The obsolete Supabase Edge Function provider path is deprecated; production uses the service-role-only database RPC transport.

Guardrails:
- Missing/null outcomes are never converted to zero returns.
- Directional accuracy is hidden below 20 directional samples.
- EARLY CALIBRATION requires at least 50 directional samples.
- CALIBRATION READY requires at least 150 directional samples plus ready chronological walk-forward evidence.
- Calibration remains descriptive; weights are not learned until the clean sample is sufficient for train/freeze/test evaluation.

The dashboard reports descriptive market evidence and historical validation statistics, not guaranteed outcomes or trade instructions.
