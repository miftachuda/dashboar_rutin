import React, { useEffect, useState } from "react";
import "react-image-gallery/styles/image-gallery.css";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { pb } from "@/lib/pocketbase";
import DashboardLayout from "@/components/MainLayout";
import ListDataCard from "@/components/ListDataCard";
import { ListData } from "@/types/listdata";
import InputPopUp from "@/components/InputPopUp";
import { getValueColorPalette } from "@/components/phill";
import { WaktuPelaksanaan } from "@/types/enum";

const disciplineKpiLabels = [
  "Stationary",
  "Instrument",
  "Electrical",
  "Rotating",
];

const unitFilterOptions = ["002", "021", "022", "023", "024", "025", "041"];
const waktuPelaksanaanFilterOptions: typeof WaktuPelaksanaan = [
  "Rutin",
  "Pit Stop",
  "Turn Around",
];

type ExportRow = {
  no: number;
  imageData: string | null;
  tag: string;
  judul: string;
  issue: string;
  waktuPelaksanaan: string;
};

const getImageDataUrl = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to fetch image");

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = objectUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;

    const context = canvas.getContext("2d");
    if (!context) throw new Error("Failed to prepare image");

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0);

    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

const groupDataByUnitAndDiscipline = (data: ListData[]) => {
  const grouped: Record<string, Record<string, ListData[]>> = {};

  data.forEach((item) => {
    const unit = item.unit?.trim() || "-";
    const discipline = item.discipline?.trim() || "-";

    grouped[unit] ??= {};
    grouped[unit][discipline] ??= [];
    grouped[unit][discipline].push(item);
  });

  return grouped;
};

const sortByKnownOrder =
  (knownOrder: string[]) => (left: string, right: string) => {
    const leftIndex = knownOrder.indexOf(left);
    const rightIndex = knownOrder.indexOf(right);

    if (leftIndex !== -1 || rightIndex !== -1) {
      if (leftIndex === -1) return 1;
      if (rightIndex === -1) return -1;
      return leftIndex - rightIndex;
    }

    return left.localeCompare(right);
  };

