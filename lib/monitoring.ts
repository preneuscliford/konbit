import * as Sentry from "@sentry/react-native";

// Rapports de plantage (Sentry, projet konbit509/konbit-app) : plantages
// natifs et JavaScript, blocages (ANR), avec la marque, le modèle, la version
// d'Android et le « fil d'Ariane » (écrans visités, touchers, requêtes) juste
// avant le problème. Ainsi, une panne sur un vieux téléphone qu'on n'a pas
// sous la main reste visible.
//
// Vie privée : pas d'e-mail, pas d'adresse IP ; seul l'identifiant de compte
// (un uuid) est joint, pour relier plusieurs rapports d'une même personne.
// Le « replay » (reconstitution de l'écran) n'est enregistré que lors d'une
// erreur, avec TOUS les textes, images et dessins masqués : on voit les
// écrans et les gestes, jamais le contenu des gens.

// Sans vrai DSN (https://…), Sentry reste éteint et l'app fonctionne normalement.
const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN?.startsWith("https://")
  ? process.env.EXPO_PUBLIC_SENTRY_DSN
  : undefined;

export const navigationIntegration = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: true,
});

// Les adresses des requêtes gardent leur chemin, sans paramètres (jetons, filtres…).
const stripQuery = (url: unknown) =>
  typeof url === "string" ? url.split("?")[0] : url;

if (DSN) {
  Sentry.init({
    dsn: DSN,
    environment: __DEV__ ? "development" : "production",
    sendDefaultPii: false,
    attachScreenshot: false,
    attachViewHierarchy: false,
    // Lenteurs des écrans : tout en développement, 10 % des sessions en production.
    tracesSampleRate: __DEV__ ? 1.0 : 0.1,
    // Messages console.warn / console.error envoyés comme logs.
    enableLogs: true,
    // Replay seulement autour d'une erreur, jamais en continu.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    maxBreadcrumbs: 100,
    integrations: [
      navigationIntegration,
      Sentry.consoleLoggingIntegration({ levels: ["warn", "error"] }),
      Sentry.mobileReplayIntegration({ maskAllText: true, maskAllImages: true, maskAllVectors: true }),
    ],
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.data?.url) breadcrumb.data.url = stripQuery(breadcrumb.data.url);
      return breadcrumb;
    },
  });
}

// Identifiant du compte connecté (uuid seulement), ou personne.
export function setMonitoringUser(userId: string | null) {
  Sentry.setUser(userId ? { id: userId } : null);
}

export const wrapRoot = Sentry.wrap;
