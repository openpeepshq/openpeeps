import { useContext } from 'react';
import { isIanaTimeZone } from '@openpeepshq/common/lib';
import { useIdentity } from '../../components/layout/IdentityContext';
import { ServerDataContext } from '../../components/server-data';
import { useStaticRender } from '../../components/markdown/staticRender';

/**
 * Zone an event renders in for the current viewer. Tier order (the plan's
 * documented chain): explicit profile settings, then the community
 * default, then the event's own zone; `undefined` when none resolves
 * (callers pass the zone to formatters such as `fmtRange`/`formatEventDate`,
 * which omit the `timeZone` option and fall through to the device zone).
 *
 * Both provider-backed tiers read their contexts directly, so they degrade
 * to `undefined` when the provider is absent instead of throwing. Static
 * renders (notification emails) deliberately mount none of the in-app
 * providers — there the tiers simply do not apply and the hook falls back
 * to the event zone, while the caller supplies the recipient's zone
 * explicitly (see `formatEventWhen` in `FeedEvent`).
 *
 * The viewer-over-event precedence is the same contract `eventDisplayTimeZone`
 * in `@openpeepshq/common/lib` states; keep the two in sync if it changes.
 */
export const useEventDisplayTimeZone = (eventTimeZone?: string | null) => {
  const { enabled: staticRender } = useStaticRender();
  const settings = staticRender ? undefined : useIdentity().profileSettings;
  const serverInfo = staticRender
    ? undefined
    : useContext(ServerDataContext)?.serverInfo;
  const communityDefault = isIanaTimeZone(
    serverInfo?.communityConfig?.settings?.defaultTimeZone,
  )
    ? serverInfo.communityConfig.settings.defaultTimeZone
    : undefined;
  return (
    (isIanaTimeZone(settings?.timeZone) ? settings.timeZone : undefined) ??
    communityDefault ??
    // No viewer zone here — only the event zone, if it is valid IANA,
    // else `undefined` so formatters fall through to the device zone.
    (isIanaTimeZone(eventTimeZone) ? eventTimeZone : undefined)
  );
};
