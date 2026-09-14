# STATUS — v0-sld-cafe-click-collect
Mis à jour : 2026-09-14, 17:54

## Position
Branche `main`, à jour avec `origin/main` (`85b9953`), working tree propre.

- **PR #1** — interface cuisine, lots A à E — fusionnée le 2026-09-12 (`30c2962`).
- **PR #2** — icône « Cuisine » sur iPhone — fusionnée le 2026-09-12 (`d7d3897`).
- **PR #3** — squelette d'attente, cibles à 44 px, import depuis le Comparatif (`aafa316`).
- **PR #4** — préchargement des onglets, écran de facture au doigt (`ae5d608`).
- **PR #5** — photo de facture réduite avant l'envoi (`afe5c10`).
- **PR #6** — onglets sortis de sous la barre d'état de l'iPhone (`ea0dcb4`).
- **PR #7** — schémas de lecture refusés par l'API, corrigés et mis sous test (`8a442c7`).
- **PR #8** — ingrédient créé et rattaché automatiquement, champs renommés (`85b9953`).

Les huit sont fusionnées et **déployées en production**, chacune vérifiée `success` côté Vercel.

Branches dormantes : `feat-formules`, `redesign`, `v0/cecerieu31-5424-0fa09333`, plus les deux
branches fusionnées.

## Worktrees
Aucun worktree secondaire.

## Build
**Vert**, rejoué avant la PR #2, sans `next dev` actif : `tsc --noEmit` 0 · **100 tests** (8 fichiers)
· `npm run build` 0.

**Production Vercel : `85b9953` en `success`** (2026-09-14, 17:53). Vérifié sur le site lui-même :

- `/interface` déclare `/cuisine.webmanifest`, titre « Cuisine », `apple-touch-icon` en PNG ;
- `/cuisine.webmanifest` répond 200 avec `start_url: /interface` ;
- `/` garde `/manifest.json` et « SLD Café » : la boutique n'a pas bougé ;
- le service worker `sld-cafe-v2` est en ligne ;
- un visiteur anonyme sur `/interface/recettes` reçoit `NEXT_REDIRECT;/interface;307` et **aucune
  donnée** : la garde tient.

## En cours
Rien d'ouvert. Deux journées sur la PWA : lenteur ressentie, confort mobile, import impossible
depuis le Comparatif, onglets illisibles sur iPhone, panne de la première lecture réelle, puis
retours d'usage sur l'écran de facture — « conditionnement » incompréhensible et ingrédients à
rattacher un par un. Cinq correctifs livrés et déployés — squelette
d'attente, préchargement des onglets, cibles tactiles à 44 px, grilles de l'écran de facture en une
à deux colonnes sur téléphone, photo réduite à 1600 px avant envoi (ce qui convertit aussi le HEIC).
Prochaine brique à écrire : **lot C**, la journée.

## Bloqué
- ~~En-tête sous la barre d'état, onglets qui débordent~~ **Corrigé et constaté** : la capture du
  2026-09-14 (17:36) montre les onglets sous l'heure, « Factures » nommé, les trois autres en icône
  seule et la déconnexion dégagée du bord. Les deux captures de Liam ont appris en quelques secondes
  ce que la lecture du code ne montrait pas : je ne peux pas voir un rendu mobile moi-même — le
  redimensionnement de fenêtre de Chrome reste sans effet sur la zone de rendu, et une session
  expirée ne se rouvre pas sans le code, que je ne saisis pas. **Toute vérification mobile passe
  donc par une capture de Liam.**
- **Prérequis oublié dans le parcours facture** : sans fournisseur enregistré, une facture ne peut
  pas être validée. Le bandeau le dit, mais rien ne force à en créer un avant de photographier.
- **La latence de 200 ms n'est pas supprimée, seulement masquée.** Aller-retour serveur mesuré entre
  127 et 385 ms en production, dont 99 à 165 ms de requêtes Supabase. Leviers restants : alléger
  l'écran Recettes, qui expédie les 97 recettes avec tous leurs ingrédients d'un bloc, et donner un
  retour visuel immédiat sur les boutons d'enregistrement.
- ~~Première facture cassée à la lecture~~ **Lue avec succès le 2026-09-14** (capture à l'appui) :
  « BAGUETTE L'ARTIGUETTE PRECUITE 300g / Carton 26 pièces », 92 % de confiance, 19,30 € le carton
  de 26 → 0,74 € la pièce ; « SANDWICH FANNY MULTI CEREALES 140g », 92 % ; total 140,60 €. La chaîne
  tient donc de la photo jusqu'aux lignes proposées. La panne initiale venait du schéma (`enum` mêlé
  à un `type` multiple), corrigée par la PR #7.
- **Aucune facture n'a encore été validée de bout en bout**, et **aucun fournisseur n'est enregistré**
  — la validation le refusera tant que ce sera le cas. Prochaine relance attendue de Liam pour voir
  le rattachement automatique à l'œuvre (PR #8) : attention, une relance **réécrit les lignes** et
  perdrait des corrections manuelles. Les lots D et E restent **NON VÉRIFIÉS** de bout
  en bout. On attend que Liam photographie une facture depuis `/interface` sur son iPhone.
