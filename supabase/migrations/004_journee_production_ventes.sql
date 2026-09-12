-- ============================================================================
-- Lot C — Journée : production, ventes, clôture, pertes, seuils de stock
-- ----------------------------------------------------------------------------
-- Migration STRICTEMENT ADDITIVE. Deux colonnes ajoutées sur des tables du lot
-- précédent (ingredients, stock_movements), aucune modification de products,
-- orders ou formules.
--
-- Rollback (dans cet ordre) :
--   DROP VIEW IF EXISTS daily_formule_sales, daily_online_sales;
--   DROP TABLE IF EXISTS waste_entries, sales_entries, service_days;
--   ALTER TABLE stock_movements DROP COLUMN IF EXISTS production_entry_id;
--   DROP TABLE IF EXISTS production_entries;
--   ALTER TABLE ingredients DROP COLUMN IF EXISTS low_stock_threshold;
-- ============================================================================


-- ─── Production du jour ─────────────────────────────────────────────────────
-- Une ligne par saisie (« j'ai fait 12 Végétariens »), pas un compteur : deux
-- saisies successives s'additionnent, et supprimer une saisie fautive annule
-- exactement ses effets sans recalculer le reste.
CREATE TABLE IF NOT EXISTS production_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES recipes(id) ON DELETE RESTRICT,
  -- Date de service, calculée en heure de Paris côté application : une saisie
  -- à 00h30 UTC appartient à la journée de la veille en cuisine.
  service_date date NOT NULL,
  /** Nombre de portions produites. */
  quantity integer NOT NULL CHECK (quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS production_entries_date_idx
  ON production_entries (service_date, recipe_id);


-- Rattachement des mouvements de stock à leur saisie de production.
-- ON DELETE CASCADE : annuler une production annule la consommation
-- d'ingrédients qu'elle avait écrite, sans laisser d'orphelin.
ALTER TABLE stock_movements
  ADD COLUMN IF NOT EXISTS production_entry_id uuid
  REFERENCES production_entries(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS stock_movements_production_idx
  ON stock_movements (production_entry_id);


-- ─── Ventes au comptoir ─────────────────────────────────────────────────────
-- UNE LIGNE PAR VENTE. Le +1 insère une ligne au lieu d'incrémenter un
-- compteur : deux personnes qui cliquent en même temps sur deux appareils ne
-- peuvent pas s'écraser mutuellement (un UPDATE lu-puis-réécrit perdrait une
-- vente). Un −1 supprime la dernière ligne.
CREATE TABLE IF NOT EXISTS sales_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES recipes(id) ON DELETE RESTRICT,
  service_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sales_entries_date_idx
  ON sales_entries (service_date, recipe_id);


-- ─── Clôture de journée ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS service_days (
  service_date date PRIMARY KEY,
  closed_at timestamptz NOT NULL DEFAULT now()
);


-- ─── Surproduction constatée à la clôture ───────────────────────────────────
CREATE TABLE IF NOT EXISTS waste_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES recipes(id) ON DELETE RESTRICT,
  service_date date NOT NULL,
  /** Portions produites et non vendues. */
  quantity integer NOT NULL CHECK (quantity > 0),
  -- Coût FIGÉ au moment de la clôture : le prix des ingrédients changera, la
  -- perte de ce jour-là ne doit pas bouger. NULL = coût inconnu ce jour-là
  -- (au moins un ingrédient sans prix). Jamais 0 pour combler le trou.
  cost_cents integer CHECK (cost_cents IS NULL OR cost_cents >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (recipe_id, service_date)
);

CREATE INDEX IF NOT EXISTS waste_entries_date_idx ON waste_entries (service_date);


-- ─── Seuil d'alerte de stock ────────────────────────────────────────────────
-- NULL = pas de seuil défini, l'alerte se déclenche alors à zéro.
ALTER TABLE ingredients
  ADD COLUMN IF NOT EXISTS low_stock_threshold numeric(12,3)
  CHECK (low_stock_threshold IS NULL OR low_stock_threshold >= 0);


-- ─── Ventes en ligne, par date de service et par produit ────────────────────
-- Les commandes click & collect se cumulent au compteur comptoir. La date de
-- service est ramenée en heure de Paris, pas en UTC.
-- Le filtre sur le format d'uuid évite qu'une commande mal formée fasse
-- échouer la vue entière au moment du cast.
CREATE OR REPLACE VIEW daily_online_sales
  WITH (security_invoker = on) AS
  SELECT
    ((o.created_at AT TIME ZONE 'Europe/Paris')::date) AS service_date,
    (item->>'product_id')::uuid AS product_id,
    SUM(COALESCE((item->>'quantity')::integer, 0))::integer AS quantity
  FROM orders o
  CROSS JOIN LATERAL jsonb_array_elements(o.items) AS item
  WHERE item->>'product_id' IS NOT NULL
    AND item->>'product_id' ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  GROUP BY 1, 2;


-- ─── Formules vendues en ligne : le trou connu ──────────────────────────────
-- Dans orders.items, une formule porte le product_id DE LA FORMULE, et les
-- produits choisis n'existent qu'en texte dans le champ `name`
-- (components/checkout-modal.tsx). Les recettes correspondantes ne peuvent
-- donc pas être créditées automatiquement. Cette vue compte ces formules pour
-- que l'écran l'annonce au lieu de laisser croire à un total complet.
CREATE OR REPLACE VIEW daily_formule_sales
  WITH (security_invoker = on) AS
  SELECT
    ((o.created_at AT TIME ZONE 'Europe/Paris')::date) AS service_date,
    SUM(COALESCE((item->>'quantity')::integer, 0))::integer AS quantity
  FROM orders o
  CROSS JOIN LATERAL jsonb_array_elements(o.items) AS item
  WHERE item->>'product_id' IS NOT NULL
    AND item->>'product_id' ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    AND EXISTS (SELECT 1 FROM formules f WHERE f.id = (item->>'product_id')::uuid)
  GROUP BY 1;


-- ─── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE production_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_entries      ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_days       ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_entries      ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON daily_online_sales  FROM anon, authenticated;
REVOKE ALL ON daily_formule_sales FROM anon, authenticated;
