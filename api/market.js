const ALLOWED = {
  futures: {
    origin: "https://fapi.binance.com",
    paths: [
      "/fapi/v1/ticker/price",
      "/fapi/v1/ticker/24hr",
      "/fapi/v1/ticker/bookTicker",
      "/fapi/v1/klines",
      "/fapi/v1/depth",
      "/fapi/v1/openInterest",
      "/fapi/v1/premiumIndex"
    ]
  },
  spot: {
    origin: "https://api.binance.com",
    paths: [
      "/api/v3/ticker/price",
      "/api/v3/ticker/24hr",
      "/api/v3/ticker/bookTicker",
      "/api/v3/klines",
      "/api/v3/depth"
    ]
  }
};

const PUBLIC_SPOT_ORIGIN = "https://data-api.binance.vision";
const BYBIT_ORIGIN = "https://api.bybit.com";
const FUTURES_TO_SPOT = Object.freeze({
  "/fapi/v1/ticker/price": "/api/v3/ticker/price",
  "/fapi/v1/ticker/24hr": "/api/v3/ticker/24hr",
  "/fapi/v1/ticker/bookTicker": "/api/v3/ticker/bookTicker",
  "/fapi/v1/klines": "/api/v3/klines",
  "/fapi/v1/depth": "/api/v3/depth"
});

function validPath(market, raw) {
  if (!raw || typeof raw !== "string" || raw.length > 500 || !raw.startsWith("/")) return null;
  let u;
  try { u = new URL(raw, "https://tcc.invalid"); } catch { return null; }
  if (u.origin !== "https://tcc.invalid" || !ALLOWED[market]?.paths.includes(u.pathname)) return null;
  const allowedParams = new Set(["symbol", "interval", "limit", "endTime", "startTime"]);
  for (const key of u.searchParams.keys()) if (!allowedParams.has(key)) return null;
  const symbol = u.searchParams.get("symbol");
  if (symbol && !/^[A-Z0-9]{3,24}$/.test(symbol)) return null;
  const interval = u.searchParams.get("interval");
  if (interval && !/^(1m|3m|5m|15m|30m|1h|2h|4h|6h|8h|12h|1d|3d|1w|1M)$/.test(interval)) return null;
  const limit = u.searchParams.get("limit");
  if (limit && (!/^\d+$/.test(limit) || +limit < 1 || +limit > 1500)) return null;
  for (const key of ["startTime", "endTime"]) {
    const value = u.searchParams.get(key);
    if (value && (!/^\d{10,16}$/.test(value) || !Number.isFinite(+value))) return null;
  }
  return { pathname: u.pathname, search: u.search, params: u.searchParams };
}

async function fetchJson(url, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "Accept": "application/json", "User-Agent": "Trader-Command-Center/65.17" }
    });
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text.slice(0, 1000) }; }
    return { ok: response.ok, status: response.status, data };
  } finally { clearTimeout(timer); }
}

async function bybitDerivativesFallback(pathname, symbol) {
  if (!symbol || !symbol.endsWith("USDT")) return null;
  const url = `${BYBIT_ORIGIN}/v5/market/tickers?category=linear&symbol=${encodeURIComponent(symbol)}`;
  const r = await fetchJson(url, 4500);
  const row = r.data?.result?.list?.[0];
  if (!r.ok || r.data?.retCode !== 0 || !row) return null;
  const now = Date.now();
  if (pathname === "/fapi/v1/openInterest") {
    const oi = Number(row.openInterest);
    if (!Number.isFinite(oi)) return null;
    return {
      source: "bybit-linear-fallback",
      data: { symbol, openInterest: String(row.openInterest), time: now },
      meta: { provider: "Bybit", instrument: "linear-perpetual", unit: "contracts/base-asset" }
    };
  }
  if (pathname === "/fapi/v1/premiumIndex") {
    const fr = Number(row.fundingRate);
    if (!Number.isFinite(fr)) return null;
    return {
      source: "bybit-linear-fallback",
      data: {
        symbol,
        markPrice: row.markPrice ?? null,
        indexPrice: row.indexPrice ?? null,
        lastFundingRate: String(row.fundingRate),
        nextFundingTime: Number(row.nextFundingTime) || null,
        time: now
      },
      meta: { provider: "Bybit", instrument: "linear-perpetual", fundingRatePeriod: "venue-defined" }
    };
  }
  return null;
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const market = String(req.query?.market || "").toLowerCase();
  if (!ALLOWED[market]) return res.status(400).json({ error: "Invalid market" });
  const parsed = validPath(market, String(req.query?.path || ""));
  if (!parsed) return res.status(400).json({ error: "Invalid or unsupported market-data path" });
  const path = parsed.pathname + parsed.search;
  const symbol = parsed.params.get("symbol");

  try {
    const primary = await fetchJson(ALLOWED[market].origin + path);
    if (primary.ok) {
      return res.status(200).json({
        __tccProxy: true,
        market,
        source: market === "futures" ? "binance-futures" : "binance-spot",
        degraded: false,
        requestedMarket: market,
        capabilities: { derivatives: market === "futures" },
        data: primary.data
      });
    }

    if (market === "futures" && [403, 418, 451].includes(primary.status)) {
      if (parsed.pathname === "/fapi/v1/openInterest" || parsed.pathname === "/fapi/v1/premiumIndex") {
        const alt = await bybitDerivativesFallback(parsed.pathname, symbol);
        if (alt) {
          return res.status(200).json({
            __tccProxy: true,
            market: "futures",
            source: alt.source,
            degraded: true,
            requestedMarket: market,
            upstreamStatus: primary.status,
            capabilities: { derivatives: true, crossVenue: true },
            providerMeta: alt.meta,
            data: alt.data
          });
        }
      }

      const mapped = FUTURES_TO_SPOT[parsed.pathname];
      if (mapped) {
        const fallback = await fetchJson(PUBLIC_SPOT_ORIGIN + mapped + parsed.search);
        if (fallback.ok) {
          return res.status(200).json({
            __tccProxy: true,
            market: "spot",
            source: "public-spot-fallback",
            degraded: true,
            requestedMarket: market,
            upstreamStatus: primary.status,
            capabilities: { derivatives: false },
            data: fallback.data
          });
        }
      }
    }

    return res.status(primary.status).json({
      error: "Market upstream error",
      upstreamStatus: primary.status,
      unavailable: true,
      data: primary.data
    });
  } catch (error) {
    const timeout = error?.name === "AbortError";
    return res.status(timeout ? 504 : 502).json({
      error: timeout ? "Market upstream timeout" : "Market upstream unavailable"
    });
  }
};
