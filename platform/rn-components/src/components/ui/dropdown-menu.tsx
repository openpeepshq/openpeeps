import * as React from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  type StyleProp,
  StyleSheet,
  Text,
  type TextProps,
  View,
  type ViewStyle,
} from 'react-native';
import { Portal } from '@rn-primitives/portal';
import { ThemedView } from './themed-view';

interface DropdownContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerLayout: { x: number; y: number; width: number; height: number } | null;
  setTriggerLayout: (layout: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => void;
  portalName: string;
}

const DropdownContext = React.createContext<DropdownContextType>({
  open: false,
  setOpen: () => {},
  triggerLayout: null,
  setTriggerLayout: () => {},
  portalName: '',
});

export type DropdownMenuRef = {
  close: () => void;
};

export type MenuTriggerLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const MENU_MARGIN = 8;
/** Never clamp the menu below two or so items — a taller menu scrolls. */
const MIN_MENU_HEIGHT = 120;
const MENU_WIDTH = 200;

export interface MenuPlacementInput {
  triggerLayout: MenuTriggerLayout;
  screenHeight: number;
  screenWidth: number;
  menuWidth?: number;
  sideOffset?: number;
  side?: 'top' | 'bottom';
  align?: 'start' | 'end' | 'center';
  margin?: number;
}

export interface MenuPlacement {
  left: number;
  top?: number;
  bottom?: number;
  maxHeight: number;
  effectiveSide: 'top' | 'bottom';
}

/**
 * Computes the absolute placement of a `DropdownMenuContent` for a trigger.
 *
 * A menu that would open below the trigger flips above it when there is less
 * room below than above (Radix-style collision handling, computed from the
 * trigger position — no content measurement). An explicit `side="top"` is
 * never flipped back down. The menu is capped at the viewport space on its
 * chosen side (`maxHeight`) so an overlong menu scrolls instead of leaving
 * the viewport unreachable.
 */
export function computeMenuPlacement({
  triggerLayout,
  screenHeight,
  screenWidth,
  menuWidth = MENU_WIDTH,
  sideOffset = 4,
  side = 'bottom',
  align = 'end',
  margin = MENU_MARGIN,
}: MenuPlacementInput): MenuPlacement {
  let left: number;
  if (align === 'end') {
    left = triggerLayout.x + triggerLayout.width - menuWidth;
  } else if (align === 'start') {
    left = triggerLayout.x;
  } else {
    left = triggerLayout.x + triggerLayout.width / 2 - menuWidth / 2;
  }
  left = Math.max(margin, Math.min(left, screenWidth - menuWidth - margin));

  const spaceBelow =
    screenHeight - triggerLayout.y - triggerLayout.height - sideOffset - margin;
  const spaceAbove = triggerLayout.y - sideOffset - margin;

  const effectiveSide: 'top' | 'bottom' =
    side === 'top' || spaceBelow >= spaceAbove ? side : 'top';

  if (effectiveSide === 'top') {
    return {
      left,
      bottom: screenHeight - triggerLayout.y + sideOffset,
      maxHeight: Math.max(spaceAbove, MIN_MENU_HEIGHT),
      effectiveSide: 'top',
    };
  }
  return {
    left,
    top: triggerLayout.y + triggerLayout.height + sideOffset,
    maxHeight: Math.max(spaceBelow, MIN_MENU_HEIGHT),
    effectiveSide: 'bottom',
  };
}

const DropdownMenu = React.forwardRef<
  DropdownMenuRef,
  {
    children: React.ReactNode;
    onOpenChange?: (open: boolean) => void;
  }
>(function DropdownMenu({ children, onOpenChange }, ref) {
  const [open, setOpen] = React.useState(false);
  const [triggerLayout, setTriggerLayout] = React.useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const portalName = React.useRef(
    `dropdown-${Date.now()}-${Math.random()}`
  ).current;

  const handleSetOpen = React.useCallback(
    (value: boolean) => {
      setOpen(value);
      onOpenChange?.(value);
    },
    [onOpenChange]
  );

  React.useImperativeHandle(
    ref,
    () => ({
      close: () => handleSetOpen(false),
    }),
    [handleSetOpen]
  );

  return (
    <DropdownContext.Provider
      value={{
        open,
        setOpen: handleSetOpen,
        triggerLayout,
        setTriggerLayout,
        portalName,
      }}
    >
      {children}
    </DropdownContext.Provider>
  );
});

DropdownMenu.displayName = 'DropdownMenu';

