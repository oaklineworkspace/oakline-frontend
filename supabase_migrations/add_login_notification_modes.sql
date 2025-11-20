
-- Add login notification mode columns to user_security_settings table
ALTER TABLE public.user_security_settings
ADD COLUMN IF NOT EXISTS loginnotificationmode text DEFAULT 'all' CHECK (loginnotificationmode IN ('all', 'new_device', 'off'));

ALTER TABLE public.user_security_settings
ADD COLUMN IF NOT EXISTS logincodemode text DEFAULT 'never' CHECK (logincodemode IN ('never', 'new_device', 'always'));

-- Add comments for documentation
COMMENT ON COLUMN public.user_security_settings.loginnotificationmode IS 'Controls when to send login notifications: all (every login), new_device (only new devices), off (no notifications)';
COMMENT ON COLUMN public.user_security_settings.logincodemode IS 'Controls when to require login verification codes: never, new_device (only new devices), always (every login)';
