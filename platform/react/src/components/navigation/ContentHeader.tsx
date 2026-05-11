import { ChevronLeft } from 'lucide-react';
import { capitalizeFirstLetter } from '@openpeeps/common/lib';
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
    <div className="bg-card sticky top-0 z-10 flex h-16 w-full items-center justify-between border-b p-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          title={t('navigation.back')}
          onClick={() => router.back()}
        >
          <ChevronLeft />
        </button>
        {titleNode ?? <h5 className="text-xl font-semibold">{titleString}</h5>}
      </div>
      {pageHeader?.actions && (
        <div className="flex items-center gap-2">{pageHeader.actions}</div>
      )}
    </div>
  );
}
