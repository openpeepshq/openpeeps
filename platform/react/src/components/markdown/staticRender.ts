import { createContext, useContext } from 'react';

export interface StaticRenderContextValue {
  enabled: boolean;
  /** When set, relative `href`/`src` values are rewritten for email links. */
  baseUrl?: string;
}

const defaultValue: StaticRenderContextValue = { enabled: false };

/**
 * Signals that post content is being rendered in a static, non-interactive
 * context (e.g. server-rendered notification emails). When enabled, components
 * skip data-fetching/interactive affordances such as link previews so the
 * markup can render without the in-app providers (`OpenpeepsProvider`, query
 * client, …).
 */
export const StaticRenderContext =
  createContext<StaticRenderContextValue>(defaultValue);

export const useStaticRender = (): StaticRenderContextValue =>
  useContext(StaticRenderContext);

/** Prefix a path with `baseUrl` when rendering for email. */
export const resolveStaticUrl = (
  path: string,
  baseUrl?: string,
): string => {
  if (!baseUrl || !path.startsWith('/')) return path;
  return `${baseUrl.replace(/\/$/, '')}${path}`;
};
