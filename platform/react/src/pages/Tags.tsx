import { useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@openpeepshq/react-ui';
import { normalizeHashtagTag } from '@openpeepshq/common/types';
import {
  useT,
  useOpenpeeps,
  useSetPageHeader,
  useCurrentProfile,
} from '../index';
import {
  Feed,
  useDefaultVisibility,
  useNewNotePlusButton,
} from '../components';
import { useFeedListParams } from '../hooks';

export const Tags = () => {
  const t = useT();
  const { hashtag = '' } = useParams<{ hashtag: string }>();
  const { openpeepsApi } = useOpenpeeps();
  const me = useCurrentProfile();
  const [toggling, setToggling] = useState(false);

  const visibility = useDefaultVisibility();

  useNewNotePlusButton({ visibility });

  // Hashtag hits can be replies; threaded would hide them.
  const query = openpeepsApi.usePostsByHashtag(
    hashtag,
    useFeedListParams({ format: 'linear' }),
  );

  const followHashtag = openpeepsApi.followHashtagAction({
    tag: hashtag,
  } as never);
  const unfollowHashtag = openpeepsApi.unfollowHashtagAction({
    tag: hashtag,
  } as never);
  const followHashtagRef = useRef(followHashtag);
  const unfollowHashtagRef = useRef(unfollowHashtag);
  followHashtagRef.current = followHashtag;
  unfollowHashtagRef.current = unfollowHashtag;

  const normalizedTag = normalizeHashtagTag(hashtag);
  const isFollowing = !!me?.followedHashtags?.some(
    (h) => h.tag === normalizedTag,
  );

  const headerActions = useMemo(() => {
    if (!me) return undefined;
    const toggleFollow = async () => {
      setToggling(true);
      try {
        if (isFollowing) {
          await unfollowHashtagRef.current();
        } else {
          await followHashtagRef.current();
        }
      } finally {
        setToggling(false);
      }
    };
    return (
      <Button
        compact
        variant={isFollowing ? 'outline' : 'default'}
        action={toggleFollow}
        disabled={toggling}
        loadingContent={t('tags.following', { defaultValue: 'Following…' })}
        title={
          isFollowing
            ? t('tags.unfollow', { defaultValue: 'Unfollow hashtag' })
            : t('tags.follow', { defaultValue: 'Follow hashtag' })
        }
      >
        {isFollowing
          ? t('tags.following', { defaultValue: 'Following' })
          : t('tags.follow', { defaultValue: 'Follow hashtag' })}
      </Button>
    );
  }, [isFollowing, me, t, toggling]);

  useSetPageHeader(
    t('tags.title', { defaultValue: '#{{hashtag}}', hashtag }),
    headerActions,
  );

  return <Feed query={query} formatSwitch={false} />;
};
