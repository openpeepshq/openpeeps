import { useState } from 'react';
import { MessageSquareText, Menu } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
} from '@openpeeps/react-ui';
import { getTheme } from '@openpeeps/common';
import { useServerInfo } from '../server-data';
import { useCurrentProfileSettings } from '../layout/IdentityContext';
import { useRouter } from '../../contexts/router';
import { useT } from '../../i18n';
import { SideBar } from './SideBar';

export interface HeaderMobileProps {
  /** Render slot to draw the avatar trigger (defaults to a generic icon). */
  avatar?: React.ReactNode;
}

export function HeaderMobile({ avatar }: HeaderMobileProps = {}) {
  const serverInfo = useServerInfo();
  const profileSettings = useCurrentProfileSettings();
  const router = useRouter();
  const t = useT();
  const [open, setOpen] = useState(false);

  const logoSmall = getTheme(
    serverInfo.communityConfig,
    profileSettings,
  ).logoSmall;

  return (
    <div className="bg-background sticky top-0 z-10 flex px-4 py-2 md:hidden">
      <div className="flex w-full items-center justify-between">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <button type="button" title={t('navigation.profile')}>
              {avatar ?? <Menu />}
            </button>
          </DialogTrigger>
          <DialogPortal>
            <DialogOverlay />
            <DialogContent
              showCloseButton={false}
              className="left-0 top-0 h-screen w-[380px] translate-x-0 translate-y-0 rounded-none border-r p-0"
            >
              <SideBar onClose={() => setOpen(false)} />
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
          onClick={() => router.navigate('/conversations')}
        >
          <MessageSquareText />
        </button>
      </div>
    </div>
  );
}
