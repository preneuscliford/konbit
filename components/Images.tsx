import { Image } from "react-native";
import React, { ComponentProps, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type ProductsImageProps = {
  path?: string | null;
  fallback: string;
} & Omit<ComponentProps<typeof Image>, "source">;

export const ServiceImages = ({
  path,
  fallback,
  ...imageProps
}: ProductsImageProps) => {
  const [image, setImage] = useState("");

  useEffect(() => {
    if (!path) return;
    (async () => {
      setImage("");
      const { data, error } = await supabase.storage
        .from("services")
        .download(path);

      if (error) {
        console.log(error);
      }

      if (data) {
        const fr = new FileReader();
        fr.readAsDataURL(data);
        fr.onload = () => {
          setImage(fr.result as string);
        };
      }
    })();
  }, [path]);

  if (!image) {
  }

  return <Image source={{ uri: image || fallback }} {...imageProps} />;
};
