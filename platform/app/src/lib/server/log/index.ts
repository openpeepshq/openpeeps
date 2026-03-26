import { logger } from "@openpeeps/core/log";
import debug from "debug";

export const initLibraryLogging = () => {
    const apiLog = logger('app:api');
    debug.enable('api:api:error');

    debug.log = (...args) => {
        apiLog.error(args[0].replaceAll('api:api:error ', ''));
    };
}