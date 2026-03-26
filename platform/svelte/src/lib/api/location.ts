import { authenticatedCoreApiClient } from "./base";
import { client, throwError } from "./helpers";

export const geocode = (query: string) => client.location.geocode({ queryParameters: { query }, fetchClient: authenticatedCoreApiClient() }).then(throwError());