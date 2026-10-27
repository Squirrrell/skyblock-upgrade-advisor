import { useEffect, useRef, useState } from 'react';
import { loadPackFiles, setIconPack, useIcons } from '../lib/icons.js';
import { ItemSlot } from '../mc.jsx';
import { BACKGROUNDS, ICON_PACKS } from '../theme.js';
import SearchForm from './SearchForm.jsx';

function useBackground() {
  const [bg, setBg] = useState(() => document.documentElement.dataset.theme || 'dark');
  const toggle = () => {
    const next = bg === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('theme', next);
    } catch {
      // private mode: the toggle still works for this visit
    }
    setBg(next);
  };
  return [bg, toggle];
}

const NAV = [
  { id: 'profile', label: 'Profile' },
  { id: 'bazaar', label: 'Bazaar' },
  { id: 'auctions', label: 'Auctions' },
  { id: 'calendar', label: 'Mayor & events' },
  { id: 'tools', label: 'Tools' },
];

const SOURCE_LABEL = { minecraft: 'from your Minecraft folder', saved: 'saved in this browser', picked: 'saved in this browser', bundled: 'bundled with the site' };

/**
 * Icon pack picker. FurfSky loads by itself (the copy bundled with the site,
 * or a newer one from your Minecraft folder), so the file button is only for
 * using a different copy of the pack.
 */
function PackPicker() {
  const { pack, packInfo, packLoading } = useIcons();
  const [status, setStatus] = useState(null);
  const fileRef = useRef(null);

  const onFile = async (e) => {
    const picked = [...(e.target.files ?? [])];
    e.target.value = '';
    if (!picked.length) return;
    setStatus(null);
    try {
      const count = await loadPackFiles(
        picked.map((file) => ({ name: file.name, blob: file })),
        'picked',
      );
      setIconPack('furfsky');
      if (!count) setStatus('No SkyBlock item textures found in that file.');
    } catch {
      setStatus('That file is not a readable resource pack.');
    }
  };

  const title = packInfo
    ? `${packInfo.count.toLocaleString('en-US')} FurfSky textures ${SOURCE_LABEL[packInfo.source]}: ${packInfo.names.join(', ')}. Click to pick different pack files.`
    : 'Pick FurfSky Reborn from .minecraft/resourcepacks (the .cats.zip, the FULL .zip, or both). It stays on your computer and is remembered here.';

  return (
    <div className="flex items-center gap-2">
      <label className="sr-only" htmlFor="icon-pack">
        Item icons
      </label>
      <select id="icon-pack" value={pack} onChange={(e) => setIconPack(e.target.value)} className="h-9 px-2 text-sm" title="Item icon pack">
        {Object.entries(ICON_PACKS).map(([id, p]) => (
          <option key={id} value={id}>
            {p.label}
          </option>
        ))}
      </select>
      {pack === 'furfsky' && (
        <>
          <button type="button" className="mc-btn mc-btn-sm" onClick={() => fileRef.current?.click()} title={title} disabled={packLoading}>
            {packLoading ? 'Loading pack...' : packInfo ? `${packInfo.count.toLocaleString('en-US')} textures` : 'Load FurfSky pack'}
          </button>
          <input ref={fileRef} type="file" multiple accept=".zip,.cats,application/zip" className="hidden" onChange={onFile} />
        </>
      )}
      {status && (
        <span className="text-sm text-muted" role="status">
          {status}
        </span>
      )}
    </div>
  );
}

/** Publish the header's height as --header-h so sticky bars can sit under it. */
function useHeaderHeight(ref) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => document.documentElement.style.setProperty('--header-h', `${el.offsetHeight}px`));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
}

export default function Header({ onHome, onSearch, onPage, onProfile, page, current, lastPlayer }) {
  const [bg, toggleBg] = useBackground();
  const headerRef = useRef(null);
  useHeaderHeight(headerRef);
  const other = bg === 'dark' ? 'light' : 'dark';
  const nav = (id) => {
    if (id !== 'profile') return onPage(id);
    if (lastPlayer) return onProfile();
    return onPage('');
  };
  return (
    <header ref={headerRef} className="scope-dark sticky top-0 z-30 border-b border-black bg-[var(--mc-well)]">
      <div className="mx-auto flex h-16 w-full max-w-[1240px] items-center gap-3 px-4 sm:px-6">
        <button type="button" onClick={onHome} className="flex shrink-0 items-center gap-2 py-1 pr-2 text-left font-bold">
          <ItemSlot id="NETHER_STAR" tooltip={false} />
          <span className="hidden text-[var(--code-yellow)] lg:inline">SkyBlock Advisor</span>
        </button>
        <nav aria-label="Site" className="hidden items-center gap-1 md:flex">
          {NAV.map(({ id, label }) => (
            <button key={id} type="button" onClick={() => nav(id)} aria-current={page === id ? 'page' : undefined} className="mc-btn mc-btn-sm">
              {label}
            </button>
          ))}
        </nav>
        <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2">
          {page && (
            <div className="hidden w-full max-w-xs sm:block">
              <SearchForm onSearch={onSearch} initial={current} size="sm" />
            </div>
          )}
          <div className="hidden xl:block">
            <PackPicker />
          </div>
          <button type="button" onClick={toggleBg} className="mc-btn mc-btn-sm shrink-0" title={`Switch to the ${BACKGROUNDS[other].label} background`}>
            {BACKGROUNDS[other].label}
          </button>
        </div>
      </div>
      <div className="scroll-x relative flex items-center gap-1 border-t border-white/10 px-4 py-1.5 xl:hidden">
        <nav aria-label="Site" className="flex gap-1 md:hidden">
          {NAV.map(({ id, label }) => (
            <button key={id} type="button" onClick={() => nav(id)} aria-current={page === id ? 'page' : undefined} className="mc-btn mc-btn-sm">
              {label}
            </button>
          ))}
        </nav>
        <div className="ml-auto shrink-0">
          <PackPicker />
        </div>
      </div>
    </header>
  );
}
