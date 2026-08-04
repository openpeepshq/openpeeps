import { useMemo, useState, type ReactElement } from 'react';
import { Link } from 'react-router-dom';
import type { DocEntry } from '@/types';
import { slugToPath } from '@/lib/sidebar';

type Props = {
  docs: DocEntry[];
};

export const DocSearch = ({ docs }: Props): ReactElement => {
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return docs
      .filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.text.toLowerCase().includes(q) ||
          d.slug.toLowerCase().includes(q),
      )
      .slice(0, 12);
  }, [docs, query]);

  return (
    <div className="relative w-full max-w-xs">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search docs…"
        className="border-border bg-card text-foreground placeholder:text-muted-foreground w-full rounded-md border px-3 py-1.5 text-sm outline-none focus:border-primary"
        aria-label="Search documentation"
      />
      {results.length > 0 && (
        <ul className="border-border bg-card absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-md border shadow-md">
          {results.map((doc) => (
            <li key={doc.slug || 'home'}>
              <Link
                to={slugToPath(doc.slug)}
                className="hover:bg-muted block px-3 py-2 text-sm"
                onClick={() => setQuery('')}
              >
                <div className="font-medium">{doc.title}</div>
                {doc.slug && (
                  <div className="text-muted-foreground text-xs">{doc.slug}</div>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
