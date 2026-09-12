# STATUS — v0-sld-cafe-click-collect
Mis à jour : 2026-09-11, 22:17

## Position
Branche `feat/interface-ingredients-recettes` · **17 commits d'avance sur `main`, 0 de retard** ·
**0 commit non poussé** (dernier push : `1dfd044`, le 2026-09-11 à 20:33) · working tree propre
hormis le correctif du service worker (`public/sw.js`, `lib/pwa/sw.test.ts`) et `STATUS.md`,
non commités.

**PR #1 ouverte** depuis le 2026-09-10 : « Interface cuisine — socle /interface (code 4 chiffres)
+ Ingrédients & Recettes ». Elle porte désormais les 17 commits, donc bien plus que son titre.

## Worktrees
Aucun worktree secondaire. Un seul arbre : `/Users/liamdarot/Desktop/v0-sld-cafe-click-collect`.

Branches locales dormantes, non fusionnées, sans suivi distant :
`feat-formules` (0d0d944), `redesign` (e121cdf). `v0/cecerieu31-5424-0fa09333` suit l'origine.

## Build
**Vert**, établi le 2026-09-11 à 18:03-18:05, aucun `next dev` en cours pendant les commandes :

- `npx tsc --noEmit` → `TSC_EXIT=0`, aucune sortie.
- `npx vitest run` → **6 fichiers, 73 tests passés**, 878 ms.
- `npm run build` → `BUILD_EXIT=0`, 16 pages générées, 18 routes.

Rejoué le 2026-09-11 à 22:15, après le correctif du service worker : `tsc` 0, **80 tests** (7 fichiers),
build 0.

**Vercel Preview : verte depuis `1dfd044` (2026-09-11, 20:33).** Avant le correctif, les 5 déploiements Preview
(2026-09-10 16:32 → 2026-09-11 12:08) sont en `failure` ; dernier succès : Production `0053ae9`
(= `main`) le 2026-06-16. Cause reproduite en local, avec `main` comme témoin : la branche a
ajouté `@anthropic-ai/sdk` et `vitest` à `package.json` et `package-lock.json`, pas à
`pnpm-lock.yaml` ; or Vercel installe avec pnpm en `--frozen-lockfile` →
`ERR_PNPM_OUTDATED_LOCKFILE`. Même panne déjà corrigée le 2026-04-09 (`631942c`).
Journal Vercel lui-même : NON VÉRIFIÉ (inaccessible sans compte Vercel connecté).
Correctif `f777353` : `pnpm-lock.yaml` régénéré (+652 / −0, aucune version existante
modifiée), installation stricte verte avec pnpm 10.32.1 et 9.15.9 ; build gate rejoué ensuite :
`tsc` 0, 73 tests, build 0.
Après push, statut Vercel `pending` à 20:33:09 → `success` à 20:33:24 : 15 s de travail, contre 4 s
pour l'échec précédent, qui tombait dès l'installation. Contenu du déploiement : **NON VÉRIFIÉ** — la
Preview est protégée par la connexion Vercel, toutes ses URLs redirigent vers « Log in to Vercel ».
URL : https://v0-sld-cafe-click-collect-1wi8mscbd-cecerieu31-5424s-projects.vercel.app

Le build confirme par l'absence de route que le lot C n'est pas écrit : on voit
`/interface`, `/interface/ingredients`, `/interface/recettes`, `/interface/factures`,
`/interface/factures/[id]`, `/interface/comparatif` — **pas de `/interface/journee`**.

## En cours
Service worker corrigé, testé et vérifié dans Chrome, non commité. Prochain chantier : import de
recettes par fichier, à cadrer. Lot D : 005 appliquée mais bucket manquant, **NON VÉRIFIÉ** sur une vraie
facture. Lot C : schéma 004 appliqué, écrans à écrire.

## Bloqué
- **Bucket de stockage `invoices` à créer** (Supabase > Storage > New bucket, **privé**). On attend
  Liam. Sans lui l'import de photo échoue avec un message explicite. Privé impérativement : une
  photo de facture expose les prix négociés.
