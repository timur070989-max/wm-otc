const test = require("node:test");
const assert = require("node:assert");
const { createServer, createRateLimiter, parseOrigins, stripTags } = require("./server");

function start(opts, t) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    const body = JSON.parse(init.body);
    calls.push({ url, body });
    const ok = opts.telegramOk ? opts.telegramOk(body) : true;
    return { json: async () => ({ ok, description: ok ? undefined : "Bad Request" }) };
  };
  const server = createServer({ token: "T", chatId: "C", allowedOrigins: ["https://site.example"], fetchImpl, ...opts.server });
  t.after(() => {
    server.closeAllConnections();
    server.close();
  });
  return new Promise((resolve) =>
    server.listen(0, () => resolve({ server, calls, url: `http://127.0.0.1:${server.address().port}` }))
  );
}

const post = (url, body, origin = "https://site.example") =>
  fetch(`${url}/notify`, { method: "POST", headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify(body) });

test("forwards text to Telegram with the server-side token", async (t) => {
  const { calls, url } = await start({}, t);
  const res = await post(url, { text: "<b>Заказ</b>" });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.headers.get("access-control-allow-origin"), "https://site.example");
  assert.strictEqual(calls.length, 1);
  assert.match(calls[0].url, /botT\/sendMessage$/);
  assert.deepStrictEqual(calls[0].body, { chat_id: "C", text: "<b>Заказ</b>", parse_mode: "HTML" });
  server.close();
});

test("retries as plain text when Telegram rejects the HTML", async (t) => {
  const { calls, url } = await start({ telegramOk: (b) => !b.parse_mode }, t);
  const res = await post(url, { text: "<b>Иван &lt;3 &amp; Co</b>" });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(calls.length, 2);
  assert.strictEqual(calls[1].body.parse_mode, undefined);
  assert.strictEqual(calls[1].body.text, "Иван <3 & Co");
  server.close();
});

test("reports failure when Telegram rejects both attempts", async (t) => {
  const { url } = await start({ telegramOk: () => false }, t);
  const res = await post(url, { text: "x" });
  assert.strictEqual(res.status, 502);
  assert.strictEqual((await res.json()).ok, false);
  server.close();
});

test("rejects other origins, empty text and bad JSON", async (t) => {
  const { calls, url } = await start({}, t);
  assert.strictEqual((await post(url, { text: "x" }, "https://evil.example")).status, 403);
  assert.strictEqual((await post(url, { text: "  " })).status, 400);
  const bad = await fetch(`${url}/notify`, { method: "POST", headers: { Origin: "https://site.example" }, body: "{" });
  assert.strictEqual(bad.status, 400);
  assert.strictEqual(calls.length, 0);
  server.close();
});

test("rate limiter blocks after max requests per window", () => {
  let t = 0;
  const allow = createRateLimiter({ windowMs: 1000, max: 2, now: () => t });
  assert.ok(allow("ip"));
  assert.ok(allow("ip"));
  assert.ok(!allow("ip"));
  assert.ok(allow("other"));
  t = 1500;
  assert.ok(allow("ip"));
});

test("parseOrigins trims and drops trailing slashes", () => {
  assert.deepStrictEqual(parseOrigins(" https://a.example/ ,https://b.example,"), ["https://a.example", "https://b.example"]);
});

test("stripTags keeps non-tag angle brackets", () => {
  assert.strictEqual(stripTags("<b>a</b> <3 <i>b</i>"), "a <3 b");
});
