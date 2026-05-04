import React from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { StepTask } from "@/types/maintenance";
import { pb } from "@/lib/pocketbase";

/* =========================
   🔢 CALCULATION
========================= */

const calculateStepTaskProgress = (item: StepTask) => {
  const allSteps = item.steps.flatMap((s) => s.steplist || []);
  if (allSteps.length === 0) return 0;

  const total = allSteps.reduce((acc, s) => acc + (s.progress || 0), 0);
  return Math.round(total / allSteps.length);
};

const calculateSummary = (items: StepTask[]) => {
  if (!items.length) return { done: 0, total: 0, percent: 0 };

  const progresses = items.map(calculateStepTaskProgress);
  const done = progresses.filter((p) => p === 100).length;

  return {
    done,
    total: items.length,
    percent: (done / items.length) * 100,
  };
};

const loadImage = async (url: string): Promise<string> => {
  const res = await fetch(url, { mode: "cors" });
  const blob = await res.blob();

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob); // 🔥 convert ke base64
  });
};
/* =========================
   📄 COMPONENT
========================= */

const ExportTable = ({ items }: { items: StepTask[] }) => {
  const exportPDF = async () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const summary = calculateSummary(items);

    /* =========================
       PRELOAD IMAGES
    ========================= */
    const imageMap: Record<number, string> = {};

    await Promise.all(
      items.map(async (item, i) => {
        const photos = item.photos;
        const fileName = photos?.[photos.length - 1]; // 👈 ambil last photo

        if (fileName) {
          const imgUrl = `https://base.miftachuda.my.id/api/files/additionals/${item.id}/${fileName}`;
          imageMap[i] = await loadImage(imgUrl);
        }
      }),
    );

    /* =========================
       HEADER
    ========================= */
    doc.setFontSize(14);
    doc.text("PROGRESS JOBLIST TAMBAHAN", 14, 15);

    doc.setFontSize(10);
    doc.text(`Completed: ${summary.done} / ${summary.total}`, 14, 27);
    doc.text(`Total Progress: ${summary.percent.toFixed(2)}%`, 14, 32);

    /* =========================
       TABLE DATA
    ========================= */
    const tableBody = items.map((item, index) => {
      const progress = calculateStepTaskProgress(item);

      return [
        index + 1,
        "", // placeholder image
        item.title,
        item.equipment,
        `${progress}%`,
      ];
    });

    /* =========================
       AUTOTABLE
    ========================= */

    autoTable(doc, {
      startY: 38,
      head: [["No", "Photo", "Tag", "Description", "Progress"]],
      body: tableBody,

      styles: {
        fontSize: 8,
        cellPadding: 2,
        minCellHeight: 15,
      },

      headStyles: {
        fillColor: [220, 220, 220],
        textColor: 0,
        halign: "center",
      },

      columnStyles: {
        0: { halign: "center", cellWidth: 10 },
        1: { cellWidth: 20 }, // photo
        4: { halign: "center", cellWidth: 25 },
      },

      didDrawCell: (data) => {
        if (data.column.index === 1 && data.row.section === "body") {
          const img = imageMap[data.row.index];

          if (img) {
            const x = data.cell.x + 1;
            const y = data.cell.y + 1;

            doc.addImage(img, "JPEG", x, y, 18, 13);
          }
        }
      },
    });

    doc.save("report.pdf");
  };

  return (
    <div className="w-full">
      <button
        onClick={exportPDF}
        className="mb-4 px-4 py-2 bg-blue-600 text-white rounded shadow"
      >
        Export PDF
      </button>
    </div>
  );
};

export default ExportTable;
