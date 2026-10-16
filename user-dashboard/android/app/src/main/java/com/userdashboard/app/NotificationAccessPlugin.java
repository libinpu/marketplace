package com.userdashboard.app;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.provider.Settings;
import android.text.TextUtils;
import android.util.Log;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Capacitor plugin that bridges the native PhoneNotificationListenerService
 * to the JavaScript/WebView layer.
 *
 * Exposed methods:
 *  - getNotificationAccessStatus()
 *  - openNotificationAccessSettings()
 *  - getPendingNotifications()
 *  - clearStoredNotifications()
 */
@CapacitorPlugin(name = "NotificationAccess")
public class NotificationAccessPlugin extends Plugin {

    private static final String TAG = "NotificationAccessPlugin";
    private static final String PREFS_NAME = "phone_notification_events";
    private static final String KEY_EVENTS = "events";

    @Override
    public void load() {
        // Register a real-time callback so incoming notifications are emitted
        // to JS immediately while the WebView is alive.
        PhoneNotificationListenerService.setNotificationCallback(event -> {
            try {
                JSObject js = new JSObject();
                js.put("eventId", event.optString("eventId", ""));
                js.put("notificationKey", event.optString("notificationKey", ""));
                js.put("packageName", event.optString("packageName", ""));
                js.put("appName", event.optString("appName", ""));
                js.put("title", event.optString("title", ""));
                js.put("text", event.optString("text", ""));
                js.put("timestamp", event.optLong("timestamp", 0));
                js.put("category", event.optString("category", ""));
                js.put("eventType", event.optString("eventType", ""));
                js.put("receivedAt", event.optLong("receivedAt", 0));
                notifyListeners("phoneNotificationReceived", js);
            } catch (Exception e) {
                Log.e(TAG, "Error forwarding notification to JS", e);
            }
        });
    }

    // ─── Check whether notification access is enabled ───

    @PluginMethod()
    public void getNotificationAccessStatus(PluginCall call) {
        boolean enabled = isNotificationAccessEnabled();
        JSObject ret = new JSObject();
        ret.put("enabled", enabled);
        ret.put("status", enabled ? "enabled" : "disabled");
        ret.put("message", enabled
                ? "Notification access is granted."
                : "Notification access is not enabled. Open settings to grant access.");
        call.resolve(ret);
    }

    // ─── Open Android notification-listener settings ───

    @PluginMethod()
    public void openNotificationAccessSettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve(new JSObject().put("opened", true));
        } catch (Exception e) {
            Log.e(TAG, "Failed to open notification settings", e);
            call.reject("Could not open notification access settings", e);
        }
    }

    // ─── Get buffered notifications from SharedPreferences ───

    @PluginMethod()
    public void getPendingNotifications(PluginCall call) {
        try {
            SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String raw = prefs.getString(KEY_EVENTS, "[]");
            JSONArray arr = new JSONArray(raw);

            JSArray jsArr = new JSArray();
            for (int i = 0; i < arr.length(); i++) {
                JSONObject obj = arr.getJSONObject(i);
                JSObject js = new JSObject();
                js.put("eventId", obj.optString("eventId", ""));
                js.put("notificationKey", obj.optString("notificationKey", ""));
                js.put("packageName", obj.optString("packageName", ""));
                js.put("appName", obj.optString("appName", ""));
                js.put("title", obj.optString("title", ""));
                js.put("text", obj.optString("text", ""));
                js.put("timestamp", obj.optLong("timestamp", 0));
                js.put("category", obj.optString("category", ""));
                js.put("eventType", obj.optString("eventType", ""));
                js.put("receivedAt", obj.optLong("receivedAt", 0));
                jsArr.put(js);
            }

            JSObject ret = new JSObject();
            ret.put("notifications", jsArr);
            ret.put("count", arr.length());
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "getPendingNotifications failed", e);
            call.reject("Failed to get pending notifications", e);
        }
    }

    // ─── Clear stored notifications ───

    @PluginMethod()
    public void clearStoredNotifications(PluginCall call) {
        try {
            SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit().putString(KEY_EVENTS, "[]").apply();
            call.resolve(new JSObject().put("cleared", true));
        } catch (Exception e) {
            call.reject("Failed to clear notifications", e);
        }
    }

    // ─── Helpers ───

    private boolean isNotificationAccessEnabled() {
        Context ctx = getContext();
        String flat = Settings.Secure.getString(ctx.getContentResolver(),
                "enabled_notification_listeners");
        if (TextUtils.isEmpty(flat)) return false;
        ComponentName cn = new ComponentName(ctx, PhoneNotificationListenerService.class);
        return flat.contains(cn.flattenToString());
    }
}
