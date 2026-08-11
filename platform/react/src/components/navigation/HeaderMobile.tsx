import { useState, type ReactNode } from 'react';
import { MessageSquareText, Menu } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
} from '@openpeepshq/react-ui';
import { getTheme } from '@openpeepshq/common';
import { useServerInfo } from '../server-data';
import {
  useCurrentProfile,
  useCurrentProfileSettings,
} from '../layout/IdentityContext';
import { useRouter } from '../../contexts/router';
import { useT } from '../../i18n';
import { Avatar } from '../profile';
import { SideBar } from './SideBar';
import { SidebarNavCloseContext } from './SidebarNavContext';

export interface HeaderMobileProps {
  /** Render slot to draw the avatar trigger (defaults to a generic icon). */
  avatar?: ReactNode;
  /** Same slots as desktop `SideBar` (mobile drawer). */
  sideBar?: {
    mainMenu?: () => ReactNode;
    profileMenu?: () => ReactNode;
  };
}

export function HeaderMobile({ avatar, sideBar }: HeaderMobileProps = {}) {
  const serverInfo = useServerInfo();
  const profileSettings = useCurrentProfileSettings();
  const profile = useCurrentProfile();
  const router = useRouter();
  const t = useT();
  const [open, setOpen] = useState(false);

  const logoSmall = getTheme(
    serverInfo.communityConfig,
    profileSettings,
  ).logoSmall;

  // Mirror Svelte HeaderMobile: the avatar is the drawer trigger for signed-in
  // users; guests fall back to a generic menu icon.
  const trigger =
    avatar ??
    (profile ? <Avatar profile={profile} size={2.5} borderless /> : <Menu />);

  return (
    <div className="bg-background sticky top-0 z-10 flex px-4 py-2 md:hidden">
      <div className="flex w-full items-center justify-between">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <button type="button" title={t('navigation.profile')}>
              {trigger}
            </button>
          </DialogTrigger>
          <DialogPortal>
            <DialogOverlay />
            <DialogContent
              showCloseButton={false}
              className="left-0 top-0 h-screen w-[380px] translate-x-0 translate-y-0 rounded-none border-r p-0"
            >
              <SidebarNavCloseContext.Provider value={() => setOpen(false)}>
                <SideBar
                  onClose={() => setOpen(false)}
                  mainMenu={sideBar?.mainMenu?.()}
                  profileMenu={sideBar?.profileMenu?.()}
                />
              </SidebarNavCloseContext.Provider>
            </DialogContent>
          </DialogPortal>
        </Dialog>

        <div>
          {logoSmall && (
            <a href="/">
              <img src={logoSmall} alt="logo" className="h-6 px-4" />
            </a>
          )}
        </div>

        <button
          type="button"
          title={t('navigation.messages')}
          onClick={() => router.navigate({ type: 'conversation' })}
        >
          <MessageSquareText />
        </button>
      </div>
    </div>
  );
}
