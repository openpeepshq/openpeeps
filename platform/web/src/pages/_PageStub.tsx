import type { ReactNode } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { useT } from '@openpeeps/react';

export interface PageStubProps {
  /** Human-friendly title for the route ("Local Feed", "Profile", ...). */
  title: string;
  /** Path of the SvelteKit source that should be ported. */
  svelteSource: string;
  /**
   * Names of components from `@openpeeps/svelte/components` (or other support
   * libraries) that need React equivalents before this page can be ported.
   */
  needs?: string[];
  /** Optional preview content (e.g. an h1 + intro) so the route is not empty. */
  children?: ReactNode;
}

/**
 * Generic placeholder for pages whose React port is blocked on missing
 * components. Renders enough chrome that the route is navigable but is honest
 * about what still needs to be built.
 */
export function PageStub({
  title,
  svelteSource,
  needs = [],
  children,
}: PageStubProps) {
  const t = useT();
  const params = useParams();
  const paramEntries = Object.entries(params);

  return (
    <div className="space-y-4 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-muted-foreground text-sm">
          {t('stub.routeNotYetPorted', {
            defaultValue:
              'This route exists in the SvelteKit app but hasn’t been ported to React yet.',
          })}
        </p>
      </header>

      {paramEntries.length > 0 && (
        <div className="border-border bg-card rounded-md border p-3 text-sm">
          <div className="mb-1 font-medium">Route params</div>
          <ul className="space-y-0.5 font-mono text-xs">
            {paramEntries.map(([k, v]) => (
              <li key={k}>
                <span className="text-muted-foreground">{k}:</span> {String(v)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {children && <div>{children}</div>}

      <div className="border-warning/40 bg-warning/5 rounded-md border p-4 text-sm">
        <div className="mb-2 flex items-center gap-2 font-medium">
          <AlertTriangle className="h-4 w-4" />
          {t('stub.portingTodo', { defaultValue: 'Porting TODO' })}
        </div>
        <p className="mb-2">
          Source: <code className="font-mono">{svelteSource}</code>
        </p>
        {needs.length > 0 && (
          <>
            <p className="mb-1">
              {t('stub.requiredComponents', {
                defaultValue: 'Requires React equivalents of:',
              })}
            </p>
            <ul className="ml-4 list-disc font-mono text-xs">
              {needs.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div>
        <RouterLink to="/" className="op-anchor text-sm">
          {t('stub.backHome', { defaultValue: 'Back home' })}
        </RouterLink>
      </div>
    </div>
  );
}
