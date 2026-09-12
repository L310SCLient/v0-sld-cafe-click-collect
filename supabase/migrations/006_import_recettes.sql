-- ============================================================================
-- Lot E — Import de recettes par fichier
-- ----------------------------------------------------------------------------
-- Migration STRICTEMENT ADDITIVE. Une colonne ajoutée sur recipes
-- (portions_confirmed) et six tables neuves. Rien n'est modifié sur products,
-- orders, formules, ingredients, invoices ni recipe_items.
--
-- PRÉREQUIS MANUEL : créer un bucket de stockage PRIVÉ nommé « recipe-files »
--   Dashboard > Storage > New bucket > name: recipe-files, Public: OFF
-- Il doit rester privé : une fiche recette est un secret de fabrication.
--
-- Rollback (dans cet ordre) :
--   DROP TABLE IF EXISTS recipe_import_lines, recipe_import_recipes,
--     recipe_import_ingredients, recipe_import_files, recipe_imports,
--     recipe_missing_items;
--   ALTER TABLE recipes DROP COLUMN IF EXISTS portions_confirmed;
-- ============================================================================


-- ─── Rendement non confirmé ─────────────────────────────────────────────────
-- Une fiche qui n'écrit pas son rendement donne une recette dont le nombre de
-- portions est inconnu. On ne suppose pas 1 : supposer 1 fausserait tous les
-- coûts à la pièce sans que personne ne le voie. Les recettes existantes
-- gardent `true` : leur rendement a été posé à la main.
ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS portions_confirmed boolean NOT NULL DEFAULT true;


-- ─── Lignes laissées de côté ────────────────────────────────────────────────
-- « une pincée de sel », « QS », ou quantité illisible : l'ingrédient est réel,
-- la quantité non. recipe_items exige une quantité strictement positive, donc
-- ces lignes vivent ici. Leur présence rend la recette incomplète : le coût
-- n'est alors pas affiché, plutôt que d'afficher un total faussement complet.
CREATE TABLE IF NOT EXISTS recipe_missing_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_id uuid REFERENCES ingredients(id) ON DELETE SET NULL,
  -- Libellé tel qu'écrit sur la fiche. Jamais réécrit.
  raw_label text NOT NULL,
  -- Ce que la fiche disait de la quantité : « une pincée », « QS », « ? ».
  raw_quantity text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS recipe_missing_items_recipe_idx
  ON recipe_missing_items (recipe_id);


-- ─── Lot d'import ───────────────────────────────────────────────────────────
-- Zone d'attente : rien de ce qui est lu ici n'entre dans recipes ou
-- recipe_items avant validation humaine, en deux temps (ingrédients, puis
-- recettes).
CREATE TABLE IF NOT EXISTS recipe_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'a_lire' CHECK (status IN (
    'a_lire',                 -- fichiers envoyés, lecture pas encore lancée
    'lecture',                -- lecture en cours
    'ingredients_a_valider',  -- liste dédoublonnée proposée, en attente
    'recettes_a_valider',     -- ingrédients créés, recettes en attente
    'terminee',               -- toutes les recettes traitées
    'echec'                   -- aucun fichier lisible, raison dans parse_error
  )),
  parse_error text,
  parse_model text,
  parsed_at timestamptz,
  validated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS recipe_import_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id uuid NOT NULL REFERENCES recipe_imports(id) ON DELETE CASCADE,
  -- Chemin dans le bucket privé « recipe-files ». L'original est conservé :
  -- une quantité douteuse se revérifie sur la fiche, six mois plus tard.
  file_path text NOT NULL,
  original_name text NOT NULL,
  media_type text NOT NULL,
  status text NOT NULL DEFAULT 'a_lire' CHECK (status IN ('a_lire', 'lue', 'echec')),
  -- Un fichier illisible n'arrête pas le lot : il porte sa raison, les autres
  -- continuent.
  parse_error text,
  parsed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS recipe_import_files_import_idx
  ON recipe_import_files (import_id);


