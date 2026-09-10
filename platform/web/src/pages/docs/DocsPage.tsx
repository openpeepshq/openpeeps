import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { CompiledMarkdown } from '@openpeepshq/react/components';
import { docsBySlug } from 'virtual:openpeeps-docs';

import { NotFound } from '@openpeepshq/react/pages';

import { renderMermaidBlocks } from './renderMermaid';

export const docsSlugFromPath = (pathname: string): string =>
  pathname.replace(/^\/docs\/?/, '').replace(/\/$/, '');

export const DocsPage = () => {
  const { pathname } = useLocation();
  const slug = docsSlugFromPath(pathname);
  const doc = docsBySlug[slug];
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = doc ? `${doc.title} · Docs` : 'Documentation';
  }, [doc]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !doc) {
      return;
    }
    void renderMermaidBlocks(root);
  }, [doc]);

  if (!doc) {
    return <NotFound />;
  }

  return (
    <div ref={rootRef}>
      <CompiledMarkdown html={doc.html} />
    </div>
  );
};
