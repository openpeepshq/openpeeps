import React, { useRef } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { MiniProfileCard } from '../profile/profile-card';
import { PublicProfile } from '@openpeepshq/common';
import { SearchIcon } from '~/components/icons';
import { ThemedText } from '~/components/ui/themed-text';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { ProfilePickerSheet } from '../modals/profile/profile-picker-sheet';

export const ProfileInput = ({ defaultProfiles = [], label, profiles, setProfiles }: { defaultProfiles?: PublicProfile[], label: string, profiles: PublicProfile[], setProfiles: (profiles: PublicProfile[]) => void }) => {

    const profilesPickerModalRef = useRef<BottomSheetModal>(null);

    const updateProfiles = (addedProfiles: PublicProfile[]) => {
        console.log('addedProfiles', addedProfiles);
        console.log('profiles', profiles);
        console.log('defaultProfiles', defaultProfiles);
        setProfiles([...profiles.filter(p => !defaultProfiles.map(dp => dp.id).includes(p.id)), ...defaultProfiles, ...addedProfiles]);
    };

    return (
        <>
            <TouchableOpacity
                className="border border-muted-foreground rounded-md px-2 py-4 mt-4 flex-row items-center gap-x-2"
                onPress={() => profilesPickerModalRef.current?.present()}>
                <SearchIcon className="text-foreground" />
                <ThemedText>{label}</ThemedText>
            </TouchableOpacity>
            {
                profiles.length + defaultProfiles.length > 0 && (
                    <View className="flex flex-row gap-2 flex-wrap my-4">
                        {defaultProfiles.map(profile =>
                            <MiniProfileCard
                                key={profile.id}
                                profile={profile}
                                showAction={false}
                            />)}
                        {profiles.filter(p => !defaultProfiles.map(dp => dp.id).includes(p.id)).map(profile => (
                            <MiniProfileCard
                                key={profile.id}
                                profile={profile}
                                onPress={() => {
                                    const newProfiles = profiles.filter(
                                        p => p.id !== profile.id,
                                    );
                                    setProfiles(newProfiles);
                                }}
                            />
                        ))}
                    </View>
                )
            }
            <ProfilePickerSheet
                ref={profilesPickerModalRef}
                onSelect={updateProfiles}
                selectType="sync"
                title="Select Profiles"
                profilesToExclude={[...profiles, ...defaultProfiles]}
            />
        </>
    );
};
