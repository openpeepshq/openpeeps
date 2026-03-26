import { appleAppSiteAssociationSchema } from '@openpeeps/common';
import { Endpoint } from 'sveltekit-api';
import { config } from '@openpeeps/core/config';

export const Output = appleAppSiteAssociationSchema;

export default new Endpoint({ Output }).handle(() => config().then((config) => ({
    webcredentials: {
        apps: [`${config.apps.ios?.teamId}.${config.apps.ios?.bundleIdentifier}`],
    },
    associateddomains: {
        domains: [config.server.host],
    },


})));
