/**
 * Capacitor bridge for the custom NotificationAccess native plugin.
 *
 * On the web (browser dev mode) all methods are safe no-ops that return
 * sensible defaults so the UI never crashes during development.
 */
import { registerPlugin } from '@capacitor/core';

const NotificationAccess = registerPlugin('NotificationAccess');

/**
 * Check if notification listener access is enabled.
 * @returns {Promise<{enabled: boolean, status: string, message: string}>}
 */
export async function getNotificationAccessStatus() {
  try {
    return await NotificationAccess.getNotificationAccessStatus();
  } catch {
    // Web fallback
    return { enabled: false, status: 'unavailable', message: 'Only available on Android.' };
  }
}

/**
 * Open Android's notification listener settings screen.
 */
export async function openNotificationAccessSettings() {
  try {
    return await NotificationAccess.openNotificationAccessSettings();
  } catch {
    console.warn('openNotificationAccessSettings not available on this platform');
    return { opened: false };
  }
}

/**
 * Retrieve notifications buffered natively (SharedPreferences).
 * @returns {Promise<{notifications: Array, count: number}>}
 */
export async function getPendingNotifications() {
  try {
    return await NotificationAccess.getPendingNotifications();
  } catch {
    return { notifications: [], count: 0 };
  }
}

/**
 * Clear all locally stored native notification events.
 */
export async function clearStoredNotifications() {
  try {
    return await NotificationAccess.clearStoredNotifications();
  } catch {
    return { cleared: false };
  }
}

/**
 * Subscribe to real-time notification events while the app is open.
 * @param {function} callback - receives a notification event object
 * @returns {Promise<{remove: function}>} - call remove() to unsubscribe
 */
export async function addNotificationListener(callback) {
  try {
    return await NotificationAccess.addListener('phoneNotificationReceived', callback);
  } catch {
    return { remove: () => {} };
  }
}

export default NotificationAccess;
