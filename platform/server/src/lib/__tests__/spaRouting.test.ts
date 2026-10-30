import { describe, expect, it } from 'vitest';
import { decideSpaRequest } from '../spaHtml';

describe('decideSpaRequest', () => {
  it('redirects the static index to the rendered route', () => {
    expect(decideSpaRequest('/index.html')).toEqual({
      action: 'redirect',
      to: '/',
    });
    expect(decideSpaRequest('/index.htm')).toEqual({
      action: 'redirect',
      to: '/',
    });
    expect(decideSpaRequest('/INDEX.HTML')).toEqual({
      action: 'redirect',
      to: '/',
    });
  });

  it('redirects the bare posts list to the page that actually lists posts', () => {
    expect(decideSpaRequest('/posts')).toEqual({
      action: 'redirect',
      to: '/feeds/local',
    });
    expect(decideSpaRequest('/posts/')).toEqual({
      action: 'redirect',
      to: '/feeds/local',
    });
    // Only the list spelling redirects; detail pages stay served.
    expect(decideSpaRequest('/posts/01a1115b-7495')).toEqual({
      action: 'serve',
    });
  });

  it('rejects probes for other stacks instead of serving a 200 shell', () => {
    for (const path of [
      '/index.php',
      '/wp-login.php',
      '/.env',
      '/config.ini',
      '/backup.sql',
      '/shell.php~',
      '/admin/backup.bak',
    ]) {
      expect(decideSpaRequest(path), path).toEqual({ action: 'reject' });
    }
  });

  it('serves app routes, including handles that contain a dot', () => {
    expect(decideSpaRequest('/')).toEqual({ action: 'serve' });
    expect(decideSpaRequest('/posts/01a1115b-7495')).toEqual({
      action: 'serve',
    });
    expect(decideSpaRequest('/groups/@echo')).toEqual({ action: 'serve' });
    expect(decideSpaRequest('/@a.b.c')).toEqual({ action: 'serve' });
    expect(decideSpaRequest('/events/01a1/jam')).toEqual({ action: 'serve' });
  });

  it('does not treat the root index or a bare directory as unusable', () => {
    expect(decideSpaRequest('/assets/')).toEqual({ action: 'serve' });
    expect(decideSpaRequest('/well-known')).toEqual({ action: 'serve' });
  });
});
