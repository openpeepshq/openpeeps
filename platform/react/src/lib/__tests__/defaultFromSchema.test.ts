import { describe, expect, it } from 'vitest';
import { z, type ZodType } from 'zod';
import { coreConfigSanitizedSchema } from '@openpeepshq/common/types';
import { defaultFromSchema, unwrap } from '../configuration/helpers';

const arrayElement = (schema: ZodType) => {
  const inner = unwrap(schema);
  if (!(inner instanceof z.ZodArray)) {
    throw new Error('expected an array schema');
  }
  return inner.element as ZodType;
};

describe('defaultFromSchema', () => {
  it('uses an empty string for server allowed-host entries', () => {
    const element = arrayElement(
      coreConfigSanitizedSchema.shape.federation.shape.allowedHosts,
    );
    expect(() => element.parse(undefined)).toThrow();
    expect(defaultFromSchema(element)).toBe('');
  });

  it('keeps object defaults declared on list items', () => {
    const element = arrayElement(
      coreConfigSanitizedSchema.shape.sso.shape.generic,
    );
    expect(defaultFromSchema(element)).toMatchObject({
      id: 'example-generic',
      name: 'Generic SSO',
    });
  });
});
