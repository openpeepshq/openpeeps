import { notFound } from '$lib/server/api/errors';
import type { Event, JamRecordingWithMeta } from '@openpeeps/common';
import { findJamRecording, finishRecording, updateJamRecording } from '@openpeeps/core/jams';
import { mediaStorage } from '@openpeeps/core/media';
import { createMediaAttachment } from '@openpeeps/core/mediaAttachments';
import { createPost } from '@openpeeps/core/posts';
import { serverRootUrl } from '@openpeeps/core/server';
import { json, type RequestEvent } from '@sveltejs/kit';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readdir, readFile, rmdir, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { decodeAwsChunked } from './helpers';

// In-memory storage for multipart upload state
interface MultipartUploadState {
    uploadId: string;
    bucket: string;
    filename: string;
    parts: Map<number, { etag: string; size: number }>;
    tempDir: string;
}

const multipartUploads = new Map<string, MultipartUploadState>();

// Get or create temp directory for multipart uploads
const getMultipartTempDir = async () => {
    const tempDir = join(tmpdir(), 's3-multipart');
    await mkdir(tempDir, { recursive: true });
    return tempDir;
};

// Generate ETag for a chunk (AWS S3 style)
const generateETag = (data: ArrayBuffer): string => {
    const hash = createHash('md5');
    hash.update(new Uint8Array(data));
    return `"${hash.digest('hex')}"`;
};


// Process complete file (extracted to avoid duplication)
const processCompleteFile = async (
    blob: Blob,
    recordingId: string,
    recording: JamRecordingWithMeta,
) => {
    const event = recording.post.data as Event;
    const newFilename = `${encodeURIComponent(event.name || 'jam-recording')}.mp4`;
    const file = new File([blob], newFilename, { type: 'video/mp4' });
    const storage = await mediaStorage();
    const fileStorageKey = await file.arrayBuffer().then(storage.store);
    const mediaAttachment = await createMediaAttachment({
        url: storage.getPath(fileStorageKey, newFilename),
        previewUrl: event.image ?? `${(await serverRootUrl())}/img/event-default.png`,
        textUrl: null,
        filename: newFilename,
        type: 'video',
        meta: {
            usage: 'jam-recording',
        },
        description: event.name || 'jam-recording',
    });
    await updateJamRecording(recordingId, {
        attachment: mediaAttachment,
        status: 'completed',
    });

    await createPost(
        {
            type: 'note',
            content: `Jam recording for ${event.name}`,
            attachments: [mediaAttachment]
        },
        recording.post.profile,
        {
            type: 'note',
            visibility: recording.post.visibility,
        },
        {
            inReplyToId: recording.post.id,
            groupId: recording.post.groupId,
            audience: recording.post.audience,
        });

    await finishRecording(recording);

};

export const PUT = async (evt: RequestEvent) => {
    const { bucket, filename } = evt.params;
    const url = new URL(evt.request.url);
    const partNumber = url.searchParams.get('partNumber');
    const uploadId = url.searchParams.get('uploadId');

    // Check if this is AWS chunked encoding (has checksum appended)
    const contentEncoding = evt.request.headers.get('content-encoding');
    const isAwsChunked = contentEncoding === 'aws-chunked';

    let blob: Blob;
    if (isAwsChunked) {

        const body = await evt.request.arrayBuffer();
        const buffer = decodeAwsChunked(body, Number(evt.request.headers.get('x-amz-decoded-content-length')));
        blob = new Blob([buffer]);

    } else {
        // Handle FormData (legacy format)
        const formData = await evt.request.formData();
        const file = formData.get('file') as Blob;
        if (!file) {
            return new Response('Missing file in FormData', { status: 400 });
        }
        blob = file;
    }

    // Handle multipart upload chunk
    if (partNumber && uploadId) {
        const partNum = parseInt(partNumber, 10);
        if (isNaN(partNum) || partNum < 1) {
            return new Response('Invalid partNumber', { status: 400 });
        }

        // Get or create multipart upload state
        let uploadState = multipartUploads.get(uploadId);
        if (!uploadState) {
            const tempDir = await getMultipartTempDir();
            const uploadTempDir = join(tempDir, uploadId);
            await mkdir(uploadTempDir, { recursive: true });
            uploadState = {
                uploadId,
                bucket: bucket || '',
                filename: filename || '',
                parts: new Map(),
                tempDir: uploadTempDir,
            };
            multipartUploads.set(uploadId, uploadState);
        }

        // Store the chunk
        const chunkData = await blob.arrayBuffer();
        const chunkPath = join(uploadState.tempDir, `part-${partNum}`);
        await writeFile(chunkPath, new Uint8Array(chunkData));

        // Generate ETag for this part
        const etag = generateETag(chunkData);
        uploadState.parts.set(partNum, {
            etag,
            size: chunkData.byteLength,
        });

        // Return ETag in response (AWS S3 format)
        return new Response('', {
            status: 200,
            headers: {
                'ETag': etag,
            },
        });
    }

    // Handle regular (non-multipart) upload
    if (bucket === 'allpeep-recordings') {
        if (filename?.endsWith('.mp4')) {
            const recordingId = filename.replace('.mp4', '');
            const recording = await findJamRecording(recordingId);
            if (!recording) {
                throw notFound(`Recording with id ${recordingId}`);
            }
            await processCompleteFile(blob, recordingId, recording);
            return json({ success: true });
        } else if (filename?.endsWith('.json')) {
            return json({ success: true });
        }
    }

    return new Response('Not found', { status: 404 });
};

