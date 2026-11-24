// Carte du conflit en Haïti : données éditoriales, en kreyòl, français et
// anglais (type L).
//
// Règles (voir le plan du projet) :
// - des zones par commune ou section communale, jamais de positions
//   (barrages, bases, péages) ;
// - SOURCES : uniquement la presse (haïtienne, agences internationales,
//   médias indépendants) ; la police avec prudence. Aucune source de l'ONU
//   ni d'ONG n'est citée sur le site ;
// - chaque zone affiche ses sources et le nombre de types de sources qui la
//   confirment ; sans article de presse, pas de zone ;
// - seulement les groupes et chefs déjà nommés publiquement dans la presse ;
// - mises à jour au plus mensuelles.
//
// `verified` : l'article (ou son résumé) a été lu et dit bien ce que la zone
// affirme. Relecture humaine à deux avant publication.

import { same, type L } from "./i18n";

export type ZoneStatus = "control" | "influence" | "contested" | "unclear";

/** Type de source. La police est à prendre avec prudence. */
export type SourceKind = "press-ht" | "press-intl" | "press-indep" | "police";

/** Types de source dans l'ordre d'affichage. */
export const SOURCE_KINDS: SourceKind[] = ["press-ht", "press-intl", "press-indep", "police"];

export type Source = { label: L; kind: SourceKind; url?: string };

/** Nombre de types de sources indépendants qui confirment une zone. */
export function confirmationLevel(sources: Source[]) {
  return new Set(sources.map((x) => x.kind)).size;
}

export type Zone = {
  /** Code HDX/CNIGS : commune (HT0111) ou section communale (HT0131-10). */
  pcode: string;
  status: ZoneStatus;
  groups: string[];
  note?: L;
  sources: Source[];
  /** Date d'effet (AAAA-MM ou AAAA-MM-JJ) ; sinon la date par défaut de la période. */
  since?: string;
  verified: boolean;
};

export type Period = {
  id: string;
  label: string;
  /** Date d'effet des zones sans date précise (date de l'article de référence). */
  defaultSince: string;
  asOf: L;
  summary: L;
  zones: Zone[];
};

export type Group = {
  id: string;
  name: string;
  kind: "coalition" | "gang";
  area: L;
  /** Chef seulement s'il est nommé publiquement dans la presse. */
  leader?: { name: string; role?: L; sources: Source[] };
  modusOperandi: L[];
  designations: L[];
  sources: Source[];
  verified: boolean;
};

export type TimelineEvent = {
  date: L;
  sortKey: string;
  title: L;
  /** security : opérations et déploiements des forces de sécurité. */
  kind: "violence" | "politics" | "international" | "security";
  source: Source;
  /** Commune concernée (centrage de la carte), jamais un lieu précis. */
  pcode?: string;
  verified: boolean;
};

/** Date de la dernière mise à jour éditoriale (affichée en haut de la carte,
 * à changer à chaque mise à jour des zones). */
export const LAST_UPDATED: L = { ht: "24 novanm 2026", fr: "24 novembre 2026", en: "24 Nov 2026" };

export const STATUS_ORDER: ZoneStatus[] = ["control", "influence", "contested", "unclear"];

/* ---------- Sources (presse) ---------- */

/** Article de presse : « Média — titre ». Le titre reste dans sa langue d'origine. */
function art(kind: SourceKind, text: string, url: string): Source {
  return { kind, label: same(text), url };
}

const LN = "https://lenouvelliste.com/en/article/";
const HL = "https://www.haitilibre.com/en/";

