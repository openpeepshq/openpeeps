import type { EmailOptionsWithGlobals } from '@openpeeps/common/types';

import type { ReactEmailTemplate } from '../../types';
import { Welcome } from './Welcome';

const renderSubject = async (
  props: EmailOptionsWithGlobals,
): Promise<string> =>
  `Welcome to ${props.globals.communityConfig.info.name}!`;

const template: ReactEmailTemplate<undefined> = {
  component: Welcome,
  renderSubject,
};

export default template;