// Handle multipart upload completion
export const POST = async (evt: RequestEvent) => {
    const { bucket, filename } = evt.params;
    const url = new URL(evt.request.url);
    const uploadId = url.searchParams.get('uploadId');
    const uploads = url.searchParams.get('uploads');

    // Handle multipart upload initiation
    if (uploads !== null && !uploadId) {
        // Generate a unique upload ID
        const newUploadId = randomUUID();

        // Create multipart upload state
        const tempDir = await getMultipartTempDir();
        const uploadTempDir = join(tempDir, newUploadId);
        await mkdir(uploadTempDir, { recursive: true });

        const uploadState: MultipartUploadState = {
            uploadId: newUploadId,
            bucket: bucket || '',
            filename: filename || '',
            parts: new Map(),
            tempDir: uploadTempDir,
        };
        multipartUploads.set(newUploadId, uploadState);

        // Return XML response with UploadId (AWS S3 format)
        return new Response(
            `<?xml version="1.0" encoding="UTF-8"?>
<InitiateMultipartUploadResult>
    <Bucket>${bucket}</Bucket>
    <Key>${filename}</Key>
    <UploadId>${newUploadId}</UploadId>
</InitiateMultipartUploadResult>`,
            {
                status: 200,
                headers: {
                    'Content-Type': 'application/xml',
                },
            },
        );
    }

    // Handle multipart upload completion
    if (uploadId) {
        const uploadState = multipartUploads.get(uploadId);
        if (!uploadState) {
            return new Response('UploadId not found', { status: 404 });
        }

        // Parse completion request body (XML format from AWS S3)
        const body = await evt.request.text();
        const parts = uploadState.parts;

        // Verify we have all parts (parts should be numbered 1, 2, 3, ...)
        const partNumbers = Array.from(parts.keys()).sort((a, b) => a - b);
        const expectedParts = Array.from({ length: partNumbers.length }, (_, i) => i + 1);
        const hasAllParts = expectedParts.every((num) => parts.has(num));

        if (!hasAllParts) {
            return new Response('Missing parts', { status: 400 });
        }

        // Assemble chunks in order
        const chunks: Uint8Array[] = [];
        for (const partNum of partNumbers) {
            const chunkPath = join(uploadState.tempDir, `part-${partNum}`);
            const chunkData = await readFile(chunkPath);
            chunks.push(new Uint8Array(chunkData));
        }

        // Combine all chunks into final blob
        const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
        const finalBuffer = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
            finalBuffer.set(chunk, offset);
            offset += chunk.length;
        }
        const finalBlob = new Blob([finalBuffer.buffer]);

        // Process the complete file
        if (bucket === 'allpeep-recordings' && filename?.endsWith('.mp4')) {
            const recordingId = filename.replace('.mp4', '');
            const recording = await findJamRecording(recordingId);
            if (!recording) {
                // Cleanup
                await cleanupMultipartUpload(uploadId);
                throw notFound(`Recording with id ${recordingId}`);
            }

            await processCompleteFile(finalBlob, recordingId, recording);

            // Cleanup temporary files
            await cleanupMultipartUpload(uploadId);

            // Return success response (AWS S3 XML format)
            return new Response(
                `<?xml version="1.0" encoding="UTF-8"?>
<CompleteMultipartUploadResult>
    <Location>${url.origin}${url.pathname}</Location>
    <Bucket>${bucket}</Bucket>
    <Key>${filename}</Key>
</CompleteMultipartUploadResult>`,
                {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/xml',
                    },
                },
            );
        }

        // Cleanup if not a recording
        await cleanupMultipartUpload(uploadId);
        return new Response('Not found', { status: 404 });
    }

    return new Response('Invalid request', { status: 400 });
};

// Cleanup multipart upload temporary files
const cleanupMultipartUpload = async (uploadId: string) => {
    const uploadState = multipartUploads.get(uploadId);
    if (uploadState) {
        try {
            // Delete all part files
            const files = await readdir(uploadState.tempDir);
            for (const file of files) {
                await unlink(join(uploadState.tempDir, file));
            }
            // Remove temp directory
            await rmdir(uploadState.tempDir);
        } catch (error) {
            console.error(`Error cleaning up multipart upload ${uploadId}:`, error);
        }
        multipartUploads.delete(uploadId);
    }
};
