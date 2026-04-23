import React from 'react';
import { DownloadIcon } from '../../../../icons';
import type { MediaAttachmentData } from '@openpeeps/common';
import { Button } from '../../../../ui/button';
import { DocumentAttachment } from '../DocumentAttachment';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '../../../../ui/themed-text';
import { ThemedView } from '../../../../ui/themed-view';
import { downloadDocument } from '../../../../../lib/downloadFile';

interface GalleryDocumentProps {
    attachment: MediaAttachmentData;
}

export const GalleryDocument = ({ attachment }: GalleryDocumentProps) => {
    const { t } = useTranslation();
    return (
        <ThemedView className="flex size-full items-center justify-center p-4">
            <DocumentAttachment attachment={attachment} />
            <Button
                className="absolute bottom-4 right-4"
                onPress={() => {
                    downloadDocument(attachment.url);
                }}
            >
                <ThemedView className="bg-primary flex-row items-center gap-2">
                    <DownloadIcon className="size-4" />
                    <ThemedText className="text-sm">{t('common.actions.download')}</ThemedText>
                </ThemedView>
            </Button>
        </ThemedView >);
};
