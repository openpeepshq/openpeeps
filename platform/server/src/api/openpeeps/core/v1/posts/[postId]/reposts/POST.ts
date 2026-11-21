import { endpoint, z } from '#lib/endpoint';
import { forbidden, notFound } from '#lib/errors';
import {
  type PostWithMeta,
  publicPostSchema,
  type PostData,
  type Note,
} from '@openpeepshq/common/types';
import {
  canCreatePost,
  isPublicGroup,
  republishContent,
} from '@openpeepshq/common/lib';
import {
  ensureGroupCapabilities,
  ensureLocalProfile,
  ensureRoleCapabilities,
} from '#lib/auth';
import type { RequestEvent } from '@riddl/core';
import { createPost, findPost } from '@openpeepshq/core/posts';
import { serverRootUrl } from '@openpeepshq/core/server';

export const Output = publicPostSchema;
export const Param = z.object({
  postId: z.string(),
});

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export const apiEndpoint = endpoint({ Output, Param, Error }).handle(
  async (input, event: RequestEvent) => {
    const profile = await ensureLocalProfile(event);

    const postToRepost: PostWithMeta | undefined = await findPost(input.postId);

    if (!postToRepost) {
      throw notFound(`Post with id ${input.postId}`);
    }

    if (postToRepost.group) {
      // Type-scoped (review round 7, S2): the same predicate the share menu's
      // `canRepost` (via `getPostActionAvailability`) and main's original
      // gate check, so the UI's eligibility and the endpoint's authorization
      // can't diverge for non-note group posts (events, articles). The
      // republish path additionally requires the public-note write capability
      // below; the legacy branch keeps its pre-existing type-scoped gate.
      await ensureGroupCapabilities(
        event,
        [`core-posts-create-${postToRepost.type}`],
        postToRepost.group,
      );
    } else {
      await ensureRoleCapabilities(event, [
        `core-posts-create-${postToRepost.type}-${postToRepost.visibility}`,
      ]);
    }

    // Reposting a public-group post republishes it to the community feed
    // (issue #654): a plain public note whose only content is the canonical
    // link to the source post, prefixed with the source group handle. The
    // attribution is written **without** the `@` (review round 7, S1): the
    // note content runs through `resolveMentionsForPost` in `createPost`, and
    // `@<handle>:` is exactly the shape `matchMentionHandles` matches — so an
    // `@`-carrying prefix would mention (and notify) any profile whose handle
    // collides with the source group's handle, even though group and profile
    // handles live in separate namespaces. `From <handle>:` keeps the
    // attribution without that side effect. The republished note is an
    // ordinary public `Note` with no special AP type, so it federates like
    // any public post; no ActivityPub handling is needed or added (the
    // issue's AP-implications ask is answered by that plainness).
    // The original post is untouched and no repost relationship is recorded —
    // a group link would force visibility back to `group` in createPost and
    // keep the repost out of the community feeds. Private-group and direct
    // posts repost into their original audience.
    const republishToCommunity =
      postToRepost.visibility === 'group' &&
      !!postToRepost.group &&
      isPublicGroup(postToRepost.group);

    if (!republishToCommunity) {
      const post: PostData = {
        type: 'note',
        visibility: postToRepost.visibility,
        creatorId: profile.id,
      };

      return await createPost({ type: 'note' }, profile, post, {
        repostId: postToRepost?.id,
        groupId: postToRepost?.groupId || undefined,
        audience: postToRepost?.audience || undefined,
      });
    }

    // Two deliberate, complementary gates on the republish path:
    //  1. The group-scoped check above (`core-posts-create-${type}` on the
    //     source group — the same type-scoped predicate the share menu's
    //     `canRepost` uses) is granted per the group template — for
    //     `groupCapabilityTemplates.publicGroup` that is `member` and above, so
    //     a non-member who can merely read the public group fails here.
    //  2. This role-scoped check enforces the public-note write path the
    //     normal posts endpoint requires (`core-posts-create-note-public` plus
    //     the posts write scope), because the republished note lands in the
    //     community feed, not just the group.
    if (!canCreatePost(event.context.authData, 'note', 'public')) {
      throw forbidden();
    }

    // `serverRootUrl()` derives the origin from `config().server.host` — the
    // same config source the email/notification pipeline builds its post
    // links from (e.g. the RSVP confirmation email). The republished content
    // is therefore host-config-dependent by design and consistent with those
    // links.
    // `republishContent` shares `postCanonicalUrl` with the notification ICS
    // attachment, so the republished note's link always matches the link
    // format the notification pipeline builds.
    const groupHandle = postToRepost.group?.handle;
    const content = republishContent(
      await serverRootUrl(),
      postToRepost.id,
      groupHandle,
    );

    const note: Note = { type: 'note', content };
    const post: PostData = {
      type: 'note',
      visibility: 'public',
      creatorId: profile.id,
      data: note,
    };

    return await createPost(note, profile, post, {});
  },
);
