import { createServer } from 'node:http';

const host = process.env.HOST ?? '0.0.0.0';
const port = Number(process.env.PORT ?? 8099);

/** @type {{ id: string, headers: Record<string, string | string[] | undefined>, body: unknown, receivedAt: string }[]} */
const pushes = [];

const readBody = (req) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${host}:${port}`);

  if (req.method === 'POST' && url.pathname.startsWith('/push')) {
    const raw = await readBody(req);
    let body = raw;
    try {
      body = JSON.parse(raw);
    } catch {
      // keep raw
    }
    pushes.push({
      id: url.pathname.slice('/push/'.length) || 'default',
      headers: { ...req.headers },
      body,
      receivedAt: new Date().toISOString(),
    });
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (req.method === 'GET' && url.pathname === '/pushes') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ pushes }));
    return;
  }

  if (req.method === 'DELETE' && url.pathname === '/pushes') {
    pushes.length = 0;
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (req.method === 'GET' && url.pathname === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(port, host, () => {
  console.log(`push catcher listening on http://${host}:${port}`);
});
