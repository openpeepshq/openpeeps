import type { Express } from 'express';
import { integrateFederation } from '@fedify/express';
import { hub } from '@openpeepshq/core/events';
import { federationIsActive } from '@openpeepshq/core/federation';
import { logger } from '@openpeepshq/core/log';
import type { PostWithMeta } from '@openpeepshq/common/types';
import { createOpenPeepsFederation, federatePublicNote } from './fedify';

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
  log.info(`ActivityPub federation mounted at ${origin}`);
};
