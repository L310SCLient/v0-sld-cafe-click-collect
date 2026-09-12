-- ============================================================================
-- Lot D — Factures, fournisseurs, historique de prix et comparateurs
-- ----------------------------------------------------------------------------
-- Migration STRICTEMENT ADDITIVE. Une colonne ajoutée sur ingredients
-- (category). Aucune modification de products, orders ou formules.
--
-- PRÉREQUIS MANUEL : créer un bucket de stockage PRIVÉ nommé « invoices »
--   Dashboard > Storage > New bucket > name: invoices, Public: OFF
-- Il doit rester privé : une photo de facture expose les prix négociés avec
-- tes fournisseurs. Le bucket public « product-images » ne convient pas.
--
-- Rollback (dans cet ordre) :
--   DROP VIEW IF EXISTS ingredient_latest_supplier_price;
--   DROP TABLE IF EXISTS ingredient_prices, invoice_lines, invoices, suppliers;
--   ALTER TABLE ingredients DROP COLUMN IF EXISTS category;
-- ============================================================================


-- ─── Fournisseurs ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS suppliers_name_unique ON suppliers (lower(name));


-- ─── Familles d'ingrédients ─────────────────────────────────────────────────
-- Permet les comparatifs « par matière première » : quel fournisseur est le
-- moins cher sur les légumes, sur la crémerie, etc.
ALTER TABLE ingredients
  ADD COLUMN IF NOT EXISTS category text
  CHECK (category IS NULL OR category IN (
    'legume', 'fruit', 'viande', 'poisson', 'cremerie', 'boulangerie',
    'epicerie', 'boisson', 'emballage', 'autre'
  ));


-- ─── Factures ───────────────────────────────────────────────────────────────
-- Le statut porte l'invariant central du lot : une facture lue par l'IA n'est
-- PAS une vérité. Elle reste `a_valider` jusqu'à confirmation humaine, et
-- aucun prix ne part en base avant le passage en `validee`. Sans ça, une
-- hallucination du parsing deviendrait un coût de revient faux, propagé
-- silencieusement dans toutes les recettes.
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid REFERENCES suppliers(id) ON DELETE RESTRICT,
  -- Date imprimée SUR la facture, pas la date d'import : c'est elle qui datera
  -- les prix, donc les courbes de hausse.
  invoice_date date,
  invoice_number text,
  -- Total lu sur le document, pour recouper la somme des lignes.
  total_cents integer CHECK (total_cents IS NULL OR total_cents >= 0),
  -- Chemin dans le bucket privé « invoices ».
  image_path text,
  status text NOT NULL DEFAULT 'a_lire' CHECK (status IN (
    'a_lire',      -- photo importée, parsing pas encore lancé
    'lecture',     -- parsing en cours
    'a_valider',   -- l'IA a proposé des lignes, en attente de confirmation
    'validee',     -- confirmée : les prix sont entrés en base
    'echec'        -- parsing impossible, raison dans parse_error
  )),
  parse_error text,
  parse_model text,
  parsed_at timestamptz,
  validated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS invoices_supplier_date_idx
  ON invoices (supplier_id, invoice_date DESC);
CREATE INDEX IF NOT EXISTS invoices_status_idx ON invoices (status);

-- Un même numéro de facture ne peut pas être importé deux fois pour un
-- fournisseur : sans ça, un double import doublerait l'historique de prix.
CREATE UNIQUE INDEX IF NOT EXISTS invoices_supplier_number_unique
  ON invoices (supplier_id, invoice_number)
  WHERE invoice_number IS NOT NULL AND supplier_id IS NOT NULL;


-- ─── Lignes de facture ──────────────────────────────────────────────────────
-- `raw_label` conserve TOUJOURS le libellé tel qu'écrit sur la facture, même
-- après rattachement à un ingrédient : c'est la seule trace vérifiable de ce
-- que le document disait, et ce qui permet de rejuger un rattachement douteux.
CREATE TABLE IF NOT EXISTS invoice_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  raw_label text NOT NULL,
  /** Nombre de conditionnements facturés (3 sacs). */
  quantity numeric(12,3) CHECK (quantity IS NULL OR quantity > 0),
  /** Contenu d'un conditionnement, dans base_unit (5000 pour un sac de 5 kg). */
  pack_quantity numeric(12,3) CHECK (pack_quantity IS NULL OR pack_quantity > 0),
  base_unit text CHECK (base_unit IS NULL OR base_unit IN ('g', 'ml', 'unit')),
  /** Prix d'UN conditionnement. */
  pack_price_cents integer CHECK (pack_price_cents IS NULL OR pack_price_cents >= 0),
  line_total_cents integer CHECK (line_total_cents IS NULL OR line_total_cents >= 0),
  -- Rattachement à un ingrédient. NULL = pas encore rattaché : la ligne existe,
  -- elle est lisible, mais elle ne produit aucun prix.
  ingredient_id uuid REFERENCES ingredients(id) ON DELETE SET NULL,
  -- Confiance du parsing (0 à 1), pour faire remonter en tête de validation
  -- les lignes que l'IA a mal lues. NULL = saisie humaine.
  confidence numeric(3,2) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS invoice_lines_invoice_idx ON invoice_lines (invoice_id);
CREATE INDEX IF NOT EXISTS invoice_lines_ingredient_idx ON invoice_lines (ingredient_id);


-- ─── Historique des prix ────────────────────────────────────────────────────
-- Une ligne par prix observé. C'est la source de vérité des comparateurs et
-- du calcul des hausses. Écrite UNIQUEMENT à la validation d'une facture.
CREATE TABLE IF NOT EXISTS ingredient_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id uuid NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  invoice_line_id uuid REFERENCES invoice_lines(id) ON DELETE CASCADE,
  -- Prix ramené à UNE unité de base, en centimes. numeric et non integer :
  -- un gramme de farine vaut 0,00178 centime, un integer l'arrondirait à 0.
  price_per_base_unit numeric(16,8) NOT NULL CHECK (price_per_base_unit > 0),
  pack_quantity numeric(12,3) NOT NULL CHECK (pack_quantity > 0),
  pack_price_cents integer NOT NULL CHECK (pack_price_cents >= 0),
  -- DATE DE LA FACTURE, pas date d'import : une facture de mars saisie en juin
  -- doit peser sur mars, sinon la courbe de hausse est fausse.
  observed_on date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ingredient_prices_lookup_idx
  ON ingredient_prices (ingredient_id, supplier_id, observed_on DESC);
CREATE INDEX IF NOT EXISTS ingredient_prices_date_idx
  ON ingredient_prices (observed_on DESC);


-- ─── Dernier prix connu par ingrédient et par fournisseur ───────────────────
-- Base du comparateur « qui est le moins cher sur cet ingrédient ».
CREATE OR REPLACE VIEW ingredient_latest_supplier_price
  WITH (security_invoker = on) AS
  SELECT DISTINCT ON (p.ingredient_id, p.supplier_id)
    p.ingredient_id,
    p.supplier_id,
    p.price_per_base_unit,
    p.pack_quantity,
    p.pack_price_cents,
    p.observed_on
  FROM ingredient_prices p
  ORDER BY p.ingredient_id, p.supplier_id, p.observed_on DESC, p.created_at DESC;


-- ─── RLS ────────────────────────────────────────────────────────────────────
-- Les prix fournisseurs sont la donnée la plus sensible de l'application.
ALTER TABLE suppliers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices           ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_lines      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredient_prices  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON ingredient_latest_supplier_price FROM anon, authenticated;
