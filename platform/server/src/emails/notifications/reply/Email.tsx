import {
  Button,
  Container,
  Img,
  Section,
  Text,
} from '@react-email/components';
import type {
  EmailGlobals,
  PublicPost,
  PublicProfile,
} from '@openpeeps/common/types';
import {
  getProfileAvatar,
  profileName,
  truncateText,
} from '@openpeeps/common/lib';

import { BaseEmailLayout } from '../../BaseEmailLayout';
import { emailStyles } from '../../styles';

interface Locals {
  senderProfile: PublicProfile;
  recipientProfile: PublicProfile;
  post: PublicPost;
  data: {
    replyPost: PublicPost;
  };
}

export const ReplyEmail = ({
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
      previewText={t('emails.reply.body', {
        profileName: profileName(locals.senderProfile),
      })}
      showGreeting
      recipientProfile={locals.recipientProfile}
    >
      <Text style={emailStyles.heading}>
        {t('emails.reply.body', {
          profileName: profileName(locals.senderProfile),
        })}
      </Text>
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
          <Container style={emailStyles.messageCard}>
            <Container>
              <Text style={emailStyles.username}>
                {profileName(locals.senderProfile)}
              </Text>
              <Text style={emailStyles.handle}>
                @{locals.senderProfile.handle}
              </Text>
            </Container>
            <Text>{truncateText(locals.data.replyPost.data.content, 30)}</Text>
          </Container>
        </Container>
      )}
      <Section style={emailStyles.ctaContainer}>
        <Button
          href={`${globals.serverData.rootUrl}/posts/${locals.data.replyPost.id}`}
          style={emailStyles.button}
        >
          {t('emails.reply.cta')}
        </Button>
      </Section>
    </BaseEmailLayout>
  );
};
