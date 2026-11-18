/**
 * useControlledSheet regression coverage (issue #2110 round 5).
 *
 * Pins the guard the round-4 review asked to protect: an open with a
 * never-attached sheet ref (missing <BottomSheetModalProvider>, or a sheet
 * that unmounted before the effect ran) must fail loudly — console.error plus
 * exactly one console.warn — instead of silently dropping the present.
 *
 * Node jest env (no native modules): the bottom-sheet ref module is mocked so
 * present/dismiss are observable spies; the component never mounts a real
 * BottomSheetModal, it only holds (or deliberately drops) the ref.
 */
import { createElement, type ReactNode } from 'react';
import ReactTestRenderer from 'react-test-renderer';

// React 19 act() requires the act environment flag, or it warns on every act().
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

// --- bottom sheet: drive the attached instance like the real lib does -------
const presentSpy = jest.fn();
const dismissSpy = jest.fn();
jest.mock('../lib/bottom-sheet-ref', () => ({
  bottomSheetPresent: (ref: { current: unknown } | null) =>
    presentSpy(ref?.current),
  bottomSheetDismiss: (ref: { current: unknown } | null) =>
    dismissSpy(ref?.current),
}));

import { useControlledSheet } from './use-controlled-sheet';

// Stands in for the BottomSheetModal instance a real <BottomSheetModal ref>
// would attach to the hook's ref. The hook's present/dismiss path requires
// ref.current to be non-null (the detached-ref guard is what tests #2/#3 probe).
const FAKE_SHEET = { present: jest.fn(), dismiss: jest.fn() };

// Drives the hook and, when `attach` is true, simulates the sheet mounting by
// attaching the fake instance to the ref (as a real BottomSheetModal would).
const FakeSheet = ({
  open,
  attach = true,
}: {
  open: boolean;
  attach?: boolean;
}) => {
  const ref = useControlledSheet(open);
  if (attach) {
    ref.current = FAKE_SHEET;
  }
  return null;
};

// Same hook, but the ref is never handed to a sheet: ref.current stays null,
// which is the detached-ref / missing-provider case the guard must catch.
const DetachedSheet = ({ open }: { open: boolean }) => {
  useControlledSheet(open);
  return null;
};

const render = (element: ReactNode): ReactTestRenderer.ReactTestRenderer => {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(element);
  });
  return renderer;
};

describe('useControlledSheet', () => {
  let errorSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  // React's own deprecation/act warnings also route through console.error, so
  // count only this hook's messages rather than raw call counts.
  const noSheetErrors = () =>
    errorSpy.mock.calls.filter((c) =>
      String(c[0]).includes('no bottom sheet instance')
    ).length;
  const noSheetWarns = () =>
    warnSpy.mock.calls.filter((c) =>
      String(c[0]).includes('no sheet instance on first open')
    ).length;

  beforeEach(() => {
    presentSpy.mockClear();
    dismissSpy.mockClear();
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('presents when open and the sheet ref is attached', () => {
    const renderer = render(createElement(FakeSheet, { open: true }));
    expect(presentSpy).toHaveBeenCalledTimes(1);
    expect(presentSpy).toHaveBeenCalledWith(FAKE_SHEET);
    expect(noSheetErrors()).toBe(0);
    expect(noSheetWarns()).toBe(0);
    ReactTestRenderer.act(() => renderer.unmount());
  });

  it('dismisses when open goes false', () => {
    const renderer = render(createElement(FakeSheet, { open: true }));
    expect(presentSpy).toHaveBeenCalledTimes(1);
    expect(dismissSpy).not.toHaveBeenCalled();
    ReactTestRenderer.act(() => {
      renderer.update(createElement(FakeSheet, { open: false }));
    });
    expect(dismissSpy).toHaveBeenCalledTimes(1);
    expect(dismissSpy).toHaveBeenCalledWith(FAKE_SHEET);
    expect(noSheetErrors()).toBe(0);
  });

  it('errors on a detached ref and warns exactly once per hook instance', () => {
    const renderer = render(createElement(DetachedSheet, { open: false }));
    expect(presentSpy).not.toHaveBeenCalled();
    expect(noSheetErrors()).toBe(0);
    expect(noSheetWarns()).toBe(0);

    // First open with a never-attached ref: loud error + one provider warning.
    ReactTestRenderer.act(() => {
      renderer.update(createElement(DetachedSheet, { open: true }));
    });
    expect(noSheetErrors()).toBe(1);
    expect(noSheetWarns()).toBe(1);

    // Re-open after a dismiss must not re-spam the provider warning.
    ReactTestRenderer.act(() => {
      renderer.update(createElement(DetachedSheet, { open: false }));
    });
    ReactTestRenderer.act(() => {
      renderer.update(createElement(DetachedSheet, { open: true }));
    });
    expect(noSheetErrors()).toBe(2);
    expect(noSheetWarns()).toBe(1);
  });
});
