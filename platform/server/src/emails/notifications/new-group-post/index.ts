import type { EmailOptionsWithGlobals, ExpandedNotification } from '@openpeepshq/common/types';
import { groupName, profileName } from '@openpeepshq/common/lib';

import type { ReactEmailTemplate } from '../../types';
import { NewGroupPostEmail } from './Email';

const renderSubject = async (
  props: EmailOptionsWithGlobals & { locals: ExpandedNotification },
): Promise<string> => {
  const { t } = props.globals.i18nContext;
  return t('emails.newGroupPost.subject', {
    profileName: profileName(props.locals.senderProfile ?? undefined),
    groupName: groupName(props.locals.group ?? undefined),
    communityName: props.globals.communityConfig.info.name,
  });
};

const template: ReactEmailTemplate<ExpandedNotification> = {
  component: NewGroupPostEmail,
  renderSubject,
};

export default template;
