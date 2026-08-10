import { Link } from 'react-router-dom';

import { useT } from '@openpeepshq/react';

export function NotFound() {
  const t = useT();
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-6 py-16 text-center">
      <h1 className="text-foreground text-3xl font-semibold">404</h1>
      <p className="text-muted-foreground text-sm">
        {t('common.notFound', {
          defaultValue: "We couldn't find that page.",
        })}
      </p>
      <Link to="/" className="text-primary text-sm underline">
        {t('common.backHome', { defaultValue: 'Back home' })}
      </Link>
    </div>
  );
}