const DropdownMenuTrigger = ({
  children,
  asChild,
  style,
  className,
}: {
  children: React.ReactNode;
  asChild?: boolean;
  style?: StyleProp<ViewStyle>;
  className?: string;
}) => {
  const { setOpen, open, setTriggerLayout } = React.useContext(DropdownContext);
  const ref = React.useRef<View>(null);

  // The trigger must be re-measured on *every* open. Placement is computed
  // from the trigger's window position (see computeMenuPlacement), and that
  // position changes whenever the trigger scrolls. Caching the last
  // measurement would leave a menu placed at the stale trigger location, so
  // always take a fresh measureInWindow here.
  const handlePress = React.useCallback(() => {
    ref.current?.measureInWindow((x, y, width, height) => {
      setTriggerLayout({ x, y, width, height });
      setOpen(!open);
    });
  }, [open, setOpen, setTriggerLayout]);

  return (
    <View ref={ref} collapsable={false}>
      {asChild && React.isValidElement(children) ? (
        React.cloneElement(
          children as React.ReactElement<Record<string, unknown>>,
          {
            onPress: handlePress,
          }
        )
      ) : (
        <Pressable onPress={handlePress} className={className} style={style}>
          {children}
        </Pressable>
      )}
    </View>
  );
};

const DropdownMenuContent = ({
  children,
  className,
  sideOffset = 4,
  align = 'end',
  side = 'bottom',
}: {
  children: React.ReactNode;
  className?: string;
  sideOffset?: number;
  align?: 'start' | 'end' | 'center';
  /** `top` opens the menu above the trigger (drop-up for bottom toolbars). */
  side?: 'top' | 'bottom';
}) => {
  const { open, setOpen, triggerLayout, portalName } =
    React.useContext(DropdownContext);
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  if (!open || !triggerLayout) return null;

  const { effectiveSide: _effectiveSide, ...placementStyle } =
    computeMenuPlacement({
      triggerLayout,
      screenHeight,
      screenWidth,
      sideOffset,
      align,
      side,
    });

  return (
    <Portal name={portalName}>
      {open && (
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => setOpen(false)}
        />
      )}
      <ThemedView
        className={`p-4 ${className}`}
        style={[
          styles.content,
          { ...placementStyle, width: MENU_WIDTH },
          !open && styles.hidden,
        ]}
      >
        <ScrollView
          style={{ maxHeight: placementStyle.maxHeight }}
          contentContainerStyle={{ flexGrow: 0 }}
        >
          {children}
        </ScrollView>
      </ThemedView>
    </Portal>
  );
};

const DropdownMenuGroup = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => <View className={className}>{children}</View>;

const DropdownMenuItem = ({
  children,
  onPress,
  className,
  disabled,
  closeOnPress = true,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  className?: string;
  disabled?: boolean;
  /** When false, the menu stays open until you call `ref.current.close()` on DropdownMenu. */
  closeOnPress?: boolean;
  inset?: boolean;
}) => {
  const { setOpen } = React.useContext(DropdownContext);

  const handlePress = React.useCallback(() => {
    if (closeOnPress) {
      setOpen(false);
    }
    onPress?.();
  }, [closeOnPress, onPress, setOpen]);

  return (
    <Pressable
      className={`mb-2 ${className}`}
      onPress={handlePress}
      disabled={disabled}
    >
      {children}
    </Pressable>
  );
};

DropdownMenuItem.displayName = 'DropdownMenuItem';

const DropdownMenuSeparator = ({
  style,
  className,
}: {
  style?: StyleProp<ViewStyle>;
  className?: string;
}) => <View style={[styles.separator, style]} className={className} />;

const DropdownMenuLabel = ({
  children,
  style,
  className,
  inset,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  className?: string;
  inset?: boolean;
}) => (
  <Text
    style={[styles.label, inset && styles.itemInset, style]}
    className={className}
  >
    {children}
  </Text>
);

const DropdownMenuShortcut = (props: TextProps) => <Text {...props} />;
DropdownMenuShortcut.displayName = 'DropdownMenuShortcut';

const DropdownMenuPortal = ({ children }: { children: React.ReactNode }) => (
  <>{children}</>
);
const DropdownMenuSub = ({ children }: { children: React.ReactNode }) => (
  <>{children}</>
);
const DropdownMenuSubTrigger = ({
  children,
}: {
  children: React.ReactNode;
}) => <>{children}</>;
const DropdownMenuSubContent = ({
  children,
}: {
  children: React.ReactNode;
}) => <>{children}</>;
const DropdownMenuRadioGroup = ({
  children,
}: {
  children: React.ReactNode;
}) => <>{children}</>;
const DropdownMenuRadioItem = ({ children }: { children: React.ReactNode }) => (
  <>{children}</>
);
const DropdownMenuCheckboxItem = ({
  children,
}: {
  children: React.ReactNode;
}) => <>{children}</>;

const styles = StyleSheet.create({
  hidden: { display: 'none' },
  content: {
    position: 'absolute',
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 9999,
    paddingVertical: 4,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  itemInset: {
    paddingLeft: 32,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.08)',
    marginVertical: 4,
    marginHorizontal: 8,
  },
  label: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
  },
});

export {
  DropdownContext,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
};
