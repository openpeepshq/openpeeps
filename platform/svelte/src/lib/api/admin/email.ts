import { client, payloadMutation, simpleStore } from '../helpers';

export const emailQueueStatsStore = () =>
  simpleStore(client.admin.diagnostics.email.queueStats, {
    refetchInterval: 60_000,
  });

export const sendTestEmailMutation = payloadMutation(
  client.admin.configuration.email.sendTest,
  {
    queryKeys: [['admin', 'diagnostics', 'email']],
  },
);

export const queueTestEmailMutation = payloadMutation(
  client.admin.diagnostics.email.queueTest,
  {
    queryKeys: [['admin', 'diagnostics', 'email']],
  },
);
