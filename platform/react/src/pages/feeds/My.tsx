import { useT, useOpenpeeps, useSetPageHeader } from '../../index';
import {
  Feed,
  useDefaultVisibility,
  useNewNotePlusButton,
} from '../../components';

export function FeedsMy() {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const visibility = useDefaultVisibility();

  useNewNotePlusButton({ visibility });

  const query = openpeepsApi.useMyFeed();

  useSetPageHeader(t('navigation.myFeed', { defaultValue: 'My feed' }));

  return <Feed query={query} hideReplies />;
}
