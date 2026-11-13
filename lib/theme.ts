import { Appearance, DevSettings } from "react-native";
import * as SecureStore from "expo-secure-store";
import * as Updates from "expo-updates";

// Thème de l'app : clair, sombre ou celui du téléphone (par défaut).
// Les couleurs (constants/Colors) sont choisies UNE FOIS au démarrage, à
// partir de ce réglage lu de façon synchrone : changer de thème relance
// l'app (une fraction de seconde) pour que tous les écrans le prennent.
export type ThemeChoice = "light" | "dark" | "system";

const KEY = "konbit-theme";

export function readThemeChoice(): ThemeChoice {
  try {
    const value = SecureStore.getItem(KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

const choice = readThemeChoice();

// Un choix forcé s'applique aussi aux éléments du système (barres, sélecteurs).
if (choice !== "system") Appearance.setColorScheme(choice);

// Thème actif pour toute la durée de cette session de l'app.
export const IS_DARK = choice === "dark" || (choice === "system" && Appearance.getColorScheme() === "dark");

export async function reloadApp() {
  try {
    await Updates.reloadAsync();
  } catch {
    // En développement (client de dev), expo-updates ne relance pas : Metro le fait.
    DevSettings.reload();
  }
}

export async function setThemeChoice(next: ThemeChoice) {
  try {
    if (next === "system") await SecureStore.deleteItemAsync(KEY);
    else SecureStore.setItem(KEY, next);
  } catch {
    // Stockage indisponible : le choix vaut seulement pour cette session.
  }
  Appearance.setColorScheme(next === "system" ? "unspecified" : next);
  await reloadApp();
}

// Mode « système » : si le téléphone change de thème pendant que l'app est
// ouverte, on la relance pour suivre.
export function followSystemTheme() {
  if (choice !== "system") return () => {};
  const sub = Appearance.addChangeListener(({ colorScheme }) => {
    if ((colorScheme === "dark") !== IS_DARK) void reloadApp();
  });
  return () => sub.remove();
}
