/** @vitest-environment jsdom */
import { act, createElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { REACTION_TYPES } from '@openpeepshq/common/types';

const { configRead, updateConfig } = vi.hoisted(() => ({
  configRead: { isLoading: false, data: undefined as unknown },
  updateConfig: vi.fn(async () => ({ success: true })),
}));

// `useT` returns the key so assertions can match against the i18n keys.
vi.mock('../../../index', () => ({
  useT: () => (key: string) => key,
  useSetPageHeader: () => undefined,
  useOpenpeeps: () => ({
    openpeepsApi: {
      admin: {
        useConfigRead: () => configRead,
        updateConfigAction: () => updateConfig,
      },
    },
  }),
}));

// The admin page lazy-loads the emoji picker web component (the same one the
// jam reaction menu uses); stub the module so importing it in jsdom is a no-op.
vi.mock('emoji-picker-element', () => ({}));

vi.mock('@openpeepshq/react-ui', () => ({
  Button: (props: {
    children?: ReactNode;
    action?: () => void | Promise<void>;
    title?: string;
    disabled?: boolean;
    'data-testid'?: string;
  }) =>
    createElement(
      'button',
      {
        title: props.title,
        'data-testid': props['data-testid'],
        disabled: props.disabled,
        onClick: () => void props.action?.(),
      },
      props.children,
    ),
  Input: (props: {
    value: string;
    placeholder?: string;
    'data-testid'?: string;
    onChange?: (event: { target: { value: string } }) => void;
    onKeyDown?: (event: { key: string; preventDefault: () => void }) => void;
  }) =>
    createElement('input', {
      value: props.value,
      placeholder: props.placeholder,
      'data-testid': props['data-testid'],
      onChange: props.onChange,
      onKeyDown: props.onKeyDown,
    }),
  Toast: (props: { children?: ReactNode }) =>
    createElement('div', { 'data-testid': 'toast' }, props.children),
}));

import { AdminConfigurationCommunityReactions } from './CommunityReactions';

const click = (element: Element) => {
  act(() => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
};

const setInputValue = (element: HTMLInputElement, value: string) => {
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    )?.set;
    setter?.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
};

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};

