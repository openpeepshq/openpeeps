declare module 'virtual:openpeeps-docs' {
  export type DocEntry = {
    slug: string;
    html: string;
    title: string;
    text: string;
  };

  export const docsManifest: DocEntry[];
  export const docsBySlug: Record<string, DocEntry>;
}
