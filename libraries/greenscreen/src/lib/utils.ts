export const timeout = <T>(
  milliseconds: number,
  promise: Promise<T>,
  error: Error,
): Promise<T> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(error);

      return;
    }, milliseconds);

    promise.then(resolve, reject);
  });
};

const constraintValueToInteger = (value: ConstrainULong | undefined): number =>
  (typeof value === 'number' ? value : value?.exact) ?? 0;

const constraintValueToDouble = (value: ConstrainDouble | undefined): number =>
  (typeof value === 'number' ? value : value?.exact) ?? 0;

export const getTrackParameters = (
  track: MediaStreamTrack,
): {
  width: number;
  height: number;
  frameRate: number;
} => {
  if (track.getSettings) {
    const data = track.getSettings();
    return {
      width: data.width ?? 0,
      height: data.height ?? 0,
      frameRate: data.frameRate ?? 0,
    };
  } else {
    const data = track.getConstraints();

    return {
      width: constraintValueToInteger(data.width),
      height: constraintValueToInteger(data.height),
      frameRate: constraintValueToDouble(data.frameRate),
    };
  }
};
