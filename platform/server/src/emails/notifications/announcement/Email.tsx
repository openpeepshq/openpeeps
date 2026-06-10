import { Button, Hr, Link, Section, Text } from '@react-email/components';
import type {
  EmailGlobals,
  PublicPost,
  PublicProfile,
} from '@openpeeps/common/types';

import { BaseEmailLayout } from '../../BaseEmailLayout';
import { EmailPostEmbed } from '../../EmailPostEmbed';
import { emailStyles } from '../../styles';

interface Locals {
  senderProfile: PublicProfile;
  recipientProfile: PublicProfile;
  post: PublicPost;
  previousPost?: PublicPost;
  conversationStart?: PublicPost;
}

export const AnnouncementEmail = ({
  globals,
  locals,
}: {
  globals: EmailGlobals;
  locals: Locals;
}) => {
  const { t } = globals.i18nContext;

  return (
    <BaseEmailLayout
      globals={globals}
      previewText={`Announcement from ${globals.communityConfig.info.name}`}
      showGreeting
      recipientProfile={locals.recipientProfile}
    >
      <Text style={emailStyles.heading}>
        {t('emails.announcement.subject', {
          communityName: globals.communityConfig.info.name,
        })}
      </Text>
      <Text style={emailStyles.paragraph}>
        <Link
          href={`${globals.serverData.rootUrl}/@${locals.senderProfile?.handle}`}
          style={emailStyles.linkStyle}
        >
          @{locals.senderProfile?.handle}
        </Link>{' '}
        {t('emails.announcement.body')}
      </Text>
      <Hr />
      {locals.post ? (
        <EmailPostEmbed post={locals.post} globals={globals} />
      ) : null}
      <Hr />

      <Section style={emailStyles.ctaContainer}>
        <Button
          href={`${globals.serverData.rootUrl}/posts/${locals.post.id}`}
          style={emailStyles.button}
        >
          {t('emails.announcement.cta')}
        </Button>
      </Section>
    </BaseEmailLayout>
  );
};
