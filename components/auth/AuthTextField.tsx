import React, { useState } from "react";
import { Text, TextInput, TextInputProps, TouchableOpacity, View } from "react-native";
import { Eye, EyeOff, LucideIcon } from "lucide-react-native";

interface AuthTextFieldProps
  extends Pick<
    TextInputProps,
    "keyboardType" | "autoCapitalize" | "autoComplete" | "textContentType"
  > {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  error?: string;
  icon?: LucideIcon;
  secureTextEntry?: boolean;
  editable?: boolean;
}

const AuthTextField = ({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  icon: Icon,
  secureTextEntry,
  editable = true,
  ...inputProps
}: AuthTextFieldProps) => {
  const [hidden, setHidden] = useState(!!secureTextEntry);

  return (
    <View className="mb-4">
      <Text className="text-sm font-medium text-charcoal mb-1.5">{label}</Text>
      <View
        className={`flex-row items-center h-12 rounded-xl border px-3.5 bg-surface ${
          error ? "border-red-400" : "border-surface-muted"
        } ${!editable ? "opacity-60" : ""}`}
      >
        {Icon ? <Icon size={18} color="#6B7280" style={{ marginRight: 8 }} /> : null}
        <TextInput
          className="flex-1 text-base text-charcoal"
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          secureTextEntry={secureTextEntry && hidden}
          editable={editable}
          {...inputProps}
        />
        {secureTextEntry ? (
          <TouchableOpacity onPress={() => setHidden((h) => !h)} hitSlop={8}>
            {hidden ? (
              <EyeOff size={18} color="#6B7280" />
            ) : (
              <Eye size={18} color="#6B7280" />
            )}
          </TouchableOpacity>
        ) : null}
      </View>
      {error ? <Text className="text-red-500 text-xs mt-1">{error}</Text> : null}
    </View>
  );
};

export default AuthTextField;
