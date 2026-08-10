import type {
  EmailOptionsWithGlobals,
  ExpandedNotification,
  GroupData,
} from '@openpeepshq/common/types';
import { groupName } from '@openpeepshq/common/lib';

import type { ReactEmailTemplate } from '../../types';
import { GroupAddedEmail } from './Email';

const renderSubject = async (
  props: EmailOptionsWithGlobals,
): Promise<string> => {
  const { t } = props.globals.i18nContext;
  return t('emails.groupAdded.subject', {
    communityName: props.globals.communityConfig.info.name,
    groupName: groupName(props.locals?.group as GroupData),
  });
};

const template: ReactEmailTemplate<ExpandedNotification> = {
  component: GroupAddedEmail,
  renderSubject,
};

export default template;
