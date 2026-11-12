# Konbit 509 : prochaines mises à jour

*Notes du 8 novembre 2026, pendant le test fermé (build 6). Rien n'est encore développé.*

## Le cap : l'alternative business gratuite pour Haïti

Konbit 509 **n'est pas un réseau social de plus**. Ce n'est pas un concurrent de Facebook, TikTok ou Instagram, que nous ne pourrions jamais remplacer. C'est **une alternative business gratuite** :

- **la priorité va à celles et ceux qui investissent et font du business**, pas à ceux qui font du buzz ;
- un **endroit central** pour présenter son activité, être trouvé et créer des partenariats, au lieu d'une présence éparpillée sur des réseaux où elle se noie ;
- **gratuit** pour les entrepreneurs et les organisations.

**C'est ce qui nous démarque**, et c'est aussi là que se trouve le **modèle économique** : des **sponsors** (entreprises, institutions, partenaires) qui veulent soutenir et toucher cet écosystème.

**Communication publique (10 novembre 2026) :** pour le grand public (site, accueil, présentation), Konbit 509 se présente **simplement comme l'app communautaire** : « Ann fè konbit ansanm », pour partager des idées, des projets et des discussions, et agir ensemble. Le message « Bay inisyativ ak biznis ou vizibilite » est **réservé aux entrepreneurs et aux business**, et il viendra **plus tard**, avec les fonctions business (fiches, annuaire, label). Le cap business guide nos priorités en interne, mais il ne se met pas en avant tout de suite.

Chaque nouvelle fonction doit répondre à une question : *est-ce qu'elle aide quelqu'un qui investit ou fait du business à être vu, trouvé ou soutenu ?* Si non, elle passe après.

## Ce que le benchmark change (voir `docs/strategie/benchmark-applis-communautaires.md`)

**Déjà en place dans l'app :**
- lecture du fil sans compte, le compte sert à agir ;
- taux du jour HaitiScope comme rendez-vous quotidien, sur le modèle de DolarToday ;
- cache local du dernier contenu ;
- Signalement anonyme ;
- hébergement hors d'Haïti (Supabase) ;
- aucune position GPS.

**Ce qui renforce directement le cap business (à prioriser) :**
- **Fiches business** suggérables par un membre puis **réclamées** par le commerce (modèle Reclame Aqui). Plus tard, un **label « Verifye »**, possiblement payant, en complément des sponsors.
- **Lancement concentré** sur une zone (Nippes / Miragoâne), avec un seuil de business inscrits avant d'ouvrir la zone suivante.
- **Ambassadeurs** par commune, avec un badge : ils recrutent les commerces locaux.
- **Diaspora** : clients, investisseurs et relais des business.

**À aborder avec prudence :**
- **Vérifier la commune par numéro de téléphone :** c'est de la friction à l'inscription, à l'opposé du choix « peu de barrières », et une nouvelle donnée à déclarer (confidentialité, Play). Mieux vaut la réserver aux **business** qui réclament une fiche ou demandent le label.
- **Fiche créée par un tiers :** le commerce n'a pas consenti. Il faut un circuit de retrait ou de réclamation, n'afficher que des informations publiques, et modérer les fausses fiches ou les fiches diffamatoires.
- **Relais des alertes sur WhatsApp ou Telegram :** utile, mais ce n'est pas le cœur business. À garder pour plus tard.
- **Publication hors ligne avec file d'attente :** utile, mais complexe. À faire après les squelettes de chargement et le bandeau hors connexion.

**Sécurité du Signalement (leçon de Citizen) :** la note libre de 140 caractères permet aujourd'hui d'écrire le nom d'une personne. À faire :
- un rappel sous le champ : « Pa site non moun, pa mete foto moun » ;
- côté HaitiScope, le marquage des signalements **non confirmés** comme tels ;
- jamais d'appel à l'action ni de désignation de suspect.

## 1. « Mwen ladan » seulement quand il a un sens

Aujourd'hui, le bouton « Mwen ladan » s'affiche sur tous les konbits. Pour une **discussion** ou une publication banale, qui ne demande la participation de personne, il n'a pas de sens.

