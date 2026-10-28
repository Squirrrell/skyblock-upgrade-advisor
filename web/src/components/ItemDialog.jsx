// A popup for one item: how to craft it (with its requirements and what the
// ingredients cost), a copyable /ahs command, and its cheapest Buy It Now
// auctions from the last scan. Accessories in a recipe open their own popup
// in place, with a Back button to return.
import { ArrowLeftIcon, ArrowRightIcon, CheckCircleIcon, CheckIcon, CopyIcon, XCircleIcon, XIcon } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import { prettyId } from '../../../shared/analyze/helpers.js';
import { loadCollections, loadListings, loadPrices } from '../lib/data.js';
import { ago, coins, int, until } from '../lib/format.js';
import { itemInfo, useIcons } from '../lib/icons.js';
import { craftCost, loadNeuItem, recipesOf } from '../lib/neu.js';
import { craftRequirement, describe, recipeUnlock } from '../lib/requirements.js';
import { ItemCardView, ItemSlot, itemCard } from '../mc.jsx';
import { rarityClass } from '../ui.jsx';

function CopyButton({ text, label = 'Copy' }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    } catch {
      // Clipboard blocked: the text is visible next to the button anyway.
    }
  };
  return (
    <button type="button" onClick={copy} className="mc-btn mc-btn-sm shrink-0" aria-label={`${label}: ${text}`}>
      {done ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
      {done ? 'Copied' : label}
    </button>
  );
}

