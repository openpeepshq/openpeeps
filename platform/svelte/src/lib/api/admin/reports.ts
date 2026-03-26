import { client, simpleStore, payloadMutation, noPayloadMutation } from "../helpers";

export const adminReportsStore = () => simpleStore(client.admin.reports.list);

export const adminReportStore = (id: string) =>
    simpleStore(client.admin.reports.findById, { pathParams: { reportId: id } });


export const resolveReportMutation = payloadMutation(client.admin.reports.resolve, {
    queryKeys: [['admin', 'reports']]
});

export const reopenReportMutation = noPayloadMutation(client.admin.reports.reopen, {
    queryKeys: [['admin', 'reports']]
});