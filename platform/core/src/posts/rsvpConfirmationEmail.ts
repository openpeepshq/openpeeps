import type {
  Event,
  PostWithMeta,
  Profile,
  PublicPost,
  RSVP,
  RsvpResponse,
} from '@openpeepshq/common/types';
import { buildEventIcs } from '@openpeepshq/common/lib';
import { hub } from '../events';
import { emailService } from '../email';
import { findByProfile } from '../accounts';
import { serverRootUrl } from '../server';
import { logger } from '../log';

const log = logger('openpeeps:rsvp-email');

const attendingResponses: RsvpResponse[] = ['yes', 'tentative'];

type RsvpEventPayload = {
  type: 'rsvp';
  data: RSVP;
  previousResponse?: RsvpResponse;
};

/**
 * Emails the responder an .ics file when they newly RSVP "yes" or "maybe" to an
 * event so they can add it to their calendar (see issue #645). We only send on
 * the transition into attending (the previous response was "no" or unset) to
 * avoid re-sending when someone toggles between yes/maybe.
 */
const handleRsvpCreated = async (
  profileArg: unknown,
  postArg: unknown,
  payloadArg: unknown,
) => {
  const profile = profileArg as Profile;
  const post = postArg as PostWithMeta;
  const payload = payloadArg as RsvpEventPayload;

  if (payload?.type !== 'rsvp') {
    return;
  }

  const response = payload.data?.response;
  if (!response || !attendingResponses.includes(response)) {
    return;
  }

  if (
    payload.previousResponse &&
    attendingResponses.includes(payload.previousResponse)
  ) {
    return;
  }

  if (post.type !== 'event' || post.data?.type !== 'event') {
    return;
  }

  const rootUrl = await serverRootUrl();
  const postUrl = `${rootUrl}/posts/${post.id}`;
  const ics = buildEventIcs(post as unknown as PublicPost, { postUrl });
  if (!ics) {
    return;
  }

  const accounts = await findByProfile(profile);
  if (!accounts.length) {
    return;
  }

  const event = post.data as Event;
  const mailer = await emailService();

  for (const account of accounts) {
    if (!account.email) {
      continue;
    }

    await mailer
      .send({
        to: account.email,
        template: 'eventRsvpConfirmation',
        locals: {
          eventName: event.name?.trim() || 'Event',
          eventUrl: postUrl,
          response,
          start: event.start,
          end: event.end ?? null,
          location: event.physicalLocation?.text ?? null,
          allDay: event.wholeDay ?? false,
        },
        attachments: [
          {
            filename: 'event.ics',
            content: ics,
            contentType: 'text/calendar; method=PUBLISH; charset=utf-8',
          },
        ],
      })
      .catch((err) => log.error(err));
  }
};

let registered = false;

/** Subscribes the RSVP confirmation email handler to the `rsvpCreated` event. */
export const registerRsvpConfirmationEmail = () => {
  if (registered) {
    return;
  }
  registered = true;
  hub.once('rsvpCreated', handleRsvpCreated);
};
