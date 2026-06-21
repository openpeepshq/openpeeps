import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { CompiledMarkdown } from '@openpeeps/react/components';
import { docsBySlug } from 'virtual:openpeeps-docs';

import { NotFound } from '../NotFound';

export const docsSlugFromPath = (pathname: string): string =>
  pathname.replace(/^\/docs\/?/, '').replace(/\/$/, '');

export const DocsPage = () => {
  const { pathname } = useLocation();
  const slug = docsSlugFromPath(pathname);
  const doc = docsBySlug[slug];

  useEffect(() => {
    document.title = doc ? `${doc.title} · Docs` : 'Documentation';
  }, [doc]);

  if (!doc) {
    return <NotFound />;
  }

  return <CompiledMarkdown html={doc.html} />;
};
