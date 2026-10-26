// Permanent stat consumables: things you eat or drink once (or a few times)
// for a lasting bonus. Only ones Hypixel exposes in the profile API are checked.
import { group, priceLines, source } from './helpers.js';

const CONSUMABLES = [
  {
    id: 'WRIGGLING_LARVA',
    name: 'Wriggling Larva',
    max: 5,
    read: (m) => m.garden_player_data?.larva_consumed,
  },
  {
    id: 'REFINED_DARK_CACAO_TRUFFLE',
    name: 'Refined Dark Cacao Truffle',
    max: 5,
    effect: '+1 cocoa beans fortune each',
    read: (m) => m.events?.easter?.refined_dark_cacao_truffles,
  },
  {
    id: 'REAPER_PEPPER',
    name: 'Reaper Pepper',
    max: 5,
    read: (m) => m.player_data?.reaper_peppers_eaten,
  },
  {
    id: 'MCGRUBBER_BURGER',
    name: "McGrubber's Burger",
    max: 5,
    read: (m) => m.rift?.castle?.grubber_stacks,
  },
  {
    id: 'REFINED_BOTTLE_OF_JYRRE',
    name: 'Refined Bottle of Jyrre',
    max: 5,
    read: (m) => m.winter_player_data?.refined_jyrre_uses,
  },
  {
    id: 'METAPHYSICAL_SERUM',
    name: 'Metaphysical Serum',
    max: 3,
    effect: 'Extra Experimentation Table clicks',
    read: (m) => m.experimentation?.serums_drank,
  },
  {
    id: 'TELEPORTER_PILL',
    name: 'Teleporter Pill',
    max: 1,
    read: (m) => (m.item_data?.teleporter_pill_consumed ? 1 : 0),
  },
  {
    id: 'RIFT_PRISM',
    name: 'Rift Prism',
    max: 1,
    read: (m) => (m.rift?.access?.consumed_prism ? 1 : 0),
  },
];

export function analyzeConsumables(ctx) {
  const { member, book } = ctx;
  const rows = CONSUMABLES.map((c) => {
    const eaten = Math.min(c.max, Number(c.read(member) ?? 0));
    const left = c.max - eaten;
    return source({
      id: `cons-${c.id.toLowerCase()}`,
      name: c.name,
      current: eaten,
      max: c.max,
      unit: 'used',
      detail: c.effect ? `${eaten}/${c.max} used. ${c.effect}.` : `${eaten}/${c.max} used`,
      action: left > 0 ? `Use ${left} more` : null,
      cost: left > 0 ? priceLines(book, [{ id: c.id, qty: left }]) : null,
    });
  });

  const now = Date.now();
  const cakes = (member.player_data?.temp_stat_buffs ?? []).filter((b) => b.key?.startsWith('cake_') && b.expire_at > now);
  rows.push(
    source({
      id: 'century-cakes',
      name: 'Century Cakes',
      status: cakes.length ? 'done' : 'tip',
      current: cakes.length,
      max: cakes.length || 1,
      unit: 'active',
      detail: cakes.length
        ? `${cakes.length} cake buffs active: ${cakes.map((c) => c.stat_id?.replace(/_/g, ' ')).join(', ')}`
        : 'No Century Cake buffs active. Each cake gives a small stat for 48 hours.',
    }),
    source({
      id: 'rosewater-general',
      name: 'Filled Rosewater Flask',
      status: 'unknown',
      max: 5,
      unit: 'used',
      detail: 'Up to 5, +1 farming fortune each. Hypixel does not report this one.',
      cost: priceLines(book, [{ id: 'FILLED_ROSEWATER_FLASK', qty: 5 }]),
      costNote: 'Price for all 5',
    }),
  );

  return {
    id: 'consumables',
    title: 'Consumables',
    groups: [group('permanent', 'One-time consumables', rows)],
    totals: null,
  };
}
