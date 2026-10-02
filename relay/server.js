// Order relay for the wm-otc static site.
//
// The site used to call the Telegram Bot API straight from the browser, which
// published the bot token to every visitor. This server keeps the token in an
// environment variable and only exposes POST /notify, which forwards one
// message to the managers' chat.
//
// Env:
//   TELEGRAM_BOT_TOKEN  - bot token from @BotFather (required)
//   TELEGRAM_CHAT_ID    - chat that receives orders (required)
//   ALLOWED_ORIGINS     - comma-separated site origins allowed to call /notify,
//                         e.g. https://example.github.io (required in production)
//   PORT                - set by Render
const http = require("http");

const MAX_BODY_BYTES = 16 * 1024;
const MAX_TEXT_LENGTH = 4000; // Telegram's sendMessage limit is 4096
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 10; // messages per IP per window

function parseOrigins(value) {
  return (value || "")
    .split(",")
    .map((o) => o.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

// Sliding-window counter per client IP; old entries are pruned on access.
function createRateLimiter({ windowMs = RATE_LIMIT_WINDOW_MS, max = RATE_LIMIT_MAX, now = Date.now } = {}) {
  const hits = new Map();
  return function allow(key) {
    const t = now();
    const recent = (hits.get(key) || []).filter((ts) => t - ts < windowMs);
    if (recent.length >= max) {
      hits.set(key, recent);
      return false;
    }
    recent.push(t);
    hits.set(key, recent);
    if (hits.size > 10000) {
      for (const [k, list] of hits) {
        if (!list.some((ts) => t - ts < windowMs)) hits.delete(k);
      }
    }
    return true;
  };
}

// Plain-text fallback: drop only the formatting tags Telegram understands and
// decode entities, so customer text like "<3" survives.
function stripTags(text) {
  return text
    .replace(/<\/?(b|strong|i|em|u|ins|s|strike|del|code|pre|a|tg-spoiler|blockquote)(\s[^>]*)?>/gi, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");
}

async function sendToTelegram(token, chatId, text, fetchImpl = fetch) {
  const call = (body) =>
    fetchImpl(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, ...body }),
    }).then((r) => r.json());

  const data = await call({ text, parse_mode: "HTML" });
  if (data.ok) return true;
  // Malformed HTML from the client must not lose the order: retry as plain text.
  const plain = await call({ text: stripTags(text) });
  if (!plain.ok) throw new Error(`Telegram error: ${plain.description || "unknown"}`);
  return true;
}

function createServer({
  token = process.env.TELEGRAM_BOT_TOKEN,
  chatId = process.env.TELEGRAM_CHAT_ID,
  allowedOrigins = parseOrigins(process.env.ALLOWED_ORIGINS),
  fetchImpl = fetch,
  rateLimiter = createRateLimiter(),
} = {}) {
  return http.createServer((req, res) => {
    const origin = (req.headers.origin || "").replace(/\/$/, "");
    const originAllowed = allowedOrigins.length === 0 || allowedOrigins.includes(origin);

    const send = (status, payload) => {
      const headers = { "Content-Type": "application/json" };
      if (origin && originAllowed) {
        headers["Access-Control-Allow-Origin"] = origin;
        headers["Vary"] = "Origin";
      }
      res.writeHead(status, headers);
      res.end(JSON.stringify(payload));
    };

    if (req.method === "GET" && (req.url === "/" || req.url === "/healthz")) {
      return send(200, { ok: true });
    }

    if (req.url !== "/notify") return send(404, { ok: false, error: "Not found" });

    if (req.method === "OPTIONS") {
      if (!originAllowed) return send(403, { ok: false, error: "Origin not allowed" });
      res.writeHead(204, {
        "Access-Control-Allow-Origin": origin || "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400",
        Vary: "Origin",
      });
      return res.end();
    }

    if (req.method !== "POST") return send(405, { ok: false, error: "Method not allowed" });
    if (!originAllowed) return send(403, { ok: false, error: "Origin not allowed" });
    if (!token || !chatId) return send(500, { ok: false, error: "Relay is not configured" });

    const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.socket.remoteAddress;
    if (!rateLimiter(ip)) return send(429, { ok: false, error: "Too many requests" });

    let size = 0;
    const chunks = [];
    let aborted = false;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        aborted = true;
        send(413, { ok: false, error: "Payload too large" });
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", async () => {
      if (aborted) return;
      let text;
      try {
        text = JSON.parse(Buffer.concat(chunks).toString("utf8")).text;
      } catch {
        return send(400, { ok: false, error: "Invalid JSON" });
      }
      if (typeof text !== "string" || !text.trim()) return send(400, { ok: false, error: "text is required" });
      if (text.length > MAX_TEXT_LENGTH) text = `${text.slice(0, MAX_TEXT_LENGTH - 1)}…`;

      try {
        await sendToTelegram(token, chatId, text, fetchImpl);
        send(200, { ok: true });
      } catch (err) {
        console.error("[relay] delivery failed:", err.message);
        send(502, { ok: false, error: "Delivery failed" });
      }
    });
  });
}

if (require.main === module) {
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
    console.error("[relay] TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID must be set");
    process.exit(1);
  }
  if (!process.env.ALLOWED_ORIGINS) {
    console.warn("[relay] ALLOWED_ORIGINS is not set — any website can post to /notify");
  }
  const port = process.env.PORT || 3000;
  createServer().listen(port, () => console.log(`[relay] listening on port ${port}`));
}

module.exports = { createServer, createRateLimiter, parseOrigins, stripTags };
