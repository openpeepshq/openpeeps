import React, { createContext, useContext } from 'react';
import type { CredentialsContextValue } from './types';
import type { CredentialsStore } from '../../auth/credentials/types';

const CredentialsContext = createContext<CredentialsContextValue | null>(null);

export const useCredentialsStore = () => {
    const context = useContext(CredentialsContext);
    if (!context) {
        throw new Error('useCredentialsStore must be used within a CredentialsStoreProvider');
    }
    return context;
};

export const CredentialsStoreProvider: React.FC<{ children: React.ReactNode, credentialsStore: CredentialsStore }> = ({ children, credentialsStore }) => {

    return (
        <CredentialsContext.Provider value={{ credentialsStore }}>
            {children}
        </CredentialsContext.Provider>
    );
}; 