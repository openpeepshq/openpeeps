import { Bell, Home, Newspaper, PlusSquare, Users } from 'lucide-react';
import { MobileMenuItem } from './MobileMenuItem';
import { useT } from '../../i18n';

export interface FooterMobileProps {
  /** Wired to the `+` mobile button. Consumers control the modal open. */
  onNewPost?: () => void | Promise<void>;
}

export function FooterMobile({ onNewPost }: FooterMobileProps = {}) {
  const t = useT();
  return (
    <div className="bg-card flex h-20 w-full items-center justify-evenly md:hidden">
      <MobileMenuItem
        title={t('navigation.home')}
        icon={Home}
        action="/feeds/local"
      />
      <MobileMenuItem
        title={t('navigation.myFeed')}
        icon={Newspaper}
        action="/feeds/my"
      />
      <MobileMenuItem
        title={t('navigation.newPost')}
        icon={PlusSquare}
        action={onNewPost ?? '/posts/new'}
      />
      <MobileMenuItem
        title={t('navigation.groups')}
        icon={Users}
        action="/groups"
      />
      <MobileMenuItem
        title={t('navigation.notifications')}
        icon={Bell}
        action="/notifications"
      />
    </div>
  );
}
