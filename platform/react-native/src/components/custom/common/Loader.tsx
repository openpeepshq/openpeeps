import React from 'react';
import { View } from 'react-native';
import { ThemedView } from '../../ui/themed-view';
import { Skeleton } from '~/components/ui/skeleton';

interface LoaderProps {
  page: 'community' | 'jams' | 'large';
}

export const CustomLoader = ({ page }: LoaderProps) => {
  return (
    <ThemedView className="flex-1 h-full items-center justify-center p-4">
      {page === 'community' && (
        <View className="w-full h-full my-4">
          {/* Profile header */}
          <View className="flex-row items-center mb-8">
            <Skeleton className="h-12 w-12 rounded-full" />
            <View className="ml-3">
              <Skeleton className="h-5 w-32 rounded-md mb-2" />
              <Skeleton className="h-4 w-20 rounded-md" />
            </View>
          </View>

          {/* Media placeholder */}
          <Skeleton className="rounded-lg mb-8 w-full h-96" />

          {/* Content area */}
          <Skeleton className="h-5 w-full rounded-md mb-3" />
          <Skeleton className="h-5 w-4/5 rounded-md mb-8" />

          {/* Action buttons */}
          <View className="flex-row justify-between">
            <Skeleton className="h-8 w-32 rounded-md" />
            <Skeleton className="h-8 w-32 rounded-md" />
            <Skeleton className="h-8 w-32 rounded-md" />
          </View>
        </View>
      )}
      {page === 'jams' && (
        <View className="w-full">
          {/* Profile header */}
          <View className="flex-row items-center mb-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <View className="ml-3">
              <Skeleton className="h-5 w-32 rounded-md mb-2" />
              <Skeleton className="h-4 w-20 rounded-md" />
            </View>
          </View>

          {/* Content area */}
          <Skeleton className="h-5 w-full rounded-md mb-2" />
          <Skeleton className="h-5 w-4/5 rounded-md mb-4" />

          {/* Media placeholder */}
          <Skeleton className="rounded-lg mb-4 w-full h-full" />

          {/* Action buttons */}
          <View className="flex-row justify-between">
            <Skeleton className="h-8 w-32 rounded-md" />
            <Skeleton className="h-8 w-32 rounded-md" />
            <Skeleton className="h-8 w-32 rounded-md" />
          </View>
        </View>
      )}
    </ThemedView>
  );
};
