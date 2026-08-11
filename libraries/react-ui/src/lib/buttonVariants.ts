import { cva } from 'class-variance-authority';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-button text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:opacity-90 shadow',
        destructive:
          'bg-destructive text-destructive-foreground hover:opacity-90',
        outline:
          'border border-input bg-background hover:bg-surface hover:text-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:opacity-90',
        ghost: 'hover:bg-surface hover:text-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-11 px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

/** Figma / shadcn Button variant surface (AllPeep UI 2026). */
export type StyledButtonVariant =
  | 'default'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'destructive'
  | 'link';

/**
 * `unstyled` drops every variant/size class so a caller can style the control
 * itself while keeping Button's action / loading behaviour.
 */
export type ButtonVariant = StyledButtonVariant | 'unstyled';

export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';
