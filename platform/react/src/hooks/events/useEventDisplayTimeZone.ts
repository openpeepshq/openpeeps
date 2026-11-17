import { eventDisplayTimeZone, isIanaTimeZone } from '@openpeepshq/common/lib';
import { useCurrentProfileSettings } from '../../components/layout/IdentityContext';
import { useServerInfo } from '../../components/server-data';

/**
 * Zone an event renders in for the current viewer. Tier order (the plan's
 * documented chain): explicit profile settings, then the community
 * default, then the event's own zone; `undefined` when none resolves
 * (formatters fall through to the device zone).
 */
export const useEventDisplayTimeZone = (eventTimeZone?: string | null) => {
  const settings = useCurrentProfileSettings();
  const serverInfo = useServerInfo();
  const communityDefault = isIanaTimeZone(
    serverInfo?.communityConfig?.settings?.defaultTimeZone,
  )
    ? serverInfo.communityConfig.settings.defaultTimeZone
    : undefined;
  return (
    (isIanaTimeZone(settings?.timeZone) ? settings.timeZone : undefined) ??
    communityDefault ??
    eventDisplayTimeZone(eventTimeZone, undefined)
  );
};
