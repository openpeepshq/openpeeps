import { afterEach, describe, expect, it, vi } from 'vitest';

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
  vi.resetModules();
  vi.restoreAllMocks();
});

describe('resolveJwtSecret', () => {
  it('returns JWT_SECRET when set', async () => {
    process.env.JWT_SECRET = 'fixed-secret';
    delete process.env.NODE_ENV;
    delete process.env.ENVIRONMENT;
    const { resolveJwtSecret } = await import('./helpers');
    expect(resolveJwtSecret()).toBe('fixed-secret');
  });

  it('uses a random fallback and warns outside production', async () => {
    delete process.env.JWT_SECRET;
    process.env.NODE_ENV = 'development';
    delete process.env.ENVIRONMENT;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { resolveJwtSecret } = await import('./helpers');
    const secret = resolveJwtSecret();
    expect(secret).toMatch(/^[0-9a-f]{128}$/);
    expect(warn).toHaveBeenCalledOnce();
  });

  it('fails fast in production when JWT_SECRET is unset', async () => {
    delete process.env.JWT_SECRET;
    process.env.NODE_ENV = 'production';
    delete process.env.ENVIRONMENT;
    const { resolveJwtSecret } = await import('./helpers');
    expect(() => resolveJwtSecret()).toThrow(/JWT_SECRET is required/);
  });
});

describe('defaultConfig.secrets.jwt', () => {
  it('imports without JWT_SECRET in production (lazy)', async () => {
    delete process.env.JWT_SECRET;
    process.env.NODE_ENV = 'production';
    delete process.env.ENVIRONMENT;
    const { defaultConfig } = await import('./defaults/core');
    expect(defaultConfig.secrets).toBeDefined();
    expect(() => defaultConfig.secrets.jwt).toThrow(/JWT_SECRET is required/);
  });

  it('reads JWT_SECRET when accessed', async () => {
    process.env.JWT_SECRET = 'fixed-secret';
    delete process.env.NODE_ENV;
    delete process.env.ENVIRONMENT;
    const { defaultConfig } = await import('./defaults/core');
    expect(defaultConfig.secrets.jwt).toBe('fixed-secret');
  });
});
