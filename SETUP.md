# Life Command Centre — Setup Instructions

## 1. Supabase — Run this SQL in the SQL Editor

```sql
-- Main data table (run if not already done)
create table if not exists lcc_data (
  id text primary key default 'nimish',
  tasks jsonb default '[]',
  buckets jsonb default '[]',
  moods jsonb default '[]',
  settings jsonb default '{}',
  ws_buckets jsonb default '[]',
  updated_at timestamptz default now()
);
alter table lcc_data enable row level security;
create policy "allow all" on lcc_data for all using (true) with check (true);

-- Weekly sync table (NEW)
create table if not exists lcc_weekly (
  id text primary key default 'nimish',
  data jsonb default '{}',
  updated_at timestamptz default now()
);
alter table lcc_weekly enable row level security;
create policy "allow all" on lcc_weekly for all using (true) with check (true);
```

## 2. Edit index.html
Find `SUPABASE_KEY_PLACEHOLDER` and replace with your sb_publishable_... key

## 3. Edge Function (ai-proxy)
Make sure GEMINI_API_KEY secret is set in Supabase → Edge Functions → ai-proxy → Secrets

## 4. Deploy to Netlify
Drag the zip to app.netlify.com → Add new site → Deploy manually

## 5. Install as app on phone
Android: Chrome → 3-dot menu → Add to Home Screen
iPhone: Safari → Share → Add to Home Screen
