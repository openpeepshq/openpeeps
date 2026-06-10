import { useState } from 'react';
import { Copy, CopyCheck, X } from 'lucide-react';
import { truncateText } from '@openpeeps/common';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useT } from '../../i18n';
import { useJamContext } from './JamContext';

export interface JamDetailsDrawerProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Jam details side menu (joining info + moderator observer link), styled like
 * the chat / people drawers. Replaces the previous floating info popover.
 */
export const JamDetailsDrawer = ({ open, onClose }: JamDetailsDrawerProps) => {
  const t = useT();
  const { jamPost } = useJamContext();
  const { openpeepsApi } = useOpenpeeps();
  const observerLinkQuery = openpeepsApi.useObserverLink(jamPost.id);

  const [copied, setCopied] = useState(false);
  const [observerCopied, setObserverCopied] = useState(false);

  if (!open) return null;

  const href = typeof window !== 'undefined' ? window.location.href : '';
  const observerUrl =
    typeof window !== 'undefined' && observerLinkQuery.data?.path
      ? `${window.location.origin}${observerLinkQuery.data.path}`
      : null;

  return (
    <div className="bg-surface-100 text-foreground absolute right-0 top-0 flex h-full w-full flex-col gap-3 overflow-hidden rounded md:relative md:w-80">
      <div className="flex w-full flex-none items-center justify-between border-b p-2">
        <h3 className="text-lg">{t('jams.details.panelHeading')}</h3>
        <button
          type="button"
          title={t('jams.details.closePanel')}
          className="text-neutral-400"
          onClick={onClose}
        >
          <X />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-2 pb-4">
        <div>
          <h4 className="text-muted-foreground text-xs font-semibold uppercase">
            {t('jams.details.joiningInfoHeading')}
          </h4>
          <span className="mt-1 block break-all text-sm">{href}</span>
          <button
            type="button"
            className="mt-2 flex items-center text-sm"
            onClick={() => {
              void navigator.clipboard.writeText(href);
              setCopied(true);
            }}
          >
            {copied ? (
              <CopyCheck className="size-4" />
            ) : (
              <Copy className="size-4" />
            )}
            <span className="ml-2">
              {copied
                ? t('jams.details.copiedJoiningInfo')
                : t('jams.details.copyJoiningInfo')}
            </span>
          </button>
        </div>

        {observerUrl ? (
          <div>
            <h4 className="text-muted-foreground text-xs font-semibold uppercase">
              {t('jams.details.observerLinkHeading')}
            </h4>
            <span className="mt-1 block break-all text-sm">
              {truncateText(observerUrl, 40)}
            </span>
            <button
              type="button"
              className="mt-2 flex items-center text-sm"
              onClick={() => {
                void navigator.clipboard.writeText(observerUrl);
                setObserverCopied(true);
              }}
            >
              {observerCopied ? (
                <CopyCheck className="size-4" />
              ) : (
                <Copy className="size-4" />
              )}
              <span className="ml-2">
                {observerCopied
                  ? t('jams.details.copiedObserverLink')
                  : t('jams.details.copyObserverLink')}
              </span>
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};
