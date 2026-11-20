/** @vitest-environment jsdom */
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ToastProvider, useToast } from './ToastProvider';

const INFO_TEXT = '1 person joined the waiting room';

/** Buttons that each fire one toast variant, so the test can inspect the DOM. */
function Host() {
  const { success, error, info } = useToast();
  return (
    <>
      <button
        type="button"
        data-testid="fire-success"
        onClick={() => success('recording saved')}
      >
        s
      </button>
      <button
        type="button"
        data-testid="fire-error"
        onClick={() => error('something failed')}
      >
        e
      </button>
      <button
        type="button"
        data-testid="fire-info"
        onClick={() => info(INFO_TEXT)}
      >
        i
      </button>
    </>
  );
}

const render = (ui: ReactNode) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(ui);
  });
  return { root, container };
};

/**
 * The waiting-room join toast is a neutral "info" notice (distinct from the
 * success/error feedback the footer already uses). These tests pin that
 * `ToastProvider.info()` actually renders the `info` variant of the react-ui
 * `Toast` — so an `info` variant dropped from the shared component, or
 * `info()` silently falling back to the default (success) variant, would be
 * caught rather than surfacing as an unstyled/wrong-colored toast in CI.
 */
describe('ToastProvider.info', () => {
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

  const toasts = (c: HTMLDivElement) =>
    Array.from(c.querySelectorAll<HTMLElement>('[role]'));

  it('renders the info variant for info() messages', () => {
    ({ root, container } = render(
      <ToastProvider>
        <Host />
      </ToastProvider>,
    ));
    const c = container!;

    act(() => {
      c.querySelector<HTMLButtonElement>('[data-testid="fire-info"]')!.click();
    });

    const toast = toasts(c).find((el) => el.textContent?.includes(INFO_TEXT));
    expect(toast, 'info toast should render').toBeDefined();
    // info maps to the warning-palette info variant...
    expect(toast!.className).toContain('bg-warning');
    // ...and not to the success or error palettes.
    expect(toast!.className).not.toContain('bg-success');
    expect(toast!.className).not.toContain('bg-error');
    // Non-error variants use the status role.
    expect(toast!.getAttribute('role')).toBe('status');
  });

  it('keeps success and error on their own palettes (info stays distinct)', () => {
    ({ root, container } = render(
      <ToastProvider>
        <Host />
      </ToastProvider>,
    ));
    const c = container!;

    act(() => {
      c.querySelector<HTMLButtonElement>(
        '[data-testid="fire-success"]',
      )!.click();
      c.querySelector<HTMLButtonElement>('[data-testid="fire-error"]')!.click();
    });

    const successToast = toasts(c).find((el) =>
      el.textContent?.includes('recording saved'),
    );
    const errorToast = toasts(c).find((el) =>
      el.textContent?.includes('something failed'),
    );
    expect(successToast!.className).toContain('bg-success');
    expect(errorToast!.className).toContain('bg-error');
    expect(errorToast!.getAttribute('role')).toBe('alert');
  });
});
