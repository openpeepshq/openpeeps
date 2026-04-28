import { Command } from 'commander';
import { updateConfigValues } from '@openpeeps/core/config';

type CommunityConfigOptions = {
  object?: boolean;
  number?: boolean;
};

type ConfigPatch = {
  [key: string]: unknown;
};

export const registerCommunityConfigCommand = (program: Command) => {
  program
    .command('community-config')
    .description('Set a community config value')
    .argument('<key>', 'Config key path in dot notation')
    .argument('<value>', 'Config value')
    .option('-o, --object', 'Parse value as a JSON object')
    .option('-n, --number', 'Parse value as a number')
    .action(
      async (key: string, value: string, options: CommunityConfigOptions) => {
        if (options.object && options.number) {
          console.error('Use either --object or --number, not both.');
          process.exitCode = 1;
          return;
        }

        try {
          const parsedValue = parseConfigValue(value, options);
          const configValues = buildConfigPatch(key, parsedValue);

          await updateConfigValues(configValues, 'openpeeps', 'community');

          console.log(`Updated community config ${key}.`);
          process.exit(0);
        } catch (error) {
          console.error(error instanceof Error ? error.message : String(error));
          process.exitCode = 1;
        }
      },
    );
};

const parseConfigValue = (
  value: string,
  options: CommunityConfigOptions,
): unknown => {
  if (options.object) {
    const parsed = parseJsonValue(value, 'object');

    if (
      parsed === null ||
      typeof parsed !== 'object' ||
      Array.isArray(parsed)
    ) {
      throw new Error(
        'Value must be a parseable JSON object when using --object.',
      );
    }

    return parsed;
  }

  if (options.number) {
    const parsed = parseJsonValue(value, 'number');

    if (typeof parsed !== 'number' || !Number.isFinite(parsed)) {
      throw new Error('Value must be a parseable number when using --number.');
    }

    return parsed;
  }

  return value;
};

const parseJsonValue = (value: string, type: string): unknown => {
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`Value must be parseable JSON ${type}.`);
  }
};

const buildConfigPatch = (key: string, value: unknown): ConfigPatch => {
  const path = key.split('.');

  if (path.length === 0 || path.some((part) => part.length === 0)) {
    throw new Error('Key must be a valid dot notation path.');
  }

  return path.reduceRight<unknown>(
    (child, part) => ({ [part]: child }),
    value,
  ) as ConfigPatch;
};
