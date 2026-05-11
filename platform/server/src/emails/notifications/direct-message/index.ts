import type {
  EmailOptionsWithGlobals,
  ExpandedNotification,
  PublicProfile,
} from '@openpeeps/common/types';
import { profileName } from '@openpeeps/common/lib';

import type { ReactEmailTemplate } from '../../types';
import { DirectMessageEmail } from './Email';

const renderSubject = async (
  props: EmailOptionsWithGlobals & { locals: ExpandedNotification },
): Promise<string> => {
  const { t } = props.globals.i18nContext;
  return t('emails.directMessage.subject', {
    profileName: profileName(props.locals?.senderProfile as PublicProfile),
  });
};

const template: ReactEmailTemplate<ExpandedNotification> = {
  component: DirectMessageEmail as ReactEmailTemplate<ExpandedNotification>['component'],
  renderSubject,
};

export default template;