const S = {
  // Chefs
  cherizierAJ: art("press-intl", "Al Jazeera — Who is Haitian gang leader Jimmy “Barbecue” Cherizier? (2022)", "https://www.aljazeera.com/news/2022/10/21/who-is-haitis-sanctioned-gang-leader-jimmy-barbecue-cherizier"),
  cherizierIC: art("press-indep", "InSight Crime — Jimmy Cherizier, alias “Barbecue”", "https://insightcrime.org/haiti-organized-crime-news/jimmy-cherizier-alias-barbecue/"),
  izoLN: art("press-ht", "Le Nouvelliste — Justice System Accuses “Izo” of Holding an American Hostage", LN + "254327/justice-system-accuses-izo-of-holding-an-american-hostage"),
  izoIC: art("press-indep", "InSight Crime — 5 Seconds", "https://insightcrime.org/haiti-organized-crime-news/5-seconds/"),
  tiLapliHL: art("press-ht", "HaitiLibre — “Ti Lapli”, leader of the Grand Ravin gang", HL + "news-41462-haiti-eu-sanctions-ti-lapli-leader-of-the-grand-ravin-gang-and-reasons-for-the-sanctions-2-4.html"),
  lanmoAP: art("press-intl", "AP — Powerful Haitian gang leader seeks dialogue as clashes intensify (Nov. 2026)", "https://www.ajc.com/news/2026/11/powerful-haitian-gang-leader-writes-un-seeking-dialogue-as-clashes-intensify/"),
  lanmoHL: art("press-ht", "HaitiLibre — “Lanmò San Jou”, leader of the 400 Mawozo gang", HL + "news-41467-haiti-eu-sanctions-lanmo-san-jou-leader-of-the-400-mawozo-gang-and-reasons-for-the-sanctions-3-4.html"),
  vitelLN: art("press-ht", "Le Nouvelliste — FBI's Most Wanted, With Bounty on His Head, Grants CNN Interview Near US Embassy", LN + "247915/fbis-most-wanted-with-bounty-on-his-head-grants-cnn-interview-near-us-embassy"),
  vitelHL: art("press-ht", "HaitiLibre — The leader of the «Kraze Barye» gang risks the death penalty", HL + "news-40810-haiti-usa-the-leader-of-the-kraze-barye-gang-risks-the-death-penalty.html"),
  elanHL: art("press-ht", "HaitiLibre — Gran Grif led by Luckson Elan: road between Petite-Rivière, Liancourt, Pont-Sondé and Verrettes freed", HL + "news-46034-haiti-securitymonitoring-of-the-latest-targeted-operations-of-the-gsf-ex-mss.html"),
  pontSondeAJ: art("press-intl", "Al Jazeera — At least 70 people killed in gang attack on Haitian town (Oct. 2024)", "https://www.aljazeera.com/news/2024/10/4/at-least-70-people-killed-in-gang-attack-on-haitian-town-un"),
  pontSondeAP: art("press-intl", "AP — After a gang attack on a small Haitian town, death toll rises to at least 115 (Oct. 2024)", "https://www.pbs.org/newshour/world/after-a-gang-attack-on-a-small-haitian-town-death-toll-rises-to-at-least-115"),

  // Capitale
  capitalAP: art("press-intl", "AP — Haiti's gangs have “near-total control” of the capital (July 2025)", "https://www.opb.org/article/2025/07/03/haiti-s-gangs-have-near-total-control-of-the-capital/"),
  policeStrikeLN: art("press-ht", "Le Nouvelliste — Kenscoff Under Fire, Police Strike Back in Port-au-Prince and Delmas", LN + "257074/kenscoff-under-fire-police-strike-back-in-port-au-prince-and-delmas"),
  downtownHL: art("press-ht", "HaitiLibre — The PNH regains ground in downtown Port-au-Prince", HL + "news-46309-haiti-flash-the-pnh-regains-ground-in-downtown-port-au-prince-summary-video.html"),
  croixHL: art("police", "HaitiLibre (communiqué de la police) — The PNH deals a decisive blow against the 400 Mawozo gang (Nov. 2025)", HL + "news-46222-haiti-croix-des-bouquets-the-haitian-national-police-pnh-deals-a-decisive-blow-against-the-400-mawozo-gang.html"),
  torcelLN: art("press-ht", "Le Nouvelliste — Police Launch Offensive in Torcel: Gang Members Killed, Weapons Recovered (July 2025)", LN + "257959/police-launch-offensive-in-torcel-gang-members-killed-weapons-recovered"),
  tabarreLN: art("press-ht", "Le Nouvelliste — Tabarre: the spaces seized by the gangs are just a few kilometers from the airport", LN + "243850/tabarre-the-spaces-seized-by-the-gangs-are-just-a-few-kilometers-away-from-the-toussaint-louverture-international-airport"),
  pernierLN: art("press-ht", "Le Nouvelliste — Over Ten People Killed by Kraze Baryè Gang in Pernier", LN + "253427/over-ten-people-killed-by-kraze-barye-gang-in-pernier"),
  petionvilleHL: art("press-ht", "HaitiLibre — Pernier: offensive of the PNH in the stronghold of the Kraze Barye gang", HL + "news-45086-haiti-pernier-offensive-of-the-pnh-in-the-stronghold-of-the-kraze-barye-gang-video.html"),
  kenscoffLN: art("press-ht", "Le Nouvelliste — Gang Attacks Persist in Kenscoff as Criminal Groups Gain Ground", LN + "255253/gang-attacks-persist-in-kenscoff-as-criminal-groups-gain-ground"),
  furcyLN: art("press-ht", "Le Nouvelliste — Furcy Substation Burned Down as Fears Rise for Kenscoff's City Center", LN + "258023/furcy-substation-burned-down-as-fears-rise-for-kenscoffs-city-center"),
  kenscoffMayorLN: art("press-ht", "Le Nouvelliste — Mayor Massillon Jean Raises Alarm: “Kenscoff Must Not Fall!”", LN + "259049/mayor-massillon-jean-raises-alarm-kenscoff-must-not-fall"),
  carrefourLN: art("press-ht", "Le Nouvelliste — Carrefour Shut Down as Gang Leader Krisla Calls for Strike", LN + "255654/carrefour-shut-down-as-gang-leader-krisla-calls-for-strike"),
  carrefourStationsLN: art("press-ht", "Le Nouvelliste — Gangs Empty Police Stations and Kill Seven in Carrefour", LN + "247750/gangs-empty-police-stations-and-kill-seven-in-carrefour"),
  carrefourAyibo: art("press-ht", "AyiboPost — Krisla's control over Carrefour", "https://ayibopost.com/?p=66376"),
  gressierLN: art("press-ht", "Le Nouvelliste — Gangs Control “75% of Gressier”", LN + "249017/gangs-control-75-of-gressier"),
  gressierOffensiveLN: art("press-ht", "Le Nouvelliste — Gressier: Armed Gangs Resume Their Offensive", LN + "253655/gressier-armed-gangs-resume-their-offensive"),
  gressierAP: art("press-intl", "AP — Gangs storm another police station in Haiti (May 2024)", "https://www.jamaicaobserver.com/2024/05/12/gangs-storm-another-police-station-in-haiti"),
  labodrieAP: art("press-intl", "AP — Official says gangs killed dozens in small fishing village in Haiti's latest massacre (Sept. 2025)", "https://www.pbs.org/newshour/world/official-says-gangs-killed-dozens-in-small-fishing-village-in-haitis-latest-massacre"),
  labodrieLN: art("press-ht", "Le Nouvelliste — Labodrie Massacre: More Than 40 Dead in Armed Assault", LN + "259855/labodrie-massacre-more-than-40-dead-in-armed-assault-local-official-reports"),
  labodrieHL: art("press-ht", "HaitiLibre — Massacre in Labodrie, more than 40 killed", HL + "news-45763-haiti-flash-massacre-in-labodrie-more-than-40-killed-and-many-injured.html"),
  ganthierLN: art("press-ht", "Le Nouvelliste — After Targeting the Police Station, Gangs Blaze Customs Offices in Ganthier", LN + "249511/apres-le-commissariat-les-gangs-incendient-les-locaux-de-la-douane-a-ganthier"),

  // Artibonite
  prevalLN: art("press-ht", "Le Nouvelliste — Massacre in Artibonite: Dozens of Peasants Killed in Préval (May 2025)", LN + "256377/massacre-in-artibonite-dozens-of-peasants-killed-in-preval"),
  granGrifLN: art("press-ht", "Le Nouvelliste — Gran Grif Gang Strikes Again in Artibonite", LN + "251675/gran-grif-gang-strikes-again-in-artibonite"),
  chandelLN: art("press-ht", "Le Nouvelliste — Gran Grif Gang Seizes Control of Chandèl in the Artibonite Region (Oct. 2025)", LN + "260970/gran-grif-gang-seizes-control-of-chandel-in-the-artibonite-region"),
  laChapelleLN: art("press-ht", "Le Nouvelliste — Terrorist Coalition “Viv Ansanm” Seizes Control of La Chapelle (June 2025)", LN + "257432/la-coalition-terroriste-viv-ansanm-sempare-de-la-chapelle"),
  laChapelleAP: art("press-intl", "AP — Residents in rural Haiti town staying away amid calls to return after gang attack", "https://gazette.com/?p=1546555"),
  laChapelleRelief: art("press-ht", "Le Relief Haïti — La Chapelle: the commune empties of nearly 9,000 inhabitants", "https://www.lereliefhaiti.com/articles/violence-continues-its-reign-in-la-chapelle-the-commune-empties-of-nearly-9000-inhabitants"),
  lestereLN: art("press-ht", "Le Nouvelliste — L'Estère Faces Yet Another Offensive from the “Kokorat San Ras” Gang", "https://www.lenouvelliste.com/en/article/260930/lestere-encore-sous-attaque-du-gang-kokorat-san-ras"),
  lestereAgriLN: art("press-ht", "Le Nouvelliste — Gangs Methodically Devastate Agriculture in L'Estère", "https://www.lenouvelliste.com/en/article/261441/gangs-methodically-devastate-agriculture-in-lestere"),
  grosMorneHL: art("press-ht", "HaitiLibre — The commune of Gros-Morne attacked: at least 11 dead (Jan. 2025)", HL + "news-44099-haiti-flash-the-commune-of-gros-morne-attacked-at-least-11-dead-injured-and-houses-burned.html"),
  kokoratHL: art("press-ht", "HaitiLibre — Law enforcement on the offensive in the territory of the Kokorat San Ras gang", HL + "news-43560-haiti-flash-law-enforcement-on-the-offensive-in-the-territory-of-the-kokorat-san-ras-gang.html"),
  verrettesLN: art("press-ht", "Le Nouvelliste — Verrettes Defends Itself amid Repeated Assaults by Criminal Groups", "https://www.lenouvelliste.com/en/article/261102/verrettes-continue-de-repousser-des-attaques-de-gangs-armes"),
  liancourtLN: art("press-ht", "Le Nouvelliste — Fifteen Suspected Criminals Reportedly Killed in Liancourt (Sept. 2025)", LN + "259624/une-quinzaine-de-presumes-criminels-tues-a-liancourt"),

  // Centre
  mirebalaisAP: art("press-intl", "AP — Gangs strike in Haiti's heartland as hundreds flee under heavy gunfire (31 March 2025)", "https://jamaica-gleaner.com/article/news/20250331/gangs-strike-haitis-heartland-hundreds-flee-under-heavy-gunfire"),
  mirebalaisLN: art("press-ht", "Le Nouvelliste — Mirebalais Hit by Gang Violence, Casualties Reported", LN + "254750/mirebalais-hit-by-gang-violence-casualties-reported"),
  mirebalaisHL: art("press-ht", "HaitiLibre — Mirebalais under attack, more than 500 escapees on the run", HL + "news-44597-haiti-flash-mirebalais-under-attack-numerous-victims-more-than-500-escapees-on-the-run-video.html"),
  sautDeauRelief: art("press-ht", "Le Relief Haïti — Saut d'Eau and Mirebalais: Nearly 6,000 Internally Displaced Persons Identified", "https://www.lereliefhaiti.com/en/articles/saut-deau-and-mirebalais-nearly-6000-internally-displaced-persons-identified"),
  centreHL: art("press-ht", "HaitiLibre — Centre Department: continued deterioration of the security situation", HL + "news-45333-haiti-centre-department-continued-deterioration-of-the-security-situation.html"),
  centralPlateauLN: art("press-ht", "Le Nouvelliste — Armed Group “Viv Ansanm” Strikes Central Plateau, Leaves One Dead", LN + "257793/armed-group-viv-ansanm-strikes-central-plateau-leaves-one-dead"),

  // 2021
  missionariesAP: art("press-intl", "AP — Gang with past abductions blamed for kidnapping missionaries (Oct. 2021)", "https://www.opb.org/article/2021/10/17/us-religious-group-says-17-missionaries-kidnapped-in-haiti/"),
  martissantLN: art("press-ht", "Le Nouvelliste — Why the government and the PNH capitulated to the Martissant gangs on 1 June 2021", LN + "248437/pourquoi-le-gouvernement-et-la-pnh-ont-capitule-devant-les-gangs-de-martissant-le-1er-juin-2021"),
  martissantHL: art("press-ht", "HaitiLibre — Gang war, hundreds of people flee Martissant (June 2021)", HL + "news-33912-haiti-flash-gang-war-hundreds-of-people-flee-martissant.html"),
  citeSoleilAP: art("press-intl", "AP — Dozens dead, injured in Haiti's capital in gang clashes (July 2022)", "https://www.nbcmiami.com/news/national-international/dozens-dead-injured-in-haitis-capital-in-gang-clashes/2803955/"),

  // Chiffres
  capital90: art("press-intl", "Africanews (AP) — Life slowly returns to Port-au-Prince area after Haiti drives gangs out (Feb. 2026)", "https://www.africanews.com/2026/02/26/life-slowly-returns-to-port-au-prince-area-after-haiti-drives-gangs-out/"),
  citeSoleil2026AP: art("press-intl", "AP — Residents of Haiti's Cité Soleil demand protection after gang violence displaces hundreds (May 2026)", "https://www.wlrn.org/americas-app-feed/2026-05-13/residents-of-haitis-cite-soleil-demand-protection-after-gang-violence-displaces-hundreds"),
  // 2025 (compléments)
  sautDeauLN: art("press-ht", "Le Nouvelliste — Criminal Gangs Take Control of Saut-d'Eau (April 2025)", LN + "254962/criminal-gangs-take-control-of-saut-deau"),
  centreSixMonthsLN: art("press-ht", "Le Nouvelliste — Mirebalais and Saut-d'Eau: Six Months of Suffocation After the Gang Assault", LN + "260430/mirebalais-et-saut-deau-six-mois-dasphyxie-apres-lassaut-des-gangs"),
  artiboniteDecAP: art("press-intl", "AP — Gangs launch large-scale attack in Haiti's central region as hundreds flee (Dec. 2025)", "https://www.washingtontimes.com/news/2025/dec/1/gangs-conduct-large-scale-attack-haitis-central-region-hundreds-flee/"),
  bercyRelief: art("press-ht", "Le Relief Haïti — Gangs Continue to Impose Their Law at Year-End (Dec. 2025)", "https://lereliefhaiti.com/en/articles/gangs-continue-to-impose-their-law-at-year-end-haitian-national-police-sets-the-rules"),
  // 2026
  downtownLN: art("press-ht", "Le Nouvelliste — PNH Advances in Efforts to Retake Downtown Port-au-Prince (2026)", LN + "266789/pnh-advances-in-efforts-to-retake-downtown-port-au-prince"),
  frgPatrolsLN: art("press-ht", "Le Nouvelliste — The FRG Begins Joint Patrols with the PNH in Downtown Port-au-Prince (Sept. 2026)", LN + "271500/the-frg-begins-joint-patrols-with-the-pnh-in-downtown-port-au-prince"),
  police72LN: art("police", "Le Nouvelliste — PNH Chief Says Gangs Control 72% of Metropolitan Area (2026)", LN + "266079/pnh-chief-says-gangs-control-72-of-metropolitan-area"),
  stadiumAFP: art("press-intl", "Jamaica Observer (AFP) — Haitian forces recapture national stadium from gang control (12 Nov. 2026)", "https://www.jamaicaobserver.com/2026/11/12/haitian-forces-recapture-national-stadium-gang-control/"),
  martissantAP: art("press-intl", "AP — Heavy fighting erupts in Haiti as armed forces fight gangs to regain control of key corridor (19 Nov. 2026)", "https://www.wcax.com/2026/11/19/heavy-fighting-erupts-haiti-armed-forces-fight-gangs-regain-control-key-corridor/"),
  lowerDelmasLN: art("press-ht", "Le Nouvelliste — Slow Return to Activity in Lower Delmas amid Ongoing Fragility (2026)", LN + "266425/slow-return-to-activity-in-lower-delmas-amid-ongoing-fragility"),
  delmas6LN: art("press-ht", "Le Nouvelliste — PNH Steps Up Offensive, Targets Jimmy Chérizier's Stronghold (Jan. 2026)", LN + "263308/pnh-steps-up-offensive-targets-jimmy-cheriziers-stronghold"),
  culDeSacLN: art("press-ht", "Le Nouvelliste — Gang Clashes in Cul-de-Sac Plain Leave Civilians Trapped in Crossfire (2026)", LN + "266498/gang-clashes-in-cul-de-sac-plain-leave-civilians-trapped-in-crossfire"),
  culDeSacPoliceLN: art("press-ht", "Le Nouvelliste — Haitian National Police Deploys Armored Vehicles and Elite Units Amid Violence in Cul-de-Sac (May 2026)", LN + "267186/haitian-national-police-deploys-armored-vehicles-and-elite-units-amid-violence-in-cul-de-sac"),
  croix2026LN: art("police", "Le Nouvelliste (communiqué de la police) — Six Armed Suspects Killed as Police Regain Strategic Ground (March 2026)", LN + "264728/six-armed-suspects-killed-as-police-regain-strategic-ground"),
  tabarreBridgeRelief: art("press-ht", "Le Relief Haïti — The PNH Regains Control of Tabarre Bridge and Restores Traffic at Carrefour Marassa (Nov. 2026)", "https://www.lereliefhaiti.com/en/articles/haiti-security-the-haitian-national-police-regains-control-of-tabarre-bridge-and-restores-traffic-at-carrefour-marassa"),
  torcelPernierRelief: art("press-ht", "Le Relief Haïti — Bandits Stopped, Weapons and Ammunition Seized by Police (April 2026)", "https://www.lereliefhaiti.com/en/articles/bandits-stopped-weapons-and-ammunition-seized-by-police"),
  kenscoff2026AP: art("press-intl", "AP — More than 50 kidnapped after violent gang attack in Haiti leaves 47 dead (Aug. 2026)", "https://www.wlrn.org/americas/2026-08-25/more-than-50-kidnapped-after-violent-gang-attack-in-haiti-leaves-47-dead"),
  kenscoff2026LN: art("press-ht", "Le Nouvelliste — Dozens Dead in Latest Gang Massacre in Kenscoff (Aug. 2026)", LN + "271251/dozens-dead-in-latest-gang-massacre-in-kenscoff"),
  capital70AP: art("press-intl", "AP — Gang coalition unleashes violent new attack on farming community in Haiti (Aug. 2026)", "https://www.ajc.com/news/2026/08/gang-coalition-unleashes-violent-new-attack-on-farming-community-in-haiti/"),
  gressier2026LN: art("press-ht", "Le Nouvelliste — Three dead recorded in an armed attack in Gressier (Aug. 2026)", LN + "271076/three-dead-recorded-in-an-armed-attack-in-gressier"),
  jeanDenisLN: art("press-ht", "Le Nouvelliste — Residents Describe Deadly “Gran Grif” Gang Attack in Jean-Denis (March 2026)", LN + "265845/residents-describe-deadly-gran-grif-gang-attack-in-jean-denis"),
  jeanDenisNPR: art("press-intl", "NPR (AP) — Central Haitian town descends into fire and bloodshed from gang warfare (March 2026)", "https://www.npr.org/2026/03/30/g-s1-115707/central-haitian-town-gang-warfare"),
  laChapelle2026Relief: art("press-ht", "Le Relief Haïti — The toll of the gang attack in La Chapelle: 6 dead, 8,890 displaced (2026)", "https://www.lereliefhaiti.com/en/articles/the-toll-of-the-gang-attack-in-la-chapelle-6-dead-8890-displaced"),
  lestere2026LN: art("press-ht", "Le Nouvelliste — Haitian National Police Steps Up Operations in L'Estère and Dessalines (2026)", LN + "267522/haitian-national-police-steps-up-operations-in-lestere-and-dessalines"),
  centre2026GV: art("press-indep", "Global Voices — Haiti's security crisis forces displacement and relocation (Aug. 2026)", "https://globalvoices.org/2026/08/29/haitis-security-crisis-forces-displacement-and-relocation/"),
  displaced2026Reuters: art("press-intl", "Reuters — Nearly 1.5 million displaced in Haiti as violence spreads (Sept. 2026)", "https://theprint.in/world/nearly-1-5-million-displaced-in-haiti-as-violence-spreads-un-says/3053711/"),
  salvadorAFP: art("press-intl", "Latin Times (AFP) — El Salvador troops in Haiti gang operations (2026)", "https://www.latintimes.com/haiti-el-salvador-troops-gang-operations-601464"),
  // Frise : événements de référence
  laSalineAP: art("press-intl", "AP — Men dressed as police massacred civilians in Haiti, witnesses say (2018)", "https://www.pbs.org/newshour/world/men-dressed-as-police-massacred-civilians-in-haiti-witnesses-say"),
  moiseAP: art("press-intl", "AP — Haiti's President Jovenel Moïse assassinated at home (7 July 2021)", "https://www.pbs.org/newshour/world/haitis-president-jovenel-moise-assassinated-at-home-per-official"),
  senateAP: art("press-intl", "AP — Political vacuum in Haiti deepens as senators' terms expire (Jan. 2023)", "https://www.ksat.com/news/world/2023/01/10/political-vacuum-in-haiti-deepens-as-senators-terms-expire/"),
  prisonsAP: art("press-intl", "AP — Haiti orders curfew after armed gangs overran two prisons, releasing thousands of inmates (March 2024)", "https://www.pbs.org/newshour/world/haiti-orders-curfew-after-armed-gangs-overran-two-prisons-releasing-thousands-of-inmates"),
  kenyaAJ: art("press-intl", "Al Jazeera — Kenyan police contingent arrives in Haiti (25 June 2024)", "https://www.aljazeera.com/news/2024/6/25/kenyan-police-contingent-arrives-in-haiti-as-protests-roil-nairobi"),
  ftoAJ: art("press-intl", "Al Jazeera — Trump administration designates two Haitian gangs as “terrorist groups” (2 May 2025)", "https://www.aljazeera.com/news/2025/5/2/trump-administration-designates-two-haitian-gangs-as-terrorist-groups"),
  gsfAP: art("press-intl", "AP — A much larger force authorised to fight gangs in Haiti (30 Sept. 2025)", "https://jamaica-gleaner.com/article/world-news/20251001/un-authorises-much-larger-force-fight-gangs-haiti"),
  kenscoffFireLN: art("press-ht", "Le Nouvelliste — Kenscoff Under Gang Fire (Jan. 2025)", LN + "252833/kenscoff-under-gang-fire"),
};

