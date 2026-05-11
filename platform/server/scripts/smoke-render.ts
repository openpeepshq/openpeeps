// Smoke test: register React email templates in-process, render every
// registered template against minimal fake locals, and print a summary.
// Run with: pnpm --filter @openpeeps/server exec vite-node scripts/smoke-render.ts
import { initializeServer } from '../src/lib/init';
import { emailService } from '@openpeeps/core/email';

const fakeProfile = {
  id: 'p_1',
  handle: 'alice',
  displayName: 'Alice',
  type: 'local' as const,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  capabilities: {},
  memberships: [],
};

const fakePost = {
  id: 'post_1',
  type: 'note' as const,
  visibility: 'public' as const,
  creatorId: 'p_1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  profile: fakeProfile,
  mentions: [],
  data: { content: 'Hello from the smoke test.' },
};

const fakeGroup = {
  id: 'g_1',
  handle: 'jam-fans',
  displayName: 'Jam Fans',
  description: 'For people who love jam.',
};

const fixtures: Array<{ template: string; locals?: Record<string, unknown> }> = [
  { template: 'welcome' },
  { template: 'test' },
  {
    template: 'validateEmail',
    locals: { emailValidationLink: 'https://example.com/validate?token=abc' },
  },
  {
    template: 'resetPassword',
    locals: { resetPasswordLink: 'https://example.com/reset?token=xyz' },
  },

  {
    template: 'notification-announcement',
    locals: {
      senderProfile: fakeProfile,
      recipientProfile: fakeProfile,
      post: fakePost,
    },
  },
  {
    template: 'notification-directMessage',
    locals: {
      senderProfile: fakeProfile,
      recipientProfile: fakeProfile,
      post: fakePost,
      data: { conversationStart: fakePost },
    },
  },
  {
    template: 'notification-follow',
    locals: { senderProfile: fakeProfile, recipientProfile: fakeProfile },
  },
  {
    template: 'notification-jamModerator',
    locals: {
      senderProfile: fakeProfile,
      recipientProfile: fakeProfile,
      post: fakePost,
    },
  },
  {
    template: 'notification-jamSpeaker',
    locals: {
      senderProfile: fakeProfile,
      recipientProfile: fakeProfile,
      post: fakePost,
    },
  },
  {
    template: 'notification-jamStarted',
    locals: {
      senderProfile: fakeProfile,
      recipientProfile: fakeProfile,
      post: fakePost,
    },
  },
  {
    template: 'notification-newProfile',
    locals: { senderProfile: fakeProfile, recipientProfile: fakeProfile },
  },
  {
    template: 'notification-reaction',
    locals: {
      senderProfile: fakeProfile,
      recipientProfile: fakeProfile,
      post: fakePost,
    },
  },
  {
    template: 'notification-reply',
    locals: {
      senderProfile: fakeProfile,
      recipientProfile: fakeProfile,
      post: fakePost,
      data: { replyPost: fakePost },
    },
  },
  {
    template: 'notification-repost',
    locals: {
      senderProfile: fakeProfile,
      recipientProfile: fakeProfile,
      post: fakePost,
    },
  },
  {
    template: 'notification-groupMemberJoined',
    locals: {
      senderProfile: fakeProfile,
      recipientProfile: fakeProfile,
      group: fakeGroup,
    },
  },
  {
    template: 'notification-groupMemberLeft',
    locals: {
      senderProfile: fakeProfile,
      recipientProfile: fakeProfile,
      group: fakeGroup,
    },
  },
  {
    template: 'notification-groupAdded',
    locals: {
      senderProfile: fakeProfile,
      recipientProfile: fakeProfile,
      group: fakeGroup,
    },
  },
  {
    template: 'notification-newGroupPost',
    locals: {
      senderProfile: fakeProfile,
      recipientProfile: fakeProfile,
      post: fakePost,
      group: fakeGroup,
      data: { replyPost: fakePost },
    },
  },
];

const main = async () => {
  await initializeServer();
  const svc = await emailService();

  let ok = 0;
  let fail = 0;
  for (const fixture of fixtures) {
    try {
      const rendered = await svc.render({
        to: 'qa@example.com',
        template: fixture.template,
        locals: fixture.locals as never,
      });
      console.log(
        `[ok]   ${fixture.template.padEnd(35)} subject="${rendered.subject.slice(0, 60)}" html=${rendered.html.length}b text=${rendered.text.length}b`,
      );
      ok += 1;
    } catch (err) {
      console.log(
        `[fail] ${fixture.template.padEnd(35)} ${(err as Error).message}`,
      );
      fail += 1;
    }
  }

  console.log(`\n${ok} ok, ${fail} fail, ${fixtures.length} total`);
  process.exit(fail === 0 ? 0 : 1);
};

main().catch((err) => {
  console.error('smoke-render failed:', err);
  process.exit(1);
});
