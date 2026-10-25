import * as React from 'react';
import { ActivityIndicator } from 'react-native';
import { DropdownMenuItem } from './dropdown-menu';
import { ThemedText } from './themed-text';
import { cn } from '../../lib/utils';
import { handleInternalURLNavigation } from '../../lib/utils';
import { buildGoto } from '../navigation/helpers';
import { useNavigation } from '@react-navigation/native';
import { MainStackParamList } from '../navigation/types/index';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type ButtonAction = string | (() => unknown | Promise<unknown>);
export type IconType = React.ElementType;

export interface PopupMenuButtonProps {
  action: ButtonAction;
  text?: string;
  loadingText?: string;
  icon?: IconType;
  danger?: boolean;
  compact?: boolean;
  title?: string;
  textSlot?: React.ReactNode;
  /** When false, the menu stays open after pressing (use for async actions). */
  closeOnPress?: boolean;
  /** Disable the button. */
  disabled?: boolean;
}

const baseClass =
  'flex w-full items-center gap-x-2 rounded-button p-2 text-left';

/**
 * Menu item button that mirrors @openpeepshq/react-ui's PopupMenuButton.
 * Accepts `action` as a URL string (navigated via the router adapter) or a
 * callback function (invoked on press with loading state).
 */
export const PopupMenuButton = ({
  action,
  text = '',
  loadingText: _loadingText = '',
  icon: Icon,
  danger = false,
  compact = false,
  title: _title = '',
  textSlot,
  closeOnPress = true,
  disabled,
}: PopupMenuButtonProps) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  const handlePress = React.useCallback(async () => {
    if (typeof action === 'string') {
      void handleInternalURLNavigation(action, buildGoto(navigation));
      return;
    }
    setIsLoading(true);
    try {
      await action();
    } finally {
      setIsLoading(false);
    }
  }, [action, navigation]);

  const content = isLoading ? (
    <ActivityIndicator size="small" />
  ) : (
    <>
      {Icon && <Icon size={16} className="shrink-0" />}
      {!compact && (
        <ThemedText
          className={cn(
            'flex-1',
            danger ? 'text-destructive' : 'text-foreground'
          )}
        >
          {textSlot ?? text}
        </ThemedText>
      )}
    </>
  );

  return (
    <DropdownMenuItem
      onPress={() => void handlePress()}
      closeOnPress={closeOnPress}
      disabled={disabled ?? isLoading}
      className={cn(
        baseClass,
        danger && 'text-destructive',
        compact && 'justify-center'
      )}
    >
      {content}
    </DropdownMenuItem>
  );
};