-- ─── Dictionnaire d'ingrédients du lot ──────────────────────────────────────
-- Un nom par ligne, dédoublonné sur l'ensemble des fichiers. C'est l'écran 1 :
-- validé une seule fois, il crée les ingrédients manquants — sans prix, le
-- prix ne venant que d'une facture validée.
CREATE TABLE IF NOT EXISTS recipe_import_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id uuid NOT NULL REFERENCES recipe_imports(id) ON DELETE CASCADE,
  raw_name text NOT NULL,
  -- lower(trim(raw_name)) : même clé de dédoublonnage que l'unicité de la
  -- table ingredients, qui porte sur lower(name).
  normalized_name text NOT NULL,
  base_unit text CHECK (base_unit IS NULL OR base_unit IN ('g', 'ml', 'unit')),
  -- Renseigné quand la ligne est rattachée à un ingrédient existant, ou après
  -- création à la validation de l'écran 1.
  ingredient_id uuid REFERENCES ingredients(id) ON DELETE SET NULL,
  decision text NOT NULL DEFAULT 'creer' CHECK (decision IN ('creer', 'rattacher', 'ignorer')),
  -- Nombre de fiches où ce nom apparaît, pour trier l'écran par importance.
  occurrences integer NOT NULL DEFAULT 1 CHECK (occurrences > 0),
  created_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (import_id, normalized_name)
);


-- ─── Recettes proposées ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recipe_import_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id uuid NOT NULL REFERENCES recipe_imports(id) ON DELETE CASCADE,
  file_id uuid REFERENCES recipe_import_files(id) ON DELETE SET NULL,
  raw_name text NOT NULL,
  -- Recette existante portant le même nom (comparaison sur lower(name)).
  -- NULL = la validation créera une recette.
  matched_recipe_id uuid REFERENCES recipes(id) ON DELETE SET NULL,
  portions integer CHECK (portions IS NULL OR portions > 0),
  -- false = le rendement n'était pas écrit sur la fiche. La recette écrite
  -- portera portions_confirmed = false : « rendement à préciser ».
  portions_read boolean NOT NULL DEFAULT false,
  notes text,
  confidence numeric(3,2) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  status text NOT NULL DEFAULT 'a_valider' CHECK (status IN ('a_valider', 'validee', 'ignoree')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS recipe_import_recipes_import_idx
  ON recipe_import_recipes (import_id);


CREATE TABLE IF NOT EXISTS recipe_import_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staged_recipe_id uuid NOT NULL REFERENCES recipe_import_recipes(id) ON DELETE CASCADE,
  raw_label text NOT NULL,
  -- La quantité telle qu'écrite, gardée même quand elle n'est pas chiffrable.
  raw_quantity text,
  -- NULL = non chiffrable : la ligne partira dans recipe_missing_items.
  quantity numeric(12,3) CHECK (quantity IS NULL OR quantity > 0),
  base_unit text CHECK (base_unit IS NULL OR base_unit IN ('g', 'ml', 'unit')),
  -- Clé vers recipe_import_ingredients.normalized_name du même lot.
  normalized_name text NOT NULL,
  ingredient_id uuid REFERENCES ingredients(id) ON DELETE SET NULL,
  confidence numeric(3,2) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS recipe_import_lines_recipe_idx
  ON recipe_import_lines (staged_recipe_id);


-- ─── Sécurité ───────────────────────────────────────────────────────────────
-- Même règle que 003 et 005 : RLS activée sans aucune policy, donc rien n'est
-- lisible avec la clé publique. Seule la clé service role, côté serveur et
-- derrière la garde de /interface, accède à ces tables.
ALTER TABLE recipe_missing_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_imports              ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_import_files         ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_import_ingredients   ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_import_recipes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_import_lines         ENABLE ROW LEVEL SECURITY;
