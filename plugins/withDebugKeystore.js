// Recopie ./debug.keystore (la clé de debug d'origine du projet) dans
// android/app à chaque `expo prebuild`. Sinon, prebuild --clean remet la clé
// par défaut de React Native, dont le SHA-1 n'est pas enregistré dans le
// client OAuth Android de Google, et la connexion Google échoue.
const fs = require("fs");
const path = require("path");
const { withDangerousMod } = require("expo/config-plugins");

module.exports = function withDebugKeystore(config) {
  return withDangerousMod(config, [
    "android",
    async (cfg) => {
      const source = path.join(cfg.modRequest.projectRoot, "debug.keystore");
      const target = path.join(cfg.modRequest.platformProjectRoot, "app", "debug.keystore");
      if (fs.existsSync(source)) fs.copyFileSync(source, target);
      return cfg;
    },
  ]);
};
