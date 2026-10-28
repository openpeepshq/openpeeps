import type { ComponentType } from 'react';
import type { LucideIcon, LucideProps } from 'lucide-react-native';
import { cssInterop } from 'nativewind';

// Rounded stroke endpoints to match the web app's lucide-react defaults.
export const iconWithClassName = (icon: LucideIcon) => {
  const WrappedIcon = cssInterop(icon, {
    className: {
      target: 'style',
      nativeStyleToProp: {
        color: true,
        opacity: true,
      },
    },
  }) as ComponentType<LucideProps>;

  const WithRoundedStrokes: ComponentType<LucideProps> = (props) => (
    <WrappedIcon strokeLinecap="round" strokeLinejoin="round" {...props} />
  );
  return WithRoundedStrokes;
};
