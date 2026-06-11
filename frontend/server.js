import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const distDir = resolve(__dirname, "dist");
const port = Number(process.env.PORT) || 8080;

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
};

const sendFile = (res, filePath) => {
  const stream = createReadStream(filePath);
  res.writeHead(200, {
    "Content-Type": contentTypes[extname(filePath)] || "application/octet-stream",
    "Cache-Control": filePath.includes(`${join("dist", "assets")}`)
      ? "public, max-age=31536000, immutable"
      : "no-cache",
  });
  stream.pipe(res);
};

const server = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("ok");
    return;
  }

  const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  const requestedPath = normalize(urlPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = resolve(distDir, `.${requestedPath}`);

  if (filePath.startsWith(distDir) && existsSync(filePath) && statSync(filePath).isFile()) {
    sendFile(res, filePath);
    return;
  }

  const indexPath = join(distDir, "index.html");
  if (existsSync(indexPath)) {
    sendFile(res, indexPath);
    return;
  }

  res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Frontend build not found. Run npm run build before npm start.");
});

server.listen(port, "0.0.0.0", () => {
  console.log(`UniSports frontend listening on port ${port}`);
});
