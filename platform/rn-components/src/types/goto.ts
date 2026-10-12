import type { GroupSection } from '@openpeepshq/common/lib';

/**
 * Ad-hoc params for `buildGoto` deep links and side-menu actions (string targets).
 */
export type GotoHandlerParams = {
  id?: string;
  handle?: string;
  tag?: string;
  jamId?: string;
  tab?: GroupSection;
};
