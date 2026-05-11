-- Fix log_collection_activity() trigger function to use base_type instead of
-- the dropped slime_type column. Migration 20260509000037 dropped slime_type
-- from collection_logs and replaced it with base_type (slime_base_type enum)
-- + subtype_id (uuid FK to subtypes). The jsonb_build_object call in this
-- trigger still referenced NEW.slime_type, causing errors on every log insert.
-- The trigger binding (collection_logs_create_activity) is unchanged.

CREATE OR REPLACE FUNCTION public.log_collection_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_public = true THEN
    IF TG_OP = 'INSERT' THEN
      INSERT INTO public.activity_feed (
        actor_id,
        activity_type,
        log_id,
        metadata
      ) VALUES (
        NEW.user_id,
        CASE
          WHEN NEW.in_wishlist = true THEN 'wishlist_added'::activity_type
          ELSE 'log_created'::activity_type
        END,
        NEW.id,
        jsonb_build_object(
          'slime_name',     NEW.slime_name,
          'base_type',      NEW.base_type,
          'brand_name_raw', NEW.brand_name_raw,
          'rating_overall', NEW.rating_overall,
          'in_wishlist',    NEW.in_wishlist,
          'image_url',      NEW.image_url
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
