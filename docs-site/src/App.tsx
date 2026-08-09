import { useMemo, type ReactElement } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { DocsLayout } from '@/components/DocsLayout';
import { DocPage } from '@/pages/DocPage';
import type { DocsManifest } from '@/types';
import manifestJson from './generated/docs-manifest.json';

const manifest = manifestJson as DocsManifest;

export const App = (): ReactElement => {
  const docsBySlug = useMemo(() => {
    const map: Record<string, (typeof manifest.docs)[number]> = {};
    for (const doc of manifest.docs) map[doc.slug] = doc;
    return map;
  }, []);

  const basename = (import.meta.env.BASE_URL || '/').replace(/\/$/, '') || '/';

  return (
    <BrowserRouter basename={basename === '/' ? undefined : basename}>
      <DocsLayout
        docs={manifest.docs}
        versionId={manifest.versionId}
        versionLabel={manifest.versionLabel}
      >
        <Routes>
          <Route path="*" element={<DocPage docsBySlug={docsBySlug} />} />
        </Routes>
      </DocsLayout>
    </BrowserRouter>
  );
};
