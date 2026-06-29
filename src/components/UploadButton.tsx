import { useRef } from "react";

type Props = {
  images: any[];
  setImages: any;
  handleFiles: (files: FileList | File[]) => void;
  loading?: boolean;
};

export default function ImageUploader({
  images,
  setImages,
  handleFiles,
  loading = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files);
          e.target.value = "";
        }}
        className="hidden"
      />

      <div
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="cursor-pointer rounded border-2 border-dashed border-gray-300 p-6 text-center hover:border-blue-400"
      >
        {loading ? (
          <>
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Processing...
          </>
        ) : (
          "+ Add Photos"
        )}
      </div>
    </div>
  );
}
