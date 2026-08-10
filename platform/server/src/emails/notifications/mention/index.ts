import type { EmailOptionsWithGlobals, ExpandedNotification } from '@openpeepshq/common/types';
import { profileName } from '@openpeepshq/common/lib';

import type { ReactEmailTemplate } from '../../types';
import { MentionEmail } from './Email';

const renderSubject = async (
  props: EmailOptionsWithGlobals & { locals: ExpandedNotification },
): Promise<string> => {
  const { t } = props.globals.i18nContext;
  return t('emails.mention.subject', {
    profileName: profileName(props.locals.senderProfile ?? undefined),
    communityName: props.globals.communityConfig.info.name,
  });
};

const template: ReactEmailTemplate<ExpandedNotification> = {
  component: MentionEmail,
  renderSubject,
};

export default template;
