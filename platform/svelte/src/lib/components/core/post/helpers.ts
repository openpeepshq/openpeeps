import type { MediaAttachmentData, PublicPost } from '@openpeeps/common/types';
import { File, FileText, FileSpreadsheet, FileChartPie } from 'lucide-svelte';

export const stringToSegments = (text: string) =>
	[...new Intl.Segmenter().segment(text)].map((x) => x.segment);

export const postReactionStats = (post: PublicPost) =>
	[...new Set(post.reactions.map((r) => stringToSegments(r.reaction)[0]))].join('') +
	' ' +
	post.reactions?.length;

export const getFileType = (attachment: MediaAttachmentData) => {
	let name = attachment.filename?.toLowerCase();
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
		name.endsWith('.csv') ||
		name.endsWith('.numbers') || 
		mime.includes('numbers')
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
		name.endsWith('.txt') || 
		mime.includes('pages') ||
		name.endsWith('.pages')
	) {
		return 'document';
	} else {
		return 'unknown';
	}
}

export const getFileIcon = (fileType: string) => {
	switch (fileType) {
		case 'pdf':
			return FileText;
		case 'spreadsheet':
			return FileSpreadsheet;
		case 'presentation':
			return FileChartPie;
		case 'document':
			return FileText;
		default:
			return File;
	}
}