/* ---------- Groupes ---------- */

const KIDNAPPING: L = { ht: "Kidnapin pou ranson", fr: "Enlèvements contre rançon", en: "Kidnapping for ransom" };
const US_FTO: L = {
  ht: "Etazini klase l òganizasyon teworis (me 2025)",
  fr: "Classé organisation terroriste par les États-Unis (mai 2025)",
  en: "Designated a terrorist organisation by the United States (May 2025)",
};

export const GROUPS: Group[] = [
  {
    id: "viv-ansanm",
    name: "Viv Ansanm",
    kind: "coalition",
    area: {
      ht: "Zòn metwopoliten Pòtoprens ak wout ki antoure l",
      fr: "Zone métropolitaine de Port-au-Prince et routes alentour",
      en: "Port-au-Prince metropolitan area and surrounding roads",
    },
    leader: {
      name: "Jimmy Chérizier « Barbecue »",
      role: { ht: "pòtpawòl", fr: "porte-parole", en: "spokesperson" },
      sources: [S.cherizierIC, S.cherizierAJ],
    },
    modusOperandi: [
      {
        ht: "Atak òganize sou komisarya, prizon ak bilding leta",
        fr: "Attaques coordonnées contre des commissariats, des prisons et des bâtiments publics",
        en: "Coordinated attacks on police stations, prisons and public buildings",
      },
      KIDNAPPING,
      {
        ht: "Fè pasaje ak machandiz peye sou gwo wout ki antre nan kapital la",
        fr: "Racket des voyageurs et des marchandises sur les grands axes vers la capitale",
        en: "Extortion of travellers and goods on the main road axes into the capital",
      },
    ],
    designations: [US_FTO],
    sources: [S.cherizierIC, S.mirebalaisAP, S.laChapelleLN],
    verified: true,
  },
  {
    id: "g9",
    name: "G9 an Fanmi e Alye",
    kind: "coalition",
    area: {
      ht: "Anba Delma, Bèlè, Lasalin, yon pati Site Solèy",
      fr: "Bas de Delmas, Bel-Air, La Saline, une partie de Cité Soleil",
      en: "Lower Delmas, Bel Air, La Saline, parts of Cité Soleil",
    },
    leader: { name: "Jimmy Chérizier « Barbecue »", sources: [S.cherizierAJ, S.cherizierIC] },
    modusOperandi: [
      {
        ht: "Kontwole katye ki gen anpil moun",
        fr: "Contrôle territorial de quartiers densément peuplés",
        en: "Territorial control of dense neighbourhoods",
      },
    ],
    designations: [
      { ht: "Manm Viv Ansanm depi 2023", fr: "Membre de Viv Ansanm depuis 2023", en: "Member of Viv Ansanm since 2023" },
    ],
    sources: [S.cherizierAJ, S.citeSoleilAP],
    verified: true,
  },
  {
    id: "g-pep",
    name: "G-Pèp",
    kind: "coalition",
    area: {
      ht: "Brooklyn ak lòt pati Site Solèy",
      fr: "Brooklyn et d'autres parties de Cité Soleil",
      en: "Brooklyn and other parts of Cité Soleil",
    },
    modusOperandi: [
      {
        ht: "Konkiran G9 pou Site Solèy (batay mòtèl an jiyè 2022)",
        fr: "Rival du G9 pour Cité Soleil (affrontements meurtriers en juillet 2022)",
        en: "G9's rival for Cité Soleil (deadly clashes in July 2022)",
      },
    ],
    designations: [],
    sources: [S.citeSoleilAP],
    verified: true,
  },
  {
    id: "400-mawozo",
    name: "400 Mawozo",
    kind: "gang",
    area: same("Croix-des-Bouquets, Ganthier"),
    leader: { name: "Wilson Joseph « Lanmò San Jou »", sources: [S.lanmoAP, S.lanmoHL] },
    modusOperandi: [
      {
        ht: "Kidnapin an mas, tankou 17 misyonè an 2021",
        fr: "Enlèvements de masse, dont 17 missionnaires en 2021",
        en: "Mass kidnappings, including 17 missionaries in 2021",
      },
      {
        ht: "Bloke epi fòtifye kèk pati Wout Nasyonal 3 (RN3)",
        fr: "Blocage et fortification de tronçons de la route nationale 3 (RN3)",
        en: "Blocking and fortifying sections of National Road 3 (RN3)",
      },
    ],
    designations: [],
    sources: [S.missionariesAP, S.croixHL],
    verified: true,
  },
  {
    id: "5-segonn",
    name: "5 Segonn (5 Segond)",
    kind: "gang",
    area: { ht: "Vilaj de Dye (Pòtoprens)", fr: "Village de Dieu (Port-au-Prince)", en: "Village de Dieu (Port-au-Prince)" },
    leader: { name: "Johnson André « Izo »", sources: [S.izoLN, S.izoIC] },
    modusOperandi: [
      KIDNAPPING,
      {
        ht: "Kontwole wout ki mennen nan Sid (RN2)",
        fr: "Contrôle de la route vers le Sud (RN2)",
        en: "Control of the road to the South (RN2)",
      },
    ],
    designations: [],
    sources: [S.izoIC, S.izoLN],
    verified: true,
  },
  {
    id: "grand-ravine",
    name: "Grand Ravine",
    kind: "gang",
    area: {
      ht: "Matisan, sòti sid Pòtoprens, Kafou ak Gresye",
      fr: "Martissant, sortie sud de Port-au-Prince, Carrefour et Gressier",
      en: "Martissant, the southern exit of Port-au-Prince, Carrefour and Gressier",
    },
    leader: { name: "Renel Destina « Ti Lapli »", sources: [S.tiLapliHL] },
    modusOperandi: [
      KIDNAPPING,
      {
        ht: "Selil li yo (Ti Bwa, 103 Zonbi) pran Kafou ak Gresye",
        fr: "Ses cellules (Ti Bois, 103 Zombies) ont pris Carrefour et Gressier",
        en: "Its cells (Ti Bois, 103 Zombies) took Carrefour and Gressier",
      },
    ],
    designations: [],
    sources: [S.tiLapliHL, S.gressierLN],
    verified: true,
  },
  {
    id: "kraze-barye",
    name: "Kraze Baryè",
    kind: "gang",
    area: {
      ht: "Tabarre, Tòsèl ak Pènye",
      fr: "Tabarre, Torcel et Pernier",
      en: "Tabarre, Torcel and Pernier",
    },
    leader: { name: "Vitel'Homme Innocent", sources: [S.vitelLN, S.vitelHL] },
    modusOperandi: [
      KIDNAPPING,
      {
        ht: "Masak nan katye rezidansyèl (Pènye)",
        fr: "Massacres dans des quartiers résidentiels (Pernier)",
        en: "Massacres in residential neighbourhoods (Pernier)",
      },
    ],
    designations: [],
    sources: [S.vitelLN, S.pernierLN],
    verified: true,
  },
  {
    id: "gran-grif",
    name: "Gran Grif",
    kind: "gang",
    area: { ht: "Ba Atibonit (baz nan Savien)", fr: "Basse-Artibonite (fief à Savien)", en: "Lower Artibonite (based in Savien)" },
    leader: { name: "Luckson Elan", sources: [S.elanHL, S.pontSondeAJ] },
    modusOperandi: [
      {
        ht: "Masak sou sivil (Pon Sonde, oktòb 2024)",
        fr: "Massacres de civils (Pont-Sondé, octobre 2024)",
        en: "Massacres of civilians (Pont-Sondé, October 2024)",
      },
      {
        ht: "Atak sou kominote kiltivatè yo, ki fòse moun kite tè yo",
        fr: "Attaques contre les communautés agricoles, qui chassent les paysans de leurs terres",
        en: "Attacks on farming communities, forcing people off their land",
      },
    ],
    designations: [US_FTO],
    sources: [S.pontSondeAP, S.prevalLN],
    verified: true,
  },
  {
    id: "talibans-mawozo",
    name: "Taliban (Kanaan / Canaan)",
    kind: "gang",
    area: {
      ht: "Kanaan ; La Chapelle ak Sant depi 2025",
      fr: "Canaan ; La Chapelle et le Centre depuis 2025",
      en: "Canaan; La Chapelle and the Centre since 2025",
    },
    modusOperandi: [
      {
        ht: "Anvayi komin nan Atibonit ak nan Sant ak alye l yo nan Viv Ansanm",
        fr: "Invasions de communes de l'Artibonite et du Centre avec ses alliés de Viv Ansanm",
        en: "Invading communes in the Artibonite and the Centre with its Viv Ansanm allies",
      },
    ],
    designations: [],
    sources: [S.verrettesLN, S.laChapelleLN],
    verified: true,
  },
  {
    id: "chen-mechan",
    name: "Chen Mechan",
    kind: "gang",
    area: {
      ht: "Plèn Kildesak (Kwadebouke)",
      fr: "Plaine du Cul-de-Sac (Croix-des-Bouquets)",
      en: "Cul-de-Sac plain (Croix-des-Bouquets)",
    },
    modusOperandi: [
      {
        ht: "Rival 400 Mawozo ; an 2026, li goumen ansanm ak alye l yo kont gang Pierre VI ak Tè Nwa (Site Solèy)",
        fr: "Rival de 400 Mawozo ; en 2026, il combat avec ses alliés les gangs de Pierre VI et Terre Noire (Cité Soleil)",
        en: "400 Mawozo's rival; in 2026 it fights, with its allies, the Pierre VI and Terre Noire gangs (Cité Soleil)",
      },
    ],
    designations: [],
    sources: [S.culDeSacLN, S.lanmoAP],
    verified: true,
  },
  {
    id: "kokorat-san-ras",
    name: "Kokorat San Ras",
    kind: "gang",
    area: {
      ht: "Lestè ak Gwomòn (Atibonit)",
      fr: "L'Estère et Gros-Morne (Artibonite)",
      en: "L'Estère and Gros-Morne (Artibonite)",
    },
    modusOperandi: [
      {
        ht: "Atak repete sou bouk yo, kay boule",
        fr: "Attaques répétées contre les localités, maisons incendiées",
        en: "Repeated attacks on localities, houses burned",
      },
      {
        ht: "Detwi jaden ak enfrastrikti agrikòl",
        fr: "Destruction méthodique des cultures et des infrastructures agricoles",
        en: "Methodical destruction of crops and farm infrastructure",
      },
    ],
    designations: [],
    sources: [S.lestereLN, S.lestereAgriLN, S.kokoratHL],
    verified: true,
  },
];

