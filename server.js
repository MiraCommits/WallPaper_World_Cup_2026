const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const PORT = Number(process.env.PORT || 3000);
const API = "https://api.football-data.org/v4";
const TOKEN = process.env.FOOTBALL_DATA_TOKEN || "PASTE_YOUR_FOOTBALL_DATA_TOKEN_HERE";
const ROOT = __dirname;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp"
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Auth-Token",
    ...headers
  });
  res.end(body);
}

async function proxyFootballData(req, res, url) {
  if (!TOKEN || TOKEN.includes("PASTE_")) {
    return send(res, 500, JSON.stringify({
      error: "Missing FOOTBALL_DATA_TOKEN. Set env FOOTBALL_DATA_TOKEN before running server.js."
    }), { "Content-Type": "application/json; charset=utf-8" });
  }

  const targetPath = url.pathname.replace(/^\/api/, "") || "/";
  const target = `${API}${targetPath}${url.search}`;

  try {
    const apiRes = await fetch(target, {
      headers: { "X-Auth-Token": TOKEN, "Accept": "application/json" }
    });
    const body = await apiRes.text();
    send(res, apiRes.status, body, { "Content-Type": apiRes.headers.get("content-type") || "application/json; charset=utf-8" });
  } catch (err) {
    send(res, 500, JSON.stringify({ error: String(err.message || err) }), { "Content-Type": "application/json; charset=utf-8" });
  }
}

function serveStatic(req, res, url) {
  let filePath = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  filePath = path.normalize(filePath).replace(/^([.][.][/\\])+/, "");
  const fullPath = path.join(ROOT, filePath);

  if (!fullPath.startsWith(ROOT)) {
    return send(res, 403, "Forbidden", { "Content-Type": "text/plain; charset=utf-8" });
  }

  fs.readFile(fullPath, (err, data) => {
    if (err) {
      return send(res, 404, "Not found", { "Content-Type": "text/plain; charset=utf-8" });
    }
    send(res, 200, data, { "Content-Type": MIME[path.extname(fullPath).toLowerCase()] || "application/octet-stream" });
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (req.method === "OPTIONS") {
    return send(res, 204, "");
  }

  if (url.pathname.startsWith("/api/")) {
    return proxyFootballData(req, res, url);
  }

  return serveStatic(req, res, url);
});

server.listen(PORT, () => {
  console.log(`World Cup wallpaper: http://localhost:${PORT}`);
  console.log("If you use local proxy, set API_HOST to '/api' in config.js.");
});
