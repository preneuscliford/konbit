# Konbit — intégration de l'API dans l'app mobile

Document de passation pour une nouvelle session Claude qui démarre l'app mobile Konbit.
Il décrit le contrat de l'API telle qu'elle tourne en production (état au 2026-10-12, commit `1e86184`),
les règles produit que l'app doit respecter, et ce qui manque côté backend.

> Si tu travailles dans un repo séparé pour l'app mobile, copie ce fichier dedans. Le code de référence
> reste dans le monorepo `preneuscliford/haitiScope` (privé) : chemins cités ci-dessous relatifs à sa racine.

---

## 1. Ce qu'est Konbit

Konbit est la couche de signalement communautaire de HaitiScope (`haitiscope.com/konbit`), et le
propriétaire veut en faire un produit à part entière, d'où l'app mobile.

- **Anonyme, sans compte.** Aucun login. L'appareil génère un UUID v4 (le « jeton ») une fois et le
  réutilise pour toujours. Il n'est jamais lié à une identité.
- **Pas de GPS.** Pour signaler, on choisit une commune dans une liste. Pour lire, rien n'est demandé :
  le flux national est affiché par défaut, le filtre par commune est une préférence locale.
  **Ne pas demander la permission de localisation**, c'est une décision produit, pas un oubli.
- **Deux modules** :
  - `utility` (Utilitaire) : carburant, électricité, eau, plus deux catégories « info du jour » (taux du dollar, météo).
  - `security` (Alertes) : tirs, opérations policières, routes bloquées, incendies, etc.
    **Pas de catégorie « explosion »**, c'est délibéré.
- **Publication immédiate.** Un signalement est visible tout de suite. Plusieurs signalements identiques
  (même module + catégorie + commune, incident encore actif) fusionnent en un seul **incident**.
- **Vote de véracité** : « ✅ Toujours vrai » / « ❌ Plus vrai ». Purement informatif : aucun nombre de
  votes ne masque ou n'expire un incident. On ne vote pas sur son propre signalement.
- **Réactions émoji** (style Telegram) : seulement sur `utility`, **interdites sur `security`** (refusées
  aussi côté serveur).
- **Expiration** : un incident disparaît du flux s'il ne reçoit pas de nouveau signalement pendant
  **6 h (utility)** ou **2 h (security)**. Chaque nouveau signalement repousse l'expiration.
  Les votes ne la repoussent pas.
- **Suppression** : l'auteur peut retirer son signalement dans les **24 h**, en prouvant la propriété avec son jeton.

Règles produit à reproduire à l'identique dans l'UI mobile (elles existent sur le web pour de bonnes raisons) :

1. Les alertes sécurité affichent toujours la mention « Signalement communautaire — non vérifié par une source officielle. »
2. Quand l'utilisateur choisit une catégorie sécurité, afficher l'avertissement sur les infos tactiques
   (clé `tacticalInfoWarning`, voir §6).
