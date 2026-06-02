import { useState } from "react";
import imageCompression from "browser-image-compression";
import { format, formatDistanceToNow } from "date-fns";
import { pb } from "@/lib/pocketbase";
import { ListData } from "@/types/listdata";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Trash2,
  Plus,
  Upload,
  Image as ImageIcon,
  X,
} from "lucide-react";
import PillCards from "./phill";

type PendingPhoto = {
  file: File;
  previewUrl: string;
};

type TimelinePoint = {
  id: string;
  text: string;
  photos: string[];
  createdAt: string;
  updatedAt: string;
};

const waitForNextPaint = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

const getWaktuPelaksanaanRibbonClass = (value: string) => {
  switch (value.trim().toLowerCase()) {
    case "rutin":
      return "from-green-700 via-green-500 to-green-700";
    case "pit stop":
      return "from-amber-700 via-amber-500 to-amber-700";
    case "turn around":
      return "from-red-700 via-red-500 to-red-700";
    default:
      return "from-slate-700 via-slate-500 to-slate-700";
  }
};

const parsePocketBaseDate = (value: string) => {
  const trimmedValue = value.trim();
  const normalizedValue = trimmedValue
    .replace(" ", "T")
    .replace(/(?:z|[+-]\d{2}:?\d{2})$/i, "");

  return new Date(normalizedValue);
};

const formatLocalTimestampForPocketBase = () =>
  format(new Date(), "yyyy-MM-dd HH:mm:ss.SSS");

const formatTimeAgo = (value: string) => {
  const date = parsePocketBaseDate(value);

  if (Number.isNaN(date.getTime())) return "-";

  return formatDistanceToNow(date, { addSuffix: true });
};

const formatTimelineDate = (value: string) => {
  const date = parsePocketBaseDate(value);

  if (Number.isNaN(date.getTime())) return "-";

  return format(date, "HH:mm dd-MMM-yyyy");
};

