import { parseOccurrenceQuery } from '@openpeepshq/common/lib';
import { endpoint, z } from '#lib/endpoint';
import { config } from '@openpeepshq/core/config';
import { notFound, forbidden, rethrowIfOpenpeepsError } from '#lib/errors';
import { canModerateJam, jamFromEvent } from '@openpeepshq/common/lib';
import {
  createJamToken,
  findJamEvent,
  createJamEgressToken,
  isAdmittedToJam,
} from '@openpeepshq/core/jams';
import {
  ensurePostCapabilities,
  ensureProfileOrGuest,
  serviceScopeMatches,
} from '#lib/auth';
import { jamTokenResponseSchema } from '@openpeepshq/common/types';

export const Param = z.object({
  eventId: z.string(),
});

export const Query = z.object({
  occurrence: z.string().optional(),
});

export const Output = jamTokenResponseSchema;

export const Error = {
  404: notFound(),
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Param, Query, Output, Error }).handle(
  async (param, event) => {
    const { jams } = await config();
    const recurrenceId = parseOccurrenceQuery(param.occurrence);

    const jamEvent = await findJamEvent(param.eventId);
    if (!jamEvent) {
      throw notFound(`Post with id ${param.eventId}`);
    }

    if (
      serviceScopeMatches({
        authorization: event.context.authorization,
        scopeLevel: undefined,
        resource: { type: 'jams', id: param.eventId },
      })
    ) {
      return {
        success: true,
        token: await createJamEgressToken(jamEvent, recurrenceId).catch(
          rethrowIfOpenpeepsError,
        ),
        livekitUrl: jams.livekit.url,
      };
    }

    await ensurePostCapabilities(event, jamEvent, ['core-posts-read']);

    const jam = jamFromEvent(jamEvent);

    if (!jam) {
      throw notFound(`Jam with id ${param.eventId}`);
    }

    const currentProfile = await ensureProfileOrGuest(event, 'read', {
      type: 'jams',
      id: jamEvent.id,
    });

    if (jam.waitingRoom && !canModerateJam(currentProfile, jamEvent)) {
      // Previously admitted guests may re-token after mobile idle / reconnect
      // without going through the waiting room again.
      const admitted = await isAdmittedToJam(
        jamEvent,
        currentProfile.id,
        recurrenceId,
      );
      if (!admitted) {
        throw forbidden();
      }
    }

    const token = await createJamToken(
      jamEvent,
      currentProfile,
      false,
      recurrenceId,
    ).catch(rethrowIfOpenpeepsError);

    return { success: true, token, livekitUrl: jams.livekit.url };
  },
);
