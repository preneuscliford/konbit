import { useEffect } from "react";
import { AppState } from "react-native";
import { supabase } from "@/lib/supabase";

export function useSupabaseAuthRefresh() {
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    });
    return () => subscription.remove();
  }, []);
}
