/** @vitest-environment jsdom */
import * as React from 'react';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OpenpeepsRichMarkdownInput } from './OpenpeepsRichMarkdownInput';
import type { RichMarkdownEditorHandle } from './RichMarkdownEditor';

vi.mock('../../../i18n', () => ({
  useT: () => (key: string, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? key,
}));

// The real editor pulls in the whole mdxeditor bundle. The fake exposes the
// handle the input drives (`setMarkdown`), fires the same callbacks, and
// records what markdown the input pushed back in for re-sync assertions.
type EditorProps = {
  value: string;
  onChange: (value: string, initialNormalize: boolean) => void;
  onParseError?: () => void;
};
const editorState: {
  latestProps: EditorProps | null;
  pushed: string[];
} = { latestProps: null, pushed: [] };

vi.mock('./RichMarkdownEditor', () => {
  return {
    RichMarkdownEditor: React.forwardRef(
      (props: EditorProps, ref: React.Ref<RichMarkdownEditorHandle>) => {
        editorState.latestProps = props;
        React.useImperativeHandle(ref, () => ({
          setMarkdown: (markdown: string) => {
            editorState.pushed.push(markdown);
          },
        }));
        return createElement('div', { 'data-testid': 'fake-editor' });
      },
    ),
  };
});

const render = async (
  root: Root,
  props: {
    value: string;
    onChange: (value: string) => void;
    maxLength?: number;
  },
) => {
  await act(async () => {
    root.render(createElement(OpenpeepsRichMarkdownInput, props));
  });
};

const counterSpan = (container: HTMLDivElement) =>
  container.querySelector<HTMLSpanElement>('.text-right span');

const parseError = (container: HTMLDivElement) =>
  container.querySelector<HTMLParagraphElement>('.text-error.pt-2');

describe('OpenpeepsRichMarkdownInput', () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    editorState.latestProps = null;
    editorState.pushed = [];
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

  it('pushes an over-budget accepted value back into the editor for re-sync', async () => {
    const onChange = vi.fn();
    await render(root!, { value: 'hello', onChange, maxLength: 5 });
    // The editor reports a change that grows the document past the budget:
    // nextRichMarkdownValue refuses it, and the editor is re-synced to the
    // accepted value so the surface cannot keep the over-budget text.
    act(() => {
      editorState.latestProps?.onChange('hello over budget', false);
    });
    expect(onChange).not.toHaveBeenCalled();
    expect(editorState.pushed).toEqual(['hello']);
  });

  it('round-trips a long link whose visible text fits the budget', async () => {
    const onChange = vi.fn();
    await render(root!, { value: 'hi', onChange, maxLength: 5 });
    // Raw markdown is well over 5 chars, but the visible text is just
    // "label" (5). The gate is on visible length, so the round-trip is
    // accepted rather than refused.
    act(() => {
      editorState.latestProps?.onChange(
        '[label](https://very-long-url)',
        false,
      );
    });
    // Accepted: the edit reaches the parent, and the editor is not
    // re-synced back to the old value.
    expect(onChange).toHaveBeenCalledWith('[label](https://very-long-url)');
    expect(editorState.pushed).toEqual([]);
  });

  it('suppresses the mount normalization pass and accepts real edits', async () => {
    const onChange = vi.fn();
    await render(root!, { value: 'hello', onChange, maxLength: 100 });
    act(() => {
      editorState.latestProps?.onChange('hello\n', true);
    });
    expect(onChange).not.toHaveBeenCalled();
    expect(editorState.pushed).toEqual([]);
    act(() => {
      editorState.latestProps?.onChange('hello!', false);
    });
    expect(onChange).toHaveBeenCalledWith('hello!');
  });

  it('clears the parse error once a change is accepted again', async () => {
    const onChange = vi.fn();
    await render(root!, { value: 'hello', onChange, maxLength: 100 });
    act(() => {
      editorState.latestProps?.onParseError?.();
    });
    expect(parseError(container!)).not.toBeNull();
    act(() => {
      editorState.latestProps?.onChange('hello!', false);
    });
    expect(parseError(container!)).toBeNull();
  });

  it('counts visible text, not raw markdown, in the character counter', async () => {
    const onChange = vi.fn();
    await render(root!, { value: '**hi**', onChange, maxLength: 100 });
    expect(counterSpan(container!)?.textContent).toBe('2');
  });
});
