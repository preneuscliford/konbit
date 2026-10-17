export type KonbitCategory =
  | "aide"
  | "projet"
  | "idee"
  | "evenement"
  | "action_locale"
  | "collecte"
  | "mission"
  | "discussion";

export type KonbitStatus =
  | "nouvelle"
  | "en_preparation"
  | "en_cours"
  | "terminee";

export type KonbitMediaItem = {
  path: string;
  type: "image" | "video";
};

export type Konbit = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: KonbitCategory;
  location: string | null;
  event_date: string | null;
  participants_target: number | null;
  media: KonbitMediaItem[] | null;
  status: KonbitStatus;
  required_skills: string | null;
  locals_only: boolean;
  created_at: string;
  updated_at: string;
  profiles: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
  };
  konbit_participants?: Array<{ count: number }>;
  konbit_comments: Array<{ count: number }>;
  konbit_likes?: Array<{ count: number }>;
  score?: number; // Uniquement pour les tendances
};

export type KonbitsResponse = {
  data: Konbit[];
  count: number | null;
  error?: string;
};

export type KonbitComment = {
  id: number;
  content: string;
  created_at: string;
  user_id: string;
  konbit_id: number;
  parent_id: number | null;
  profiles: {
    username: string;
    avatar_url: string;
    full_name: string;
  };
};

export type KonbitUpdate = {
  id: number;
  konbit_id: number;
  user_id: string;
  content: string;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string;
    full_name: string;
  };
};

export type KonbitMessage = {
  id: number;
  konbit_id: number;
  user_id: string;
  content: string | null;
  image_path: string | null;
  created_at: string;
  profiles: {
    id: string;
    username: string;
    avatar_url: string;
    full_name: string;
  };
};

export interface Profile {
  id: string;
  username: string;
  avatar_url?: string;
  phone?: string;
  address?: string;
  bio?: string;
  website?: string;
  social_links?: {
    instagram?: string;
    twitter?: string;
  };
  innovation_badges?: string;
  updated_at?: string;
}

export interface ProfileForm {
  username: string;
  phone: string;
  address: string;
  bio: string;
  website: string;
  socials: {
    instagram: string;
    twitter: string;
  };
  innovationBadges: string;
}
