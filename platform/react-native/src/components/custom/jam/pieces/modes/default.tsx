import { View, ScrollView, TouchableOpacity, Text } from 'react-native';
import React, { useState } from 'react';
import { ParticipantView } from '../participant-view';
import { TrackReferenceOrPlaceholder } from '@livekit/react-native';

const ITEMS_PER_PAGE = 6;

interface DefaultProps {
  stableTracks: TrackReferenceOrPlaceholder[];
}

export const Default: React.FC<DefaultProps> = ({
  stableTracks,
}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const filteredTracks = stableTracks.filter(track => {
    return track.source === 'camera';
  });
  const totalPages = Math.ceil(filteredTracks.length / ITEMS_PER_PAGE);

  const paginatedTracks = filteredTracks.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE,
  );
  return (
    <>
      <View className="flex-1 p-2">
        <ScrollView
          scrollEnabled={true}
          contentContainerStyle={{ flexGrow: 1 }}
          showsHorizontalScrollIndicator={false}
          className=" flex-1">
          <View className="flex-1 flex-row flex-wrap gap-y-3 justify-between items-center ">
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
