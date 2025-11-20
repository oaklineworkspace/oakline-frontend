# Database Setup Guide for Oakline Bank

## 🔴 IMPORTANT: Your database is currently empty and needs to be set up before the application will work properly.

## Step 1: Set Up Your Supabase Database Schema

Your Oakline Bank application requires a complete database schema with multiple tables. You have several options:

### Option A: Use Supabase Dashboard (Recommended for Beginners)

1. **Go to your Supabase Project Dashboard**
   - Visit https://supabase.com and sign in
   - Open your project

2. **Navigate to SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Create the Required Tables**
   - You'll need to create tables in the following order (due to foreign key dependencies):
     1. `profiles` - User profile information
     2. `user_security_settings` - Security and lock status
     3. `applications` - Account applications
     4. `accounts` - Bank accounts
     5. `transactions` - Transaction history
     6. `cards` - Card information
     7. And many more...

### Option B: Use Migration Files (Recommended for Developers)

If you have migration files in your project:

1. **Check for migration files**
   ```bash
   ls -la supabase/migrations/
   ```

2. **Apply migrations using Supabase CLI**
   ```bash
   # Install Supabase CLI if you haven't
   npm install -g supabase
   
   # Link to your project
   supabase link --project-ref your-project-ref
   
   # Push migrations
   supabase db push
   ```

### Option C: Pull Schema from Production (If You Have One)

If you already have a working Supabase instance with the schema:

```bash
# Pull the schema from your production database
supabase db pull

# Apply it to your development database
supabase db push
```

## Step 2: Add the Account Status Features

After you've set up your base schema, you need to add the new account status column:

1. **Go to Supabase SQL Editor**
2. **Run this SQL command:**

```sql
-- Add status column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' 
CHECK (status IN ('active', 'suspended', 'closed', 'pending'));

-- Add comment to explain the field
COMMENT ON COLUMN profiles.status IS 'Account status: active, suspended, closed, or pending';
```

## Step 3: Verify Your Tables

After setting up the schema, verify that all tables exist:

```sql
-- Check if all required tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

You should see tables including:
- `profiles`
- `user_security_settings`
- `accounts`
- `applications`
- `transactions`
- `admin_profiles`
- And many more...

## Step 4: Test the Account Status Feature

Once your database is set up, you can test the new account status checking:

1. **Create a test user** (if you don't have one)
2. **Update their status** using SQL:
   ```sql
   -- Test suspended status
   UPDATE profiles 
   SET status = 'suspended' 
   WHERE id = 'user-id-here';
   
   -- Test banned status
   UPDATE profiles 
   SET is_banned = true, 
       ban_reason = 'Test ban reason' 
   WHERE id = 'user-id-here';
   
   -- Test locked status
   UPDATE user_security_settings 
   SET account_locked = true, 
       locked_reason = 'Security test' 
   WHERE user_id = 'user-id-here';
   ```

3. **Try to log in** - You should see professional status messages for each status type

## Required Tables for Account Status Feature

The following tables **must exist** for the account status checking to work:

### 1. profiles
```sql
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  email text UNIQUE,
  first_name text,
  last_name text,
  is_banned boolean DEFAULT false,
  ban_reason text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'closed', 'pending')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### 2. user_security_settings
```sql
CREATE TABLE user_security_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  account_locked boolean DEFAULT false,
  locked_reason text,
  login_alerts boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

## Troubleshooting

### Error: "relation 'profiles' does not exist"
This means you haven't created the database schema yet. Follow Step 1 above.

### Error: "column 'status' does not exist"
This means you need to add the status column. Run the SQL from Step 2.

### Error: "supabaseUrl is required"
This means your Supabase credentials aren't set up. Make sure you've added them to your Replit Secrets.

## Need Help?

If you're stuck, you can:
1. Check the provided schema file (`attached_assets/Pasted--WARNING-This-schema...`)
2. Review MIGRATION_INSTRUCTIONS.md if it exists in your project
3. Ask for help with specific error messages you're seeing

---

**After completing the database setup, restart your application and test the login flow with different account statuses!**
