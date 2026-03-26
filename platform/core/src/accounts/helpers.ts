import { AccountWithMeta } from "@openpeeps/common/types";
import { jwtUtil } from "../jwt";
import { emailService } from "../email";
import { serverRootUrl } from "../server";
import { logger } from "../log";
import { getProfiles } from "../profiles/cache";

export const log = logger('core:accounts');


export const normalizeEmailAddress = (email?: string) => email?.toLowerCase();

export const createEmailValidationToken = async (account: AccountWithMeta) => {
    return jwtUtil().then((jwt) => jwt.sign({ email: account.email }, '2d'));
};

export const sendWelcomeEmail = async (account: AccountWithMeta) => {
    const email = await emailService();

    await email.send({
        template: 'welcome',
        to: account.email,
    });
}

export const sendEmailValidationMail = async (account: AccountWithMeta) => {
    const emailValidationToken = await createEmailValidationToken(account);
    const email = await emailService();

    const emailValidationLink = `${await serverRootUrl()}/auth/validate-email?token=${emailValidationToken}`;

    await email.send({
        template: 'validateEmail',
        locals: {
            emailValidationLink,
        },
        to: account.email,
    });
};


export const expandAccount = async (account?: AccountWithMeta): Promise<AccountWithMeta | undefined> =>
    account ? {
        ...account,
        profiles: await getProfiles(account.profiles.map((p) => p.id)),
    } : undefined;