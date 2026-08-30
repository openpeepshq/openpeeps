import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { docsManifest, type DocEntry } from 'virtual:openpeeps-docs';
import { useT } from '@openpeepshq/react';

const docPath = (slug: string): string => (slug ? `/docs/${slug}` : '/docs');

const filterDocs = (
  docs: DocEntry[],
  query: string,
  limit = 12,
): DocEntry[] => {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  return docs
    .filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.text.toLowerCase().includes(q) ||
        d.slug.toLowerCase().includes(q),
    )
    .sort((a, b) => {
      const score = (d: DocEntry) =>
        d.title.toLowerCase().includes(q) ? 0 : 1;
      return score(a) - score(b);
    })
    .slice(0, limit);
};

export const DocSearch = (): ReactElement => {
  const t = useT();
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const results = useMemo(() => filterDocs(docsManifest, query), [query]);
  const showPanel = open && query.trim().length >= 2;

  const close = () => {
    setQuery('');
    setOpen(false);
  };

  useEffect(() => {
    if (!showPanel) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [showPanel]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div ref={rootRef} className="relative w-full max-w-xs">
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key !== 'Enter' || results.length === 0) return;
          e.preventDefault();
          navigate(docPath(results[0].slug));
          close();
        }}
        placeholder={t('docs.search.placeholder', {
          defaultValue: 'Search docs…',
        })}
        className="border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary w-full rounded-md border px-3 py-1.5 text-sm outline-none"
        aria-label={t('docs.search.ariaLabel', {
          defaultValue: 'Search documentation',
        })}
        aria-expanded={showPanel}
        aria-controls="docs-search-results"
        autoComplete="off"
      />
      {showPanel && (
        <ul
          id="docs-search-results"
          className="border-border bg-surface absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-md border shadow-md"
        >
          {results.length === 0 ? (
            <li className="text-muted-foreground px-3 py-2 text-sm">
              {t('docs.search.noResults', {
                defaultValue: 'No matching pages',
              })}
            </li>
          ) : (
            results.map((doc) => (
              <li key={doc.slug || 'home'}>
                <Link
                  to={docPath(doc.slug)}
                  className="hover:bg-background block px-3 py-2 text-sm"
                  onClick={close}
                >
                  <div className="font-medium">{doc.title}</div>
                  {doc.slug && (
                    <div className="text-muted-foreground text-xs">
                      {doc.slug}
                    </div>
                  )}
                </Link>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
};
