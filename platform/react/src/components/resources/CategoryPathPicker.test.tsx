/** @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RESOURCE_CATEGORY_NAME_MAX_LENGTH } from '@openpeepshq/common/lib';
import { CategoryPathPicker } from './CategoryPathPicker';

vi.mock('../../i18n', () => ({
  useT: () => (key: string, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? key,
}));

const LONG_NAME = 'a'.repeat(RESOURCE_CATEGORY_NAME_MAX_LENGTH + 20);

// Fill a React controlled <input> the way the rest of the repo's web tests do
// (NewPostModalComposerSwitch / ReplyModal): use the native value setter so
// React's value tracker sees a real change and the input handler fires.
const setNativeValue = (field: HTMLInputElement, value: string): void => {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value',
  )?.set;
  setter?.call(field, value);
  field.dispatchEvent(new Event('input', { bubbles: true }));
};

describe('CategoryPathPicker', () => {
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

  it('wraps a long selected path and caps the input at the category max', async () => {
    const onChange = vi.fn();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        createElement(CategoryPathPicker, {
          path: ['Docs', LONG_NAME],
          tree: [{ name: 'Docs', path: ['Docs'], children: [] }],
          onChange,
        }),
      );
    });

    // The selected path is shown in a wrapping <p>.
    const pathText = [...container.querySelectorAll('p')].find((p) =>
      p.textContent?.includes(LONG_NAME),
    );
    expect(pathText).toBeTruthy();
    expect(pathText?.className).toContain('break-words');

    // The "Add a folder" input is capped so an over-long name cannot be typed.
    const input = container.querySelector('input') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.maxLength).toBe(RESOURCE_CATEGORY_NAME_MAX_LENGTH);
  });

  it('clamps an over-long folder name on add', async () => {
    const onChange = vi.fn();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        createElement(CategoryPathPicker, {
          path: [],
          tree: [],
          onChange,
        }),
      );
    });

    const input = container.querySelector('input') as HTMLInputElement;
    await act(async () => {
      setNativeValue(input, LONG_NAME);
    });

    const addButton = [...container.querySelectorAll('button')].find(
      (button) => button.textContent === 'Add',
    );
    await act(async () => {
      addButton?.click();
    });

    // The add handler trims + clamps to the shared max even if the input
    // somehow holds a longer value (e.g. pasted before hydration).
    expect(onChange).toHaveBeenCalledWith([
      LONG_NAME.slice(0, RESOURCE_CATEGORY_NAME_MAX_LENGTH),
    ]);
  });
});
