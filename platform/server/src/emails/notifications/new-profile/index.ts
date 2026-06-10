import type {
  EmailOptionsWithGlobals,
  ExpandedNotification,
} from '@openpeeps/common/types';

import type { ReactEmailTemplate } from '../../types';
import { NewProfileEmail } from './Email';

const renderSubject = async (
  props: EmailOptionsWithGlobals,
): Promise<string> => {
  const { t } = props.globals.i18nContext;
  return t('emails.newProfile.subject', {
    communityName: props.globals.communityConfig.info.name,
  });
};

const template: ReactEmailTemplate<ExpandedNotification> = {
  component: NewProfileEmail,
  renderSubject,
};

export default template;
