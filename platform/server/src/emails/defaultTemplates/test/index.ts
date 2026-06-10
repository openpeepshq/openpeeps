import type { EmailOptionsWithGlobals } from '@openpeeps/common/types';

import type { ReactEmailTemplate } from '../../types';
import { Test } from './Test';

const renderSubject = async (
  props: EmailOptionsWithGlobals,
): Promise<string> =>
  `Test email from ${props.globals.communityConfig.info.name}!`;

const template: ReactEmailTemplate<undefined> = {
  component: Test,
  renderSubject,
};

export default template;
