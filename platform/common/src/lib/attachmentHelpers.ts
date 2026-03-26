export const getAttachmentType = (file: File) => {
    if (file.name.endsWith('.mkv')) {
        return 'video';
    }
    if (file.name.endsWith('.pdf') || file.name.endsWith('.doc') || file.name.endsWith('.docx') || file.name.endsWith('.odt') || file.name.endsWith('.txt')) {
        return 'document';
    }

    const mimeTypeFirstPart = file.type.split('/')[0];
    if (mimeTypeFirstPart === 'application' || mimeTypeFirstPart === 'text') {
        return 'document';
    }
    return mimeTypeFirstPart;
}