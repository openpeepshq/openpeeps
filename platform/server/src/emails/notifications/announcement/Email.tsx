import {
  Button,
  Container,
  Hr,
  Img,
  Link,
  Section,
  Text,
} from '@react-email/components';
import type {
  EmailGlobals,
  PublicPost,
  PublicProfile,
} from '@openpeeps/common/types';
import { getProfileAvatar, profileName } from '@openpeeps/common/lib';

import { BaseEmailLayout } from '../../BaseEmailLayout';
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
      {locals.post?.data?.content && (
        <Container style={emailStyles.infoContainer}>
          <Img
            src={getProfileAvatar(
              locals.senderProfile,
              globals.communityConfig,
            )}
            alt={profileName(locals.senderProfile) || ''}
            style={emailStyles.avatar}
            width="50"
            height="50"
          />
          <Container>
            <Text style={emailStyles.username}>
              {profileName(locals.senderProfile)}
            </Text>
            <Text style={emailStyles.handle}>
              @{locals.senderProfile.handle}
            </Text>
          </Container>
        </Container>
      )}
      <Text style={emailStyles.paragraph}>{locals.post.data?.content}</Text>
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
