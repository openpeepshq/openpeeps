export const downloadFile = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'downloaded_file';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}