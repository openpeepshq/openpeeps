import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = {
  title: string;
  children: ReactNode;
};

type State = {
  error: Error | null;
};

/**
 * Isolates a single showcase: without this, one component missing a provider
 * or fixture field takes down the whole gallery page.
 */
export class ShowcaseBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Showcase render failed', {
      title: this.props.title,
      error,
      componentStack: info.componentStack,
    });
  }

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <section className="border-destructive/40 bg-destructive/5 mb-6 rounded-lg border p-4">
        <h3 className="text-destructive text-sm font-semibold">
          {this.props.title} failed to render
        </h3>
        <p className="text-muted-foreground mt-1 font-mono text-xs">
          {error.message}
        </p>
      </section>
    );
  }
}
