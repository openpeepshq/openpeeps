import React from 'react';
import { MediaAttachmentData } from '@openpeepshq/common';
import { CachedImage } from '~/components/custom/common/cached-image';

interface GalleryImageProps {
    attachment: MediaAttachmentData;
}

export const GalleryImage = ({ attachment }: GalleryImageProps) => (
    <CachedImage
        url={attachment.previewUrl || attachment.url}
        className="w-full h-full"
        resizeMode="cover"
    />
);
