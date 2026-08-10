import type {
  EmailOptionsWithGlobals,
  ExpandedNotification,
  GroupData,
  PublicProfile,
} from '@openpeepshq/common/types';
import { groupName, profileName } from '@openpeepshq/common/lib';

import type { ReactEmailTemplate } from '../../types';
import { GroupMemberLeftEmail } from './Email';

const renderSubject = async (
  props: EmailOptionsWithGlobals,
): Promise<string> => {
  const { t } = props.globals.i18nContext;
  return t('emails.groupMemberLeft.subject', {
    profileName: profileName(props.locals?.senderProfile as PublicProfile),
    groupName: groupName(props.locals?.group as GroupData),
    communityName: props.globals.communityConfig.info.name,
  });
};

const template: ReactEmailTemplate<ExpandedNotification> = {
  component: GroupMemberLeftEmail,
  renderSubject,
};

export default template;
