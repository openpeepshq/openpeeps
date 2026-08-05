import type {
  EmailOptionsWithGlobals,
  Event,
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

const jamName = (post: PublicPost): string | undefined => {
  if (post.data?.type !== 'event') return undefined;
  const event = post.data as Event;
  return event.name || event.content;
};

const renderSubject = async (
  props: EmailOptionsWithGlobals & { locals: Locals },
): Promise<string> => {
  const { t } = props.globals.i18nContext;
  return t('emails.jamStarted.subject', {
    profileName: profileName(props.locals.senderProfile),
    jamName: jamName(props.locals.post),
  });
};

const template: ReactEmailTemplate<Locals> = {
  component: JamStartedEmail,
  renderSubject,
};

export default template;
