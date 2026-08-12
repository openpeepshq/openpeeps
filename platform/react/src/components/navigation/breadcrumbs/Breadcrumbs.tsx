import { Fragment } from 'react';
import { useBreadcrumbs } from '../../../stores';
import { useT } from '../../../i18n';
import { CrumbItem } from './Crumb';

export function Breadcrumbs() {
  const breadcrumbs = useBreadcrumbs();
  const t = useT();
  if (breadcrumbs.length === 0) return null;

  return (
    <nav
      aria-label={t('navigation.breadcrumbs', {
        defaultValue: 'Breadcrumbs',
      })}
    >
      <ol className="text-muted-foreground mb-3 flex flex-wrap items-center gap-1 px-4 text-sm">
        {breadcrumbs.map((crumb, idx) => (
          <Fragment key={`${crumb.text}-${idx}`}>
            {idx > 0 && (
              <li className="op-crumb-separator" aria-hidden="true">
                ›
              </li>
            )}
            <CrumbItem crumb={crumb} />
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}
