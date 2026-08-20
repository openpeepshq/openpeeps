import { Linking } from 'react-native';

export const downloadDocument = async (url: string) => {
    try {
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
            await Linking.openURL(url);
        }
    } catch (error) {
        console.error('Error opening URL:', error);
    }
};