import * as React from 'react';
import { View } from 'react-native';
import { formatBadgeCount } from '@openpeepshq/common';
import { cn } from '../../lib/utils';
import { ThemedText } from './themed-text';

/**
 * Shared unread-count pill for every RN badge (side menu, group cards,
 * conversation cards).
 *
 * The geometry is native `minWidth`/`height` on purpose: NativeWind's
 * `size-5` compiles to a fixed 20px width, and on native a fixed width is not
 * overridden by `min-w-5` (unlike web, where `min-width` participates in flex
 * layout). A fixed width is exactly what clipped 3-digit counts and the `∞`
 * glyph in issue #2106 — the pill must be allowed to grow.
 */
export const UnreadBadge = ({
  count,
  className,
}: {
  count: number;
  className?: string;
}) => {
  if (count <= 0) {
    return null;
  }
  return (
    <View
      className={cn(
        'bg-destructive items-center justify-center rounded-full px-1',
        className
      )}
      style={{ height: 20, minWidth: 20 }}
    >
      <ThemedText
        className="text-xs font-semibold text-destructive-foreground"
        numberOfLines={1}
      >
        {formatBadgeCount(count)}
      </ThemedText>
    </View>
  );
};
