import { Button, Heading, Link, Section } from '@react-email/components';
import type {
  EmailGlobals,
  GroupData,
  PublicPost,
  PublicProfile,
} from '@openpeeps/common/types';
import { groupName, profileName } from '@openpeeps/common/lib';

import { BaseEmailLayout } from '../../BaseEmailLayout';
import { EmailPostEmbed } from '../../EmailPostEmbed';
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
      {locals.post ? (
        <EmailPostEmbed post={locals.post} globals={globals} />
      ) : null}
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