/** Resolves a promise once per mount; undefined while loading, null on failure. */
function useLoad(load, deps) {
  const [value, setValue] = useState(undefined);
  useEffect(() => {
    let alive = true;
    setValue(undefined);
    load()
      // Wrapped: a loaded function (the price lookup) must not be taken as an updater.
      .then((v) => alive && setValue(() => v ?? null))
      .catch(() => alive && setValue(null));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return value;
}

const nameOf = (id) => itemInfo(id).name ?? prettyId(id);
const tierOf = (id) => itemInfo(id).tier ?? undefined;

/** An ingredient slot; accessories are buttons that open their own popup. */
function Ingredient({ c, onOpen }) {
  if (!itemInfo(c.id).accessory) return <ItemSlot id={c.id} count={c.count} />;
  return (
    <button type="button" className="recipe-link block" onClick={() => onOpen(c.id)} aria-label={`Open ${nameOf(c.id)}`}>
      <ItemSlot id={c.id} count={c.count} rarity={tierOf(c.id)} focusable={false} openable={false} />
    </button>
  );
}

function IngredientName({ id, onOpen }) {
  if (!itemInfo(id).accessory) return <span>{nameOf(id)}</span>;
  return (
    <button type="button" onClick={() => onOpen(id)} className={`recipe-name inline-flex items-center gap-1 font-semibold ${rarityClass(tierOf(id))}`}>
      {nameOf(id)}
      <ArrowRightIcon size={12} aria-hidden="true" />
    </button>
  );
}

/**
 * Crafting costs of the ingredients that have no price of their own (nothing
 * listed, like a Pressure Ring between listings): id -> cost | null, filled
 * in as they resolve.
 */
function useCraftCosts(ids, prices) {
  const [costs, setCosts] = useState({});
  const key = ids.join(',');
  useEffect(() => {
    if (!prices) return undefined;
    let alive = true;
    for (const id of ids) {
      craftCost(id, prices).then((cost) => alive && setCosts((c) => ({ ...c, [id]: cost })));
    }
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, prices]);
  return costs;
}

/** Ingredients with their price, the total, and how that compares to buying it. */
function Breakdown({ inputs, prices, buyPrice, onOpen }) {
  const crafted = useCraftCosts(inputs.filter((c) => !prices?.(c.id)).map((c) => c.id), prices);
  const rows = inputs.map((c) => {
    const own = prices?.(c.id) ?? null;
    if (own) return { ...c, price: own };
    return { ...c, price: crafted[c.id] ? { unit: crafted[c.id], crafted: true } : null };
  });
  const total = rows.reduce((n, r) => n + (r.price ? r.price.unit * r.count : 0), 0);
  const unpriced = rows.filter((r) => !r.price).length;
  return (
    <div className="mt-3">
      <ul className="flex flex-col">
        {rows.map((r) => (
          <li key={r.id} className="flex items-baseline justify-between gap-3 border-b border-line py-1.5 text-sm last:border-0">
            <span className="min-w-0">
              <span className="text-muted tabular">{int(r.count)} × </span>
              <IngredientName id={r.id} onOpen={onOpen} />
            </span>
            <span className="shrink-0 text-right tabular">
              {r.price ? (
                <>
                  <span className="text-warn">{coins(r.price.unit * r.count)}</span>
                  {r.count > 1 && <span className="ml-1.5 text-xs text-muted">{coins(r.price.unit)} each</span>}
                  {(r.price.crafted || r.price.stale) && (
                    <span className="block text-xs text-muted">{r.price.crafted ? 'none listed, crafting cost' : 'none listed, last price this month'}</span>
                  )}
                </>
              ) : (
                <span className="text-muted">no price</span>
              )}
            </span>
          </li>
        ))}
      </ul>
      {prices && (
        <div className="mc-well mt-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-3 py-2 text-sm">
          <span>
            Crafting cost <span className="font-semibold text-warn tabular">{coins(total)}</span>
            {unpriced > 0 && <span className="text-muted"> + {unpriced} unpriced</span>}
          </span>
          {buyPrice ? (
            <span className="text-muted">
              Buying it: <span className="text-warn tabular">{coins(buyPrice)}</span>
              {!unpriced && total > 0 && (
                <span className={buyPrice > total ? 'text-accent' : 'text-danger'}>
                  {' '}
                  ({buyPrice > total ? `crafting saves ${coins(buyPrice - total)}` : `buying saves ${coins(total - buyPrice)}`})
                </span>
              )}
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}

function Recipe({ recipe, resultId, prices, onOpen }) {
  const buyPrice = prices?.(resultId)?.unit ?? null;
  if (recipe.type === 'crafting') {
    const totals = new Map();
    for (const c of recipe.grid) if (c) totals.set(c.id, (totals.get(c.id) ?? 0) + c.count);
    return (
      <div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="mc-well grid grid-cols-3 gap-1 p-1.5">
            {recipe.grid.map((c, i) => (c ? <Ingredient key={i} c={c} onOpen={onOpen} /> : <span key={i} className="mc-slot" aria-hidden="true" />))}
          </div>
          <ArrowRightIcon size={22} className="text-muted" aria-hidden="true" />
          <ItemSlot id={resultId} count={recipe.count} tooltip={false} />
        </div>
        <Breakdown inputs={[...totals].map(([id, count]) => ({ id, count }))} prices={prices} buyPrice={buyPrice} onOpen={onOpen} />
      </div>
    );
  }
  const what = { forge: 'Forge', npc_shop: 'Bought from an NPC', trade: 'Trade' }[recipe.type] ?? prettyId(recipe.type);
  return (
    <div>
      <p className="text-sm text-muted">
        {what}
        {recipe.duration ? `, takes ${until(Date.now() + recipe.duration * 1000)}` : ''}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {recipe.inputs.map((c) => (
          <Ingredient key={c.id} c={c} onOpen={onOpen} />
        ))}
      </div>
      <Breakdown inputs={recipe.inputs} prices={prices} buyPrice={buyPrice} onOpen={onOpen} />
    </div>
  );
}

function Requirements({ neu, id, stats }) {
  const collections = useLoad(loadCollections, []);
  // Hypixel's collections list first: the repository has no crafttext for newer items.
  const craft = recipeUnlock(itemInfo(id).name, stats, collections) ?? craftRequirement(neu?.crafttext, stats, collections);
  const use = itemInfo(id).requirements.map((r) => describe(r, stats, collections));
  if (!craft && !use.length) return null;
  const row = (r, label) => (
    <li key={label + r.text} className="flex items-start gap-2 text-sm">
      {r.met === true ? (
        <CheckCircleIcon size={16} className="mt-0.5 shrink-0 text-accent" aria-label="You have this" />
      ) : r.met === false ? (
        <XCircleIcon size={16} className="mt-0.5 shrink-0 text-danger" aria-label="You don't have this yet" />
      ) : (
        <span className="mt-0.5 inline-block size-4 shrink-0" aria-hidden="true" />
      )}
      <span>
        <span className="text-muted">{label}: </span>
        {r.text}
        {r.have != null && r.need != null && r.met === false && (
          <span className="text-muted tabular"> ({int(r.have)} of {int(r.need)})</span>
        )}
      </span>
    </li>
  );
  return (
    <ul className="mb-4 flex flex-col gap-1.5">
      {craft && row(craft, 'To craft')}
      {use.map((r) => row(r, 'To use'))}
    </ul>
  );
}

function Listings({ id, name }) {
  const data = useLoad(loadListings, []);
  const list = data?.listings?.[id] ?? [];
  const now = Date.now();
  return (
    <div>
      <div className="mc-well flex items-center justify-between gap-3 px-3 py-2">
        <code className="min-w-0 truncate text-sm">/ahs {name}</code>
        <CopyButton text={`/ahs ${name}`} />
      </div>
      {data === undefined ? (
        <div className="skeleton mt-3 h-24" />
      ) : !list.length ? (
        <p className="mt-3 text-sm text-muted">{data === null ? "Couldn't load the auction listings." : 'No Buy It Now auctions for it in the last scan.'}</p>
      ) : (
        <>
          <ul className="mt-3 flex flex-col">
            {list.map((a) => (
              <li key={a.uuid} className="flex items-center gap-3 border-b border-line py-2 last:border-0">
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-sm font-semibold ${rarityClass(a.tier)}`}>{a.name}</span>
                  <span className="block text-xs text-muted">{a.end > now ? `Ends in ${until(a.end, now)}` : 'Ending'}</span>
                </span>
                <span className="text-right text-sm tabular">
                  <span className="block font-semibold text-warn">{coins(a.price)}</span>
                  {a.count > 1 && <span className="block text-xs text-muted">{coins(a.price / a.count)} each</span>}
                </span>
                <CopyButton text={`/viewauction ${a.uuid}`} label="/viewauction" />
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">Cheapest Buy It Now auctions from the scan {ago(data.updatedAt)}. Some may have sold since.</p>
        </>
      )}
    </div>
  );
}

/**
 * `item`: { id, name, tier }. `stats` (the profile's) is used to tick off
 * requirements. Opens as a modal; Escape or the backdrop closes it.
 */
export default function ItemDialog({ item, stats, onClose }) {
  // Redraw when the item list arrives: names, rarities and accessory links come from it.
  useIcons();
  const ref = useRef(null);
  const [stack, setStack] = useState([item]);
  const current = stack[stack.length - 1];
  const neu = useLoad(() => loadNeuItem(current.id), [current.id]);
  const prices = useLoad(loadPrices, []);

  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  const open = (id) => {
    setStack((s) => [...s, { id, name: nameOf(id), tier: tierOf(id) }]);
    ref.current?.scrollTo({ top: 0 });
  };
  const back = () => setStack((s) => s.slice(0, -1));

  // In-game search text: the base item name, without stars or reforges.
  const searchName = (itemInfo(current.id).name ?? current.name).replace(/§./g, '').replace(/[✪➊-➎]/g, '').trim();
  const recipes = recipesOf(neu);

  return (
    <dialog
      ref={ref}
      className="item-dialog mc-panel"
      aria-labelledby="item-dialog-title"
      onClose={onClose}
      onClick={(e) => e.target === ref.current && ref.current.close()}
    >
      <div className="flex items-center gap-3 border-b border-line px-5 py-4">
        {stack.length > 1 && (
          <button type="button" onClick={back} className="mc-btn mc-btn-sm" aria-label={`Back to ${stack[stack.length - 2].name}`} title={`Back to ${stack[stack.length - 2].name}`}>
            <ArrowLeftIcon size={14} />
          </button>
        )}
        <ItemSlot id={current.id} rarity={current.tier} tooltip={false} />
        <h2 id="item-dialog-title" className={`min-w-0 flex-1 truncate font-semibold ${rarityClass(current.tier)}`}>
          {current.name}
        </h2>
        <button type="button" onClick={() => ref.current.close()} className="mc-btn mc-btn-sm" aria-label="Close">
          <XIcon size={14} />
        </button>
      </div>
      <div className="flex flex-col gap-6 px-5 py-5">
        <section aria-label="Item details">
          <ItemCardView key={current.id} content={current.card ?? itemCard({ id: current.id, name: current.name, rarity: current.tier })} />
        </section>
        <section aria-labelledby="item-dialog-recipe">
          <h3 id="item-dialog-recipe" className="mb-3 text-sm font-semibold">
            Recipe
          </h3>
          {neu === undefined ? (
            <div className="skeleton h-28" />
          ) : (
            <>
              <Requirements neu={neu} id={current.id} stats={stats} />
              {recipes.length ? (
                <div className="flex flex-col gap-5">
                  {recipes.map((r, i) => (
                    <Recipe key={`${current.id}-${i}`} recipe={r} resultId={current.id} prices={prices} onOpen={open} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted">No recipe: this one drops, comes from an NPC trade or another source.</p>
              )}
            </>
          )}
        </section>
        <section aria-labelledby="item-dialog-ah">
          <h3 id="item-dialog-ah" className="mb-3 text-sm font-semibold">
            Auction house
          </h3>
          <Listings key={current.id} id={current.id} name={searchName} />
        </section>
      </div>
    </dialog>
  );
}
