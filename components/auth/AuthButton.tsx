import React from "react";
import { ActivityIndicator, Text, TouchableOpacity } from "react-native";

interface AuthButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "ghost";
}

const AuthButton = ({
  title,
  onPress,
  loading,
  disabled,
  variant = "primary",
}: AuthButtonProps) => {
  const isDisabled = disabled || loading;
  const bgClass =
    variant === "primary"
      ? "bg-primary"
      : variant === "secondary"
        ? "bg-secondary"
        : "bg-transparent border border-primary";
  const textClass = variant === "ghost" ? "text-primary" : "text-white";

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
      className={`h-12 rounded-xl justify-center items-center ${bgClass} ${
        isDisabled ? "opacity-50" : ""
      } ${variant !== "ghost" ? "shadow-card" : ""}`}
    >
      {loading ? (
        <ActivityIndicator color={variant === "ghost" ? "#0D9488" : "#fff"} />
      ) : (
        <Text className={`font-semibold text-base ${textClass}`}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

export default AuthButton;
