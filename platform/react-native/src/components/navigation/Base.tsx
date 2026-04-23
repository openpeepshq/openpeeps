import React from 'react';
import { StatusBar } from 'react-native';
import { ThemedView } from '../ui/themed-view';
import { useOpenPeepsTheme } from '../../theme/OpenPeepsThemeProvider';

export const Base: React.FC<{ children: React.ReactNode }> = ({ children }) => {

    const { colors, isDark } = useOpenPeepsTheme();

    return (
        <ThemedView
            style={{
                flex: 1,
                backgroundColor: colors.background,
            }}>
            <StatusBar
                translucent
                barStyle={
                    isDark ? 'light-content' : 'dark-content'
                }
            />
            {children}
        </ThemedView>
    );
};