describe('AdminConfigurationCommunityReactions save/reset wiring', () => {
  let root: Root;
  let container: HTMLDivElement;

  const render = () => {
    act(() => {
      root.render(createElement(AdminConfigurationCommunityReactions));
    });
  };

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    configRead.isLoading = false;
    configRead.data = undefined;
    updateConfig.mockClear();
    updateConfig.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('seeds the editor from the saved set and removes a chip on click', () => {
    configRead.data = {
      config: { content: { allowedReactions: ['🐰', '🦖'] } },
    };
    render();

    expect(
      container.querySelector('[data-testid="admin-community-reaction-🐰"]'),
    ).not.toBeNull();

    click(
      container.querySelector(
        '[data-testid="admin-community-reaction-remove-🐰"]',
      ) as Element,
    );

    expect(
      container.querySelector('[data-testid="admin-community-reaction-🐰"]'),
    ).toBeNull();
    expect(
      container.querySelector('[data-testid="admin-community-reaction-🦖"]'),
    ).not.toBeNull();
  });

  it('removing a default emoji saves an explicit set missing it', async () => {
    // No override configured: the editor mirrors the curated defaults.
    configRead.data = { config: { content: {} } };
    render();

    expect(
      container.querySelector('[data-testid="admin-community-reaction-👍"]'),
    ).not.toBeNull();

    click(
      container.querySelector(
        '[data-testid="admin-community-reaction-remove-👍"]',
      ) as Element,
    );
    click(
      container.querySelector(
        '[data-testid="admin-community-reactions-save"]',
      ) as Element,
    );
    await flush();

    expect(updateConfig).toHaveBeenCalledTimes(1);
    expect(updateConfig).toHaveBeenCalledWith({
      config: {
        content: {
          // The effective set minus the removed default.
          allowedReactions: [...REACTION_TYPES].filter(
            (emoji) => emoji !== '👍',
          ),
        },
      },
    });
  });

  it('renders the full curated default set when no override is configured', () => {
    // Pins the seeding effect itself: with an empty override, every curated
    // default renders as a chip. A regression that silently breaks the
    // seeding (e.g. `resolveAllowedReactions` called with the wrong shape,
    // or the effect skipped) would drop chips here even if a single-chip
    // assertion still passes.
    configRead.data = { config: { content: {} } };
    render();

    for (const emoji of REACTION_TYPES) {
      expect(
        container.querySelector(
          `[data-testid="admin-community-reaction-${emoji}"]`,
        ),
      ).not.toBeNull();
    }
  });

  it('clears the draft input after adding an emoji with the Enter key', () => {
    // Enter must clear the draft exactly like the Add button does; a stale
    // draft would let continued typing append to the previous emoji so the
    // next add submits a combined string as one entry.
    render();

    const input = container.querySelector(
      '[data-testid="admin-community-reactions-input"]',
    ) as HTMLInputElement;

    setInputValue(input, '🐰');
    act(() => {
      input.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      );
    });

    expect(
      container.querySelector('[data-testid="admin-community-reaction-🐰"]'),
    ).not.toBeNull();
    expect(input.value).toBe('');

    // Adding the button-path emoji straight after Enter shows the stale-draft
    // regression would have produced one combined entry instead of two.
    setInputValue(input, '🦖');
    click(
      container.querySelector(
        '[data-testid="admin-community-reactions-add"]',
      ) as Element,
    );
    expect(
      container.querySelector('[data-testid="admin-community-reaction-🦖"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-testid^="admin-community-reaction-🐰🦖"]'),
    ).toBeNull();
  });

  it('adds an emoji chosen from the jam picker (emoji-click event)', async () => {
    configRead.data = { config: { content: {} } };
    render();

    click(
      container.querySelector(
        '[data-testid="admin-community-reactions-browse"]',
      ) as Element,
    );

    const picker = container.querySelector('emoji-picker') as Element;
    expect(picker).not.toBeNull();
    act(() => {
      picker.dispatchEvent(
        new CustomEvent('emoji-click', { detail: { unicode: '🐰' } }),
      );
    });

    expect(
      container.querySelector('[data-testid="admin-community-reaction-🐰"]'),
    ).not.toBeNull();

    click(
      container.querySelector(
        '[data-testid="admin-community-reactions-save"]',
      ) as Element,
    );
    await flush();

    expect(updateConfig).toHaveBeenCalledTimes(1);
    const calls = updateConfig.mock.calls as unknown as Array<
      [
        {
          config: { content: { allowedReactions: string[] } };
        },
      ]
    >;
    // Guarded by the `toHaveBeenCalledTimes(1)` assertion above. `save` wraps
    // the patch in a `config` key, so assert against `config.content`.
    expect(calls[0]![0]!.config.content.allowedReactions).toContain('🐰');
  });

  it('save sends the full effective set as a content-only sparse patch', async () => {
    render();
    // No override, so the editor starts from the seven curated defaults.

    setInputValue(
      container.querySelector(
        '[data-testid="admin-community-reactions-input"]',
      ) as HTMLInputElement,
      '🐰',
    );
    click(
      container.querySelector(
        '[data-testid="admin-community-reactions-add"]',
      ) as Element,
    );
    click(
      container.querySelector(
        '[data-testid="admin-community-reactions-save"]',
      ) as Element,
    );
    await flush();

    expect(updateConfig).toHaveBeenCalledTimes(1);
    expect(updateConfig).toHaveBeenCalledWith({
      config: {
        content: {
          // The curated defaults (no override configured) plus the added one.
          allowedReactions: [...REACTION_TYPES, '🐰'],
        },
      },
    });
  });

  it('reset saves an empty list (falls back to the default set)', async () => {
    configRead.data = {
      config: { content: { allowedReactions: ['🐰'] } },
    };
    render();

    click(
      container.querySelector(
        '[data-testid="admin-community-reactions-reset"]',
      ) as Element,
    );
    await flush();

    expect(updateConfig).toHaveBeenCalledTimes(1);
    expect(updateConfig).toHaveBeenCalledWith({
      config: { content: { allowedReactions: [] } },
    });
  });

  it('deduplicates an emoji that is already on the list', async () => {
    render();
    // The defaults are present, but '🐰' is not, so the first add sticks.

    const input = container.querySelector(
      '[data-testid="admin-community-reactions-input"]',
    ) as HTMLInputElement;
    const add = container.querySelector(
      '[data-testid="admin-community-reactions-add"]',
    ) as Element;

    setInputValue(input, '🐰');
    click(add);
    setInputValue(input, '🐰');
    click(add);

    click(
      container.querySelector(
        '[data-testid="admin-community-reactions-save"]',
      ) as Element,
    );
    await flush();

    expect(updateConfig).toHaveBeenCalledWith({
      config: {
        content: {
          // The curated defaults (no override configured) plus the added one.
          allowedReactions: [...REACTION_TYPES, '🐰'],
        },
      },
    });
  });

  it('rejects an empty entry with a field error and no save', () => {
    render();

    click(
      container.querySelector(
        '[data-testid="admin-community-reactions-add"]',
      ) as Element,
    );

    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      'configuration.community.reactions.empty',
    );
    expect(updateConfig).not.toHaveBeenCalled();
  });

  it('flags a whitespace-padded duplicate by its trimmed value', () => {
    // The duplicate check must run on the trimmed value: an emoji entered
    // with surrounding whitespace is the same emoji as the trimmed one and
    // must report the duplicate error, not be added as a second entry.
    render();

    const input = container.querySelector(
      '[data-testid="admin-community-reactions-input"]',
    ) as HTMLInputElement;
    const add = container.querySelector(
      '[data-testid="admin-community-reactions-add"]',
    ) as Element;

    setInputValue(input, '🐰');
    click(add);
    setInputValue(input, ' 🐰 ');
    click(add);

    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      'configuration.community.reactions.duplicate',
    );
    expect(
      container.querySelectorAll('[data-testid="admin-community-reaction-🐰"]'),
    ).toHaveLength(1);
  });

  it('rejects a 65th emoji with the tooMany error at the list cap', () => {
    // Pins the client-side 64-emoji boundary: the saved override already holds
    // 64 entries (the effective set), so adding one more reports `tooMany`
    // instead of silently growing the list (the server normalizer enforces the
    // same cap on save).
    configRead.data = {
      config: {
        content: {
          allowedReactions: Array.from({ length: 64 }, (_, i) => `E${i}`),
        },
      },
    };
    render();

    setInputValue(
      container.querySelector(
        '[data-testid="admin-community-reactions-input"]',
      ) as HTMLInputElement,
      'E64',
    );
    click(
      container.querySelector(
        '[data-testid="admin-community-reactions-add"]',
      ) as Element,
    );

    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      'configuration.community.reactions.tooMany',
    );
    expect(
      container.querySelector('[data-testid="admin-community-reaction-E64"]'),
    ).toBeNull();
    expect(
      container.querySelectorAll('[data-testid^="admin-community-reaction-E"]'),
    ).toHaveLength(64);
    expect(updateConfig).not.toHaveBeenCalled();
  });

  it('shows the error message when the sparse patch fails', async () => {
    updateConfig.mockRejectedValueOnce(new Error('boom'));
    render();

    click(
      container.querySelector(
        '[data-testid="admin-community-reactions-save"]',
      ) as Element,
    );
    await flush();

    expect(
      container.querySelector('[data-testid="toast"]')?.textContent,
    ).toContain('boom');
  });
});
