import type {
  EmailOptionsWithGlobals,
  ExpandedNotification,
} from '@openpeepshq/common/types';
import { profileName } from '@openpeepshq/common/lib';

import type { ReactEmailTemplate } from '../../types';
import { RsvpCanceledEmail } from './Email';

const renderSubject = async (
  props: EmailOptionsWithGlobals & { locals: ExpandedNotification },
): Promise<string> => {
  const { t } = props.globals.i18nContext;
  const { senderProfile } = props.locals;
  return t('emails.rsvpCanceled.subject', {
    profileName: senderProfile ? profileName(senderProfile) : '',
  });
};

const template: ReactEmailTemplate<ExpandedNotification> = {
  component: RsvpCanceledEmail,
  renderSubject,
};

export default template;
