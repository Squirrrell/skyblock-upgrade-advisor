// Finds the FurfSky Reborn packs in your own Minecraft folder so the local
// server can use them as the default item icons. FurfSky Reborn is "All
// Rights Reserved", so these routes only answer requests from this computer
// and the packs are never copied into the site or the repo.
import { existsSync, readdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

function minecraftPackDirs() {
  if (process.env.FURFSKY_PACKS) return [];
  return [
    process.env.APPDATA && join(process.env.APPDATA, '.minecraft', 'resourcepacks'),
    join(homedir(), '.minecraft', 'resourcepacks'),
    join(homedir(), 'Library', 'Application Support', 'minecraft', 'resourcepacks'),
  ].filter((d) => d && existsSync(d));
}

/** FurfSky pack files: FURFSKY_PACKS (paths separated by ;) or the Minecraft folder. */
export function findPacks() {
  const explicit = (process.env.FURFSKY_PACKS ?? '')
    .split(';')
    .map((p) => p.trim())
    .filter((p) => p && existsSync(p));
  const found = minecraftPackDirs().flatMap((dir) =>
    readdirSync(dir)
      .filter((name) => /furf|fursky/i.test(name) && /\.(zip|cats)$/i.test(name))
      .map((name) => join(dir, name))
      .filter((p) => statSync(p).isFile()),
  );
  return [...new Set([...explicit, ...found])];
}

const isLocal = (req) => ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress);

export function registerPackRoutes(app) {
  app.get('/api/packs', (req, res) => {
    if (!isLocal(req)) return res.json({ packs: [] });
    const packs = findPacks().map((path, i) => ({ name: path.split(/[\\/]/).pop(), url: `/api/packs/${i}` }));
    res.set('Cache-Control', 'no-store').json({ packs });
  });

  app.get('/api/packs/:index', (req, res) => {
    if (!isLocal(req)) return res.status(404).end();
    const path = findPacks()[Number(req.params.index)];
    if (!path) return res.status(404).end();
    // The Minecraft folder is .minecraft, which Express hides by default.
    res.set('Cache-Control', 'no-store').sendFile(path, { dotfiles: 'allow' });
  });
}
