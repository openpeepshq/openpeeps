import type {
  EmailOptionsWithGlobals,
  ExpandedNotification,
  PublicProfile,
} from '@openpeepshq/common/types';
import { profileName } from '@openpeepshq/common/lib';

import type { ReactEmailTemplate } from '../../types';
import { FollowEmail } from './Email';

const renderSubject = async (
  props: EmailOptionsWithGlobals & { locals: ExpandedNotification },
): Promise<string> => {
  const { t } = props.globals.i18nContext;
  return t('emails.follow.subject', {
    profileName: profileName(props.locals.senderProfile as PublicProfile),
  });
};

const template: ReactEmailTemplate<ExpandedNotification> = {
  component: FollowEmail,
  renderSubject,
};

export default template;
