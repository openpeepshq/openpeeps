import { atomShowcases } from './showcases/atoms';
import { moleculeShowcases } from './showcases/molecules';
import { organismShowcases } from './showcases/organisms';
import { domainShowcases } from './showcases/domain';
import type { ShowcaseCategory, ShowcaseEntry } from '@/types';

export const showcases: ShowcaseEntry[] = [
  ...atomShowcases,
  ...moleculeShowcases,
  ...organismShowcases,
  ...domainShowcases,
];

export const showcaseCategories: ShowcaseCategory[] = [
  'atoms',
  'molecules',
  'organisms',
];

export const showcasesForCategory = (
  category?: ShowcaseCategory,
): ShowcaseEntry[] =>
  category
    ? showcases.filter((entry) => entry.category === category)
    : showcases;
