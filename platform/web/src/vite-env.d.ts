declare module 'virtual:openpeeps-docs' {
  export type DocEntry = {
    slug: string;
    html: string;
    title: string;
  };

  export const docsManifest: DocEntry[];
  export const docsBySlug: Record<string, DocEntry>;
}
