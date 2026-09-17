-- ============================================================================
-- Lot G — Bons de livraison et import en masse
-- ----------------------------------------------------------------------------
-- Migration STRICTEMENT ADDITIVE. Deux tables neuves. Rien n'est modifié sur
-- invoices, invoice_lines, ingredient_prices, suppliers ni ingredients.
--
-- PRÉREQUIS MANUEL : créer un bucket de stockage PRIVÉ nommé « delivery-notes »
--   Dashboard > Storage > New bucket > name: delivery-notes, Public: OFF
-- Même règle que « invoices » : la photo d'un bon porte les prix négociés
-- avec le fournisseur. Bucket distinct pour pouvoir purger les bons sans
-- toucher aux factures, qui sont les pièces comptables.
--
-- CE QUE CES TABLES DISENT, ET CE QU'ELLES NE DISENT PAS
-- Le bon de livraison est ce que le restaurant photographie au quotidien ; la
-- facture arrive plus tard. Le bon donne donc un prix PROVISOIRE et la facture
-- fait AUTORITÉ. Conséquence tenue ici : un bon n'écrit RIEN dans
-- ingredient_prices. Seule la validation d'une facture y écrit (lot D). Un bon
-- validé ne fait que constater des lignes lues, en attente de leur facture.
--
-- Rollback (dans cet ordre) :
--   DROP TABLE IF EXISTS delivery_note_lines, delivery_notes;
-- ============================================================================


-- ─── Bons de livraison ──────────────────────────────────────────────────────
-- `invoice_id` est NULLABLE et le restera : un bon non rattaché est le cas
-- NORMAL, pas une anomalie de saisie — c'est même précisément ce qu'il faut
-- voir à l'écran. D'où le ON DELETE SET NULL : supprimer une facture ne doit
-- jamais emporter la trace du bon, qui est le seul document reçu ce jour-là.
CREATE TABLE IF NOT EXISTS delivery_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid REFERENCES suppliers(id) ON DELETE RESTRICT,
  invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL,
  -- Date imprimée SUR le bon, c'est-à-dire le jour de la livraison.
  delivery_date date,
  note_number text,
  -- Chemin dans le bucket privé « delivery-notes ».
  image_path text,
  status text NOT NULL DEFAULT 'a_lire' CHECK (status IN (
    'a_lire',      -- photo importée, lecture pas encore lancée
    'lecture',     -- lecture en cours
    'a_valider',   -- l'IA a proposé des lignes, en attente de confirmation
    'validee',     -- lignes confirmées ; les prix restent provisoires
    'echec'        -- lecture impossible, raison dans parse_error
  )),
  parse_error text,
  parse_model text,
  parsed_at timestamptz,
  validated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Retrouver les bons d'une facture, et lister les orphelins (invoice_id NULL)
-- sans balayer la table : c'est la requête de l'écran.
CREATE INDEX IF NOT EXISTS delivery_notes_invoice_idx ON delivery_notes (invoice_id);
CREATE INDEX IF NOT EXISTS delivery_notes_status_idx ON delivery_notes (status);
CREATE INDEX IF NOT EXISTS delivery_notes_supplier_date_idx
  ON delivery_notes (supplier_id, delivery_date DESC);


-- ─── Lignes de bon de livraison ─────────────────────────────────────────────
-- Même forme que invoice_lines (lot D), volontairement : le document a la même
-- structure et la même lecture. Table séparée plutôt qu'un drapeau sur
-- invoice_lines, pour que l'invariant du lot D tienne sans exception —
-- ingredient_prices ne se remplit que depuis invoice_lines, donc un bon ne
-- peut pas écrire un prix dans l'historique, même par erreur de code.
CREATE TABLE IF NOT EXISTS delivery_note_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_note_id uuid NOT NULL REFERENCES delivery_notes(id) ON DELETE CASCADE,
  -- Libellé tel qu'écrit sur le bon. Jamais réécrit, même après rattachement :
  -- c'est la seule trace vérifiable de ce que le document disait.
  raw_label text NOT NULL,
  /** Nombre de conditionnements livrés (3 sacs). */
  quantity numeric(12,3) CHECK (quantity IS NULL OR quantity > 0),
  /** Contenu d'un conditionnement, dans base_unit (5000 pour un sac de 5 kg). */
  pack_quantity numeric(12,3) CHECK (pack_quantity IS NULL OR pack_quantity > 0),
  base_unit text CHECK (base_unit IS NULL OR base_unit IN ('g', 'ml', 'unit')),
  /** Prix d'UN conditionnement, tel que valorisé sur le bon. Provisoire. */
  pack_price_cents integer CHECK (pack_price_cents IS NULL OR pack_price_cents >= 0),
  line_total_cents integer CHECK (line_total_cents IS NULL OR line_total_cents >= 0),
  -- NULL = pas encore rattaché : la ligne existe et se lit, elle ne produit
  -- simplement aucun rapprochement.
  ingredient_id uuid REFERENCES ingredients(id) ON DELETE SET NULL,
  -- Confiance du parsing (0 à 1). NULL = saisie humaine.
  confidence numeric(3,2) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS delivery_note_lines_note_idx
  ON delivery_note_lines (delivery_note_id);
CREATE INDEX IF NOT EXISTS delivery_note_lines_ingredient_idx
  ON delivery_note_lines (ingredient_id);


-- ─── Sécurité ───────────────────────────────────────────────────────────────
-- Même règle que 003, 005 et 006 : RLS activée sans aucune policy, donc rien
-- n'est lisible avec la clé publique. Seule la clé service role, côté serveur
-- et derrière la garde de /interface, accède à ces tables.
ALTER TABLE delivery_notes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_note_lines  ENABLE ROW LEVEL SECURITY;
