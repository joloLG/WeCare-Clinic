# WeCare Supabase Database

This directory contains the database migrations and setup scripts for the WeCare application's Supabase backend.

## Database Schema

### Core Tables

1. **profiles**
   - Stores basic user information
   - Linked to auth.users via UUID
   - Includes role-based access control

2. **patients**
   - Extends profiles with patient-specific data
   - One-to-one relationship with profiles

3. **doctors**
   - Extends profiles with doctor-specific data
   - One-to-one relationship with profiles

4. **appointments**
   - Manages patient-doctor appointments
   - Includes scheduling and status tracking

5. **medical_records**
   - Stores patient medical history
   - Linked to both patients and doctors

## Security

- Row Level Security (RLS) is enabled on all tables
- Custom policies control access based on user roles
- Authentication triggers handle user registration and profile creation

## Setup Instructions

1. **Apply Migrations**
   Run the SQL migrations in order:
   ```
   20240910000001_initial_schema.sql
   20240910000002_security_policies.sql
   20240910000003_storage_and_utilities.sql
   ```

2. **Configure Storage**
   - A bucket named 'profile-pictures' is created automatically
   - Storage policies allow users to manage their own profile pictures

3. **Environment Variables**
   Update your `.env.local` with the following:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

## Utility Functions

- `get_user_role()` - Get the current user's role
- `get_upcoming_appointments(user_id)` - Get a user's upcoming appointments
- `is_time_slot_available(doctor_id, date, start_time, end_time)` - Check appointment availability
- `get_doctor_availability(doctor_id, date)` - Get a doctor's schedule for a specific date

## Testing

You can test the setup by:
1. Creating a new user (automatically creates a profile)
2. Logging in as different user roles
3. Testing appointment booking
4. Verifying RLS policies
