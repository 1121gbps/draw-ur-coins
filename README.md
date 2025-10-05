# 🪙 Draw-a-Coin

A multiplayer memory-drawing game built with Next.js, Supabase, and shadcn/ui.

Players are shown a random coin for a few seconds, then must draw it from memory.  
When time is up, everyone’s drawings are shown alongside the real coin.

---

## 🚀 Live Demo
https://draw-a-coin.vercel.app

---

## ✨ Features
- Multiplayer (host or join a room)
- Random coin memory challenge
- Drawing canvas with colors, eraser, and brush width
- Undo / redo / clear drawing
- Timed memorize and draw phases
- Compare real coin and players’ drawings
- Next round or back-to-lobby
- Dark mode
- Realtime multiplayer via Supabase
- Private image uploads (Supabase Storage)

---

## 🧰 Tech Stack
- Next.js 15 (App Router + Turbopack)
- React 19
- Supabase (Auth + Realtime + Storage)
- Tailwind CSS (via shadcn/ui)
- lucide-react icons
- react-sketch-canvas (for drawing)
- next-themes (for dark mode)

---

## ⚙️ Setup Guide

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/draw-a-coin.git
cd draw-a-coin
```
### 2️. Install dependencies
```bash
npm install
```

### 3. Create Supabase Project

1. Go to https://supabase.com
 → New Project
2. In Settings → API, copy your ``Project URL`` and ``anon key``
3. Create .env:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Enable Anonymous Auth
1. Open your Supabase Project
2. Navigate to Project Settings → Authentication
3. Toggle Anonymous to Enable & Save changes


```
Anonymous users act as authenticated users under RLS, so your data remains protected.
```

### 5. Database Schema
#### Table: rooms
```SQL
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  coin jsonb,
  phase text default 'waiting',
  host_id uuid,
  created_at timestamp default now()
);
```

#### Table: players
```SQL
create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms(id) on delete cascade,
  client_id text,
  name text,
  done boolean default false,
  drawing_url text,
  created_at timestamp default now()
);
create unique index on public.players (room_id, client_id);
```
### 6. Enable RLS and Add Policies
```SQL
-- Enable RLS
alter table public.rooms enable row level security;
alter table public.players enable row level security;

--Rooms
create policy "Public select rooms" on public.rooms for select using (true);
create policy "Insert rooms" on public.rooms for insert with check (auth.uid() is not null);
create policy "Update rooms" on public.rooms for update using (auth.uid() is not null)
with check (auth.uid() is not null);

--Players
create policy "Public select players" on public.players for select using (true);
create policy "Insert players" on public.players for insert with check (auth.uid() is not null);
create policy "Update own player" on public.players for update
using (auth.uid() is not null)
with check (auth.uid() is not null);
create policy "Delete own player" on public.players for delete using (auth.uid() is not null);
```

### 7. Create Storage Bucket

1. Open your Supabase Project
2. Navigate to Bucket → New
3. Name as ``drawings``, set visibility to Private


4. Open SQL Editor:
```SQL
alter table storage.objects enable row level security;

create policy "Allow authenticated image uploads"
on storage.objects
for insert
with check (
  auth.uid() is not null
  and bucket_id = 'drawings'
  and (metadata->>'mimetype') like 'image/%'
);

create policy "Allow signed URL reads"
on storage.objects
for select
using (bucket_id = 'drawings');

```

✅ The app uploads images as authenticated guests and retrieves them using signed URLs.


### 9️. Optional Maintenance (delete old anonymous users)

To keep your auth clean, automatically remove anonymous users older than 2 days:

Run once in SQL Editor:
```SQL
create or replace function cleanup_old_anonymous_users()
returns void as $$
begin
  delete from auth.users
  where raw_user_meta_data->>'provider' = 'anonymous'
  and created_at < now() - interval '2 days';
end;
$$ language plpgsql security definer;
```

Then add a daily cron job in Edge Functions → Scheduled Tasks or your CI:
```SQL
select cleanup_old_anonymous_users();
```

### 10. Run the Dev Server
```shell
npm run dev
```

And finally, visit http://localhost:3000

### 🧠 Project Structure
```
src/
├─ app/
│  ├─ api/
│  │  ├─ coins/route.ts
│  │  └─ upload/route.ts
│  ├─ multiplayer/
│  │  └─ [code]/room-client.tsx
│  ├─ layout.tsx
│  └─ page.tsx
├─ components/
│  ├─ game/
│  │  ├─ LobbyView.tsx
│  │  ├─ MemorizeView.tsx
│  │  ├─ DrawView.tsx
│  │  └─ CompareView.tsx
│  ├─ ui/
│  └─ Coin.tsx
└─ lib/
   └─ supabaseClient.ts
```

### 🌐 API Endpoints
``/api/coins``

Returns an array of coin objects:
```json
[
  {"name":"US Quarter","src":"/coins/us-quarter.png"},
  {"name":"Canadian Silver Dollar (1967)","src":"/coins/canadian-silver-dollar.png"},
  {"name":"India 10 Rupees (Grain Series)","src":"/coins/india-10-rupees-obverse.png"},
  {"name":"Swiss 1 Franc","src":"/coins/swiss-1-franc.png"}
]
```
### 🧑‍🎨 Credits

Built by @1121gbps for Siege Hackclub Event

Powered by Next.js + Supabase + shadcn/ui

Coin images from public domain archives

### 🛠️ License

MIT © 2025 1121gbps

You’re free to use, modify, or distribute this project.
Please credit the original author if you create a derivative.