- **`ANTHROPIC_API_KEY`** — posée dans `.env.local` le 2026-09-11 et **acceptée par l'API**
  (`models.list` : 11 modèles, `claude-opus-5` inclus, aucun token consommé). Sur Vercel : NON VÉRIFIÉ
  (pas de CLI Vercel). Elle doit être cochée pour l'environnement **Preview** : le code des factures
  n'existe que sur la branche. Décision actée : pas d'abonnement Claude Max pour ce parsing (CGU de
  l'Agent SDK).
- **Preview protégée par la connexion Vercel.** Déploiement réussi, mais invisible sans compte
  Vercel : on attend que Liam l'ouvre, connecté, et y teste la connexion par code. Il faut pour
  cela `INTERFACE_PIN` défini sur Vercel pour Preview — NON VÉRIFIÉ.
- **`INTERFACE_PIN` non définie sur Vercel.** On attend la valeur choisie par Liam ; posée à `1234`
  en local, à ne pas laisser telle quelle en production.
- **Un token GitHub personnel est en clair dans `.git/config`** (URL du remote, préfixe `ghp_`).
  On attend que Liam le révoque et repasse le remote en SSH.
- **Lot D non vérifiable à l'écran** tant que le bucket `invoices` n'existe pas.

## Prochaine action
Crée le bucket privé `invoices` dans Supabase (Storage > New bucket) : c'est le dernier prérequis avant
de tester l'import d'une vraie facture.

---

## Interface cuisine — 4 briques

| Brique | État |
|---|---|
| **A** Socle `/interface` + code 4 chiffres | **Livré et vérifié à l'écran** — connexion au code, session ouverte |
| **B** Ingrédients + Recettes avec coûts | **Livré et vérifié à l'écran** — création d'ingrédient, prix au kg, réception de stock. Recettes créées depuis les produits du site. Alerte de stock bas avec seuil. |
| **C** Journée : production, ventes, clôture, pertes, moyennes | Schéma (004) écrit. Écrans et actions **à faire** |
| **D** Factures photographiées et parsées, comparatifs fournisseurs | Code livré et buildé. **NON VÉRIFIÉ** : migration 005, bucket et clé API manquants |

Le journal de mouvements et la provenance des prix sont déjà en place pour que C et D se branchent
sans migration supplémentaire ni reprise d'historique.

### Historique des bloquants résolus

- **Projet Supabase injoignable** — résolu le 2026-09-11. Le projet `kvsrrhcewpvxetwensre` était
  **en pause**, pas supprimé : Supabase retire le DNS d'un projet en pause, d'où le NXDOMAIN qui
  avait fait conclure à tort à une suppression. Réveillé, il répond, et `products` / `orders` /
  `formules` sont intactes.
- **Migrations 004 et 005** — appliquées par Liam le 2026-09-11. Les 8 tables existent (vérifié par
  requête REST en service role). Étanchéité RLS **NON VÉRIFIÉE** : les tables sont vides. Effet visible :
  le Comparatif, qui plantait (`ingredient_prices` introuvable), s'affiche désormais.
- **Migration 003** — appliquée le 2026-09-11. 19 vérifications passées contre la base réelle
  (contraintes de prix, somme des mouvements, RESTRICT, étanchéité RLS).

### Décisions actées — socle

- Prix des ingrédients **dérivé des factures** ; `price_source` valant `facture`, `manuelle` ou
  `NULL`. Aucun total de recette n'est produit si un prix manque.
- Stock = `SUM(stock_movements.quantity)`. Un comptage écrit l'écart, pas une valeur absolue :
  cet écart est la perte mesurée que lira le lot C.
- Unités : `g`, `ml`, `unit`. Volumes stockés en ml, affichés en L.
- Pas de sous-recettes dans ce lot (une préparation maison se saisit comme ingrédient).
- `/interface` a sa propre porte, distincte de `/admin`.

### Décisions actées — lot C

- Les ingrédients baissent **à la production**, pas à la vente : un sandwich invendu a coûté
  ses ingrédients.
- Ventes = compteur manuel `+1` **cumulé** avec les commandes click & collect.
  Trou connu : dans `orders.items`, une formule porte le `product_id` de la formule et les produits
  choisis n'existent qu'en texte dans `name` (`components/checkout-modal.tsx:98`). Ces ventes ne
  peuvent pas être créditées automatiquement ; l'écran devra les annoncer comme non comptées.
- Clôture de journée : le reste devient de la surproduction, coût figé à cet instant.
- Alerte de stock : seuil par ingrédient, facultatif ; à défaut, alerte à zéro.

### Décisions actées — lot D

- Une facture lue par l'IA n'est **jamais** une vérité : statut `a_valider`, et aucun prix n'entre
  en base avant confirmation humaine.
- Les prix sont datés à la **date de la facture**, pas à la date d'import.
- Le prix courant d'un ingrédient vient du relevé le plus récent de son historique : une facture
  ancienne importée tardivement n'écrase rien.
- « Moins cher » exige deux fournisseurs ; une hausse exige deux dates différentes.

### Décisions actées — recettes (2026-09-11)

- La création de recettes depuis les produits de la carte sera **retirée** : jugée inutile par Liam.
- Remplacée par un **import de fichiers de recettes**, tous formats (Excel, CSV, PDF, photos, Word), lu
  directement par Claude via la clé API, dans l'app, sans file d'attente. À cadrer avant d'écrire.

## Dette repérée, non traitée

- Les server actions de `/admin` (`app/actions/products.ts`, `daily-specials.ts`, `formules.ts`,
  `orders.ts`) utilisent la clé service role **sans vérifier le cookie admin**. Une server action
  est un endpoint HTTP public. `/interface` ne reproduit pas ce défaut, mais `/admin` reste exposé.
- Le cookie `admin_session` porte une valeur fixe (`authenticated`), donc falsifiable depuis les
  devtools. Celui de `/interface` est signé.
- Les lectures publiques avalent les erreurs Supabase et rendent une liste vide : une panne de base
  est indiscernable d'un catalogue vide. Constaté en vrai le 2026-09-10, projet en pause : `/carte`
  rendait zéro produit sans le moindre message.
- Numérotation des migrations en doublon : deux `001_` (`001_formules.sql`, `001_init.sql`) et
  deux `002_` (`002_daily_specials_custom.sql`, `002_product_images.sql`).
- ~~Service worker qui remplace une page absente par l'accueil et stocke les pages authentifiées~~
  **Corrigé le 2026-09-11, non commité.** Cause des deux bugs vus par Liam sur `localhost` : Comparatif
  affichant l'accueil, et pavé de code aux boutons morts (copie de `/interface` resservie serveur
  éteint). `/interface` et `/admin` ne sont plus ni stockées ni resservies ; hors ligne, page
  « Pas de connexion » (503) ; cache passé en `sld-cafe-v2`, ce qui efface l'ancien sur les appareils.
  7 tests dans `lib/pwa/sw.test.ts`. Vérifié dans Chrome : ancien cache effacé, 0 page privée stockée,
  Comparatif et pavé hors ligne → « Pas de connexion », accueil public toujours disponible hors ligne.
- Serveur de dev ouvert depuis une autre adresse que `localhost` (`127.0.0.1`, IP réseau d'un
  téléphone) : Next 16 bloque ses ressources de dev, la page s'affiche mais aucun bouton ne répond.
  Pour tester sur téléphone : `allowedDevOrigins` dans `next.config.mjs`, ou la Preview.
- `next-env.d.ts` est réécrit différemment par `next dev` et par `next build` : il apparaît modifié
  en permanence.
- `sldcafe.fr` ne se résout pas (aucun enregistrement DNS, pas de NS) ; seule
  `v0-sld-cafe-click-collect.vercel.app` répond.
- `next.config.mjs` : `typescript.ignoreBuildErrors: true` — un build vert ne prouve rien côté types,
  seul `tsc --noEmit` fait foi.
- Deux verrous de dépendances (`package-lock.json` et `pnpm-lock.yaml`) : c'est ce qui laisse le verrou
  pnpm dériver sans que personne ne le voie. Vercel n'utilise que le second.
- Le correctif de l'icône iPhone (`1767e7a`) n'est pas sur `main` : en prod, `apple-touch-icon` pointe
  encore vers un SVG qu'iOS ignore.
