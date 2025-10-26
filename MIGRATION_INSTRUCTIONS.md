# Database Migration Instructions

## Step 1: Run the SQL Migration

1. Go to your Supabase dashboard: https://supabase.com
2. Select your project
3. Navigate to **SQL Editor** (in the left sidebar)
4. Click **New Query**
5. Copy the entire contents of `migrations/admin_and_bank_tables.sql`
6. Paste into the SQL Editor
7. Click **Run** to execute

## Step 2: Add Your First Super Admin

After the migration completes, you need to create your first super admin user:

1. In Supabase, go to **Authentication** → **Users**
2. Find your user account and copy the **User UID**
3. Go back to **SQL Editor**
4. Run this query (replace the values with your own):

```sql
INSERT INTO admin_profiles (user_id, email, role)
VALUES ('your-user-id-here', 'your-email@domain.com', 'super_admin');
```

## Step 3: Verify Setup

Run this query to verify your admin profile was created:

```sql
SELECT * FROM admin_profiles;
```

You should see your user listed with the role 'super_admin'.

## What These Tables Do

### admin_profiles
- Stores admin users and their roles
- Roles: `super_admin`, `admin`, `manager`
- Controls access to admin pages
- Replaces the insecure hardcoded password system

### bank_details
- Stores sensitive bank information (routing numbers, SWIFT codes)
- Protected by Row Level Security (RLS)
- Only visible to authenticated users
- Only editable by admins

## Security Notes

- All sensitive information is now protected by Supabase Row Level Security (RLS)
- Admin access is now tied to your Supabase authentication
- No more hardcoded passwords in the code
- Bank details are only visible to logged-in users
