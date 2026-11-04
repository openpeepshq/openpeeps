/**
 * Round-6 review (issue #136) item 2: `OpenpeepsComposerInput.test.tsx`
 * stubs both surfaces, so it proves state routing but never that the *real*
 * rich surface mounts inside the toggle. This suite keeps only the plain
 * markdown textarea mocked and lets the real `OpenpeepsRichMarkdownInput`
 * lazily load the real editor, then asserts the carried-over text reaches
 * the contenteditable.
 */
/** @vitest-environment jsdom */
import { act, createElement, type ChangeEvent, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OpenpeepsComposerInput } from './OpenpeepsComposerInput';
// Warm vitest's module graph with the editor's whole dependency tree
// (mdxeditor, CodeMirror, …) before the test runs. `OpenpeepsRichMarkdownInput`
// loads it with `lazy(() => import('./RichMarkdownEditor'))`, so without this
// the on-demand chunk is transformed *during* the test (slow on cold CI
// runners). Importing the same module here makes that `import()` a cache hit
// that resolves in microtasks, so the wait below is a hang guard, not the
// mechanism.
import './RichMarkdownEditor';

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

vi.mock('@openpeepshq/react-ui', () => ({
  // The real RichMarkdownEditor imports `cn` from here too; it just joins
  // class names, so a simple filter-join is enough for the test.
  cn: (...a: unknown[]) => a.filter(Boolean).join(' '),
  Button: ({
    action,
    variant,
    children,
  }: {
    action?: () => void;
    variant?: string;
    children?: ReactNode;
  }) =>
    createElement(
      'button',
      { onClick: action, 'data-variant': variant },
      children,
    ),
}));

// Only the plain markdown textarea is stubbed; the rich surface is the real
// component, so this pins that the toggle actually mounts the visual editor.
vi.mock('./OpenpeepsMarkdownInput', () => ({
  OpenpeepsMarkdownInput: (props: {
    value?: string;
    onChange?: (value: string) => void;
  }) =>
    createElement('textarea', {
      'data-testid': 'markdown-input',
      value: props.value,
      onChange: (e: ChangeEvent<HTMLTextAreaElement>) =>
        props.onChange?.(e.target.value),
    }),
}));

// mdxeditor + mdxeditor's gurx realm schedule on the microtask queue; the test
// polls (below) until the lazily-loaded editor has mounted.
describe('OpenpeepsComposerInput real rich surface', () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  const render = (value: string) => {
    act(() => {
      root!.render(
        createElement(OpenpeepsComposerInput, {
          value,
          onChange: () => {},
        }),
      );
    });
  };

  const toggleButton = (label: string) =>
    [...container!.querySelectorAll('button')].find(
      (b) => b.textContent === label,
    ) as HTMLButtonElement | undefined;

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

  it('mounts the real visual editor on toggle and carries the text over', async () => {
    render('Hello **world**');

    // The plain textarea holds the initial value.
    expect(
      container!.querySelector<HTMLTextAreaElement>(
        '[data-testid="markdown-input"]',
      )!.value,
    ).toBe('Hello **world**');

    // Toggle to rich: the real input resolves its lazy editor.
    act(() => {
      toggleButton('Rich text')!.dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
      );
    });
    // Suspense (lazy import) + mdxeditor mount: `RichMarkdownEditor` is
    // loaded with `import()` inside `<Suspense>`, so its chunk resolves on
    // real I/O that pure microtask draining won't flush. Wait in bounded
    // real-time ticks, capping on both wall time and attempt count so a
    // regression fails instead of hanging.
    const deadline = Date.now() + 30000;
    for (
      let i = 0;
      i < 600 && !container!.querySelector('[contenteditable]');
      i++
    ) {
      if (Date.now() > deadline) break;
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        // Also drain microtasks in case the chunk promise is already
        // resolved and only React's Suspense update is pending.
        for (let m = 0; m < 20; m++) await Promise.resolve();
      });
    }
    const editable = container!.querySelector<HTMLElement>('[contenteditable]');
    expect(
      editable,
      'the real visual editor must mount in rich mode',
    ).not.toBeNull();
    // The carried-over markdown is parsed, not echoed: `**world**` renders
    // as a bold node, so the visible text is the rendered content.
    expect(editable!.textContent).toBe('Hello world');
    const strong = editable!.querySelector('strong');
    expect(strong, 'the bold run must render as a strong node').not.toBeNull();
    expect(strong!.textContent).toBe('world');
  }, 90000);
});
