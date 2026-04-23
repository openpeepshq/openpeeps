import React from 'react';
import { formatSize, type MediaAttachmentData } from '@openpeeps/common';
import { getFileIcon, getFileType } from '~/components/custom/post/helpers';
import { FileQuestionIcon } from '~/components/icons';
import { useMemo } from 'react';
import { ThemedText } from '~/components/ui/themed-text';
import { ThemedView } from '~/components/ui/themed-view';

interface DocumentAttachmentProps {
    attachment: MediaAttachmentData;
}


export const DocumentAttachment = ({ attachment }: DocumentAttachmentProps) => {
    const fileType = useMemo(() => getFileType(attachment), [attachment]);
    const Icon = useMemo(() => attachment.type === 'document' ? getFileIcon(fileType) : FileQuestionIcon, [attachment, fileType]);
    return (
        <ThemedView className="w-full flex flex-col items-start gap-3">
            <ThemedView className="bg-surface-400 flex size-10 items-center justify-center rounded-md p-1">
                <Icon className="text-foreground" />
            </ThemedView>
            <ThemedText className="break-all text-base font-medium w-full">
                {attachment.filename}
            </ThemedText>
            {attachment.description && attachment.description !== attachment.filename && (
                <ThemedText className="text-muted-foreground text-sm w-full">
                    {attachment.description}
                </ThemedText>
            )}
            {attachment?.meta?.size && (
                <ThemedText className="text-muted-foreground text-sm w-full">
                    {formatSize(attachment?.meta?.size || 0)}
                </ThemedText>
            )}
        </ThemedView>
    );
};
