let pendingPushAction: string | undefined;

export const setPendingPushAction = (action: string) => {
  pendingPushAction = action;
};

export const consumePendingPushAction = (): string | undefined => {
  const action = pendingPushAction;
  pendingPushAction = undefined;
  return action;
};
