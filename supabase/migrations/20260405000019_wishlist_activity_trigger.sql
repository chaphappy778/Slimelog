-- Migration: 20260405000019_wishlist_activity_trigger
-- Table altered: activity_feed trigger on collection_logs
-- Reason: Distinguish wishlist_added from log_created in activity feed

CREATE OR REPLACE FUNCTION public.log_collection_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.activity_feed (
    id,
    actor_id,
    activity_type,
    log_id,
    metadata,
    created_at
  ) VALUES (
    gen_random_uuid(),
    NEW.user_id,
    CASE WHEN NEW.in_wishlist = true THEN 'wishlist_added' ELSE 'log_created' END,
    NEW.id,
    jsonb_build_object(
      'slime_name',     NEW.slime_name,
      'slime_type',     NEW.slime_type,
      'brand_name_raw', NEW.brand_name_raw,
      'rating_overall', NEW.rating_overall,
      'in_wishlist',    NEW.in_wishlist,
      'image_url',      NEW.image_url
    ),
    NOW()
  );
  RETURN NEW;
END;
$$;-- Migration: 20260406000021_fix_wishlist_activity_trigger
-- Table altered: activity_feed trigger function on collection_logs
-- Reason: Cast activity_type expression to enum type explicitly

CREATE OR REPLACE FUNCTION public.log_collection_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.activity_feed (
    id,
    actor_id,
    activity_type,
    log_id,
    metadata,
    created_at
  ) VALUES (
    gen_random_uuid(),
    NEW.user_id,
    CASE 
      WHEN NEW.in_wishlist = true THEN 'wishlist_added'::activity_type 
      ELSE 'log_created'::activity_type 
    END,
    NEW.id,
    jsonb_build_object(
      'slime_name',     NEW.slime_name,
      'slime_type',     NEW.slime_type,
      'brand_name_raw', NEW.brand_name_raw,
      'rating_overall', NEW.rating_overall,
      'in_wishlist',    NEW.in_wishlist,
      'image_url',      NEW.image_url
    ),
    NOW()
  );
  RETURN NEW;
END;
$$;