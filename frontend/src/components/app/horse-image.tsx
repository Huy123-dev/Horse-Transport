import { useState } from "react";
import { Image as ImageIcon } from "lucide-react";
import { resolvePublicImageUrl } from "@/lib/api-client";

interface HorseImageProps {
  src?: string | null;
  name: string;
  className: string;
}

export function HorseImage({ src, name, className }: HorseImageProps) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const imageUrl = src ? resolvePublicImageUrl(src) : null;

  if (!imageUrl || failedSource === imageUrl) {
    return (
      <div
        className={`flex items-center justify-center bg-muted text-muted-foreground ${className}`}
        role="img"
        aria-label={`Chưa có ảnh cho ngựa ${name}`}
      >
        <ImageIcon className="h-8 w-8" aria-hidden="true" />
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={`Ảnh của ngựa ${name}`}
      className={`object-cover ${className}`}
      onError={() => setFailedSource(imageUrl)}
    />
  );
}
