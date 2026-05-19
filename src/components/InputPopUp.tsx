import { useState } from "react";
import {
  X,
  Save,
  Wrench,
  Building2,
  Tag,
  FileText,
  CalendarDays,
} from "lucide-react";
import PocketBase from "pocketbase";

const pb = new PocketBase("http://127.0.0.1:8090");

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
};
import { WaktuPelaksanaan } from "@/types/enum";
export default function AddMaintenanceModal({ open, onClose, onSaved }: Props) {
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    judul: "",
    issue: "",
    discipline: "",
    type: "",
    unit: "",
    tag_name: "",
    reference: "-",
    waktu_pelaksanaan: "Rutin" as (typeof WaktuPelaksanaan)[number],
    last_update: "",
    tracking: "",
  });

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  async function handleSave() {
    try {
      setSaving(true);

      await pb.collection("db_maintenance").create({
        ...formData,
      });

      onSaved?.();
      onClose();

      setFormData({
        judul: "",
        issue: "",
        discipline: "",
        type: "",
        unit: "",
        tag_name: "",
        reference: "-",
        waktu_pelaksanaan: "Rutin",
        last_update: "",
        tracking: "",
      });
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
  const [WPSelect, setWPSelect] = useState("Rutin");

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
            <h2 className="text-2xl font-bold text-sky-900">
              Create Tracking Data
            </h2>

            <p className="text-sm text-sky-700 mt-1">
              Create new maintenance tracking entry
            </p>
          </div>

          <button
            onClick={onClose}
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
            <InputField
              icon={<FileText size={18} />}
              label="Judul"
              name="judul"
              value={formData.judul}
              onChange={handleChange}
            />

            <InputField
              icon={<Building2 size={18} />}
              label="Discipline"
              name="discipline"
              value={formData.discipline}
              onChange={handleChange}
            />

            <InputField
              icon={<Wrench size={18} />}
              label="Type"
              name="type"
              value={formData.type}
              onChange={handleChange}
            />

            <InputField
              icon={<Tag size={18} />}
              label="Tag Name"
              name="tag_name"
              value={formData.tag_name}
              onChange={handleChange}
            />

            <InputField
              icon={<CalendarDays size={18} />}
              label="Unit"
              name="unit"
              value={formData.unit}
              onChange={handleChange}
            />

            {/* SELECT */}
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 block">
                Waktu Pelaksanaan
              </label>

              <select
                name="waktu_pelaksanaan"
                value={WPSelect}
                onChange={(e) =>
                  setWPSelect(
                    e.target.value as (typeof WaktuPelaksanaan)[number],
                  )
                }
                className="
                  w-full
                  rounded-2xl
                  border
                  border-sky-200
                  bg-sky-50/40
                  px-4
                  py-3
                  outline-none
                  focus:ring-2
                  focus:ring-sky-300
                "
              >
                {waktuTypes.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
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
              className="
                w-full
                rounded-2xl
                border
                border-sky-200
                bg-sky-50/30
                px-4
                py-3
                outline-none
                resize-none
                focus:ring-2
                focus:ring-sky-300
              "
            />
          </div>

          {/* REFERENCE */}
          <div>
            <label className="text-sm font-semibold text-slate-700 mb-2 block">
              Reference
            </label>

            <input
              type="text"
              name="reference"
              value={formData.reference}
              onChange={handleChange}
              className="
                w-full
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

          {/* IMAGE PLACEHOLDER */}
          <div>
            <label className="text-sm font-semibold text-slate-700 mb-3 block">
              Documentation Images
            </label>

            <div
              className="
                h-52
                rounded-3xl
                border-2
                border-dashed
                border-sky-200
                bg-sky-50/30
                flex
                flex-col
                items-center
                justify-center
                text-slate-400
              "
            >
              <p className="font-medium">Upload Section</p>

              <span className="text-sm mt-1">
                Add PocketBase image upload later
              </span>
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
            onClick={onClose}
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
            disabled={saving}
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
}: {
  icon: React.ReactNode;
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
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
        className="
          w-full
          rounded-2xl
          border
          border-sky-200
          bg-sky-50/30
          px-4
          py-3
          outline-none
          focus:ring-2
          focus:ring-sky-300
          transition-all
        "
      />
    </div>
  );
}
