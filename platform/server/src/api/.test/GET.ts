import { endpoint, z } from '#lib/endpoint';

export const apiEndpoint = endpoint({
    Output: z.object({
        success: z.boolean(),
    })
}).handle(async () => ({
    success: true,
}));

