import { Button, Section, Text } from '@react-email/components';
import type {
  EmailGlobals,
  PublicPost,
  PublicProfile,
} from '@openpeeps/common/types';
import { getJamUrl, profileName } from '@openpeeps/common/lib';

import { BaseEmailLayout } from '../../BaseEmailLayout';
import { EmailPostEmbed } from '../../EmailPostEmbed';
import { emailStyles } from '../../styles';

interface Locals {
  recipientProfile: PublicProfile;
  senderProfile: PublicProfile;
  post: PublicPost;
}

export const JamStartedEmail = ({
  globals,
  locals,
}: {
  globals: EmailGlobals;
  locals: Locals;
}) => {
  const { t } = globals.i18nContext;
  const body = t('emails.jamStarted.body', {
    profileName: profileName(locals.senderProfile),
  });

  return (
    <BaseEmailLayout
      globals={globals}
      previewText={body}
      showGreeting
      recipientProfile={locals.recipientProfile}
    >
      <Text style={emailStyles.heading}>{t('emails.jams.started')}</Text>
      <Text style={emailStyles.paragraph}>{body}</Text>
      {locals.post ? (
        <EmailPostEmbed post={locals.post} globals={globals} />
      ) : null}

      <Section style={emailStyles.ctaContainer}>
        <Button
          href={getJamUrl(locals.post.id, globals.serverData.rootUrl)}
          style={emailStyles.button}
        >
          {t('emails.jamStarted.cta')}
        </Button>
      </Section>
    </BaseEmailLayout>
  );
};