/* ---------- Périodes et zones ---------- */

export const PERIODS: Period[] = [
  {
    id: "2021",
    label: "2021",
    defaultSince: "2021-10",
    asOf: { ht: "Fen 2021", fr: "Fin 2021", en: "End of 2021" },
    summary: {
      ht: "Gang yo kenbe katye ki gen anpil moun nan kapital la (Matisan, Site Solèy) ak plèn ki sou bò lès la. Depi 1ye jen 2021, leta pèdi kontwòl wout Sid la nan Matisan.",
      fr: "Les gangs tiennent des quartiers denses de la capitale (Martissant, Cité Soleil) et la plaine à l'est. Depuis le 1er juin 2021, l'État a perdu le contrôle de la route du Sud à Martissant.",
      en: "Gangs hold dense neighbourhoods of the capital (Martissant, Cité Soleil) and the eastern plain. Since 1 June 2021, the State has lost control of the southern road at Martissant.",
    },
    zones: [
      {
        pcode: "HT0111",
        since: "2021-06-01",
        status: "influence",
        groups: ["grand-ravine", "5-segonn"],
        note: {
          ht: "Lagè gang nan Matisan depi 1ye jen 2021 : santèn moun kouri, wout Sid la koupe. Rès komin nan pa ladan.",
          fr: "Guerre des gangs à Martissant depuis le 1er juin 2021 : des centaines d'habitants fuient, la route du Sud est coupée. Pas le reste de la commune.",
          en: "Gang war in Martissant since 1 June 2021: hundreds flee, the southern road is cut. Not the rest of the commune.",
        },
        sources: [S.martissantLN, S.martissantHL],
        verified: true,
      },
      {
        pcode: "HT0117",
        since: "2020-06",
        status: "contested",
        groups: ["g9", "g-pep"],
        note: {
          ht: "G9 ak G-Pèp ap goumen pou Site Solèy ; batay la vin pi mòtèl an jiyè 2022.",
          fr: "Le G9 et le G-Pèp se disputent Cité Soleil ; les affrontements culminent en juillet 2022.",
          en: "G9 and G-Pèp fight over Cité Soleil; the clashes peak in July 2022.",
        },
        sources: [S.citeSoleilAP],
        verified: true,
      },
      {
        pcode: "HT0131",
        since: "2021-10-16",
        status: "influence",
        groups: ["400-mawozo"],
        note: {
          ht: "Teritwa 400 Mawozo, gang ki konnen pou kidnapin an mas.",
          fr: "Territoire de 400 Mawozo, gang connu pour ses enlèvements de masse.",
          en: "400 Mawozo territory, a gang known for mass kidnappings.",
        },
        sources: [S.missionariesAP],
        verified: true,
      },
      {
        pcode: "HT0133",
        since: "2021-10-16",
        status: "influence",
        groups: ["400-mawozo"],
        note: {
          ht: "400 Mawozo kidnape 17 misyonè isit la 16 oktòb 2021.",
          fr: "400 Mawozo y enlève 17 missionnaires le 16 octobre 2021.",
          en: "400 Mawozo kidnaps 17 missionaries here on 16 October 2021.",
        },
        sources: [S.missionariesAP],
        verified: true,
      },
    ],
  },
  {
    id: "2025",
    label: "2025",
    defaultSince: "2025-07-03",
    asOf: { ht: "Fen 2025", fr: "Fin 2025", en: "End of 2025" },
    summary: {
      ht: "Gang yo kontwole prèske tout kapital la, men lapolis kòmanse reprann kèk katye anba lavil. Gang yo gaye andeyò kapital la (Kenskòf, Gresye, Akayè) ak nan Atibonit ak nan Sant, kote Mibalè tonbe anba kontwòl yo.",
      fr: "Les gangs contrôlent presque toute la capitale, mais la police commence à reprendre des quartiers du centre-ville. Ils s'étendent en périphérie (Kenscoff, Gressier, Arcahaie), dans l'Artibonite et dans le Centre, où Mirebalais tombe sous leur contrôle.",
      en: "Gangs control almost all of the capital, but police start retaking downtown neighbourhoods. They expand on the outskirts (Kenscoff, Gressier, Arcahaie), in the Artibonite and in the Centre, where Mirebalais falls under their control.",
    },
    zones: [
      // Ouest
      {
        pcode: "HT0111",
        status: "control",
        groups: ["grand-ravine", "5-segonn", "viv-ansanm"],
        note: {
          ht: "Prèske tout kapital la anba kontwòl gang (AP, jiyè 2025). Lapolis kòmanse reprann kèk katye anba lavil nan fen ane a.",
          fr: "La capitale est presque entièrement sous contrôle des gangs (AP, juillet 2025). La police commence à reprendre des quartiers du centre-ville en fin d'année.",
          en: "The capital is almost entirely under gang control (AP, July 2025). Police start retaking downtown neighbourhoods late in the year.",
        },
        sources: [S.capitalAP, S.policeStrikeLN, S.downtownHL],
        verified: true,
      },
      {
        pcode: "HT0117",
        status: "control",
        groups: ["viv-ansanm", "g-pep"],
        note: {
          ht: "Komin nan fè pati kapital la ki prèske tout anba kontwòl gang.",
          fr: "La commune fait partie de la capitale, presque entièrement sous contrôle des gangs.",
          en: "Part of the capital, which is almost entirely under gang control.",
        },
        sources: [S.capitalAP],
        verified: true,
      },
      {
        pcode: "HT0112",
        status: "contested",
        groups: ["g9", "viv-ansanm"],
        note: {
          ht: "Anba Delma anba gang ; lapolis ap mennen operasyon nan Delma an 2025.",
          fr: "Le bas de Delmas est tenu par les gangs ; la police y mène des opérations en 2025.",
          en: "Lower Delmas is held by gangs; police carry out operations there in 2025.",
        },
        sources: [S.policeStrikeLN, S.capitalAP],
        verified: true,
      },
      {
        pcode: "HT0131",
        status: "control",
        groups: ["400-mawozo", "talibans-mawozo"],
        note: {
          ht: "400 Mawozo bloke epi fòtifye kèk pati RN3 ; lapolis lanse yon operasyon kont gang lan an novanm 2025.",
          fr: "400 Mawozo a bloqué et fortifié des tronçons de la RN3 ; la police lance une opération contre le gang en novembre 2025.",
          en: "400 Mawozo blocked and fortified sections of the RN3; police launch an operation against the gang in November 2025.",
        },
        sources: [S.croixHL, S.capitalAP],
        verified: true,
      },
      {
        pcode: "HT0118",
        since: "2025-07-08",
        status: "influence",
        groups: ["kraze-barye"],
        note: {
          ht: "Kraze Baryè gen baz li nan Tòsèl ; lapolis atake baz la an jiyè 2025.",
          fr: "Kraze Baryè a son fief à Torcel ; la police l'a attaqué en juillet 2025.",
          en: "Kraze Baryè is based in Torcel; police attacked its stronghold in July 2025.",
        },
        sources: [S.torcelLN, S.tabarreLN],
        verified: true,
      },
      {
        pcode: "HT0114",
        since: "2025-05-29",
        status: "influence",
        groups: ["kraze-barye"],
        note: {
          ht: "Kraze Baryè fè masak nan Pènye ; lapolis atake baz gang lan la an 2025.",
          fr: "Kraze Baryè a commis un massacre à Pernier ; la police a attaqué le fief du gang en 2025.",
          en: "Kraze Baryè committed a massacre in Pernier; police attacked the gang's stronghold in 2025.",
        },
        sources: [S.pernierLN, S.petionvilleHL],
        verified: true,
      },
      {
        pcode: "HT0115",
        since: "2025-01-27",
        status: "contested",
        groups: ["viv-ansanm", "grand-ravine", "5-segonn"],
        note: {
          ht: "Atak depi 27 janvye 2025 ; sou-komisarya Fursi boule nan mwa jiyè. Majistra a di prèske 75 % Kenskòf anba kontwòl gang.",
          fr: "Attaques depuis le 27 janvier 2025 ; le sous-commissariat de Furcy incendié en juillet. Le maire estime que près de 75 % de Kenscoff est sous contrôle des gangs.",
          en: "Attacks since 27 January 2025; the Furcy police sub-station burned in July. The mayor estimates nearly 75% of Kenscoff is under gang control.",
        },
        sources: [S.kenscoffLN, S.furcyLN, S.kenscoffMayorLN],
        verified: true,
      },
      {
        pcode: "HT0113",
        since: "2024-06",
        status: "control",
        groups: ["grand-ravine"],
        note: {
          ht: "Gang yo vide komisarya yo an 2024 ; an 2025, chèf gang Krisla ka fèmen tout komin nan lè l mande grèv.",
          fr: "Les gangs ont vidé les commissariats en 2024 ; en 2025, le chef de gang Krisla peut paralyser la commune en décrétant une grève.",
          en: "Gangs emptied the police stations in 2024; in 2025, gang leader Krisla can shut the commune down by calling a strike.",
        },
        sources: [S.carrefourLN, S.carrefourStationsLN, S.carrefourAyibo],
        verified: true,
      },
      {
        pcode: "HT0116",
        since: "2024-05",
        status: "control",
        groups: ["grand-ravine"],
        note: {
          ht: "Gang yo kontwole « 75 % Gresye » ; wout Sid la toujou fèmen.",
          fr: "Les gangs contrôlent « 75 % de Gressier » ; la route du Sud reste coupée.",
          en: "Gangs control “75% of Gressier”; the southern road remains cut.",
        },
        sources: [S.gressierLN, S.gressierOffensiveLN, S.gressierAP],
        verified: true,
      },
      {
        pcode: "HT0121",
        since: "2025-03",
        status: "contested",
        groups: ["grand-ravine"],
        note: {
          ht: "Depi yo anvayi Gresye an me 2024, gang yo ap eseye avanse sou Leyogàn.",
          fr: "Depuis l'invasion de Gressier en mai 2024, les gangs tentent de s'étendre vers Léogâne.",
          en: "Since invading Gressier in May 2024, gangs have repeatedly tried to push into Léogâne.",
        },
        sources: [S.gressierOffensiveLN],
        verified: true,
      },
      {
        pcode: "HT0142",
        since: "2025-09-11",
        status: "influence",
        groups: ["viv-ansanm"],
        note: {
          ht: "Gang yo prezan nan Kabare ; masak Labodri (septanm 2025) ta swiv lanmò yon chèf gang lokal.",
          fr: "Les gangs sont présents à Cabaret ; le massacre de Labodrie (septembre 2025) aurait suivi la mort d'un chef de gang local.",
          en: "Gangs are present in Cabaret; the Labodrie massacre (September 2025) reportedly followed the killing of a local gang leader.",
        },
        sources: [S.labodrieAP, S.bercyRelief],
        verified: true,
      },
      {
        pcode: "HT0141",
        since: "2025-09-11",
        status: "contested",
        groups: ["viv-ansanm"],
        note: {
          ht: "Omwen 40 moun touye nan Labodri 11 septanm 2025 ; gang yo eseye atake vil Akayè, lapolis ak brigad lokal yo kenbe yo.",
          fr: "Plus de 40 morts à Labodrie le 11 septembre 2025 ; les gangs tentent ensuite d'attaquer Arcahaie, retenus par la police et une brigade locale.",
          en: "More than 40 killed in Labodrie on 11 September 2025; gangs then try to attack Arcahaie, held back by police and a local brigade.",
        },
        sources: [S.labodrieAP, S.labodrieLN, S.labodrieHL],
        verified: true,
      },
      {
        pcode: "HT0133",
        status: "influence",
        groups: ["400-mawozo"],
        note: {
          ht: "Gang yo atake komisarya a epi boule biwo ladwàn yo.",
          fr: "Les gangs ont attaqué le commissariat puis incendié les bureaux de la douane.",
          en: "Gangs attacked the police station, then burned the customs offices.",
        },
        sources: [S.ganthierLN],
        verified: true,
      },
      // Artibonite
      {
        pcode: "HT0542",
        since: "2025-05-20",
        status: "contested",
        groups: ["gran-grif"],
        note: {
          ht: "Gran Grif gen baz li nan Savien. Masak Preval (me 2025) ; gang lan pran Chandèl an oktòb 2025.",
          fr: "Gran Grif a son fief à Savien. Massacre de Préval (mai 2025) ; le gang prend Chandèl en octobre 2025.",
          en: "Gran Grif is based in Savien. Préval massacre (May 2025); the gang takes Chandèl in October 2025.",
        },
        sources: [S.prevalLN, S.granGrifLN, S.chandelLN],
        verified: true,
      },
      {
        pcode: "HT0533",
        since: "2025-06-22",
        status: "control",
        groups: ["talibans-mawozo", "viv-ansanm"],
        note: {
          ht: "Viv Ansanm pran komin nan 22 jen 2025 ; prèske 9 000 moun kouri kite l.",
          fr: "Viv Ansanm s'empare de la commune le 22 juin 2025 ; près de 9 000 habitants fuient.",
          en: "Viv Ansanm seizes the commune on 22 June 2025; nearly 9,000 residents flee.",
        },
        sources: [S.laChapelleLN, S.laChapelleAP, S.laChapelleRelief],
        verified: true,
      },
      {
        pcode: "HT0531",
        since: "2024-10-03",
        status: "contested",
        groups: ["gran-grif"],
        note: {
          ht: "Gran Grif atake Pon Sonde 3 oktòb 2024 : omwen 115 moun mouri dapre yon reskonsab lokal. Nouvo atak sou Pon Sonde nan fen novanm 2025 ; dapre lapolis, mwatye Atibonit anba kontwòl gang.",
          fr: "Gran Grif attaque Pont-Sondé le 3 octobre 2024 : au moins 115 morts selon un responsable local. Nouvelles attaques sur Pont-Sondé fin novembre 2025 ; selon la police, la moitié de l'Artibonite est sous contrôle des gangs.",
          en: "Gran Grif attacks Pont-Sondé on 3 October 2024: at least 115 killed according to a local official. New attacks on Pont-Sondé in late November 2025; police say half of the Artibonite is under gang control.",
        },
        sources: [S.pontSondeAP, S.pontSondeAJ, S.artiboniteDecAP],
        verified: true,
      },
      {
        pcode: "HT0513",
        since: "2025-09-22",
        status: "control",
        groups: ["kokorat-san-ras"],
        note: {
          ht: "Depi 2019, yon gwo pati Lestè anba kontwòl Kokorat San Ras ; atak repete ak jaden detwi an 2025.",
          fr: "Depuis 2019, une grande partie de L'Estère est contrôlée par Kokorat San Ras ; attaques répétées et cultures détruites en 2025.",
          en: "Since 2019, much of L'Estère has been controlled by Kokorat San Ras; repeated attacks and crops destroyed in 2025.",
        },
        sources: [S.lestereLN, S.lestereAgriLN],
        verified: true,
      },
      {
        pcode: "HT0521",
        since: "2025-01-18",
        status: "contested",
        groups: ["kokorat-san-ras"],
        note: {
          ht: "Omwen 11 moun touye nan Grepen ak Kanpèch an janvye 2025.",
          fr: "Au moins 11 morts à Grépin et Campêche en janvier 2025.",
          en: "At least 11 killed in Grépin and Campêche in January 2025.",
        },
        sources: [S.grosMorneHL, S.kokoratHL],
        verified: true,
      },
      {
        pcode: "HT0532",
        since: "2025-09-04",
        status: "contested",
        groups: ["gran-grif", "talibans-mawozo"],
        note: {
          ht: "Verèt ap repouse atak repete ; batay ant lapolis ak Gran Grif nan Liancourt an septanm 2025.",
          fr: "Verrettes repousse des attaques répétées ; affrontements entre la police et Gran Grif à Liancourt en septembre 2025.",
          en: "Verrettes repels repeated attacks; clashes between police and Gran Grif in Liancourt in September 2025.",
        },
        sources: [S.verrettesLN, S.liancourtLN],
        verified: true,
      },
      // Centre
      {
        pcode: "HT0621",
        since: "2025-03-31",
        status: "control",
        groups: ["viv-ansanm"],
        note: {
          ht: "Gang yo pran vil la 31 mas 2025, boule komisarya a epi louvri prizon an : plis pase 500 prizonye sove.",
          fr: "Les gangs prennent la ville le 31 mars 2025, incendient le commissariat et ouvrent la prison : plus de 500 détenus s'évadent.",
          en: "Gangs take the town on 31 March 2025, burn the police station and open the prison: more than 500 inmates escape.",
        },
        sources: [S.mirebalaisAP, S.mirebalaisLN, S.mirebalaisHL, S.centreSixMonthsLN],
        verified: true,
      },
      {
        pcode: "HT0622",
        since: "2025-04-03",
        status: "control",
        groups: ["viv-ansanm"],
        note: {
          ht: "Gang yo pran kontwòl Sodo nan kòmansman avril 2025 ; prèske 6 000 moun deplase ant Sodo ak Mibalè.",
          fr: "Les gangs prennent le contrôle de Saut-d'Eau début avril 2025 ; près de 6 000 déplacés entre Saut-d'Eau et Mirebalais.",
          en: "Gangs take control of Saut-d'Eau in early April 2025; nearly 6,000 displaced between Saut-d'Eau and Mirebalais.",
        },
        sources: [S.sautDeauLN, S.centreSixMonthsLN, S.sautDeauRelief],
        verified: true,
      },
      {
        pcode: "HT0631",
        status: "unclear",
        groups: ["viv-ansanm"],
        note: {
          ht: "Viv Ansanm atake nan Platosantral ; sitiyasyon komin nan poko klè.",
          fr: "Viv Ansanm frappe sur le Plateau central ; la situation de la commune reste à préciser.",
          en: "Viv Ansanm strikes on the Central Plateau; the commune's situation is still unclear.",
        },
        sources: [S.centralPlateauLN],
        verified: true,
      },
    ],
  },
  {
    id: "2026",
    label: "2026",
    defaultSince: "2026-06",
    asOf: { ht: "Novanm 2026", fr: "Novembre 2026", en: "November 2026" },
    summary: {
      ht: "Avèk ranfò plis pase 2 000 sòlda salvadoryen, fòs sekirite yo reprann kèk pati kapital la (anba lavil, Kafou Ayewopò, estad nasyonal) epi atake Matisan. Men gang yo ap goumen ant yo nan Site Solèy ak Plèn Kildesak, masak kontinye (Jean-Denis, Kenskòf), epi Mibalè, Sodo ak La Chapelle toujou okipe.",
      fr: "Renforcées par plus de 2 000 soldats salvadoriens, les forces de sécurité reprennent des parties de la capitale (centre-ville, carrefour de l'Aéroport, stade national) et lancent l'offensive sur Martissant. Mais les gangs s'affrontent à Cité Soleil et dans la plaine du Cul-de-Sac, les massacres continuent (Jean-Denis, Kenscoff), et Mirebalais, Saut-d'Eau et La Chapelle restent occupées.",
      en: "Reinforced by more than 2,000 Salvadoran soldiers, security forces retake parts of the capital (downtown, Airport Crossroads, national stadium) and launch an offensive on Martissant. But gangs fight each other in Cité Soleil and the Cul-de-Sac plain, massacres continue (Jean-Denis, Kenscoff), and Mirebalais, Saut-d'Eau and La Chapelle remain occupied.",
    },
    zones: [
      {
        pcode: "HT0111",
        since: "2026-01-15",
        status: "contested",
        groups: ["grand-ravine","5-segonn","viv-ansanm"],
        note: {
          ht: "Lapolis ak GSF ap reprann anba lavil depi kòmansman 2026 ; yo reprann estad nasyonal la 12 novanm epi lanse yon ofansiv sou Matisan 19 novanm.",
          fr: "La police et la GSF reprennent le centre-ville depuis début 2026 ; le stade national est repris le 12 novembre et une offensive est lancée sur Martissant le 19 novembre.",
          en: "Police and the GSF have been retaking downtown since early 2026; the national stadium is retaken on 12 November and an offensive on Martissant starts on 19 November.",
        },
        sources: [S.downtownLN, S.frgPatrolsLN, S.stadiumAFP, S.martissantAP],
        verified: true,
      },
      {
        pcode: "HT0112",
        since: "2026-02-07",
        status: "contested",
        groups: ["g9","viv-ansanm"],
        note: {
          ht: "Lapolis reprann Kafou Ayewopò (fevriye 2026) epi atake baz Chérizier nan Delma 6 ; aktivite ap retounen dousman anba Delma.",
          fr: "La police reprend le carrefour de l'Aéroport (février 2026) et attaque le fief de Chérizier à Delmas 6 ; l'activité reprend lentement dans le bas de Delmas.",
          en: "Police retake the Airport Crossroads (February 2026) and attack Chérizier's stronghold in Delmas 6; activity slowly returns to lower Delmas.",
        },
        sources: [S.capital90, S.delmas6LN, S.lowerDelmasLN],
        verified: true,
      },
      {
        pcode: "HT0117",
        since: "2026-04-20",
        status: "contested",
        groups: ["viv-ansanm","400-mawozo","talibans-mawozo","chen-mechan"],
        note: {
          ht: "Lagè ant gang : Chen Mechan, Taliban (Kanaan) ak 400 Mawozo kont gang Pierre VI ak Tè Nwa ; plizyè santèn moun kouri an me 2026.",
          fr: "Guerre entre gangs : Chen Mechan, Taliban (Canaan) et 400 Mawozo contre les gangs de Pierre VI et Terre Noire ; des centaines d'habitants fuient en mai 2026.",
          en: "Gang war: Chen Mechan, the Taliban (Canaan) and 400 Mawozo against the Pierre VI and Terre Noire gangs; hundreds of residents flee in May 2026.",
        },
        sources: [S.culDeSacLN, S.citeSoleil2026AP],
        verified: true,
      },
      {
        pcode: "HT0131",
        since: "2026-05-11",
        status: "contested",
        groups: ["400-mawozo","chen-mechan","talibans-mawozo"],
        note: {
          ht: "Batay ant gang nan Plèn Kildesak ; lapolis voye blende ak inite espesyal (me 2026), epi li reprann Kafou Marasa ak pon Tabarre an novanm 2026.",
          fr: "Affrontements entre gangs dans la plaine du Cul-de-Sac ; la police y déploie blindés et unités d'élite (mai 2026), puis reprend Carrefour Marassa et le pont de Tabarre en novembre 2026.",
          en: "Gang clashes in the Cul-de-Sac plain; police deploy armoured vehicles and elite units (May 2026), then retake Carrefour Marassa and the Tabarre bridge in November 2026.",
        },
        sources: [S.culDeSacLN, S.culDeSacPoliceLN, S.croix2026LN, S.tabarreBridgeRelief],
        verified: true,
      },
      {
        pcode: "HT0118",
        since: "2026-11-10",
        status: "contested",
        groups: ["kraze-barye"],
        note: {
          ht: "Kraze Baryè toujou gen baz nan Tòsèl ; lapolis reprann pon Tabarre an novanm 2026.",
          fr: "Kraze Baryè garde des fiefs à Torcel ; la police reprend le pont de Tabarre en novembre 2026.",
          en: "Kraze Baryè still holds strongholds in Torcel; police retake the Tabarre bridge in November 2026.",
        },
        sources: [S.torcelPernierRelief, S.tabarreBridgeRelief],
        verified: true,
      },
      {
        pcode: "HT0114",
        since: "2026-04-24",
        status: "influence",
        groups: ["kraze-barye"],
        note: {
          ht: "Lapolis toujou ap atake baz gang nan Pènye (avril 2026).",
          fr: "La police continue de viser les fiefs du gang à Pernier (avril 2026).",
          en: "Police keep targeting the gang's strongholds in Pernier (April 2026).",
        },
        sources: [S.torcelPernierRelief],
        verified: true,
      },
      {
        pcode: "HT0115",
        since: "2026-08-24",
        status: "contested",
        groups: ["viv-ansanm","5-segonn"],
        note: {
          ht: "Pi gwo atak la : nan nwit 23 pou 24 out 2026, omwen 47 moun touye ak plis pase 50 kidnape.",
          fr: "Pire attaque à ce jour : dans la nuit du 23 au 24 août 2026, au moins 47 morts et plus de 50 personnes enlevées.",
          en: "Worst attack yet: on the night of 23–24 August 2026, at least 47 killed and more than 50 kidnapped.",
        },
        sources: [S.kenscoff2026AP, S.kenscoff2026LN],
        verified: true,
      },
      {
        pcode: "HT0116",
        since: "2026-08-20",
        status: "unclear",
        groups: ["grand-ravine"],
        note: {
          ht: "Atak kontinye (3 moun mouri an out 2026) ; laprès 2026 pa dekri kijan kontwòl gang yo ye.",
          fr: "Les attaques continuent (3 morts en août 2026) ; la presse de 2026 ne décrit pas l'étendue du contrôle des gangs.",
          en: "Attacks continue (3 killed in August 2026); 2026 press reports do not describe the extent of gang control.",
        },
        sources: [S.gressier2026LN],
        verified: true,
      },
      {
        pcode: "HT0542",
        since: "2026-03-29",
        status: "contested",
        groups: ["gran-grif"],
        note: {
          ht: "Masak Jean-Denis nan nwit 28 pou 29 mas 2026 : lapolis di 16 mouri, aktivis di plis ; kay boule, plizyè milye moun kouri.",
          fr: "Massacre de Jean-Denis dans la nuit du 28 au 29 mars 2026 : 16 morts selon la police, bien plus selon des militants ; maisons incendiées, des milliers de déplacés.",
          en: "Jean-Denis massacre on the night of 28–29 March 2026: 16 dead according to police, far more according to activists; houses burned, thousands displaced.",
        },
        sources: [S.jeanDenisLN, S.jeanDenisNPR],
        verified: true,
      },
      {
        pcode: "HT0533",
        since: "2026-04-20",
        status: "control",
        groups: ["talibans-mawozo","viv-ansanm"],
        note: {
          ht: "Nouvo atak an 2026 : 6 mouri, 8 890 moun deplase ; komin nan prèske vid.",
          fr: "Nouvelle attaque en 2026 : 6 morts et 8 890 déplacés ; la commune s'est presque entièrement vidée.",
          en: "New attack in 2026: 6 dead and 8,890 displaced; the commune has almost entirely emptied.",
        },
        sources: [S.laChapelle2026Relief],
        verified: true,
      },
      {
        pcode: "HT0513",
        since: "2026-06",
        status: "contested",
        groups: ["kokorat-san-ras"],
        note: {
          ht: "Lapolis ogmante operasyon li nan Lestè ak Desalin an 2026.",
          fr: "La police intensifie ses opérations à L'Estère et Dessalines en 2026.",
          en: "Police step up operations in L'Estère and Dessalines in 2026.",
        },
        sources: [S.lestere2026LN],
        verified: true,
      },
      {
        pcode: "HT0541",
        since: "2026-06",
        status: "contested",
        groups: ["kokorat-san-ras"],
        note: {
          ht: "Lapolis ogmante operasyon li nan Lestè ak Desalin an 2026.",
          fr: "La police intensifie ses opérations à L'Estère et Dessalines en 2026.",
          en: "Police step up operations in L'Estère and Dessalines in 2026.",
        },
        sources: [S.lestere2026LN],
        verified: true,
      },
      {
        pcode: "HT0621",
        since: "2026-08-29",
        status: "control",
        groups: ["viv-ansanm"],
        note: {
          ht: "Yon pati Sant la toujou anba gang ki fè moun peye epi mete baraj ilegal (out 2026).",
          fr: "Une partie du Centre reste occupée par des gangs qui rackettent les habitants et tiennent des barrages illégaux (août 2026).",
          en: "Part of the Centre remains occupied by gangs that extort residents and run illegal checkpoints (August 2026).",
        },
        sources: [S.centre2026GV],
        verified: true,
      },
      {
        pcode: "HT0622",
        since: "2026-08-29",
        status: "control",
        groups: ["viv-ansanm"],
        note: {
          ht: "Yon pati Sant la toujou anba gang (out 2026).",
          fr: "Une partie du Centre reste occupée par des gangs (août 2026).",
          en: "Part of the Centre remains occupied by gangs (August 2026).",
        },
        sources: [S.centre2026GV],
        verified: true,
      },
    ],
  },
];

