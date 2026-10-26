import {
  CaretDownIcon,
  CheckCircleIcon,
  CircleHalfIcon,
  CircleIcon,
  InfoIcon,
  LightbulbIcon,
  QuestionIcon,
} from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { coins, num } from '../lib/format.js';

const STATUS = {
  done: { icon: CheckCircleIcon, label: 'Done', className: 'text-accent', weight: 'fill' },
  partial: { icon: CircleHalfIcon, label: 'Partly done', className: 'text-warn', weight: 'fill' },
  missing: { icon: CircleIcon, label: 'Missing', className: 'text-muted', weight: 'regular' },
  unknown: { icon: QuestionIcon, label: 'Not readable from the API', className: 'text-muted', weight: 'regular' },
  tip: { icon: LightbulbIcon, label: 'Optional boost', className: 'text-muted', weight: 'regular' },
  info: { icon: InfoIcon, label: 'Info', className: 'text-muted', weight: 'regular' },
};

const SOURCE_LABEL = { bazaar: 'Bazaar', auction: 'Lowest BIN' };

export default function SourceRow({ item }) {
  const [open, setOpen] = useState(false);
  const status = STATUS[item.status] ?? STATUS.info;
  const Icon = status.icon;
  const showNumbers = item.max > 0 && item.status !== 'tip';
  const pct = item.max > 0 ? Math.min(100, (item.current / item.max) * 100) : 0;
  const cost = item.cost;
  const hasLines = cost?.lines?.length > 0;

  return (
    <li className="border-b border-line last:border-b-0">
      <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-3 py-4 md:grid-cols-[auto_minmax(0,1fr)_170px_160px] md:items-start">
        <span className={`mt-0.5 ${status.className}`} title={status.label}>
          <Icon weight={status.weight} size={20} aria-label={status.label} />
        </span>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h4 className="font-medium text-text">{item.name}</h4>
            {item.condition && (
              <span className="rounded-md bg-surface-2 px-2 py-0.5 text-xs text-muted">{item.condition}</span>
            )}
          </div>
          {item.detail && <p className="mt-1 text-sm leading-relaxed text-muted">{item.detail}</p>}
          {item.action && <p className="mt-1.5 text-sm leading-relaxed text-text">{item.action}</p>}
        </div>

        <div className="col-start-2 md:col-start-3">
          {showNumbers && (
            <>
              <div className="flex items-baseline justify-between gap-2 font-mono text-sm tabular">
                <span>
                  <span className="text-text">{num(item.current)}</span>
                  <span className="text-muted"> / {num(item.max)}</span>
                </span>
                {item.gain > 0 && item.status !== 'unknown' && /fortune|%/.test(item.unit) && (
                  <span className="text-accent">+{num(item.gain)}</span>
                )}
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-line">
                <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-1.5 text-xs text-muted">{item.unit}</div>
            </>
          )}
        </div>

        <div className="col-start-2 md:col-start-4 md:text-right">
          {cost && (cost.total > 0 || cost.unpriced > 0) ? (
            <>
              <div className="font-mono text-sm text-text tabular">{cost.total > 0 ? `${coins(cost.total)} coins` : 'No live price'}</div>
              {item.costGain > 0 && item.costGain < item.gain && (
                <div className="font-mono text-xs text-accent tabular">for the next +{num(item.costGain)}</div>
              )}
              {cost.unpriced > 0 && cost.total > 0 && <div className="text-xs text-muted">+{cost.unpriced} item without a price</div>}
              {item.costNote && <div className="mt-0.5 text-xs leading-snug text-muted">{item.costNote}</div>}
              {hasLines && (
                <button
                  type="button"
                  onClick={() => setOpen((o) => !o)}
                  aria-expanded={open}
                  className="mt-1.5 inline-flex items-center gap-1 rounded-md text-xs font-medium text-accent hover:underline"
                >
                  {open ? 'Hide' : 'Show'} items
                  <CaretDownIcon size={12} weight="bold" className={`transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>
              )}
            </>
          ) : (
            item.costNote && item.status !== 'done' && <div className="text-xs leading-snug text-muted">{item.costNote}</div>
          )}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open && hasLines && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className="mb-4 ml-9 rounded-lg bg-surface-2 p-3"
          >
            <table className="w-full text-sm">
              <thead className="sr-only">
                <tr>
                  <th>Item</th>
                  <th>Unit price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {cost.lines.map((line) => (
                  <tr key={line.id} className="align-top">
                    <td className="py-1 pr-3">
                      <span className="font-mono text-muted tabular">{line.qty}x</span> {line.name}
                      {line.source && (
                        <span className="ml-2 text-xs text-muted">
                          {SOURCE_LABEL[line.source]}
                          {line.note ? `, ${line.note}` : ''}
                        </span>
                      )}
                    </td>
                    <td className="py-1 pr-3 text-right font-mono text-muted tabular">{line.unit ? coins(line.unit) : '-'}</td>
                    <td className="py-1 text-right font-mono tabular">{line.total ? coins(line.total) : 'no price'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}
