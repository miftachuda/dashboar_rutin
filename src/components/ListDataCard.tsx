import { useState, useRef, useEffect } from "react";
import imageCompression from "browser-image-compression";
import { format, formatDistanceToNow } from "date-fns";
import { pb } from "@/lib/pocketbase";
import { toast } from "sonner";
import { ListData } from "@/types/listdata";
import { WaktuPelaksanaan } from "@/types/enum";
import { sendNotif } from "@/lib/sendnotif";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Trash2,
  Pencil,
  Check,
  Plus,
  Upload,
  Image as ImageIcon,
  X,
  Send,
  Save,
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

export const getWaktuPelaksanaanRibbonClass = (value: string) => {
  switch (value.trim().toLowerCase()) {
    case "on stream":
      return "bg-green-100 text-green-700 border border-green-200";
    case "pit stop":
      return "bg-amber-100 text-amber-700 border border-amber-200";
    case "turn around":
      return "bg-red-100 text-red-700 border border-red-200";
    default:
      return "bg-slate-100 text-slate-700 border border-slate-200";
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

const typeMap: Record<string, string> = {
  "Valve": "Piping",
  "Pipeline": "Piping",
  "Heat Exchanger": "Heat Exchanger",
  "Vessel": "Vessel",
  "Pump": "Pump",
  "Compressor": "Compressor",
  "Motor": "Electrical",
  "Fin Fan": "Other",
  "Boardesk": "Other",
  "Transmitter": "Instrument",
  "Burner": "Furnace",
  "Flange": "Piping",
  "Liquid Trap": "Piping",
  "Furnace": "Furnace"
};

const disciplineMap: Record<string, string> = {
  "Valve": "Piping",
  "Pipeline": "Piping",
  "Heat Exchanger": "Heat Exchanger",
  "Vessel": "Vessel",
  "Pump": "Rotating",
  "Compressor": "Rotating",
  "Motor": "Electrical",
  "Fin Fan": "Rotating",
  "Boardesk": "Other",
  "Transmitter": "Instrument",
  "Burner": "Furnace",
  "Flange": "Piping",
  "Liquid Trap": "Piping",
  "Furnace": "Furnace"
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
  const [exportMenuTarget, setExportMenuTarget] = useState<ListData | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);

  const handleExport = async (item: ListData, target: "pitstop2027" | "turnaround2028") => {
    setExportMenuTarget(null);
    if (exportingId) return;
    setExportingId(item.id);
    const toastId = toast.loading(`Exporting to ${target === "pitstop2027" ? "Pitstop 2027" : "Turn Around 2028"}...`);
    
    try {
      const formData = new FormData();
      formData.append("unit", item.unit || "");
      formData.append("tag", item.tag_name || "-");
      formData.append("job", `${item.judul} (Issue : ${item.issue || "-"})`);
      
      const mappedType = item.type ? (typeMap[item.type] || "Other") : "Other";
      formData.append("type", mappedType);
      
      const mappedDiscipline = item.type ? (disciplineMap[item.type] || "Other") : "Other";
      formData.append("dicipline", mappedDiscipline);
      
      formData.append("priority", "medium");
      formData.append("assignee", "");
      formData.append("updatedCustom", new Date().toISOString());
      formData.append("steps", JSON.stringify([]));

      if (item.photo && item.photo.length > 0) {
        for (const photoName of item.photo) {
          try {
            const url = pb.files.getURL(item, photoName);
            const response = await fetch(url);
            if (!response.ok) throw new Error("Failed to fetch image");
            const blob = await response.blob();
            formData.append("photos", blob, photoName);
          } catch (err) {
            console.warn(`Failed to export photo ${photoName}`, err);
          }
        }
      }

      await pb.collection(target).create(formData);
      toast.success("Successfully exported!", { id: toastId });
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export.", { id: toastId });
    } finally {
      setExportingId(null);
    }
  };

  const [deletingPhoto, setDeletingPhoto] = useState<{
    itemId: string;
    fileName: string;
  } | null>(null);
  const [deletePhotoTarget, setDeletePhotoTarget] = useState<{
    item: ListData;
    fileName: string;
  } | null>(null);
  const [waktuPelaksanaanTarget, setWaktuPelaksanaanTarget] = useState<{
    item: ListData;
    nextValue: string;
  } | null>(null);
  const [redundanTarget, setRedundanTarget] = useState<{
    item: ListData;
    nextValue: string;
  } | null>(null);
  const [updatingRedundanId, setUpdatingRedundanId] = useState<string | null>(null);
  const [compressingId, setCompressingId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [updatingReferenceId, setUpdatingReferenceId] = useState<string | null>(
    null,
  );
  const [updatingWaktuPelaksanaanId, setUpdatingWaktuPelaksanaanId] = useState<
    string | null
  >(null);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState("");
  const [updatingTitleId, setUpdatingTitleId] = useState<string | null>(null);
  const [editingIssueId, setEditingIssueId] = useState<string | null>(null);
  const [issueDraft, setIssueDraft] = useState("");
  const [updatingIssueId, setUpdatingIssueId] = useState<string | null>(null);
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
      await sendNotif({
        title: "[Maintenance] Photo Uploaded",
        page: "tracking",
        message: `Photo uploaded for ${item.tag_name || item.judul}.`,
        action: "update",
        collection: "db_maintenance",
        record_id: item.id,
      });
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
        await sendNotif({
          title: "[Maintenance] Timeline Photo Uploaded",
          page: "tracking",
          message: `Timeline photo uploaded for ${detailItem.tag_name || detailItem.judul}.`,
          action: "update",
          collection: "db_maintenance",
          record_id: detailItem.id,
        });
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

      await sendNotif({
        title: "[Maintenance] Timeline Updated",
        page: "tracking",
        message: `Timeline updated for ${detailItem.tag_name || detailItem.judul}.`,
        action: "update",
        collection: "db_maintenance",
        record_id: detailItem.id,
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

      await sendNotif({
        title: "[Maintenance] Progress Updated",
        page: "tracking",
        message: `Progress updated for ${item.tag_name || item.judul}.`,
        action: "update",
        collection: "db_maintenance",
        record_id: item.id,
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
      await sendNotif({
        title: "[Maintenance] Reference Updated",
        page: "tracking",
        message: `Reference updated for ${item.tag_name || item.judul}.`,
        action: "update",
        collection: "db_maintenance",
        record_id: item.id,
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

  const startTitleEdit = (item: ListData) => {
    setEditingTitleId(item.id);
    setTitleDraft(item.judul || "");
  };

  const cancelTitleEdit = () => {
    setEditingTitleId(null);
    setTitleDraft("");
  };

  const handleTitleSave = async (item: ListData) => {
    const nextTitle = titleDraft.trim();

    if (!nextTitle) {
      alert("Title cannot be empty");
      return;
    }

    if (nextTitle === item.judul) {
      cancelTitleEdit();
      return;
    }

    try {
      setUpdatingTitleId(item.id);
      const updatedItem = await pb
        .collection("db_maintenance")
        .update(item.id, {
          judul: nextTitle,
        });

      await sendNotif({
        title: "[Maintenance] Title Updated",
        page: "tracking",
        message: `Title updated for ${item.tag_name || nextTitle}.`,
        action: "update",
        collection: "db_maintenance",
        record_id: item.id,
      });

      setDetailItem((current) =>
        current?.id === item.id
          ? {
              ...current,
              judul: updatedItem.judul ?? nextTitle,
              updated: updatedItem.updated ?? current.updated,
            }
          : current,
      );
      cancelTitleEdit();
      onDataChanged?.();
    } catch (error) {
      console.error(error);
      alert("Failed to update title");
    } finally {
      setUpdatingTitleId(null);
    }
  };

  const startIssueEdit = (item: ListData) => {
    setEditingIssueId(item.id);
    setIssueDraft(item.issue || "");
  };

  const cancelIssueEdit = () => {
    setEditingIssueId(null);
    setIssueDraft("");
  };

  const handleIssueSave = async (item: ListData) => {
    const nextIssue = issueDraft.trim();

    if (nextIssue === item.issue) {
      cancelIssueEdit();
      return;
    }

    try {
      setUpdatingIssueId(item.id);
      const updatedItem = await pb
        .collection("db_maintenance")
        .update(item.id, {
          issue: nextIssue,
        });

      await sendNotif({
        title: "[Maintenance] Issue Updated",
        page: "tracking",
        message: `Issue updated for ${item.tag_name || item.judul}.`,
        action: "update",
        collection: "db_maintenance",
        record_id: item.id,
      });

      setDetailItem((current) =>
        current?.id === item.id
          ? {
              ...current,
              issue: updatedItem.issue ?? nextIssue,
              updated: updatedItem.updated ?? current.updated,
            }
          : current,
      );
      cancelIssueEdit();
      onDataChanged?.();
    } catch (error) {
      console.error(error);
      alert("Failed to update issue");
    } finally {
      setUpdatingIssueId(null);
    }
  };

  const handleWaktuPelaksanaanChange = (
    item: ListData,
    nextWaktuPelaksanaan: string,
  ) => {
    if (
      nextWaktuPelaksanaan === item.waktu_pelaksanaan ||
      updatingWaktuPelaksanaanId === item.id
    ) {
      return;
    }

    setWaktuPelaksanaanTarget({ item, nextValue: nextWaktuPelaksanaan });
  };

  const handleConfirmWaktuPelaksanaanChange = async () => {
    if (!waktuPelaksanaanTarget) return;

    const { item, nextValue } = waktuPelaksanaanTarget;

    try {
      setUpdatingWaktuPelaksanaanId(item.id);
      const updatedItem = await pb
        .collection("db_maintenance")
        .update(item.id, {
          waktu_pelaksanaan: nextValue,
        });

      await sendNotif({
        title: "[Maintenance] Schedule Updated",
        page: "tracking",
        message: `Waktu pelaksanaan updated for ${item.tag_name || item.judul}.`,
        action: "update",
        collection: "db_maintenance",
        record_id: item.id,
      });

      setDetailItem((current) =>
        current?.id === item.id
          ? {
              ...current,
              waktu_pelaksanaan: updatedItem.waktu_pelaksanaan ?? nextValue,
              updated: updatedItem.updated ?? current.updated,
            }
          : current,
      );
      onDataChanged?.();
      setWaktuPelaksanaanTarget(null);
    } catch (error) {
      console.error(error);
      alert("Failed to update waktu pelaksanaan");
    } finally {
      setUpdatingWaktuPelaksanaanId(null);
    }
  };

  const handleRedundanChange = (
    item: ListData,
    nextRedundan: string,
  ) => {
    if (
      nextRedundan === item.redundan ||
      updatingRedundanId === item.id
    ) {
      return;
    }

    setRedundanTarget({ item, nextValue: nextRedundan });
  };

  const handleConfirmRedundanChange = async () => {
    if (!redundanTarget) return;

    const { item, nextValue } = redundanTarget;

    try {
      setUpdatingRedundanId(item.id);
      const updatedItem = await pb
        .collection("db_maintenance")
        .update(item.id, {
          redundan: nextValue,
        });

      await sendNotif({
        title: "[Maintenance] Redundancy Updated",
        page: "tracking",
        message: `Redundancy updated for ${item.tag_name || item.judul}.`,
        action: "update",
        collection: "db_maintenance",
        record_id: item.id,
      });

      setDetailItem((current) =>
        current?.id === item.id
          ? {
              ...current,
              redundan: nextValue,
              updated: updatedItem.updated ?? current.updated,
            }
          : current,
      );
      onDataChanged?.();
      setRedundanTarget(null);
    } catch (error) {
      console.error(error);
      alert("Failed to update redundancy");
    } finally {
      setUpdatingRedundanId(null);
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
      await sendNotif({
        title: "[Maintenance] Deleted",
        page: "tracking",
        message: `Maintenance record deleted for ${deleteTarget.tag_name || deleteTarget.judul}.`,
        action: "soft_delete",
        collection: "db_maintenance",
        record_id: deleteTarget.id,
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
      await sendNotif({
        title: "[Maintenance] Photo Deleted",
        page: "tracking",
        message: `Photo deleted for ${item.tag_name || item.judul}.`,
        action: "update",
        collection: "db_maintenance",
        record_id: item.id,
      });
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
          const needsRedGlow = item.redundan === "n+0" && progress < 100;

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
              className={`relative w-full cursor-pointer overflow-hidden rounded-2xl border bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-offset-2 ${
                needsRedGlow ? "z-10 border-red-400" : "border-sky-100"
              }`}
            >
              {needsRedGlow && (
                <div className="pointer-events-none absolute inset-0 z-20 rounded-2xl shadow-[inset_0_0_25px_rgba(239,68,68,0.3)] ring-1 ring-inset ring-red-400/50" />
              )}
              <div
                className={`px-3 py-2 ${
                  needsRedGlow
                    ? "bg-gradient-to-r from-red-50 to-orange-50"
                    : "bg-gradient-to-r from-sky-50 to-cyan-50"
                }`}
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    {item.photo?.[0] ? (
                      <img
                        src={pb.files.getURL(item, item.photo[0])}
                        alt={`${item.judul} cover`}
                        className="h-12 w-16 shrink-0 rounded-xl border border-sky-100 object-cover shadow-sm"
                      />
                    ) : (
                      <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded-xl border border-dashed border-sky-200 bg-white/60 text-sky-300">
                        <ImageIcon size={18} />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <PillCards
                          discipline={item.discipline}
                          type={item.type}
                          tag={item.tag_name}
                          unit={item.unit}
                        />
                        <span
                          className={`rounded-full ${ribbonColorClass} px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide shadow-sm`}
                        >
                          {item.waktu_pelaksanaan}
                        </span>
                        {item.redundan && item.redundan !== "none" && (
                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide shadow-sm ${
                              item.redundan === "n+0" 
                                ? "bg-red-500 text-white" 
                                : "bg-emerald-500 text-white"
                            }`}
                          >
                            {item.redundan}
                          </span>
                        )}
                      </div>

                      <div className="mt-1 flex min-w-0 items-baseline gap-2">
                        <div className="flex min-w-0 items-baseline gap-2">
                          <h2 className="min-w-0 shrink truncate text-base font-bold text-sky-900">
                            {item.judul}
                          </h2>
                          <span className="shrink-0 text-xs font-semibold text-sky-500">
                            -
                          </span>
                          <p className="min-w-0 flex-1 truncate text-xs italic text-sky-700">
                            <span className="font-semibold not-italic">
                              ISSUE :
                            </span>{" "}
                            {item.issue || "-"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex w-full shrink-0 flex-col gap-1 md:w-56 md:items-end">
                    <div className="flex w-full items-center gap-2 md:justify-end">
                      <div className="min-w-0 flex-1 md:w-36 md:flex-none">
                        <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-sky-700">
                          <span>Progress</span>
                          <span>{progress}%</span>
                        </div>

                        <div className="h-1.5 overflow-hidden rounded-full bg-sky-100">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-500 transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                      
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setExportMenuTarget(item); }}
                          disabled={exportingId === item.id}
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-sky-200 bg-sky-50 text-sky-600 transition-all hover:bg-sky-100 focus:outline-none focus:ring-2 focus:ring-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
                          title="Export"
                        >
                          {exportingId === item.id ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setDeleteTarget(item); }}
                          disabled={deletingId === item.id}
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600 transition-all hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:cursor-not-allowed disabled:opacity-60"
                          aria-label={`Delete ${item.judul}`}
                        >
                          {deletingId === item.id ? (
                            <Loader2 size={15} className="animate-spin" />
                          ) : (
                            <Trash2 size={15} />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="text-right text-[10px] font-medium leading-4 text-slate-400">
                      Created: {formatTimeAgo(item.created)} | Updated:{" "}
                      {formatTimeAgo(item.updated)}
                    </div>
                  </div>
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
          className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 px-2 py-3 backdrop-blur-sm sm:px-4 sm:py-6"
          role="dialog"
          aria-modal="true"
          aria-label={`${detailItem.judul} detail`}
        >
          <div
            className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-sky-100 bg-white shadow-2xl sm:max-h-[90vh] sm:rounded-3xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 border-b border-sky-100 bg-gradient-to-r from-sky-50 to-cyan-50 px-4 py-4 sm:px-6 sm:py-5">
              <div className="mb-3 flex flex-wrap items-center gap-2 pr-10 sm:absolute sm:right-16 sm:top-4 sm:mb-0 sm:pr-0">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(detailItem)}
                  disabled={deletingId === detailItem.id}
                  className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 shadow-sm transition-all hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:cursor-not-allowed disabled:opacity-60"
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
              </div>

              <button
                type="button"
                onClick={() => setDetailItem(null)}
                className="absolute right-4 top-4 rounded-full bg-white/80 p-2 text-slate-600 shadow-sm transition-all hover:bg-white focus:outline-none focus:ring-2 focus:ring-sky-300"
                aria-label="Close detail"
              >
                <X size={20} />
              </button>

              <div className="sm:pr-24">
                <div className="flex flex-wrap items-center gap-2">
                  <PillCards
                    discipline={detailItem.discipline}
                    type={detailItem.type}
                    tag={detailItem.tag_name}
                    unit={detailItem.unit}
                  />
                  <div className="flex items-center gap-1">
                    <select
                      value={detailItem.redundan || "none"}
                      onChange={(event) =>
                        handleRedundanChange(
                          detailItem,
                          event.currentTarget.value,
                        )
                      }
                      disabled={updatingRedundanId === detailItem.id}
                      className={`h-6 cursor-pointer rounded-full border py-0 pl-2.5 pr-6 text-[10px] font-bold uppercase tracking-wide shadow-sm outline-none transition-all focus:ring-2 focus:ring-sky-300 disabled:cursor-not-allowed disabled:opacity-70 ${
                        detailItem.redundan === "n+0"
                          ? "border-red-400 bg-red-500 text-white"
                          : "border-slate-200 bg-slate-100 text-slate-500"
                      }`}
                      aria-label={`Edit redundancy for ${detailItem.judul}`}
                    >
                      {["none", "n+0"].map((item) => (
                        <option key={item} value={item} className="bg-white text-slate-700">
                          {item}
                        </option>
                      ))}
                    </select>
                    {updatingRedundanId === detailItem.id && (
                      <Loader2 size={14} className="animate-spin text-sky-600" />
                    )}
                  </div>
                </div>

                {editingTitleId === detailItem.id ? (
                  <div className="mt-2 max-w-2xl space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">
                      Editing title
                    </p>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <input
                        type="text"
                        value={titleDraft}
                        onChange={(event) => setTitleDraft(event.target.value)}
                        disabled={updatingTitleId === detailItem.id}
                        className="min-w-0 flex-1 rounded-2xl border border-sky-200 bg-white px-4 py-3 text-xl font-bold text-sky-950 outline-none focus:ring-2 focus:ring-sky-300 disabled:cursor-not-allowed disabled:opacity-70 sm:text-2xl"
                        aria-label={`Edit title for ${detailItem.judul}`}
                      />
                      <select
                        value={detailItem.waktu_pelaksanaan}
                        onChange={(event) =>
                          handleWaktuPelaksanaanChange(
                            detailItem,
                            event.currentTarget.value,
                          )
                        }
                        disabled={updatingWaktuPelaksanaanId === detailItem.id}
                        className="h-9 rounded-full border border-sky-200 bg-white/90 px-3 text-xs font-semibold text-slate-700 shadow-sm outline-none transition-all focus:ring-2 focus:ring-sky-300 disabled:cursor-not-allowed disabled:opacity-70"
                        aria-label={`Edit waktu pelaksanaan for ${detailItem.judul}`}
                      >
                        {WaktuPelaksanaan.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                      {updatingWaktuPelaksanaanId === detailItem.id && (
                        <Loader2
                          size={16}
                          className="animate-spin text-sky-600"
                        />
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleTitleSave(detailItem)}
                        disabled={updatingTitleId === detailItem.id}
                        className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {updatingTitleId === detailItem.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Check size={14} />
                        )}
                        {updatingTitleId === detailItem.id
                          ? "Saving..."
                          : "Save Title"}
                      </button>
                      <button
                        type="button"
                        onClick={cancelTitleEdit}
                        disabled={updatingTitleId === detailItem.id}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm transition-all hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-bold text-sky-950 sm:text-2xl">
                      {detailItem.judul}
                    </h2>
                    <button
                      type="button"
                      onClick={() => startTitleEdit(detailItem)}
                      className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/80 text-sky-600 shadow-sm transition-all hover:bg-sky-50 focus:outline-none focus:ring-2 focus:ring-sky-300"
                      aria-label={`Edit title for ${detailItem.judul}`}
                    >
                      <Pencil size={15} />
                    </button>
                    <select
                      value={detailItem.waktu_pelaksanaan}
                      onChange={(event) =>
                        handleWaktuPelaksanaanChange(
                          detailItem,
                          event.currentTarget.value,
                        )
                      }
                      disabled={updatingWaktuPelaksanaanId === detailItem.id}
                      className="h-8 rounded-full border border-sky-200 bg-white/90 px-3 text-xs font-semibold text-slate-700 shadow-sm outline-none transition-all focus:ring-2 focus:ring-sky-300 disabled:cursor-not-allowed disabled:opacity-70"
                      aria-label={`Edit waktu pelaksanaan for ${detailItem.judul}`}
                    >
                      {WaktuPelaksanaan.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                    {updatingWaktuPelaksanaanId === detailItem.id && (
                      <Loader2 size={16} className="animate-spin text-sky-600" />
                    )}
                  </div>
                )}

                {editingIssueId === detailItem.id ? (
                  <div className="mt-3 max-w-2xl space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">
                      Editing issue
                    </p>
                    <textarea
                      value={issueDraft}
                      onChange={(event) => setIssueDraft(event.target.value)}
                      disabled={updatingIssueId === detailItem.id}
                      rows={3}
                      className="w-full resize-none rounded-2xl border border-sky-200 bg-white px-4 py-3 text-sm leading-6 text-sky-700 outline-none focus:ring-2 focus:ring-sky-300 disabled:cursor-not-allowed disabled:opacity-70"
                      aria-label={`Edit issue for ${detailItem.judul}`}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleIssueSave(detailItem)}
                        disabled={updatingIssueId === detailItem.id}
                        className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {updatingIssueId === detailItem.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Check size={14} />
                        )}
                        {updatingIssueId === detailItem.id
                          ? "Saving..."
                          : "Save Issue"}
                      </button>
                      <button
                        type="button"
                        onClick={cancelIssueEdit}
                        disabled={updatingIssueId === detailItem.id}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm transition-all hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-1 flex flex-col gap-1 text-sm leading-6 text-sky-700 sm:flex-row sm:items-start">
                    <div className="mr-1 font-bold">ISSUE : </div>
                    <div className="flex min-w-0 flex-1 items-start gap-2">
                      <span className="min-w-0 break-words">
                        {detailItem.issue || "-"}
                      </span>
                      <button
                        type="button"
                        onClick={() => startIssueEdit(detailItem)}
                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/80 text-sky-600 shadow-sm transition-all hover:bg-sky-50 focus:outline-none focus:ring-2 focus:ring-sky-300"
                        aria-label={`Edit issue for ${detailItem.judul}`}
                      >
                        <Pencil size={13} />
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-1 flex max-w-xl flex-col gap-1 text-[12px] sm:flex-row sm:items-center sm:gap-3">
                  <div className="flex shrink-0 items-center gap-2 font-semibold text-slate-500">
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
                    className="h-7 min-w-0 flex-1 border-0 bg-transparent px-0 py-0 text-[12px] leading-6 text-slate-700 outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-70"
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

      {waktuPelaksanaanTarget && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm waktu pelaksanaan change"
        >
          <div className="w-full max-w-md rounded-3xl border border-sky-100 bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-sky-50 p-3 text-sky-600">
                <Loader2
                  size={24}
                  className={
                    updatingWaktuPelaksanaanId ===
                    waktuPelaksanaanTarget.item.id
                      ? "animate-spin"
                      : ""
                  }
                />
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Change waktu pelaksanaan?
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  This will change from{" "}
                  <span className="font-semibold text-slate-900">
                    {waktuPelaksanaanTarget.item.waktu_pelaksanaan}
                  </span>{" "}
                  to{" "}
                  <span className="font-semibold text-slate-900">
                    {waktuPelaksanaanTarget.nextValue}
                  </span>
                  .
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setWaktuPelaksanaanTarget(null)}
                disabled={
                  updatingWaktuPelaksanaanId === waktuPelaksanaanTarget.item.id
                }
                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmWaktuPelaksanaanChange}
                disabled={
                  updatingWaktuPelaksanaanId === waktuPelaksanaanTarget.item.id
                }
                className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {updatingWaktuPelaksanaanId ===
                  waktuPelaksanaanTarget.item.id && (
                  <Loader2 size={16} className="animate-spin" />
                )}
                {updatingWaktuPelaksanaanId === waktuPelaksanaanTarget.item.id
                  ? "Saving..."
                  : "Change"}
              </button>
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

        {exportMenuTarget && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label="Export item"
          >
            <div className="w-full max-w-md rounded-3xl border border-sky-100 bg-white p-6 shadow-2xl">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-sky-50 p-3 text-sky-600">
                  <Send size={24} />
                </div>

                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Export Item
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Where would you like to export "{exportMenuTarget.judul}"?
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => handleExport(exportMenuTarget, "pitstop2027")}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-sky-700"
                >
                  <Send size={16} />
                  Export to Pitstop 2027
                </button>
                <button
                  type="button"
                  onClick={() => handleExport(exportMenuTarget, "turnaround2028")}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-sky-700"
                >
                  <Send size={16} />
                  Export to Turn Around 2028
                </button>
                <button
                  type="button"
                  onClick={() => setExportMenuTarget(null)}
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      {redundanTarget && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
            onClick={() => setRedundanTarget(null)}
          />
          <div className="relative w-full max-w-md rounded-3xl border border-sky-100 bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-sky-50 p-3 text-sky-600">
                <Save size={24} />
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Confirm Update
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Are you sure you want to change redundancy for{" "}
                  <span className="font-semibold text-sky-900">
                    {redundanTarget.item.judul}
                  </span>{" "}
                  from{" "}
                  <span className="font-semibold text-sky-900">
                    {redundanTarget.item.redundan || "none"}
                  </span>{" "}
                  to{" "}
                  <span className="font-semibold text-sky-900">
                    {redundanTarget.nextValue}
                  </span>
                  ?
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setRedundanTarget(null)}
                disabled={updatingRedundanId === redundanTarget.item.id}
                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmRedundanChange}
                disabled={updatingRedundanId === redundanTarget.item.id}
                className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {updatingRedundanId === redundanTarget.item.id ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Confirm Update"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
