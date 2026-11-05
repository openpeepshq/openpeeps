import type { Server as HttpServer } from 'node:http';
import type { Express } from 'express';
import express from 'express';
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
import { mountOauth } from './oauth';
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
  app.use('/oauth', express.json());
  app.use('/oauth', express.urlencoded({ extended: true }));
  mountOauth(app);

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

  log.info('AT Protocol mounted at /xrpc');
  return attachSubscribeRepos;
};

export { attachSubscribeRepos };
