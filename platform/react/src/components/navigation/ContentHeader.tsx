import { ChevronLeft } from 'lucide-react';
import { capitalizeFirstLetter } from '@openpeepshq/common/lib';
import { usePageHeader } from '../../stores';
import { useT } from '../../i18n';
import { useRouter } from '../../contexts/router';

export function ContentHeader() {
  const pageHeader = usePageHeader();
  const t = useT();
  const router = useRouter();

  const titleString =
    typeof pageHeader?.title === 'string'
      ? pageHeader.title
      : capitalizeFirstLetter(
          router.pathname.split('/').filter(Boolean).pop() ?? '',
        );

  const titleNode =
    pageHeader?.title && typeof pageHeader.title !== 'string'
      ? pageHeader.title
      : null;

  return (
    <div className="bg-background sticky top-0 z-10 flex h-16 w-full items-center justify-between border-b p-4">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          title={t('navigation.back')}
          onClick={() => router.back()}
        >
          <ChevronLeft />
        </button>
        {titleNode ?? (
          <h1
            className="truncate text-xl font-semibold"
            data-testid={pageHeader?.testId}
          >
            {titleString}
          </h1>
        )}
      </div>
      {pageHeader?.actions && (
        <div className="flex items-center gap-2">{pageHeader.actions}</div>
      )}
    </div>
  );
}
