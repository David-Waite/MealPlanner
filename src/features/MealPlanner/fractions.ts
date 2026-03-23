export const FRACTIONS = [
  { label: "¼", value: 0.25 },
  { label: "½", value: 0.5 },
  { label: "¾", value: 0.75 },
  { label: "1",  value: 1 },
  { label: "1½", value: 1.5 },
  { label: "2",  value: 2 },
  { label: "3",  value: 3 },
] as const;

export function formatQty(n: number): string {
  if (n === 0.25) return "¼";
  if (n === 0.5)  return "½";
  if (n === 0.75) return "¾";
  if (n === 1.5)  return "1½";
  if (Number.isInteger(n)) return String(n);
  // strip trailing zeros for arbitrary decimals
  return parseFloat(n.toFixed(3)).toString();
}
