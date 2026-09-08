import * as React from 'react';

/**
 * Visually hidden action text for icon-only controls.
 *
 * `aria-label` is what screen readers (Narrator, VoiceOver, NVDA) use.
 * This span keeps the same action word in the DOM for Read Mode / read-aloud
 * tools that ignore ARIA and extract visible text.
 */
export const AccessibleButtonLabel = ({ children }: { children: string }) => (
  <span className="sr-only">{children}</span>
);

/** Prefer an explicit `aria-label`, then `title` (the action word). */
export const accessibleNameFrom = (
  ariaLabel?: unknown,
  title?: string,
): string | undefined => {
  if (typeof ariaLabel === 'string' && ariaLabel.trim()) {
    return ariaLabel.trim();
  }
  if (title?.trim()) return title.trim();
  return undefined;
};

/** True when `children` already expose `name` as DOM text (skip sr-only). */
export const childrenIncludeName = (
  children: React.ReactNode,
  name: string,
): boolean => {
  const needle = name.trim().toLowerCase();
  if (!needle) return false;
  const visit = (node: React.ReactNode): boolean =>
    React.Children.toArray(node).some((child) => {
      if (typeof child === 'string' || typeof child === 'number') {
        return String(child).toLowerCase().includes(needle);
      }
      if (React.isValidElement<{ children?: React.ReactNode }>(child)) {
        return visit(child.props.children);
      }
      return false;
    });
  return visit(children);
};
