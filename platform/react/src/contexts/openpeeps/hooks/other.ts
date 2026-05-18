import type { OpenpeepsClient } from '@openpeeps/client';
import type {
    MediaAttachment,
    MediaStorageRequestInput,
    SuccessFailureResponse,
} from '@openpeeps/common';
import { useCallback, useState } from 'react';
import {
    apiHook,
    noPayloadStream,
    payloadMutation,
    payloadProgressMutation,
} from '../helpers';

export type OtherHooks = ReturnType<typeof otherHooks>;

export interface MediaUploadState {
    uploading: boolean;
    uploadPercent: number;
    /** Linear ETA for the byte-transfer phase, in ms. */
    uploadEstimatedRemainingMs?: number;
    attachment?: MediaAttachment;
    error?: SuccessFailureResponse | unknown;
}

export const otherHooks = (client: OpenpeepsClient) => ({
    // Media
    createMediaAttachmentAction: payloadMutation(client.mediaAttachment.create),
    /**
     * Same as {@link createMediaAttachmentAction} but routes through the XHR
     * upload path so callers can pass an `onUploadProgress` callback as the
     * 5th argument to receive byte-level upload progress.
     */
    createMediaAttachmentWithProgressAction: payloadProgressMutation(
        client.mediaAttachment.createWithProgress,
    ),

    /**
     * Returns an `upload` callback and a state object with byte-level upload
     * progress + the partial/ready `MediaAttachment` returned from the server.
     * Pair with `useMediaProgress` (or read `attachment.id`) to track the
     * background processing phase.
     */
    useMediaUpload: () => {
        const [state, setState] = useState<MediaUploadState>({
            uploading: false,
            uploadPercent: 0,
        });
        const [controller, setController] = useState<AbortController | undefined>();

        const upload = useCallback(
            async (input: MediaStorageRequestInput): Promise<MediaAttachment> => {
                const ctrl = new AbortController();
                setController(ctrl);
                setState({ uploading: true, uploadPercent: 0 });
                const result = await client.mediaAttachment.createWithProgress(
                    input,
                    {
                        signal: ctrl.signal,
                        onUploadProgress: ({ percent, estimatedRemainingMs }) =>
                            setState((s) => ({
                                ...s,
                                uploadPercent: percent,
                                uploadEstimatedRemainingMs: estimatedRemainingMs,
                            })),
                    },
                );
                if ('data' in result) {
                    setState({
                        uploading: false,
                        uploadPercent: 100,
                        uploadEstimatedRemainingMs: 0,
                        attachment: result.data,
                    });
                    return result.data;
                }
                setState({
                    uploading: false,
                    uploadPercent: 0,
                    error: result.error,
                });
                throw result.error;
            },
            [],
        );

        const abort = useCallback(() => controller?.abort(), [controller]);

        return { state, upload, abort };
    },

    /**
     * Subscribe to the media-processing SSE feed for a single attachment.
     * Returns the latest progress event, with `progressPercent` capped server
     * side at 95% until the worker finishes.
     */
    useMediaProgress: (id: string | undefined) =>
        noPayloadStream(client.mediaAttachment.progress.listen).last({
            pathParameters: id ? { id } : ({} as { id: string }),
        }),

    // Server
    useServerInfo: () => apiHook(client.server.info),

    // SSO
    authenticateGenericSSOAction: payloadMutation(
        client.sso.generic.authenticate
    ),

    // Link Preview
    usePreviewLink: (url: string) =>
        apiHook(client.previewLink, { pathParams: { url } }),

    useGeocode: (query: string) =>
        client.location.geocode({ queryParameters: { query } }),

    usei18n: (lang: string) =>
        apiHook(client.i18n.translations, { pathParams: { lang } }),

    usei18nLanguages: () => apiHook(client.i18n.languages),

    // Reports
    useReportsList: () => apiHook(client.reports.list),
    useReport: (reportId: string) => apiHook(client.reports.findById, { pathParams: { reportId } }),
    createReportAction: payloadMutation(client.reports.create, [['reports']]),
});
