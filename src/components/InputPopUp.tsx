import { useState } from "react";
import imageCompression from "browser-image-compression";
import {
  X,
  Save,
  Wrench,
  Building2,
  Tag,
  FileText,
  CalendarDays,
  Image as ImageIcon,
  Loader2,
  Plus,
} from "lucide-react";
import { WaktuPelaksanaan } from "@/types/enum";
import { pb } from "@/lib/pocketbase";

const disciplineOptions = [
  "Rotating",
  "Stationary",
  "Instrument",
  "Electrical",
];
const unitOptions = ["002", "021", "022", "023", "024", "025", "041"];
const typeOptions = [
  "Valve",
  "Pipeline",
  "Heat Exchanger",
  "Vessel",
  "Pump",
  "Compressor",
  "Motor",
  "Fin Fan",
  "Boardesk",
  "Transmitter",
  "Burner",
  "Flange",
];

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
};

type PendingPhoto = {
  file: File;
  previewUrl: string;
};

const createInitialFormData = () => ({
  judul: "",
  issue: "",
  discipline: "",
  type: "",
  unit: "",
  tag_name: "",
  reference: "-",
  waktu_pelaksanaan: "",
  last_update: "",
  tracking: "",
  isDeleted: false,
});

const requiredFields = [
  "unit",
  "tag_name",
  "judul",
  "discipline",
  "type",
  "waktu_pelaksanaan",
  "issue",
] as const;

const getFieldStateClass = (hasError: boolean, background = "bg-sky-50/40") =>
  hasError
    ? "border-red-400 bg-red-50/40 focus:ring-red-300"
    : `border-sky-200 ${background} focus:ring-sky-300`;

const FieldError = ({ show }: { show: boolean }) =>
  show ? (
    <p className="mt-1 text-xs font-semibold text-red-500">
      This field is required.
    </p>
  ) : null;

const waitForNextPaint = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