3. Pas de réactions, pas de gamification sur `security`.
4. Couleur = état, pas thème : rouge = problème, vert = rétabli/disponible, bleu = info du jour,
   ambre = opération policière (une présence n'est pas en soi un problème).
5. L'auteur d'un incident voit les compteurs en lecture seule et un bouton « Supprimer » au lieu des boutons de vote.

---

## 2. Accès à l'API

| | |
|---|---|
| Base URL prod | `https://api.haitiscope.com/api/v1/konbit` |
| Auth | Aucune. Le `tokenId` (UUID v4) passé dans le body ou la query sert d'identifiant anonyme. |
| Format | JSON. `Content-Type: application/json` sur les POST. |
| CORS | `origin: true` (reflète n'importe quelle origine). Sans importance pour une app native, ça marche aussi pour Expo Web. |
| Erreurs | Toujours `{ "error": "<message en français>" }`. Body/query invalide → `400` (erreurs Zod jointes par `, `). Erreur serveur → `500 { "error": "Erreur serveur" }`. |
| Dates | Chaînes ISO 8601 UTC. |
| IDs | `id` incident / `reportId` : entiers (bigserial). |

Vérifié en direct le 2026-10-12 : `GET /incidents` → `200 []` (flux vide à ce moment-là), `GET /communes` → liste OK,
preflight CORS → `204`.

Le web n'appelle pas l'API depuis le navigateur : il passe par des Server Actions Next.js
(`web/app/[locale]/actions.ts`) qui font proxy. **L'app mobile, elle, appellera l'API en direct.** Lis
la section 7 sur les conséquences pour le rate limiting.

---

## 3. Endpoints

Code source : `api/src/routes/v1/konbit.ts` (routes, validation, rate limits) et
`api/src/lib/konbit-corroboration.ts` (logique de fusion, votes, réactions, suppression).

### `GET /communes`

Catalogue public des communes (~145 + une pseudo-commune nationale), trié par département puis par nom.

```json
[
  { "slug": "anse-rouge", "name": "Anse-Rouge", "department": "Artibonite" },
  { "slug": "national", "name": "Tout le territoire", "department": "National" }
]
```

- `slug: "national"` (« Tout le territoire ») est utilisable pour **toutes** les catégories (pénurie nationale, etc.).
  Le web l'**épingle en tête** du sélecteur et du filtre avec un 🇭🇹, hors du regroupement par département. Faire pareil.
- La liste change rarement, mais elle peut changer (corrections). Cache local OK, avec un rafraîchissement
  au lancement. Ne pas l'inclure en dur dans le binaire. (Un cache long côté web a déjà fait disparaître
  « national » pendant des heures.)

### `GET /incidents?module=&commune=`

Flux des incidents actifs et non expirés, du plus récent au plus ancien (`publishedAt desc`), **max 100**, sans pagination.

Query (toutes optionnelles) : `module` = `utility` | `security`, `commune` = slug.
Le web récupère tout et filtre côté client ; l'app peut faire l'un ou l'autre.

```json
[
  {
    "id": 42,
    "module": "utility",
    "category": "fuel-shortage",
    "communeSlug": "delmas",
    "communeName": "Delmas",
    "department": "Ouest",
    "reportCount": 3,
    "confirmCount": 5,
    "disputeCount": 1,
    "latestNote": "depuis 15h, station Total",
    "firstReportAt": "2026-10-12T14:02:11.000Z",
    "publishedAt": "2026-10-12T14:02:11.000Z",
    "expiresAt": "2026-10-12T21:40:00.000Z",
    "reactions": { "useful": 4, "worried": 2 }
  }
]
```

- `reactions` ne contient que les émojis ayant au moins 1 réaction (objet vide `{}` sinon).
- `latestNote` : la précision du signalement le plus récent qui en avait une (peut être `null`).
- `reportCount` est une info interne. Le web ne l'affiche pas.
- Le web rafraîchit toutes les **20 s** quand l'onglet est visible. Sur mobile : poll au premier plan
  (AppState `active`), pull-to-refresh, et pas de poll en arrière-plan.

### `POST /reports`, signaler

```json
{ "module": "utility", "category": "fuel-shortage", "tokenId": "<uuid>", "communeSlug": "delmas", "note": "depuis 15h" }
```

- `module` et `category` doivent correspondre (validation par union discriminée : une catégorie sécurité envoyée avec `module: "utility"` → 400). Voir §4.
- `note` : optionnelle, trim, **max 140 caractères**. Vide → ignorée.
- Pour `rate-snapshot` et `weather-snapshot`, **la note envoyée est ignorée** : le serveur la recalcule
  depuis les données live (`"1 USD = 132.50 HTG"`, `"Port-au-Prince : 31°C, ciel dégagé"`). Côté UI, afficher
  le champ note en lecture seule avec un aperçu (voir §5 pour récupérer l'aperçu).

Réponses :

| Code | Body |
|---|---|
| `201` | `{ "reportId": 101, "incidentId": 42, "confirmCount": 5 }` (`incidentId` peut être un incident existant si fusion) |
| `400` | `{ "error": "Commune inconnue." }` ou erreur de validation |
| `429` | `{ "error": "Trop de signalements récents, réessaie plus tard." }` |

Après un 201, **stocker localement `{ reportId, incidentId, createdAt }`** : c'est la seule façon de savoir
quels incidents sont « à moi » (bouton Supprimer, masquage des votes). Il n'existe pas d'endpoint « mes signalements ».

### `DELETE /reports/:id?tokenId=<uuid>`, supprimer son signalement

| Code | Body |
|---|---|
| `200` | `{ "deleted": true, "incidentDeleted": true }` (`incidentDeleted` = c'était le dernier signalement de l'incident, l'incident et ses votes/réactions ont disparu) |
| `403` | `{ "error": "Ce n'est pas ton signalement." }` |
| `404` | `{ "error": "Signalement introuvable." }` |
| `410` | `{ "error": "Le délai de 24h pour supprimer ce signalement est dépassé." }` |

### `POST /incidents/:id/confirm` et `POST /incidents/:id/dispute`, voter

Body : `{ "tokenId": "<uuid>" }`

`200` → `{ "confirmCount": 6, "disputeCount": 1, "outcome": "voted" }`

| `outcome` | Sens |
|---|---|
| `voted` | Nouveau vote enregistré |
| `switched` | Le jeton avait voté l'inverse, le vote a basculé (l'autre compteur a perdu 1) |
| `already-voted` | Déjà voté dans ce sens, rien n'a changé |
| `own-report` | Le jeton a signalé cet incident, vote refusé (le web affiche `cannotVoteOwnReport`) |

Erreurs : `404` incident introuvable ou expiré, `429` rate limit.
Un jeton n'a qu'une position par incident. **Il n'y a pas d'« annuler mon vote »**, seulement basculer.

### `POST /incidents/:id/react` et `DELETE /incidents/:id/react?tokenId=<uuid>`, réactions

POST body : `{ "tokenId": "<uuid>", "emoji": "useful" }` → `200 { "ok": true }`

- Une réaction par jeton et par incident ; en renvoyer une autre la **remplace** (upsert).
- Pour retirer : `DELETE`. Le web retire quand on retape sur son propre émoji.
- `400 { "error": "Pas de réactions sur les alertes sécurité." }` sur un incident `security`.
- `404` incident introuvable/expiré, `429` rate limit.
- L'auteur **peut** réagir à son propre incident (ce n'est pas un vote de véracité).
- La réponse ne renvoie pas les compteurs : faire la mise à jour optimiste en local (retirer 1 à
  l'ancienne réaction, ajouter 1 à la nouvelle), comme `konbit-incident-feed.tsx`.

---

## 4. Vocabulaire (enums)

Les clés sont stables, et l'affichage (libellé, émoji, icône, couleur) est entièrement côté client.
Source de vérité serveur : constantes `UTILITY_CATEGORIES`, `SECURITY_CATEGORIES` et `REACTION_EMOJIS`
dans `api/src/routes/v1/konbit.ts`.

### Catégories `utility`

| Clé | Libellé FR | Émoji | Icône (lucide) | Couleur |
|---|---|---|---|---|
| `fuel-shortage` | Pénurie de carburant | ⛽ | Fuel | rouge |
| `fuel-available` | Carburant disponible | ⛽ | Fuel | vert |
| `power-outage` | Coupure de courant | ⚡ | Zap | rouge |
| `power-restored` | Courant rétabli | ⚡ | Zap | vert |
| `water-outage` | Coupure d'eau | 💧 | Droplet | rouge |
| `water-available` | Eau disponible | 💧 | Droplet | vert |
| `rate-snapshot` | Taux du dollar du jour | 💵 | DollarSign | bleu (info) |
| `weather-snapshot` | Météo du jour | 🌤️ | CloudSun | bleu (info) |

### Catégories `security`

| Clé | Libellé FR | Émoji | Icône (lucide) | Couleur |
|---|---|---|---|---|
| `gunfire` | Tirs signalés | 🔫 | Crosshair | rouge |
| `police-operation` | Opération policière | 🚔 | Shield | **ambre** |
| `armed-clash` | Attaque / affrontement armé | ⚠️ | Siren | rouge |
| `road-blocked` | Route bloquée / impraticable | 🚧 | TrafficCone | rouge |
| `road-reopened` | Route rouverte | 🛣️ | Car | vert |
| `major-fire` | Incendie important | 🔥 | Flame | rouge |
| `power-cut` | Coupure d'électricité | ⚡ | Zap | rouge |
| `water-cut` | Coupure d'eau | 💧 | Droplet | rouge |
| `network-down` | Panne réseau / télécom | 📡 | WifiOff | rouge |

`power-cut`/`water-cut` (security) sont volontairement distincts de `power-outage`/`water-outage` (utility) :
les deux modules ne partagent jamais d'incident.

Le web n'a **qu'un seul formulaire** : on choisit une catégorie dans une liste groupée
(Utilitaire / Info du jour / Alertes), et le `module` est déduit de la catégorie.

### Réactions (ordre d'affichage)

| Clé | Émoji | Libellé FR |
|---|---|---|
| `useful` | 👍 | Utile |
| `worried` | 😟 | Préoccupant |
| `serious` | 😡 | Très problématique |
| `surprised` | 😮 | Inattendu |
| `thanks` | 🙏 | Merci |

Lucide existe en React Native (`lucide-react-native`), donc les mêmes icônes sont disponibles.

---

## 5. Données annexes utiles

L'API HaitiScope expose d'autres routes publiques sous `https://api.haitiscope.com/api/v1/` (`rates`, `weather`, `fuel`,
`economy` ; voir `api/src/routes/v1/`). Deux usages pour Konbit :

- **Aperçu de la note auto** pour `rate-snapshot` / `weather-snapshot` (le web l'affiche dans le formulaire).
  Le serveur calcule la note avec : taux `USD-HTG` = `marketAskBest ?? officialRate ?? syntheticRate`, et
  météo de la ville `port-au-prince`. Regarde `computeAutoNote()` dans `konbit.ts` et les routes `rates`/`weather`
  pour reproduire l'aperçu. Si l'aperçu est indisponible : clé `infoPreviewUnavailable`.
- **État vide** : la page web affiche le taux du jour pour qu'un premier visiteur ne tombe jamais sur un écran vide.
  L'app devrait faire pareil quand `GET /incidents` renvoie `[]` (ce qui arrive en ce moment).

---

## 6. Textes et i18n

Tous les textes Konbit sont sous la clé `Konbit` dans `web/messages/{fr,ht,en,es}.json` (FR, créole, anglais, espagnol).
**Réutilise ces fichiers tels quels** (copie ou extraction du namespace `Konbit`) plutôt que de réécrire les textes.
Clés importantes : `category.*`, `reaction.*`, `tacticalInfoWarning`, `unverifiedNote`, `infoAutoNote`,
`infoPreviewUnavailable`, `privacyNote`, `trueVote`, `falseVote`, `cannotVoteOwnReport`, `ownReportNote`,
`deleteConfirmPrompt`, `noIncidents`, `allCommunes`, `allModules`, `moduleUtility`, `moduleSecurity`.

Les messages d'erreur renvoyés par l'API sont **en français uniquement**. Pour une app multilingue, mappe
les erreurs par code HTTP + contexte vers des clés i18n, et n'affiche le texte serveur qu'en dernier recours.

Dates relatives (« il y a 5 min ») : le web a son propre helper `formatRelative` dans `konbit-incident-feed.tsx`.

---

## 7. État local à reproduire sur l'appareil

Sur le web tout est en `localStorage`. Sur mobile, prends un stockage persistant (AsyncStorage/MMKV ;
SecureStore pour le jeton si tu veux, sans obligation : il n'est pas secret au sens fort).

| Clé web | Contenu | Rôle |
|---|---|---|
| `konbit-token` | UUID v4 | Identité anonyme de l'appareil. Créé au premier besoin, **jamais régénéré**. Le perdre = perdre la possibilité de supprimer ses signalements et ré-ouvrir le droit de voter. |
| `konbit-my-reports` | `[{ reportId, incidentId, createdAt }]` | Purgé des entrées de plus de 24 h. Sert à afficher « C'est ton signalement » + Supprimer. |
| `konbit-votes` | `{ [incidentId]: "confirm" \| "dispute" }` | Surligner le bouton voté. |
| `konbit-reactions` | `{ [incidentId]: emoji }` | Surligner sa réaction, savoir quoi retirer. |
| `konbit-preferred-commune` | slug ou `"all"` | Filtre du flux retenu entre les sessions. |

Le serveur ne fournit **aucun** moyen de relire les votes, réactions ou signalements d'un jeton : cet état
local est la seule source. Le contrôle d'accès réel reste côté serveur (jeton).

Le web et le mobile ont des jetons différents, donc une même personne compte comme deux jetons. C'est accepté.

---

## 8. Rate limits

| Action | Limite | Où |
|---|---|---|
| `POST /reports` | 10 / h par IP **et** 5 / h par jeton | Comptés en base (`konbit_reports`) |
| votes + réactions (confirm, dispute, react POST) | 30 / h par IP, cumulés | **En mémoire**, remis à zéro à chaque redémarrage de l'API |

Toujours gérer le `429` proprement (message + pas de retry automatique en boucle).

---

## 9. Manques et risques côté backend (à traiter avant ou pendant le dev mobile)

Classés du plus au moins important. Aucun n'est corrigé à ce jour.

1. **IP du client et `X-Forwarded-For`.** L'API tourne avec `trustProxy: true` derrière nginx. Si nginx
   transmet `$proxy_add_x_forwarded_for`, un client direct (l'app) peut forger l'en-tête et contourner la
   limite par IP. Jusqu'ici ce n'était pas exposé, parce que le web passait par Vercel. À vérifier dans la conf nginx du serveur
   et à corriger (par ex. `proxy_set_header X-Forwarded-For $remote_addr;` ou `trustProxy` réglé sur le nombre de hops).
   Remarque : les Server Actions web de vote/réaction ne transmettent pas `x-forwarded-for`, donc tous les
   votes web partagent la même IP (celle de Vercel) pour la limite de 30/h. Bug existant, indépendant du mobile.
2. **Pas de notifications push.** Rien côté serveur (pas de table d'abonnements, pas d'envoi). Si l'app veut
   « alertes sécurité dans ma commune », il faut concevoir : stockage des tokens Expo/FCM liés au jeton
   anonyme + communes suivies, envoi à la création d'un incident `security` (et peut-être à la fusion).
3. **Pas de `GET /incidents/:id`.** Nécessaire pour un deep link ou une notification qui ouvre un incident.
4. **Pas de pagination ni de `since`**, et le flux est plafonné à 100. Suffisant aujourd'hui (flux vide).
   Un paramètre `since` réduirait le coût du polling mobile.
5. **Pas de versioning d'API au-delà de `/v1`.** Une app en store vit avec d'anciennes versions installées :
   tout changement de contrat (nouvelle catégorie notamment) doit rester rétrocompatible. **Une catégorie
   inconnue doit s'afficher de façon générique côté app, pas faire planter le rendu.**
6. Messages d'erreur en français uniquement (voir §6).

---

## 10. Repères dans le repo

| Fichier | Contenu |
|---|---|
| `api/src/routes/v1/konbit.ts` | Routes, schémas Zod, rate limits, note auto |
| `api/src/lib/konbit-corroboration.ts` | Fusion en incidents, votes, réactions, suppression |
| `api/src/server.ts` | Montage `/api/v1/konbit`, CORS, error handler |
| `packages/db/schema.ts` | Tables `konbit_*` (chercher « konbit ») |
| `packages/db/seed.ts` | Commune `national`, durées d'expiration par module |
| `packages/db/data/konbit-communes.ts` | Liste des communes (compilée à la main, à valider contre l'IHSI) |
| `web/lib/api.ts` | Types TS `KonbitIncident`, `KonbitCommune`, `KonbitCategory`… à réutiliser |
| `web/app/[locale]/actions.ts` | Appels POST/DELETE (référence pour le client mobile) |
| `web/components/konbit-report-form.tsx` | Formulaire : groupes de catégories, émojis, commune nationale épinglée |
| `web/components/konbit-incident-feed.tsx` | Carte d'incident, votes, réactions, polling, filtres |
| `web/lib/konbit-token.ts`, `web/lib/konbit-my-reports.ts` | État local |
| `web/messages/*.json` | Textes, namespace `Konbit` |

### Modifier le backend

Stack : Fastify + Drizzle + Postgres 16, monorepo pnpm. Le backend tourne sur un serveur Oracle Cloud
(alias SSH `haitiscope-oci`, ARM, systemd `haitiscope-api`, nginx + Let's Encrypt). Le frontend web est
sur Vercel (auto-deploy sur `main`).
Processus de déploiement : build et vérification locale avec `curl`, puis push, puis sur le serveur
`git pull` + build + restart du service, puis nouvelle vérification avec `curl` en prod. Toute modif du contrat de l'API
doit rester compatible avec le web **et** avec les versions mobiles déjà publiées.

---

## 11. Décisions encore ouvertes, à demander au propriétaire avant de coder

- **Stack** : Expo / React Native (le plus naturel : TypeScript, types et i18n réutilisables), natif, ou PWA.
  Rien n'est décidé, **ne pas choisir à sa place**.
- **Repo** : app dans le monorepo (`apps/mobile`, partage direct des types) ou repo séparé.
- **Périmètre v1** : lecture + signalement seulement, ou aussi votes, réactions et suppression ? Push dès la v1 ?
- **Store** : publication Play Store / App Store (comptes développeur, nom, icône) ou distribution test d'abord.
- **Lien avec HaitiScope** : marque Konbit autonome, ou l'app affiche aussi taux, météo et carburant.
