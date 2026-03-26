import { ensureAccount, ensureLocalProfile } from "$lib/server/auth";
import { sendTestPushNotification } from "@openpeeps/core/notifications";
import { successFailureResponseSchema } from "@openpeeps/common";
import { Endpoint, z } from "sveltekit-api";

export const Output = successFailureResponseSchema;
export const Input = z.object({
    subscriptionKey: z.string(),
});

export default new Endpoint({ Input, Output }).handle(async (input, event) => {
    const account = ensureAccount(event);
    const profile = await ensureLocalProfile(event);
    const subscriptionKey = input.subscriptionKey;

    return sendTestPushNotification(account, profile, subscriptionKey).then(() => ({ success: true })).catch(e => ({ success: false, message: e.message }));
});
