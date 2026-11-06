/** @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeColorPreview } from './ThemeColorPreview';

vi.mock('../../../i18n', () => ({
  useT: () => (key: string, opts?: Record<string, string>) =>
    opts ? `${key}:${opts.mode}:${opts.ratio}` : key,
}));

describe('ThemeColorPreview', () => {
  let root: Root;
  let container: HTMLDivElement;

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  const render = (primaryHex: string, mode: 'light' | 'dark' = 'light') => {
    act(() => {
      root.render(
        createElement(ThemeColorPreview, {
          mode,
          primaryHex,
          buttonRadius: '4px',
        }),
      );
    });
  };

  it('shows navigation, a button, and article links in that theme', () => {
    render('#0c90a7', 'dark');
    const preview = container.querySelector('[data-theme="OpenpeepsDark"]');
    expect(preview).not.toBeNull();
    expect(preview?.textContent).toContain(
      'configuration.community.preview.navigation',
    );
    expect(preview?.textContent).toContain(
      'configuration.community.preview.join',
    );
    expect(preview?.textContent).toContain(
      'configuration.community.preview.linkGuidelines',
    );
    expect(preview?.getAttribute('style')).toContain(
      '--color-primary: 12 144 167',
    );
    expect(preview?.getAttribute('style')).toContain(
      '--theme-rounded-base: 4px',
    );
  });

  it('warns when the color blends into the theme background', () => {
    render('#ffffff', 'light');
    expect(container.textContent).toContain(
      'configuration.community.contrastPoor:configuration.community.lightTheme.mode:1.0',
    );
  });

  it('stays quiet for a color that clears the background', () => {
    render('#0c90a7', 'light');
    expect(container.textContent).not.toContain(
      'configuration.community.contrastPoor',
    );
  });
});
