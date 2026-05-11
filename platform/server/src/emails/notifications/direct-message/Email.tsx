import { Button, Link, Section, Text } from '@react-email/components';
import type {
  EmailGlobals,
  Profile,
  PublicPost,
  PublicProfile,
} from '@openpeeps/common/types';
import { profileName, truncateText } from '@openpeeps/common/lib';

import { BaseEmailLayout } from '../../BaseEmailLayout';
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

  const messageContent = {
    ...emailStyles.paragraph,
    color: '#2d3748',
    backgroundColor: '#f7fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '16px',
    margin: '16px 0',
  };

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

          <Text style={messageContent}>
            {truncateText(locals.data.previousPost?.data?.content || '', 30)}
          </Text>

          <Text style={emailStyles.paragraph}>
            {t('emails.directMessage.replySubtitle')}
          </Text>

          <Text style={messageContent}>{locals.post.data?.content}</Text>
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

          {locals.data.previousPost?.data?.content ? (
            <Text style={messageContent}>
              {truncateText(locals.data.previousPost.data.content, 30)}
            </Text>
          ) : (
            <Text style={messageContent}>{locals.post.data?.content}</Text>
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
