import type {
  EmailOptionsWithGlobals,
  PublicPost,
  PublicProfile,
} from '@openpeepshq/common/types';
import { profileName } from '@openpeepshq/common/lib';

import type { ReactEmailTemplate } from '../../types';
import { ReplyEmail } from './Email';

interface Locals {
  senderProfile: PublicProfile;
  recipientProfile: PublicProfile;
  post: PublicPost;
  data: { replyPost: PublicPost };
}

const renderSubject = async (
  props: EmailOptionsWithGlobals & { locals: Locals },
): Promise<string> => {
  const { t } = props.globals.i18nContext;
  return t('emails.reply.subject', {
    profileName: profileName(props.locals.senderProfile),
  });
};

const template: ReactEmailTemplate<Locals> = {
  component: ReplyEmail,
  renderSubject,
};

export default template;
