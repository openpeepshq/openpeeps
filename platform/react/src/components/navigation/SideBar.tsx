import { X } from 'lucide-react';
import { Button, Link } from '@openpeepshq/react-ui';
import { getTheme } from '@openpeepshq/common';
import { useServerInfo } from '../server-data';
import {
  useCurrentProfile,
  useCurrentProfileSettings,
} from '../layout/IdentityContext';
import { useHrefOf } from '../../contexts/router';
import { useT } from '../../i18n';

export interface SideBarProps {
  onClose?: () => void;
  /** Slot for the consumer-supplied main menu (was `<MainMenu />` in Svelte). */
  mainMenu?: React.ReactNode;
  /** Slot for the consumer-supplied profile menu (was `<ProfileMenu />`). */
  profileMenu?: React.ReactNode;
}

/**
 * Translation of @openpeepshq/svelte/components/navigation/SideBar.svelte.
 *
 * The Svelte version reached into a sprawling `<MainMenu />` / `<ProfileMenu />`
 * sub-tree (which referenced 30+ feature components). To keep the React port
 * a focused, framework-agnostic shell we expose those as slots, so consumers
 * compose them however their app structures menus.
 */
export function SideBar({ onClose, mainMenu, profileMenu }: SideBarProps = {}) {
  const serverInfo = useServerInfo();
  const profileSettings = useCurrentProfileSettings();
  const profile = useCurrentProfile();
  const t = useT();
  const hrefOf = useHrefOf();

  const logoSmall = getTheme(
    serverInfo.communityConfig,
    profileSettings,
  ).logoSmall;
  const { name, tagLine } = serverInfo.communityConfig?.info ?? {};
  const homeHref = hrefOf({ type: 'home' });
  const registerHref = hrefOf({ type: 'auth', mode: 'register' });
  const loginHref = hrefOf({ type: 'auth', mode: 'login' });

  return (
    <div className="bg-background text-foreground relative h-screen w-full pt-3 md:h-full">
      <div className="h-[90%] overflow-y-auto">
        <div className="flex w-full items-center justify-between px-4 md:items-start">
          <a href={homeHref}>
            {logoSmall && (
              <img src={logoSmall} alt="logo" className="h-10 object-contain" />
            )}
          </a>
          {onClose && (
            <button
              type="button"
              title={t('common.close')}
              className="flex md:hidden"
              onClick={onClose}
            >
              <X />
            </button>
          )}
        </div>

        {profile?.type === 'local' ? (
          <>
            {profileMenu}
            {mainMenu}
          </>
        ) : (
          <div className="mt-4 px-4">
            <div className="flex h-full flex-col items-center justify-center space-y-4">
              {name && (
                <p className="text-center text-lg font-semibold">
                  {t('navigation.welcome', { name })}
                </p>
              )}
              {tagLine && <p className="px-2 text-center text-sm">{tagLine}</p>}
              <Button
                title={t('navigation.joinCommunity')}
                variant="default"
                action={registerHref}
              >
                {t('navigation.joinCommunity')}
              </Button>
              <span className="text-sm">
                {t('navigation.haveAccount')}{' '}
                <Link action={loginHref}>{t('navigation.logIn')}</Link>
              </span>
            </div>
          </div>
        )}
      </div>
      <footer className="bg-background absolute bottom-3">
        <p className="ml-4 text-center">{t('navigation.poweredBy')}</p>
      </footer>
    </div>
  );
}
