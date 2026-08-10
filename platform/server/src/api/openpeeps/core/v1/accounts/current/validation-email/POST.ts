import { ensureAccount } from '#lib/auth';
import { sendEmailValidationMail } from "@openpeepshq/core/accounts";
import { successResponseSchema } from "@openpeepshq/common";
import { endpoint } from '#lib/endpoint';

export const Output = successResponseSchema;

export const apiEndpoint = endpoint({ Output }).handle(async (_, event) => {
    const account = ensureAccount(event);

    await sendEmailValidationMail(account);

    return { success: true };
});