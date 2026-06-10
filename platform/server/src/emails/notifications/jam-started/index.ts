import type {
  EmailOptionsWithGlobals,
  PublicPost,
  PublicProfile,
} from '@openpeeps/common/types';
import { profileName } from '@openpeeps/common/lib';

import type { ReactEmailTemplate } from '../../types';
import { JamStartedEmail } from './Email';

interface Locals {
  recipientProfile: PublicProfile;
  senderProfile: PublicProfile;
  post: PublicPost;
}

const renderSubject = async (
  props: EmailOptionsWithGlobals & { locals: Locals },
): Promise<string> => {
  const { t } = props.globals.i18nContext;
  return t('emails.jamStarted.subject', {
    profileName: profileName(props.locals.senderProfile),
    jamName: props.locals.post.data.content,
  });
};

const template: ReactEmailTemplate<Locals> = {
  component: JamStartedEmail,
  renderSubject,
};

export default template;
