import React, {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";
import { Session, User } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";

type AuthContext = {
  session: Session | null;
  user: User | null;
  userData: UserData | null;
};

const AuthContext = createContext<AuthContext>({
  session: null,
  user: null,
  userData: null,
});

interface UserData {
  id: string;
  username: string;
  avatar_url: string;
  full_name: string;
  provider: string;
  phone: string;
  address: string;
  bio: string;
  website: string;
  business_info: {};
  innovation_badges: string;
  social_links: {
    instagram: string;
    twitter: string;
  };
}

export async function getProfile(user_id: string) {
  try {
    if (!user_id) throw new Error("No user on the session!");

    const { data, error, status } = await supabase
      .from("profiles")
      .select(`*`)
      .eq("id", user_id)
      .single();
    if (error && status !== 406) {
      throw error;
    }
    return data;
  } catch (error) {
    if (error instanceof Error) {
      console.log(error);
    }
  } finally {
  }
}

export default function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["getProfile", session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) {
        throw new Error("ID utilisateur non trouvé");
      }
      return getProfile(session.user.id);
    },
    enabled: !!session?.user?.id,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        queryClient.invalidateQueries({
          queryKey: ["getProfile", session.user.id],
        });
      }
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        queryClient.invalidateQueries({
          queryKey: ["getProfile", session.user.id],
        });
      }
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user || null,
        userData: data || null,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
