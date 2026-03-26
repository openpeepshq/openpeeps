import { config } from '@openpeeps/core/config';
import { json } from '@sveltejs/kit';

export const GET = () => config().then((config) => ({
    webcredentials: {
        apps: [`${config.apps.ios?.teamId}.${config.apps.ios?.bundleIdentifier}`],
    },
    associateddomains: {
        domains: [config.server.host],
    },


})).then(json);
