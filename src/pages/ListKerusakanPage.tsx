import React, { useEffect, useState } from "react";
import "react-image-gallery/styles/image-gallery.css";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { pb } from "@/lib/pocketbase";
import DashboardLayout from "@/components/MainLayout";
import ListDataCard, {
  getWaktuPelaksanaanRibbonClass,
} from "@/components/ListDataCard";
import { ListData } from "@/types/listdata";
import InputPopUp from "@/components/InputPopUp";
import { getUnitColorPalette, getValueColorPalette } from "@/components/phill";
import { WaktuPelaksanaan } from "@/types/enum";
import { ChevronUp, ChevronDown } from "lucide-react";
import { useSearchParams } from "react-router-dom";

const disciplineKpiLabels = [
  "Stationary",
  "Instrument",
  "Electrical",
  "Rotating",
];

const unitFilterOptions = ["002", "021", "022", "023", "024", "025", "041"];
const waktuPelaksanaanFilterOptions: typeof WaktuPelaksanaan = [
  "On Stream",
  "Pit Stop",
  "Turn Around",
];

const getDisciplinePopClass = (discipline: string) => {
  switch (discipline.trim().toLowerCase()) {
    case "stationary": return "bg-blue-500 text-white border-blue-600";
    case "instrument": return "bg-emerald-500 text-white border-emerald-600";
    case "electrical": return "bg-amber-500 text-white border-amber-600";
    case "rotating": return "bg-purple-500 text-white border-purple-600";
    default: return "bg-sky-500 text-white border-sky-600";
  }
};

const getWaktuPelaksanaanPopClass = (waktu: string) => {
  switch (waktu.trim().toLowerCase()) {
    case "on stream": return "bg-green-500 text-white border-green-600";
    case "pit stop": return "bg-amber-500 text-white border-amber-600";
    case "turn around": return "bg-red-500 text-white border-red-600";
    default: return "bg-slate-500 text-white border-slate-600";
  }
};

type ExportRow = {
  no: number;
  imageData: string | null;
  tag: string;
  judul: string;
  issue: string;
  progress: string;
  waktuPelaksanaan: string;
  redundan: string;
};

type ExportMode = "all" | "filtered";
type ProgressStatusFilter = "all" | "inProgress" | "done";

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

const normalizeSearchText = (value: unknown) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");

const filterButtonBaseClass =
  "rounded-sm border px-2 py-1 text-xs font-semibold shadow-sm transition-all";

const getFilterButtonClass = (active: boolean, activeClass: string) =>
  `${filterButtonBaseClass} ${
    active
      ? `!border-transparent !text-white shadow-lg ${activeClass}`
      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
  }`;

const getClampedProgress = (progress: number | undefined) =>
  Math.min(Math.max(progress ?? 0, 0), 100);

