-- Fix W-2: backfill orphaned collection_logs.slime_id where a match or an
-- auto-createable catalog row exists. Mirrors resolveOrCreateSlimeId's runtime
-- logic (apps/web/lib/slime-actions.ts) as a one-shot pass over historical rows.
--
-- Why: Track 1b (migration 20260723000088) auto-creates unofficial catalog rows
-- on log create when brand_id + slime_name are set but nothing in the catalog
-- matches. That only fixes NEW logs. Logs written before Track 1b shipped still
-- carry slime_id = NULL even when a name + brand match resolves cleanly.
--
-- Scope: rows where slime_id IS NULL, brand_id IS NOT NULL, slime_name is
-- non-empty, and base_type is present. Rows missing any of those stay unlinked
-- (base_type is NOT NULL on slimes, so we cannot create a catalog row without
-- one, and we will not invent a value).
--
-- Idempotent: the `slime_id IS NULL` gate means a re-push is a no-op over rows
-- this pass already linked. Safe to re-run.
--
-- Not touched: collection_logs.base_type. The log's base_type is user-observed
-- and stays exactly as the user picked it, even when the catalog row it links
-- to carries a different base_type. Same call the runtime path makes.
--
-- HP-11 note: `slimes_protect_attribution` (migration 20260706000053, rewritten
-- per docs/error-tracker.md) silently reverts brand_id / is_brand_official on
-- UPDATEs from 'authenticated' / 'anon'. It is a BEFORE UPDATE trigger on
-- public.slimes and we only INSERT there, so it does not fire. The UPDATEs here
-- target collection_logs, whose only UPDATE triggers are column-scoped to
-- rating_overall and is_public — neither fires on a slime_id write.

BEGIN;

DO $$
DECLARE
  log_rec         RECORD;
  v_norm          text;
  target_slime_id uuid;
  n_eligible      integer := 0;
  n_matched       integer := 0;
  n_created       integer := 0;
  n_skipped       integer := 0;
BEGIN
  FOR log_rec IN
    SELECT id, brand_id, slime_name, base_type, user_id
    FROM public.collection_logs
    WHERE slime_id IS NULL
      AND brand_id IS NOT NULL
      AND slime_name IS NOT NULL
      AND TRIM(slime_name) <> ''
      AND base_type IS NOT NULL
    ORDER BY created_at, id
  LOOP
    n_eligible := n_eligible + 1;
    target_slime_id := NULL;

    -- Normalization is character-for-character the same expression migration
    -- 20260723000088 used to backfill slimes.name_normalized, and carries the
    -- same semantics as normalizeSlimeName() in apps/web/lib/normalize.ts:
    -- trim, collapse internal whitespace runs to one space, lowercase. No
    -- punctuation stripping ("Cloud 9" and "Cloud9" are different products).
    -- Any drift here would miss real matches and mint ghost duplicates.
    v_norm := LOWER(REGEXP_REPLACE(TRIM(log_rec.slime_name), '\s+', ' ', 'g'));

    -- 1. Match an existing catalog row for this brand — official OR unofficial,
    --    same widening Track 1b applied at runtime.
    --
    --    Two arms, because name_normalized is NOT populated on every row:
    --      a) name_normalized = v_norm — the indexed path, covers rows migration
    --         88 backfilled and every row the runtime auto-catalog creates.
    --      b) name_normalized IS NULL — covers the brand-dashboard catalog
    --         inserts (SlimesManager / SlimesSplitPanel / DropsSplitPanel), which
    --         write `name` without name_normalized, plus the duplicate rows
    --         migration 88 deliberately NULLed to let its partial unique index
    --         build. Matching those on a derived-from-name comparison mirrors
    --         the runtime's ILIKE-on-name check. Without this arm a log naming
    --         a brand's official catalog slime would fail to match and create a
    --         shadow unofficial duplicate of it.
    --
    --    ORDER BY prefers the indexed match, then the oldest row, so the choice
    --    is deterministic and a re-run picks the same row.
    SELECT id INTO target_slime_id
    FROM public.slimes
    WHERE brand_id = log_rec.brand_id
      AND (
        name_normalized = v_norm
        OR (
          name_normalized IS NULL
          AND LOWER(REGEXP_REPLACE(TRIM(name), '\s+', ' ', 'g')) = v_norm
        )
      )
    ORDER BY (name_normalized IS NULL), created_at, id
    LIMIT 1;

    IF target_slime_id IS NULL THEN
      -- 2. No match → create an unofficial row attributed to the log's author,
      --    exactly as the runtime path does.
      --
      --    The ON CONFLICT target repeats the index predicate
      --    (WHERE name_normalized IS NOT NULL) because
      --    slimes_brand_name_normalized_uidx is a PARTIAL unique index —
      --    inference against a partial index fails without its predicate
      --    ("there is no unique or exclusion constraint matching the ON
      --    CONFLICT specification"). Every row we insert here has a non-null
      --    name_normalized, so the predicate always holds.
      --
      --    DO NOTHING, never DO UPDATE: an update-on-conflict would clobber a
      --    brand's curation (reset is_brand_official, overwrite the display
      --    name). Same reasoning as the runtime path's comment.
      INSERT INTO public.slimes (
        brand_id,
        name,
        name_normalized,
        base_type,
        is_brand_official,
        created_by
      )
      VALUES (
        log_rec.brand_id,
        TRIM(log_rec.slime_name),
        v_norm,
        log_rec.base_type,
        false,
        log_rec.user_id
      )
      ON CONFLICT (brand_id, name_normalized) WHERE name_normalized IS NOT NULL
      DO NOTHING
      RETURNING id INTO target_slime_id;

      IF target_slime_id IS NOT NULL THEN
        n_created := n_created + 1;
      ELSE
        -- 3. ON CONFLICT swallowed the insert. Single-txn migration with no
        --    concurrent writers, so this is defensive rather than a real race:
        --    it fires when two eligible logs in this same batch share a
        --    normalized name under one brand (different original casing or
        --    spacing). Read back the winning row and link to it.
        SELECT id INTO target_slime_id
        FROM public.slimes
        WHERE brand_id = log_rec.brand_id
          AND name_normalized = v_norm
        LIMIT 1;

        IF target_slime_id IS NOT NULL THEN
          n_matched := n_matched + 1;
        END IF;
      END IF;
    ELSE
      n_matched := n_matched + 1;
    END IF;

    IF target_slime_id IS NOT NULL THEN
      UPDATE public.collection_logs
        SET slime_id = target_slime_id
      WHERE id = log_rec.id;
    ELSE
      n_skipped := n_skipped + 1;
    END IF;
  END LOOP;

  RAISE NOTICE 'Fix W-2 backfill: eligible=%, matched=%, created=%, skipped=%',
    n_eligible, n_matched, n_created, n_skipped;
END$$;

COMMIT;
