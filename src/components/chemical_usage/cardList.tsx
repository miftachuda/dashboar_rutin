import { format, formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";

const CardList = ({ data }: { data: any[] }) => {
  const sortedData = [...(data ?? [])].sort(
    (a, b) => new Date(b.time * 1000).getTime() - new Date(a.time * 1000).getTime(),
  );

  return (
    <div className="mt-3 flex w-full flex-col gap-3">
      {sortedData.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-sky-200 bg-sky-50/40 px-6 py-10 text-center text-sm font-medium text-slate-500">
          No chemical usage data.
        </div>
      ) : (
        sortedData.map((item, index) => {
          const itemDate = new Date(item.time * 1000);
          const isNew = Date.now() - itemDate.getTime() <= 24 * 60 * 60 * 1000;

          return (
            <div
              key={item.id ?? index}
              className={`w-full rounded-3xl border p-4 shadow-sm transition-all ${
                isNew
                  ? "border-sky-300 bg-sky-50 ring-2 ring-sky-100"
                  : "border-sky-100 bg-white"
              }`}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-bold text-sky-950">Make Up</p>

                    {isNew && (
                      <span className="rounded-full bg-sky-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                        NEW
                      </span>
                    )}
                  </div>

                  <p className="text-sm font-semibold text-sky-700">
                    {item.chemical_name}
                  </p>
                  <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
                    {item.description || "-"}
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <p className="text-sm font-semibold text-slate-500">Amount</p>
                  <p className="text-2xl font-bold text-sky-700">
                    {Number(item.amount).toFixed(2)} {item.unit}
                  </p>
                  <p className="mt-2 rounded-xl bg-sky-50 px-3 py-2 text-xs font-medium text-slate-500">
                    {format(itemDate, "EEEE, dd-MMMM-yyyy HH.mm", { locale: id })} -{" "}
                    {formatDistanceToNow(itemDate, { addSuffix: true, locale: id })}
                  </p>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default CardList;
