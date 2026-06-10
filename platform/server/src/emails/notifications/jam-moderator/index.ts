import type {
  EmailOptionsWithGlobals,
  PublicPost,
  PublicProfile,
} from '@openpeeps/common/types';

import type { ReactEmailTemplate } from '../../types';
import { JamModeratorEmail } from './Email';

interface Locals {
  recipientProfile: PublicProfile;
  senderProfile: PublicProfile;
  post: PublicPost;
}

const renderSubject = async (
  props: EmailOptionsWithGlobals & { locals: Locals },
): Promise<string> => {
  const { t } = props.globals.i18nContext;
  return t('emails.jamModerator.subject', {
    jamName: props.locals.post.data.content,
  });
};

const template: ReactEmailTemplate<Locals> = {
  component: JamModeratorEmail,
  renderSubject,
};

export default template;
