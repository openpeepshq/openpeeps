import type {
  EmailOptionsWithGlobals,
  Event,
  PublicPost,
  PublicProfile,
} from '@openpeepshq/common/types';

import type { ReactEmailTemplate } from '../../types';
import { CoOrganizerRemovedEmail } from './Email';

interface Locals {
  recipientProfile: PublicProfile;
  senderProfile: PublicProfile;
  post: PublicPost;
}

const renderSubject = async (
  props: EmailOptionsWithGlobals & { locals: Locals },
): Promise<string> => {
  const { t } = props.globals.i18nContext;
  const event = props.locals.post.data as Event;
  return t('emails.coOrganizerRemoved.subject', {
    eventName: event.name?.trim() || event.content || '',
  });
};

const template: ReactEmailTemplate<Locals> = {
  component: CoOrganizerRemovedEmail,
  renderSubject,
};

export default template;
