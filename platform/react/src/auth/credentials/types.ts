import type { Credentials } from "@openpeeps/common/types";

export interface CredentialsStore {
    get: () => Promise<Credentials | null>;
    set: (credentials: Credentials | null) => Promise<void>;
    clear: () => Promise<void>;
}