import { Bell, Home, Newspaper, PlusSquare, Users } from 'lucide-react';
import { MobileMenuItem } from './MobileMenuItem';
import { useHrefOf } from '../../contexts/router';
import { useT } from '../../i18n';

export interface FooterMobileProps {
  /** Wired to the `+` mobile button. Consumers control the modal open. */
  onNewPost?: () => void | Promise<void>;
}

export function FooterMobile({ onNewPost }: FooterMobileProps = {}) {
  const t = useT();
  const hrefOf = useHrefOf();
  return (
    <nav
      aria-label={t('navigation.primaryMobile', {
        defaultValue: 'Primary',
      })}
      className="bg-surface flex h-20 w-full items-center justify-evenly md:hidden"
    >
      <MobileMenuItem
        title={t('navigation.home')}
        icon={Home}
        action={hrefOf({ type: 'feed', feed: 'local' })}
      />
      <MobileMenuItem
        title={t('navigation.myFeed')}
        icon={Newspaper}
        action={hrefOf({ type: 'feed', feed: 'my' })}
      />
      <MobileMenuItem
        title={t('navigation.newPost')}
        icon={PlusSquare}
        action={onNewPost ?? hrefOf({ type: 'postNew' })}
      />
      <MobileMenuItem
        title={t('navigation.groups')}
        icon={Users}
        action={hrefOf({ type: 'groups' })}
      />
      <MobileMenuItem
        title={t('navigation.notifications')}
        icon={Bell}
        action={hrefOf({ type: 'notifications' })}
      />
    </nav>
  );
}
