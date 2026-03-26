import { InviteLinkData, InviteLinkWithMeta, PublicProfile } from "@openpeeps/common/types";
import { createInviteLinkConnector, redeemInviteLinkConnector } from "./helpers";
import { inviteLinksMapping } from "./mapping";
import { allpeepDb } from "../db";
import { throwIfUndefined } from "../lib/utils";

export const createInviteLink = async (inviteLinkData: InviteLinkData, profile: PublicProfile) => {
    const db = await allpeepDb().then(db => db.db);
    const bareInviteLink = await inviteLinksMapping.create(db, inviteLinkData);
    await createInviteLinkConnector(db, profile, bareInviteLink);
    return throwIfUndefined(await inviteLinksMapping.find(db, bareInviteLink.id));
}

export const updateInviteLink = async (id: string, inviteLinkData: Partial<InviteLinkData>) => {
    const db = await allpeepDb().then(db => db.db);
    return inviteLinksMapping.update(db, id, inviteLinkData);
}

export const redeemInviteLink = async (inviteLink: InviteLinkWithMeta, profile: PublicProfile) => {

    if (inviteLink.profile?.id === profile.id) {
        throw new Error('Invite link creator and redeemer cannot be the same');
    }

    return allpeepDb().then(({ db }) => redeemInviteLinkConnector(db, profile, inviteLink));
}