import type {
  EmailOptionsWithGlobals,
  ExpandedNotification,
} from '@openpeepshq/common/types';

import type { ReactEmailTemplate } from '../../types';
import { RsvpEmail } from './Email';

const renderSubject = async (
  props: EmailOptionsWithGlobals & { locals: ExpandedNotification },
): Promise<string> => {
  const { t } = props.globals.i18nContext;
  return t('emails.rsvp.subject', {
    communityName: props.globals.communityConfig.info.name,
  });
};

const template: ReactEmailTemplate<ExpandedNotification> = {
  component: RsvpEmail,
  renderSubject,
};

export default template;
