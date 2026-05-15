# Supabase Setup Guide

## Database Migrations

Run these SQL migrations in your Supabase dashboard to set up the contacts and newsletters tables:

### 1. Create Contacts Table
Go to **SQL Editor** → paste the contents of `supabase/migrations/001_create_contacts_table.sql` → click **Run**

This creates:
- `contacts` table for contact form submissions
- Indexes on email and created_at for performance
- RLS policy allowing public inserts (contact form)
- Trigger for updated_at auto-update

### 2. Create Newsletters Table
Go to **SQL Editor** → paste the contents of `supabase/migrations/002_create_newsletters_table.sql` → click **Run**

This creates:
- `newsletters` table for email subscriptions
- Unique constraint on email (prevents duplicates)
- RLS policy allowing public inserts

## Environment Variables

Your `.env.local` already has:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

These use the anon key (safe for public operations) with RLS policies.

## Testing

After migrations:

1. **Contact Form**: Go to `/contatti` → fill form → submit
   - Check Supabase `contacts` table to confirm data saved

2. **Newsletter**: Scroll to footer → enter email → click Iscriviti
   - Check Supabase `newsletters` table to confirm data saved

## Next Steps

Once tables are created:
- [ ] Search/filter on `/collezioni` page
- [ ] Stripe integration (explicitly deferred)
