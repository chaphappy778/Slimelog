create table comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  log_id uuid not null references collection_logs(id) on delete cascade,
  body text not null check (char_length(body) <= 500),
  created_at timestamptz default now()
);

alter table comments enable row level security;

create policy "Users can see all comments"
  on comments for select using (true);

create policy "Users can comment"
  on comments for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own comments"
  on comments for delete
  using (auth.uid() = user_id);