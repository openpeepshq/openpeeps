/** @vitest-environment jsdom */
import { act, createElement, type ChangeEvent, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OpenpeepsComposerInput } from './OpenpeepsComposerInput';

vi.mock('../../../i18n', () => ({
  useT: () => (key: string, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? key,
}));

vi.mock('@openpeepshq/react-ui', () => ({
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

// Both surfaces write the same markdown string; the mocks render plain
// textareas so the test can type into either mode and assert the value the
// form state actually receives.
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

vi.mock('./OpenpeepsRichMarkdownInput', () => ({
  OpenpeepsRichMarkdownInput: (props: {
    value?: string;
    onChange?: (value: string) => void;
  }) =>
    createElement('textarea', {
      'data-testid': 'rich-input',
      value: props.value,
      onChange: (e: ChangeEvent<HTMLTextAreaElement>) =>
        props.onChange?.(e.target.value),
    }),
}));

const setNativeValue = (field: HTMLTextAreaElement, value: string): void => {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    'value',
  )?.set;
  setter?.call(field, value);
  field.dispatchEvent(new Event('input', { bubbles: true }));
};

describe('OpenpeepsComposerInput mode switch', () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;
  let formState: { content: string };
  let onChangeCalls: string[];

  // Mirrors the real parent (e.g. NewPostModal): it owns `content` and passes
  // the latest value back down on every re-render.
  const render = () => {
    act(() => {
      root?.render(
        createElement(OpenpeepsComposerInput, {
          value: formState.content,
          onChange: (v: string) => {
            formState.content = v;
            onChangeCalls.push(v);
          },
        }),
      );
    });
  };

  const reRender = () => {
    act(() => {
      root?.render(
        createElement(OpenpeepsComposerInput, {
          value: formState.content,
          onChange: (v: string) => {
            formState.content = v;
            onChangeCalls.push(v);
          },
        }),
      );
    });
  };

  const markdownField = () =>
    container!.querySelector<HTMLTextAreaElement>(
      '[data-testid="markdown-input"]',
    );

  const richField = () =>
    container!.querySelector<HTMLTextAreaElement>('[data-testid="rich-input"]');

  const toggleButton = (label: string) =>
    [...container!.querySelectorAll('button')].find(
      (b) => b.textContent === label,
    ) as HTMLButtonElement | undefined;

  const click = (button: HTMLButtonElement) => {
    act(() => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    reRender();
  };

  const type = (field: HTMLTextAreaElement, value: string) => {
    act(() => {
      setNativeValue(field, value);
    });
    reRender();
  };

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    formState = { content: '' };
    onChangeCalls = [];
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

  it('renders the toggle in markdown mode by default', () => {
    render();
    expect(toggleButton('Markdown')).not.toBeNull();
    expect(toggleButton('Rich text')).not.toBeNull();
    expect(markdownField()).not.toBeNull();
    expect(richField()).toBeNull();
  });

  it('round-trips content through both modes into the form state unchanged', () => {
    render();
    type(markdownField()!, 'Hello **world**');
    expect(formState.content).toBe('Hello **world**');

    // Switch to rich text: the same content must come up in the rich surface.
    click(toggleButton('Rich text')!);
    expect(richField()).not.toBeNull();
    expect(markdownField()).toBeNull();
    expect(richField()!.value).toBe('Hello **world**');

    // Edit in rich mode: the form state receives the new string unchanged.
    type(richField()!, 'Hello **world** and more');
    expect(formState.content).toBe('Hello **world** and more');

    // Switch back: the markdown surface shows the full content again.
    click(toggleButton('Markdown')!);
    expect(markdownField()).not.toBeNull();
    expect(richField()).toBeNull();
    expect(markdownField()!.value).toBe('Hello **world** and more');
    expect(formState.content).toBe('Hello **world** and more');

    // Both modes pushed through the same form-state callback, unchanged.
    expect(onChangeCalls).toEqual([
      'Hello **world**',
      'Hello **world** and more',
    ]);
  });
});
