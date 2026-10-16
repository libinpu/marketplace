package com.userdashboard.app;

import android.app.Notification;
import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.UUID;

/**
 * Listens for notifications posted by OTHER apps on the device.
 * Normalises each notification into a JSON event and persists it in
 * SharedPreferences so the Capacitor bridge can retrieve it even when
 * the WebView is not running.
 *
 * Self-notifications (from com.userdashboard.app) are ignored to avoid loops.
 */
public class PhoneNotificationListenerService extends NotificationListenerService {

    private static final String TAG = "PhoneNotifListener";
    private static final String PREFS_NAME = "phone_notification_events";
    private static final String KEY_EVENTS = "events";
    private static final int MAX_EVENTS = 500;       // rolling cap
    private static final String OWN_PACKAGE = "com.userdashboard.app";

    // ── Static callback for real-time forwarding to the Capacitor plugin ──
    public interface NotificationCallback {
        void onNotificationReceived(JSONObject event);
    }

    private static NotificationCallback sCallback = null;

    public static void setNotificationCallback(NotificationCallback cb) {
        sCallback = cb;
    }

    // ── Lifecycle ──

    @Override
    public void onListenerConnected() {
        Log.i(TAG, "NotificationListenerService connected");
    }

    @Override
    public void onListenerDisconnected() {
        Log.w(TAG, "NotificationListenerService disconnected — requesting rebind");
        requestRebind(new ComponentName(this, PhoneNotificationListenerService.class));
    }

    // ── Core callbacks ──

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        if (sbn == null) return;
        try {
            String pkg = sbn.getPackageName();
            if (OWN_PACKAGE.equals(pkg)) return; // skip own notifications

            JSONObject event = extractEvent(sbn, "posted");
            if (event == null) return;

            persistEvent(event);

            if (sCallback != null) {
                sCallback.onNotificationReceived(event);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error processing posted notification", e);
        }
    }

    @Override
    public void onNotificationRemoved(StatusBarNotification sbn) {
        if (sbn == null) return;
        try {
            String pkg = sbn.getPackageName();
            if (OWN_PACKAGE.equals(pkg)) return;

            JSONObject event = extractEvent(sbn, "removed");
            if (event == null) return;

            persistEvent(event);

            if (sCallback != null) {
                sCallback.onNotificationReceived(event);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error processing removed notification", e);
        }
    }

    // ── Extraction ──

    private JSONObject extractEvent(StatusBarNotification sbn, String eventType) {
        try {
            Notification notification = sbn.getNotification();
            if (notification == null) return null;

            Bundle extras = notification.extras;
            String pkg = sbn.getPackageName();

            // Title
            String title = "";
            if (extras != null) {
                CharSequence t = extras.getCharSequence(Notification.EXTRA_TITLE);
                if (t != null) title = t.toString().trim();
            }

            // Text — try several extras
            String text = "";
            if (extras != null) {
                // Big text
                CharSequence bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT);
                if (bigText != null && bigText.length() > 0) {
                    text = bigText.toString().trim();
                }
                if (text.isEmpty()) {
                    CharSequence t = extras.getCharSequence(Notification.EXTRA_TEXT);
                    if (t != null) text = t.toString().trim();
                }
                if (text.isEmpty()) {
                    CharSequence sub = extras.getCharSequence(Notification.EXTRA_SUB_TEXT);
                    if (sub != null) text = sub.toString().trim();
                }
                if (text.isEmpty()) {
                    CharSequence info = extras.getCharSequence(Notification.EXTRA_INFO_TEXT);
                    if (info != null) text = info.toString().trim();
                }
                // Messaging-style lines
                if (text.isEmpty()) {
                    CharSequence[] lines = extras.getCharSequenceArray(Notification.EXTRA_TEXT_LINES);
                    if (lines != null && lines.length > 0) {
                        StringBuilder sb = new StringBuilder();
                        for (CharSequence line : lines) {
                            if (line != null) {
                                if (sb.length() > 0) sb.append(" | ");
                                sb.append(line.toString().trim());
                            }
                        }
                        text = sb.toString();
                    }
                }
            }

            // Skip completely empty notifications
            if (title.isEmpty() && text.isEmpty()) return null;

            // Friendly app label
            String appName = "";
            try {
                appName = getPackageManager()
                        .getApplicationLabel(getPackageManager().getApplicationInfo(pkg, 0))
                        .toString();
            } catch (Exception ignore) {
                appName = pkg;
            }

            long timestamp = sbn.getPostTime();
            String category = notification.category != null ? notification.category : "";
            String key = sbn.getKey() != null ? sbn.getKey() : "";

            String eventId = UUID.randomUUID().toString();

            JSONObject event = new JSONObject();
            event.put("eventId", eventId);
            event.put("notificationKey", key);
            event.put("packageName", pkg);
            event.put("appName", appName);
            event.put("title", title);
            event.put("text", text);
            event.put("timestamp", timestamp);
            event.put("category", category);
            event.put("eventType", eventType);
            event.put("receivedAt", System.currentTimeMillis());

            return event;
        } catch (Exception e) {
            Log.e(TAG, "extractEvent failed", e);
            return null;
        }
    }

    // ── Persistence ──

    private void persistEvent(JSONObject event) {
        try {
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String raw = prefs.getString(KEY_EVENTS, "[]");
            JSONArray arr;
            try {
                arr = new JSONArray(raw);
            } catch (JSONException e) {
                arr = new JSONArray();
            }

            // Deduplication: skip if same notificationKey + eventType already exists
            String newKey = event.optString("notificationKey", "");
            String newType = event.optString("eventType", "");
            if (!newKey.isEmpty()) {
                for (int i = arr.length() - 1; i >= 0; i--) {
                    JSONObject existing = arr.optJSONObject(i);
                    if (existing != null
                            && newKey.equals(existing.optString("notificationKey", ""))
                            && newType.equals(existing.optString("eventType", ""))) {
                        arr.remove(i); // replace with newer version
                        break;
                    }
                }
            }

            arr.put(event);

            // Cap length
            while (arr.length() > MAX_EVENTS) {
                arr.remove(0);
            }

            prefs.edit().putString(KEY_EVENTS, arr.toString()).apply();
        } catch (Exception e) {
            Log.e(TAG, "persistEvent failed", e);
        }
    }
}
