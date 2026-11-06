const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

// On étend la configuration Expo au lieu de la remplacer : écraser
// `resolver` faisait perdre ses autres réglages (avertissement EAS).
const config = getDefaultConfig(__dirname);

// Animations .lottie servies comme fichiers ; les .json (Lottie compris)
// restent importables comme du code, ce qui est déjà le défaut d'Expo.
config.resolver.assetExts.push("lottie");

module.exports = withNativeWind(config, { input: "./globals.css" });
