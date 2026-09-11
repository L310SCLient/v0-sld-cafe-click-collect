# STATUS — v0-sld-cafe-click-collect
Mis à jour : 2026-09-11, 20:31

## Position
Branche `feat/interface-ingredients-recettes` · **14 commits d'avance sur `main`, 0 de retard** ·
**0 commit non poussé** (à jour avec `origin`) · working tree : `pnpm-lock.yaml` régénéré,
**non commité** (correctif Vercel, voir Build), `STATUS.md` modifié, et `next-env.d.ts` —
fichier auto-généré par Next au build, à ne pas commiter.

**PR #1 ouverte** depuis le 2026-09-10 : « Interface cuisine — socle /interface (code 4 chiffres)
+ Ingrédients & Recettes ». Elle porte désormais les 14 commits, donc bien plus que son titre.

## Worktrees
Aucun worktree secondaire. Un seul arbre : `/Users/liamdarot/Desktop/v0-sld-cafe-click-collect`.

Branches locales dormantes, non fusionnées, sans suivi distant :
`feat-formules` (0d0d944), `redesign` (e121cdf). `v0/cecerieu31-5424-0fa09333` suit l'origine.

## Build
**Vert**, établi le 2026-09-11 à 18:03-18:05, aucun `next dev` en cours pendant les commandes :

- `npx tsc --noEmit` → `TSC_EXIT=0`, aucune sortie.
- `npx vitest run` → **6 fichiers, 73 tests passés**, 878 ms.
- `npm run build` → `BUILD_EXIT=0`, 16 pages générées, 18 routes.

**Vercel Preview : rouge depuis le premier push de la branche.** Les 5 déploiements Preview
(2026-09-10 16:32 → 2026-09-11 12:08) sont en `failure` ; dernier succès : Production `0053ae9`
(= `main`) le 2026-06-16. Cause reproduite en local, avec `main` comme témoin : la branche a
ajouté `@anthropic-ai/sdk` et `vitest` à `package.json` et `package-lock.json`, pas à
`pnpm-lock.yaml` ; or Vercel installe avec pnpm en `--frozen-lockfile` →
`ERR_PNPM_OUTDATED_LOCKFILE`. Même panne déjà corrigée le 2026-04-09 (`631942c`).
Journal Vercel lui-même : NON VÉRIFIÉ (inaccessible sans compte Vercel connecté).
Correctif prêt, **non commité** : `pnpm-lock.yaml` régénéré (+652 / −0, aucune version existante
modifiée), installation stricte verte avec pnpm 10.32.1 et 9.15.9 ; build gate rejoué ensuite :
`tsc` 0, 73 tests, build 0.

Le build confirme par l'absence de route que le lot C n'est pas écrit : on voit
`/interface`, `/interface/ingredients`, `/interface/recettes`, `/interface/factures`,
`/interface/factures/[id]`, `/interface/comparatif` — **pas de `/interface/journee`**.

## En cours
Correctif du déploiement Vercel : `pnpm-lock.yaml` régénéré et vérifié, en attente de commit et
de push. Lot D : code complet, clé API posée en local et acceptée par l'API, toujours **NON VÉRIFIÉ**
sur une vraie facture (migration 005 et bucket manquants). Lot C : à écrire.

## Bloqué
- **Migrations `004_journee_production_ventes.sql` et `005_factures_fournisseurs.sql` non appliquées.**
  On attend Liam : le projet Supabase `kvsrrhcewpvxetwensre` n'est pas visible par le compte du CLI,
  donc l'application passe obligatoirement par l'éditeur SQL du dashboard. Les deux sont
  strictement additives, rollback en tête de fichier.
- **Bucket de stockage `invoices` à créer** (Supabase > Storage > New bucket, **privé**). On attend
  Liam. Sans lui l'import de photo échoue avec un message explicite. Privé impérativement : une
  photo de facture expose les prix négociés.
- **`ANTHROPIC_API_KEY`** — posée dans `.env.local` le 2026-09-11 et **acceptée par l'API**
  (`models.list` : 11 modèles, `claude-opus-5` inclus, aucun token consommé). Sur Vercel : NON VÉRIFIÉ
  (pas de CLI Vercel). Elle doit être cochée pour l'environnement **Preview** : le code des factures
  n'existe que sur la branche. Décision actée : pas d'abonnement Claude Max pour ce parsing (CGU de
  l'Agent SDK).
- **Déploiements Preview rouges.** Correctif prêt en local ; on attend l'accord de Liam pour le
  commit et le push, qui déclencheront un nouveau déploiement.
- **`INTERFACE_PIN` non définie sur Vercel.** On attend la valeur choisie par Liam ; posée à `1234`
  en local, à ne pas laisser telle quelle en production.
- **Un token GitHub personnel est en clair dans `.git/config`** (URL du remote, préfixe `ghp_`).
  On attend que Liam le révoque et repasse le remote en SSH.
- **Lot D non vérifiable à l'écran** tant que les trois premiers points ne sont pas faits.

## Prochaine action
Commite et pousse `pnpm-lock.yaml` régénéré sur la branche, puis vérifie que le déploiement Preview
passe au vert — tant qu'il est rouge, ni la clé ni aucun lot ne peut être testé sur Vercel.

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
- `public/sw.js:68` : hors ligne, une page absente du cache est remplacée **en silence** par l'accueil
  `/`, URL inchangée. Constaté le 2026-09-11 : `/interface/comparatif` affichait l'accueil, serveur de
  dev arrêté. Le même service worker met en cache les pages authentifiées — `/interface/ingredients`
  et `/interface/recettes` trouvées dans `sld-cafe-v1` : prix et coûts restent sur l'appareil après
  déconnexion.
- `sldcafe.fr` ne se résout pas (aucun enregistrement DNS, pas de NS) ; seule
  `v0-sld-cafe-click-collect.vercel.app` répond.
- `next.config.mjs` : `typescript.ignoreBuildErrors: true` — un build vert ne prouve rien côté types,
  seul `tsc --noEmit` fait foi.
- Deux verrous de dépendances (`package-lock.json` et `pnpm-lock.yaml`) : c'est ce qui laisse le verrou
  pnpm dériver sans que personne ne le voie. Vercel n'utilise que le second.
- Le correctif de l'icône iPhone (`1767e7a`) n'est pas sur `main` : en prod, `apple-touch-icon` pointe
  encore vers un SVG qu'iOS ignore.
