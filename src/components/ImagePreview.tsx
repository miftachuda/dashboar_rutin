import { useState } from "react";

type Props = {
  images: string[];
  recordId: string;
  baseUrl: string;
  collectionID: string;
};

export default function ImagePreviewRow({
  images,
  recordId,
  baseUrl,
  collectionID,
}: Props) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const getImageUrl = (filename: string) => {
    return `${baseUrl}/api/files/${collectionID}/${recordId}/${filename}`;
  };

  const next = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (selectedIndex === null) return;
    setSelectedIndex((prev) => (prev! === images.length - 1 ? 0 : prev! + 1));
  };

  const prev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (selectedIndex === null) return;
    setSelectedIndex((prev) => (prev! === 0 ? images.length - 1 : prev! - 1));
  };

  return (
    <>
      <div className="flex gap-2 overflow-x-auto p-2 mb-2 border rounded min-h-[88px] items-center">
        {images.length === 0 ? (
          <div className="flex flex-col items-center text-gray-400 text-sm">
            <span>No image</span>
          </div>
        ) : (
          images.map((file, i) => {
            const url = getImageUrl(file);

            return (
              <img
                key={i}
                src={url}
                onClick={() => setSelectedIndex(i)}
                className="h-20 w-20 object-cover rounded cursor-pointer hover:opacity-80 shrink-0"
              />
            );
          })
        )}
      </div>

      {selectedIndex !== null && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
          onClick={() => setSelectedIndex(null)}
        >
          <button
            onClick={prev}
            className="absolute left-4 text-white text-3xl px-3 py-2 bg-black/40 rounded-full hover:bg-black/70"
          >
            ←
          </button>

          <img
            src={getImageUrl(images[selectedIndex])}
            className="max-h-[90%] max-w-[90%] rounded shadow-lg"
            onClick={(e) => e.stopPropagation()}
          />

          <button
            onClick={next}
            className="absolute right-4 text-white text-3xl px-3 py-2 bg-black/40 rounded-full hover:bg-black/70"
          >
            →
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedIndex(null);
            }}
            className="absolute top-4 right-4 text-white text-xl bg-black/40 px-3 py-1 rounded hover:bg-black/70"
          >
            ✕
          </button>

          <div className="absolute bottom-4 text-white text-sm bg-black/50 px-4 py-1 rounded-full">
            {selectedIndex + 1} / {images.length}
          </div>
        </div>
      )}
    </>
  );
}
