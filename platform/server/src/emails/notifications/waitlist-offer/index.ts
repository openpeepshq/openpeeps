import type {
  EmailOptionsWithGlobals,
  ExpandedNotification,
} from '@openpeepshq/common/types';

import type { ReactEmailTemplate } from '../../types';
import { WaitlistOfferEmail } from './Email';

const renderSubject = async (
  props: EmailOptionsWithGlobals & { locals: ExpandedNotification },
): Promise<string> => {
  const { t } = props.globals.i18nContext;
  const event =
    props.locals.post?.data?.type === 'event'
      ? props.locals.post.data
      : undefined;
  return t('emails.waitlistOffer.subject', {
    eventName: event?.name?.trim() || t('emails.waitlistOffer.eventFallback'),
  });
};

const template: ReactEmailTemplate<ExpandedNotification> = {
  component: WaitlistOfferEmail,
  renderSubject,
};

export default template;
