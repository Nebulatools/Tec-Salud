-- Migration: Create notifications system tables
-- Includes notifications, notification_preferences, and email_logs

-- Create enum for notification types
DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM (
    'appointment_reminder',
    'appointment_confirmation',
    'appointment_cancelled',
    'prescription_ready',
    'lab_results_ready',
    'rating_request',
    'system_alert'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create enum for notification channels
DO $$ BEGIN
  CREATE TYPE notification_channel AS ENUM (
    'email',
    'push',
    'sms',
    'in_app'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create enum for notification status
DO $$ BEGIN
  CREATE TYPE notification_status AS ENUM (
    'pending',
    'sent',
    'delivered',
    'failed',
    'read'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,

  type notification_type NOT NULL,
  channel notification_channel NOT NULL DEFAULT 'email',
  status notification_status NOT NULL DEFAULT 'pending',

  title TEXT NOT NULL,
  body TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',

  -- Reference to related entities
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  prescription_id UUID REFERENCES prescriptions(id) ON DELETE SET NULL,

  -- Scheduling
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,

  -- Error tracking
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Email preferences
  email_appointment_reminders BOOLEAN DEFAULT TRUE,
  email_appointment_confirmations BOOLEAN DEFAULT TRUE,
  email_prescription_ready BOOLEAN DEFAULT TRUE,
  email_lab_results BOOLEAN DEFAULT TRUE,
  email_rating_requests BOOLEAN DEFAULT TRUE,
  email_marketing BOOLEAN DEFAULT FALSE,

  -- Push preferences
  push_enabled BOOLEAN DEFAULT TRUE,
  push_appointment_reminders BOOLEAN DEFAULT TRUE,
  push_appointment_confirmations BOOLEAN DEFAULT TRUE,

  -- SMS preferences
  sms_enabled BOOLEAN DEFAULT FALSE,
  sms_appointment_reminders BOOLEAN DEFAULT FALSE,

  -- Reminder timing preferences (minutes before appointment)
  reminder_24h BOOLEAN DEFAULT TRUE,
  reminder_1h BOOLEAN DEFAULT TRUE,
  reminder_custom_minutes INTEGER,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT ux_notification_prefs_user UNIQUE (user_id)
);

-- Email logs table (for Resend tracking)
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES notifications(id) ON DELETE SET NULL,

  -- Resend data
  resend_id TEXT,
  to_email TEXT NOT NULL,
  from_email TEXT NOT NULL,
  subject TEXT NOT NULL,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, delivered, bounced, failed
  status_updated_at TIMESTAMPTZ,

  -- Error tracking
  error_message TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_patient_id ON notifications(patient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled_for ON notifications(scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_email_logs_notification_id ON email_logs(notification_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_resend_id ON email_logs(resend_id);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notifications_updated_at ON notifications;
CREATE TRIGGER trigger_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_notifications_updated_at();

DROP TRIGGER IF EXISTS trigger_notification_preferences_updated_at ON notification_preferences;
CREATE TRIGGER trigger_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notifications_updated_at();

-- RLS Policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Notifications: users can read their own
DROP POLICY IF EXISTS notifications_user_read ON notifications;
CREATE POLICY notifications_user_read ON notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Notifications: doctors can read for their patients
DROP POLICY IF EXISTS notifications_doctor_read ON notifications;
CREATE POLICY notifications_doctor_read ON notifications
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM doctors d
      WHERE d.user_id = auth.uid()
      AND d.id = notifications.doctor_id
    )
  );

-- Service role can manage all (for API routes)
DROP POLICY IF EXISTS notifications_service_all ON notifications;
CREATE POLICY notifications_service_all ON notifications
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Notification preferences: users manage their own
DROP POLICY IF EXISTS notification_prefs_user_all ON notification_preferences;
CREATE POLICY notification_prefs_user_all ON notification_preferences
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Email logs: service role only
DROP POLICY IF EXISTS email_logs_service_all ON email_logs;
CREATE POLICY email_logs_service_all ON email_logs
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Comment on tables
COMMENT ON TABLE notifications IS 'Stores all notifications sent to users and patients';
COMMENT ON TABLE notification_preferences IS 'User preferences for notification channels and types';
COMMENT ON TABLE email_logs IS 'Logs of emails sent via Resend for tracking and debugging';
