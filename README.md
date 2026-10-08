# Kori

Kori est en ligne : https://kori-eta.vercel.app/

Application de suivi des dépenses, des budgets et des objectifs d’épargne, en FCFA. Les données des comptes sont stockées dans Supabase avec des règles RLS.

## Connexion déjà préparée

- Le projet Supabase Kori et ses migrations sont installés.
- Le site utilise l’URL Supabase et sa clé publishable.
- Vercel contient l’URL publique du site, l’URL Supabase et la clé publishable.
- La clé publishable est prévue pour le navigateur; elle n’est pas une clé privée.

## Dernier réglage à faire dans Supabase

Dans **Authentication → URL Configuration** :

- **Site URL** : `https://kori-eta.vercel.app`
- **Redirect URLs** : ajoute `https://kori-eta.vercel.app/**`

Cela permet aux liens de confirmation et de réinitialisation de revenir sur le site.

## Fonctions qui demandent encore des accès privés

Pour la suppression de compte et les paiements, ajoute dans **Vercel → Kori → Settings → Environment Variables** :

- `SUPABASE_SERVICE_ROLE_KEY` : la clé serveur Supabase `sb_secret_...`, en type **Sensitive/Encrypted**, jamais dans GitHub ni dans `config.js`.

Puis republie le projet. Le code accepte également l’ancienne clé serveur `service_role`.

## Paiements et publicités

Les paiements restent désactivés tant que le prix mensuel et les accès marchands ne sont pas configurés. Il faut un prix en FCFA, puis les accès Wave Business ou CinetPay. Les clés marchandes restent dans les variables privées Vercel.

Les publicités sont désactivées jusqu’à l’approbation AdSense et la configuration de ses identifiants. Complète aussi les coordonnées de l’éditeur et vérifie les pages de confidentialité et de conditions avant d’ouvrir largement le service.
