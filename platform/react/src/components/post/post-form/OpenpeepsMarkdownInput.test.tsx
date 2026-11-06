/** @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OpenpeepsMarkdownInput } from './OpenpeepsMarkdownInput';

vi.mock('../../../i18n', () => ({
  useT: () => (key: string, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? key,
}));

vi.mock('../../../contexts/openpeeps', () => ({
  useOpenpeeps: () => ({
    openpeepsApi: {
      useSearchProfiles: () => ({ data: undefined }),
    },
  }),
}));

vi.mock('../../markdown', () => ({
  OpenpeepsMarkdown: ({ source }: { source?: string }) =>
    createElement('div', { 'data-testid': 'markdown-preview' }, source),
}));

vi.mock('../../profile', () => ({
  ProfileCard: () => null,
}));

const renderInput = (
  root: Root,
  props: {
    value: string;
    onChange: (value: string) => void;
    maxLength?: number;
    blockOverflow?: boolean;
  },
) => {
  act(() => {
    root.render(createElement(OpenpeepsMarkdownInput, props));
  });
};

const counterDiv = (container: HTMLDivElement) =>
  container.querySelector('.text-right');

describe('OpenpeepsMarkdownInput', () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    root = undefined;
    container = undefined;
  });

  const mount = () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    return { container, root };
  };

  it('returns to the empty editor after the text is cleared from preview', async () => {
    const { container, root } = mount();
    const onChange = vi.fn();

    renderInput(root, { value: '[TEST] `code` check', onChange });

    const preview = [...container.querySelectorAll('button')].find(
      (button) => button.textContent === 'Preview',
    );
    expect(preview).toBeTruthy();

    await act(async () => {
      preview?.click();
    });

    expect(container.textContent).toContain('Back to Editing');
    expect(
      container.querySelector('[data-testid="markdown-preview"]')?.textContent,
    ).toBe('[TEST] `code` check');

    renderInput(root, { value: '', onChange });

    expect(container.textContent).not.toContain('Back to Editing');
    const textarea = container.querySelector('textarea');
    expect(textarea).toBeTruthy();
    expect(textarea?.value).toBe('');
  });

  it('counts only the visible link text, not the markdown', () => {
    const { container, root } = mount();

    // 30 raw chars, 7 visible — the counter must show the visible count.
    renderInput(root, {
      value: '[AllPeeP](https://allpeep.com)',
      onChange: () => undefined,
    });

    expect(counterDiv(container)?.textContent).toBe('7 / 500');
  });

  it('keeps the hard cap by default and drops it with blockOverflow off', () => {
    const { container, root } = mount();
    renderInput(root, { value: 'x', onChange: () => undefined });
    let textarea = container.querySelector('textarea');
    expect(textarea?.maxLength).toBe(500);

    act(() => {
      root.render(
        createElement(OpenpeepsMarkdownInput, {
          value: 'x',
          onChange: () => undefined,
          blockOverflow: false,
        }),
      );
    });
    textarea = container.querySelector('textarea');
    expect(textarea?.maxLength).toBe(-1);
  });

  it('turns the counter red once the visible text exceeds the budget', () => {
    const { container, root } = mount();

    // 8 visible chars over a budget of 5, though the raw string is far longer.
    renderInput(root, {
      value: '[aaaaaaaa](https://example.com)',
      onChange: () => undefined,
      maxLength: 5,
    });

    const span = counterDiv(container)?.querySelector('span');
    expect(span?.textContent).toBe('8');
    expect(span?.className).toContain('text-error');
  });
});
