import type { OpenpeepsClient } from '@openpeeps/client';
import { apiHook, payloadMutation } from '../helpers';

export type OtherHooks = ReturnType<typeof otherHooks>;

export const otherHooks = (client: OpenpeepsClient) => ({
    // Media
    createMediaAttachmentAction: payloadMutation(client.mediaAttachment.create),

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