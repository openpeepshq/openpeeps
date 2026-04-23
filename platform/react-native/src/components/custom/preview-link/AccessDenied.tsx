import React from 'react';
import { View, Text } from 'react-native';
import { EyeOff } from 'lucide-react-native';
import type { QueryObserverResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

interface AccessDeniedProps {
  message?: string;
  errorMessage?: string;
  queries: QueryObserverResult<unknown, unknown>[];
  error?: React.ReactNode;
}

export const AccessDenied = ({
  queries,
  error,
  message,
  errorMessage = 'An error occurred.',
}: AccessDeniedProps) => {
  const { t } = useTranslation();

  const errorQuery = queries?.find((q) => q.isError);
  const hasError = !!errorQuery;

  // Check if it's a client error (403/404) vs server error
  // For now, we show the access denied message when a query reports an error
  // In a real implementation, you'd check the error status code
  const isClientError = hasError;

  if (isClientError) {
    return (
      <View className="flex flex-col items-center justify-center gap-2">
        <EyeOff size={48} />
        <Text>{message || t('visibility.accessDenied')}</Text>
      </View>
    );
  }

  if (error) {
    return <>{error}</>;
  }

  return <Text>{errorMessage}</Text>;
};

