import { describe, expect, it } from 'vitest';
import {
  accountCreationDataSchema,
  registerRequestSchema,
  updateProfileRequestSchema,
} from '../api';

const validRegister = {
  handle: 'niko',
  email: 'niko@example.com',
  password: 'password1',
  privacyPolicyAccepted: true,
};

describe('profile displayName input schemas', () => {
  it('rejects registration display names longer than 30 characters', () => {
    const result = registerRequestSchema.safeParse({
      ...validRegister,
      displayName: 'Nikoraus costantine shitungulu ',
    });

    expect(result.success).toBe(false);
  });

  it('accepts registration display names up to 30 characters', () => {
    const result = registerRequestSchema.safeParse({
      ...validRegister,
      displayName: 'Nikoraus costantine shitungulu',
    });

    expect(result.success).toBe(true);
  });

  it('rejects account creation display names longer than 30 characters', () => {
    const result = accountCreationDataSchema.safeParse({
      email: 'niko@example.com',
      password: 'password1',
      profile: {
        handle: 'niko',
        displayName: 'Nikoraus costantine shitungulu ',
      },
    });

    expect(result.success).toBe(false);
  });

  it('rejects profile updates with display names longer than 30 characters', () => {
    const result = updateProfileRequestSchema.safeParse({
      displayName: 'Nikoraus costantine shitungulu ',
    });

    expect(result.success).toBe(false);
  });
});
