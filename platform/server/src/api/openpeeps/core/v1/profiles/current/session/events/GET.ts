import { endpoint, z } from '#lib/endpoint';
import {
  sessionEventSchema,
  sessionPlatformSchema,
  type SessionEvent,
} from '@openpeepshq/common/types';
import { ensureLocalProfile } from '#lib/auth';
import { produceStream } from '#lib/sse';
import {
  registerSessionPresence,
  refreshSessionPresence,
  subscribeToSessionEvents,
  unregisterSessionPresence,
} from '@openpeepshq/core/session';

export const Query = z.object({
  platform: sessionPlatformSchema.default('web'),
  connectionId: z.string().min(1),
});

export const Stream = sessionEventSchema;
export const Output = z.instanceof(ReadableStream);

export const apiEndpoint = endpoint({ Query, Stream, Output }).handle(
  async ({ platform, connectionId }, event) => {
    const profile = await ensureLocalProfile(event);

    return produceStream<SessionEvent>({
      start: async ({ emit }) => {
        await registerSessionPresence({
          profileId: profile.id,
          connectionId,
          platform,
        });

        const unsubscribe = await subscribeToSessionEvents(profile.id, emit);

        const refresh = setInterval(() => {
          void refreshSessionPresence(profile.id, connectionId);
        }, 30_000);

        return async () => {
          clearInterval(refresh);
          await unsubscribe();
          await unregisterSessionPresence(profile.id, connectionId);
        };
      },
    });
  },
);
