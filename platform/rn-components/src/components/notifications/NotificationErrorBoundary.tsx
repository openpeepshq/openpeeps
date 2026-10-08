import { Component, type ErrorInfo, type ReactNode } from 'react';

type NotificationErrorBoundaryProps = {
  children: ReactNode;
  notificationId?: string;
};

type NotificationErrorBoundaryState = {
  hasError: boolean;
};

/**
 * Per-notification error isolation so one broken entry cannot blank the feed.
 * React only supports error boundaries as class components.
 */
export class NotificationErrorBoundary extends Component<
  NotificationErrorBoundaryProps,
  NotificationErrorBoundaryState
> {
  state: NotificationErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): NotificationErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Notification render failed', {
      notificationId: this.props.notificationId,
      error,
      componentStack: info.componentStack,
    });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}
