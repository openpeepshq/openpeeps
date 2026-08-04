import { Component, type FC, type ReactNode } from 'react';

import { usePluginRegistry } from './PluginRegistryProvider';
import { useT } from '../../i18n';

export interface PluginSlotProps {
  name: string;
  props?: Record<string, unknown>;
  className?: string;
}

// AGENTS.md forbids classes, but React Error Boundaries require a class
// component with getDerivedStateFromError / componentDidCatch. This is a
// deliberate, documented exception. See AGENTS.md "No TypeScript classes."
class ErrorBoundary extends Component<
  { children?: ReactNode; fallbackText?: string },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Plugin component render error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="border-error bg-error/10 text-error rounded border p-2 text-xs">
          {this.props.fallbackText ?? 'Render error'}
        </div>
      );
    }
    return this.props.children;
  }
}

export const PluginSlot: FC<PluginSlotProps> = ({
  name,
  props = {},
  className,
}) => {
  const { getComponentsForSlot } = usePluginRegistry();
  const t = useT();
  const entries = getComponentsForSlot(name);

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className={className} data-plugin-slot={name}>
      {entries.map(({ key, component: Component }) => (
        <div key={key} data-plugin-component={key}>
          <ErrorBoundary fallbackText={t('plugins.errorBoundary')}>
            <Component {...props} />
          </ErrorBoundary>
        </div>
      ))}
    </div>
  );
};
