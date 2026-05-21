import { payloadMutation } from "./helpers";

import { client } from "./helpers";

import { simpleStore } from "./helpers";

export const reportsStore = () => simpleStore(client.reports.list);

export const reportStore = (id: string) =>
    simpleStore(client.reports.findById, { pathParams: { reportId: id } });

export const createReportMutation = payloadMutation(client.reports.create, {
    queryKeys: [['reports']]
});