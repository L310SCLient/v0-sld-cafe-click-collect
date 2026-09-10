-- ============================================================================
-- Lot A+B — Socle /interface (code PIN) + référentiel Ingrédients & Recettes
-- ----------------------------------------------------------------------------
-- Migration STRICTEMENT ADDITIVE : aucune table existante n'est modifiée,
-- aucune donnée existante n'est touchée. Seule référence sortante : la clé
-- étrangère recipes.product_id -> products(id) ON DELETE SET NULL.
--
-- Rollback (dans cet ordre) :
--   DROP VIEW IF EXISTS ingredient_stock;
--   DROP TABLE IF EXISTS stock_movements, recipe_items, recipes, ingredients, pin_attempts;
-- ============================================================================


-- ─── Anti-force-brute du code PIN ───────────────────────────────────────────
-- Un code à 4 chiffres = 10 000 combinaisons. Derrière un endpoint HTTP sans
-- limite, il tombe en quelques minutes. Le compteur doit être partagé entre
-- toutes les instances serverless : il vit donc en base, pas en mémoire.
CREATE TABLE IF NOT EXISTS pin_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip text NOT NULL,
  succeeded boolean NOT NULL DEFAULT false,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pin_attempts_ip_time_idx
  ON pin_attempts (ip, attempted_at DESC);


-- ─── Ingrédients ────────────────────────────────────────────────────────────
-- base_unit est l'unité de STOCKAGE, fixe pour la vie de l'ingrédient.
-- Les volumes sont stockés en ml et affichés en L : des entiers, donc pas de
-- dérive de virgule sur les additions de stock.
CREATE TABLE IF NOT EXISTS ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  base_unit text NOT NULL CHECK (base_unit IN ('g', 'ml', 'unit')),
  -- Conditionnement d'achat, exprimé dans base_unit (5000 pour un sac de 5 kg)
  pack_quantity numeric(12,3),
  pack_price_cents integer,
  -- NULL = aucun prix connu. Jamais 0 : un zéro se propagerait dans les coûts.
  price_source text CHECK (price_source IN ('facture', 'manuelle')),
  price_updated_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT ingredients_pack_quantity_positive
    CHECK (pack_quantity IS NULL OR pack_quantity > 0),
  CONSTRAINT ingredients_pack_price_positive
    CHECK (pack_price_cents IS NULL OR pack_price_cents >= 0),
  -- Le prix est un triplet indivisible : quantité + montant + provenance.
  -- Interdit d'avoir un prix sans savoir d'où il vient.
  CONSTRAINT ingredients_price_complete CHECK (
    (pack_quantity IS NULL AND pack_price_cents IS NULL AND price_source IS NULL)
    OR
    (pack_quantity IS NOT NULL AND pack_price_cents IS NOT NULL AND price_source IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS ingredients_name_unique
  ON ingredients (lower(name));


-- ─── Recettes ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  -- Rattachement optionnel au catalogue. Rattachée -> le lot C pourra déduire
  -- le stock des ventes de ce produit. Non rattachée -> préparation interne.
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  -- Nombre de portions produites par la recette (un batch de 10 sandwichs
  -- se saisit une fois, pas dix).
  portions integer NOT NULL DEFAULT 1 CHECK (portions > 0),
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS recipes_name_unique
  ON recipes (lower(name));


CREATE TABLE IF NOT EXISTS recipe_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  -- RESTRICT : on n'efface pas un ingrédient utilisé dans une recette.
  ingredient_id uuid NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
  -- Quantité exprimée dans ingredients.base_unit, pour la recette entière
  -- (donc pour `portions` portions).
  quantity numeric(12,3) NOT NULL CHECK (quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (recipe_id, ingredient_id)
);

CREATE INDEX IF NOT EXISTS recipe_items_recipe_idx ON recipe_items (recipe_id);
CREATE INDEX IF NOT EXISTS recipe_items_ingredient_idx ON recipe_items (ingredient_id);


-- ─── Mouvements de stock ────────────────────────────────────────────────────
-- Le stock n'est JAMAIS un champ à maintenir : c'est SUM(quantity).
-- quantity est signée : + entrée, − sortie.
-- Un comptage physique n'écrit pas une valeur absolue mais l'ÉCART entre le
-- compté et le théorique (compté 4200 g / théorique 4500 g -> -300 g). La
-- somme reste donc juste, et cet écart est la perte mesurée : le lot C n'aura
-- rien à recalculer, il lira ces lignes.
CREATE TABLE IF NOT EXISTS stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id uuid NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
  quantity numeric(12,3) NOT NULL CHECK (quantity <> 0),
  type text NOT NULL CHECK (type IN ('inventaire', 'reception', 'consommation', 'perte')),
  note text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stock_movements_ingredient_idx
  ON stock_movements (ingredient_id, occurred_at DESC);


-- ─── Stock courant ──────────────────────────────────────────────────────────
-- security_invoker = on : sans ça, une vue s'exécute avec les droits de son
-- propriétaire et contournerait le RLS posé plus bas — les prix fournisseurs
-- et les stocks deviendraient lisibles avec la clé anon depuis le navigateur.
CREATE OR REPLACE VIEW ingredient_stock
  WITH (security_invoker = on) AS
  SELECT
    i.id AS ingredient_id,
    COALESCE(SUM(m.quantity), 0)::numeric(14,3) AS stock
  FROM ingredients i
  LEFT JOIN stock_movements m ON m.ingredient_id = i.id
  GROUP BY i.id;


-- ─── RLS ────────────────────────────────────────────────────────────────────
-- Contrairement à `products` (lecture publique volontaire), ces tables sont
-- en RLS activé SANS AUCUNE POLICY : la clé anon ne peut donc ni lire ni
-- écrire. Seul le client service role (server-only, derrière la vérification
-- du cookie PIN) y accède. Coûts d'achat et recettes ne sortent pas du serveur.
ALTER TABLE pin_attempts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients      ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON ingredient_stock FROM anon, authenticated;
