import type { ReactNode } from 'react';

export type VersionEntry = {
  id: string;
  label: string;
  path: string;
};

export type VersionsFile = {
  default: string;
  versions: VersionEntry[];
};

export type ShowcaseCategory = 'atoms' | 'molecules' | 'organisms';

export const CATEGORY_LABELS: Record<ShowcaseCategory, string> = {
  atoms: 'Atoms',
  molecules: 'Molecules',
  organisms: 'Organisms',
};

export type ShowcaseEntry = {
  id: string;
  title: string;
  category: ShowcaseCategory;
  description?: string;
  render: () => ReactNode;
};

export const showcase = (
  category: ShowcaseCategory,
  id: string,
  title: string,
  render: () => ReactNode,
  description?: string,
): ShowcaseEntry => ({ id, title, category, description, render });
