type PushHandler = (unseen: number) => void | Promise<void>;

let pushHandler: PushHandler | undefined;

export const setNotificationsScreenPushHandler = (handler: PushHandler) => {
  pushHandler = handler;
};

export const clearNotificationsScreenPushHandler = () => {
  pushHandler = undefined;
};

export const handlePushOnNotificationsScreen = async (
  unseen: number,
): Promise<boolean> => {
  if (!pushHandler) {
    return false;
  }
  await pushHandler(unseen);
  return true;
};
