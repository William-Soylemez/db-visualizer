// Deterministic color for a cluster's predicted function label.
// Unlabeled clusters render gray; labeled ones get a stable hue from the label.

const GRAY = "#d4d4d8";

export function functionColor(fn: string | null): string {
  if (!fn) return GRAY;
  let h = 0;
  for (let i = 0; i < fn.length; i++) {
    h = (h * 31 + fn.charCodeAt(i)) % 360;
  }
  return `hsl(${h} 65% 55%)`;
}
