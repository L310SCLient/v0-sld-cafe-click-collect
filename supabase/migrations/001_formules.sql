-- Table formules
CREATE TABLE IF NOT EXISTS formules (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  tagline text NOT NULL DEFAULT '',
  price integer NOT NULL, -- cents
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Table formule_etapes
CREATE TABLE IF NOT EXISTS formule_etapes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  formule_id uuid NOT NULL REFERENCES formules(id) ON DELETE CASCADE,
  label text NOT NULL,
  category text NOT NULL, -- matches products.category
  choix_count integer NOT NULL DEFAULT 1,
  display_order integer NOT NULL DEFAULT 0
);

-- RLS: public read for active formules, admin write
ALTER TABLE formules ENABLE ROW LEVEL SECURITY;
ALTER TABLE formule_etapes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active formules" ON formules
  FOR SELECT USING (is_active = true);

CREATE POLICY "Service role can manage formules" ON formules
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public can read etapes of active formules" ON formule_etapes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM formules WHERE formules.id = formule_etapes.formule_id AND formules.is_active = true)
  );

CREATE POLICY "Service role can manage formule_etapes" ON formule_etapes
  FOR ALL USING (true) WITH CHECK (true);

-- Seed: 3 formules
INSERT INTO formules (id, name, tagline, price, is_active, display_order) VALUES
  ('f1000000-0000-0000-0000-000000000001', 'La Formule Midi', 'Le déjeuner complet, équilibré comme à la maison.', 950, true, 1),
  ('f1000000-0000-0000-0000-000000000002', 'La Formule Légère', 'Une grande salade, et tout ce qu''il faut autour.', 1050, true, 2),
  ('f1000000-0000-0000-0000-000000000003', 'La Formule Express', 'Pour les jours pressés, sans rien sacrifier.', 650, true, 3);

-- Seed etapes
INSERT INTO formule_etapes (formule_id, label, category, choix_count, display_order) VALUES
  -- Midi
  ('f1000000-0000-0000-0000-000000000001', 'Choisis ton sandwich', 'sandwichs', 1, 1),
  ('f1000000-0000-0000-0000-000000000001', 'Choisis ta boisson', 'boissons', 1, 2),
  ('f1000000-0000-0000-0000-000000000001', 'Choisis ton dessert', 'desserts', 1, 3),
  -- Légère
  ('f1000000-0000-0000-0000-000000000002', 'Choisis ta salade', 'salades', 1, 1),
  ('f1000000-0000-0000-0000-000000000002', 'Choisis ta boisson', 'boissons', 1, 2),
  ('f1000000-0000-0000-0000-000000000002', 'Choisis ton dessert', 'desserts', 1, 3),
  -- Express
  ('f1000000-0000-0000-0000-000000000003', 'Choisis ton sandwich', 'sandwichs', 1, 1),
  ('f1000000-0000-0000-0000-000000000003', 'Choisis ta viennoiserie', 'viennoiseries', 1, 2),
  ('f1000000-0000-0000-0000-000000000003', 'Choisis ta boisson', 'boissons', 1, 3);
