Trader Command Center v71.1

Production architecture:
- v71.html: read-only production dashboard
- api/market.js: allowlisted market-data proxy with explicit fallbacks
- api/consensus.js: simultaneous Binance + Bybit derivatives confirmation
- api/observe.js: secured server-side observation collector
- api/validation.js: persistent directional validation with sample guardrails and Wilson 95% intervals
- api/calibration.js: regime/factor analysis and chronological walk-forward readiness
- api/health.js: provider, consensus, database and collector health
- lib/analytics.js: shared validation statistics
- tests/analytics.test.js: regression tests
- .github/workflows/ci.yml: Node syntax + analytics test CI

Collection:
Supabase cron -> authenticated /api/observe -> standardized observations -> Supabase.
The browser does not write validation observations.

Guardrails:
Directional accuracy is hidden below 20 directional samples.
EARLY CALIBRATION requires at least 50 directional samples.
CALIBRATION READY requires at least 150 directional samples plus ready chronological walk-forward evidence.
Cross-venue open interest is not directly aggregated because venue contract specifications can differ.

The dashboard reports descriptive market evidence and historical validation statistics, not guaranteed outcomes or trade instructions.
