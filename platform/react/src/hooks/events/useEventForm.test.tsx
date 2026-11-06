/** @vitest-environment jsdom */
import { act, createElement, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PostCreationData } from '@openpeepshq/common/types';
import { useEventForm } from './useEventForm';

vi.mock('../../components/layout/IdentityContext', () => ({
  useCurrentProfile: () => undefined,
}));

const START = '2026-11-06T09:00:00.000Z';
const EARLIER = '2026-11-06T08:45:00.000Z';
const LATER = '2026-11-06T10:00:00.000Z';

const eventPostData = (data: Record<string, unknown>): PostCreationData =>
  ({
    visibility: 'public',
    type: 'event',
    data: { type: 'event', content: '', ...data },
  }) as PostCreationData;

let root: Root | undefined;
let container: HTMLDivElement | undefined;
let captured: ReturnType<typeof useEventForm> | undefined;

const renderForm = (initial: PostCreationData) => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  const Host = () => {
    const [data, setData] = useState(initial);
    captured = useEventForm(data, setData);
    return null;
  };
  act(() => {
    root?.render(createElement(Host));
  });
};

describe('useEventForm end-before-start guard', () => {
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
    captured = undefined;
  });

  it('accepts an end after the start', () => {
    renderForm(eventPostData({ start: START }));
    act(() => {
      captured?.changeEnd(LATER);
    });
    expect(captured?.event.end).toBe(LATER);
    expect(captured?.endBeforeStart).toBe(false);
  });

  it('rejects an end at or before the start', () => {
    renderForm(eventPostData({ start: START, end: LATER }));
    act(() => {
      captured?.changeEnd(EARLIER);
    });
    expect(captured?.event.end).toBe(LATER);
    expect(captured?.endBeforeStart).toBe(true);
  });

  it('shifts the end when the start moves to at or after the end', () => {
    renderForm(eventPostData({ start: EARLIER, end: LATER }));
    act(() => {
      captured?.changeStart(START);
    });
    expect(captured?.event.start).toBe(START);
    expect(captured?.event.end).toBe(LATER);
    expect(captured?.endBeforeStart).toBe(false);
    act(() => {
      captured?.changeStart('2026-11-06T10:30:00.000Z');
    });
    // The start moved 1h30m, so the end moves with it (duration preserved).
    expect(captured?.event.start).toBe('2026-11-06T10:30:00.000Z');
    expect(captured?.event.end).toBe('2026-11-06T11:30:00.000Z');
    expect(captured?.endBeforeStart).toBe(false);
  });

  it('does not leave a stale error when the end date is toggled off and on', () => {
    renderForm(eventPostData({ start: START, end: LATER }));
    act(() => {
      captured?.changeEnd(EARLIER);
    });
    expect(captured?.endBeforeStart).toBe(true);
    act(() => {
      captured?.toggleEndDate(false);
    });
    expect(captured?.event.end).toBeUndefined();
    expect(captured?.endBeforeStart).toBe(false);
    act(() => {
      captured?.toggleEndDate(true);
    });
    expect(captured?.event.end).toBe('2026-11-06T10:00:00.000Z');
    expect(captured?.endBeforeStart).toBe(false);
  });

  it('clears the error once a change makes the range valid again', () => {
    renderForm(
      eventPostData({ start: '2026-11-06T10:30:00.000Z', end: LATER }),
    );
    expect(captured?.endBeforeStart).toBe(true);
    act(() => {
      captured?.changeEnd('2026-11-06T11:00:00.000Z');
    });
    expect(captured?.endBeforeStart).toBe(false);
  });

  it('seeds the error when an existing event is already invalid', () => {
    renderForm(eventPostData({ start: START, end: EARLIER }));
    expect(captured?.endBeforeStart).toBe(true);
  });
});
