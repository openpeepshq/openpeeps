import type { Express } from 'express';
import { integrateFederation } from '@fedify/express';
import { hub } from '@openpeepshq/core/events';
import { federationIsActive } from '@openpeepshq/core/federation';
import { logger } from '@openpeepshq/core/log';
import type {
  PostWithMeta,
  Profile,
  ProfileWithMeta,
} from '@openpeepshq/common/types';
import {
  createOpenPeepsFederation,
  federateFollow,
  federateNoteDelete,
  federateNoteUpdate,
  federatePublicNote,
  federateUnfollow,
} from './fedify';

const log = logger('server:federation');

export const installFederation = async (app: Express) => {
  if (!(await federationIsActive())) {
    log.info('ActivityPub federation is inactive');
    return;
  }

  const { federation, origin } = await createOpenPeepsFederation();
  app.set('trust proxy', true);
  app.use(integrateFederation(federation, () => undefined));
  hub.on('postCreated', (post: PostWithMeta) => {
    void federatePublicNote(federation, origin, post).catch(
      (error: unknown) => {
        log.error('Failed to federate public note', error);
      },
    );
  });
  hub.on('postUpdated', (post: PostWithMeta) => {
    void federateNoteUpdate(federation, origin, post).catch(
      (error: unknown) => {
        log.error('Failed to federate note update', error);
      },
    );
  });
  hub.on('postDeleted', (post: PostWithMeta) => {
    void federateNoteDelete(federation, origin, post).catch(
      (error: unknown) => {
        log.error('Failed to federate note delete', error);
      },
    );
  });
  hub.on('followCreated', (follower: Profile, followed: Profile) => {
    void federateFollow(
      federation,
      origin,
      follower,
      followed as ProfileWithMeta,
    ).catch((error: unknown) => {
      log.error('Failed to federate follow activity', error);
    });
  });
  hub.on('followDeleted', (follower: Profile, followed: Profile) => {
    void federateUnfollow(
      federation,
      origin,
      follower,
      followed as ProfileWithMeta,
    ).catch((error: unknown) => {
      log.error('Failed to federate unfollow activity', error);
    });
  });

  // Federation attaches correctness-critical handlers (a dropped `postDeleted`
  // means a remote follower keeps a post we deleted). `hub.on` subscribes to
  // Redis asynchronously, so an `emit` fired before those subscriptions settle
  // is silently lost. Awaiting `hub.ready()` here (server startup, before
  // `app.listen`) closes that window: by the time writes are accepted, every
  // federation handler has a live subscription.
  await hub.ready();

  log.info(`ActivityPub federation mounted at ${origin}`);
};
