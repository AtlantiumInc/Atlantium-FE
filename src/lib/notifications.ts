/**
 * Browser Notifications API utilities
 */

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('Notifications not supported in this browser');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('Failed to request notification permission:', error);
    return false;
  }
}

export function isNotificationPermissionGranted(): boolean {
  if (!('Notification' in window)) {
    return false;
  }
  return Notification.permission === 'granted';
}

export function showNotification(title: string, options?: NotificationOptions): void {
  if (!isNotificationPermissionGranted()) {
    console.warn('Notification permission not granted');
    return;
  }

  try {
    new Notification(title, options);
  } catch (error) {
    console.error('Failed to show notification:', error);
  }
}

export function showMessageNotification(senderName: string, messagePreview: string): void {
  showNotification(`New message from ${senderName}`, {
    body: messagePreview,
    icon: '/logo.png',
    badge: '/logo.png',
    tag: 'inbox-message',
    requireInteraction: false,
  });
}