- Afficher « Mwen ladan » uniquement sur les konbits de type **Lide** (idée) et **Pwojè** (projet).
- Sur une **Diskisyon** : seulement J'aime et Repons.
- À trancher :
  - que faire des participations déjà enregistrées sur des discussions (les garder sans les afficher, ou les retirer) ;
  - faut-il aussi bloquer « Mwen ladan » côté serveur pour les discussions (règle en base).
- Fichiers concernés : `components/konbit509/KonbitCard.tsx`, éventuellement une migration.

## 2. Vision : centraliser la visibilité des business haïtiens

**Le constat :** en Haïti, les personnes qui font du business n'ont pas d'endroit dédié pour présenter leur activité. Il y a TikTok, Facebook, WhatsApp…, mais c'est éparpillé et noyé dans le reste. Konbit 509 veut **centraliser** cette présence.

C'est le pilier stratégique de l'app : à cadrer avant de développer. Pistes à discuter :

- **Type de compte** : personne, organisation/association, business. Choisi à l'inscription ou dans « Modifier le profil ».
- **Fiche business enrichie** :
  - catégorie (alimentation, artisanat, services, tech, agriculture…) ;
  - commune et zone desservie ;
  - contact (WhatsApp, téléphone, lien) ;
  - horaires ;
  - photos de l'activité.
- **Annuaire / découverte** : un espace pour trouver les business par **catégorie** et par **commune**, avec une recherche.
- **Mise en avant** dans le fil : konbits de business, nouveautés locales.

**Points à anticiper avant de lancer :**

- **Données collectées :** un téléphone ou une adresse de business sont de nouvelles données. Il faudra mettre à jour la **politique de confidentialité** et le formulaire **« Sécurité des données »** de Google Play.
- **Sponsors et monétisation :** c'est le modèle économique visé. À prévoir avant d'afficher le premier sponsor :
  - passer le compte Play en **« professionnel »**, ce qui rend ton adresse et ton téléphone publics pour l'UE (ou passer par une structure HaitiScope) ;
  - **signaler clairement** les contenus sponsorisés (mention « Sponsorisé » ou « Patwone »), comme l'exigent les règles de Google Play ;
  - mettre à jour la politique de confidentialité, qui dit aujourd'hui « sans publicité », ainsi que les réponses « Annonces » et « Sécurité des données » de la Play Console ;
  - **garder la priorité aux entrepreneurs** : les sponsors ne doivent pas noyer le contenu des membres.
- **Modération :** il faudra des règles contre les fausses entreprises et les arnaques. Les conditions d'utilisation en parlent déjà.

## 3. Chargement visible sur tous les écrans (connexion faible)

- Ajouter des **squelettes de chargement** (*skeletons*) : des blocs gris animés qui ont la forme du contenu attendu (carte de konbit, profil, taux, météo, notifications…), à la place des écrans vides ou des petites roues.
- Les afficher tant que les données arrivent, surtout sur les **connexions lentes**.
- **Écrans concernés :** fil Konbit, détail d'un konbit, profil, Akèy (taux, météo), Siyalman, notifications, Aktivite mwen, administration.
- Le cache local (React Query persistant) affiche déjà le dernier contenu connu : les squelettes ne servent qu'au **premier chargement**.

## 4. Indicateur « hors connexion »

- Un **bandeau discret** quand le téléphone n'a plus de réseau, par exemple « Ou pa konekte : n ap montre dènye enfòmasyon yo ».
- Il disparaît automatiquement au retour de la connexion, avec un rafraîchissement automatique.
- Bloquer proprement ce qui ne marche pas hors ligne (publier, répondre) avec un message clair, plutôt qu'une erreur.
- Base existante : `hooks/useOnlineManager.ts` (NetInfo + React Query).

## 5. Retravailler le fil : texte trop grand

- Les **polices du fil sont trop grandes** : on voit trop peu de konbits par écran.
- Réduire la taille du texte et revoir les espacements des cartes (nom, commune et date, texte, actions) pour un fil plus dense, à la manière de X.
- Vérifier la lisibilité sur les petits téléphones et avec les tailles de police système agrandies (accessibilité).
- Fichiers concernés : `components/konbit509/KonbitCard.tsx`, l'écran du fil.

## 6. Version web (Expo + Next.js)

