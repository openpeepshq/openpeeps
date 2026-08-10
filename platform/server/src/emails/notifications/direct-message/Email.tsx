import { Button, Link, Section, Text } from '@react-email/components';
import type {
  EmailGlobals,
  Profile,
  PublicPost,
  PublicProfile,
} from '@openpeepshq/common/types';
import { profileName } from '@openpeepshq/common/lib';

import { BaseEmailLayout } from '../../BaseEmailLayout';
import { EmailPostEmbed } from '../../EmailPostEmbed';
import { emailStyles } from '../../styles';

interface Locals {
  senderProfile: Profile;
  recipientProfile: PublicProfile;
  post: PublicPost;
  data: {
    previousPost?: PublicPost;
    conversationStart: PublicPost;
  };
}

export const DirectMessageEmail = ({
  globals,
  locals,
}: {
  globals: EmailGlobals;
  locals: Locals;
}) => {
  const { t } = globals.i18nContext;
  const hasMultipleRecipients = locals.post.mentions.length > 2;
  const isReply = !!locals.data.previousPost;

  return (
    <BaseEmailLayout
      globals={globals}
      previewText={`Direct message from ${globals.communityConfig.info.name}`}
      showGreeting
      recipientProfile={locals.recipientProfile}
    >
      {isReply ? (
        <>
          <Text style={emailStyles.paragraph}>
            {t('emails.directMessage.title', {
              profileName: profileName(locals.senderProfile as PublicProfile),
            })}
          </Text>

          {locals.data.previousPost ? (
            <EmailPostEmbed
              post={locals.data.previousPost}
              globals={globals}
            />
          ) : null}

          <Text style={emailStyles.paragraph}>
            {t('emails.directMessage.replySubtitle')}
          </Text>

          <EmailPostEmbed post={locals.post} globals={globals} />
        </>
      ) : (
        <>
          <Text style={emailStyles.paragraph}>
            <Link
              href={`${globals.serverData.rootUrl}/@${locals.senderProfile.handle}`}
              style={emailStyles.linkStyle}
            >
              @{locals.senderProfile.handle}
            </Link>{' '}
            {hasMultipleRecipients
              ? t('emails.directMessage.multipleRecipientsBody', {
                  membersCount: locals.post.mentions.length - 2,
                })
              : t('emails.directMessage.singleRecipientBody')}
          </Text>

          {locals.data.previousPost ? (
            <EmailPostEmbed
              post={locals.data.previousPost}
              globals={globals}
            />
          ) : (
            <EmailPostEmbed post={locals.post} globals={globals} />
          )}
        </>
      )}

      <Section style={emailStyles.ctaContainer}>
        <Button
          href={`${globals.serverData.rootUrl}/conversations/${locals.data.conversationStart.id}`}
          style={emailStyles.button}
        >
          {t('emails.directMessage.cta')}
        </Button>
      </Section>
    </BaseEmailLayout>
  );
};
