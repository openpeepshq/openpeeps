import { describe, expect, it } from 'vitest';
import type { TFunction } from 'i18next';
import { GROUP_DISPLAY_NAME_MAX_LENGTH } from '@openpeepshq/common/types';
import {
  duplicateHandleMessage,
  groupFormFieldErrors,
  hasGroupFormFieldErrors,
  isDuplicateHandleError,
} from '../groupFormErrors';

const t = ((key: string, options?: { defaultValue?: string; max?: number }) => {
  let value = options?.defaultValue ?? key;
  if (options?.max !== undefined) {
    value = value.replaceAll('{{max}}', String(options.max));
  }
  return value;
}) as TFunction;

describe('groupFormFieldErrors', () => {
  it('flags a group name over the character limit', () => {
    const errors = groupFormFieldErrors(
      {
        displayName: 'A'.repeat(GROUP_DISPLAY_NAME_MAX_LENGTH + 1),
        handle: 'ok_handle',
      },
      t,
    );
    expect(errors.displayName).toBe(
      'Group name should be 30 characters or fewer',
    );
    expect(hasGroupFormFieldErrors(errors)).toBe(true);
  });

  it('accepts a group name at the character limit', () => {
    const errors = groupFormFieldErrors(
      {
        displayName: 'A'.repeat(GROUP_DISPLAY_NAME_MAX_LENGTH),
        handle: 'ok_handle',
      },
      t,
    );
    expect(errors).toEqual({});
  });

  it('flags an invalid handle without touching a valid name', () => {
    const errors = groupFormFieldErrors(
      { displayName: 'Board', handle: 'not a handle' },
      t,
    );
    expect(errors.displayName).toBeUndefined();
    expect(errors.handle).toMatch(/1–16 characters/i);
  });

  it('does not validate handle when skipHandle is set', () => {
    const errors = groupFormFieldErrors(
      { displayName: 'Board', handle: 'not a handle' },
      t,
      { skipHandle: true },
    );
    expect(errors).toEqual({});
  });
});

describe('isDuplicateHandleError', () => {
  it('detects the groups.handleExists conflict key', () => {
    expect(isDuplicateHandleError({ message: 'groups.handleExists' })).toBe(
      true,
    );
    expect(isDuplicateHandleError({ key: 'groups.handleExists' })).toBe(true);
    expect(isDuplicateHandleError({ errorKey: 'groups.handleExists' })).toBe(
      true,
    );
  });

  it('ignores unrelated API errors', () => {
    expect(
      isDuplicateHandleError({
        message: 'Invalid body. Validation error: Too big at "displayName"',
      }),
    ).toBe(false);
    expect(isDuplicateHandleError({ message: 'Conflict' })).toBe(false);
  });

  it('returns translated copy for the toast and field', () => {
    expect(duplicateHandleMessage(t)).toMatch(/already in use/i);
  });
});
