<script lang="ts">
  import { MessageSquareText, InfoIcon, UsersRound } from 'lucide-svelte';

  import { getDrawerContext } from '../context';
  import MobileMenuButton from './MobileMenuButton.svelte';
  import ScreenShareSwitch from './ScreenShareSwitch.svelte';
  import HandSwitch from './HandSwitch.svelte';
  import RecordSwitch from './RecordSwitch.svelte';
  import { i18nContext } from '$lib/components/i18n';

  const { t } = i18nContext();
  const drawerContext = getDrawerContext();

  interface Props {
    closeMenu: () => void;
    openJamDetailsMenu: () => void;
  }

  const { closeMenu, openJamDetailsMenu }: Props = $props();
</script>

<div
  class="variant-filled-surface absolute bottom-20 left-2 right-2 grid grid-cols-3 rounded-md p-2"
>
  <MobileMenuButton
    icon={MessageSquareText}
    label={t('jams.mobileMenu.inJamMessage')}
    action={() => {
      closeMenu();
      drawerContext.set('chat');
    }}
  />
  <MobileMenuButton
    icon={InfoIcon}
    label={t('jams.mobileMenu.jamDetails')}
    action={() => {
      closeMenu();
      openJamDetailsMenu();
    }}
  />
  <ScreenShareSwitch {closeMenu} />
  <!-- raise hand -->
  <HandSwitch {closeMenu} />
  <MobileMenuButton
    icon={UsersRound}
    label={t('jams.mobileMenu.people')}
    action={() => {
      closeMenu();
      drawerContext.set('people');
    }}
  />
  <RecordSwitch {closeMenu} />
</div>
