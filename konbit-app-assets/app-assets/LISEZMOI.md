# Konbit 509 : fichiers du logo pour l'appli

Couleurs :
- bleu `#00209F`
- rouge `#D21034`
- blanc `#FFFFFF`

Police du logo : Poppins Bold. Dans tous les fichiers, le K et les chiffres sont convertis en tracés, donc aucune police n'est nécessaire.

## Si l'appli est faite avec Capacitor (le plus simple)

1. Copie le dossier `capacitor/assets/` à la racine du projet, sous le nom `assets/`.
2. Lance :
   ```
   npm i -D @capacitor/assets
   npx @capacitor/assets generate --android
   ```
   Toutes les icônes et tous les splash Android sont générés automatiquement.
3. Ajoute en plus l'icône de notification (voir plus bas).

## Si tu intègres à la main (Android Studio)

Copie le contenu de `android/res/` dans `app/src/main/res/`. Si des fichiers du même nom existent déjà, remplace-les.

| Fichier | Rôle |
|---|---|
| `mipmap-*/ic_launcher.png`, `ic_launcher_round.png` | Icône pour les anciens Android (avant la version 8) |
| `mipmap-*/ic_launcher_foreground.png` + `values/konbit_colors.xml` | Icône adaptative : le K et le 509 sur fond bleu, que chaque téléphone découpe à sa forme |
| `mipmap-*/ic_launcher_monochrome.png` | Icône « thématique » d'Android 13 et plus, sur une seule couleur |
| `mipmap-anydpi-v26/ic_launcher*.xml` | Assemble les trois couches de l'icône adaptative |
| `drawable-*/ic_stat_konbit.png` et `drawable/ic_stat_konbit_vector.xml` | Icône de notification : un K blanc seul, car le 509 serait illisible à cette taille |
| `drawable-*/splash_icon.png` | Logo de l'écran de démarrage d'Android 12 et plus |

Écran de démarrage, dans le thème :
```xml
<item name="windowSplashScreenBackground">@color/konbit_white</item>
<item name="windowSplashScreenAnimatedIcon">@drawable/splash_icon</item>
```

Icône de notification par défaut, si tu utilises Firebase. À mettre dans `AndroidManifest.xml` :
```xml
<meta-data android:name="com.google.firebase.messaging.default_notification_icon"
           android:resource="@drawable/ic_stat_konbit" />
<meta-data android:name="com.google.firebase.messaging.default_notification_color"
           android:resource="@color/konbit_red" />
```

## Animation Lottie (`lottie/`)

`konbit509-intro.json` dure 2,5 s, à 60 images par seconde, en 512 × 512, sur fond transparent :
1. le carré bleu apparaît ;
2. puis le K ;
3. puis l'étiquette rouge, où défilent 5, puis 0, puis 9, comme un compteur ;
4. enfin une petite pulsation, et l'animation s'arrête sur le logo complet.

Le fichier `konbit509-intro-apercu.mp4` est une vidéo de contrôle.

L'écran de démarrage système d'Android ne lit pas le Lottie. Il affiche `splash_icon`, puis l'appli joue l'animation sur un premier écran blanc.

**Android natif.** Ajoute la bibliothèque `com.airbnb.android:lottie` (version 6.x), puis place le JSON dans `res/raw/konbit509_intro.json`.
```xml
<com.airbnb.lottie.LottieAnimationView
    android:id="@+id/intro"
    android:layout_width="220dp" android:layout_height="220dp"
    app:lottie_rawRes="@raw/konbit509_intro"
    app:lottie_autoPlay="true" app:lottie_loop="false" />
```
Écoute la fin de l'animation (`addAnimatorListener`, `onAnimationEnd`) pour passer à l'écran principal.

**Web / Capacitor.** Ajoute la bibliothèque `lottie-web` et le JSON dans le dossier public.
```js
import lottie from 'lottie-web';
const a = lottie.loadAnimation({ container: document.getElementById('intro'),
  renderer: 'svg', loop: false, autoplay: true, path: '/konbit509-intro.json' });
a.addEventListener('complete', () => { /* afficher l'accueil */ });
```

## Site web / PWA (`web/`)

`favicon.ico` et `favicon.svg` montrent le K seul. `icon-192.png`, `icon-512.png` et `icon-maskable-512.png` servent au manifeste : les entrées sont prêtes dans `manifest-icons.json`. `apple-touch-icon.png` sert pour l'iPhone.
```html
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta name="theme-color" content="#00209F">
```

## Google Play (`store/`)

- `play-store-icon-512.png` : l'icône de la fiche. Google arrondit lui-même les coins, ne les arrondis pas.
- `feature-graphic-1024x500.png` : la bannière en haut de la fiche.

## Fichiers sources

`svg/` contient les originaux vectoriels, à utiliser pour toute nouvelle taille ou pour l'impression :
- `konbit509-logo.svg` : le logo complet ;
- `konbit509-icone.svg` : l'icône carrée ;
- `konbit509-k.svg` : le K seul sur fond bleu ;
- `konbit509-k-blanc.svg` : le K blanc seul.

`logo/` contient le logo complet en PNG transparent, en 256, 512 et 1024 px.
