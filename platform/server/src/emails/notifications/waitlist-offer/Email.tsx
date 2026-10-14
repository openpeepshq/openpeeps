import { Button, Section, Text } from '@react-email/components';
import type {
  EmailGlobals,
  ExpandedNotification,
} from '@openpeepshq/common/types';
import {
  isWaitlistOfferNotice,
  waitlistClaimPath,
} from '@openpeepshq/common/lib';

import { BaseEmailLayout } from '../../BaseEmailLayout';
import { EmailPostEmbed } from '../../EmailPostEmbed';
import { emailStyles } from '../../styles';

export const WaitlistOfferEmail = ({
  globals,
  locals,
}: {
  globals: EmailGlobals;
  locals: ExpandedNotification;
}) => {
  const { t } = globals.i18nContext;
  const event =
    locals.post?.data?.type === 'event' ? locals.post.data : undefined;
  const notice = isWaitlistOfferNotice(locals.data) ? locals.data : undefined;
  const eventName =
    event?.name?.trim() || t('emails.waitlistOffer.eventFallback');
  const body = t('emails.waitlistOffer.body', { eventName });
  const href = locals.post
    ? `${globals.serverData.rootUrl}${waitlistClaimPath(
        locals.post.id,
        notice?.recurrenceId,
      )}`
    : globals.serverData.rootUrl;

  return (
    <BaseEmailLayout
      globals={globals}
      previewText={body}
      showGreeting
      recipientProfile={locals.recipientProfile}
    >
      <Text style={emailStyles.heading}>{body}</Text>
      {notice?.offerExpiresAt ? (
        <Text style={emailStyles.paragraph}>
          {t('emails.waitlistOffer.expires', {
            until: new Date(notice.offerExpiresAt).toUTCString(),
          })}
        </Text>
      ) : null}
      {locals.post ? (
        <Section>
          <EmailPostEmbed post={locals.post} globals={globals} />
          <Section style={emailStyles.ctaContainer}>
            <Button href={href} style={emailStyles.button}>
              {t('emails.waitlistOffer.cta')}
            </Button>
          </Section>
        </Section>
      ) : null}
    </BaseEmailLayout>
  );
};
