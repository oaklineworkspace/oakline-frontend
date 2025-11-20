
-- Add login notification mode columns to user_security_settings table
ALTER TABLE public.user_security_settings
ADD COLUMN IF NOT EXISTS login_notifications text DEFAULT 'all_logins' CHECK (login_notifications IN ('all_logins', 'new_device', 'new_login', 'both', 'off'));

-- Add comments for documentation
COMMENT ON COLUMN public.user_security_settings.login_notifications IS 'Controls when to send login notifications: all_logins (every login), new_device (only new devices), new_login (new location), both (new device and location), off (no notifications)';
