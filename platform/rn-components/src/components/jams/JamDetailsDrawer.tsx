import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';
import { truncateText } from '@openpeepshq/common';
import { useJamDetails, useJamRtmpStream } from '@openpeepshq/react';
import { CopyCheckIcon, CopyIcon } from '../icons/index';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { ThemedText } from '../ui/themed-text';
import { BASE_URL } from '../../lib/constants';
import { JamDrawer } from './JamDrawer';

export interface JamDetailsDrawerProps {
  open: boolean;
  onClose: () => void;
}

const SectionHeading = ({ children }: { children: string }) => (
  <ThemedText className="text-xs font-semibold uppercase text-muted-foreground">
    {children}
  </ThemedText>
);

const CopyLink = ({
  url,
  copyLabel,
  copiedLabel,
  truncate,
}: {
  url: string;
  copyLabel: string;
  copiedLabel: string;
  truncate?: number;
}) => {
  const [copied, setCopied] = useState(false);
  const Icon = copied ? CopyCheckIcon : CopyIcon;
  return (
    <>
      <ThemedText className="mt-1 text-sm">
        {truncate ? truncateText(url, truncate) : url}
      </ThemedText>
      <Pressable
        className="mt-2 flex-row items-center"
        onPress={() => {
          Clipboard.setString(url);
          setCopied(true);
        }}
      >
        <Icon size={16} className="text-foreground" />
        <ThemedText className="ml-2 text-sm">
          {copied ? copiedLabel : copyLabel}
        </ThemedText>
      </Pressable>
    </>
  );
};

/** Jam details drawer (joining info + moderator observer link + RTMP). */
export const JamDetailsDrawer = ({ open, onClose }: JamDetailsDrawerProps) => {
  const { t } = useTranslation();
  const { jamPost, isModerator, observerPath } = useJamDetails();

  if (!open) return null;

  // The web drawer copies `window.location.href`; the equivalent web URL for
  // this jam is the shareable one from a phone.
  const href = `${BASE_URL}/events/${jamPost.id}/jam`;
  const observerUrl = observerPath
    ? observerPath.startsWith('http')
      ? observerPath
      : `${BASE_URL}${observerPath}`
    : null;

  return (
    <JamDrawer title={t('jams.details.panelHeading')} onClose={onClose}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-4 px-2 pb-4"
      >
        <View>
          <SectionHeading>
            {t('jams.details.joiningInfoHeading')}
          </SectionHeading>
          <CopyLink
            url={href}
            copyLabel={t('jams.details.copyJoiningInfo')}
            copiedLabel={t('jams.details.copiedJoiningInfo')}
          />
        </View>

        {observerUrl ? (
          <View>
            <SectionHeading>
              {t('jams.details.observerLinkHeading')}
            </SectionHeading>
            <CopyLink
              url={observerUrl}
              truncate={40}
              copyLabel={t('jams.details.copyObserverLink')}
              copiedLabel={t('jams.details.copiedObserverLink')}
            />
          </View>
        ) : null}

        {isModerator ? <JamRtmpStreamForm jamId={jamPost.id} /> : null}
      </ScrollView>
    </JamDrawer>
  );
};

const JamRtmpStreamForm = ({ jamId }: { jamId: string }) => {
  const { t } = useTranslation();
  const {
    live,
    host,
    url,
    setUrl,
    streamKey,
    setStreamKey,
    canSubmit,
    toggle,
  } = useJamRtmpStream({
    jamId,
    onSuccess: (text1) => Toast.show({ type: 'success', text1 }),
    onError: (text1) => Toast.show({ type: 'error', text1 }),
  });

  return (
    <View>
      <SectionHeading>{t('jams.details.rtmpHeading')}</SectionHeading>
      <ThemedText className="mt-1 text-sm text-muted-foreground">
        {t('jams.details.rtmpHelp')}
      </ThemedText>
      {live ? (
        <ThemedText className="mt-2 text-sm">
          {t('jams.details.rtmpLive', { host: host || 'RTMP' })}
        </ThemedText>
      ) : (
        <View className="mt-2 gap-2">
          <View>
            <Label nativeID="rtmp-url" className="text-sm">
              {t('jams.details.rtmpUrlLabel')}
            </Label>
            <Input
              aria-labelledby="rtmp-url"
              value={url}
              onChangeText={setUrl}
              placeholder={t('jams.details.rtmpUrlPlaceholder')}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              className="mt-1"
            />
          </View>
          <View>
            <Label nativeID="rtmp-key" className="text-sm">
              {t('jams.details.rtmpStreamKeyLabel')}
            </Label>
            <Input
              aria-labelledby="rtmp-key"
              value={streamKey}
              onChangeText={setStreamKey}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              className="mt-1"
            />
          </View>
        </View>
      )}
      <Button
        variant="ghost"
        size="sm"
        className="mt-2 self-start"
        disabled={!canSubmit}
        onPress={toggle}
      >
        <ThemedText className="text-sm">
          {live ? t('jams.details.rtmpStop') : t('jams.details.rtmpStart')}
        </ThemedText>
      </Button>
    </View>
  );
};
