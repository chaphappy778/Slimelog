-- Migration: 20260404000018_add_slime_type_reference
-- Inserts reference data for 35 new slime types

INSERT INTO public.slime_type_reference
  (slime_type, display_name, made_with, key_characteristics, what_to_rate, sort_order)
VALUES
  ('micro_dough',       'Micro Dough',       'micro beads + glue',           'tiny bead texture, soft and doughy',           'texture, sound, drizzle',          20),
  ('sally_butter',      'Sally Butter',      'glue + activator + lotion',     'smooth, buttery, spreadable',                  'texture, drizzle, creativity',     21),
  ('nougat',            'Nougat',            'glue + clay additives',         'thick, chewy, candy-like texture',             'texture, creativity, sensory fit', 22),
  ('jelly_cube',        'Jelly Cube',        'jelly polymer + water',         'cubed jelly pieces, bouncy and transparent',   'texture, sound, sensory fit',      23),
  ('hybrid',            'Hybrid',            'mixed base types',              'combines two or more slime textures',          'texture, creativity, sensory fit', 24),
  ('fishbowl_beads',    'Fishbowl Beads',    'clear glue + fishbowl beads',   'crunchy, transparent beads suspended in clear','texture, sound, creativity',      25),
  ('bead_bomb',         'Bead Bomb',         'glue + mixed bead types',       'heavy bead load, multiple textures',           'texture, sound, sensory fit',      26),
  ('bingsu',            'Bingsu',            'clay + fine powder additives',  'powdery, snow-like, crumbly texture',          'texture, sound, sensory fit',      27),
  ('cloud_dough',       'Cloud Dough',       'cornstarch + conditioner',      'moldable, fluffy, soft crumble',               'texture, creativity, sensory fit', 28),
  ('float',             'Float',             'glue + foam beads + air',       'light, airy, foam-loaded',                     'texture, drizzle, sensory fit',    29),
  ('slushee',           'Slushee',           'glue + ice texture additives',  'icy, chunky, drink-inspired texture',          'texture, sound, creativity',       30),
  ('wax_cracking',      'Wax Cracking',      'wax + polymer blend',           'satisfying crack on stretch',                  'texture, sound, sensory fit',      31),
  ('glossy',            'Glossy',            'clear glue + gloss additives',  'mirror-like surface, very shiny',              'texture, drizzle, creativity',     32),
  ('crunchy',           'Crunchy',           'glue + foam beads or fishbowl', 'loud crunch, satisfying ASMR',                 'texture, sound, sensory fit',      33),
  ('thicky',            'Thicky',            'glue + heavy activator',        'extremely thick, slow drizzle',                'texture, drizzle, sensory fit',    34),
  ('water',             'Water',             'water-based polymer',           'ultra runny, glossy, transparent',             'texture, drizzle, sensory fit',    35),
  ('cream_cheese',      'Cream Cheese',      'glue + clay + lotion',          'thick, spreadable, smooth like cream cheese',  'texture, drizzle, creativity',     36),
  ('mochi',             'Mochi',             'polymer clay blend',            'bouncy, stretchy, mochi-like',                 'texture, sensory fit, creativity', 37),
  ('jelly_puff',        'Jelly Puff',        'jelly base + air pockets',      'puffy, jiggly, translucent',                   'texture, drizzle, sensory fit',    38),
  ('cloud_fizz',        'Cloud Fizz',        'cloud slime + fizzing agents',  'fizzy texture, airy and bubbly',               'texture, sound, sensory fit',      39),
  ('sugar_scrub',       'Sugar Scrub',       'glue + sugar granules',         'gritty, exfoliating texture feel',             'texture, scent, sensory fit',      40),
  ('glow_in_the_dark',  'Glow in the Dark',  'glue + glow pigment',           'charges in light, glows in dark',              'creativity, sensory fit, texture', 41),
  ('metallic',          'Metallic',          'glue + metallic pigment',       'shiny, chrome-like finish',                    'creativity, texture, drizzle',     42),
  ('glitter',           'Glitter',           'glue + glitter',                'sparkly, reflective, festive',                 'creativity, texture, sensory fit', 43),
  ('galaxy',            'Galaxy',            'glue + mixed glitter + pigment','deep space colors, multi-dimensional',         'creativity, texture, sensory fit', 44),
  ('jiggly',            'Jiggly',            'water-based jelly polymer',     'wobbly, bouncy, ASMR-satisfying',              'texture, sound, sensory fit',      45),
  ('wax',               'Wax',               'wax-based compound',            'waxy feel, smooth pull',                       'texture, sensory fit, sound',      46),
  ('sand',              'Sand',              'kinetic sand base',             'grainy, moldable, satisfying crumble',         'texture, sound, sensory fit',      47),
  ('mousse_fizz',       'Mousse Fizz',       'mousse base + fizzing agents',  'light and airy with fizz sensation',           'texture, sound, sensory fit',      48),
  ('chiffon_fizz',      'Chiffon Fizz',      'chiffon base + fizz',           'ultra light, airy, melts in hands',            'texture, sound, sensory fit',      49),
  ('putty_puff',        'Putty Puff',        'putty + air pockets',           'dense yet airy, satisfying pull',              'texture, sensory fit, drizzle',    50),
  ('custard',           'Custard',           'glue + lotion + clay',          'thick, creamy, smooth like custard',           'texture, drizzle, creativity',     51),
  ('holographic',       'Holographic',       'glue + holographic pigment',    'rainbow shift, light-reactive finish',         'creativity, texture, sensory fit', 52),
  ('pearl',             'Pearl',             'glue + pearl pigment',          'soft shimmer, pearlescent finish',             'creativity, texture, drizzle',     53),
  ('thiggly',           'Thiggly',           'thick jelly polymer blend',     'thick and jiggly combined texture',            'texture, sound, sensory fit',      54)
ON CONFLICT (slime_type) DO NOTHING;
