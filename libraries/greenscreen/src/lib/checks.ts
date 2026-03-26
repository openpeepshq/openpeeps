export const checkBrowserSupport = () => {
  if (
    !MediaStreamTrack.prototype.getSettings &&
    !MediaStreamTrack.prototype.getConstraints
  ) {
    throw new Error('Media API does not support background effects!');
  }
};
