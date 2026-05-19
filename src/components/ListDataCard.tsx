import { useState } from "react";
import imageCompression from "browser-image-compression";
import { pb } from "@/lib/pocketbase";
import { ListData } from "@/types/listdata";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Tag,
  Trash2,
  Plus,
  Upload,
  Wrench,
  Building2,
  Image as ImageIcon,
  X,
} from "lucide-react";

type PendingPhoto = {
  file: File;
  previewUrl: string;
};

const waitForNextPaint = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

export default function MaintenanceCardList({
  data,
  onDeleted,
  onDataChanged,
}: {
  data: ListData[];
  onDeleted?: (id: string) => void;
  onDataChanged?: () => void;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ListData | null>(null);
  const [compressingId, setCompressingId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [pendingPhotos, setPendingPhotos] = useState<
    Record<string, PendingPhoto[]>
  >({});
  const [preview, setPreview] = useState<{
    item: ListData;
    index: number;
  } | null>(null);

  const previewPhotos = preview?.item.photo ?? [];
  const previewSrc = preview
    ? pb.files.getURL(preview.item, previewPhotos[preview.index])
    : "";
  const hasMultiplePhotos = previewPhotos.length > 1;

  const clearPendingPhotos = (itemId: string) => {
    setPendingPhotos((current) => {
      current[itemId]?.forEach((photo) =>
        URL.revokeObjectURL(photo.previewUrl),
      );

      const next = { ...current };
      delete next[itemId];
      return next;
    });
  };

  const handlePhotoSelect = async (
    item: ListData,
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    try {
      setCompressingId(item.id);
      await waitForNextPaint();

      for (const file of files) {
        const compressedFile = await imageCompression(file, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1600,
          useWebWorker: true,
        });

        const compressedPhoto = {
          file: compressedFile,
          previewUrl: URL.createObjectURL(compressedFile),
        };

        setPendingPhotos((current) => ({
          ...current,
          [item.id]: [...(current[item.id] ?? []), compressedPhoto],
        }));
        await waitForNextPaint();
      }
    } catch (error) {
      console.error(error);
      alert("Failed to compress image");
    } finally {
      setCompressingId(null);
      event.target.value = "";
    }
  };

  const handleUploadPhotos = async (item: ListData) => {
    const photos = pendingPhotos[item.id] ?? [];
    if (photos.length === 0) return;

    try {
      setUploadingId(item.id);

      const formData = new FormData();
      photos.forEach((photo) => {
        formData.append("photo+", photo.file, photo.file.name);
      });

      await pb.collection("db_maintenance").update(item.id, formData);
      clearPendingPhotos(item.id);
      onDataChanged?.();
    } catch (error) {
      console.error(error);
      alert("Failed to upload photo");
    } finally {
      setUploadingId(null);
    }
  };

  const showPreviousPhoto = () => {
    setPreview((current) => {
      if (!current) return current;

      const photos = current.item.photo;
      return {
        ...current,
        index: (current.index - 1 + photos.length) % photos.length,
      };
    });
  };

  const showNextPhoto = () => {
    setPreview((current) => {
      if (!current) return current;

      const photos = current.item.photo;
      return {
        ...current,
        index: (current.index + 1) % photos.length,
      };
    });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      setDeletingId(deleteTarget.id);
      await pb.collection("db_maintenance").update(deleteTarget.id, {
        isDeleted: true,
      });
      setPreview((current) =>
        current?.item.id === deleteTarget.id ? null : current,
      );
      onDeleted?.(deleteTarget.id);
      setDeleteTarget(null);
    } catch (error) {
      console.error(error);
      alert("Failed to delete data");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-5">
        {data.map((item) => {
          const itemPendingPhotos = pendingPhotos[item.id] ?? [];
          const isPhotoBusy =
            compressingId === item.id || uploadingId === item.id;
          const progress = Math.min(Math.max(item.progress ?? 0, 0), 100);

          return (
            <div
              key={item.id}
              className="
            bg-white
            rounded-3xl
            border border-sky-100
            shadow-sm
            hover:shadow-md
            transition-all
            overflow-hidden
          "
            >
              {/* HEADER */}
              <div
                className="
              px-6
              py-5
              bg-gradient-to-r
              from-sky-50
              to-cyan-50
              border-b
              border-sky-100
            "
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-sky-900">
                      {item.judul}
                    </h2>

                    <p className="text-sm text-sky-700 mt-1">{item.issue}</p>
                  </div>

                  <div
                    className="
                  shrink-0
                  px-3
                  py-1
                  rounded-full
                  bg-sky-100
                  text-sky-700
                  text-xs
                  font-semibold
                "
                  >
                    {item.waktu_pelaksanaan}
                  </div>
                </div>
                <div className="mt-3 max-w-md">
                  <div className="mb-1 flex items-center justify-between text-xs font-semibold text-sky-700">
                    <span>Progress</span>
                    <span>{progress}%</span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-sky-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-500 transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* BODY */}
              <div className="p-6">
                {/* INFO GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  <InfoCard
                    icon={<Building2 size={18} />}
                    label="Discipline"
                    value={item.discipline}
                  />

                  <InfoCard
                    icon={<Wrench size={18} />}
                    label="Type"
                    value={item.type}
                  />

                  <InfoCard
                    icon={<Tag size={18} />}
                    label="Tag"
                    value={item.tag_name}
                  />

                  <InfoCard
                    icon={<CalendarDays size={18} />}
                    label="Unit"
                    value={item.unit}
                  />
                </div>

                {/* REFERENCE */}
                <div className="mt-5">
                  <div className="text-xs font-semibold text-slate-400 mb-1">
                    Reference Nota Dinas, Notulen , etc
                  </div>

                  <div
                    className="
                  bg-slate-50
                  border
                  border-slate-200
                  rounded-2xl
                  px-4
                  py-3
                  text-sm
                  text-slate-700
                "
                  >
                    {item.reference || "-"}
                  </div>
                </div>

                {/* PICTURES */}
                <div className="mt-6">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <ImageIcon size={18} className="text-sky-600" />

                      <h3 className="font-semibold text-slate-800">Photo</h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        id={`photo-upload-${item.id}`}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(event) => handlePhotoSelect(item, event)}
                        className="hidden"
                      />
                      <label
                        htmlFor={`photo-upload-${item.id}`}
                        aria-disabled={isPhotoBusy}
                        className={`inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700 transition-all hover:bg-sky-100 ${
                          isPhotoBusy
                            ? "pointer-events-none cursor-not-allowed opacity-60"
                            : "cursor-pointer"
                        }`}
                      >
                        {compressingId === item.id ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <Plus size={15} />
                        )}
                        {compressingId === item.id
                          ? "Compressing..."
                          : item.photo && item.photo.length > 0
                            ? "Add Photo"
                            : "Select Photo"}
                      </label>
                    </div>
                  </div>

                  {compressingId === item.id &&
                    itemPendingPhotos.length === 0 && (
                      <div className="mb-3 flex items-center gap-2 rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-3 text-sm font-medium text-sky-700">
                        <Loader2 size={16} className="animate-spin" />
                        Preparing compressed preview...
                      </div>
                    )}

                  <div
                    className="
                  flex
                  gap-4
                  overflow-x-auto
                  pb-2
                  scrollbar-thin
                  scrollbar-thumb-sky-200
                "
                  >
                    {item.photo && item.photo.length > 0 ? (
                      item.photo.map((img, idx) => (
                        <button
                          key={img}
                          type="button"
                          onClick={() => setPreview({ item, index: idx })}
                          className="shrink-0 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2"
                          aria-label={`Open ${item.judul} photo ${idx + 1}`}
                        >
                          <img
                            src={pb.files.getURL(item, img)}
                            alt={`${item.judul} photo ${idx + 1}`}
                            className="
                            w-72
                            h-48
                            object-cover
                            rounded-2xl
                            border
                            border-slate-200
                            cursor-zoom-in
                            hover:scale-[1.02]
                            transition-all
                          "
                          />
                        </button>
                      ))
                    ) : (
                      <>
                        {[1].map((x) => (
                          <div
                            key={x}
                            className="
                          w-72
                          h-48
                          rounded-2xl
                          border-2
                          border-dashed
                          border-slate-200
                          bg-slate-50
                          flex
                          flex-col
                          items-center
                          justify-center
                          text-slate-400
                          shrink-0
                        "
                          >
                            <ImageIcon size={32} />

                            <span className="text-sm mt-2">No Image</span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>

                  {itemPendingPhotos.length > 0 && (
                    <div className="mt-4 rounded-2xl border border-sky-100 bg-sky-50/40 p-4">
                      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="text-sm font-semibold text-slate-800">
                            Preview before upload
                          </div>
                          <div className="text-xs text-slate-500">
                            Images are compressed before being uploaded.
                          </div>
                        </div>

                        <div className="flex gap-2 self-end sm:self-auto">
                          <button
                            type="button"
                            onClick={() => clearPendingPhotos(item.id)}
                            disabled={isPhotoBusy}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Clear
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUploadPhotos(item)}
                            disabled={isPhotoBusy}
                            className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-3 py-2 text-xs font-semibold text-white transition-all hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Upload size={15} />
                            {uploadingId === item.id
                              ? "Uploading..."
                              : "Upload"}
                          </button>
                        </div>
                      </div>

                      <div className="flex gap-3 overflow-x-auto pb-1">
                        {itemPendingPhotos.map((photo, idx) => (
                          <img
                            key={`${photo.previewUrl}-${idx}`}
                            src={photo.previewUrl}
                            alt={`Selected ${item.judul} photo ${idx + 1}`}
                            className="h-28 w-40 shrink-0 rounded-xl border border-sky-100 object-cover"
                          />
                        ))}
                      </div>

                      {compressingId === item.id && (
                        <div className="mt-3 flex items-center gap-2 text-xs font-medium text-sky-700">
                          <Loader2 size={14} className="animate-spin" />
                          Compressing image...
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* FOOTER */}
                <div
                  className="
                mt-6
                pt-4
                border-t
                border-slate-100
                flex
                flex-col
                gap-3
                sm:flex-row
                sm:justify-between
                sm:items-center
                text-xs
                text-slate-500
              "
                >
                  <div className="flex flex-col gap-1 sm:flex-row sm:gap-4">
                    <span>
                      Created: {new Date(item.created).toLocaleString()}
                    </span>

                    <span>
                      Updated: {new Date(item.updated).toLocaleString()}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setDeleteTarget(item)}
                    disabled={deletingId === item.id}
                    className="inline-flex items-center justify-center gap-2 self-end rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition-all hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Trash2 size={15} />
                    {deletingId === item.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 px-4 py-6"
          onClick={() => setPreview(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
        >
          <button
            type="button"
            onClick={() => setPreview(null)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-3 text-white backdrop-blur hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white"
            aria-label="Close preview"
          >
            <X size={22} />
          </button>

          {hasMultiplePhotos && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                showPreviousPhoto();
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white backdrop-blur hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white md:left-8"
              aria-label="Previous photo"
            >
              <ChevronLeft size={34} />
            </button>
          )}

          <div
            className="flex max-w-[92vw] flex-col items-center gap-3"
            onClick={(event) => event.stopPropagation()}
          >
            <img
              src={previewSrc}
              alt={`${preview.item.judul} photo ${preview.index + 1}`}
              className="max-h-[82vh] max-w-full rounded-2xl object-contain shadow-2xl"
            />

            <div className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur">
              {preview.index + 1} / {previewPhotos.length}
            </div>
          </div>

          {hasMultiplePhotos && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                showNextPhoto();
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white backdrop-blur hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white md:right-8"
              aria-label="Next photo"
            >
              <ChevronRight size={34} />
            </button>
          )}
        </div>
      )}

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm delete"
        >
          <div className="w-full max-w-md rounded-3xl border border-red-100 bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-red-50 p-3 text-red-600">
                <Trash2 size={24} />
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Delete this data?
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  This will delete "{deleteTarget.judul}" , are you sure?
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deletingId === deleteTarget.id}
                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={deletingId === deleteTarget.id}
                className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 size={16} />
                {deletingId === deleteTarget.id ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div
      className="
        rounded-2xl
        border
        border-sky-100
        bg-sky-50/50
        p-4
      "
    >
      <div className="flex items-center gap-2 text-sky-700">
        {icon}

        <span className="text-xs font-semibold uppercase tracking-wide">
          {label}
        </span>
      </div>

      <div className="mt-2 text-slate-800 font-semibold">{value}</div>
    </div>
  );
}
