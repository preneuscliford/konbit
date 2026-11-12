# Konbit 509 – site web public

Pages publiques de Konbit 509, en lecture seule, pour être **trouvé sur Google** et **partager des liens** qui s'ouvrent partout : accueil, konbits (`/k/[id]`), profils (`/u/[pseudo]`), plan du site et `robots.txt`. Publier, répondre et rejoindre se font dans l'app mobile, à la racine du dépôt.

- Next.js 16 (App Router, Cache Components), Tailwind 4, police Poppins (comme l'app).
- Même base Supabase que l'app, avec la **clé publique uniquement** : les règles RLS ne laissent lire que le contenu public.
- Pages générées côté serveur et mises en cache (quelques minutes) : rapides sur les petites connexions et lisibles par Google.

## Lancer en local

```bash
cd web
cp .env.example .env.local   # puis remplir (URL et clé publique Supabase, adresse du site)
npm install
npm run dev                  # http://localhost:3000
npm run build                # vérification complète avant déploiement
```

## Déployer (Vercel)

- Nouveau projet Vercel lié à ce dépôt GitHub, **Root Directory : `web`**.
- Variables d'environnement : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL` (le domaine Konbit 509, sans `/` final).
- Brancher le domaine dédié dans Vercel → Domains.

## Lien avec l'app mobile

- Le dossier `web/` est exclu du typecheck de l'app (`tsconfig.json`) et des builds EAS (`.easignore`).
- Les pages lisent le même contenu que l'app (`konbit_feed`, `profiles`, `konbit_replies`) : toute nouvelle donnée publique de l'app peut y être affichée.
