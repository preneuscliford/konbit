// Créer un fichier useImagePicker.ts
import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

export const useImagePicker = () => {
  const [images, setImages] = useState<ImagePicker.ImagePickerAsset[]>([]);

  const pickImages = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission requise', 'Autorisez l\'accès à vos photos pour continuer');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled) {
        setImages(prev => [...prev, ...result.assets]);
      }
    } catch (error) {
      console.error('Erreur de sélection :', error);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  return { images, pickImages, removeImage, setImages };
};