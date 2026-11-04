/**
 * Re-sync contract against the *real* @mdxeditor/editor (not the stub in
 * OpenpeepsRichMarkdownInput.test.tsx). `MDXEditor.setMarkdown` replaces the
 * document with `muteChange$` set, so it must update the contenteditable
 * without firing `onChange`; the input relies on that to re-sync a refused
 * edit without entering a change loop.
 */
/** @vitest-environment jsdom */
import * as React from 'react';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { useMediaUpload } = vi.hoisted(() => ({
  useMediaUpload: vi.fn(),
}));

vi.mock('../../../contexts/openpeeps', () => ({
  useOpenpeeps: () => ({
    openpeepsApi: { useMediaUpload },
  }),
}));

vi.mock('../../../i18n', () => ({
  useT: () => (key: string, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? key,
}));

vi.mock('../../../lib/canvasUtils', () => ({
  convertToWebpIfHeic: vi.fn(async (file: File) => file),
  normalizeSvgFile: vi.fn(async (file: File) => file),
}));

import {
  RichMarkdownEditor,
  type RichMarkdownEditorHandle,
} from './RichMarkdownEditor';

// mdxeditor schedules its change pipeline through the gurx realm on the
// microtask queue; flush a few ticks after each editor mutation.
const flush = async () => {
  for (let i = 0; i < 5; i++) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
};

describe('RichMarkdownEditor re-sync (real mdxeditor)', () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    useMediaUpload.mockReturnValue({ upload: vi.fn() });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
  });

  it('setMarkdown re-syncs the contenteditable without an onChange round-trip', async () => {
    const onChange = vi.fn();
    const ref = React.createRef<RichMarkdownEditorHandle>();
    // Plain text that survives mdxeditor's mount normalization untouched,
    // so the mount does not itself call onChange.
    await act(async () => {
      root!.render(
        createElement(RichMarkdownEditor, {
          ref,
          value: 'hello world',
          onChange,
        }),
      );
    });
    await flush();
    expect(onChange).not.toHaveBeenCalled();

    const editable = container!.querySelector<HTMLElement>('[contenteditable]');
    expect(editable).not.toBeNull();
    expect(editable!.textContent).toBe('hello world');

    // The re-sync path: an over-budget edit was refused, the input pushes
    // the accepted document back in through the handle.
    act(() => {
      ref.current!.setMarkdown('synced value');
    });
    await flush();

    expect(editable!.textContent).toBe('synced value');
    expect(onChange).not.toHaveBeenCalled();
  });

  // Round-6 review (issue #136) item 3: pin the documented "prop-driven
  // sizing wins" contract for the source surface — a caller `min-h-*`
  // lands on the source `.cm-editor` without an inline `min-height`, and
  // without one the component's default applies as an inline style.
  const enterSourceMode = async () => {
    const toggle = container!.querySelector<HTMLElement>(
      '[aria-label="Source mode"]',
    );
    expect(toggle, 'source-mode toolbar toggle must be present').not.toBeNull();
    act(() => {
      toggle!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await flush();
  };

  it('source surface keeps a caller min-h-* and skips the inline default', async () => {
    await act(async () => {
      root!.render(
        createElement(RichMarkdownEditor, {
          value: 'hello world',
          onChange: vi.fn(),
          className: 'min-h-48',
        }),
      );
    });
    await flush();
    await enterSourceMode();

    const editor = container!.querySelector<HTMLElement>(
      '.mdxeditor-source-editor .cm-editor',
    );
    expect(
      editor,
      'the source-mode CodeMirror surface must mount',
    ).not.toBeNull();
    expect(editor!.classList.contains('min-h-48')).toBe(true);
    expect(editor!.style.minHeight).toBe('');
    const scroller = editor!.querySelector<HTMLElement>('.cm-scroller');
    expect(scroller!.classList.contains('min-h-48')).toBe(true);
    expect(scroller!.style.minHeight).toBe('');
  });

  it('source surface falls back to the inline default min-height without a caller min-h-*', async () => {
    await act(async () => {
      root!.render(
        createElement(RichMarkdownEditor, {
          value: 'hello world',
          onChange: vi.fn(),
        }),
      );
    });
    await flush();
    await enterSourceMode();

    const editor = container!.querySelector<HTMLElement>(
      '.mdxeditor-source-editor .cm-editor',
    );
    expect(
      editor,
      'the source-mode CodeMirror surface must mount',
    ).not.toBeNull();
    // 384px = 24rem, the non-compact rich editor surface height.
    expect(editor!.style.minHeight).toBe('384px');
    expect(
      editor!.querySelector<HTMLElement>('.cm-scroller')!.style.minHeight,
    ).toBe('384px');
  });
});
