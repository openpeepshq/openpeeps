import { describe, expect, it } from 'vitest';
import { cn } from '@/lib/utils';

describe('LoadingSpinner border merge', () => {
  it('keeps the primary accent after a transparent after-border', () => {
    expect(cn('after:border-transparent', 'after:border-b-primary')).toContain(
      'after:border-b-primary',
    );
  });

  it('drops the accent when Prettier-sorted order is merged as one string', () => {
    expect(cn('after:border-b-primary after:border-transparent')).not.toContain(
      'after:border-b-primary',
    );
  });
});
