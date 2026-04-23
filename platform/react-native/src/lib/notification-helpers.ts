import notifee from '@notifee/react-native';

export async function setAppBadgeCount(count: number) {
  await notifee.setBadgeCount(count);
  console.log('Badge count set to:', count);
}

export async function incrementAppBadgeCount() {
  await notifee.incrementBadgeCount();
  const currentCount = await notifee.getBadgeCount();
  console.log('Badge count incremented to:', currentCount);
}

export async function clearAppBadgeCount() {
  await notifee.setBadgeCount(0);
  console.log('Badge count cleared!');
}
