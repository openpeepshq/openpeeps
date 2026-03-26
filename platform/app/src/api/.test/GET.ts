import { Endpoint, z } from "sveltekit-api";

export default new Endpoint({
    Output: z.object({
        success: z.boolean(),
    })
}).handle(async () => ({
    success: true,
}));

