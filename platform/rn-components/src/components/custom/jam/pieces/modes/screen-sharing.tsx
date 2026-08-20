import { View, ScrollView, TouchableOpacity, Text } from 'react-native';
import React, { useState, useMemo, useEffect } from 'react';
import { ParticipantView } from '../participant-view';
import {
  TrackReferenceOrPlaceholder,
  VideoTrack,
  useParticipantInfo,
  useEnsureTrackRef,
} from '@livekit/react-native';
import { ThemedText } from '~/components/ui/themed-text';
import { Track } from 'livekit-client';
import { Profile } from '@openpeepshq/common';
import { MetadataType } from '~/types';
import { useOpenpeeps } from '@openpeepshq/react';
import { truncateText } from '~/lib/utils';
import { ScreenShareIcon } from '~/components/icons';
import { Button } from '~/components/ui/button';
import { ProfileAvatar } from '~/components/custom/profile/profile-avatar';

const ITEMS_PER_PAGE = 4;

export interface ScreenSharingProps {
  stableTracks: TrackReferenceOrPlaceholder[];
}

export const ScreenSharing: React.FC<ScreenSharingProps> = ({
  stableTracks,
}) => {
  const [currentPage, setCurrentPage] = useState(0);

  // Extract the screen share track
  const screenShareTrack = stableTracks.find(
    track =>
      track.participant.getTrackPublication(Track.Source.ScreenShare)
        ?.isSubscribed && track.source === 'screen_share',
  );

  // Filter out the screen share track from the participant list
  const participantTracks = stableTracks.filter(
    track => track !== screenShareTrack && track.source === 'camera',
  );

  // Ensure totalPages calculation is accurate
  const totalPages = Math.max(
    1,
    Math.ceil(participantTracks.length / ITEMS_PER_PAGE),
  );

  // Memoized paginated tracks to prevent unnecessary re-renders
  const paginatedTracks = useMemo(() => {
    return participantTracks.slice(
      currentPage * ITEMS_PER_PAGE,
      (currentPage + 1) * ITEMS_PER_PAGE,
    );
  }, [participantTracks, currentPage]);

  return (
    <>
      <View className="flex-1 p-2">
        <ScrollView
          // scrollEnabled={true}
          // horizontal={true}
          contentContainerStyle={{ flexGrow: 1 }}
          showsHorizontalScrollIndicator={false}
          className="flex-1">
          {/* Render screen share track if available */}
          {screenShareTrack ? (
            <ScreenShareComponent track={screenShareTrack} />
          ) : (
            <Text className="text-center text-gray-500">
              No screen share active
            </Text>
          )}

          {/* Render Participants */}
          <View className="flex-1 flex-row flex-wrap gap-y-5 justify-between items-center px-4">
            {paginatedTracks.map((trackRef, index) => (
              <ParticipantView
                trackRef={trackRef}
                key={`${trackRef.participant.identity}-${index}`}
              />
            ))}
          </View>
        </ScrollView>
      </View>

      {totalPages > 1 && (
        <View className="flex-row justify-between items-center space-x-4">
          {/* Previous Button */}
          <TouchableOpacity
            disabled={currentPage === 0}
            onPress={() => setCurrentPage(prev => Math.max(0, prev - 1))}
            className="p-2 bg-gray-300 rounded-md disabled:opacity-50">
            <Text>Previous</Text>
          </TouchableOpacity>

          {/* Pagination Dots */}
          <View className="flex-row items-center space-x-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageIndex = i;

              // Ensure dots adjust dynamically when totalPages > 5
              if (totalPages > 5) {
                if (currentPage > 2 && currentPage < totalPages - 2) {
                  pageIndex = currentPage - 2 + i;
                } else if (currentPage >= totalPages - 2) {
                  pageIndex = totalPages - 5 + i;
                }
              }

              return (
                <TouchableOpacity
                  key={pageIndex}
                  onPress={() => setCurrentPage(pageIndex)}
                  className={`w-3 h-3 p-2 mx-1 rounded-full ${currentPage === pageIndex
                      ? 'bg-foreground'
                      : 'bg-muted-foreground'
                    }`}
                />
              );
            })}
          </View>

          {/* Next Button */}
          <TouchableOpacity
            disabled={currentPage >= totalPages - 1}
            onPress={() =>
              setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))
            }
            className="p-2 bg-gray-300 rounded-md disabled:opacity-50">
            <Text>Next</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
};

interface ScreenShareComponentProps {
  track: TrackReferenceOrPlaceholder;
}

const ScreenShareComponent: React.FC<ScreenShareComponentProps> = ({ track }) => {
  const { currentProfile } = useOpenpeeps();
  const trackReference = useEnsureTrackRef(track);
  const { metadata } = useParticipantInfo({
    participant: trackReference.participant,
  });
  const [profile, setProfile] = React.useState<Profile | undefined>(undefined);

  useEffect(() => {
    const parsedMetadata: MetadataType = JSON.parse(metadata || '{}');
    setProfile(parsedMetadata.profile);
  }, [metadata]);

  return (
    <>
      <View className="flex-row gap-x-4 items-center mb-2">
        {profile?.id === currentProfile?.id ? (
          <>
            <ScreenShareIcon className="text-foreground" />
            <ThemedText className="text-foreground text-base font-medium text-wrap">
              {truncateText(profile?.displayName || `@${profile?.handle}`, 20)}{' '}
              (You are Presenting)
            </ThemedText>
            <Button>
              <ThemedText className="">Stop Sharing</ThemedText>
            </Button>
          </>
        ) : (
          <>
            <ProfileAvatar profile={profile as Profile} />
            <ThemedText className="text-foreground text-base font-medium text-wrap">
              {truncateText(profile?.displayName || `@${profile?.handle}`, 20)}{' '}
              (Presenting)
            </ThemedText>
          </>
        )}
      </View>
      <View className="h-[250px] w-full rounded-lg mb-4">
        {track.publication?.isSubscribed ? (
          <VideoTrack
            trackRef={track}
            objectFit="cover"
            style={{
              width: '100%',
              height: '100%',
            }}
          />
        ) : (
          <ThemedText className="text-center text-foreground mt-5">
            Loading screen share...
          </ThemedText>
        )}
      </View>
    </>
  );
};
