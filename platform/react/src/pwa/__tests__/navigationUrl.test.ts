import { describe, expect, it } from 'vitest';
import {
  parseGotoAction,
  resolveGotoTarget,
  toRouterPath,
} from '../navigationUrl';

const origin = 'https://inside.ap.social';

describe('toRouterPath', () => {
  it('strips same-origin absolute URLs to path+search+hash', () => {
    expect(
      toRouterPath(
        'https://inside.ap.social/posts/019f9481-7524-7137-9e95-a504a18ddc8c',
        origin,
      ),
    ).toBe('/posts/019f9481-7524-7137-9e95-a504a18ddc8c');

    expect(
      toRouterPath(
        'https://inside.ap.social/conversations/abc?x=1#top',
        origin,
      ),
    ).toBe('/conversations/abc?x=1#top');
  });

  it('leaves relative paths and cross-origin URLs unchanged', () => {
    expect(toRouterPath('/posts/1', origin)).toBe('/posts/1');
    expect(toRouterPath('https://other.example/posts/1', origin)).toBe(
      'https://other.example/posts/1',
    );
  });
});

describe('parseGotoAction', () => {
  it('uses slice so absolute goto targets keep their scheme', () => {
    expect(parseGotoAction('goto:/posts/1')).toBe('/posts/1');
    expect(parseGotoAction('goto:https://inside.ap.social/posts/1')).toBe(
      'https://inside.ap.social/posts/1',
    );
  });
});

describe('resolveGotoTarget', () => {
  it('resolves relative goto actions without doubling the origin', () => {
    expect(resolveGotoTarget('goto:/posts/1', origin)).toEqual({
      absoluteUrl: 'https://inside.ap.social/posts/1',
      routerPath: '/posts/1',
    });
  });

  it('keeps absolute goto actions and still returns a router path', () => {
    expect(
      resolveGotoTarget('goto:https://inside.ap.social/posts/1', origin),
    ).toEqual({
      absoluteUrl: 'https://inside.ap.social/posts/1',
      routerPath: '/posts/1',
    });
  });

  it('respects a non-root base path', () => {
    expect(resolveGotoTarget('goto:/posts/1', origin, '/app/')).toEqual({
      absoluteUrl: 'https://inside.ap.social/app/posts/1',
      routerPath: '/app/posts/1',
    });
  });
});
