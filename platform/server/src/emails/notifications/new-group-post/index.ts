import type {
  EmailOptionsWithGlobals,
  GroupData,
  PublicPost,
  PublicProfile,
} from '@openpeeps/common/types';
import { groupName, profileName } from '@openpeeps/common/lib';

import type { ReactEmailTemplate } from '../../types';
import { NewGroupPostEmail } from './Email';

interface Locals {
  senderProfile: PublicProfile;
  recipientProfile: PublicProfile;
  post: PublicPost;
  group: GroupData;
  data: { replyPost: PublicPost };
}

const renderSubject = async (
  props: EmailOptionsWithGlobals & { locals: Locals },
): Promise<string> => {
  const { t } = props.globals.i18nContext;
  return t('emails.newGroupPost.subject', {
    profileName: profileName(props.locals.senderProfile),
    groupName: groupName(props.locals.group),
    communityName: props.globals.communityConfig.info.name,
  });
};

const template: ReactEmailTemplate<Locals> = {
  component: NewGroupPostEmail,
  renderSubject,
};

export default template;
