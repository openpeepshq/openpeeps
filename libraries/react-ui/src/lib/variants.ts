import type { Variant } from '../types';
import { cn } from './utils';

const colorMap = {
  primary: {
    bg: 'bg-primary',
    text: 'text-primary',
    fg: 'text-primary-foreground',
  },
  secondary: {
    bg: 'bg-secondary',
    text: 'text-secondary',
    fg: 'text-secondary-foreground',
  },
  tertiary: {
    bg: 'bg-tertiary',
    text: 'text-tertiary',
    fg: 'text-tertiary-foreground',
  },
  success: {
    bg: 'bg-success',
    text: 'text-success',
    fg: 'text-success-foreground',
  },
  warning: {
    bg: 'bg-warning',
    text: 'text-warning',
    fg: 'text-warning-foreground',
  },
  error: { bg: 'bg-error', text: 'text-error', fg: 'text-error-foreground' },
  surface: {
    bg: 'bg-muted',
    text: 'text-foreground',
    fg: 'text-foreground',
  },
} as const;

type ColorKey = keyof typeof colorMap;

/**
 * Translate a Skeleton-style `variant-{kind}-{color}` string to Tailwind
 * classes. We keep the same string surface as @openpeepshq/ui so component call
 * sites can be ported 1:1.
 */
export function variantClasses(variant?: Variant): string {
  if (!variant) return '';
  const match = variant.match(/^variant-(filled|soft|ghost|ringed)-(.+)$/);
  if (!match) return '';
  const [, kind, color] = match;
  const c = colorMap[color as ColorKey];
  if (!c) return '';

  switch (kind) {
    case 'filled':
      return cn(c.bg, c.fg, color === 'primary' && 'shadow', 'hover:opacity-90');
    case 'soft':
      return cn(c.bg, c.fg, 'opacity-90 hover:opacity-100');
    case 'ghost':
      return cn(c.text, 'hover:bg-muted');
    case 'ringed':
      return cn(
        'border-2',
        `border-${color === 'surface' ? 'surface-400' : color}`,
        c.text,
      );
    default:
      return '';
  }
}
