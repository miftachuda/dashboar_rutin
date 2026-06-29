import React, { useEffect, useState } from "react";
import ImageUploader from "./UploadButton";

type ImageItem = {
  file: File;
  preview: string;
};

type Props = {
  onChange?: (files: File[], taskId: string) => void;
  taskId?: string;
  uploadedTrigger: number;
};

const MAX_SIZE_MB = 1;
const MAX_WIDTH = 1024;
const QUALITY = 0.7;

export default function MultiImageUpload({
  onChange,
  taskId,
  uploadedTrigger,
}: Props) {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (images.length > 0) {
      images.forEach((img) => URL.revokeObjectURL(img.preview));
      setImages([]);
    }
  }, [uploadedTrigger]);

  useEffect(() => {
    if (!onChange) return;

    onChange(
      images.map((i) => i.file),
      taskId || "",
    );
  }, [images]);

  const handleFiles = async (fileList: FileList | File[]) => {
    setLoading(true);

    try {
      const files = Array.from(fileList || []);

      const processed = await Promise.all(
        files.map(async (file) => {
          if (!file.type.startsWith("image/")) return null;

          let finalFile = file;
          if (file.size / 1024 / 1024 > MAX_SIZE_MB) {
            finalFile = await compressImage(file);
          }

          return {
            file: finalFile,
            preview: URL.createObjectURL(finalFile),
          };
        }),
      );

      const validProcessed = processed.filter(
        (item): item is ImageItem => item !== null,
      );

      setImages((prev) => [...prev, ...validProcessed]);
    } finally {
      setLoading(false);
    }
  };

  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === "string") img.src = result;
      };

      img.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, MAX_WIDTH / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(
          (blob) => {
            if (!blob) return;
            resolve(
              new File([blob], file.name, {
                type: "image/jpeg",
              }),
            );
          },
          "image/jpeg",
          QUALITY,
        );
      };

      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  return (
    <div className="relative mt-2 flex w-full items-center">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
            <span className="text-sm font-medium text-blue-600">Processing...</span>
          </div>
        </div>
      )}
      <div className="flex flex-row flex-wrap gap-2">
        {images.map((img, index) => (
          <div key={img.preview} className="relative mr-1 shrink-0">
            <img
              src={img.preview}
              alt="preview"
              className="aspect-square h-20 w-20 rounded border object-cover"
            />
            <button
              type="button"
              onClick={() => removeImage(index)}
              className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white text-xs"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="shrink-0">
        <ImageUploader
          images={images}
          setImages={setImages}
          handleFiles={handleFiles}
          loading={loading}
        />
      </div>
    </div>
  );
}
