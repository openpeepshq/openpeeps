import { appleAppSiteAssociationSchema } from '@openpeepshq/common';
import { endpoint } from '#lib/endpoint';
import { config } from '@openpeepshq/core/config';

export const Output = appleAppSiteAssociationSchema;

export const apiEndpoint = endpoint({ Output }).handle(() => config().then((config) => ({
    webcredentials: {
        apps: [`${config.apps.ios?.teamId}.${config.apps.ios?.bundleIdentifier}`],
    },
    associateddomains: {
        domains: [config.server.host],
    },


})));