/* ---------- Chronologie ---------- */

export const TIMELINE: TimelineEvent[] = [
  {
    date: { ht: "13 novanm 2018", fr: "13 nov. 2018", en: "13 Nov 2018" },
    sortKey: "2018-11-13",
    title: { ht: "Masak Lasalin (Pòtoprens)", fr: "Massacre de La Saline (Port-au-Prince)", en: "La Saline massacre (Port-au-Prince)" },
    kind: "violence",
    source: S.laSalineAP,
    pcode: "HT0111",
    verified: true,
  },
  {
    date: { ht: "2020", fr: "2020", en: "2020" },
    sortKey: "2020-06",
    title: {
      ht: "Kowalisyon G9 la fòme ; G-Pèp parèt kòm rival li",
      fr: "Création de la coalition G9 ; le G-Pèp se forme en rival",
      en: "G9 coalition formed; rival G-Pèp emerges",
    },
    kind: "violence",
    source: S.cherizierIC,
    verified: true,
  },
  {
    date: { ht: "1ye jen 2021", fr: "1er juin 2021", en: "1 Jun 2021" },
    sortKey: "2021-06-01",
    title: {
      ht: "Lagè gang nan Matisan : leta pèdi wout Sid la",
      fr: "Guerre des gangs à Martissant : l'État perd la route du Sud",
      en: "Gang war in Martissant: the State loses the southern road",
    },
    kind: "violence",
    source: S.martissantLN,
    pcode: "HT0111",
    verified: true,
  },
  {
    date: { ht: "7 jiyè 2021", fr: "7 juil. 2021", en: "7 Jul 2021" },
    sortKey: "2021-07-07",
    title: {
      ht: "Yo asasinen prezidan Jovenel Moïse",
      fr: "Assassinat du président Jovenel Moïse",
      en: "President Jovenel Moïse assassinated",
    },
    kind: "politics",
    source: S.moiseAP,
    pcode: "HT0114",
    verified: true,
  },
  {
    date: { ht: "16 oktòb 2021", fr: "16 oct. 2021", en: "16 Oct 2021" },
    sortKey: "2021-10-16",
    title: {
      ht: "400 Mawozo kidnape 17 misyonè nan Gantye",
      fr: "400 Mawozo enlève 17 missionnaires à Ganthier",
      en: "400 Mawozo kidnaps 17 missionaries in Ganthier",
    },
    kind: "violence",
    source: S.missionariesAP,
    pcode: "HT0133",
    verified: true,
  },
  {
    date: { ht: "jiyè 2022", fr: "juil. 2022", en: "Jul 2022" },
    sortKey: "2022-07-12",
    title: {
      ht: "Batay G9 ak G-Pèp nan Site Solèy : plizyè dizèn moun mouri",
      fr: "Affrontements G9 / G-Pèp à Cité Soleil : des dizaines de morts",
      en: "G9 / G-Pèp clashes in Cité Soleil: dozens killed",
    },
    kind: "violence",
    source: S.citeSoleilAP,
    pcode: "HT0117",
    verified: true,
  },
  {
    date: { ht: "janvye 2023", fr: "janv. 2023", en: "Jan 2023" },
    sortKey: "2023-01",
    title: {
      ht: "Ayiti pa gen okenn eli nasyonal ankò",
      fr: "Haïti n'a plus aucun élu national",
      en: "Haiti has no elected national officials left",
    },
    kind: "politics",
    source: S.senateAP,
    verified: true,
  },
  {
    date: { ht: "septanm 2023", fr: "sept. 2023", en: "Sep 2023" },
    sortKey: "2023-09",
    title: {
      ht: "G9 ak G-Pèp fè alyans : Viv Ansanm fèt",
      fr: "Le G9 et le G-Pèp s'allient : naissance de Viv Ansanm",
      en: "G9 and G-Pèp ally: Viv Ansanm is born",
    },
    kind: "violence",
    source: S.cherizierIC,
    verified: true,
  },
  {
    date: { ht: "2 mas 2024", fr: "2 mars 2024", en: "2 Mar 2024" },
    sortKey: "2024-03-02",
    title: {
      ht: "Atak sou de pi gwo prizon yo ; plizyè milye prizonye sove",
      fr: "Attaque des deux plus grandes prisons ; des milliers d'évadés",
      en: "Attack on the two largest prisons; thousands escape",
    },
    kind: "violence",
    source: S.prisonsAP,
    pcode: "HT0111",
    verified: true,
  },
  {
    date: { ht: "25 jen 2024", fr: "25 juin 2024", en: "25 Jun 2024" },
    sortKey: "2024-06-25",
    title: {
      ht: "Premye polisye kenyan yo rive",
      fr: "Arrivée des premiers policiers kényans",
      en: "First Kenyan police officers arrive",
    },
    kind: "security",
    source: S.kenyaAJ,
    verified: true,
  },
  {
    date: { ht: "3 oktòb 2024", fr: "3 oct. 2024", en: "3 Oct 2024" },
    sortKey: "2024-10-03",
    title: {
      ht: "Masak Pon Sonde : omwen 115 moun mouri",
      fr: "Massacre de Pont-Sondé : au moins 115 morts",
      en: "Pont-Sondé massacre: at least 115 killed",
    },
    kind: "violence",
    source: S.pontSondeAP,
    pcode: "HT0531",
    verified: true,
  },
  {
    date: { ht: "27 janvye 2025", fr: "27 janv. 2025", en: "27 Jan 2025" },
    sortKey: "2025-01-27",
    title: { ht: "Atak sou Kenskòf", fr: "Attaques sur Kenscoff", en: "Attacks on Kenscoff" },
    kind: "violence",
    source: S.kenscoffFireLN,
    pcode: "HT0115",
    verified: true,
  },
  {
    date: { ht: "31 mas 2025", fr: "31 mars 2025", en: "31 Mar 2025" },
    sortKey: "2025-03-31",
    title: {
      ht: "Gang yo pran Mibalè ; plis pase 500 prizonye sove",
      fr: "Les gangs prennent Mirebalais ; plus de 500 détenus évadés",
      en: "Gangs take Mirebalais; more than 500 inmates escape",
    },
    kind: "violence",
    source: S.mirebalaisAP,
    pcode: "HT0621",
    verified: true,
  },
  {
    date: { ht: "2 me 2025", fr: "2 mai 2025", en: "2 May 2025" },
    sortKey: "2025-05-02",
    title: {
      ht: "Etazini klase Viv Ansanm ak Gran Grif kòm òganizasyon teworis",
      fr: "Les États-Unis désignent Viv Ansanm et Gran Grif comme organisations terroristes",
      en: "US designates Viv Ansanm and Gran Grif as terrorist organisations",
    },
    kind: "international",
    source: S.ftoAJ,
    verified: true,
  },
  {
    date: { ht: "22 jen 2025", fr: "22 juin 2025", en: "22 Jun 2025" },
    sortKey: "2025-06-22",
    title: {
      ht: "Viv Ansanm pran La Chapelle",
      fr: "Viv Ansanm s'empare de La Chapelle",
      en: "Viv Ansanm seizes La Chapelle",
    },
    kind: "violence",
    source: S.laChapelleLN,
    pcode: "HT0533",
    verified: true,
  },
  {
    date: { ht: "11 septanm 2025", fr: "11 sept. 2025", en: "11 Sep 2025" },
    sortKey: "2025-09-11",
    title: {
      ht: "Masak Labodri : plis pase 40 moun mouri",
      fr: "Massacre de Labodrie : plus de 40 morts",
      en: "Labodrie massacre: more than 40 killed",
    },
    kind: "violence",
    source: S.labodrieAP,
    pcode: "HT0141",
    verified: true,
  },
  {
    date: { ht: "30 septanm 2025", fr: "30 sept. 2025", en: "30 Sep 2025" },
    sortKey: "2025-09-30",
    title: {
      ht: "Kreyasyon Fòs pou Kraze Gang yo (GSF), jiska 5 500 moun",
      fr: "Création de la Force de répression des gangs (GSF), jusqu'à 5 500 personnes",
      en: "The Gang Suppression Force (GSF) is created, up to 5,500 personnel",
    },
    kind: "security",
    source: S.gsfAP,
    verified: true,
  },
  {
    date: { ht: "janvye 2026", fr: "janv. 2026", en: "Jan 2026" },
    sortKey: "2026-01-14",
    title: {
      ht: "Lapolis atake baz Chérizier nan Delma 6",
      fr: "La police vise le fief de Chérizier à Delmas 6",
      en: "Police target Chérizier's stronghold in Delmas 6",
    },
    kind: "security",
    source: S.delmas6LN,
    pcode: "HT0112",
    verified: true,
  },
  {
    date: { ht: "2026", fr: "2026", en: "2026" },
    sortKey: "2026-03-16",
    title: {
      ht: "Lapolis ak GSF avanse pou reprann anba lavil Pòtoprens",
      fr: "La police et la GSF avancent pour reprendre le centre-ville de Port-au-Prince",
      en: "Police and the GSF advance to retake downtown Port-au-Prince",
    },
    kind: "security",
    source: S.downtownLN,
    pcode: "HT0111",
    verified: true,
  },
  {
    date: { ht: "novanm 2026", fr: "nov. 2026", en: "Nov 2026" },
    sortKey: "2026-11-10",
    title: {
      ht: "Lapolis reprann pon Tabarre ak Kafou Marasa",
      fr: "La police reprend le pont de Tabarre et Carrefour Marassa",
      en: "Police retake the Tabarre bridge and Carrefour Marassa",
    },
    kind: "security",
    source: S.tabarreBridgeRelief,
    pcode: "HT0118",
    verified: true,
  },
  {
    date: { ht: "fevriye 2026", fr: "févr. 2026", en: "Feb 2026" },
    sortKey: "2026-02-07",
    title: {
      ht: "Lapolis reprann Kafou Ayewopò",
      fr: "La police reprend le carrefour de l'Aéroport",
      en: "Police retake the Airport Crossroads",
    },
    kind: "security",
    source: S.capital90,
    pcode: "HT0112",
    verified: true,
  },
  {
    date: { ht: "me 2026", fr: "mai 2026", en: "May 2026" },
    sortKey: "2026-05-12",
    title: {
      ht: "Batay nan Site Solèy fè plizyè santèn moun kouri",
      fr: "Des affrontements à Cité Soleil font fuir des centaines d'habitants",
      en: "Clashes in Cité Soleil displace hundreds",
    },
    kind: "violence",
    source: S.citeSoleil2026AP,
    pcode: "HT0117",
    verified: true,
  },
  {
    date: { ht: "28-29 mas 2026", fr: "28-29 mars 2026", en: "28–29 Mar 2026" },
    sortKey: "2026-03-29",
    title: {
      ht: "Masak Jean-Denis (Ti Rivyè Latibonit)",
      fr: "Massacre de Jean-Denis (Petite-Rivière de l'Artibonite)",
      en: "Jean-Denis massacre (Petite-Rivière de l'Artibonite)",
    },
    kind: "violence",
    source: S.jeanDenisLN,
    pcode: "HT0542",
    verified: true,
  },
  {
    date: { ht: "23-24 out 2026", fr: "23-24 août 2026", en: "23–24 Aug 2026" },
    sortKey: "2026-08-24",
    title: {
      ht: "Masak Kenskòf : omwen 47 mouri, plis pase 50 kidnape",
      fr: "Massacre de Kenscoff : au moins 47 morts, plus de 50 enlevés",
      en: "Kenscoff massacre: at least 47 killed, more than 50 kidnapped",
    },
    kind: "violence",
    source: S.kenscoff2026AP,
    pcode: "HT0115",
    verified: true,
  },
  {
    date: { ht: "fen oktòb 2026", fr: "fin oct. 2026", en: "Late Oct 2026" },
    sortKey: "2026-10",
    title: {
      ht: "Salvadò konfime li gen plis pase 2 000 sòlda nan GSF la",
      fr: "Le Salvador confirme plus de 2 000 soldats déployés au sein de la GSF",
      en: "El Salvador confirms more than 2,000 soldiers deployed with the GSF",
    },
    kind: "security",
    source: S.salvadorAFP,
    verified: true,
  },
  {
    date: { ht: "12 novanm 2026", fr: "12 nov. 2026", en: "12 Nov 2026" },
    sortKey: "2026-11-12",
    title: {
      ht: "Fòs sekirite yo reprann estad nasyonal la",
      fr: "Les forces de sécurité reprennent le stade national",
      en: "Security forces retake the national stadium",
    },
    kind: "security",
    source: S.stadiumAFP,
    pcode: "HT0111",
    verified: true,
  },
  {
    date: { ht: "19 novanm 2026", fr: "19 nov. 2026", en: "19 Nov 2026" },
    sortKey: "2026-11-19",
    title: {
      ht: "Ofansiv fòs ame yo pou reprann Matisan",
      fr: "Offensive des forces armées pour reprendre Martissant",
      en: "Armed forces' offensive to retake Martissant",
    },
    kind: "security",
    source: S.martissantAP,
    pcode: "HT0111",
    verified: true,
  },
];

