import { useState } from "react";

type Props = {
  images: string[];
  recordId: string;
  baseUrl: string;
  collectionID: string;
};

export default function MinImagePreviewRow({
  images,
  recordId,
  baseUrl,
  collectionID,
}: Props) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

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
  const getImageUrl = (filename: string) => {
    return `${baseUrl}/api/files/${collectionID}/${recordId}/${filename}`;
  };

  const [selectedIndex2, setSelectedIndex2] = useState(0);

  const next2 = () => {
    setSelectedIndex2((prev) => (prev + 1) % images.length);
  };

  const prev2 = () => {
    setSelectedIndex2((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };
  return (
    <>
      <div className="flex gap-2 p-2 mb-2 border rounded items-center w-fit">
        <div className="w-24 h-24 relative border rounded overflow-hidden">
          {images.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              No image
            </div>
          ) : (
            <>
              <img
                src={getImageUrl(images[selectedIndex2])}
                className="w-full h-full object-cover"
                onClick={() => setSelectedIndex(selectedIndex2)}
              />

              {/* Prev */}
              <button
                onClick={prev2}
                className="absolute left-0 top-1/2 -translate-y-1/2 bg-black/40 text-white px-1"
              >
                ‹
              </button>

              {/* Next */}
              <button
                onClick={next2}
                className="absolute right-0 top-1/2 -translate-y-1/2 bg-black/40 text-white px-1"
              >
                ›
              </button>
            </>
          )}
        </div>
      </div>

      {selectedIndex !== null && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
          onClick={() => setSelectedIndex(null)}
        >
          {/* PREV */}
          <button
            onClick={prev}
            className="absolute left-4 text-white text-3xl px-3 py-2 bg-black/40 rounded-full hover:bg-black/70"
          >
            ←
          </button>

          {/* IMAGE */}
          <img
            src={getImageUrl(images[selectedIndex])}
            className="max-h-[90%] max-w-[90%] rounded shadow-lg"
            onClick={(e) => e.stopPropagation()}
          />

          {/* NEXT */}
          <button
            onClick={next}
            className="absolute right-4 text-white text-3xl px-3 py-2 bg-black/40 rounded-full hover:bg-black/70"
          >
            →
          </button>

          {/* CLOSE */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedIndex(null);
            }}
            className="absolute top-4 right-4 text-white text-xl bg-black/40 px-3 py-1 rounded hover:bg-black/70"
          >
            ✕
          </button>

          {/* 🔥 IMAGE NUMBER */}
          <div className="absolute bottom-4 text-white text-sm bg-black/50 px-4 py-1 rounded-full">
            {selectedIndex + 1} / {images.length}
          </div>
        </div>
      )}
    </>
  );
}
