export type DocEntry = {
  slug: string;
  title: string;
  html: string;
  /** Plain text excerpt for search */
  text: string;
};

export type DocsManifest = {
  versionId: string;
  versionLabel: string;
  docs: DocEntry[];
};

export type VersionEntry = {
  id: string;
  label: string;
  path: string;
};

export type VersionsFile = {
  default: string;
  versions: VersionEntry[];
};
