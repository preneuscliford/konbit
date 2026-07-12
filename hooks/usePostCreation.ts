// Créer un fichier usePostCreation.ts
import { useState } from 'react';
import { useRouter } from 'expo-router';

import { supabase } from '@/lib/supabase';
import { ToastHandles } from '@/components/Toast';
import { ImageAsset, uploadImages } from '@/lib/postServices';


interface PostCreationProps {
  userId?: string;
  editorRef: React.RefObject<any>;
  toastRef: React.RefObject<ToastHandles>;
}

export const usePostCreation = ({ userId, editorRef, toastRef }: PostCreationProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const router = useRouter();

  const handleCreatePost = async (body: string, images: ImageAsset[]) => {
    if (!userId) {
      toastRef.current?.show('Utilisateur non authentifié', 'error', 2000);
      return;
    }

    try {
      setIsLoading(true);
      setIsUploading(true);

      const mediaUrls = await uploadImages(images);

      const { error } = await supabase.from('posts').upsert({
        body,
        userId,
        file: mediaUrls,
      });

      if (error) throw error;

      toastRef.current?.show('Post publié avec succès', 'success', 1500);
      editorRef.current?.clearContent();
      router.back();
    } catch (error) {
      toastRef.current?.show(
        error instanceof Error ? error.message : 'Erreur inconnue',
        'error',
        2000
      );
    } finally {
      setIsLoading(false);
      setIsUploading(false);
    }
  };

  return { handleCreatePost, isLoading, isUploading };
};