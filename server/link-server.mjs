// Servidor opcional: baixa o vídeo de um link (YouTube/Twitch/Kick) com yt-dlp e devolve ao navegador.
// O corte e a legenda continuam rodando no navegador. Também serve o build (dist/).
// Uso: npm run build && npm run server   (precisa de yt-dlp e ffmpeg instalados)
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { createReadStream, existsSync, statSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { join, extname } from 'node:path';
import { tmpdir } from 'node:os';

const PORT = Number(process.env.PORT || 8787);
const DIST = new URL('../dist/', import.meta.url).pathname;
const ALLOWED = /^https:\/\/(www\.|m\.)?(youtube\.com|youtu\.be|twitch\.tv|clips\.twitch\.tv|kick\.com)\//i;
const MAX_SECONDS = Number(process.env.MAX_SECONDS || 4 * 3600);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.wasm': 'application/wasm', '.json': 'application/json' };
let active = 0;

function body(req) {
  return new Promise((res, rej) => { let b = ''; req.on('data', (c) => { b += c; if (b.length > 1e4) req.destroy(); }); req.on('end', () => res(b)); req.on('error', rej); });
}

function run(args, cwd) {
  return new Promise((res, rej) => {
    const p = spawn('yt-dlp', args, { cwd });
    let err = '';
    p.stderr.on('data', (d) => { err += d; });
    p.on('error', rej);
    p.on('close', (code) => (code === 0 ? res() : rej(new Error(err.split('\n').filter(Boolean).pop() || 'yt-dlp falhou'))));
  });
}

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/api/health') { res.setHeader('content-type', 'application/json'); return res.end(JSON.stringify({ ok: true })); }
  if (url.pathname === '/api/fetch' && req.method === 'POST') {
    let dir;
    try {
      if (active >= 2) { res.statusCode = 429; return res.end('Fila cheia, tente em instantes'); }
      active++;
      const { url: link } = JSON.parse(await body(req));
      if (typeof link !== 'string' || !ALLOWED.test(link)) { res.statusCode = 400; return res.end('Link não suportado'); }
      dir = mkdtempSync(join(tmpdir(), 'bruma-'));
      await run(['--no-playlist', '--match-filter', `duration<=${MAX_SECONDS}`, '-f', 'bv*[height<=1080][ext=mp4]+ba[ext=m4a]/b[height<=1080][ext=mp4]/b',
        '--merge-output-format', 'mp4', '-o', 'video.%(ext)s', '--print-to-file', '%(title)s', 'title.txt', '--', link], dir);
      const file = readdirSync(dir).find((f) => f.startsWith('video.'));
      if (!file) throw new Error('Vídeo não encontrado (live longa demais ou privada?)');
      const title = existsSync(join(dir, 'title.txt')) ? (await import('node:fs')).readFileSync(join(dir, 'title.txt'), 'utf8').trim() : 'live';
      const p = join(dir, file);
      res.writeHead(200, { 'content-type': 'video/mp4', 'content-length': statSync(p).size, 'x-title': encodeURIComponent(title.slice(0, 80)), 'access-control-expose-headers': 'x-title' });
      const s = createReadStream(p);
      s.pipe(res);
      s.on('close', () => rmSync(dir, { recursive: true, force: true }));
      dir = null;
    } catch (e) {
      res.statusCode = 502;
      res.end(String(e.message || e));
    } finally {
      active--;
      if (dir) rmSync(dir, { recursive: true, force: true });
    }
    return;
  }
  // estáticos (SPA)
  let p = join(DIST, decodeURIComponent(url.pathname));
  if (!p.startsWith(DIST) || !existsSync(p) || statSync(p).isDirectory()) p = join(DIST, 'index.html');
  if (!existsSync(p)) { res.statusCode = 404; return res.end('Rode npm run build antes.'); }
  res.setHeader('content-type', TYPES[extname(p)] || 'application/octet-stream');
  createReadStream(p).pipe(res);
}).listen(PORT, () => console.log(`bruma. em http://localhost:${PORT}`));
