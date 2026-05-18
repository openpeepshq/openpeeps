/**
 * Result emitted by `ImageEditModal` when running in `upload: false` mode.
 * The caller is responsible for performing the actual upload, which lets
 * parent components (e.g. PostInputActions) render byte-level upload progress
 * inline with their attachment list.
 */
export interface ImageEditCropResult {
	file: Blob;
	description?: string;
	usage?: string;
}
