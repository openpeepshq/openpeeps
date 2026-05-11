import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckIcon,
  ChevronRight,
  MailIcon,
  PencilIcon,
  SquareUserRound,
  UserCheck,
  type LucideIcon,
} from 'lucide-react';
import { useT } from '@openpeeps/react';
import { useCurrentProfile, useServerInfo } from '@openpeeps/react/components';

import { Markdown } from '../lib/Markdown';

interface ChecklistItem {
  Icon: LucideIcon;
  label: string;
  key: string;
  completed: boolean;
  route?: string;
  action?: () => void;
}

export function Welcome() {
  const t = useT();
  const navigate = useNavigate();
  const serverInfo = useServerInfo();
  const me = useCurrentProfile();

  const items = useMemo<ChecklistItem[]>(
    () => [
      {
        Icon: MailIcon,
        label: t('welcome.verifyEmail', {
          defaultValue: 'Verify your email address',
        }),
        key: 'verify-email',
        completed: false,
        // TODO: wire `client.accounts.validateEmail` mutation when ported to
        // @openpeeps/react. Until then this is a no-op.
        action: () => undefined,
      },
      {
        Icon: SquareUserRound,
        label: t('welcome.addProfileDetails', {
          defaultValue: 'Add profile details',
        }),
        key: 'profile-details',
        completed: !!me?.avatar && !!me?.bio && !!me?.header,
        route: '/settings/public-profile',
      },
      {
        Icon: PencilIcon,
        label: t('welcome.firstPost', { defaultValue: 'Make first post' }),
        key: 'make-post',
        completed: false, // TODO: derive from `usePostsByProfile(me.id)` when ported
        action: () => undefined, // TODO: open NewPostModal
      },
      {
        Icon: UserCheck,
        label: t('welcome.connect', { defaultValue: 'Connect with others' }),
        key: 'connect-with-others',
        completed: (me?.following?.length ?? 0) > 0,
        route: '/members',
      },
    ],
    [me, t],
  );

  const communityName =
    serverInfo.communityConfig?.info?.name ?? 'this community';
  const privacyPolicyLink =
    serverInfo.communityConfig?.info?.privacyPolicy ?? '/docs/privacy';
  const termsAndConditionsLink =
    serverInfo.communityConfig?.info?.termsAndConditions;
  const welcomePage =
    serverInfo.communityConfig?.content?.welcomePage ??
    'Welcome to this community, hosted on AllPeep.';

  return (
    <div className="col-span-3 relative min-h-[90vh] rounded-md bg-no-repeat bg-left-bottom p-6 pt-4">
      <h1 className="mt-8 flex pb-4 text-5xl font-bold">
        {t('welcome.heading', {
          defaultValue: `Welcome to ${communityName}`,
          name: communityName,
        })}
      </h1>

      <div className="text-left">
        <Markdown source={welcomePage} />
      </div>

      <div className="my-4 text-3xl font-bold">
        {t('welcome.completeSetup', { defaultValue: 'Complete account setup' })}
      </div>

      {items.map((item) => (
        <div
          key={item.key}
          className="mb-2 flex w-full cursor-pointer flex-row items-center justify-between rounded-md px-1 py-2"
          onClick={() => {
            if (item.action) item.action();
            else if (item.route) navigate(item.route);
          }}
        >
          <div className="bg-surface-100 flex items-center justify-center rounded-full p-4">
            <item.Icon />
          </div>
          <div className="ml-4 flex-1 text-lg">{item.label}</div>
          {item.completed ? (
            <div className="bg-secondary flex items-center justify-center rounded-full p-2">
              <CheckIcon className="text-background" />
            </div>
          ) : (
            <div className="flex items-center justify-center p-2">
              <ChevronRight className="text-foreground" />
            </div>
          )}
        </div>
      ))}

      <h2 className="mt-8 flex justify-start pb-4 text-4xl font-bold">
        {t('welcome.usefulLinks', { defaultValue: 'Useful Links' })}
      </h2>
      <ul>
        <li>
          <a className="anchor" href="/feeds/local">
            See community content
          </a>
        </li>
        <li>
          <a className="anchor" href="/settings">
            Change your name, photo and bio
          </a>
        </li>
        <li>
          <a className="anchor" href="/docs">
            View documentation
          </a>
        </li>
        <li>
          <a className="anchor" href="/members">
            See all community members
          </a>
        </li>
        <li>
          <a className="anchor" href={privacyPolicyLink}>
            Privacy policy
          </a>
        </li>
        {termsAndConditionsLink && (
          <li>
            <a className="anchor" href={termsAndConditionsLink}>
              Terms and conditions
            </a>
          </li>
        )}
        <li>
          <a className="anchor" href="/code-of-conduct">
            Code of conduct
          </a>
        </li>
      </ul>
    </div>
  );
}
