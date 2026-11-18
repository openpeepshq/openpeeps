/** @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PublicPost } from '@openpeepshq/common/types';
import { StaticRenderContext } from '../markdown/staticRender';
import { ResourceCard } from './ResourceCard';

const navigate = vi.fn();

// Mutable locale bundle backing the useT stub below. Mirrors the RN test's
// `mockTranslations` so a test can register `resources.library.openCategory`
// (a translated value) or drop it (degradation) to pin both directions of the
// web chip `title` tooltip (issue #1750, round-8 item 1).
let mockI18nBundle: Record<string, string> = {};

vi.mock('../../i18n', () => ({
  // Real i18next resolves a missing key with a `defaultValue` to the
  // interpolated default; the stub reproduces that so the degradation
  // direction is exercised the way it ships. The factory may only reference
  // the `mock`-prefixed bundle (Vitest hoisting rule), so interpolation is
  // inlined here rather than calling a top-level helper.
  useT:
    () =>
    (key: string, opts?: { defaultValue?: string; [k: string]: unknown }) => {
      const raw = mockI18nBundle[key] ?? opts?.defaultValue ?? key;
      return raw.replace(/\{\{(\w+)\}\}/g, (match, name: string) =>
        String(opts?.[name] ?? match),
      );
    },
}));

vi.mock('../../contexts/openpeeps', () => ({
  useOpenpeeps: () => ({
    openpeepsApi: {
      useCurrentProfileBookmarkedIds: () => ({ data: [] }),
      bookmarkPostAction: () => async () => undefined,
      unbookmarkPostAction: () => async () => undefined,
    },
  }),
}));

vi.mock('../layout/IdentityContext', () => ({
  useCurrentProfile: () => undefined,
}));

vi.mock('../../contexts/router', () => ({
  useNavigate: () => navigate,
  useHrefOf: () => () => '#',
}));

vi.mock('../post/TruncatedMarkdown', () => ({
  TruncatedMarkdown: () => null,
}));

vi.mock('../post/VideoPlayOverlay', () => ({
  VideoPlayOverlay: () => null,
}));

const resourcePost = (tags: string[]): PublicPost =>
  ({
    id: 'post-1',
    type: 'resource',
    data: {
      type: 'resource',
      title: 'Guide',
      resourceKind: 'link',
      url: 'https://example.com',
      tags,
    },
  }) as PublicPost;

const filePost = (): PublicPost =>
  ({
    id: 'post-file',
    type: 'resource',
    data: {
      type: 'resource',
      title: 'Quarterly report',
      resourceKind: 'file',
      attachments: [
        {
          type: 'file',
          url: 'https://cdn.example.com/report.pdf',
          filename: 'report.pdf',
          meta: { size: 2500000, mimetype: 'application/pdf' },
        },
      ],
    },
  }) as PublicPost;

describe('ResourceCard', () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    navigate.mockClear();
    mockI18nBundle = {};
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    root = undefined;
    container = undefined;
  });

  it('navigates to the tag page when a hashtag chip is clicked', async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        createElement(ResourceCard, { post: resourcePost(['Juneteenth']) }),
      );
    });

    const chip = [...container.querySelectorAll('button')].find(
      (button) => button.textContent === '#juneteenth',
    );
    expect(chip).toBeTruthy();

    await act(async () => {
      chip?.click();
    });

    expect(navigate).toHaveBeenCalledWith({
      type: 'tags',
      hashtag: 'juneteenth',
    });
  });

  it('shows the filename with its extension for a file resource', async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(createElement(ResourceCard, { post: filePost() }));
    });

    // filename + extension, followed by the formatted size
    expect(container.textContent).toContain('report.pdf');
    expect(container.textContent).toContain('2.4 MB');
  });

  const categoryPost = (
    categoryPath: string[],
    group?: { handle: string },
  ): PublicPost =>
    ({
      id: 'post-category',
      type: 'resource',
      data: {
        type: 'resource',
        title: 'Guide',
        resourceKind: 'link',
        url: 'https://example.com',
        categoryPath,
      },
      ...(group ? { group } : {}),
    }) as PublicPost;

  const categoryButtons = (): HTMLButtonElement[] =>
    [...(container?.querySelectorAll('button') ?? [])].filter((button) =>
      ['Brand', 'Marketing'].includes(button.textContent ?? ''),
    );

  it('navigates to the resource library filtered to the clicked segment', async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        createElement(ResourceCard, {
          post: categoryPost(['Brand', 'Marketing']),
        }),
      );
    });

    const [brand, marketing] = categoryButtons();
    expect(categoryButtons()).toHaveLength(2);

    await act(async () => {
      marketing?.click();
    });
    expect(navigate).toHaveBeenLastCalledWith({
      type: 'resources',
      category: ['Brand', 'Marketing'],
    });

    // A mid-path segment targets the folder prefix up to that segment.
    await act(async () => {
      brand?.click();
    });
    expect(navigate).toHaveBeenLastCalledWith({
      type: 'resources',
      category: ['Brand'],
    });
  });

  it('navigates to the group resources tab for a group post', async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        createElement(ResourceCard, {
          post: categoryPost(['Brand', 'Marketing'], { handle: 'team' }),
        }),
      );
    });

    await act(async () => {
      categoryButtons()[1]?.click();
    });
    expect(navigate).toHaveBeenCalledWith({
      type: 'group',
      handle: 'team',
      section: 'resources',
      category: ['Brand', 'Marketing'],
    });
  });

  it('filters the surrounding library when onSelectCategory is provided', async () => {
    const onSelectCategory = vi.fn();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        createElement(ResourceCard, {
          post: categoryPost(['Brand', 'Marketing']),
          onSelectCategory,
        }),
      );
    });

    await act(async () => {
      categoryButtons()[1]?.click();
    });
    expect(onSelectCategory).toHaveBeenCalledWith(['Brand', 'Marketing']);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('renders the category path as inert text in a static render (no buttons)', async () => {
    // The email/static path must not ship interactive affordances: the
    // category path renders as plain text and the surrounding card has no
    // clickable segments.
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        createElement(
          StaticRenderContext.Provider,
          { value: { enabled: true } },
          createElement(ResourceCard, {
            post: categoryPost(['Brand', 'Marketing']),
            layout: 'list',
          }),
        ),
      );
    });

    expect(container.textContent).toContain('Brand / Marketing');
    const interactive = [
      ...(container?.querySelectorAll('button') ?? []),
    ].filter((button) =>
      ['Brand', 'Marketing'].includes(button.textContent ?? ''),
    );
    expect(interactive).toHaveLength(0);
  });

  it('uses the registered openCategory translation for the chip title tooltip', async () => {
    // With the key registered (a translated, non-default value), the chip
    // button's browser `title` must be the translated, interpolated string —
    // not the bare key and not the hardcoded English default. This is the web
    // half of the round-7 i18n hole: the `useT` stub now resolves the key from
    // the bundle, so a missing/misspelled `resources.library.openCategory`
    // cannot hide behind the always-present `defaultValue`. (issue #1750,
    // round-8 item 1.)
    mockI18nBundle['resources.library.openCategory'] =
      'Ressourcen in {{name}} anzeigen';
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        createElement(ResourceCard, {
          post: categoryPost(['Brand', 'Marketing']),
        }),
      );
    });

    const chip = [...container.querySelectorAll('button')].find(
      (button) => button.textContent === 'Marketing',
    );
    expect(chip).toBeTruthy();
    const title = chip?.getAttribute('title');
    expect(title).toBe('Ressourcen in Marketing anzeigen');
    // Not the bare key (a registration bug) and not the English default (the
    // stub can only produce a translated value if the key is registered).
    expect(title).not.toBe('resources.library.openCategory');
    expect(title).not.toBe('Show resources in Marketing');
  });

  it('degrades the chip title to the interpolated English default when the key is missing', async () => {
    // Key absent from the bundle: i18next falls back to the interpolated
    // `defaultValue`, so the shipped tooltip silently shows the English copy.
    // Pinning this exact degradation — the web analogue of the RN
    // accessibilityLabel bare-key test (issue #1750, round-8 item 1).
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        createElement(ResourceCard, {
          post: categoryPost(['Brand', 'Marketing']),
        }),
      );
    });

    const chip = [...container.querySelectorAll('button')].find(
      (button) => button.textContent === 'Marketing',
    );
    expect(chip).toBeTruthy();
    expect(chip?.getAttribute('title')).toBe('Show resources in Marketing');
  });

  it('in-library: the chip click filters and does not open the post, while the rest of the anchor still does', async () => {
    // Pins the composed contract that actually ships: ResourceLibrary nests
    // the real ResourceCard inside <a href=post>, and the category chip must
    // win the click (preventDefault + stopPropagation) so filtering happens
    // instead of navigating, while clicking the rest of the anchor still
    // opens the post. If a refactor dropped stopPropagation from the chip (or
    // added an onClick to the anchor that the chip must not trigger), this
    // fails. (issue #1750, round-8 item 2.) The anchor onClick stands in for
    // the browser following the href, which jsdom does not perform for full
    // navigations; a hash href keeps the anchor real without that noise.
    const onSelectCategory = vi.fn();
    const anchorClick = vi.fn();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        createElement(
          'a',
          { href: '#post-1', onClick: anchorClick },
          createElement(ResourceCard, {
            post: categoryPost(['Brand', 'Marketing']),
            onSelectCategory,
          }),
        ),
      );
    });

    const chip = [...container.querySelectorAll('button')].find(
      (button) => button.textContent === 'Marketing',
    );
    expect(chip).toBeTruthy();

    // Clicking the chip fires the library filter and the click does not
    // reach the surrounding anchor, so the post does not open.
    await act(async () => {
      chip?.click();
    });
    expect(onSelectCategory).toHaveBeenCalledWith(['Brand', 'Marketing']);
    expect(anchorClick).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();

    // Clicking the rest of the anchor (the title, not the chip) still opens
    // the post: the anchor handler fires and the filter does not grow.
    const title = container.querySelector('h3');
    expect(title).toBeTruthy();
    await act(async () => {
      title?.click();
    });
    expect(anchorClick).toHaveBeenCalledTimes(1);
    expect(onSelectCategory).toHaveBeenCalledTimes(1);
  });
});
