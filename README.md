# SkyBlock Upgrade Advisor

Type in a Minecraft username and get a list of everything that player could still do to raise their farming fortune and hunting fortune on Hypixel SkyBlock, plus the one-time consumables they haven't eaten yet. Each missing piece has a price taken from the bazaar or the auction house at the time you look.

## What it checks

**Farming fortune**

- Farming level, the level cap and Anita's fortune tiers
- Garden plots, crop upgrades, garden level and visitors served
- Armor: which farming set you own and the next tier up, then Mossy reforges, Peridot gems and Pesterminator on the pieces you have
- Equipment: Peony and Blossom pieces, Rooted reforges, Green Thumb, Zorro's Cape
- Pets: your best farming pet, the next pet worth buying, the best pet item for it, and the situational pets (Hedgehog, Slug, Mosquito, Pig)
- Accessories: Helianthus Relic, the Fermento and Anita lines, Farming Talisman, Atmospheric Filter, Magic 8 Ball
- Attribute shards: Fly, Galaxy Fish, Earthworm, Cricket, Lunar Moth and Firefly, with how many shards each still needs
- Every specialized farming tool you own: Harvesting or Sunder, Cultivating, Turbo-Crop, Dedication, Farming for Dummies and Peridot gems
- Garden chips, the Chocolate Century Cake, Harvest Harbinger, Rosewater Flasks, Carrolyn exports and the other boosts

**Hunting fortune**

- Hunting level
- Karma attributes and the Echo attributes that boost them
- David's Cloak, Safari Belt and its Majestic reforge, Kuudra cores
- Fishing nets, lassos and black holes, plus the Sticky reforge
- Hunter's Luck, the Eagle pet, the Starborn cake and Hunting Hotspot

**Consumables**

Wriggling Larva, Refined Dark Cacao Truffles, Reaper Peppers, McGrubber's Burgers, Refined Bottles of Jyrre, Metaphysical Serums, the Teleporter Pill, the Rift Prism and active Century Cakes.

The top of the report ranks the upgrades you can buy by coins per point of fortune.

## Running it

You need Node.js 20.12 or newer and a Hypixel API key for profile lookups. Bazaar and auction prices work without one.

1. Get a key from the [Hypixel developer dashboard](https://developer.hypixel.net/dashboard).
2. Copy `.env.example` to `.env` and put the key after `HYPIXEL_API_KEY=`.
3. Install and start:

```bash
npm install
npm run build
npm start
```

Open http://localhost:8787.

For development, `npm run dev` starts the API with auto-reload and the Vite dev server on http://localhost:5173.

## Hosting on GitHub Pages

GitHub Pages only serves static files, and a key shipped to the browser is public. So the Pages build splits the work:

- A small Cloudflare Worker (`worker/`) holds the Hypixel key as a secret. It answers only three lookups (player name, profiles, garden), only for your site's origin, and rate-limits each visitor to 30 calls a minute.
- The browser fetches bazaar prices straight from Hypixel (no key needed) and runs the same analysis code as the server, from `shared/`.
- A GitHub Action scans the auction house every 30 minutes and publishes the lowest-BIN snapshot with the site.

Setup, once:

1. Deploy the Worker. You need a free Cloudflare account.

   ```bash
   cd worker
   npm install
   npx wrangler login
   npx wrangler secret put HYPIXEL_API_KEY
   npx wrangler deploy
   ```

   Wrangler prints the Worker URL, something like `https://skyblock-advisor-proxy.<you>.workers.dev`.
2. If your Pages site is not `https://squirrrell.github.io`, change `ALLOWED_ORIGINS` in `worker/wrangler.toml` and deploy again.
3. In the GitHub repo, add a repository variable `PROXY_URL` set to the Worker URL (Settings, Secrets and variables, Actions, Variables).
4. Set Settings, Pages, Source to "GitHub Actions", then run the "Deploy to GitHub Pages" workflow.

To renew the key later, run `npx wrangler secret put HYPIXEL_API_KEY` again. Nothing on the site changes. Development keys expire, so for a public site apply for a production key on the Hypixel dashboard.

To try the Pages build locally, put `HYPIXEL_API_KEY=...` in `worker/.dev.vars`, run `npx wrangler dev --port 8791` in `worker/`, then:

```bash
VITE_BASE=/skyblock-upgrade-advisor/ VITE_PROXY_URL=http://127.0.0.1:8791 npm run build:pages
```
```bash
VITE_BASE=/skyblock-upgrade-advisor/ npm run preview:pages
```

and open http://localhost:4173/skyblock-upgrade-advisor/. On Git Bash for Windows, prefix both commands with `MSYS_NO_PATHCONV=1`.

### Offline testing

Set `PROFILE_FIXTURE` to the path of a saved `/v2/skyblock/profiles` response (either the `profiles` array or `{ "profiles": [...], "garden": {...} }`). The server will use it instead of calling Hypixel, so you can work on the UI without a key. Look up the UUID of a member of that profile.

### Tests

```bash
npm test
```

## How it works

- `server/hypixel.js` talks to the Hypixel and Mojang APIs and caches responses for a couple of minutes.
- `server/prices.js` (with `shared/prices.js`) reads bazaar instant-buy prices and scans every auction page for the lowest BIN, refreshing every 10 minutes. Pets are priced by type and rarity, preferring level 100 listings.
- `shared/profile.js` decodes the NBT inventory blobs (armor, wardrobe, ender chest, backpacks, accessory bag, loadouts and the farming toolkit) into a flat item list, and works out pet levels.
- `shared/analyze/` turns that into report rows. The fortune values live in `shared/data/` so they can be updated after a game patch without touching the logic. Everything in `shared/` runs in both Node and the browser.
- Pet leveling curves and the attribute shard list come from the [NotEnoughUpdates repo](https://github.com/NotEnoughUpdates/NotEnoughUpdates-REPO) at runtime.

## Limits

- Fortune values follow the community [Hypixel SkyBlock wiki](https://hypixelskyblock.minecraft.wiki/w/Farming_Fortune) as of autumn 2026. Hypixel changes farming often, so some numbers will drift.
- Some sources are not in the API at all: the garden fortune account upgrade, your pest bestiary tier, Crop Analyzer milestones, Rosewater Flasks eaten and Carrolyn exports. Those rows are marked with a question mark and left out of the totals.
- Items that you normally upgrade in game (Fermento into Helianthus, Peony into Blossom) are shown at their auction price, which is a rough stand-in for the real cost.
- The totals only count fortune that is always on. Crop-specific, contest-only and pest-only bonuses are listed but not added up.
- The maximums are fixed, so they are the same for every player. Farming tops out at 1,824.7: the wiki's max build (recombobulated Helianthus with Mossy, Perfect Peridots and Pesterminator VI, recombobulated Blossom with Rooted and Green Thumb V, a level 200 Rose Dragon with a Green Bandana, and so on), without tool, crop-only or short-term bonuses. Hunting uses the wiki's unconditional maximum of 181.
- Ironman and Stranded profiles can't trade, so for them the prices only show how valuable each item is.

## License

MIT
