import type {
  EmailOptionsWithGlobals,
  ExpandedNotification,
  GroupData,
  PublicProfile,
} from '@openpeepshq/common/types';
import { groupName, profileName } from '@openpeepshq/common/lib';

import type { ReactEmailTemplate } from '../../types';
import { GroupMemberJoinedEmail } from './Email';

const renderSubject = async (
  props: EmailOptionsWithGlobals,
): Promise<string> => {
  const { t } = props.globals.i18nContext;
  return t('emails.groupMemberJoined.subject', {
    profileName: profileName(props.locals?.senderProfile as PublicProfile),
    communityName: props.globals.communityConfig.info.name,
    groupName: groupName(props.locals?.group as GroupData),
  });
};

const template: ReactEmailTemplate<ExpandedNotification> = {
  component: GroupMemberJoinedEmail,
  renderSubject,
};

export default template;
