import type {
  EmailOptionsWithGlobals,
  PublicPost,
  PublicProfile,
} from '@openpeeps/common/types';
import { profileName } from '@openpeeps/common/lib';

import type { ReactEmailTemplate } from '../../types';
import { RepostEmail } from './Email';

interface Locals {
  senderProfile: PublicProfile;
  recipientProfile: PublicProfile;
  post: PublicPost;
}

const renderSubject = async (
  props: EmailOptionsWithGlobals & { locals: Locals },
): Promise<string> => {
  const { t } = props.globals.i18nContext;
  return t('emails.repost.subject', {
    profileName: profileName(props.locals.senderProfile),
  });
};

const template: ReactEmailTemplate<Locals> = {
  component: RepostEmail,
  renderSubject,
};

export default template;
