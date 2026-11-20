/** @vitest-environment jsdom */
import { act, createElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { hookState } = vi.hoisted(() => ({
  hookState: {
    isLoading: false,
    draft: null as Record<string, unknown> | null,
    profiles: [] as { handle: string; type: string }[],
    onChange: (_handles: string[]) => {},
    isSubmitting: false,
    save: (_next: unknown) => Promise.resolve({ success: true }),
    removedAs: undefined as string[] | undefined,
  },
}));

vi.mock('../../../index', () => ({
  useT: () => (key: string, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? key,
  useSetPageHeader: () => undefined,
  useOpenpeeps: () => ({
    openpeepsApi: {
      useProfiles: () => ({ data: hookState.profiles }),
    },
  }),
}));

vi.mock('./useCommunityConfig', () => ({
  useCommunityConfig: () => ({
    isLoading: hookState.isLoading,
    draft: hookState.draft,
    save: (next: unknown) => hookState.save(next),
  }),
}));

vi.mock('../../../components', () => ({
  Avatar: (props: { profile?: { handle?: string } }) =>
    createElement(
      'span',
      { 'data-testid': 'avatar' },
      props.profile?.handle ?? '',
    ),
  ProfilesInput: (props: {
    value?: { handle: string }[];
    onChange?: (profiles: { handle: string }[]) => void;
  }) =>
    createElement(
      'div',
      { 'data-testid': 'profiles-input' },
      (props.value ?? []).map((p) => p.handle).join(','),
    ),
}));

vi.mock('react-hook-form', () => ({
  useForm: () => ({
    control: {},
    formState: { isSubmitting: hookState.isSubmitting },
    watch: (path: string) =>
      path === 'content.autoFollow'
        ? ((hookState.draft as { content?: { autoFollow?: string[] } } | null)
            ?.content?.autoFollow ?? [])
        : undefined,
    handleSubmit:
      (onSubmit: (data: unknown) => Promise<void>) =>
      (event?: { preventDefault?: () => void }) => {
        event?.preventDefault?.();
        return onSubmit(hookState.draft);
      },
  }),
}));

vi.mock('@openpeepshq/react-ui', () => ({
  Button: (props: {
    children?: ReactNode;
    'data-testid'?: string;
    onClick?: () => void;
    type?: string;
    loading?: boolean;
    title?: string;
  }) =>
    createElement(
      'button',
      {
        type: props.type,
        'data-testid': props['data-testid'],
        onClick: props.onClick,
      },
      props.children,
    ),
  Form: ({ children }: { children?: ReactNode }) =>
    createElement('div', null, children),
  FormField: (props: {
    render: (arg: { field: { onChange: (v: unknown) => void } }) => ReactNode;
  }) =>
    props.render({
      field: { onChange: (v: unknown) => hookState.onChange(v as string[]) },
    }),
  FormControl: ({ children }: { children?: ReactNode }) =>
    createElement('div', null, children),
  FormLabel: ({ children }: { children?: ReactNode }) =>
    createElement('label', null, children),
  FormDescription: ({ children }: { children?: ReactNode }) =>
    createElement('p', { 'data-testid': 'form-description' }, children),
  FormMessage: () => null,
  FormItem: ({ children }: { children?: ReactNode }) =>
    createElement('div', null, children),
  Toast: (props: { children?: ReactNode; testId?: string }) =>
    createElement(
      'div',
      { 'data-testid': props.testId ?? 'toast' },
      props.children,
    ),
}));

import { AdminConfigurationCommunityAutoFollow } from './CommunityAutoFollow';

describe('AdminConfigurationCommunityAutoFollow', () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  const draft = (autoFollow: string[]) => ({
    content: { autoFollow },
  });

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    hookState.isLoading = false;
    hookState.draft = draft([]);
    hookState.profiles = [];
    hookState.onChange = () => {};
    hookState.isSubmitting = false;
    hookState.removedAs = undefined;
    hookState.save = () => Promise.resolve({ success: true });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    root = undefined;
    container = undefined;
  });

  const render = () =>
    act(() => {
      root?.render(createElement(AdminConfigurationCommunityAutoFollow));
    });

  it('shows saved handles in the picker and a removable chip for a stale one', () => {
    hookState.draft = draft(['alice', 'ghost']);
    hookState.profiles = [
      { handle: 'alice', type: 'local' },
      { handle: 'news', type: 'local' },
    ];
    render();

    // Resolvable handles populate the picker.
    expect(
      container!.querySelector('[data-testid="profiles-input"]')?.textContent,
    ).toBe('alice');
    // The stale handle renders as a removable chip.
    expect(container!.textContent).toContain('@ghost');
    // And the still-resolvable one is not duplicated as a missing chip.
    expect(container!.textContent).not.toContain('@alice');
  });

  it('removes a stale handle when its chip is dismissed', () => {
    hookState.draft = draft(['alice', 'ghost']);
    hookState.profiles = [{ handle: 'alice', type: 'local' }];
    hookState.onChange = (handles: string[]) => {
      hookState.removedAs = handles;
    };
    render();

    const chipRemove = Array.from(container!.querySelectorAll('button')).find(
      (b) => b.title === 'Remove',
    ) as HTMLButtonElement | undefined;
    expect(chipRemove).toBeDefined();

    act(() => {
      chipRemove!.click();
    });
    expect(hookState.removedAs).toEqual(['alice']);
  });

  it('saves and shows a success toast', async () => {
    hookState.draft = draft(['news']);
    hookState.profiles = [{ handle: 'news', type: 'local' }];
    hookState.save = vi.fn(async () => ({ success: true }));
    render();

    const saveButton = container!.querySelector(
      '[data-testid="admin-community-autofollow-save"]',
    ) as HTMLButtonElement;
    await act(async () => {
      saveButton.click();
    });

    expect(hookState.save).toHaveBeenCalled();
    expect(
      container!.querySelector(
        '[data-testid="admin-community-autofollow-toast"]',
      )?.textContent,
    ).toContain('configuration.community.updateSuccess');
  });

  it('shows an error toast when the save rejects', async () => {
    hookState.draft = draft(['news']);
    hookState.save = vi.fn(async () => {
      throw new Error('Unknown auto-follow handles: ghost');
    });
    render();

    const saveButton = container!.querySelector(
      '[data-testid="admin-community-autofollow-save"]',
    ) as HTMLButtonElement;
    await act(async () => {
      saveButton.click();
    });

    expect(
      container!.querySelector(
        '[data-testid="admin-community-autofollow-toast"]',
      )?.textContent,
    ).toContain('Unknown auto-follow handles: ghost');
  });
});
