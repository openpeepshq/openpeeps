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
  props: { value: string; onChange: (value: string) => void },
) => {
  act(() => {
    root.render(createElement(OpenpeepsMarkdownInput, props));
  });
};

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
});
