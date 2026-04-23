import React from 'react';
import { MediaAttachmentData } from '@openpeeps/common';
import { CachedImage } from '../../../common/cached-image';

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
