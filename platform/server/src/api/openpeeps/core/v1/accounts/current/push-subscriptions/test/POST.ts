import { ensureAccount, ensureLocalProfile } from '#lib/auth';
import { sendTestPushNotification } from "@openpeeps/core/notifications";
import { successFailureResponseSchema } from "@openpeeps/common";
import { endpoint, z } from '#lib/endpoint';

export const Output = successFailureResponseSchema;
export const Input = z.object({
    subscriptionKey: z.string(),
});

export const apiEndpoint = endpoint({ Input, Output }).handle(async (input, event) => {
    const account = ensureAccount(event);
    const profile = await ensureLocalProfile(event);
    const subscriptionKey = input.subscriptionKey;

    return sendTestPushNotification(account, profile, subscriptionKey).then(() => ({ success: true })).catch(e => ({ success: false, message: e.message }));
});