/* ---------- Impact humain ---------- */

type Figure = { value: L; source: Source; date: L };

export const IMPACT: { displaced: Figure[]; capitalControl: Figure[] } = {
  displaced: [
    {
      value: { ht: "≈1,5 milyon", fr: "≈1,5 million", en: "≈1.5 million" },
      source: S.displaced2026Reuters,
      date: { ht: "septanm 2026", fr: "sept. 2026", en: "Sep 2026" },
    },
  ],
  capitalControl: [
    {
      value: { ht: "≈90 %", fr: "≈90 %", en: "≈90%" },
      source: S.capital90,
      date: { ht: "fevriye 2026", fr: "févr. 2026", en: "Feb 2026" },
    },
    {
      value: { ht: "≈85 %", fr: "≈85 %", en: "≈85%" },
      source: S.mirebalaisAP,
      date: { ht: "mas 2025", fr: "mars 2025", en: "Mar 2025" },
    },
    {
      value: { ht: "72 %", fr: "72 %", en: "72%" },
      source: S.police72LN,
      date: { ht: "2026", fr: "2026", en: "2026" },
    },
    {
      value: { ht: "≈70 %", fr: "≈70 %", en: "≈70%" },
      source: S.capital70AP,
      date: { ht: "out 2026", fr: "août 2026", en: "Aug 2026" },
    },
  ],
};

/** Fond de carte administratif (pas une source sur le conflit). */
export const BOUNDARIES_SOURCE = {
  label: {
    ht: "Limit administratif : CNIGS (Ayiti), atravè HDX, CC BY-IGO",
    fr: "Limites administratives : CNIGS (Haïti), via HDX, CC BY-IGO",
    en: "Administrative boundaries: CNIGS (Haiti), via HDX, CC BY-IGO",
  } satisfies L,
  url: "https://data.humdata.org/dataset/cod-ab-hti",
};

export function groupById(id: string) {
  return GROUPS.find((g) => g.id === id);
}

/** Clé stable d'un événement (indépendante de la langue). */
export const eventKey = (e: TimelineEvent) => `${e.sortKey}|${e.title.en}`;