const createTimelinePointId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const getTimelineRawPoints = (tracking: unknown) => {
  if (!tracking) return [];

  if (Array.isArray(tracking)) return tracking;

  if (typeof tracking !== "string") return [];

  try {
    const parsed = JSON.parse(tracking);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const parseTimelinePoints = (tracking: unknown): TimelinePoint[] => {
  const rawPoints = getTimelineRawPoints(tracking);

  return rawPoints
    .filter((point) => point && typeof point === "object")
    .map((point) => {
      const timelinePoint = point as Record<string, unknown>;

      return {
        id:
          typeof timelinePoint.id === "string" && timelinePoint.id.trim()
            ? timelinePoint.id
            : createTimelinePointId(),
        text: typeof timelinePoint.text === "string" ? timelinePoint.text : "",
        photos: Array.isArray(timelinePoint.photos)
          ? timelinePoint.photos.filter((photo) => typeof photo === "string")
          : [],
        createdAt:
          typeof timelinePoint.createdAt === "string"
            ? timelinePoint.createdAt
            : "",
        updatedAt:
          typeof timelinePoint.updatedAt === "string"
            ? timelinePoint.updatedAt
            : "",
      };
    })
    .filter((point) => point.text.trim() !== "");
};

const getLegacyTracking = (tracking: unknown) => {
  if (!tracking || typeof tracking !== "string") return "";

  try {
    const parsed = JSON.parse(tracking);
    return typeof parsed === "string" ? parsed : "";
  } catch {
    return tracking;
  }
};

const removePhotoFromTimelineTracking = (
  tracking: unknown,
  fileName: string,
) => {
  const timelinePoints = parseTimelinePoints(tracking);
  if (timelinePoints.length === 0) {
    return { changed: false, nextTracking: tracking };
  }

  const now = formatLocalTimestampForPocketBase();
  let changed = false;

  const nextTimelinePoints = timelinePoints.map((point) => {
    const nextPhotos = point.photos.filter((photo) => photo !== fileName);
    if (nextPhotos.length === point.photos.length) return point;

    changed = true;
    return {
      ...point,
      photos: nextPhotos,
      updatedAt: now,
    };
  });

  return {
    changed,
    nextTracking: changed ? nextTimelinePoints : tracking,
  };
};

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
  const [deletingPhoto, setDeletingPhoto] = useState<{
    itemId: string;
    fileName: string;
  } | null>(null);
  const [deletePhotoTarget, setDeletePhotoTarget] = useState<{
    item: ListData;
    fileName: string;
  } | null>(null);
  const [compressingId, setCompressingId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [updatingReferenceId, setUpdatingReferenceId] = useState<string | null>(
    null,
  );
  const [pendingPhotos, setPendingPhotos] = useState<
    Record<string, PendingPhoto[]>
  >({});
  const [preview, setPreview] = useState<{
    item: ListData;
    index: number;
  } | null>(null);
  const [detailItem, setDetailItem] = useState<ListData | null>(null);
  const [timelineDraftText, setTimelineDraftText] = useState("");
  const [timelinePendingPhotos, setTimelinePendingPhotos] = useState<
    PendingPhoto[]
  >([]);
  const [timelineCompressingId, setTimelineCompressingId] = useState<
    string | null
  >(null);
  const [timelineSavingId, setTimelineSavingId] = useState<string | null>(null);
  const [timelineError, setTimelineError] = useState("");
  const [detailProgressValue, setDetailProgressValue] = useState<number | null>(
    null,
  );
  const [updatingProgressId, setUpdatingProgressId] = useState<string | null>(
    null,
  );

  const previewPhotos = preview?.item.photo ?? [];
  const previewSrc = preview
    ? pb.files.getURL(preview.item, previewPhotos[preview.index])
    : "";
  const hasMultiplePhotos = previewPhotos.length > 1;
  const detailPendingPhotos = detailItem
    ? (pendingPhotos[detailItem.id] ?? [])
    : [];
  const isDetailPhotoBusy = detailItem
    ? compressingId === detailItem.id || uploadingId === detailItem.id
    : false;
  const detailTimelinePoints = detailItem
    ? parseTimelinePoints(detailItem.tracking)
    : [];
  const detailLegacyTracking = detailItem
    ? getLegacyTracking(detailItem.tracking)
    : "";
  const isTimelineBusy = detailItem
    ? timelineCompressingId === detailItem.id ||
      timelineSavingId === detailItem.id
    : false;
  const detailProgress = detailItem
    ? (detailProgressValue ??
      Math.min(Math.max(detailItem.progress ?? 0, 0), 100))
    : 0;

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

  const clearTimelinePendingPhotos = () => {
    setTimelinePendingPhotos((current) => {
      current.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
      return [];
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

      const updatedItem = await pb
        .collection("db_maintenance")
        .update(item.id, formData);
      setDetailItem((current) => {
        if (!current || current.id !== item.id) return current;

        return {
          ...current,
          photo: updatedItem.photo ?? current.photo,
        };
      });
      clearPendingPhotos(item.id);
      onDataChanged?.();
    } catch (error) {
      console.error(error);
      alert("Failed to upload photo");
    } finally {
      setUploadingId(null);
    }
  };

  const handleTimelinePhotoSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (!detailItem) return;

    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    try {
      setTimelineCompressingId(detailItem.id);
      await waitForNextPaint();

      for (const file of files) {
        const compressedFile = await imageCompression(file, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1600,
          useWebWorker: true,
        });

        setTimelinePendingPhotos((current) => [
          ...current,
          {
            file: compressedFile,
            previewUrl: URL.createObjectURL(compressedFile),
          },
        ]);
        await waitForNextPaint();
      }
    } catch (error) {
      console.error(error);
      alert("Failed to compress  image");
    } finally {
      setTimelineCompressingId(null);
      event.target.value = "";
    }
  };

  const handleAddTimelinePoint = async () => {
    if (!detailItem) return;

    const text = timelineDraftText.trim();
    if (!text) {
      setTimelineError("Timeline point cannot be empty.");
      return;
    }

    try {
      setTimelineError("");
      setTimelineSavingId(detailItem.id);

      let nextPhotos = detailItem.photo ?? [];
      let timelinePhotoNames: string[] = [];

      if (timelinePendingPhotos.length > 0) {
        const uploadFormData = new FormData();
        timelinePendingPhotos.forEach((photo) => {
          uploadFormData.append("photo+", photo.file, photo.file.name);
        });

        const uploadedItem = await pb
          .collection("db_maintenance")
          .update(detailItem.id, uploadFormData);
        nextPhotos = uploadedItem.photo ?? nextPhotos;
        timelinePhotoNames = nextPhotos
          .filter((photo) => !(detailItem.photo ?? []).includes(photo))
          .slice(-timelinePendingPhotos.length);
      }

      const now = formatLocalTimestampForPocketBase();
      const legacyTrackingPoint = detailLegacyTracking
        ? [
            {
              id: `legacy-${detailItem.id}`,
              text: detailLegacyTracking,
              photos: [],
              createdAt: detailItem.created || now,
              updatedAt: detailItem.updated || now,
            },
          ]
        : [];
      const nextTimelinePoints = [
        ...legacyTrackingPoint,
        ...parseTimelinePoints(detailItem.tracking),
        {
          id: createTimelinePointId(),
          text,
          photos: timelinePhotoNames,
          createdAt: now,
          updatedAt: now,
        },
      ];
      const nextTracking = nextTimelinePoints;
      const updatedItem = await pb
        .collection("db_maintenance")
        .update(detailItem.id, {
          tracking: nextTracking,
        });

      setDetailItem((current) => {
        if (!current || current.id !== detailItem.id) return current;

        return {
          ...current,
          photo: updatedItem.photo ?? nextPhotos,
          tracking: updatedItem.tracking ?? nextTracking,
          updated: updatedItem.updated ?? current.updated,
        };
      });
      setTimelineDraftText("");
      clearTimelinePendingPhotos();
      onDataChanged?.();
    } catch (error) {
      console.error(error);
      alert("Failed to add timeline");
    } finally {
      setTimelineSavingId(null);
    }
  };

  const handleDetailProgressSave = async (
    item: ListData,
    nextProgress: number,
  ) => {
    const progress = Math.min(Math.max(Math.round(nextProgress), 0), 100);
    const currentProgress = Math.min(Math.max(item.progress ?? 0, 0), 100);

    if (progress === currentProgress || updatingProgressId === item.id) return;

    try {
      setUpdatingProgressId(item.id);
      const updatedItem = await pb
        .collection("db_maintenance")
        .update(item.id, {
          progress,
        });

      setDetailItem((current) => {
        if (!current || current.id !== item.id) return current;

        return {
          ...current,
          progress: updatedItem.progress ?? progress,
          updated: updatedItem.updated ?? current.updated,
        };
      });
      setDetailProgressValue(null);
      onDataChanged?.();
    } catch (error) {
      console.error(error);
      setDetailProgressValue(null);
      alert("Failed to update progress");
    } finally {
      setUpdatingProgressId(null);
    }
  };

  const handleReferenceBlur = async (
    item: ListData,
    element: HTMLInputElement,
  ) => {
    const nextReference = element.value.trim() || "-";
    if (nextReference === item.reference) {
      element.value = nextReference;
      return;
    }

    try {
      setUpdatingReferenceId(item.id);
      await pb.collection("db_maintenance").update(item.id, {
        reference: nextReference,
      });
      element.value = nextReference;
      setDetailItem((current) =>
        current?.id === item.id
          ? {
              ...current,
              reference: nextReference,
            }
          : current,
      );
      onDataChanged?.();
    } catch (error) {
      console.error(error);
      element.value = item.reference || "-";
      alert("Failed to update reference");
    } finally {
      setUpdatingReferenceId(null);
    }
  };

  const handleCardClick = (
    item: ListData,
    event: React.MouseEvent<HTMLDivElement>,
  ) => {
    const target = event.target as HTMLElement;
    const interactiveElement = target.closest(
      'button, input, label, select, textarea, a, [role="dialog"]',
    );

    if (interactiveElement) return;

    setDetailItem(item);
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
      setDetailItem((current) =>
        current?.id === deleteTarget.id ? null : current,
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

  const handleDeletePhoto = async () => {
    if (!deletePhotoTarget) return;

    const { item, fileName } = deletePhotoTarget;

    try {
      setDeletingPhoto({ itemId: item.id, fileName });

      const formData = new FormData();
      formData.append("photo-", fileName);
      const { changed: didTimelineChange, nextTracking } =
        removePhotoFromTimelineTracking(item.tracking, fileName);
      if (didTimelineChange) {
        formData.append("tracking", JSON.stringify(nextTracking));
      }

      const updatedItem = await pb
        .collection("db_maintenance")
        .update(item.id, formData);
      setPreview((current) => {
        if (!current || current.item.id !== item.id) return current;

        const deletedIndex = current.item.photo.findIndex(
          (photo) => photo === fileName,
        );
        const nextPhotos = current.item.photo.filter(
          (photo) => photo !== fileName,
        );

        if (nextPhotos.length === 0) return null;

        let nextIndex = current.index;
        if (deletedIndex !== -1 && deletedIndex < current.index) {
          nextIndex -= 1;
        } else if (deletedIndex === current.index) {
          nextIndex = Math.min(current.index, nextPhotos.length - 1);
        }

        return {
          item: {
            ...current.item,
            photo: nextPhotos,
            tracking: updatedItem.tracking ?? nextTracking,
          },
          index: nextIndex,
        };
      });
      setDetailItem((current) => {
        if (!current || current.id !== item.id) return current;

        return {
          ...current,
          photo: current.photo.filter((photo) => photo !== fileName),
          tracking: updatedItem.tracking ?? nextTracking,
          updated: updatedItem.updated ?? current.updated,
        };
      });
      onDataChanged?.();
      setDeletePhotoTarget(null);
    } catch (error) {
      console.error(error);
      alert("Failed to delete photo");
    } finally {
      setDeletingPhoto(null);
    }
  };

  return (
    <>
      <div className="flex w-full flex-col gap-1">
        {data.map((item) => {
          const itemPendingPhotos = pendingPhotos[item.id] ?? [];
          const isPhotoBusy =
            compressingId === item.id || uploadingId === item.id;
          const progress = Math.min(Math.max(item.progress ?? 0, 0), 100);
          const ribbonColorClass = getWaktuPelaksanaanRibbonClass(
            item.waktu_pelaksanaan,
          );

          return (
            <div
              key={item.id}
              onClick={(event) => handleCardClick(item, event)}
              onKeyDown={(event) => {
                if (
                  event.currentTarget === event.target &&
                  (event.key === "Enter" || event.key === " ")
                ) {
                  event.preventDefault();
                  setDetailItem(item);
                }
              }}
              role="button"
              tabIndex={0}
              className="
            bg-white
            rounded-3xl
            border border-sky-100
            shadow-sm
            hover:shadow-md
            transition-all
            overflow-hidden relative w-full
            cursor-pointer
            focus:outline-none
            focus:ring-2
            focus:ring-sky-300
            focus:ring-offset-2
          "
            >
              <div
                className={`
      absolute
      top-7
      right-[-39px]
      rotate-45
      bg-gradient-to-r
      ${ribbonColorClass}
      text-white
      font-bold
      text-sm
      tracking-wider
      shadow-lg
      w-44
      px-8
      py-2
      uppercase
      text-center
      whitespace-nowrap
    `}
              >
                {item.waktu_pelaksanaan}
              </div>

              <div
                className="
              px-4
              py-3
              bg-gradient-to-r
              from-sky-50
              to-cyan-50
              border-b
              border-sky-100
            "
              >
                <div className="flex flex-col items-start justify-between gap-4">
                  <PillCards
                    discipline={item.discipline}
                    type={item.type}
                    tag={item.tag_name}
                    unit={item.unit}
                  />
                  <div className="flex items-start gap-3 pr-24">
                    {item.photo?.[0] ? (
                      <img
                        src={pb.files.getURL(item, item.photo[0])}
                        alt={`${item.judul} cover`}
                        className="h-16 w-20 shrink-0 rounded-xl border border-sky-100 object-cover shadow-sm"
                      />
                    ) : (
                      <div className="flex h-16 w-20 shrink-0 items-center justify-center rounded-xl border border-dashed border-sky-200 bg-white/60 text-sky-300">
                        <ImageIcon size={22} />
                      </div>
                    )}

                    <div className="min-w-0">
                      <h2 className="truncate text-xl font-bold text-sky-900">
                        {item.judul}
                      </h2>

                      <p className="mt-1 line-clamp-2 flex flex-row text-sm text-sky-700">
                        <div className="font-bold mr-1">ISSUE : </div>
                        {item.issue}
                      </p>
                    </div>
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
              <div className="px-6 py-0">
                {/* FOOTER */}
                <div
                  className="
                my-3
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
                    <span>Created: {formatTimeAgo(item.created)}</span>

                    <span>Updated: {formatTimeAgo(item.updated)}</span>
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

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setDeletePhotoTarget({
                item: preview.item,
                fileName: previewPhotos[preview.index],
              });
            }}
            disabled={
              deletingPhoto?.itemId === preview.item.id &&
              deletingPhoto.fileName === previewPhotos[preview.index]
            }
            className="absolute right-20 top-4 rounded-full bg-red-600/90 p-3 text-white shadow-lg backdrop-blur hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:cursor-not-allowed disabled:opacity-70"
            aria-label="Delete current photo"
          >
            {deletingPhoto?.itemId === preview.item.id &&
            deletingPhoto.fileName === previewPhotos[preview.index] ? (
              <Loader2 size={22} className="animate-spin" />
            ) : (
              <Trash2 size={22} />
            )}
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

      {detailItem && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm"
          onClick={() => setDetailItem(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`${detailItem.judul} detail`}
        >
          <div
            className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-sky-100 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 border-b border-sky-100 bg-gradient-to-r from-sky-50 to-cyan-50 px-6 py-5">
              <button
                type="button"
                onClick={() => setDeleteTarget(detailItem)}
                disabled={deletingId === detailItem.id}
                className="absolute right-16 top-4 inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 shadow-sm transition-all hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label={`Delete ${detailItem.judul}`}
              >
                {deletingId === detailItem.id ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Trash2 size={16} />
                )}
                <span className="hidden sm:inline">
                  {deletingId === detailItem.id ? "Deleting..." : "Delete"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setDetailItem(null)}
                className="absolute right-4 top-4 rounded-full bg-white/80 p-2 text-slate-600 shadow-sm transition-all hover:bg-white focus:outline-none focus:ring-2 focus:ring-sky-300"
                aria-label="Close detail"
              >
                <X size={20} />
              </button>

              <div className="pr-28 sm:pr-40">
                <PillCards
                  discipline={detailItem.discipline}
                  type={detailItem.type}
                  tag={detailItem.tag_name}
                  unit={detailItem.unit}
                />

                <h2 className="mt-1 text-2xl font-bold text-sky-950">
                  {detailItem.judul}
                </h2>
                <p className="mt-1 text-sm leading-6 flex flex-row text-sky-700">
                  <div className="font-bold mr-1">ISSUE : </div>
                  {detailItem.issue || "-"}
                </p>

                <div className="mt-1 max-w-xl">
                  <div className="mb-0 flex items-center justify-between gap-2 text-[12px] font-semibold text-slate-500">
                    <span>Ref Nota Dinas, Notulen, etc</span>
                    {updatingReferenceId === detailItem.id && (
                      <span className="inline-flex items-center text-sky-600">
                        <Loader2 size={12} className="animate-spin" />
                        Saving...
                      </span>
                    )}
                  </div>

                  <input
                    type="text"
                    defaultValue={detailItem.reference || "-"}
                    onBlur={(event) =>
                      handleReferenceBlur(detailItem, event.currentTarget)
                    }
                    disabled={updatingReferenceId === detailItem.id}
                    className="h-7 w-full border-0 bg-transparent px-0 py-0 text-[12px] leading-6 text-slate-700 outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-70"
                    aria-label={`Edit reference for ${detailItem.judul}`}
                  />
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between text-sm font-semibold text-sky-700">
                    <span>Progress</span>
                    <span className="inline-flex items-center gap-1">
                      {updatingProgressId === detailItem.id && (
                        <Loader2 size={14} className="animate-spin" />
                      )}
                      {detailProgress}%
                    </span>
                  </div>
                  <div className="space-y-2">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={detailProgress}
                      onChange={(event) =>
                        setDetailProgressValue(Number(event.target.value))
                      }
                      onMouseUp={() =>
                        handleDetailProgressSave(detailItem, detailProgress)
                      }
                      onTouchEnd={() =>
                        handleDetailProgressSave(detailItem, detailProgress)
                      }
                      onBlur={() =>
                        handleDetailProgressSave(detailItem, detailProgress)
                      }
                      disabled={updatingProgressId === detailItem.id}
                      className="h-2 w-full cursor-pointer appearance-none rounded-full bg-sky-100 accent-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
                      style={{
                        background: `linear-gradient(to right, rgb(14 165 233) ${detailProgress}%, rgb(224 242 254) ${detailProgress}%)`,
                      }}
                    />
                    {updatingProgressId === detailItem.id && (
                      <p className="text-xs font-semibold text-sky-600">
                        Saving progress...
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-3 max-w-xl">
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <ImageIcon size={15} className="text-sky-600" />
                    <span>Photo Preview</span>
                  </div>

                  <input
                    id={`detail-photo-upload-${detailItem.id}`}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(event) => handlePhotoSelect(detailItem, event)}
                    className="hidden"
                  />

                  <div className="flex items-stretch gap-2">
                    <div className="min-w-0 flex-1">
                      {detailItem.photo && detailItem.photo.length > 0 ? (
                        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                          {detailItem.photo.slice(0, 6).map((photo, index) => {
                            const isDeletingThisPhoto =
                              deletingPhoto?.itemId === detailItem.id &&
                              deletingPhoto.fileName === photo;

                            return (
                              <div key={photo} className="group relative">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPreview({ item: detailItem, index })
                                  }
                                  className="w-full rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2"
                                  aria-label={`Open ${detailItem.judul} photo ${index + 1}`}
                                >
                                  <img
                                    src={pb.files.getURL(detailItem, photo)}
                                    alt={`${detailItem.judul} photo ${index + 1}`}
                                    className="h-14 w-full rounded-xl border border-sky-100 object-cover shadow-sm transition-all hover:scale-[1.02]"
                                  />
                                </button>

                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setDeletePhotoTarget({
                                      item: detailItem,
                                      fileName: photo,
                                    });
                                  }}
                                  disabled={isDeletingThisPhoto}
                                  className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-600/90 text-white shadow transition-all hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:cursor-not-allowed disabled:opacity-70"
                                  aria-label={`Delete ${detailItem.judul} photo ${index + 1}`}
                                >
                                  {isDeletingThisPhoto ? (
                                    <Loader2
                                      size={12}
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <Trash2 size={12} />
                                  )}
                                </button>

                                {index === 5 && detailItem.photo.length > 6 && (
                                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-slate-900/55 text-xs font-bold text-white">
                                    +{detailItem.photo.length - 6}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex h-14 items-center justify-center rounded-xl border border-dashed border-sky-200 bg-white/70 text-xs font-medium text-slate-400">
                          No Image
                        </div>
                      )}
                    </div>

                    <label
                      htmlFor={`detail-photo-upload-${detailItem.id}`}
                      aria-disabled={isDetailPhotoBusy}
                      className={`inline-flex h-14 w-24 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-sky-200 bg-white/80 px-2 text-center text-[11px] font-semibold text-sky-700 transition-all hover:bg-sky-50 ${
                        isDetailPhotoBusy
                          ? "pointer-events-none cursor-not-allowed opacity-60"
                          : "cursor-pointer"
                      }`}
                    >
                      {compressingId === detailItem.id ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Plus size={13} />
                      )}
                      {compressingId === detailItem.id
                        ? "Compressing..."
                        : detailItem.photo && detailItem.photo.length > 0
                          ? "Add Photo"
                          : "Select Photo"}
                    </label>
                  </div>

                  {compressingId === detailItem.id &&
                    detailPendingPhotos.length === 0 && (
                      <div className="mt-2 flex items-center gap-2 rounded-xl border border-sky-100 bg-white/70 px-3 py-2 text-xs font-medium text-sky-700">
                        <Loader2 size={13} className="animate-spin" />
                        Preparing compressed preview...
                      </div>
                    )}

                  {detailPendingPhotos.length > 0 && (
                    <div className="mt-2 rounded-xl border border-sky-100 bg-white/80 p-2">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold text-slate-600">
                          Preview before upload
                        </span>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => clearPendingPhotos(detailItem.id)}
                            disabled={isDetailPhotoBusy}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Clear
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUploadPhotos(detailItem)}
                            disabled={isDetailPhotoBusy}
                            className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-2 py-1 text-[11px] font-semibold text-white transition-all hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Upload size={13} />
                            {uploadingId === detailItem.id
                              ? "Uploading..."
                              : "Upload"}
                          </button>
                        </div>
                      </div>

                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {detailPendingPhotos.map((photo, idx) => (
                          <img
                            key={`${photo.previewUrl}-${idx}`}
                            src={photo.previewUrl}
                            alt={`Selected ${detailItem.judul} photo ${idx + 1}`}
                            className="h-14 w-20 shrink-0 rounded-lg border border-sky-100 object-cover"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6 p-6">
              <div className="rounded-3xl border border-sky-100 bg-sky-50/30 p-5">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-sky-950">
                      Timeline Pekerjaan
                    </h3>
                  </div>
                </div>

                <div className="space-y-4">
                  {detailLegacyTracking &&
                    detailTimelinePoints.length === 0 && (
                      <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
                        <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                          Legacy Tracking
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                          {detailLegacyTracking}
                        </p>
                      </div>
                    )}

                  {detailTimelinePoints.length === 0 &&
                  !detailLegacyTracking ? (
                    <div className="rounded-2xl border border-dashed border-sky-200 bg-white px-4 py-8 text-center text-sm font-medium text-slate-400">
                      No timeline point yet.
                    </div>
                  ) : (
                    detailTimelinePoints.map((point) => (
                      <div
                        key={point.id}
                        className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm"
                      >
                        <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                          {point.text}
                        </p>

                        {point.photos.length > 0 && (
                          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                            {point.photos.map((photo) => {
                              const photoIndex = detailItem.photo.findIndex(
                                (itemPhoto) => itemPhoto === photo,
                              );

                              return (
                                <button
                                  key={`${point.id}-${photo}`}
                                  type="button"
                                  onClick={() => {
                                    if (photoIndex >= 0) {
                                      setPreview({
                                        item: detailItem,
                                        index: photoIndex,
                                      });
                                    }
                                  }}
                                  className="rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2"
                                  aria-label="Open timeline photo"
                                >
                                  <img
                                    src={pb.files.getURL(detailItem, photo)}
                                    alt="Timeline photo"
                                    className="h-24 w-full rounded-xl border border-slate-200 object-cover transition-all hover:scale-[1.01]"
                                  />
                                </button>
                              );
                            })}
                          </div>
                        )}

                        <div className="mt-3 flex flex-col gap-1 border-t border-slate-100 pt-3 text-[10px]  italic font-medium text-slate-500 sm:flex-row sm:gap-4">
                          <span>
                            Created: {formatTimelineDate(point.createdAt)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-5 rounded-2xl border border-sky-100 bg-white p-4">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Timeline Point
                  </label>
                  <textarea
                    value={timelineDraftText}
                    onChange={(event) => {
                      setTimelineDraftText(event.target.value);
                      if (event.target.value.trim()) setTimelineError("");
                    }}
                    rows={3}
                    placeholder="Tulis update pekerjaan..."
                    className={`w-full resize-none rounded-2xl border px-4 py-3 text-sm text-slate-700 outline-none transition-all focus:ring-2 ${
                      timelineError
                        ? "border-red-300 bg-red-50/40 focus:ring-red-200"
                        : "border-sky-200 bg-sky-50/40 focus:ring-sky-300"
                    }`}
                    disabled={isTimelineBusy}
                  />
                  {timelineError && (
                    <p className="mt-1 text-xs font-semibold text-red-500">
                      {timelineError}
                    </p>
                  )}

                  <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        id={`timeline-photo-upload-${detailItem.id}`}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleTimelinePhotoSelect}
                        className="hidden"
                      />
                      <label
                        htmlFor={`timeline-photo-upload-${detailItem.id}`}
                        aria-disabled={isTimelineBusy}
                        className={`inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700 transition-all hover:bg-sky-100 ${
                          isTimelineBusy
                            ? "pointer-events-none cursor-not-allowed opacity-60"
                            : "cursor-pointer"
                        }`}
                      >
                        {timelineCompressingId === detailItem.id ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <Plus size={15} />
                        )}
                        {timelineCompressingId === detailItem.id
                          ? "Compressing..."
                          : " Image"}
                      </label>

                      {timelinePendingPhotos.length > 0 && (
                        <button
                          type="button"
                          onClick={clearTimelinePendingPhotos}
                          disabled={isTimelineBusy}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Clear Images
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleAddTimelinePoint}
                      disabled={isTimelineBusy}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {timelineSavingId === detailItem.id ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <Plus size={15} />
                      )}
                      {timelineSavingId === detailItem.id
                        ? "Adding..."
                        : "Add to Timeline"}
                    </button>
                  </div>

                  {timelinePendingPhotos.length > 0 && (
                    <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
                      {timelinePendingPhotos.map((photo, idx) => (
                        <img
                          key={`${photo.previewUrl}-${idx}`}
                          src={photo.previewUrl}
                          alt={`Timeline selected photo ${idx + 1}`}
                          className="h-24 w-36 shrink-0 rounded-xl border border-sky-100 object-cover"
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {deletePhotoTarget && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm photo delete"
        >
          <div className="w-full max-w-md rounded-3xl border border-red-100 bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-red-50 p-3 text-red-600">
                <Trash2 size={24} />
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Delete this photo?
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  This will permanently remove the selected photo from "
                  {deletePhotoTarget.item.judul}".
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletePhotoTarget(null)}
                disabled={
                  deletingPhoto?.itemId === deletePhotoTarget.item.id &&
                  deletingPhoto.fileName === deletePhotoTarget.fileName
                }
                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDeletePhoto}
                disabled={
                  deletingPhoto?.itemId === deletePhotoTarget.item.id &&
                  deletingPhoto.fileName === deletePhotoTarget.fileName
                }
                className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 size={16} />
                {deletingPhoto?.itemId === deletePhotoTarget.item.id &&
                deletingPhoto.fileName === deletePhotoTarget.fileName
                  ? "Deleting..."
                  : "Delete Photo"}
              </button>
            </div>
          </div>
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
