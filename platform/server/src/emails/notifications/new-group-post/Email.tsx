import {
  Button,
  Container,
  Heading,
  Img,
  Link,
  Section,
  Text,
} from '@react-email/components';
import type {
  EmailGlobals,
  GroupData,
  PublicPost,
  PublicProfile,
} from '@openpeeps/common/types';
import {
  getProfileAvatar,
  groupName,
  profileName,
  truncateText,
} from '@openpeeps/common/lib';

import { BaseEmailLayout } from '../../BaseEmailLayout';
import { emailStyles } from '../../styles';

interface Locals {
  senderProfile: PublicProfile;
  recipientProfile: PublicProfile;
  post: PublicPost;
  group: GroupData;
  data: {
    replyPost: PublicPost;
  };
}

export const NewGroupPostEmail = ({
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
      previewText={t('emails.newGroupPost.title', {
        profileName: profileName(locals.senderProfile),
        groupName: groupName(locals.group),
        communityName: globals.communityConfig.info.name,
      })}
      showGreeting
      recipientProfile={locals.recipientProfile}
    >
      <Heading style={emailStyles.heading}>
        {t('emails.newGroupPost.title', {
          profileName: profileName(locals.senderProfile),
          groupName: groupName(locals.group),
          communityName: globals.communityConfig.info.name,
        })}
      </Heading>
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
          href={`${globals.serverData.rootUrl}/posts/${locals.post.id}`}
          style={emailStyles.button}
        >
          {t('emails.newGroupPost.postCta')}
        </Button>
      </Section>
      <Link
        href={`${globals.serverData.rootUrl}/groups/@${locals.group?.handle}`}
        style={emailStyles.linkStyle}
      >
        {t('emails.newGroupPost.cta')}
      </Link>
    </BaseEmailLayout>
  );
};
