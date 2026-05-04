import React from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { pb } from "@/lib/pocketbase";
import { StepTask } from "@/types/maintenance";

type Step = {
  progress?: number;
};

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

/* =========================
   📄 COMPONENT
========================= */

const ReportTable = ({ items }: { items: StepTask[] }) => {
  const summary = calculateSummary(items);

  const exportPDF = async () => {
    const element = document.getElementById("report-root");
    if (!element) return;

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
    });

    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = 210;
    const pageHeight = 297;

    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    // halaman pertama
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // halaman berikutnya
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;

      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);

      heightLeft -= pageHeight;
    }

    pdf.save("report.pdf");
  };

  return (
    <div className="w-full">
      {/* REPORT */}
      <div id="report-root" className="bg-white text-xs p-4 text-black">
        {/* HEADER */}
        <div className="mb-4 border p-3 rounded bg-gray-50">
          <div className="text-lg font-bold mb-2">
            PROGRESS JOBLIST TAMBAHAN
          </div>

          <div>
            Completed: {summary.done} / {summary.total}{" "}
          </div>
          <div>Total Progress: {summary.percent.toFixed(2)}%</div>
        </div>

        {/* TABLE */}
        <table className="w-full border border-collapse">
          <thead>
            <tr className="bg-gray-200 text-xs">
              <th className="border p-2 w-[40px]">No</th>
              <th className="border p-2 w-[90px]">Photo</th>
              <th className="border p-2 w-[120px]">Tag</th>
              <th className="border p-2">Description</th>
              <th className="border p-2 w-[80px]">Progress</th>
            </tr>
          </thead>

          <tbody>
            {items.map((item, index) => {
              const progress = calculateStepTaskProgress(item);
              const photo = item.photos?.[0];

              const imgUrl = photo
                ? `https://base.miftachuda.my.id/api/files/additionals/${item.id}/${photo}`
                : null;

              return (
                <tr key={item.id}>
                  <td className="border p-2 text-center">{index + 1}</td>

                  <td className="border p-2 text-center">
                    {imgUrl ? (
                      <img
                        src={imgUrl}
                        alt=""
                        className="w-16 h-16 object-cover mx-auto"
                      />
                    ) : (
                      "-"
                    )}
                  </td>

                  <td className="border p-2 font-semibold">{item.title}</td>

                  <td className="border p-2">{item.equipment}</td>

                  <td className="border p-2 text-center font-bold">
                    {progress}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReportTable;
