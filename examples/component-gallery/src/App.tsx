import type { ReactElement } from 'react';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { GalleryLayout } from '@/components/GalleryLayout';
import { ShowcaseBoundary } from '@/components/ShowcaseBoundary';
import { showcaseCategories, showcasesForCategory } from '@/registry';
import { CATEGORY_LABELS, type ShowcaseCategory } from '@/types';

const versionId = __GALLERY_VERSION_ID__;
const versionLabel = __GALLERY_VERSION_LABEL__;

const GalleryPage = (): ReactElement => {
  const { category } = useParams<{ category?: string }>();
  const typedCategory = category as ShowcaseCategory | undefined;
  const entries = showcasesForCategory(
    typedCategory && showcaseCategories.includes(typedCategory)
      ? typedCategory
      : undefined,
  );

  return (
    <div>
      <header className="mb-6">
        <h2 className="text-2xl font-semibold">
          {typedCategory && showcaseCategories.includes(typedCategory)
            ? CATEGORY_LABELS[typedCategory]
            : 'All components'}
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Design-system gallery grouped as atoms, molecules, and organisms.
          Domain UI from `@openpeepshq/react` lives under Organisms.
        </p>
      </header>
      {entries.map((entry) => (
        <div key={entry.id} id={entry.id}>
          <ShowcaseBoundary title={entry.title}>
            {entry.render()}
          </ShowcaseBoundary>
        </div>
      ))}
    </div>
  );
};

export const App = (): ReactElement => (
  <GalleryLayout
    categories={showcaseCategories}
    versionId={versionId}
    versionLabel={versionLabel}
  >
    <Routes>
      <Route path="/" element={<GalleryPage />} />
      <Route path="/category/:category" element={<GalleryPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </GalleryLayout>
);
