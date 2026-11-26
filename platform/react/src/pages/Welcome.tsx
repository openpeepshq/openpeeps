import { useCallback, useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  CheckIcon,
  ChevronRight,
  MailIcon,
  PencilIcon,
  SquareUserRound,
  UserCheck,
  type LucideIcon,
} from 'lucide-react';
import {
  useT,
  useOpenpeeps,
  useNewPostModal,
  useDefaultVisibility,
  useHrefOf,
} from '../index';
import {
  useCurrentProfile,
  useCurrentAccount,
  useServerInfo,
  useToast,
  AccessDeniedLoader,
} from '../components';

import { Markdown } from '../lib/Markdown';
import { type NavTarget } from '../navigation/targets';

interface ChecklistItem {
  Icon: LucideIcon;
  label: string;
  key: string;
  completed: boolean;
  target?: NavTarget;
  action?: () => void;
}

export function Welcome() {
  const t = useT();
  const navigate = useNavigate();
  const hrefOf = useHrefOf();
  const serverInfo = useServerInfo();
  const me = useCurrentProfile();
  const account = useCurrentAccount();
  const { openpeepsApi } = useOpenpeeps();
  const { openNewPost } = useNewPostModal();
  const { success, error: toastError } = useToast();
  const visibility = useDefaultVisibility();
  const validateEmail = openpeepsApi.validationEmailAction();
  // Disabled for guests — the checklist below is the only consumer, so it must
  // stay behind the signed-in gate or the loader would spin forever (a
  // disabled query never leaves isPending).
  const postsQuery = openpeepsApi.usePostsByProfile(me?.id ?? '', { limit: 1 });
  const hasFirstPost = (postsQuery.data?.pages ?? []).flat().length > 0;
  const [emailStatus, setEmailStatus] = useState<'idle' | 'pending'>('idle');
  const signedIn = !!me;

  const verifyEmail = useCallback(async () => {
    setEmailStatus('pending');
    try {
      await validateEmail();
      success(
        t('welcome.validationEmailSent', {
          defaultValue: 'Validation email sent',
        }),
      );
    } catch {
      toastError(
        t('welcome.validationEmailFailed', {
          defaultValue: 'Failed to send validation email',
        }),
      );
    } finally {
      setEmailStatus('idle');
    }
  }, [validateEmail, success, toastError, t]);

  const items = useMemo<ChecklistItem[]>(
    () => [
      {
        Icon: MailIcon,
        label: t('welcome.verifyEmail', {
          defaultValue: 'Verify your email address',
        }),
        key: 'verify-email',
        completed: !!account?.emailValidated,
        action: () => {
          void verifyEmail();
        },
      },
      {
        Icon: SquareUserRound,
        label: t('welcome.addProfileDetails', {
          defaultValue: 'Add profile details',
        }),
        key: 'profile-details',
        completed: !!me?.avatar && !!me?.bio && !!me?.header,
        target: { type: 'settings', section: 'public-profile' },
      },
      {
        Icon: PencilIcon,
        label: t('welcome.firstPost', { defaultValue: 'Make first post' }),
        key: 'make-post',
        completed: hasFirstPost,
        action: () => openNewPost({ visibility }),
      },
      {
        Icon: UserCheck,
        label: t('welcome.connect', { defaultValue: 'Connect with others' }),
        key: 'connect-with-others',
        completed: (me?.following?.length ?? 0) > 0,
        target: { type: 'members' },
      },
    ],
    [me, account, hasFirstPost, t, visibility, openNewPost, verifyEmail],
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
    <div className="relative col-span-3 min-h-[90vh] rounded-md bg-left-bottom bg-no-repeat p-6 pt-4">
      <h1 className="mt-8 flex pb-4 text-5xl font-bold">
        {t('welcome.heading', {
          defaultValue: 'Welcome to {{name}}',
          name: communityName,
        })}
      </h1>

      <div className="text-left">
        <Markdown source={welcomePage} />
      </div>

      {/* Community status: shown to guests and members alike (the spec asks
          for the same info for everybody), so it is not gated on signedIn. */}
      <ul
        data-testid="welcome-community-status"
        className="mt-4 list-none space-y-1 text-left text-sm text-muted-foreground"
      >
        <li>
          {serverInfo.federation?.active
            ? t('welcome.federated', {
                defaultValue: 'Federated with other communities',
              })
            : t('welcome.notFederated', {
                defaultValue: 'Not federated',
              })}
        </li>
        <li>
          {serverInfo.publicContent
            ? t('welcome.public', {
                defaultValue: 'Public — visitors can read public posts',
              })
            : t('welcome.private', {
                defaultValue: 'Private — only members can read posts',
              })}
        </li>
      </ul>

      {signedIn && !account?.emailValidated ? (
        <div className="my-4">
          {t('auth.register.verificationReminder', {
            defaultValue:
              "We've sent you a verification email. Check your inbox and click the link to verify your address.",
          })}
        </div>
      ) : null}

      {!signedIn ? (
        <div className="my-4 text-left">
          <p>
            {t('welcome.guestSignIn', {
              defaultValue:
                'Sign in to complete your account setup and see the checklist.',
            })}
          </p>
          <RouterLink
            to={hrefOf({ type: 'auth', mode: 'login' })}
            className="op-anchor mt-2 inline-block text-sm"
          >
            {t('auth.register.signIn', { defaultValue: 'Sign In' })}
          </RouterLink>
        </div>
      ) : (
        <>
          <div className="my-4 text-3xl font-bold">
            {t('welcome.completeSetup', {
              defaultValue: 'Complete account setup',
            })}
          </div>

          <AccessDeniedLoader queries={[postsQuery]}>
            {items.map((item) => (
              <div
                key={item.key}
                data-testid={`welcome-checklist-${item.key}`}
                className="mb-2 flex w-full cursor-pointer flex-row items-center justify-between rounded-md px-1 py-2"
                onClick={() => {
                  if (item.action) item.action();
                  else if (item.target) navigate(hrefOf(item.target));
                }}
              >
                <div className="bg-surface flex items-center justify-center rounded-full p-4">
                  <item.Icon />
                </div>
                <div className="ml-4 flex-1 text-lg">
                  {item.label}
                  {item.key === 'verify-email' && emailStatus === 'pending' ? (
                    <span className="text-muted-foreground ml-2 text-sm">
                      {t('common.sending', { defaultValue: 'Sending…' })}
                    </span>
                  ) : null}
                </div>
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
          </AccessDeniedLoader>
        </>
      )}

      <h2 className="mt-8 flex justify-start pb-4 text-4xl font-bold">
        {t('welcome.usefulLinks', { defaultValue: 'Useful Links' })}
      </h2>
      <ul>
        {/* /feeds/local is 401 for guests on closed communities, so the
            community link only renders where guests can actually read it. */}
        {serverInfo.publicContent && (
          <li>
            <RouterLink
              className="op-anchor"
              to={hrefOf({ type: 'feed', feed: 'local' })}
            >
              {t('welcome.usefulLinkCommunity', {
                defaultValue: 'See community content',
              })}
            </RouterLink>
          </li>
        )}
        {/* /settings is a guest-visible page that only renders the signed-in
            profile controls, so the label is only accurate when signed in. */}
        {signedIn && (
          <li>
            <RouterLink
              className="op-anchor"
              to={hrefOf({ type: 'settings', section: 'public-profile' })}
            >
              {t('welcome.usefulLinkProfile', {
                defaultValue: 'Change your name, photo and bio',
              })}
            </RouterLink>
          </li>
        )}
        <li>
          <RouterLink className="op-anchor" to={hrefOf({ type: 'docs' })}>
            {t('welcome.usefulLinkDocs', {
              defaultValue: 'View documentation',
            })}
          </RouterLink>
        </li>
        <li>
          <RouterLink className="op-anchor" to={hrefOf({ type: 'members' })}>
            {t('welcome.usefulLinkMembers', {
              defaultValue: 'See all community members',
            })}
          </RouterLink>
        </li>
        {/* Policy links are community-configured URLs (possibly external), so
            they stay raw anchors opening in a new tab — a SPA RouterLink
            would same-tab-navigate external URLs and lose SPA state.
            Register.tsx renders the same values the same way. */}
        <li>
          <a
            href={privacyPolicyLink}
            target="_blank"
            rel="noopener noreferrer"
            className="op-anchor"
          >
            {t('welcome.usefulLinkPrivacy', {
              defaultValue: 'Privacy policy',
            })}
          </a>
        </li>
        {termsAndConditionsLink && (
          <li>
            <a
              href={termsAndConditionsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="op-anchor"
            >
              {t('welcome.usefulLinkTerms', {
                defaultValue: 'Terms and conditions',
              })}
            </a>
          </li>
        )}
        <li>
          <RouterLink
            className="op-anchor"
            to={hrefOf({ type: 'codeOfConduct' })}
          >
            {t('welcome.usefulLinkCodeOfConduct', {
              defaultValue: 'Code of conduct',
            })}
          </RouterLink>
        </li>
      </ul>
    </div>
  );
}