export default function InputPopUp({ open, onClose, onSaved }: Props) {
  const [saving, setSaving] = useState(false);
  const [compressingPhotos, setCompressingPhotos] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
  const [formData, setFormData] = useState(createInitialFormData);

  const clearPendingPhotos = () => {
    setPendingPhotos((current) => {
      current.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
      return [];
    });
  };

  const removePendingPhoto = (previewUrl: string) => {
    setPendingPhotos((current) => {
      const target = current.find((photo) => photo.previewUrl === previewUrl);
      if (target) URL.revokeObjectURL(target.previewUrl);

      return current.filter((photo) => photo.previewUrl !== previewUrl);
    });
  };

  const handleClose = () => {
    clearPendingPhotos();
    setFieldErrors({});
    onClose();
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;

    setFormData({
      ...formData,
      [name]: value,
    });

    setFieldErrors((current) => ({
      ...current,
      [name]: value.trim() === "",
    }));
  };

  const handlePhotoSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    try {
      setCompressingPhotos(true);
      await waitForNextPaint();

      for (const file of files) {
        const compressedFile = await imageCompression(file, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1600,
          useWebWorker: true,
        });

        setPendingPhotos((current) => [
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
      alert("Failed to compress image");
    } finally {
      setCompressingPhotos(false);
      event.target.value = "";
    }
  };

  async function handleSave() {
    const nextFieldErrors = requiredFields.reduce<Record<string, boolean>>(
      (errors, field) => {
        errors[field] = formData[field].trim() === "";
        return errors;
      },
      {},
    );

    if (Object.values(nextFieldErrors).some(Boolean)) {
      setFieldErrors(nextFieldErrors);
      return;
    }

    try {
      setSaving(true);

      const dataToSave = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        dataToSave.append(key, String(value));
      });
      pendingPhotos.forEach((photo) => {
        dataToSave.append("photo", photo.file, photo.file.name);
      });

      await pb.collection("db_maintenance").create(dataToSave);

      onSaved?.();
      onClose();

      setFormData(createInitialFormData());
      setFieldErrors({});
      clearPendingPhotos();
    } catch (err) {
      console.error(err);
      alert("Failed to save data");
    } finally {
      setSaving(false);
    }
  }

  const waktuTypes: typeof WaktuPelaksanaan = [
    "Rutin",
    "Pit Stop",
    "Turn Around",
  ];

  if (!open) return null;

  return (
    <div
      className="
        fixed
        inset-0
        z-50
        bg-black/40
        backdrop-blur-sm
        flex
        items-center
        justify-center
        p-4
      "
    >
      <div
        className="
          w-full
          max-w-4xl
          max-h-[95vh]
          overflow-y-auto
          rounded-3xl
          bg-white
          shadow-2xl
          border
          border-sky-100
        "
      >
        {/* HEADER */}
        <div
          className="
            sticky
            top-0
            z-10
            bg-gradient-to-r
            from-sky-50
            to-cyan-50
            border-b
            border-sky-100
            px-6
            py-5
            flex
            items-center
            justify-between
          "
        >
          <div>
            <h2 className="text-2xl font-bold text-sky-900">Create Record</h2>

            <p className="text-sm text-sky-700 mt-1">
              Create new maintenance record entry
            </p>
          </div>

          <button
            onClick={handleClose}
            className="
              w-10
              h-10
              rounded-full
              bg-white
              border
              border-sky-200
              flex
              items-center
              justify-center
              text-sky-700
              hover:bg-sky-50
              transition-all
            "
          >
            <X size={18} />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 space-y-6">
          {/* TOP GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <span className="text-sky-600">
                  <CalendarDays size={18} />
                </span>
                Unit
              </label>

              <select
                name="unit"
                value={formData.unit}
                onChange={handleChange}
                className={`
                  w-full
                  rounded-2xl
                  border
                  ${getFieldStateClass(fieldErrors.unit)}
                  px-4
                  py-3
                  outline-none
                  focus:ring-2
                  transition-all
                `}
              >
                <option value="" disabled>
                  Select unit
                </option>
                {unitOptions.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
              <FieldError show={fieldErrors.unit} />
            </div>
            <InputField
              icon={<Tag size={18} />}
              label="Tag Name"
              name="tag_name"
              value={formData.tag_name}
              onChange={handleChange}
              hasError={fieldErrors.tag_name}
            />
            <InputField
              icon={<FileText size={18} />}
              label="Judul"
              name="judul"
              value={formData.judul}
              onChange={handleChange}
              hasError={fieldErrors.judul}
            />

            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <span className="text-sky-600">
                  <Building2 size={18} />
                </span>
                Discipline
              </label>

              <select
                name="discipline"
                value={formData.discipline}
                onChange={handleChange}
                className={`
                  w-full
                  rounded-2xl
                  border
                  ${getFieldStateClass(fieldErrors.discipline)}
                  px-4
                  py-3
                  outline-none
                  focus:ring-2
                  transition-all
                `}
              >
                <option value="" disabled>
                  Select discipline
                </option>
                {disciplineOptions.map((discipline) => (
                  <option key={discipline} value={discipline}>
                    {discipline}
                  </option>
                ))}
              </select>
              <FieldError show={fieldErrors.discipline} />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <span className="text-sky-600">
                  <Wrench size={18} />
                </span>
                Equipment Type
              </label>

              <input
                type="text"
                list="type-options"
                name="type"
                value={formData.type}
                onChange={handleChange}
                placeholder="Select or input Equipment type"
                className={`
                  w-full
                  rounded-2xl
                  border
                  ${getFieldStateClass(fieldErrors.type, "bg-sky-50/30")}
                  px-4
                  py-3
                  outline-none
                  focus:ring-2
                  transition-all
                `}
              />
              <FieldError show={fieldErrors.type} />
              <datalist id="type-options">
                {typeOptions.map((type) => (
                  <option key={type} value={type} />
                ))}
              </datalist>
            </div>

            {/* SELECT */}
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 block">
                Waktu Pelaksanaan
              </label>

              <select
                name="waktu_pelaksanaan"
                value={formData.waktu_pelaksanaan}
                onChange={handleChange}
                className={`
                  w-full
                  rounded-2xl
                  border
                  ${getFieldStateClass(fieldErrors.waktu_pelaksanaan)}
                  px-4
                  py-3
                  outline-none
                  focus:ring-2
                `}
              >
                <option value="" disabled>
                  Select waktu pelaksanaan
                </option>
                {waktuTypes.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <FieldError show={fieldErrors.waktu_pelaksanaan} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="w-56 shrink-0 text-sm font-semibold text-slate-700">
              Reference Nota Dinas, Notulen , etc
            </label>

            <input
              type="text"
              name="reference"
              value={formData.reference}
              onChange={handleChange}
              className="
                min-w-0
                flex-1
                rounded-2xl
                border
                border-sky-200
                bg-sky-50/30
                px-4
                py-3
                outline-none
                focus:ring-2
                focus:ring-sky-300
              "
            />
          </div>
          {/* ISSUE */}
          <div>
            <label className="text-sm font-semibold text-slate-700 mb-2 block">
              Issue Description
            </label>

            <textarea
              name="issue"
              value={formData.issue}
              onChange={handleChange}
              rows={5}
              placeholder="Describe the issue..."
              className={`
                w-full
                rounded-2xl
                border
                ${getFieldStateClass(fieldErrors.issue, "bg-sky-50/30")}
                px-4
                py-3
                outline-none
                resize-none
                focus:ring-2
              `}
            />
            <FieldError show={fieldErrors.issue} />
          </div>

          {/* REFERENCE */}

          <div>
            <label className="text-sm font-semibold text-slate-700 mb-3 block">
              Photos
            </label>

            <div className="rounded-3xl border-2 border-dashed border-sky-200 bg-sky-50/30 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3 text-slate-500">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-sky-500 shadow-sm">
                    <ImageIcon size={22} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">
                      Upload image documentation
                    </p>
                    <p className="text-xs text-slate-500">
                      Images are compressed before being uploaded.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <input
                    id="create-photo-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                  <label
                    htmlFor="create-photo-upload"
                    aria-disabled={saving || compressingPhotos}
                    className={`inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-white px-3 py-2 text-xs font-semibold text-sky-700 transition-all hover:bg-sky-50 ${
                      saving || compressingPhotos
                        ? "pointer-events-none cursor-not-allowed opacity-60"
                        : "cursor-pointer"
                    }`}
                  >
                    {compressingPhotos ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Plus size={15} />
                    )}
                    {compressingPhotos
                      ? "Compressing..."
                      : pendingPhotos.length > 0
                        ? "Add Photos"
                        : "Select Photos"}
                  </label>
                </div>
              </div>

              {pendingPhotos.length > 0 ? (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {pendingPhotos.map((photo, idx) => (
                    <div
                      key={`${photo.previewUrl}-${idx}`}
                      className="relative"
                    >
                      <img
                        src={photo.previewUrl}
                        alt={`Selected documentation ${idx + 1}`}
                        className="h-28 w-full rounded-2xl border border-sky-100 object-cover shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={() => removePendingPhoto(photo.previewUrl)}
                        disabled={saving || compressingPhotos}
                        className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-red-600/90 text-white shadow-lg transition-all hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:cursor-not-allowed disabled:opacity-60"
                        aria-label={`Remove selected photo ${idx + 1}`}
                      >
                        <X size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 flex h-28 items-center justify-center rounded-2xl border border-dashed border-sky-200 bg-white/60 text-sm font-medium text-slate-400">
                  No images selected
                </div>
              )}
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div
          className="
            sticky
            bottom-0
            bg-white
            border-t
            border-slate-100
            px-6
            py-4
            flex
            justify-end
            gap-3
          "
        >
          <button
            onClick={handleClose}
            className="
              px-5
              py-3
              rounded-2xl
              border
              border-slate-200
              text-slate-600
              hover:bg-slate-50
              transition-all
            "
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={saving || compressingPhotos}
            className="
              px-6
              py-3
              rounded-2xl
              bg-gradient-to-r
              from-sky-500
              to-cyan-500
              text-white
              font-semibold
              shadow-lg
              hover:scale-[1.02]
              transition-all
              flex
              items-center
              gap-2
              disabled:opacity-50
            "
          >
            <Save size={18} />

            {saving ? "Saving..." : "Save Data"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* REUSABLE INPUT */
function InputField({
  icon,
  label,
  name,
  value,
  onChange,
  hasError,
}: {
  icon: React.ReactNode;
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  hasError: boolean;
}) {
  return (
    <div>
      <label className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <span className="text-sky-600">{icon}</span>

        {label}
      </label>

      <input
        type="text"
        name={name}
        value={value}
        onChange={onChange}
        className={`
          w-full
          rounded-2xl
          border
          ${getFieldStateClass(hasError, "bg-sky-50/30")}
          px-4
          py-3
          outline-none
          focus:ring-2
          transition-all
        `}
      />
      <FieldError show={hasError} />
    </div>
  );
}
