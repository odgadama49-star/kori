# Kori

Application de suivi de budget et de dépenses, préparée pour un déploiement Vercel avec Supabase Auth et PostgreSQL.

## Tester la maquette

Ouvre `index.html`. Sans configuration Supabase, Kori fonctionne en mode démonstration; les opérations ajoutées sont gardées dans le navigateur. Ce mode n'est pas partagé entre appareils et n'est pas un vrai compte.

## Mise en ligne

1. Crée un projet Supabase et exécute `supabase/migrations/001_kori.sql` dans son éditeur SQL.
2. Crée un dépôt GitHub avec le contenu de ce dossier, puis importe-le dans Vercel. L’URL gratuite `*.vercel.app` suffit pour démarrer; un domaine personnalisé est facultatif.
3. Dans `config.js`, renseigne l'URL du projet Supabase et sa clé **publishable**, puis renseigne `appUrl` avec l'URL Vercel. Ne mets jamais une clé `service_role` ou `secret` dans ce fichier. Ajoute la même URL Vercel aux URL de site et de redirection Auth dans Supabase, puis republie.
4. Dans Vercel, ajoute les variables privées répertoriées dans `.env.example`. Les clés `SUPABASE_SERVICE_ROLE_KEY`, `WAVE_API_KEY` et `CINETPAY_API_KEY` restent côté serveur.
5. Choisis le prix mensuel de Kori Plus et renseigne le même montant en FCFA dans `config.js` (`plusPriceXof`) et dans Vercel (`KORI_PLUS_PRICE_XOF`). Le paiement reste désactivé tant que ce prix n'est pas défini; choisis un montant multiple de 5.
6. Dans le portail Wave Business, active Checkout et enregistre `https://TON-URL.vercel.app/api/payment-webhook` (ou ton domaine personnalisé). Configure son secret de signature dans Vercel. Dans CinetPay, renseigne la même URL de notification.
7. Configure le compte CinetPay pour le Burkina Faso, puis effectue les vérifications de marchand et les transactions de validation avant d'activer les paiements. Wave exige également un compte marchand et une autorisation API.
8. Les publicités restent désactivées tant que l'éditeur AdSense n'a pas validé le site. Ajoute alors les identifiants client et emplacement dans `config.js`, après avoir complété et vérifié `confidentialite.html` et les choix de consentement nécessaires pour les zones visées.

## Fonctions en ligne préparées

- Création de compte, connexion, déconnexion et réinitialisation du mot de passe par e-mail.
- Données privées par compte avec règles PostgreSQL Row Level Security pour les profils, opérations, budgets et objectifs.
- Ajout et suppression d'opérations; création, modification et suppression des budgets; création, progression et suppression des objectifs.
- Formule Kori Plus pour 30 jours, paiement côté serveur par Wave Checkout ou par le guichet CinetPay. L'application vérifie le statut auprès du fournisseur avant d'activer l'abonnement.
- Tarif Plus configurable. Le paiement est désactivé tant que le propriétaire n'a pas choisi son prix et renseigné la même valeur côté site et serveur.
- Emplacement publicitaire facultatif; aucune publicité n'est chargée sans identifiants éditeur.
- Pages de confidentialité et conditions d'utilisation à compléter avec l'identité et le contact de l'éditeur avant l'ouverture publique.

Les paiements sont configurés pour le Burkina Faso seulement. Le service peut accueillir des comptes des huit pays, mais chaque pays a besoin d'un moyen de paiement et d'une configuration marchande validés localement avant d'y vendre Kori Plus. Le renouvellement Plus est manuel, sans prélèvement automatique.

## Avant d'ouvrir au public

Le déploiement n'est pas encore publié : il faut un projet Supabase et des comptes Vercel, Wave Business et CinetPay. Un domaine personnalisé est facultatif, car Vercel fournit une URL HTTPS. Wave doit fournir les clés et le secret de webhook; ces secrets se saisissent uniquement dans les paramètres privés Vercel, jamais dans le chat ou dans `config.js`. AdSense doit approuver le site. Avant l'ouverture publique, complète les coordonnées de l'éditeur et publie une politique de confidentialité adaptée aux pays servis.
