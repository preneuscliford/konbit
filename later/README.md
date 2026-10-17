# Fonctions mises de côté pour la v1

La v1 de Konbit 509 est volontairement réduite : Accueil (taux et météo), fil de
konbits (posts courts, « Mwen ladan », réponses), création, Signalement HaïtiScope
(voir `konbit-mobile-api.md`) et Paramètres. Toute fonction en plus passe par un
feature flag (`supabase/MODERATION.md`).

Ce dossier contient le code de l'ancienne version de l'app : comptes et
connexion Google, Konbits « initiatives », discussion, messages, profil,
notifications, modération. Rien n'est supprimé.

Côté base (projet Supabase `konbit`, wnwyohyfjofdegyvjkfb), les anciennes tables
sont rangées dans le schéma `legacy`, non exposé par l'API ; la v1 repart d'un
schéma minimal. Toutes les migrations, anciennes et nouvelles, sont dans
`supabase/migrations/`.

Ce dossier est hors de `app/`, donc Expo Router ne le voit pas et rien n'est
embarqué dans l'app. Il est aussi exclu du typecheck (`tsconfig.json`).

## Réactiver une fonction

Une à la fois, quand elle a un vrai besoin :

1. Remettre l'écran dans `app/` (`git mv later/app/... app/...`).
2. Remettre les composants, hooks et `lib/` dont il dépend.
   Attention : `later/lib/supabase.tsx` et `later/hooks/supabaseClient.ts`
   ne doivent pas écraser les nouveaux `lib/` et `hooks/` de la v1.
3. Si l'écran a besoin d'un compte, rebrancher `later/app/provider/AuthProvider.tsx`
   dans `app/_layout.tsx`.
4. Retirer le chemin concerné de l'exclusion `later/**/*` n'est pas nécessaire :
   une fois déplacé hors de `later/`, il est de nouveau typé.

Les réactions émoji de l'API Konbit (`POST /incidents/:id/react`) sont aussi
prévues pour plus tard : elles n'existent pas encore dans ce dossier, la logique
de référence est dans `web/components/konbit-incident-feed.tsx` du repo haitiScope.
