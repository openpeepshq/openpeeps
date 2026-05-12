import * as React from 'react';
import {
  Dimensions,
  Pressable,
  type StyleProp,
  StyleSheet,
  Text,
  type TextProps,
  View,
  type ViewStyle,
  useColorScheme,
} from 'react-native';
import {Portal} from '@rn-primitives/portal';
import {ThemedView} from './themed-view';

interface DropdownContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerLayout: {x: number; y: number; width: number; height: number} | null;
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

const DropdownMenu = React.forwardRef<
  DropdownMenuRef,
  {
    children: React.ReactNode;
    onOpenChange?: (open: boolean) => void;
  }
>(function DropdownMenu({children, onOpenChange}, ref) {
  const [open, setOpen] = React.useState(false);
  const [triggerLayout, setTriggerLayout] = React.useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const portalName = React.useRef(
    `dropdown-${Date.now()}-${Math.random()}`,
  ).current;

  const handleSetOpen = React.useCallback(
    (value: boolean) => {
      setOpen(value);
      onOpenChange?.(value);
    },
    [onOpenChange],
  );

  React.useImperativeHandle(
    ref,
    () => ({
      close: () => handleSetOpen(false),
    }),
    [handleSetOpen],
  );

  return (
    <DropdownContext.Provider
      value={{
        open,
        setOpen: handleSetOpen,
        triggerLayout,
        setTriggerLayout,
        portalName,
      }}>
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
  const {setOpen, open, setTriggerLayout} = React.useContext(DropdownContext);
  const ref = React.useRef<View>(null);

  const handlePress = React.useCallback(() => {
    ref.current?.measureInWindow((x, y, width, height) => {
      setTriggerLayout({x, y, width, height});
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
          },
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
}: {
  children: React.ReactNode;
  className?: string;
  sideOffset?: number;
  align?: 'start' | 'end' | 'center';
}) => {
  const {open, setOpen, triggerLayout, portalName} =
    React.useContext(DropdownContext);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const {width: screenWidth} = Dimensions.get('window');

  const menuWidth = 200;

  if (!open || !triggerLayout) return null;

  let left: number;
  if (align === 'end') {
    left = triggerLayout.x + triggerLayout.width - menuWidth;
  } else if (align === 'start') {
    left = triggerLayout.x;
  } else {
    left = triggerLayout.x + triggerLayout.width / 2 - menuWidth / 2;
  }
  left = Math.max(8, Math.min(left, screenWidth - menuWidth - 8));
  const top = triggerLayout.y + triggerLayout.height + sideOffset;

  if (!triggerLayout && !open) return null;

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
          {top, left, width: menuWidth},
          !open && {display: 'none'},
        ]}>
        {children}
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
  const {setOpen} = React.useContext(DropdownContext);

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
      disabled={disabled}>
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
  <Text style={[styles.label, inset && styles.itemInset, style]}>
    {children}
  </Text>
);

const DropdownMenuShortcut = ({className, ...props}: TextProps) => (
  <Text className={className} {...props} />
);
DropdownMenuShortcut.displayName = 'DropdownMenuShortcut';

const DropdownMenuPortal = ({children}: {children: React.ReactNode}) => (
  <>{children}</>
);
const DropdownMenuSub = ({children}: {children: React.ReactNode}) => (
  <>{children}</>
);
const DropdownMenuSubTrigger = ({children}: {children: React.ReactNode}) => (
  <>{children}</>
);
const DropdownMenuSubContent = ({children}: {children: React.ReactNode}) => (
  <>{children}</>
);
const DropdownMenuRadioGroup = ({children}: {children: React.ReactNode}) => (
  <>{children}</>
);
const DropdownMenuRadioItem = ({children}: {children: React.ReactNode}) => (
  <>{children}</>
);
const DropdownMenuCheckboxItem = ({children}: {children: React.ReactNode}) => (
  <>{children}</>
);

const styles = StyleSheet.create({
  content: {
    position: 'absolute',
    borderRadius: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
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
