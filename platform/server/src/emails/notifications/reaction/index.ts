import type {
  EmailOptionsWithGlobals,
  PublicPost,
  PublicProfile,
} from '@openpeepshq/common/types';
import { profileName } from '@openpeepshq/common/lib';

import type { ReactEmailTemplate } from '../../types';
import { ReactionEmail } from './Email';

interface Locals {
  senderProfile: PublicProfile;
  recipientProfile: PublicProfile;
  post: PublicPost;
}

const renderSubject = async (
  props: EmailOptionsWithGlobals & { locals: Locals },
): Promise<string> => {
  const { t } = props.globals.i18nContext;
  return t('emails.reaction.subject', {
    profileName: profileName(props.locals.senderProfile),
  });
};

const template: ReactEmailTemplate<Locals> = {
  component: ReactionEmail,
  renderSubject,
};

export default template;
