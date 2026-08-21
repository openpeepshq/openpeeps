import {
  accountNameSchema,
  GROUP_DISPLAY_NAME_MAX_LENGTH,
} from '@openpeepshq/common/types';
import type { TFunction } from 'i18next';

export type GroupFormFieldErrors = {
  displayName?: string;
  handle?: string;
};

export const hasGroupFormFieldErrors = (errors: GroupFormFieldErrors) =>
  Boolean(errors.displayName || errors.handle);

const displayNameMaxLengthMessage = (t: TFunction) =>
  t('groups.form.displayNameMaxLength', {
    defaultValue: `Group name should be ${GROUP_DISPLAY_NAME_MAX_LENGTH} characters or fewer`,
    max: GROUP_DISPLAY_NAME_MAX_LENGTH,
  });

const handleErrorMessage = (issue: string | undefined, t: TFunction) =>
  issue === 'Handle is reserved'
    ? t('profile.form.handleReserved', {
        defaultValue: 'That handle is reserved. Please choose another.',
      })
    : t('profile.form.handleInvalid', {
        defaultValue:
          'Handle must be 1–16 characters: letters, numbers, underscores, or hyphens (no spaces or punctuation)',
      });

export const groupFormFieldErrors = (
  data: { displayName?: string; handle?: string },
  t: TFunction,
  options?: { skipHandle?: boolean },
): GroupFormFieldErrors => {
  const errors: GroupFormFieldErrors = {};
  const displayName = data.displayName ?? '';
  const handle = data.handle ?? '';

  if (displayName.length > GROUP_DISPLAY_NAME_MAX_LENGTH) {
    errors.displayName = displayNameMaxLengthMessage(t);
  }

  if (options?.skipHandle) {
    return errors;
  }

  if (handle.length > 0) {
    const result = accountNameSchema.safeParse(handle);
    if (!result.success) {
      errors.handle = handleErrorMessage(result.error.issues[0]?.message, t);
    }
  } else if (!displayName && !errors.displayName) {
    errors.displayName = t('handle.validation.error', {
      defaultValue: 'A handle or display name is required',
    });
  }

  return errors;
};

const apiErrorCandidate = (err: unknown): string => {
  if (typeof err !== 'object' || err === null) {
    return '';
  }
  const record = err as Record<string, unknown>;
  const nested =
    typeof record.error === 'object' && record.error !== null
      ? (record.error as Record<string, unknown>)
      : undefined;
  const candidate =
    record.errorKey ??
    record.key ??
    nested?.key ??
    nested?.message ??
    record.message;
  return typeof candidate === 'string' ? candidate : '';
};

/** Server conflict when a group/profile handle is already taken. */
export const isDuplicateHandleError = (err: unknown): boolean => {
  const candidate = apiErrorCandidate(err);
  return (
    candidate === 'groups.handleExists' ||
    candidate.endsWith('.handleExists') ||
    candidate.includes('groups.handleExists')
  );
};

export const duplicateHandleMessage = (t: TFunction) =>
  t('groups.handleExists', {
    defaultValue: 'This handle is already in use. Please try a different one.',
  });
