create table likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  log_id uuid not null references collection_logs(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, log_id)
);

alter table likes enable row level security;

create policy "Users can see all likes"
  on likes for select using (true);

create policy "Users can like"
  on likes for insert
  with check (auth.uid() = user_id);

create policy "Users can unlike"
  on likes for delete
  using (auth.uid() = user_id);