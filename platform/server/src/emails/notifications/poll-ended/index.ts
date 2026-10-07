import type {
  EmailOptionsWithGlobals,
  ExpandedNotification,
} from '@openpeepshq/common/types';

import type { ReactEmailTemplate } from '../../types';
import { PollEndedEmail } from './Email';

const renderSubject = async (
  props: EmailOptionsWithGlobals & { locals: ExpandedNotification },
): Promise<string> => {
  const { t } = props.globals.i18nContext;
  return t('emails.pollEnded.subject', {
    communityName: props.globals.communityConfig.info.name,
  });
};

const template: ReactEmailTemplate<ExpandedNotification> = {
  component: PollEndedEmail,
  renderSubject,
};

export default template;
