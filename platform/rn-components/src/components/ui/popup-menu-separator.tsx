import * as React from 'react';
import { View } from 'react-native';
import { DropdownMenuSeparator } from './dropdown-menu';

/**
 * Separator for PopupMenu, mirrors @openpeepshq/react-ui's PopupSeparator.
 */
export const PopupSeparator = () => {
  return <DropdownMenuSeparator className="my-1" />;
};
