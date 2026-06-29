import { useState } from "react";
import { createPortal } from "react-dom";

type Status = "open" | "need support" | "in progress" | "done";

export default function StatusPopup({
  item,
  handleStatusChange,
  statusColor,
}: {
  item: any;
  handleStatusChange: (
    id: string,
    status: Status,
  ) => void;
  statusColor: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);

  const statusDotColor: Record<Status, string> = {
    open: "bg-red-500",
    "need support": "bg-yellow-500",
    "in progress": "bg-blue-500",
    done: "bg-green-500",
  };

  return (
    <>
      <span
        onClick={() => setOpen(true)}
        className={`text-xs px-2 py-1 rounded cursor-pointer min-w-[90px] flex items-center justify-center ${statusColor[item.status]}`}
      >
        {item.status}
      </span>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setOpen(false)}
            />

            <div className="relative bg-white rounded-lg shadow-lg p-4 w-40 space-y-2 z-10">
              <p className="text-xs text-gray-500">
                Are you sure to change the status?
              </p>

              {(["open", "need support", "in progress", "done"] as Status[]).map((status) => (
                <button
                  key={status}
                  onClick={() => {
                    handleStatusChange(item.id, status);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-2 py-1 rounded text-sm hover:bg-gray-100 flex items-center gap-2 ${
                    item.status === status ? `${statusColor[status]}` : ""
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${statusDotColor[status]}`} />
                  {status}
                </button>
              ))}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
