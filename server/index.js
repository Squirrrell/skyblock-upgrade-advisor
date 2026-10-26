import express from 'express';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ApiError } from '../shared/errors.js';
import { analyzePlayer } from './report.js';
import { getPriceBook, startAuctionPolling } from './prices.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const app = express();

app.disable('x-powered-by');

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, hasApiKey: Boolean(process.env.HYPIXEL_API_KEY?.trim()) });
});

app.get('/api/player/:name', async (req, res) => {
  try {
    const report = await analyzePlayer(req.params.name, req.query.profile);
    res.set('Cache-Control', 'no-store').json(report);
  } catch (err) {
    sendError(res, err);
  }
});

app.get('/api/price/:id', async (req, res) => {
  try {
    const book = await getPriceBook();
    res.json({ id: req.params.id, price: book.price(req.params.id), meta: book.meta });
  } catch (err) {
    sendError(res, err);
  }
});

function sendError(res, err) {
  const status = err instanceof ApiError ? err.status : 500;
  if (status >= 500 && !(err instanceof ApiError)) console.error(err);
  res.status(status).json({ error: err.message ?? 'Something went wrong', code: err.code ?? null });
}

if (existsSync(dist)) {
  app.use(express.static(dist, { maxAge: '1h', index: false }));
  app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(join(dist, 'index.html')));
}

const port = Number(process.env.PORT) || 8787;
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
  if (!process.env.HYPIXEL_API_KEY?.trim()) console.warn('HYPIXEL_API_KEY is not set: profile lookups will fail until you add it to .env');
  startAuctionPolling();
});
