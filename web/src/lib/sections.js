/** Coins to buy everything still open in an advisor section (alternatives left out). */
export function remainingCost(section) {
  let total = 0;
  for (const g of section.groups) {
    for (const s of g.items) {
      if (s.status === 'done' || s.tags.includes('alternative')) continue;
      total += s.cost?.total ?? 0;
    }
  }
  return total;
}
