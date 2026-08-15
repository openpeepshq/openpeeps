import * as AvatarPrimitive from '@rn-primitives/avatar';
import * as React from 'react';
import type { ImageSourcePropType, ImageURISource } from 'react-native';
import { useCachedMediaUri } from '~/hooks/use-cached-media-uri';
import { cn } from '~/lib/utils';

const remoteUriFromSource = (
  source: ImageSourcePropType | undefined
): string | undefined => {
  if (!source || typeof source === 'number' || Array.isArray(source)) {
    return undefined;
  }
  return typeof source.uri === 'string' ? source.uri : undefined;
};

const AvatarPrimitiveRoot = AvatarPrimitive.Root;
const AvatarPrimitiveImage = AvatarPrimitive.Image;
const AvatarPrimitiveFallback = AvatarPrimitive.Fallback;

const Avatar = React.forwardRef<
  AvatarPrimitive.RootRef,
  AvatarPrimitive.RootProps
>(({ className, ...props }, ref) => (
  <AvatarPrimitiveRoot
    ref={ref}
    className={cn(
      'relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full',
      className
    )}
    {...props}
  />
));
Avatar.displayName = AvatarPrimitiveRoot.displayName;

const AvatarImage = React.forwardRef<
  AvatarPrimitive.ImageRef,
  AvatarPrimitive.ImageProps
>(({ className, source, ...props }, ref) => {
  const remoteUri = remoteUriFromSource(
    source as ImageSourcePropType | undefined
  );
  const cachedUri = useCachedMediaUri(remoteUri);
  const resolvedSource =
    remoteUri &&
    cachedUri &&
    source &&
    typeof source === 'object' &&
    !Array.isArray(source)
      ? { ...(source as ImageURISource), uri: cachedUri }
      : source;

  return (
    <AvatarPrimitiveImage
      ref={ref}
      className={cn('aspect-square h-full w-full', className)}
      {...props}
      source={resolvedSource}
    />
  );
});
AvatarImage.displayName = AvatarPrimitiveImage.displayName;

const AvatarFallback = React.forwardRef<
  AvatarPrimitive.FallbackRef,
  AvatarPrimitive.FallbackProps
>(({ className, ...props }, ref) => (
  <AvatarPrimitiveFallback
    ref={ref}
    className={cn(
      'flex h-full w-full items-center justify-center rounded-full bg-surface',
      className
    )}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitiveFallback.displayName;

export { Avatar, AvatarFallback, AvatarImage };
