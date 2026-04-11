/** Format integer som for display (matches Figma spacing: "79 000 so'm"). */
export function formatUzs(amount) {
  const n = Math.round(Number(amount) || 0);
  const spaced = String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${spaced} so'm`;
}
