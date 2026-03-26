import { authenticatedCoreApiClient } from '../base';
import { client, throwError } from '../helpers';

export const getDbToken = () =>
    client.admin.db.token({ fetchClient: authenticatedCoreApiClient() }).then(throwError());
