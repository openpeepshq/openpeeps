import { Bell, Home, Newspaper, PlusSquare, Users } from 'lucide-react';
import { TooltipProvider } from '@openpeepshq/react-ui';
import { MobileMenuItem } from './MobileMenuItem';
import { useHrefOf } from '../../contexts/router';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useT } from '../../i18n';

export interface FooterMobileProps {
  /** Wired to the `+` mobile button. Consumers control the modal open. */
  onNewPost?: () => void | Promise<void>;
}

export function FooterMobile({ onNewPost }: FooterMobileProps = {}) {
  const t = useT();
  const hrefOf = useHrefOf();
  const { openpeepsApi } = useOpenpeeps();
  const notificationStats = openpeepsApi.useCurrentProfileNotificationStats();

  return (
    <TooltipProvider delayDuration={300}>
      <nav
        aria-label={t('navigation.primaryMobile', {
          defaultValue: 'Primary',
        })}
        className="bg-surface flex h-20 w-full items-center justify-evenly md:hidden"
      >
        <MobileMenuItem
          title={t('navigation.home')}
          tooltip={t('navigation.tooltips.community')}
          icon={Home}
          action={hrefOf({ type: 'feed', feed: 'local' })}
        />
        <MobileMenuItem
          title={t('navigation.myFeed')}
          tooltip={t('navigation.tooltips.myFeed')}
          icon={Newspaper}
          action={hrefOf({ type: 'feed', feed: 'my' })}
        />
        <MobileMenuItem
          title={t('navigation.newPost')}
          tooltip={t('navigation.tooltips.newPost')}
          icon={PlusSquare}
          action={onNewPost ?? hrefOf({ type: 'postNew' })}
        />
        <MobileMenuItem
          title={t('navigation.groups')}
          tooltip={t('navigation.tooltips.groups')}
          icon={Users}
          action={hrefOf({ type: 'groups' })}
        />
        <MobileMenuItem
          title={t('navigation.openNotifications')}
          tooltip={t('navigation.tooltips.notifications')}
          icon={Bell}
          action={hrefOf({ type: 'notifications' })}
          badge={notificationStats.data?.unseen}
        />
      </nav>
    </TooltipProvider>
  );
}
