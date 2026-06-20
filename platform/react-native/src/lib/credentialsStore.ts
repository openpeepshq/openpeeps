import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CredentialsStore, Credentials } from '@openpeeps/react';
import { notifyCredentialsChanged } from '@openpeeps/react';

const CREDENTIALS_KEY = 'credentials';

export const credentialsStore: CredentialsStore = {
  get: async () => {
    const credentials = await AsyncStorage.getItem(CREDENTIALS_KEY);
    return credentials ? JSON.parse(credentials) : null;
  },
  set: async (credentials: Credentials | null) => {
    await AsyncStorage.setItem(CREDENTIALS_KEY, JSON.stringify(credentials));
    notifyCredentialsChanged();
  },
  clear: async () => {
    await AsyncStorage.removeItem(CREDENTIALS_KEY);
    notifyCredentialsChanged();
  },
};
