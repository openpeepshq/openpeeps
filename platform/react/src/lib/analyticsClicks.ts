import { useEffect } from 'react';
import { isExternalLink } from '../components/markdown/linkTargets';
import { useOpenpeeps } from '../contexts/openpeeps';
import { useOptionalPathname } from '../contexts/router';

export type AnalyticsClickEvent = { kind: 'page' | 'link'; target: string };

type ClickIngest = (events: AnalyticsClickEvent[]) => void;

const PAGE_DEDUPE_MS = 2_000;

let ingest: ClickIngest | undefined;
let lastPage: string | undefined;
let lastPageAt = 0;

export const configureClickIngest = (next: ClickIngest | undefined) => {
  ingest = next;
};

export const resetClickTrackingForTests = () => {
  ingest = undefined;
  lastPage = undefined;
  lastPageAt = 0;
};

export const recordPageView = (pathname: string) => {
  if (!pathname) return;
  if (
    pathname === '/admin' ||
    pathname.startsWith('/admin/') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/api')
  ) {
    return;
  }
  const now = Date.now();
  if (pathname === lastPage && now - lastPageAt < PAGE_DEDUPE_MS) return;
  lastPage = pathname;
  lastPageAt = now;
  ingest?.([{ kind: 'page', target: pathname }]);
};

export const recordOutboundClick = (href: string, origin?: string) => {
  if (!href) return;
  const resolvedOrigin =
    origin ??
    (typeof window !== 'undefined' ? window.location.origin : undefined);
  if (!isExternalLink(href, resolvedOrigin)) return;
  ingest?.([{ kind: 'link', target: href }]);
};

/** Configures ingest and records in-app page views (anonymous + signed-in). */
export const AnalyticsClickTracker = () => {
  const { client } = useOpenpeeps();
  const pathname = useOptionalPathname();

  useEffect(() => {
    configureClickIngest((events) => {
      void client.analytics.recordClicks({ events });
    });
    return () => configureClickIngest(undefined);
  }, [client]);

  useEffect(() => {
    if (!pathname) return;
    recordPageView(pathname);
  }, [pathname]);

  return null;
};
