# État d'avancement

Dernière mise à jour : 2026-09-11

## Bloquants

1. ~~Projet Supabase injoignable~~ **Résolu le 2026-09-11.** Le projet
   `kvsrrhcewpvxetwensre` était **en pause**, pas supprimé : Supabase retire le DNS d'un
   projet en pause, d'où le NXDOMAIN qui avait fait conclure à tort à une suppression.
   Réveillé, il répond, et `products` / `orders` / `formules` sont intactes.
   À retenir : ce projet n'est pas visible par le compte connecté au CLI Supabase, donc
   les migrations ne peuvent s'appliquer qu'à la main dans l'éditeur SQL du dashboard.
2. **Un token GitHub personnel est en clair dans `.git/config`** (URL du remote, préfixe
   `ghp_`). À révoquer, et repasser le remote en SSH.
3. **Migration `003_ingredients_recipes.sql` non appliquée.** Vérifié le 2026-09-11 :
   `ingredients`, `recipes`, `recipe_items`, `stock_movements` et `pin_attempts` renvoient
   toutes 404. Strictement additive, rollback documenté en tête de fichier. Sans elle,
   `/interface` refuse la connexion (fail closed sur le compteur de tentatives).
4. **`INTERFACE_PIN` non définie sur Vercel.** Posée à `1234` en local — à changer.

## Interface cuisine — 4 briques

| Brique | État |
|---|---|
| **A** Socle `/interface` + code 4 chiffres | Livré, PR #1 — écran vérifié, connexion NON VÉRIFIÉE (migration 003 non appliquée) |
| **B** Ingrédients + Recettes avec coûts | Livré, PR #1 — NON VÉRIFIÉ (migration 003 non appliquée) |
| **C** Stock du jour, déduction ventes, pertes, moyennes semaine/mois | À faire |
| **D** Factures photographiées et parsées, comparatifs fournisseurs/produits | À faire |

Le journal de mouvements et la provenance des prix sont déjà en place pour que C et D
se branchent sans migration ni reprise d'historique.

### Décisions actées

- Prix des ingrédients **dérivé des factures** ; `price_source` valant `facture`,
  `manuelle` ou `NULL`. Aucun total de recette n'est produit si un prix manque.
- Stock = `SUM(stock_movements.quantity)`. Un comptage écrit l'écart, pas une valeur
  absolue : cet écart est la perte mesurée que lira le lot C.
- Unités : `g`, `ml`, `unit`. Volumes stockés en ml, affichés en L.
- Pas de sous-recettes dans ce lot (une préparation maison se saisit comme ingrédient).
- `/interface` a sa propre porte, distincte de `/admin`.

### Reste à décider pour le lot C

- Source de vérité des ventes : les `orders` du click & collect ne couvrent qu'une part
  des ventes réelles du café. Sans réponse, la déduction automatique du stock sera
  partielle — et devra être annoncée comme telle à l'écran.

## Dette repérée, non traitée

- Les server actions de `/admin` (`app/actions/products.ts`, `daily-specials.ts`,
  `formules.ts`, `orders.ts`) utilisent la clé service role **sans vérifier le cookie
  admin**. Une server action est un endpoint HTTP public. `/interface` ne reproduit pas
  ce défaut, mais `/admin` reste exposé.
- Le cookie `admin_session` porte une valeur fixe (`authenticated`), donc falsifiable
  depuis les devtools. Celui de `/interface` est signé.
- Les lectures publiques avalent les erreurs Supabase et rendent une liste vide : une
  panne de base est indiscernable d'un catalogue vide. Constaté en vrai le 2026-09-10,
  projet en pause : `/carte` rendait zéro produit sans le moindre message.
- Numérotation des migrations en doublon (deux `001_`, deux `002_`).
