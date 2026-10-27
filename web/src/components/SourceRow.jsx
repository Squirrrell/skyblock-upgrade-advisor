import { ArrowRightIcon, CaretDownIcon, CheckIcon, CircleHalfIcon, InfoIcon, LightbulbIcon, QuestionIcon, XIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { coins, num } from '../lib/format.js';
import { itemInfo } from '../lib/icons.js';
import { ItemSlot } from '../mc.jsx';
import { Bar } from '../ui.jsx';

const STATUS = {
  done: { icon: CheckIcon, label: 'Done', className: 'text-accent' },
  partial: { icon: CircleHalfIcon, label: 'Partly done', className: 'text-warn' },
  missing: { icon: XIcon, label: 'Missing', className: 'text-danger' },
  unknown: { icon: QuestionIcon, label: 'Not readable from the API', className: 'text-muted' },
  tip: { icon: LightbulbIcon, label: 'Optional boost', className: 'text-muted' },
  info: { icon: InfoIcon, label: 'Info', className: 'text-muted' },
};

const SOURCE_LABEL = { bazaar: 'Bazaar', auction: 'Lowest BIN' };

// Rows that have no item to buy still get a fitting icon.
const ROW_ICONS = [
  [/^farming-level|^crop-upgrades|^tool-none/, 'WHEAT'],
  [/^anita|^personal-bests/, 'JACOBS_TICKET'],
  [/^plots|^garden-/, 'GRASS'],
  [/^visitors/, 'EMERALD'],
  [/^pest-bestiary|^pesterminator/, 'PESTHUNTING_GUIDE'],
  [/^crop-analyzer/, 'COMPASS'],
  [/^hunting-level|^hunt-/, 'BOW'],
  [/^davids-cloak/, 'DAVIDS_CLOAK'],
  [/^safari-belt|^majestic/, 'SAFARI_BELT'],
  [/^hunters-luck/, 'SAPLING'],
  [/^hotspot/, 'ESSENCE_SAFARI'],
  [/^century-cakes|cake/, 'CAKE'],
];
const SECTION_ICON = { farming: 'WHEAT', hunting: 'BOW', consumables: 'POTION' };

export function rowIcon(item, sectionId) {
  if (item.icon) return item.icon;
  const fromCost = item.cost?.lines?.find((l) => l.id)?.id;
  if (fromCost) return fromCost;
  return ROW_ICONS.find(([re]) => re.test(item.id))?.[1] ?? SECTION_ICON[sectionId] ?? 'BOOK';
}

function lineTooltip(line) {
  const tier = itemInfo(line.id).tier;
  return {
    name: line.name,
    rarity: tier ?? undefined,
    lines: [
      line.qty > 1 ? `Amount: ${line.qty}` : null,
      line.unit ? { text: `Price each: ${coins(line.unit)}`, color: 'var(--code-gold)' } : 'No live price',
      line.qty > 1 && line.total ? { text: `Total: ${coins(line.total)}`, color: 'var(--code-gold)' } : null,
      line.source ? `${SOURCE_LABEL[line.source]}${line.note ? `, ${line.note}` : ''}` : null,
    ],
  };
}

/** Purchase shown like a crafting recipe: inputs, arrow, the upgrade. */
function Recipe({ item, cost, icon }) {
  const gain = item.costGain > 0 ? item.costGain : item.gain;
  return (
    <div className="mc-well mt-1 mb-4 p-3 md:ml-[calc(var(--slot)+1rem)]">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-0">
          {cost.lines.map((line) => (
            <ItemSlot key={line.id} id={line.id} count={line.qty} tooltip={lineTooltip(line)} alt={line.name} />
          ))}
        </div>
        <ArrowRightIcon size={22} weight="bold" className="text-muted" aria-hidden="true" />
        <ItemSlot
          id={icon}
          glint
          tooltip={{
            name: item.name,
            lines: [
              gain > 0 ? { text: `+${num(gain)} ${item.unit}`, color: 'var(--code-green)' } : null,
              cost.total ? { text: `Cost: ${coins(cost.total)}`, color: 'var(--code-gold)' } : null,
            ],
            label: 'UPGRADE',
          }}
        />
        {gain > 0 && <span className="text-accent tabular">+{num(gain)}</span>}
      </div>
      <ul className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
        {cost.lines.map((line) => (
          <li key={line.id} className="flex justify-between gap-3">
            <span className="min-w-0 truncate">
              <span className="text-muted tabular">{line.qty}x</span> {line.name}
            </span>
            <span className="shrink-0 text-warn tabular">{line.total ? coins(line.total) : 'no price'}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function SourceRow({ item, sectionId }) {
  const [open, setOpen] = useState(false);
  const status = STATUS[item.status] ?? STATUS.info;
  const StatusIcon = status.icon;
  const showNumbers = item.max > 0 && item.status !== 'tip';
  const cost = item.cost;
  const hasLines = cost?.lines?.length > 0;
  const icon = rowIcon(item, sectionId);
  const isFortune = /fortune|%/.test(item.unit);

  return (
    <li className="border-b border-line last:border-b-0">
      <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-3 py-3 md:grid-cols-[auto_minmax(0,1fr)_180px_170px] md:items-start">
        <ItemSlot
          id={icon}
          tooltip={{
            name: item.name,
            lines: [item.detail, showNumbers ? { text: `${num(item.current)} / ${num(item.max)} ${item.unit}`, color: 'var(--code-yellow)' } : null],
            label: status.label.toUpperCase(),
          }}
        />

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <StatusIcon size={16} weight="bold" className={status.className} aria-label={status.label} />
            <h4 className="font-bold text-text">{item.name}</h4>
            {item.condition && <span className="bg-surface-2 px-2 text-sm text-muted">{item.condition}</span>}
          </div>
          {item.detail && <p className="mt-1 text-sm leading-relaxed text-muted">{item.detail}</p>}
          {item.action && <p className="mt-1.5 text-sm leading-relaxed text-text">{item.action}</p>}
        </div>

        <div className="col-start-2 md:col-start-3">
          {showNumbers && (
            <>
              <div className="flex items-baseline justify-between gap-2 text-sm tabular">
                <span className="mc-readout">
                  <span className="text-text">{num(item.current)}</span>
                  <span className="text-muted">/{num(item.max)}</span>
                </span>
                {item.gain > 0 && item.status !== 'unknown' && isFortune && <span className="text-accent">+{num(item.gain)}</span>}
              </div>
              <Bar value={item.max ? item.current / item.max : 0} gold={item.status === 'done'} className="mt-2" />
              <div className="mt-1 text-sm text-muted">{item.unit}</div>
            </>
          )}
        </div>

        <div className="col-start-2 md:col-start-4 md:text-right">
          {cost && (cost.total > 0 || cost.unpriced > 0) ? (
            <>
              <div className="inline-flex items-center gap-2 md:justify-end">
                <ItemSlot id="COINS" tooltip={false} className="scale-75" />
                <span className="mc-readout text-warn tabular">{cost.total > 0 ? coins(cost.total) : 'no price'}</span>
              </div>
              {item.costGain > 0 && item.costGain < item.gain && <div className="text-sm text-accent tabular">for the next +{num(item.costGain)}</div>}
              {cost.unpriced > 0 && cost.total > 0 && <div className="text-sm text-muted">+{cost.unpriced} item without a price</div>}
              {item.costNote && <div className="mt-0.5 text-sm leading-snug text-muted">{item.costNote}</div>}
              {hasLines && (
                <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="mc-btn mc-btn-sm mt-1.5">
                  {open ? 'Hide recipe' : 'Show recipe'}
                  <CaretDownIcon size={12} weight="bold" className={open ? 'rotate-180' : ''} />
                </button>
              )}
            </>
          ) : (
            item.costNote && item.status !== 'done' && <div className="text-sm leading-snug text-muted">{item.costNote}</div>
          )}
        </div>
      </div>

      {open && hasLines && <Recipe item={item} cost={cost} icon={icon} />}
    </li>
  );
}
