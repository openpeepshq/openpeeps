import type { EmailOptionsWithGlobals } from '@openpeepshq/common/types';

import type { ReactEmailTemplate } from '../../types';
import { AnnouncementEmail } from './Email';

const renderSubject = async (
  props: EmailOptionsWithGlobals,
): Promise<string> => {
  const { t } = props.globals.i18nContext;
  return t('emails.announcement.subject', {
    communityName: props.globals.communityConfig.info.name,
  });
};

const template: ReactEmailTemplate<never> = {
  component: AnnouncementEmail,
  renderSubject,
};

export default template;
