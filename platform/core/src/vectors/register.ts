import type {
  JamRecordingWithMeta,
  PostWithMeta,
  Profile,
} from '@openpeepshq/common/types';
import { aiConfig, refreshConfig } from '../config';
import { hub } from '../events';
import { logger } from '../log';
import { enqueueTranscribe } from '../transcription/jobs';
import { enqueueNlpCatchup, enqueueNlpIngest } from './ingest';
import { aiProbeReport, refreshAiProbe } from './probe';
import { ensureTopicClusterSchedule } from './topics';

const log = logger('app:vectors');

let listening = false;
let handlersReady = false;
let lastRag: 'off' | 'ok' = 'off';

const onPost = async (post: PostWithMeta | undefined) => {
  if (!post?.id) return;
  await enqueueNlpIngest('posts', post.id);
};

const onProfile = async (profile: Profile | undefined) => {
  if (!profile?.id || profile.type === 'guest') return;
  await enqueueNlpIngest('profiles', profile.id);
};

const registerHandlers = () => {
  if (handlersReady) return;
  handlersReady = true;
  hub.once('postCreated', (post) => {
    void onPost(post as PostWithMeta);
  });
  hub.once('postUpdated', (post) => {
    void onPost(post as PostWithMeta);
  });
  hub.once('profileCreated', (profile) => {
    void onProfile(profile as Profile);
  });
  hub.once('profileUpdated', (profile) => {
    void onProfile(profile as Profile);
  });
  // Remote actors never go through the local create/update paths, so the
  // federation upsert signals embeddable-content changes on its own event.
  hub.once('profileContentChanged', (profile) => {
    void onProfile(profile as Profile);
  });
  hub.once('jamRecordingCompleted', (recording) => {
    void (async () => {
      const rec = recording as JamRecordingWithMeta;
      if (!rec?.id) return;
      const settings = await aiConfig();
      if (
        settings.transcription_enabled &&
        aiProbeReport().transcription === 'ok'
      ) {
        try {
          await enqueueTranscribe(rec.id);
        } catch (error) {
          log.error(
            { err: error, recordingId: rec.id },
            'transcribe enqueue failed',
          );
        }
        return;
      }
      if (rec.post?.id) await enqueueNlpIngest('posts', rec.post.id);
    })();
  });
};

const catchUpIfEnabled = async () => {
  const rag = aiProbeReport().rag;
  const turnedOn = rag === 'ok' && lastRag === 'off';
  lastRag = rag;
  if (!turnedOn) return;
  await enqueueNlpCatchup();
};

/** Probe in every process. Ingest handlers run in the worker, which owns the once-queue. */
export const startAiDataPlane = async (role: 'api' | 'worker') => {
  if (!listening) {
    listening = true;
    hub.on('configUpdated', (namespace: string, name: string) => {
      if (namespace !== 'openpeeps' || name !== 'ai') return;
      refreshConfig(namespace, name);
      void refreshAiProbe().then(() => catchUpIfEnabled());
    });
  }
  if (role === 'worker') {
    registerHandlers();
    await ensureTopicClusterSchedule();
  }
  await refreshAiProbe();
  if (role === 'worker') await catchUpIfEnabled();
};
