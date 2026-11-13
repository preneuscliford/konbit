import React from "react";
import {
  KeyboardAvoidingView as KCAvoidingView,
  KeyboardAwareScrollView,
  type KeyboardAwareScrollViewProps,
} from "react-native-keyboard-controller";

// Zone qui défile et garde le champ actif au-dessus du clavier (Android
// plein écran et iOS). À utiliser à la place de ScrollView dans tout écran
// avec des champs de saisie.
export default function KeyboardScroll({ bottomOffset = 24, ...props }: KeyboardAwareScrollViewProps) {
  return (
    <KeyboardAwareScrollView
      bottomOffset={bottomOffset}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      {...props}
    />
  );
}

// Pour un écran avec une barre de saisie en bas (réponse sous un konbit…) :
// tout l'écran remonte avec le clavier.
export const KeyboardAvoidingView = KCAvoidingView;
