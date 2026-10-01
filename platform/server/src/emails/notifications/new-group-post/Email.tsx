import { Button, Heading, Link, Section, Text } from '@react-email/components';
import type {
  EmailGlobals,
  ExpandedNotification,
} from '@openpeepshq/common/types';
import { groupName, profileName } from '@openpeepshq/common/lib';

import { BaseEmailLayout } from '../../BaseEmailLayout';
import { EmailPostEmbed } from '../../EmailPostEmbed';
import { emailStyles } from '../../styles';

const i18nKeyFor = (post: NonNullable<ExpandedNotification['post']>) =>
  post.repost
    ? {
        title: 'emails.newGroupPost.repostTitle',
        subject: 'emails.newGroupPost.repostSubject',
      }
    : {
        title: 'emails.newGroupPost.title',
        subject: 'emails.newGroupPost.subject',
      };

export const NewGroupPostEmail = ({
  globals,
  locals,
}: {
  globals: EmailGlobals;
  locals: ExpandedNotification;
}) => {
  const { t } = globals.i18nContext;

  const post = locals.post;
  const isRepost = !!post?.repost;
  const { title, subject } = isRepost
    ? i18nKeyFor(post!)
    : {
        title: 'emails.newGroupPost.title',
        subject: 'emails.newGroupPost.subject',
      };

  const profileNameValue = profileName(locals.senderProfile ?? undefined);
  const groupNameValue = groupName(locals.group ?? undefined);
  const communityName = globals.communityConfig.info.name;

  return (
    <BaseEmailLayout
      globals={globals}
      previewText={t(subject, {
        profileName: profileNameValue,
        groupName: groupNameValue,
        communityName,
      })}
      showGreeting
      recipientProfile={locals.recipientProfile}
    >
      <Heading style={emailStyles.heading}>
        {t(title, {
          profileName: profileNameValue,
          groupName: groupNameValue,
          communityName,
        })}
      </Heading>
      {isRepost ? (
        <Text
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '12px',
            fontWeight: 600,
            color: '#6b7280',
            margin: '0 0 8px 0',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          {t('emails.newGroupPost.repostLabel', {
            defaultValue: 'Reposted',
          })}
        </Text>
      ) : null}
      {post ? <EmailPostEmbed post={post} globals={globals} /> : null}
      <Section style={emailStyles.ctaContainer}>
        <Button
          href={`${globals.serverData.rootUrl}/posts/${post?.repost ? post.repost.id : post?.id}`}
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
