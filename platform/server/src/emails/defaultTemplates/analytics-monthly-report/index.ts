import type { EmailOptionsWithGlobals } from '@openpeeps/common/types';

import type { ReactEmailTemplate } from '../../types';
import { AnalyticsMonthlyReport } from './AnalyticsMonthlyReport';

type Locals = {
  periodFrom: string;
  periodTo: string;
  reportText: string;
};

const renderSubject = async (
  props: EmailOptionsWithGlobals & { locals: Locals },
): Promise<string> =>
  `${props.globals.communityConfig.info.name} — monthly analytics (${props.locals.periodFrom}–${props.locals.periodTo})`;

const template: ReactEmailTemplate<Locals> = {
  component: AnalyticsMonthlyReport,
  renderSubject,
};

export default template;
