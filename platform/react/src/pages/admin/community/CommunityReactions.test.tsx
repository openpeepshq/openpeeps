/** @vitest-environment jsdom */
import { act, createElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

  it('save sends only the content.allowedReactions sparse patch', async () => {
    render();

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
      config: { content: { allowedReactions: ['🐰'] } },
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
      config: { content: { allowedReactions: ['🐰'] } },
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
      container.querySelectorAll(
        '[data-testid^="admin-community-reaction-🐰"]',
      ),
    ).toHaveLength(1);
  });
});
