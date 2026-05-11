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
}

export const ReactionEmail = ({
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
      previewText={t('emails.reaction.body', {
        profileName: profileName(locals.senderProfile),
      })}
      showGreeting
      recipientProfile={locals.recipientProfile}
    >
      <Text style={emailStyles.heading}>
        {t('emails.reaction.body', {
          profileName: profileName(locals.senderProfile),
        })}
      </Text>
      <Section>
        {locals.post?.data?.content && (
          <Container style={emailStyles.infoContainer}>
            <Img
              src={getProfileAvatar(
                locals.senderProfile,
                globals.communityConfig,
              )}
              alt={profileName(locals.recipientProfile) || ''}
              style={emailStyles.avatar}
              width="50"
              height="50"
            />
            <Container style={emailStyles.messageCard}>
              <Container>
                <Text style={emailStyles.username}>
                  {profileName(locals.recipientProfile)}
                </Text>
                <Text style={emailStyles.handle}>
                  @{locals.recipientProfile.handle}
                </Text>
              </Container>
              <Text>{truncateText(locals.post.data.content, 100)}</Text>
            </Container>
          </Container>
        )}

        <Section style={emailStyles.ctaContainer}>
          <Button
            href={`${globals.serverData.rootUrl}/posts/${locals.post.id}`}
            style={emailStyles.button}
          >
            {t('emails.reaction.cta')}
          </Button>
        </Section>
      </Section>
    </BaseEmailLayout>
  );
};
