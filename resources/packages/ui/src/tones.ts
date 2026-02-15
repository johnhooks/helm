export const LCARS_TONES = [
  'neutral',
  'accent',
  'muted',
  'danger',
  'success',
  'warning',
  'info',
  'orange',
  'gold',
  'blue',
  'sky',
  'ice',
  'lilac',
  'violet',
] as const;

export type LcarsTone = (typeof LCARS_TONES)[number];