**Pourquoi c'est stratégique pour le cap business :**
- **Visibilité sur Google (SEO).** Une fiche business ou un konbit doit avoir une **vraie page web** que Google indexe : « kafe Les Cayes », « formation kodaj Delmas »… C'est la croissance organique gratuite du benchmark (Nairaland, Reclame Aqui).
- **Partage.** Les liens de partage sont aujourd'hui en `konbit://` : ils ne marchent que si l'app est installée. Un lien web s'ouvre partout (WhatsApp, Facebook, ordinateur de la diaspora), et pourra ouvrir directement l'app quand elle est installée (Android App Links).
- **Sponsors et diaspora :** consulter et présenter Konbit 509 depuis un ordinateur.

**Deux approches possibles :**

| | Expo Router en web (même code que l'app) | Next.js pour les pages publiques (code partagé) |
|---|---|---|
| Principe | L'app actuelle compilée pour le navigateur, avec rendu statique ou serveur d'Expo Router | Un site Next.js (sur Vercel, comme haitiscope.com) qui affiche les fiches, profils et konbits publics à partir de la même base Supabase ; l'app reste l'outil pour publier et interagir |
| SEO | Correct, mais plus limité | Excellent (rendu serveur, métadonnées, plan du site, aperçus de liens) |
| Travail | Adapter les modules natifs sans équivalent web direct (connexion Google, notifications push, sélecteur de photos, cache…) | Écrire les pages publiques ; partager la logique (`lib/`, traductions, types) dans un monorepo |
| Pour qui | Utiliser toute l'app depuis un navigateur | Être **trouvé** sur Google et partager des liens |

**Choix retenu (9 novembre 2026) : approche hybride, en commençant par Next.js.**

1. **Next.js pour les pages publiques** (annuaire business par catégorie et par commune, fiches, profils, konbits), en lecture seule et connectées à la même base Supabase. Chaque page invite à télécharger l'app, ou l'ouvre si elle est installée.
   - **Référencement :** rendu côté serveur avec le contenu, métadonnées, plan du site, aperçus de liens pour WhatsApp et Facebook.
   - **Vitesse :** pages HTML légères mises en cache par Vercel, rapides même sur les connexions haïtiennes.
2. **Plus tard, Expo web** pour utiliser toute l'app dans un navigateur, quand la demande existera (par exemple des business qui gèrent leur fiche depuis un ordinateur). L'adaptation demande quelques jours : connexion Google par redirection, toasts `burnt` (17 fichiers), notifications push, mise en page grand écran.

**Pourquoi pas tout en Expo tout de suite :** le rendu côté serveur et les « data loaders » d'Expo Router sont encore marqués **alpha** dans la documentation officielle, SDK 56 compris. Sans eux, le contenu des pages Expo web se charge dans le navigateur : Google voit des pages presque vides, et le gros fichier JavaScript ralentit l'affichage sur les petites connexions. À réévaluer quand cette partie sera déclarée stable : un seul outil pourrait alors tout couvrir.

**Quand :** ~~après le lancement mobile~~ → **priorité n°1 depuis le 11 novembre 2026** (voir ci-dessous).

### Changement de cap (11 novembre 2026) : le web passe en premier

**Pourquoi :**
- **Moins de contraintes pour lancer.** Pas de validation Google Play, ni de test fermé de 14 jours, ni de délai de revue : un site se met en ligne le jour même, et chaque correction est publiée en quelques minutes.
- **Plus facile d'avoir des utilisateurs.** Un lien s'ouvre directement depuis WhatsApp ou Facebook, sans installation ni espace de stockage sur le téléphone.
- **Porte d'entrée vers l'app.** Les gens découvrent Konbit 509 sur le web, puis installent l'app pour les notifications et l'usage quotidien.

**Conséquence :** le site Next.js ne reste pas en lecture seule. Il devient une **vraie version utilisable** : connexion, publication, réponses, « Mwen ladan », j'aime. Il garde la même base Supabase et les mêmes comptes que l'app, donc un compte créé sur le web marche dans l'app, et inversement.

**Pourquoi Next.js et pas Expo web :** le site existe déjà, il est rapide et bien référencé. L'écriture passe par les mêmes règles de sécurité (RLS) et les mêmes fonctions de la base que l'app : on n'a donc rien à réécrire côté serveur. Expo web reste possible plus tard, mais il chargerait tout le JavaScript de l'app dans le navigateur, ce qui est lent sur les connexions haïtiennes.

**Étapes :**
1. **Mise en ligne :** domaine, projet Vercel, version actuelle (en lecture seule) publiée.
2. **Comptes :** connexion par e-mail et code OTP, et Google (par redirection), avec choix du pseudo à l'inscription, comme dans l'app. Pages légales et suppression de compte accessibles.
3. **Participer :** répondre, « Mwen ladan », j'aime, signaler.
4. **Publier :** créer un konbit (texte, type, commune, photos).
5. **Profil :** modifier son profil et son avatar, suivre des personnes, voir « Aktivite mwen ».
6. **Notifications sur le web :** pastille dans le menu d'abord, puis notifications du navigateur.
7. **Version française.**

**Avancement (11 novembre 2026) :** étape 2 commencée. La page `/konekte` permet de se connecter avec Google (Google Identity Services : même jeton d'identité que l'app), ou par e-mail et mot de passe avec code de confirmation, mot de passe oublié par code et choix du pseudo et de la commune. Le menu du compte est dans l'en-tête (Pwofil mwen, Dekonekte).

**Fil et navigation, inspirés de X (11 novembre 2026) :**
- **Disposition :** barre latérale à gauche (Konbit yo, Notifikasyon, Pwofil, bouton « Lanse yon konbit », compte en bas), fil au centre, colonne d'infos à droite. Sur téléphone, onglets en bas avec le « + » au centre, comme l'app. La vitrine (`/`) garde son en-tête et son pied de page.
- **Fil `/konbit` :** chargement continu en défilant ; la première page est rendue par le serveur pour Google. En haut, « Kisa w vle nou fè ansanm? ».
- **Actions sur chaque konbit :**
  - « J'aime », avec un affichage immédiat ;
  - « Mwen ladan », uniquement sur les Lide et les Pwojè (point 1) ;
  - partage du lien ;
  - menu « … » : supprimer son konbit, ou signaler avec les 7 raisons de l'app ;
  - heure relative (« 5 min », « 3 è », « 2 j »).
- **Pages d'un konbit et d'un profil :** mêmes actions, et le fil de l'auteur se charge aussi en continu.
- **Encore en attente (pages « Byento ») :** `/lanse` (publier) et `/notifikasyon`.
- **Mode sombre :** clair, sombre ou automatique (suit le réglage du téléphone ou de l'ordinateur). Le bouton est dans la barre latérale, dans l'en-tête mobile et sur la vitrine. Le choix est retenu et appliqué avant l'affichage, sans flash blanc.

**Fiches business et marketplace (décision du 11 novembre 2026) :** pas de marketplace séparée pour l'instant (paiements, livraison, litiges : trop lourd pour démarrer). À la place, chaque **fiche business** a un **katalòg** : produits et services, prix, photos, bouton WhatsApp ou appel. La vente se fait directement entre les gens. Ensuite, une page « Mache » rassemblera les produits de toutes les fiches, avec des filtres par catégorie et par commune. La fiche est séparée du profil (un membre la crée depuis son profil) et contient : nom, catégorie, commune et adresse, téléphone ou WhatsApp, horaires, logo, photos, vérification.

**Fiches business, 1re version (11 novembre 2026), côté site :**
- **Base de données :** migration `supabase/migrations/20261111120000_business_profiles.sql`.
  - Tables `businesses` et `business_items`, une fiche par membre.
  - 12 catégories, jusqu'à 100 articles par fiche et 3 photos par article.
  - Anti-spam : 30 ajouts au katalòg par heure.
  - Le badge « Verifye » n'est donné que par l'admin (`set_business_verified`).
  - Les signalements et la file de modération couvrent les fiches et leurs articles : masquage après 3 signalements, ou dès le premier en cas de danger pour un enfant.
  - Nouvelle règle de stockage pour supprimer ses propres photos. Avant, les photos d'un konbit effacé restaient en ligne.
- **Pages :**
  - `/biznis` : annuaire filtré par catégorie et par commune, fiches vérifiées en premier ;
  - `/b/[slug]` : la fiche (boutons WhatsApp et Rele, adresse, horaires, katalòg, responsable, données pour Google) ;
  - `/biznis/fich` : créer, modifier ou supprimer sa fiche ;
  - le propriétaire gère son katalòg directement sur sa fiche (ajouter, modifier, retirer).
- **Navigation :** onglet « Biznis » ajouté. Le profil du propriétaire affiche sa fiche, et les fiches entrent dans le plan du site.
- **À faire ensuite :**
  - la page « Mache » (tous les articles) ;
  - les fiches dans l'app mobile ;
  - un bouton admin pour vérifier une fiche.

**Sécurité :** uniquement la clé publique (anon) côté web. Les écritures passent par la session de l'utilisateur et les règles RLS existantes. Avant d'ouvrir l'écriture, il faut ajouter une limite de fréquence (anti-spam), car un site est plus facile à automatiser qu'une app.

**Avancement (9 novembre 2026) :** le site Next.js est **commencé** dans `web/` de ce dépôt, sur un domaine dédié à choisir.
- **Fait :** pages en kreyòl pour l'accueil, les konbits (`/k/[id]`) et les profils (`/u/[pseudo]`), avec titres et aperçus de partage, plan du site, `robots.txt`, page 404 non indexée et cache de quelques minutes. Le build passe et le contenu est bien dans le HTML.
- **À faire :**
  - choisir et acheter le domaine, puis créer le projet Vercel (Root Directory `web`) ;
  - remplacer les liens de partage `konbit://` de l'app par des liens web, avec Android App Links ;
  - ajouter l'annuaire business quand les fiches existeront ;
  - ajouter la version française.

**À décider :**
- ~~l'adresse~~ → **décidé le 12 novembre 2026 : `konbit509.app`** (domaine acheté ; en `.app`, le HTTPS est obligatoire) ;
- le monorepo : déplacer l'app dans `apps/mobile`, le site dans `apps/web`, et le code partagé dans `packages/`. C'est une réorganisation à faire **après** le lancement mobile, pas pendant le test fermé ;
- les règles d'accès : les pages web ne doivent lire **que** ce qui est déjà public. Les règles de sécurité de la base (RLS) le garantissent déjà pour les konbits et profils visibles.

## 7. Le konbit comme action collective (décision du 12 novembre 2026)

C'est ce qui distingue Konbit 509 d'un réseau social classique : **un konbit est une action collective qui dure**, avec un lieu et des participants (un konbit pour des paysans, un projet, un nettoyage…).

**Deux types de publication :**
- **Konbit**, lancé en 4 étapes :
  1. **Kisa** : nom, explication, photos ;
  2. **Ki kote** : commune (celle du profil par défaut) et complément d'adresse facultatif ;
  3. **Kilè** : date et heure de début (heure d'Haïti), puis durée de 1 jour, 1 semaine, 1 mois ou jusqu'à une autre date ;
  4. **Ki moun** : nombre maximum facultatif, organisateur compris, puis un aperçu avant de lancer.
- **Mesaj** : un simple message (question, nouvelle). Tout le monde peut y répondre.

**Sur un konbit :**
- tout le monde le voit, l'aime et le partage ;
- statut automatique : *Ap vini* → *An kou* → *Fini* ;
- compteur « 12 / 20 moun ladan », puis *Plen* quand il n'y a plus de place ;
- **rejoindre ou quitter demande une confirmation**, pour éviter les erreurs ;
- **seuls l'organisateur et les participants écrivent**. À l'intérieur : des messages, des réponses et des réponses aux réponses (sur un seul niveau), avec J'aime et partage sur chaque message.

**La base de données vérifie aussi ces règles** (migration `20261112120000_konbit_collectif.sql`) :
- on ne peut pas rejoindre un konbit plein ou fini ;
- seuls les membres peuvent écrire ;
- les dates doivent être cohérentes.

Les anciens types (idée, projet) restent acceptés pour l'app déjà installée.

**À faire ensuite :**
- la même chose dans l'app mobile ;
- prévenir les participants d'un nouveau message ;
- permettre à l'organisateur de modifier ou clôturer son konbit.

## Déjà prévu (rappel)

- **Migration vers Expo SDK 57** : elle corrige la fuite mémoire de Hermes, importante sur les téléphones modestes. À faire sur une branche et à tester avant le lancement public.
- **Bloquer un utilisateur** : ne plus voir ses konbits ni ses réponses. Attendu sur un réseau social. Mettre ensuite à jour la réponse « blocage » de la classification du contenu.
- **Captures de la fiche Play en français** (fiche fr-FR), avec l'app en mode FR.
- **Fin novembre :**
  - passer le DMARC en `p=quarantine` ;
  - retirer l'accès TestPogo une fois la production obtenue.
