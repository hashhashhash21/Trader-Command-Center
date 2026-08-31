const ALLOWED = {
  futures: {
    origin: "https://fapi.binance.com",
    paths: [
      "/fapi/v1/ticker/price",
      "/fapi/v1/ticker/24hr",
      "/fapi/v1/ticker/bookTicker",
      "/fapi/v1/klines",
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
      "/api/v3/klines"
    ]
  }
};

function validPath(market, raw) {
  if (!raw || typeof raw !== "string" || raw.length > 500) return null;
  if (!raw.startsWith("/")) return null;
  let u;
  try { u = new URL(raw, "https://tcc.invalid"); } catch { return null; }
  if (u.origin !== "https://tcc.invalid") return null;
  if (!ALLOWED[market]?.paths.includes(u.pathname)) return null;

  const allowedParams = new Set(["symbol","interval","limit","endTime","startTime"]);
  for (const key of u.searchParams.keys()) if (!allowedParams.has(key)) return null;

  const symbol = u.searchParams.get("symbol");
  if (symbol && !/^[A-Z0-9]{3,24}$/.test(symbol)) return null;
  const interval = u.searchParams.get("interval");
  if (interval && !/^(1m|3m|5m|15m|30m|1h|2h|4h|6h|8h|12h|1d|3d|1w|1M)$/.test(interval)) return null;
  const limit = u.searchParams.get("limit");
  if (limit && (!/^\d+$/.test(limit) || +limit < 1 || +limit > 1500)) return null;
  for (const k of ["startTime","endTime"]) {
    const v = u.searchParams.get(k);
    if (v && (!/^\d{10,16}$/.test(v) || !Number.isFinite(+v))) return null;
  }
  return u.pathname + (u.search ? u.search : "");
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const market = String(req.query.market || "").toLowerCase();
  if (!ALLOWED[market]) return res.status(400).json({ error: "Invalid market" });

  const path = validPath(market, String(req.query.path || ""));
  if (!path) return res.status(400).json({ error: "Invalid or unsupported Binance path" });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7000);
  try {
    const r = await fetch(ALLOWED[market].origin + path, {
      signal: controller.signal,
      headers: {
        "Accept": "application/json",
        "User-Agent": "Trader-Command-Center/65"
      }
    });

    const text = await r.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text.slice(0, 1000) }; }

    if (!r.ok) {
      return res.status(r.status).json({
        error: "Binance upstream error",
        upstreamStatus: r.status,
        data
      });
    }

    return res.status(200).json({
      __tccProxy: true,
      market,
      data
    });
  } catch (e) {
    const timeout = e?.name === "AbortError";
    return res.status(timeout ? 504 : 502).json({
      error: timeout ? "Binance upstream timeout" : "Binance upstream unavailable"
    });
  } finally {
    clearTimeout(timer);
  }
}
