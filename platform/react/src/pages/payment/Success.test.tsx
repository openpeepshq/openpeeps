/** @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PaymentSuccess } from './Success';
import { webNavHrefOf } from '../../test/webNavHrefOf';

let paymentStatusValue: { data?: { status?: string } | null } | undefined;
const navigate = vi.fn();
/** Shared mirror of the web navigator's target→path mapping (see
    test/webNavHrefOf.ts); unmapped target types throw instead of
    rendering a silently-wrong href. */
const href = vi.fn(webNavHrefOf);

vi.mock('../../index', () => ({
  useT: () => (key: string, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? key,
  useOpenpeeps: () => ({
    openpeepsApi: {
      usePaymentStatus: () => paymentStatusValue,
    },
  }),
  useHrefOf: () => href,
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
}));

vi.mock('lucide-react', () => ({
  CheckCircle: () => null,
  Loader2: () => null,
}));

describe('PaymentSuccess', () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    navigate.mockClear();
    href.mockClear();
    paymentStatusValue = undefined;
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    root = undefined;
    container = undefined;
  });

  const renderSuccess = async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(createElement(PaymentSuccess));
    });
    // Flush the navigation effect.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
  };

  it('sends a verified payment to the welcome page', async () => {
    paymentStatusValue = { data: { status: 'active' } };
    await renderSuccess();

    // A verified payer lands on the welcome page, never the feed.
    expect(href).toHaveBeenCalledWith({ type: 'welcome' });
    expect(navigate).toHaveBeenCalledWith('/welcome');
    expect(navigate).not.toHaveBeenCalledWith('/feeds/local');
  });

  it('does not navigate before the payment is verified', async () => {
    for (const status of [undefined, { status: 'none' }]) {
      paymentStatusValue = { data: status };
      navigate.mockClear();
      href.mockClear();
      await renderSuccess();

      // Unverified / none means the ping has not confirmed the payment yet.
      expect(navigate).not.toHaveBeenCalled();
    }
  });
});
