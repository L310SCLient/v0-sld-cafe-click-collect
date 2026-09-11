# État d'avancement

Dernière mise à jour : 2026-09-11 (2)

## Bloquants

1. ~~Projet Supabase injoignable~~ **Résolu le 2026-09-11.** Le projet
   `kvsrrhcewpvxetwensre` était **en pause**, pas supprimé : Supabase retire le DNS d'un
   projet en pause, d'où le NXDOMAIN qui avait fait conclure à tort à une suppression.
   Réveillé, il répond, et `products` / `orders` / `formules` sont intactes.
   À retenir : ce projet n'est pas visible par le compte connecté au CLI Supabase, donc
   les migrations ne peuvent s'appliquer qu'à la main dans l'éditeur SQL du dashboard.
2. **Un token GitHub personnel est en clair dans `.git/config`** (URL du remote, préfixe
   `ghp_`). À révoquer, et repasser le remote en SSH.
3. ~~Migration 003~~ **Appliquée le 2026-09-11.** 19 vérifications passées contre la
   base réelle (contraintes de prix, somme des mouvements, RESTRICT, étanchéité RLS).
   **Restent à appliquer : `004_journee_production_ventes.sql` et
   `005_factures_fournisseurs.sql`.** Strictement additives, rollback en tête de fichier.
4. **Bucket de stockage `invoices` à créer** (Supabase > Storage > New bucket, **privé**).
   Sans lui, l'import de photo de facture échoue avec un message explicite. Il doit rester
   privé : une photo de facture expose les prix négociés.
5. **`ANTHROPIC_API_KEY` absente.** Bloque la seule lecture automatique des factures.
   L'import, la saisie manuelle des lignes, la validation et les comparatifs fonctionnent
   sans elle ; l'écran affiche « lecture automatique hors service ».
4. **`INTERFACE_PIN` non définie sur Vercel.** Posée à `1234` en local — à changer.

## Interface cuisine — 4 briques

| Brique | État |
|---|---|
| **A** Socle `/interface` + code 4 chiffres | **Livré et vérifié à l'écran** — connexion au code, session ouverte |
| **B** Ingrédients + Recettes avec coûts | **Livré et vérifié à l'écran** — création d'ingrédient, prix au kg, réception de stock. Recettes créées depuis les produits du site. Alerte de stock bas avec seuil. |
| **C** Journée : production, ventes, clôture, pertes, moyennes | Schéma (004) écrit. Écrans et actions **à faire** |
| **D** Factures photographiées et parsées, comparatifs fournisseurs | Code livré. NON VÉRIFIÉ : migration 005, bucket et clé API manquants |

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

### Décisions actées pour le lot C

- Les ingrédients baissent **à la production**, pas à la vente : un sandwich invendu a
  coûté ses ingrédients.
- Ventes = compteur manuel `+1` **cumulé** avec les commandes click & collect.
  Trou connu : dans `orders.items`, une formule porte le `product_id` de la formule et les
  produits choisis n'existent qu'en texte dans `name`
  (`components/checkout-modal.tsx:98`). Ces ventes ne peuvent pas être créditées
  automatiquement ; l'écran devra les annoncer comme non comptées.
- Clôture de journée : le reste devient de la surproduction, avec son coût figé à cet
  instant.
- Alerte de stock : seuil par ingrédient, facultatif ; à défaut, alerte à zéro.

### Décisions actées pour le lot D

- Une facture lue par l'IA n'est **jamais** une vérité : statut `a_valider`, et aucun prix
  n'entre en base avant confirmation humaine.
- Les prix sont datés à la **date de la facture**, pas à la date d'import.
- Le prix courant d'un ingrédient vient du relevé le plus récent de son historique, donc
  une facture ancienne importée tardivement n'écrase rien.
- « Moins cher » exige deux fournisseurs ; une hausse exige deux dates différentes.

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
