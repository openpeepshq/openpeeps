import { ensureAccount } from "$lib/server/auth";
import { sendEmailValidationMail } from "@openpeeps/core/accounts";
import { successResponseSchema } from "@openpeeps/common";
import { Endpoint } from "sveltekit-api";

export const Output = successResponseSchema;

export default new Endpoint({ Output }).handle(async (_, event) => {
    const account = ensureAccount(event);

    await sendEmailValidationMail(account);

    return { success: true };
});