const ListKerusakanPage: React.FC = () => {
  const [openModal, setOpenModal] = useState(false);
  const [sortOption, setSortOption] = useState("unit");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchParams] = useSearchParams();
  const [selectedUnit, setSelectedUnit] = useState(searchParams.get("unit") || "");
  const [selectedDiscipline, setSelectedDiscipline] = useState("");
  
  useEffect(() => {
    const unitParam = searchParams.get("unit");
    if (unitParam !== null) {
      setSelectedUnit(unitParam);
    }
  }, [searchParams]);

  const [selectedWaktuPelaksanaan, setSelectedWaktuPelaksanaan] = useState("");
  const [selectedProgressStatus, setSelectedProgressStatus] =
    useState<ProgressStatusFilter>("all");
  const [listdata, setlistData] = useState<ListData[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportingPdf, setExportingPdf] = useState(false);

  const toggleSort = (field: string) => {
    if (sortOption === field) {
      setSortOption(`-${field}`);
    } else {
      setSortOption(field);
    }
  };

  const sortableColumns = [
    { key: "unit", label: "Unit" },
    { key: "tag", label: "Tag" },
    { key: "discipline", label: "Discipline" },
    { key: "progress", label: "Progress" },
    { key: "updated", label: "Last Updated" },
  ];

  const progressStatusBaseData = listdata.filter((item) => {
    const matchesUnit = selectedUnit ? item.unit === selectedUnit : true;
    const matchesDiscipline = selectedDiscipline
      ? item.discipline === selectedDiscipline
      : true;
    const matchesWaktuPelaksanaan = selectedWaktuPelaksanaan
      ? item.waktu_pelaksanaan === selectedWaktuPelaksanaan
      : true;

    return matchesUnit && matchesDiscipline && matchesWaktuPelaksanaan;
  });

  const progressStatusCounts = {
    all: progressStatusBaseData.length,
    inProgress: progressStatusBaseData.filter(
      (item) => getClampedProgress(item.progress) < 100,
    ).length,
    done: progressStatusBaseData.filter(
      (item) => getClampedProgress(item.progress) === 100,
    ).length,
  };

  const scopedListData = progressStatusBaseData.filter((item) => {
    const progress = getClampedProgress(item.progress);

    if (selectedProgressStatus === "done") return progress === 100;
    if (selectedProgressStatus === "inProgress") return progress < 100;

    return true;
  });

  const unitCountsBaseData = listdata.filter((item) => {
    const matchesDiscipline = selectedDiscipline
      ? item.discipline === selectedDiscipline
      : true;
    const matchesWaktuPelaksanaan = selectedWaktuPelaksanaan
      ? item.waktu_pelaksanaan === selectedWaktuPelaksanaan
      : true;

    const progress = getClampedProgress(item.progress);
    let matchesProgress = true;
    if (selectedProgressStatus === "done") matchesProgress = progress === 100;
    if (selectedProgressStatus === "inProgress") matchesProgress = progress < 100;

    return matchesDiscipline && matchesWaktuPelaksanaan && matchesProgress;
  });

  const disciplineBaseData = listdata.filter((item) => {
    const matchesUnit = selectedUnit ? item.unit === selectedUnit : true;
    const matchesWaktuPelaksanaan = selectedWaktuPelaksanaan
      ? item.waktu_pelaksanaan === selectedWaktuPelaksanaan
      : true;

    const progress = getClampedProgress(item.progress);
    let matchesProgress = true;
    if (selectedProgressStatus === "done") matchesProgress = progress === 100;
    if (selectedProgressStatus === "inProgress") matchesProgress = progress < 100;

    return matchesUnit && matchesWaktuPelaksanaan && matchesProgress;
  });

  const waktuBaseData = listdata.filter((item) => {
    const matchesUnit = selectedUnit ? item.unit === selectedUnit : true;
    const matchesDiscipline = selectedDiscipline
      ? item.discipline === selectedDiscipline
      : true;

    const progress = getClampedProgress(item.progress);
    let matchesProgress = true;
    if (selectedProgressStatus === "done") matchesProgress = progress === 100;
    if (selectedProgressStatus === "inProgress") matchesProgress = progress < 100;

    return matchesUnit && matchesDiscipline && matchesProgress;
  });

  const filteredListData = scopedListData
    .filter((item) => {
      const keyword = normalizeSearchText(searchQuery);
      if (!keyword) return true;

      const searchableText = normalizeSearchText(
        [
          item.judul,
          item.issue,
          item.discipline,
          item.type,
          item.unit,
          item.tag_name,
          item.reference,
          item.waktu_pelaksanaan,
        ].join(" "),
      );

      return searchableText.includes(keyword);
    })
    .sort((left, right) => {
      if (sortOption === "unit") {
        return sortByKnownOrder(unitFilterOptions)(left.unit, right.unit);
      }
      if (sortOption === "-unit") {
        return sortByKnownOrder(unitFilterOptions)(right.unit, left.unit);
      }

      if (sortOption === "tag") {
        return left.tag_name.localeCompare(right.tag_name);
      }
      if (sortOption === "-tag") {
        return right.tag_name.localeCompare(left.tag_name);
      }

      if (sortOption === "discipline") {
        return sortByKnownOrder(disciplineKpiLabels)(left.discipline, right.discipline);
      }
      if (sortOption === "-discipline") {
        return sortByKnownOrder(disciplineKpiLabels)(right.discipline, left.discipline);
      }

      if (sortOption === "progress") {
        return left.progress - right.progress;
      }
      if (sortOption === "-progress") {
        return right.progress - left.progress;
      }

      if (sortOption === "updated") {
        return new Date(left.updated).getTime() - new Date(right.updated).getTime();
      }
      if (sortOption === "-updated") {
        return new Date(right.updated).getTime() - new Date(left.updated).getTime();
      }

      return 0;
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
      redundan: record.redundan ?? "none",
    };
  }
  async function loadTasks() {
    try {
      const ListData = await pb.collection("db_maintenance").getFullList({
        sort: "unit",
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
  }, []);

  const handleExportPdf = async (mode: ExportMode) => {
    const exportData = mode === "filtered" ? filteredListData : listdata;
    if (exportData.length === 0 || exportingPdf) return;

    try {
      setExportingPdf(true);

      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });
      const groupedData = groupDataByUnitAndDiscipline(exportData);
      const pageHeight = doc.internal.pageSize.getHeight();
      const pageWidth = doc.internal.pageSize.getWidth();
      const marginX = 14;
      let cursorY = 15;
      let globalNo = 1;

      doc.setFontSize(15);
      doc.setFont("helvetica", "bold");
      doc.text(
        `Maintenance Data Export - ${mode === "filtered" ? "Filtered Data" : "All Data"}`,
        marginX,
        cursorY,
      );
      cursorY += 9;

      if (mode === "filtered") {
        const filterSummary = [
          searchQuery.trim() ? `Search: ${searchQuery.trim()}` : null,
          selectedUnit ? `Unit: ${selectedUnit}` : null,
          selectedDiscipline ? `Discipline: ${selectedDiscipline}` : null,
          selectedWaktuPelaksanaan
            ? `Waktu Pelaksanaan: ${selectedWaktuPelaksanaan}`
            : null,
          selectedProgressStatus !== "all"
            ? `Progress: ${
                selectedProgressStatus === "done" ? "Done" : "In Progress"
              }`
            : null,
        ].filter(Boolean);

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(
          filterSummary.length > 0
            ? filterSummary.join(" | ")
            : "Filter: All visible data",
          marginX,
          cursorY,
        );
        cursorY += 7;
      }

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
              progress: `${getClampedProgress(item.progress)}%`,
              waktuPelaksanaan: item.waktu_pelaksanaan || "-",
              redundan: item.redundan && item.redundan !== "none" ? item.redundan : "-",
            });
          }

          exportRows.sort((left, right) => left.no - right.no);

          autoTable(doc, {
            startY: cursorY,
            margin: { left: marginX, right: marginX },
            head: [
              [
                "No",
                "Picture",
                "Tag",
                "Judul",
                "Issue",
                "Progress",
                "Waktu Pelaksanaan",
                "Redundancy",
              ],
            ],
            body: exportRows.map((row) => [
              row.no,
              row.imageData ? "" : "-",
              row.tag,
              row.judul,
              row.issue,
              row.progress,
              row.waktuPelaksanaan,
              row.redundan,
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
              3: { cellWidth: 44 },
              4: { cellWidth: 86 },
              5: { cellWidth: 20, halign: "center" },
              6: { cellWidth: 35 },
              7: { cellWidth: 18, halign: "center" },
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
      <div className="flex w-full flex-col items-start justify-center gap-3 p-3 sm:p-6">
        <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center">
          <button
            onClick={() => setOpenModal(true)}
            className="
      px-3
      py-2
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
            onClick={() => handleExportPdf("all")}
            disabled={exportingPdf || listdata.length === 0}
            className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 shadow-sm transition-all hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {exportingPdf ? "Exporting..." : "Export All"}
          </button>

          <button
            type="button"
            onClick={() => handleExportPdf("filtered")}
            disabled={exportingPdf || filteredListData.length === 0}
            className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700 shadow-sm transition-all hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {exportingPdf ? "Exporting..." : "Export By Filter"}
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
              aria-pressed={selectedUnit === ""}
              className={getFilterButtonClass(
                selectedUnit === "",
                "bg-sky-700",
              )}
            >
              All
              <span
                className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] ${
                  selectedUnit === ""
                    ? "bg-white/20 text-white"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                {unitCountsBaseData.length}
              </span>
            </button>

            {unitFilterOptions.map((unit) => {
              const count = unitCountsBaseData.filter((item) => item.unit === unit).length;
              const active = selectedUnit === unit;

              return (
                <button
                  key={unit}
                  type="button"
                  onClick={() =>
                    setSelectedUnit(active ? "" : unit)
                  }
                  aria-pressed={active}
                  className={`${filterButtonBaseClass} ${
                    active
                      ? `bg-sky-500 text-white border-sky-600 shadow-lg`
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Unit {unit}
                  <span
                    className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] ${
                      active
                        ? "bg-white/20 text-white"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {count}
                  </span>
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
              aria-pressed={selectedDiscipline === ""}
              className={getFilterButtonClass(
                selectedDiscipline === "",
                "bg-sky-700",
              )}
            >
              All
              <span
                className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] ${
                  selectedDiscipline === ""
                    ? "bg-white/20 text-white"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                {disciplineBaseData.length}
              </span>
            </button>

            {disciplineKpiLabels.map((discipline) => {
              const count = disciplineBaseData.filter((item) => item.discipline === discipline).length;
              const popClass = getDisciplinePopClass(discipline);
              const active = selectedDiscipline === discipline;

              return (
                <button
                  key={discipline}
                  type="button"
                  onClick={() =>
                    setSelectedDiscipline(active ? "" : discipline)
                  }
                  aria-pressed={active}
                  className={`${filterButtonBaseClass} ${
                    active
                      ? `${popClass} shadow-lg`
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {discipline}
                  <span
                    className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] ${
                      active
                        ? "bg-white/20 text-white"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {count}
                  </span>
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
              aria-pressed={selectedWaktuPelaksanaan === ""}
              className={getFilterButtonClass(
                selectedWaktuPelaksanaan === "",
                "bg-sky-700",
              )}
            >
              All
              <span
                className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] ${
                  selectedWaktuPelaksanaan === ""
                    ? "bg-white/20 text-white"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                {waktuBaseData.length}
              </span>
            </button>

            {waktuPelaksanaanFilterOptions.map((waktuPelaksanaan) => {
              const count = waktuBaseData.filter((item) => item.waktu_pelaksanaan === waktuPelaksanaan).length;
              const popClass = getWaktuPelaksanaanPopClass(waktuPelaksanaan);
              const active = selectedWaktuPelaksanaan === waktuPelaksanaan;

              return (
                <button
                  key={waktuPelaksanaan}
                  type="button"
                  onClick={() =>
                    setSelectedWaktuPelaksanaan(active ? "" : waktuPelaksanaan)
                  }
                  aria-pressed={active}
                  className={`${filterButtonBaseClass} ${
                    active
                      ? `${popClass} shadow-lg`
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {waktuPelaksanaan}
                  <span
                    className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] ${
                      active
                        ? "bg-white/20 text-white"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Progress
            </span>
            {[
              {
                value: "all",
                label: "All",
                count: progressStatusCounts.all,
                activeClass: "bg-sky-700",
              },
              {
                value: "inProgress",
                label: "In Progress",
                count: progressStatusCounts.inProgress,
                activeClass: "bg-gradient-to-r from-amber-500 to-orange-500",
              },
              {
                value: "done",
                label: "Done",
                count: progressStatusCounts.done,
                activeClass: "bg-gradient-to-r from-emerald-500 to-green-600",
              },
            ].map((option) => {
              const active = selectedProgressStatus === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    setSelectedProgressStatus(
                      option.value as ProgressStatusFilter,
                    )
                  }
                  aria-pressed={active}
                  className={getFilterButtonClass(active, option.activeClass)}
                >
                  {option.label}
                  <span
                    className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] ${
                      active
                        ? "bg-white/20 text-white"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {option.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="w-full rounded-3xl border border-sky-100 bg-white p-3 shadow-sm sm:p-4">
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

        <div className="flex w-full items-center gap-2 rounded-2xl bg-white p-2 shadow-sm border border-sky-100 overflow-x-auto scrollbar-hide">
          <span className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider shrink-0">Sort by:</span>
          <div className="flex flex-1 items-center gap-2">
            {sortableColumns.map(col => {
              const isAsc = sortOption === col.key;
              const isDesc = sortOption === `-${col.key}`;
              const isActive = isAsc || isDesc;
              
              return (
                <button
                  key={col.key}
                  onClick={() => toggleSort(col.key)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-wide transition-all ${
                    isActive ? "bg-sky-50 text-sky-700 shadow-sm border border-sky-200" : "bg-transparent text-slate-500 border border-transparent hover:bg-slate-50"
                  }`}
                >
                  {col.label}
                  <div className="flex flex-col -space-y-[0.3rem] opacity-70">
                    <ChevronUp size={12} className={isAsc ? "text-sky-700 opacity-100 stroke-[3px]" : "opacity-40"} />
                    <ChevronDown size={12} className={isDesc ? "text-sky-700 opacity-100 stroke-[3px]" : "opacity-40"} />
                  </div>
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
