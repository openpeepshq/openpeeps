import type { Server as HttpServer } from 'node:http';
import type { Express } from 'express';
import type {
  PostWithMeta,
  Profile,
  ProfileWithMeta,
  ReactionData,
} from '@openpeepshq/common/types';
import {
  atprotoIsActive,
  projectFollow,
  projectLike,
  projectProfile,
  projectPublicNote,
} from '@openpeepshq/core/atproto';
import { hub } from '@openpeepshq/core/events';
import { logger } from '@openpeepshq/core/log';
import { mountWellKnown } from './wellKnown';
import { atprotoXrpcRouter } from './xrpc';
import { attachSubscribeRepos } from './subscribe';

const log = logger('server:atproto');

export const installAtproto = async (
  app: Express,
): Promise<((server: HttpServer) => void) | undefined> => {
  if (!(await atprotoIsActive())) {
    log.info('AT Protocol is inactive');
    return undefined;
  }

  mountWellKnown(app);
  const xrpc = atprotoXrpcRouter();
  app.use('/xrpc', xrpc);

  hub.on('profileCreated', (profile: Profile) => {
    void projectProfile(profile).catch((error: unknown) => {
      log.error('Failed to project profile', error);
    });
  });
  hub.on('postCreated', (post: PostWithMeta) => {
    void projectPublicNote(post).catch((error: unknown) => {
      log.error('Failed to project public note', error);
    });
  });
  hub.on('followCreated', (follower: Profile, followed: Profile) => {
    void projectFollow(follower, followed as ProfileWithMeta).catch(
      (error: unknown) => {
        log.error('Failed to project follow', error);
      },
    );
  });
  hub.on(
    'reactionCreated',
    (profile: Profile, post: PostWithMeta, data: ReactionData) => {
      void projectLike(profile, post, data.reaction).catch((error: unknown) => {
        log.error('Failed to project like', error);
      });
    },
  );
  hub.on('profileSettingsUpdated', (profileId: string) => {
    void import('@openpeepshq/core/profiles')
      .then(({ findProfile }) => findProfile(profileId))
      .then((profile) => (profile ? projectProfile(profile) : null))
      .catch((error: unknown) => {
        log.error('Failed to refresh AT profile', error);
      });
  });

  // Deletion / retreat listeners — ensure projected records are tombstoned
  hub.on('postDeleted', (post: PostWithMeta) => {
    void import('@openpeepshq/core/atproto').then(({ deleteProjectedPost }) => {
      deleteProjectedPost(post)
        .then(() => log.info({ postId: post.id }, 'post projected delete'))
        .catch((error: unknown) => {
          log.error('Failed to delete projected post', error);
        });
    });
  });
  hub.on('reactionDeleted', (profile: Profile, post: PostWithMeta) => {
    void import('@openpeepshq/core/atproto').then(({ deleteProjectedLike }) => {
      deleteProjectedLike(profile, post)
        .then((rkey) => {
          if (rkey)
            log.info({ postId: post.id, rkey }, 'like projected delete');
        })
        .catch((error: unknown) => {
          log.error('Failed to delete projected like', error);
        });
    });
  });
  hub.on('followDeleted', (follower: Profile, followed: Profile) => {
    void import('@openpeepshq/core/atproto').then(
      ({ deleteProjectedFollow }) => {
        deleteProjectedFollow(follower, followed)
          .then((rkey) => {
            if (rkey)
              log.info(
                { followedId: followed.id, rkey },
                'follow projected delete',
              );
          })
          .catch((error: unknown) => {
            log.error('Failed to delete projected follow', error);
          });
      },
    );
  });
  hub.on('postUpdated', (post: PostWithMeta) => {
    // Public notes re-project (upsert) so edited content reaches at_records,
    // the CAR snapshot and future subscribeRepos frames; non-public notes
    // retract the projected record (S1, review round 4).
    if (post.visibility === 'public') {
      void projectPublicNote(post).catch((error: unknown) => {
        log.error('Failed to re-project public note', error);
      });
      return;
    }
    void import('@openpeepshq/core/atproto').then(({ deleteProjectedPost }) => {
      deleteProjectedPost(post)
        .then(() => log.info({ postId: post.id }, 'post projected retract'))
        .catch((error: unknown) => {
          log.error('Failed to retract projected post', error);
        });
    });
  });

  log.info('AT Protocol mounted at /xrpc');
  return attachSubscribeRepos;
};

export { attachSubscribeRepos };
