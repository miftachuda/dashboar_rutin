import { pb } from "@/lib/pocketbase";
import { ListData } from "@/types/listdata";
import {
  CalendarDays,
  Tag,
  Wrench,
  Building2,
  Image as ImageIcon,
} from "lucide-react";

export default function MaintenanceCardList({ data }: { data: ListData[] }) {
  return (
    <div className="flex flex-col gap-5">
      {data.map((item) => (
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
                <h2 className="text-xl font-bold text-sky-900">{item.judul}</h2>

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
                Reference
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
              <div className="flex items-center gap-2 mb-3">
                <ImageIcon size={18} className="text-sky-600" />

                <h3 className="font-semibold text-slate-800">Photo</h3>
              </div>

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
                    <img
                      key={idx}
                      src={pb.files.getURL(item, img)}
                      alt={`doc-${idx}`}
                      className="
    w-72
    h-48
    object-cover
    rounded-2xl
    border
    border-slate-200
    shrink-0
    hover:scale-[1.02]
    transition-all
  "
                    />
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
            </div>

            {/* FOOTER */}
            <div
              className="
                mt-6
                pt-4
                border-t
                border-slate-100
                flex
                justify-between
                items-center
                text-xs
                text-slate-500
              "
            >
              <span>Created: {new Date(item.created).toLocaleString()}</span>

              <span>Updated: {new Date(item.updated).toLocaleString()}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
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
