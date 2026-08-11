import { useEffect, type ReactElement } from 'react';
import { useLocation } from 'react-router-dom';
import { CompiledMarkdown } from '@/components/CompiledMarkdown';
import type { DocEntry } from '@/types';

type Props = {
  docsBySlug: Record<string, DocEntry>;
};

export const DocPage = ({ docsBySlug }: Props): ReactElement => {
  const { pathname } = useLocation();
  // pathname is relative to BrowserRouter basename
  const slug = pathname.replace(/^\//, '').replace(/\/$/, '');
  const doc = docsBySlug[slug];
  const rawMdHref = `${import.meta.env.BASE_URL}${slug || 'index'}.md`;

  useEffect(() => {
    document.title = doc
      ? `${doc.title} · OpenPeeps Docs`
      : 'Not found · OpenPeeps Docs';
  }, [doc]);

  if (!doc) {
    return (
      <div>
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <p className="text-muted-foreground mt-2">
          No documentation page at <code>{slug || '/'}</code>.
        </p>
      </div>
    );
  }

  return (
    <article>
      <div className="mb-4 flex justify-end">
        <a
          href={rawMdHref}
          className="text-muted-foreground hover:text-primary text-xs underline underline-offset-2"
        >
          View as Markdown
        </a>
      </div>
      <CompiledMarkdown
        html={doc.html}
        className="docs-markdown prose prose-neutral max-w-none"
      />
    </article>
  );
};
