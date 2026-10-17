// hooks/useProfile.ts
import { useEffect, useState } from 'react';
import { supabase } from "@/lib/supabase";
import { Alert } from "react-native";

export const useProfile = (userId?: string) => {
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .eq('id', userId)
          .single();

        if (error) throw error;
        setData(data);
      } catch (err) {
        // setError(err.message);
        Alert.alert("Erreur de chargement du profil");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  return { data, loading, error };
};

interface ProfileData {
  id: string;
  username?: string;
  avatar_url?: string;

}