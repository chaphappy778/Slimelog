-- drop_slimes: add write policies for brand owners.
--
-- 2026-07-22: RLS was enabled on drop_slimes in the initial schema
-- (migration 20260324000001) with only a SELECT policy. Later
-- migrations (20260516000043 drops_overhaul) added per-slime detail
-- columns but never added INSERT/UPDATE/DELETE policies. Every browser
-- write from a brand owner got 403'd, and the client swallowed the
-- error silently. First observed 2026-07-22 during T137 Brand
-- Dashboard smoke test.

create policy "Brand owners can attach slimes to their drops"
  on public.drop_slimes for insert
  with check (
    exists (
      select 1
      from public.drops d
      join public.brands b on d.brand_id = b.id
      where d.id = drop_slimes.drop_id
        and b.owner_id = auth.uid()
    )
  );

create policy "Brand owners can update drop slimes on their drops"
  on public.drop_slimes for update
  using (
    exists (
      select 1
      from public.drops d
      join public.brands b on d.brand_id = b.id
      where d.id = drop_slimes.drop_id
        and b.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.drops d
      join public.brands b on d.brand_id = b.id
      where d.id = drop_slimes.drop_id
        and b.owner_id = auth.uid()
    )
  );

create policy "Brand owners can detach slimes from their drops"
  on public.drop_slimes for delete
  using (
    exists (
      select 1
      from public.drops d
      join public.brands b on d.brand_id = b.id
      where d.id = drop_slimes.drop_id
        and b.owner_id = auth.uid()
    )
  );
