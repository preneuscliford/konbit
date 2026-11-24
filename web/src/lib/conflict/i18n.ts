// Langues de la carte du conflit : kreyòl (défaut du site), français, anglais.

export const LANGS = ["ht", "fr", "en"] as const;
export type Lang = (typeof LANGS)[number];

/** Un texte dans les trois langues. */
export type L = Record<Lang, string>;

export const LANG_NAME: Record<Lang, string> = { ht: "Kreyòl", fr: "Français", en: "English" };
export const LANG_PATH: Record<Lang, string> = { ht: "/kat", fr: "/kat/fr", en: "/kat/en" };

/** Même texte dans les trois langues (noms propres, sigles). */
export const same = (s: string): L => ({ ht: s, fr: s, en: s });

export function tr(text: L, lang: Lang) {
  return text[lang];
}

export const UI = {
  title: { ht: "Kat konfli an Ayiti", fr: "Carte du conflit en Haïti", en: "Haiti Conflict Map" },
  description: {
    ht: "Yon kat ki gen dat ak sous sou jan gwoup ame yo gaye an Ayiti depi 2018, ak kwonoloji gwo evènman yo ak kantite viktim yo.",
    fr: "Une carte datée et sourcée de l'expansion des groupes armés en Haïti depuis 2018, avec la chronologie des événements clés et le bilan humain.",
    en: "A dated, sourced map of how armed groups spread across Haiti since 2018, with a timeline of key events and the human toll.",
  },
  updated: { ht: "Mizajou {date}", fr: "Mis à jour le {date}", en: "Updated {date}" },
  pressBased: { ht: "Dapre laprès", fr: "D'après la presse", en: "Based on press reports" },
  warningTitle: { ht: "Avètisman", fr: "Avertissement", en: "Warning" },
  warning: {
    ht: "Kat sa a se pou aprann ; li baze sou atik laprès. Li ka gen erè oswa reta, epi se pa yon kat an tan reyèl : pa sèvi avè l pou deside si w ap deplase. Ou wè yon erè ? Ekri nou nan konbit@haitiscope.com.",
    fr: "Cette carte est un outil éducatif fondé sur des articles de presse. Elle peut contenir des erreurs ou des retards et n'est pas une carte en temps réel : ne l'utilisez pas pour décider d'un déplacement. Une erreur ? Écrivez-nous à konbit@haitiscope.com.",
    en: "This map is an educational tool based on press reports. It may contain errors or delays and is not a real-time map: do not use it to decide whether to travel. Spotted an error? Write to us at konbit@haitiscope.com.",
  },
  warningOk: { ht: "Mwen konprann", fr: "J'ai compris", en: "Got it" },
  wholeCountry: { ht: "Tout peyi a", fr: "Tout le pays", en: "Whole country" },
  loadError: {
    ht: "Kat la pa t ka chaje. Verifye koneksyon w epi rechaje paj la.",
    fr: "La carte n'a pas pu être chargée. Vérifie ta connexion et recharge la page.",
    en: "The map could not be loaded. Check your connection and reload.",
  },
  loading: { ht: "Kat la ap chaje…", fr: "Chargement de la carte…", en: "Loading the map…" },
  hidePanel: { ht: "Kache panno a ◂", fr: "Masquer le panneau ◂", en: "Hide panel ◂" },
  details: { ht: "Detay ▸", fr: "Détails ▸", en: "Details ▸" },
  collapse: { ht: "Desann detay yo", fr: "Réduire les détails", en: "Collapse details" },
  expand: { ht: "Monte detay yo", fr: "Afficher les détails", en: "Expand details" },
  language: { ht: "Lang", fr: "Langue", en: "Language" },

  tabOverview: { ht: "Rezime", fr: "Vue d'ensemble", en: "Overview" },
  tabGroups: { ht: "Gwoup yo", fr: "Groupes", en: "Groups" },
  tabTimeline: { ht: "Kwonoloji", fr: "Chronologie", en: "Timeline" },
  tabAbout: { ht: "Metòd", fr: "Méthode", en: "Method" },
  back: { ht: "← Retounen", fr: "← Retour", en: "← Back" },

  sources: { ht: "Sous", fr: "Sources", en: "Sources" },
  draftSource: {
    ht: "Sous sa a poko konfime",
    fr: "Source à confirmer",
    en: "Source to be confirmed",
  },
  asOf: { ht: "Sitiyasyon : {date}", fr: "Situation : {date}", en: "Situation as of {date}" },
  legend: { ht: "Lejann", fr: "Légende", en: "Legend" },
  displaced: { ht: "Moun deplase", fr: "Déplacés", en: "Displaced" },
  capital: { ht: "Kapital la anba gang", fr: "Capitale sous les gangs", en: "Capital under gangs" },
  capitalNote: {
    ht: "Diferans ant sous yo, 2025-2026",
    fr: "Écart entre les sources, 2025-2026",
    en: "Range across sources, 2025–2026",
  },
  tapHint: {
    ht: "Touche yon zòn sou kat la pou w louvri fich li : sitiyasyon, gwoup ame, sous ak jan l chanje ak tan.",
    fr: "Touche une zone de la carte pour ouvrir sa fiche : statut, groupes armés, sources et évolution dans le temps.",
    en: "Tap any area on the map to open its file: status, armed groups, sources and how it changed over time.",
  },
  groupsIntro: {
    ht: "Se sèlman kowalisyon ak chèf laprès deja site piblikman.",
    fr: "Seulement les coalitions et les chefs déjà nommés publiquement par la presse.",
    en: "Only coalitions and leaders already named publicly in the press.",
  },
  areasCount: { ht: "{n} zòn", fr: "{n} zones", en: "{n} areas" },

  aboutIntro: {
    ht: "Yon zouti pou aprann, pou dyaspora a ak tout moun ki vle konprann kriz la.",
    fr: "Un outil éducatif pour la diaspora et pour toute personne qui veut comprendre la crise.",
    en: "An educational tool for the diaspora and anyone trying to understand the crisis.",
  },
  aboutNotRealtime: {
    ht: "Se pa yon kat an tan reyèl ni yon kat taktik.",
    fr: "Ce n'est ni une carte en temps réel ni une carte tactique.",
    en: "Not a real-time or tactical map.",
  },
  rule1: {
    ht: "Nou trase zòn yo dapre laprès sèlman : laprès ayisyen (Le Nouvelliste, AyiboPost, Alterpresse…), ajans entènasyonal (AP, AFP, Reuters) ak medya endepandan. Chif lapolis yo parèt ak prekosyon. Janm dapre siyalman itilizatè.",
    fr: "Les zones sont tracées uniquement à partir de la presse : presse haïtienne (Le Nouvelliste, AyiboPost, Alterpresse…), agences internationales (AP, AFP, Reuters) et médias indépendants. Les chiffres de la police sont affichés avec prudence. Jamais à partir de signalements d'utilisateurs.",
    en: "Areas are drawn from the press only: Haitian press (Le Nouvelliste, AyiboPost, Alterpresse…), international agencies (AP, AFP, Reuters) and independent media. Police figures are shown with caution. Never from user reports.",
  },
  rule2: {
    ht: "Nou pa mete okenn baraj, peyaj, baz oswa pozisyon sou kat la. Rakèt sou wout yo dekri pa gwo wout sèlman.",
    fr: "Aucun barrage, péage, base ou position n'est cartographié. Le racket routier est décrit par axe.",
    en: "No checkpoints, toll points, bases or unit positions are mapped. Road extortion is described by axis.",
  },
  rule3: {
    ht: "Chak zòn montre sous li ak dat li. Enfòmasyon ki poko konfime make « Poko klè ».",
    fr: "Chaque zone affiche sa source et sa date. Une information non confirmée est marquée « À clarifier ».",
    en: "Each area shows its source and date. Unconfirmed information is marked “To be clarified”.",
  },
  rule4: {
    ht: "Nou mete kat la ajou yon fwa pa mwa pou pi plis, janm pandan yon operasyon ap fèt.",
    fr: "Mises à jour au plus une fois par mois, jamais pendant une opération en cours.",
    en: "Updates at most monthly, never during an ongoing operation.",
  },
  rule5: {
    ht: "Se sèlman gwoup ak chèf laprès deja site. Chak zòn montre konbyen kalite sous endepandan konfime l. Nou make zòn, pa moun.",
    fr: "Seulement les groupes et chefs déjà nommés par la presse. Chaque zone indique combien de types de sources indépendants la confirment. Nous cartographions des zones, pas des personnes.",
    en: "Only groups and leaders already named in the press. Each area shows how many independent types of source confirm it. We map areas, not people.",
  },
  lastUpdate: { ht: "Dènye mizajou : {date}", fr: "Dernière mise à jour éditoriale : {date}", en: "Last editorial update: {date}" },
  basemap: {
    ht: "Fon kat la : OpenFreeMap, © OpenMapTiles, © kontribitè OpenStreetMap.",
    fr: "Fond de carte : OpenFreeMap, © OpenMapTiles, © contributeurs OpenStreetMap.",
    en: "Basemap: OpenFreeMap, © OpenMapTiles, © OpenStreetMap contributors.",
  },

  zoneSection: { ht: "Seksyon kominal · {commune} · {dept}", fr: "Section communale · {commune} · {dept}", en: "Communal section · {commune} · {dept}" },
  zoneCommune: { ht: "Komin · {dept}", fr: "Commune · {dept}", en: "Commune · {dept}" },
  armedGroups: { ht: "Gwoup ame", fr: "Groupes armés", en: "Armed groups" },
  zoneNone: {
    ht: "Nou pa anrejistre okenn zòn gwoup ame isit la pou {period}. Sa pa vle di zòn nan an sekirite : okenn rapò nou itilize pa mete l nan youn nan kategori yo.",
    fr: "Aucune zone de groupe armé enregistrée ici pour {period}. Cela ne veut pas dire que la zone est sûre : aucun des rapports publiés que nous utilisons ne la classe dans une catégorie.",
    en: "No armed-group area recorded here for {period}. This does not mean the area is safe: no published report we use places it in one of the categories.",
  },
  overTime: { ht: "Jan l chanje", fr: "Évolution", en: "Over time" },
  none: { ht: "Pa gen done", fr: "Pas de donnée", en: "No data" },
  pending: { ht: "Poko pare", fr: "En attente", en: "Pending" },
  eventsHere: { ht: "Gwo evènman isit la", fr: "Événements clés ici", en: "Key events here" },

  coalition: { ht: "Kowalisyon", fr: "Coalition", en: "Coalition" },
  armedGroup: { ht: "Gwoup ame", fr: "Groupe armé", en: "Armed group" },
  leader: { ht: "Chèf", fr: "Chef", en: "Leader" },
  namedIn: { ht: "Site nan laprès :", fr: "Nommé dans la presse :", en: "Named in the press:" },
  howOperates: { ht: "Kijan yo opere", fr: "Mode opératoire", en: "How it operates" },
  areasIn: {
    ht: "Zòn yo an {period} (make sou kat la)",
    fr: "Zones en {period} (entourées sur la carte)",
    en: "Areas in {period} (outlined on the map)",
  },
  noArea: {
    ht: "Pa gen zòn anrejistre pou peryòd sa a.",
    fr: "Aucune zone enregistrée pour cette période.",
    en: "No area recorded for this period.",
  },
  eventCommune: { ht: "Komin : {name} →", fr: "Commune : {name} →", en: "Commune: {name} →" },

  kindPressHt: { ht: "Laprès ayisyen", fr: "Presse haïtienne", en: "Haitian press" },
  kindPressIntl: { ht: "Ajans entènasyonal", fr: "Agence internationale", en: "International agency" },
  kindPressIndep: { ht: "Medya endepandan", fr: "Média indépendant", en: "Independent media" },
  kindPolice: { ht: "Lapolis (konfyans pasyèl)", fr: "Police (confiance partielle)", en: "Police (partial trust)" },
  confirmation: { ht: "Konfimasyon", fr: "Confirmation", en: "Confirmation" },
  confirmed1: {
    ht: "Yon sèl kalite sous : pran prekosyon",
    fr: "Un seul type de source : à prendre avec prudence",
    en: "Single type of source: treat with caution",
  },
  confirmed2: {
    ht: "De kalite sous endepandan dakò",
    fr: "Confirmé par deux types de sources indépendants",
    en: "Confirmed by two independent types of source",
  },
  confirmed3: {
    ht: "{n} kalite sous endepandan dakò",
    fr: "Confirmé par {n} types de sources indépendants",
    en: "Confirmed by {n} independent types of source",
  },
  play: { ht: "Jwe istwa a", fr: "Lire l'histoire", en: "Play" },
  pause: { ht: "Pòz", fr: "Pause", en: "Pause" },
  situationAt: { ht: "Sitiyasyon", fr: "Situation", en: "As of" },
  documentedSince: { ht: "Dokimante depi {date}", fr: "Documenté depuis {date}", en: "Documented since {date}" },
  modeStatus: { ht: "Sitiyasyon", fr: "Situation", en: "Situation" },
  modeChange: { ht: "Evolisyon", fr: "Évolution", en: "Changes" },
  changeWorse: { ht: "Vin pi mal", fr: "Aggravation", en: "Worsened" },
  changeNew: { ht: "Nouvo zòn", fr: "Nouvelle zone", en: "New area" },
  changeHintNew: {
    ht: "Zòn sa a pa t parèt nan sous peryòd anvan an : swa gang yo gaye la, swa laprès pa t pale de li anvan.",
    fr: "Zone absente des sources de la période précédente : soit les gangs s'y sont étendus, soit la presse n'en parlait pas encore.",
    en: "Area absent from the previous period's sources: either gangs spread there, or the press did not cover it before.",
  },
  changeBetter: { ht: "Gang yo pèdi kontwòl", fr: "Recul du contrôle des gangs", en: "Gang control recedes" },
  changeSame: { ht: "Pa chanje", fr: "Pas de changement", en: "No change" },
  changeNoData: { ht: "Pa ka konpare (pa gen done)", fr: "Comparaison impossible (donnée manquante)", en: "Cannot compare (missing data)" },
  changeHintWorse: {
    ht: "Gang yo pran plis teren oswa batay yo vin pi rèd.",
    fr: "Les gangs gagnent du terrain ou la violence s'intensifie.",
    en: "Gangs gain ground or the violence intensifies.",
  },
  changeHintBetter: {
    ht: "Gang yo pa kontwole zòn nan nèt ankò, apre operasyon fòs sekirite yo oswa lagè ant gang. Vyolans lan ka rete fò.",
    fr: "Les gangs ne contrôlent plus entièrement la zone, après des opérations des forces de sécurité ou une guerre entre gangs. La violence peut rester forte.",
    en: "Gangs no longer fully control the area, after security force operations or fighting between gangs. Violence may remain high.",
  },
  changeHintSame: { ht: "Menm sitiyasyon ak peryòd anvan an.", fr: "Même situation qu'à la période précédente.", en: "Same situation as in the previous period." },
  changeHintNoData: {
    ht: "Laprès pa dekri zòn sa a pou peryòd sa a : sa pa vle di li an sekirite.",
    fr: "La presse ne décrit pas cette zone pour cette période : cela ne veut pas dire qu'elle est sûre.",
    en: "The press does not describe this area for this period: it does not mean it is safe.",
  },
  changeVs: { ht: "Konpare ak {prev}", fr: "Par rapport à {prev}", en: "Compared with {prev}" },
  changeFirst: {
    ht: "Se premye peryòd la : pa gen anyen pou konpare. Chwazi 2025 oswa 2026.",
    fr: "C'est la première période : rien à comparer. Choisis 2025 ou 2026.",
    en: "This is the first period: nothing to compare. Pick 2025 or 2026.",
  },
  securityOps: { ht: "Operasyon fòs sekirite yo", fr: "Opérations des forces de sécurité", en: "Security force operations" },
  noSecurityOps: {
    ht: "Pa gen operasyon nou anrejistre pou peryòd sa a.",
    fr: "Aucune opération enregistrée pour cette période.",
    en: "No operation recorded for this period.",
  },
  kindViolence: { ht: "Vyolans", fr: "Violence", en: "Violence" },
  kindPolitics: { ht: "Politik", fr: "Politique", en: "Politics" },
  kindInternational: { ht: "Entènasyonal", fr: "International", en: "International" },
  kindSecurity: { ht: "Fòs sekirite", fr: "Forces de sécurité", en: "Security forces" },
  statusControl: { ht: "Anba kontwòl gang", fr: "Contrôle des gangs", en: "Gang control" },
  statusInfluence: { ht: "Enfliyans gang", fr: "Influence des gangs", en: "Gang influence" },
  statusContested: { ht: "Zòn y ap goumen", fr: "Zone contestée", en: "Contested" },
  statusUnclear: { ht: "Poko klè", fr: "À clarifier", en: "To be clarified" },
  hintControl: {
    ht: "Gwoup ame yo kontwole pi fò zòn kote moun rete.",
    fr: "Les groupes armés contrôlent la plupart des zones habitées.",
    en: "Armed groups control most populated areas.",
  },
  hintInfluence: {
    ht: "Gen gwoup ame nan yon pati zòn nan, oswa y ap fè moun peye sou wout li yo.",
    fr: "Des groupes armés sont présents dans une partie de la zone ou rackettent ses routes.",
    en: "Armed groups are present in parts of the area or racket its roads.",
  },
  hintContested: {
    ht: "Gen batay ant gwoup ame yo, oswa ak fòs sekirite yo.",
    fr: "Combats en cours entre groupes armés et/ou avec les forces de sécurité.",
    en: "Active fighting between armed groups and/or security forces.",
  },
  hintUnclear: {
    ht: "Gen rapò, men sitiyasyon an poko konfime.",
    fr: "Des rapports existent mais la situation n'est pas confirmée.",
    en: "Reports exist but the situation is not confirmed.",
  },
} satisfies Record<string, L>;

export type UIKey = keyof typeof UI;

export function t(lang: Lang, key: UIKey, vars?: Record<string, string | number>) {
  let s: string = UI[key][lang];
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
  return s;
}
