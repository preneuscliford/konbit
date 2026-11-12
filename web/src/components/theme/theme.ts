// Thème du site : clair, sombre, ou celui du système (par défaut).
export type ThemeChoice = "light" | "dark" | "system";

export const THEME_KEY = "konbit-theme";

// Exécuté dans <head> avant l'affichage : pas de flash blanc en mode sombre.
// Garde la classe à jour si le réglage du système change.
export const THEME_SCRIPT = `(function(){try{
var k=${JSON.stringify(THEME_KEY)},m=window.matchMedia("(prefers-color-scheme: dark)");
function apply(){var c=localStorage.getItem(k)||"system";var d=c==="dark"||(c==="system"&&m.matches);
document.documentElement.classList.toggle("dark",d);}
apply();m.addEventListener("change",apply);
}catch(e){}})();`;

export function readTheme(): ThemeChoice {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

export function saveTheme(choice: ThemeChoice) {
  try {
    if (choice === "system") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, choice);
  } catch {
    // Stockage bloqué (navigation privée) : le choix vaut pour cette page.
  }
  const dark =
    choice === "dark" ||
    (choice === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}