const ListKerusakanPage: React.FC = () => {
  const [openModal, setOpenModal] = useState(false);
  const [sortOption, setSortOption] = useState("judul");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("");
  const [selectedDiscipline, setSelectedDiscipline] = useState("");
  const [selectedWaktuPelaksanaan, setSelectedWaktuPelaksanaan] = useState("");
  const [listdata, setlistData] = useState<ListData[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportingPdf, setExportingPdf] = useState(false);

  const scopedListData = listdata.filter((item) => {
    const matchesUnit = selectedUnit ? item.unit === selectedUnit : true;
    const matchesDiscipline = selectedDiscipline
      ? item.discipline === selectedDiscipline
      : true;
    const matchesWaktuPelaksanaan = selectedWaktuPelaksanaan
      ? item.waktu_pelaksanaan === selectedWaktuPelaksanaan
      : true;

    return matchesUnit && matchesDiscipline && matchesWaktuPelaksanaan;
  });

  const completedMaintenanceCount = scopedListData.filter((item) => {
    const progress = Math.min(Math.max(item.progress ?? 0, 0), 100);
    return progress === 100;
  }).length;

  const disciplineCounts = disciplineKpiLabels.map((discipline) => ({
    discipline,
    count: scopedListData.filter(
      (item) =>
        item.discipline.trim().toLowerCase() === discipline.toLowerCase(),
    ).length,
  }));

  const filteredListData = scopedListData.filter((item) => {
    const keyword = searchQuery.trim().toLowerCase();
    if (!keyword) return true;

    return [
      item.judul,
      item.issue,
      item.discipline,
      item.type,
      item.unit,
      item.tag_name,
      item.reference,
      item.waktu_pelaksanaan,
    ]
      .join(" ")
      .toLowerCase()
      .includes(keyword);
  });

  function recordToListData(record: any): ListData {
    return {
      id: record.id,
      collectionId: record.collectionId,
      collectionName: record.collectionName,
      created: record.created,
      updated: record.updated,
      judul: record.judul ?? "",
      issue: record.issue ?? "",
      discipline: record.discipline ?? "",
      type: record.type ?? "",
      unit: record.unit ?? "",
      tag_name: record.tag_name ?? "",
      photo: record.photo ?? [],
      reference: record.reference ?? "-",
      tracking: record.tracking ?? null,
      last_update: record.last_update ?? "",
      waktu_pelaksanaan: record.waktu_pelaksanaan ?? "",
      progress: record.progress ?? 0,
      isDeleted: record.isDeleted ?? false,
    };
  }
  async function loadTasks() {
    try {
      const ListData = await pb.collection("db_maintenance").getFullList({
        sort: sortOption,
        filter: "isDeleted != true",
      });

      const fetchedListData: ListData[] = ListData.map(recordToListData).filter(
        (item) => !item.isDeleted,
      );
      setlistData(fetchedListData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    loadTasks();
  }, [sortOption]);
  useEffect(() => {
    loadTasks();
  }, []);

  const handleExportPdf = async () => {
    if (listdata.length === 0 || exportingPdf) return;

    try {
      setExportingPdf(true);

      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });
      const groupedData = groupDataByUnitAndDiscipline(listdata);
      const pageHeight = doc.internal.pageSize.getHeight();
      const pageWidth = doc.internal.pageSize.getWidth();
      const marginX = 14;
      let cursorY = 15;
      let globalNo = 1;

      doc.setFontSize(15);
      doc.setFont("helvetica", "bold");
      doc.text("Maintenance Data Export", marginX, cursorY);
      cursorY += 9;

      const ensurePageSpace = (height = 25) => {
        if (cursorY + height <= pageHeight - 12) return;

        doc.addPage();
        cursorY = 15;
      };

      const sortedUnits = Object.keys(groupedData).sort(
        sortByKnownOrder(unitFilterOptions),
      );

      for (const unit of sortedUnits) {
        ensurePageSpace(18);
        doc.setFillColor(14, 165, 233);
        doc.roundedRect(
          marginX,
          cursorY - 5,
          pageWidth - marginX * 2,
          8,
          2,
          2,
          "F",
        );
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(`Unit ${unit}`, marginX + 3, cursorY);
        doc.setTextColor(15, 23, 42);
        cursorY += 11;

        const sortedDisciplines = Object.keys(groupedData[unit]).sort(
          sortByKnownOrder(disciplineKpiLabels),
        );

        for (const discipline of sortedDisciplines) {
          ensurePageSpace(36);
          doc.setFontSize(10);
          doc.setFont("helvetica", "bold");
          doc.text(`Discipline: ${discipline}`, marginX, cursorY);
          cursorY += 4;

          const exportRows: ExportRow[] = [];

          for (const item of groupedData[unit][discipline]) {
            let imageData: string | null = null;

            if (item.photo?.[0]) {
              try {
                imageData = await getImageDataUrl(
                  pb.files.getURL(item, item.photo[0]),
                );
              } catch (error) {
                console.warn("Failed to export image", error);
              }
            }

            exportRows.push({
              no: globalNo++,
              imageData,
              tag: item.tag_name || "-",
              judul: item.judul || "-",
              issue: item.issue || "-",
              waktuPelaksanaan: item.waktu_pelaksanaan || "-",
            });
          }

          exportRows.sort((left, right) => left.no - right.no);

          autoTable(doc, {
            startY: cursorY,
            margin: { left: marginX, right: marginX },
            head: [
              ["No", "Picture", "Tag", "Judul", "Issue", "Waktu Pelaksanaan"],
            ],
            body: exportRows.map((row) => [
              row.no,
              row.imageData ? "" : "-",
              row.tag,
              row.judul,
              row.issue,
              row.waktuPelaksanaan,
            ]),
            styles: {
              fontSize: 8,
              cellPadding: 2,
              overflow: "linebreak",
              valign: "middle",
            },
            headStyles: {
              fillColor: [2, 132, 199],
              textColor: 255,
              fontStyle: "bold",
            },
            bodyStyles: {
              minCellHeight: 20,
            },
            columnStyles: {
              0: { cellWidth: 10, halign: "center" },
              1: { cellWidth: 26, halign: "center" },
              2: { cellWidth: 28 },
              3: { cellWidth: 48 },
              4: { cellWidth: 120 },
              5: { cellWidth: 38 },
            },
            didDrawCell: (data) => {
              if (data.section !== "body" || data.column.index !== 1) return;

              const row = exportRows[data.row.index];
              if (!row?.imageData) return;

              doc.addImage(
                row.imageData,
                "JPEG",
                data.cell.x + 3,
                data.cell.y + 2.5,
                20,
                15,
              );
            },
          });

          cursorY = ((doc as any).lastAutoTable?.finalY ?? cursorY) + 8;
        }
      }

      doc.save("maintenance-data.pdf");
    } catch (error) {
      console.error(error);
      alert("Failed to export PDF");
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 w-full flex flex-col items-start gap-2 justify-center">
        <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-500 to-cyan-500 p-5 text-white shadow-sm xl:col-span-1">
            <p className="text-sm font-semibold uppercase tracking-wide text-sky-100">
              {scopedListData.length > 0
                ? Math.round(
                    (completedMaintenanceCount / scopedListData.length) * 100,
                  )
                : 0}
              % Complete
            </p>
            <div className="mt-3 flex items-end gap-2">
              <span className="text-4xl font-bold leading-none">
                {completedMaintenanceCount}
              </span>
              <span className="pb-1 text-sm font-semibold text-sky-100">
                / {scopedListData.length} items
              </span>
            </div>
          </div>

          {disciplineCounts.map((item) => (
            <div
              key={item.discipline}
              className="rounded-3xl border border-sky-100 bg-white p-5 shadow-sm"
            >
              <p className="text-sm font-semibold text-slate-500">
                {item.discipline}
              </p>
              <p className="mt-3 text-4xl font-bold leading-none text-sky-900">
                {item.count}
              </p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Maintenance Items
              </p>
            </div>
          ))}
        </div>

        <div className="w-full rounded-3xl border border-sky-100 bg-white p-4 shadow-sm">
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Search Data
          </label>

          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search by title, issue, discipline, type, unit, tag, reference..."
            className="w-full rounded-2xl border border-sky-200 bg-sky-50/40 px-4 py-3 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:ring-2 focus:ring-sky-300"
          />
        </div>
        <div className="flex w-full flex-wrap items-center gap-2">
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="
              bg-white/40
                border
              border-sky-200
              text-sky-800
                rounded-sm
                px-1
                py-1
                text-sm
                font-medium
                shadow-sm
                backdrop-blur-sm
                hover:bg-sky-100
                focus:outline-none
                focus:ring-2
                focus:ring-sky-300
                transition-all
                duration-200
              "
          >
            <option value="judul">Ascending</option>
            <option value="-judul">Descending</option>
            <option value="-updatedCustom">Latest Updated</option>
            <option value="updatedCustom">Oldest Updated</option>
          </select>
          <button
            onClick={() => setOpenModal(true)}
            className="
      px-3
      py-1
      rounded-md
      bg-gradient-to-r
      from-sky-500
      to-cyan-500
      text-white
      font-semibold
      shadow-lg
    "
          >
            + Add Data
          </button>

          <button
            type="button"
            onClick={handleExportPdf}
            disabled={exportingPdf || listdata.length === 0}
            className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700 shadow-sm transition-all hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {exportingPdf ? "Exporting..." : "Export PDF"}
          </button>
        </div>

        <div className="flex w-full flex-col gap-2 rounded-2xl border border-sky-100 bg-white/70 p-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Unit
            </span>
            <button
              type="button"
              onClick={() => setSelectedUnit("")}
              className={`rounded-sm border px-2 py-1 text-xs font-semibold shadow-sm transition-all ${
                selectedUnit === ""
                  ? "border-sky-500 bg-sky-600 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              All
            </button>

            {unitFilterOptions.map((unit) => {
              const color = getValueColorPalette(unit);
              const active = selectedUnit === unit;

              return (
                <button
                  key={unit}
                  type="button"
                  onClick={() => setSelectedUnit(active ? "" : unit)}
                  className={`rounded-sm border px-2 py-1 text-xs font-semibold shadow-sm transition-all ${
                    active
                      ? "border-sky-500 bg-sky-600 text-white"
                      : `${color.border} ${color.background} ${color.text} hover:shadow-md`
                  }`}
                >
                  {unit}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Discipline
            </span>
            <button
              type="button"
              onClick={() => setSelectedDiscipline("")}
              className={`rounded-sm border px-2 py-1 text-xs font-semibold shadow-sm transition-all ${
                selectedDiscipline === ""
                  ? "border-sky-500 bg-sky-600 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              All
            </button>

            {disciplineKpiLabels.map((discipline) => {
              const color = getValueColorPalette(discipline);
              const active = selectedDiscipline === discipline;

              return (
                <button
                  key={discipline}
                  type="button"
                  onClick={() =>
                    setSelectedDiscipline(active ? "" : discipline)
                  }
                  className={`rounded-sm border px-2 py-1 text-xs font-semibold shadow-sm transition-all ${
                    active
                      ? "border-sky-500 bg-sky-600 text-white"
                      : `${color.border} ${color.background} ${color.text} hover:shadow-md`
                  }`}
                >
                  {discipline}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Waktu Pelaksanaan
            </span>
            <button
              type="button"
              onClick={() => setSelectedWaktuPelaksanaan("")}
              className={`rounded-sm border px-2 py-1 text-xs font-semibold shadow-sm transition-all ${
                selectedWaktuPelaksanaan === ""
                  ? "border-sky-500 bg-sky-600 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              All
            </button>

            {waktuPelaksanaanFilterOptions.map((waktuPelaksanaan) => {
              const color = getValueColorPalette(waktuPelaksanaan);
              const active = selectedWaktuPelaksanaan === waktuPelaksanaan;

              return (
                <button
                  key={waktuPelaksanaan}
                  type="button"
                  onClick={() =>
                    setSelectedWaktuPelaksanaan(active ? "" : waktuPelaksanaan)
                  }
                  className={`rounded-sm border px-2 py-1 text-xs font-semibold shadow-sm transition-all ${
                    active
                      ? "border-sky-500 bg-sky-600 text-white"
                      : `${color.border} ${color.background} ${color.text} hover:shadow-md`
                  }`}
                >
                  {waktuPelaksanaan}
                </button>
              );
            })}
          </div>
        </div>

        <InputPopUp
          open={openModal}
          onClose={() => setOpenModal(false)}
          onSaved={() => loadTasks()}
        />

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin" />
          </div>
        ) : filteredListData.length === 0 ? (
          <div className="w-full rounded-3xl border border-dashed border-sky-200 bg-sky-50/40 px-6 py-10 text-center text-sm font-medium text-slate-500">
            No data.
          </div>
        ) : (
          <ListDataCard
            data={filteredListData}
            onDataChanged={() => loadTasks()}
            onDeleted={(id) =>
              setlistData((currentData) =>
                currentData.filter((item) => item.id !== id),
              )
            }
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default ListKerusakanPage;
