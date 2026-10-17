import {
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import React, { useState } from "react";

import CustomButton from "./CustomButton";

interface FormFieldProps {
  title: string;
  value: string;
  uploading: boolean;
  placeholder: string;
  handleChangeText: (text: string) => void;
  otherStyle: string;
}
const FormField = ({
  title,
  value,
  uploading,
  placeholder,
  handleChangeText,
  otherStyle,
  ...props
}: FormFieldProps) => {
  const [showPassword, setShowPassword] = useState(false);

  const submitForm = () => {};
  return (
    <View className={`space-y-2 ${otherStyle}`}>
      <Text className="text-base text-gray-100 font-pmedium">{title}</Text>
      <View className="w-full h-16 bg-black-100 rounded-2xl focus:border-secondary-200 items-center flex-row px-4">
        <TextInput
          className="flex-1 text-white text-base font-psemibold"
          placeholder={placeholder}
          value={value}
          maxLength={300}
          editable={uploading ? false : true}
          multiline
          onChangeText={handleChangeText}
          placeholderTextColor="red"
          secureTextEntry={title === "Password" && !showPassword}
        />
        {title === "Password" && (
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Image
              className="w-6 h-6"
              resizeMode="contain"
              //   source={!showPassword ? icons.eye : icons.eyeHide}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default FormField;

const styles = StyleSheet.create({});
