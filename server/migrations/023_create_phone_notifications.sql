-- Phone notification events received from the Android NotificationListenerService
CREATE TABLE IF NOT EXISTS phone_notification_events (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id VARCHAR(255) NOT NULL,
    notification_key TEXT,
    package_name VARCHAR(255) NOT NULL,
    app_name VARCHAR(255),
    title TEXT,
    text TEXT,
    timestamp BIGINT,
    category VARCHAR(100),
    event_type VARCHAR(50) DEFAULT 'posted',
    sync_status VARCHAR(20) DEFAULT 'synced',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_phone_notif_user_id ON phone_notification_events(user_id);
CREATE INDEX IF NOT EXISTS idx_phone_notif_event_id ON phone_notification_events(event_id);
CREATE INDEX IF NOT EXISTS idx_phone_notif_timestamp ON phone_notification_events(timestamp DESC);
