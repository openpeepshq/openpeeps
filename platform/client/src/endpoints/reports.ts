import type { FetchClient } from '@openpeeps/fetch-client';
import type {
    ReportCreationData,
    PublicReport,
    SuccessResponse,
} from '@openpeeps/common';
import { allpeepNoPayloadEndpoint, allpeepPayloadEndpoint } from './helpers';

export const reports = (rawClient: FetchClient) => ({
    list: allpeepNoPayloadEndpoint<PublicReport[]>(
        rawClient,
        '/reports',
    ),
    findById: allpeepNoPayloadEndpoint<PublicReport, { reportId: string }>(
        rawClient,
        '/reports/:reportId',
    ),
    create: allpeepPayloadEndpoint<PublicReport, ReportCreationData>(
        rawClient,
        '/reports',
    ),
    update: allpeepPayloadEndpoint<PublicReport, Partial<ReportCreationData>, { id: string }>(
        rawClient,
        '/reports/:id',
        'patch',
    ),
    delete: allpeepNoPayloadEndpoint<SuccessResponse, { id: string }>(
        rawClient,
        '/reports/:id',
        'delete',
    ),
}); 