- **Lot E sans matière** : Liam n'a pas de fiches recettes à importer pour l'instant.
- **Étanchéité RLS des tables 004, 005 et 006 NON VÉRIFIÉE** : elles sont vides, donc une fuite
  éventuelle ne peut pas être mise en évidence. À refaire dès qu'une facture y aura écrit.
- **Un token GitHub personnel est en clair dans `.git/config`** (préfixe `ghp_`). À révoquer, et
  repasser le remote en SSH.
- **`gh` repasse seul sur le compte `lacompagnietextile`**, qui n'a qu'un droit de lecture : toute
  commande d'écriture doit épingler le jeton de `L310SCLient`
  (`GH_TOKEN=$(gh auth token --user L310SCLient) gh ...`).
- **`sldcafe.fr` ne se résout pas** (aucun DNS) : seule `v0-sld-cafe-click-collect.vercel.app` répond.

## Prochaine action
Photographie une facture depuis l'onglet Factures sur l'iPhone et valide-la : tout est en ligne, et
c'est la seule vérification qui manque aux lots D et E.

---

## Interface cuisine — 5 briques

| Brique | État |
|---|---|
| **A** Socle `/interface` + code 4 chiffres | **Livré, en production** — connexion au code, session signée |
| **B** Ingrédients + Recettes avec coûts | **Livré, en production** — prix au kg, réception de stock, alerte de seuil |
| **C** Journée : production, ventes, clôture, pertes | Schéma `004` appliqué. Écrans et actions **à écrire** |
| **D** Factures photographiées, comparatifs fournisseurs | Livré et déployé ; `005` appliquée, bucket privé prouvé, clé API valide. **NON VÉRIFIÉ** : aucune facture réelle |
| **E** Import de recettes par fichier | Livré et déployé ; `006` appliquée. **NON VÉRIFIÉ** : aucune fiche à importer pour l'instant |

### Historique des bloquants résolus

- **Migration `006`** — appliquée par Liam le 2026-09-12. Les 6 tables existent et
  `recipes.portions_confirmed` est en place (vérifié par requête REST en service role).
- **Buckets de stockage** — `invoices` et `recipe-files` créés et **vérifiés privés** le 2026-09-12.
  Envoi, relecture en service role et refus d'accès anonyme testés de bout en bout sur `invoices`.
- **Déploiements Preview en échec** — 5 échecs consécutifs depuis le premier push de la branche :
  `pnpm-lock.yaml` n'avait pas suivi l'ajout de `@anthropic-ai/sdk` et `vitest`, or Vercel installe
  avec pnpm en `--frozen-lockfile`. Reproduit en local avec `main` comme témoin, corrigé par
  `f777353`. Même panne déjà vue le 2026-04-09.
- **Projet Supabase injoignable** — résolu le 2026-09-11 : le projet était **en pause**, pas
  supprimé ; Supabase retire le DNS d'un projet en pause, d'où le NXDOMAIN trompeur.
- **Migrations 004 et 005** — appliquées le 2026-09-11, 8 tables vérifiées. Effet visible : le
  Comparatif, qui plantait faute de `ingredient_prices`, s'affiche.
- **Migration 003** — appliquée le 2026-09-11, 19 vérifications passées contre la base réelle.

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

- Création depuis les produits de la carte : **retirée** (composant, bouton, action et lecture).
- Les fiches **remplissent** les 97 recettes existantes par correspondance de nom, casse ignorée ;
  sans correspondance, elles créent la recette. Les 97 noms sont distincts : aucune ambiguïté.
- Import en **deux temps** : liste d'ingrédients dédoublonnée sur tout le lot, validée une fois, puis
  les recettes. Rien n'entre dans `recipes` avant validation.
- **Rendement** lu sur la fiche et corrigible ; absent, la recette porte `portions_confirmed = false`
  (« à préciser ») — jamais 1 supposé, qui fausserait tous les coûts à la pièce.
- Une ligne **non chiffrable** (« une pincée », unité incompatible avec l'ingrédient) crée quand même
  l'ingrédient mais part dans `recipe_missing_items` : la recette est incomplète et son coût est masqué.
- Fichiers conservés dans le bucket privé **`recipe-files`** (créé et vérifié privé le 2026-09-12).
- Formats lus : **images, PDF, CSV, TXT, MD**. Word et Excel sont refusés à l'envoi avec un message
  explicite (« enregistre-le en PDF ou en CSV ») plutôt que d'échouer à la lecture.

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
  **Corrigé, fusionné et en production (`ffb1f4b`).** Cause des deux bugs vus par Liam sur `localhost` : Comparatif
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
- ~~Icône iPhone en SVG~~ **Corrigé et en production** : `apple-touch-icon` pointe sur un PNG 180×180,
  et `/interface` a son propre manifeste (`f629eb2`).
