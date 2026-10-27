// A popup for one item: how to craft it, a copyable /ahs command, and its
// cheapest Buy It Now auctions from the last auction house scan.
import { ArrowRightIcon, CheckIcon, CopyIcon, XIcon } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import { prettyId } from '../../../shared/analyze/helpers.js';
import { loadListings } from '../lib/data.js';
import { ago, coins, int, until } from '../lib/format.js';
import { itemInfo } from '../lib/icons.js';
import { loadNeuItem, recipesOf } from '../lib/neu.js';
import { ItemSlot } from '../mc.jsx';
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

const nameOf = (id) => itemInfo(id).name ?? prettyId(id);

function Recipe({ recipe, resultId }) {
  if (recipe.type === 'crafting') {
    const totals = new Map();
    for (const c of recipe.grid) if (c) totals.set(c.id, (totals.get(c.id) ?? 0) + c.count);
    return (
      <div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="mc-well grid grid-cols-3 gap-1 p-1.5">
            {recipe.grid.map((c, i) =>
              c ? <ItemSlot key={i} id={c.id} count={c.count} /> : <span key={i} className="mc-slot" aria-hidden="true" />,
            )}
          </div>
          <ArrowRightIcon size={22} className="text-muted" aria-hidden="true" />
          <ItemSlot id={resultId} count={recipe.count} tooltip={false} />
        </div>
        <ul className="mt-3 flex flex-col gap-1 text-sm">
          {[...totals].map(([id, n]) => (
            <li key={id}>
              <span className="text-muted tabular">{int(n)} ×</span> {nameOf(id)}
            </li>
          ))}
        </ul>
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
      <ul className="mt-2 flex flex-wrap gap-3">
        {recipe.inputs.map((c) => (
          <li key={c.id} className="flex items-center gap-2 text-sm">
            <ItemSlot id={c.id} count={c.count} />
            <span>
              <span className="text-muted tabular">{int(c.count)} ×</span> {nameOf(c.id)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Listings({ id, name }) {
  const [data, setData] = useState(undefined);
  useEffect(() => {
    let alive = true;
    loadListings()
      .then((d) => alive && setData(d))
      .catch(() => alive && setData(null));
    return () => {
      alive = false;
    };
  }, []);
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

/** `item`: { id, name, tier }. Opens as a modal; Escape or the backdrop closes it. */
export default function ItemDialog({ item, onClose }) {
  const ref = useRef(null);
  const [neu, setNeu] = useState(undefined);

  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  useEffect(() => {
    let alive = true;
    setNeu(undefined);
    loadNeuItem(item.id).then((d) => alive && setNeu(d));
    return () => {
      alive = false;
    };
  }, [item.id]);

  // In-game search text: the base item name, without stars or reforges.
  const searchName = (itemInfo(item.id).name ?? item.name).replace(/§./g, '').replace(/[✪➊-➎]/g, '').trim();
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
        <ItemSlot id={item.id} rarity={item.tier} tooltip={false} />
        <h2 id="item-dialog-title" className={`min-w-0 flex-1 truncate font-semibold ${rarityClass(item.tier)}`}>
          {item.name}
        </h2>
        <button type="button" onClick={() => ref.current.close()} className="mc-btn mc-btn-sm" aria-label="Close">
          <XIcon size={14} />
        </button>
      </div>
      <div className="flex flex-col gap-6 px-5 py-5">
        <section aria-labelledby="item-dialog-recipe">
          <h3 id="item-dialog-recipe" className="mb-3 text-sm font-semibold">
            Recipe
          </h3>
          {neu === undefined ? (
            <div className="skeleton h-28" />
          ) : recipes.length ? (
            <div className="flex flex-col gap-5">
              {recipes.map((r, i) => (
                <Recipe key={i} recipe={r} resultId={item.id} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">No recipe: this one drops, comes from an NPC trade or another source.</p>
          )}
        </section>
        <section aria-labelledby="item-dialog-ah">
          <h3 id="item-dialog-ah" className="mb-3 text-sm font-semibold">
            Auction house
          </h3>
          <Listings id={item.id} name={searchName} />
        </section>
      </div>
    </dialog>
  );
}
