import crypto from 'node:crypto';
import dotenv from 'dotenv';
dotenv.config();

export const readEnvInteger = (key: string, defaultValue: number) => {
  const stringValue = process.env[key];
  return stringValue ? Number.parseInt(stringValue) : defaultValue;
};

/** True for Docker/prod images (`NODE_ENV=production`) or explicit prod profile. */
export const isProductionProfile = () =>
  process.env.NODE_ENV === 'production' ||
  process.env.ENVIRONMENT === 'production';

/**
 * Resolve JWT signing secret.
 *
 * A cryptographically random fallback is fine for a single local process, but
 * it is not shared across instances and is lost on restart — so production
 * profiles fail fast when `JWT_SECRET` is unset.
 */
export const resolveJwtSecret = (): string => {
  const fromEnv = process.env.JWT_SECRET;
  if (fromEnv) return fromEnv;

  if (isProductionProfile()) {
    throw new Error(
      'JWT_SECRET is required in production. A random fallback is ' +
        'cryptographically fine for one process, but multi-instance and ' +
        'restart consistency require a stable shared secret.',
    );
  }

  console.warn(
    '[config] JWT_SECRET unset; using an ephemeral random secret. ' +
      'Fine for local single-process use — set JWT_SECRET for multi-instance ' +
      'or across restarts.',
  );
  return crypto.randomBytes(64).toString('hex');
};
