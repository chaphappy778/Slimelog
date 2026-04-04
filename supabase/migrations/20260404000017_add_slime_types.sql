-- Migration: 20260404000017_add_slime_types
-- Adds 35 new values to slime_type enum

ALTER TYPE slime_type ADD VALUE IF NOT EXISTS 'micro_dough';
ALTER TYPE slime_type ADD VALUE IF NOT EXISTS 'sally_butter';
ALTER TYPE slime_type ADD VALUE IF NOT EXISTS 'nougat';
ALTER TYPE slime_type ADD VALUE IF NOT EXISTS 'jelly_cube';
ALTER TYPE slime_type ADD VALUE IF NOT EXISTS 'hybrid';
ALTER TYPE slime_type ADD VALUE IF NOT EXISTS 'fishbowl_beads';
ALTER TYPE slime_type ADD VALUE IF NOT EXISTS 'bead_bomb';
ALTER TYPE slime_type ADD VALUE IF NOT EXISTS 'bingsu';
ALTER TYPE slime_type ADD VALUE IF NOT EXISTS 'cloud_dough';
ALTER TYPE slime_type ADD VALUE IF NOT EXISTS 'float';
ALTER TYPE slime_type ADD VALUE IF NOT EXISTS 'slushee';
ALTER TYPE slime_type ADD VALUE IF NOT EXISTS 'wax_cracking';
ALTER TYPE slime_type ADD VALUE IF NOT EXISTS 'glossy';
ALTER TYPE slime_type ADD VALUE IF NOT EXISTS 'crunchy';
ALTER TYPE slime_type ADD VALUE IF NOT EXISTS 'thicky';
ALTER TYPE slime_type ADD VALUE IF NOT EXISTS 'water';
ALTER TYPE slime_type ADD VALUE IF NOT EXISTS 'cream_cheese';
ALTER TYPE slime_type ADD VALUE IF NOT EXISTS 'mochi';
ALTER TYPE slime_type ADD VALUE IF NOT EXISTS 'jelly_puff';
ALTER TYPE slime_type ADD VALUE IF NOT EXISTS 'cloud_fizz';
ALTER TYPE slime_type ADD VALUE IF NOT EXISTS 'sugar_scrub';
ALTER TYPE slime_type ADD VALUE IF NOT EXISTS 'glow_in_the_dark';
ALTER TYPE slime_type ADD VALUE IF NOT EXISTS 'metallic';
ALTER TYPE slime_type ADD VALUE IF NOT EXISTS 'glitter';
ALTER TYPE slime_type ADD VALUE IF NOT EXISTS 'galaxy';
ALTER TYPE slime_type ADD VALUE IF NOT EXISTS 'jiggly';
ALTER TYPE slime_type ADD VALUE IF NOT EXISTS 'wax';
ALTER TYPE slime_type ADD VALUE IF NOT EXISTS 'sand';
ALTER TYPE slime_type ADD VALUE IF NOT EXISTS 'mousse_fizz';
ALTER TYPE slime_type ADD VALUE IF NOT EXISTS 'chiffon_fizz';
ALTER TYPE slime_type ADD VALUE IF NOT EXISTS 'putty_puff';
ALTER TYPE slime_type ADD VALUE IF NOT EXISTS 'custard';
ALTER TYPE slime_type ADD VALUE IF NOT EXISTS 'holographic';
ALTER TYPE slime_type ADD VALUE IF NOT EXISTS 'pearl';
ALTER TYPE slime_type ADD VALUE IF NOT EXISTS 'thiggly';