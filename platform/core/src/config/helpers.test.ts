import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveJwtSecret } from './helpers';

const ORIGINAL = {
  JWT_SECRET: process.env.JWT_SECRET,
  NODE_ENV: process.env.NODE_ENV,
  ENVIRONMENT: process.env.ENVIRONMENT,
};

afterEach(() => {
  for (const [key, value] of Object.entries(ORIGINAL)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  vi.restoreAllMocks();
});

describe('resolveJwtSecret', () => {
  it('returns JWT_SECRET when set', () => {
    process.env.JWT_SECRET = 'fixed-secret';
    delete process.env.NODE_ENV;
    delete process.env.ENVIRONMENT;
    expect(resolveJwtSecret()).toBe('fixed-secret');
  });

  it('uses a random fallback and warns outside production', () => {
    delete process.env.JWT_SECRET;
    process.env.NODE_ENV = 'development';
    delete process.env.ENVIRONMENT;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const secret = resolveJwtSecret();
    expect(secret).toMatch(/^[0-9a-f]{128}$/);
    expect(warn).toHaveBeenCalledOnce();
  });

  it('fails fast in production when JWT_SECRET is unset', () => {
    delete process.env.JWT_SECRET;
    process.env.NODE_ENV = 'production';
    delete process.env.ENVIRONMENT;
    expect(() => resolveJwtSecret()).toThrow(/JWT_SECRET is required/);
  });
});
