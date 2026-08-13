import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  configureClickIngest,
  recordOutboundClick,
  recordPageView,
  resetClickTrackingForTests,
} from './analyticsClicks';

afterEach(() => {
  resetClickTrackingForTests();
  vi.useRealTimers();
});

describe('recordPageView', () => {
  it('sends a page event and dedupes the same path for 2s', () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const ingest = vi.fn();
    configureClickIngest(ingest);

    recordPageView('/feed');
    recordPageView('/feed');
    expect(ingest).toHaveBeenCalledTimes(1);
    expect(ingest).toHaveBeenCalledWith([{ kind: 'page', target: '/feed' }]);

    vi.setSystemTime(2_000);
    recordPageView('/feed');
    expect(ingest).toHaveBeenCalledTimes(2);
  });

  it('does not send admin or auth routes', () => {
    const ingest = vi.fn();
    configureClickIngest(ingest);
    recordPageView('/admin/analytics');
    recordPageView('/auth/login');
    expect(ingest).not.toHaveBeenCalled();
  });
});

describe('recordOutboundClick', () => {
  it('records external http(s) hrefs as links', () => {
    const ingest = vi.fn();
    configureClickIngest(ingest);
    recordOutboundClick('https://example.com/a', 'https://app.example');
    expect(ingest).toHaveBeenCalledWith([
      { kind: 'link', target: 'https://example.com/a' },
    ]);
  });

  it('skips internal markdown hrefs so the router counts the page', () => {
    const ingest = vi.fn();
    configureClickIngest(ingest);
    recordOutboundClick('/@alice', 'https://app.example');
    recordOutboundClick('/posts/abc', 'https://app.example');
    recordOutboundClick('https://app.example/posts/abc', 'https://app.example');
    expect(ingest).not.toHaveBeenCalled();
  });
});
