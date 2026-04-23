import React from 'react';
import { MediaAttachmentData, PublicProfile } from '@openpeeps/common';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PlayIcon } from 'lucide-react-native';
import { View } from 'react-native';
import { CachedImage } from '~/components/custom/common';
import { MainStackParamList } from '~/components/navigation/types';
import { Button } from '~/components/ui/button';

interface GalleryVideoProps {
    attachment: MediaAttachmentData;
    profile: PublicProfile;
}

export const GalleryVideo = ({ attachment, profile }: GalleryVideoProps) => {
    const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
    return (<View className="size-full relative">
        {attachment.previewUrl && (
            <CachedImage
                url={attachment.previewUrl ?? ''}
                className="size-full"
                resizeMode="cover"
            />
        )}
        <View className="absolute inset-0 justify-center items-center">
            <Button
                onPress={() =>
                    navigation.push('VideoPlayer', {
                        url: attachment.url,
                        title: profile.displayName,
                    })
                }
                className="w-14 native:h-14 rounded-full bg-black/60 justify-center items-center">
                <PlayIcon className="text-white" />
            </Button>
        </View>
    </View>);
};
