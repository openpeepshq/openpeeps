import { type MediaAttachmentData } from '@openpeeps/common';
import { FileIcon } from 'lucide-react-native';
import { FileChartPieIcon, FileTextIcon } from '~/components/icons';

export const getFileType = (attachment: MediaAttachmentData) => {
    let name = attachment.description?.toLowerCase();
    let mime = attachment.meta?.mimetype?.toLowerCase();

    if (!name || !mime) {
        return 'unknown';
    }
    if (mime.includes('pdf') || name.endsWith('.pdf')) {
        return 'pdf';
    } else if (
        mime.includes('spreadsheet') ||
        mime.includes('excel') ||
        name.endsWith('.xlsx') ||
        name.endsWith('.xls') ||
        name.endsWith('.csv')
    ) {
        return 'spreadsheet';
    } else if (
        mime.includes('presentation') ||
        name.endsWith('.ppt') ||
        name.endsWith('.pptx')
    ) {
        return 'presentation';
    } else if (
        mime.includes('word') ||
        mime.includes('text') ||
        name.endsWith('.doc') ||
        name.endsWith('.docx') ||
        name.endsWith('.txt')
    ) {
        return 'document';
    } else {
        return 'unknown';
    }
};

export const getFileIcon = (fileType: string) => {
    switch (fileType) {
        case 'pdf':
            return FileTextIcon;
        case 'spreadsheet':
            return FileChartPieIcon;
        case 'presentation':
            return FileChartPieIcon;
        case 'document':
            return FileTextIcon;
        default:
            return FileIcon;
    }
};
