const { getSentryExpoConfig } = require("@sentry/react-native/metro");
const { withNativeWind } = require("nativewind/metro");

// On étend la configuration Expo au lieu de la remplacer : écraser
// `resolver` faisait perdre ses autres réglages (avertissement EAS).
// getSentryExpoConfig = la configuration Expo par défaut + ce qu'il faut à
// Sentry pour relier une erreur à la bonne ligne du code (source maps).
const config = getSentryExpoConfig(__dirname);

// Animations .lottie servies comme fichiers ; les .json (Lottie compris)
// restent importables comme du code, ce qui est déjà le défaut d'Expo.
config.resolver.assetExts.push("lottie");

module.exports = withNativeWind(config, { input: "./globals.css" });
