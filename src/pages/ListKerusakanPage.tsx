import React, { useEffect, useState } from "react";
import "react-image-gallery/styles/image-gallery.css";
import { pb } from "@/lib/pocketbase";
import DashboardLayout from "@/components/MainLayout";
import ListDataCard from "@/components/ListDataCard";
import { ListData } from "@/types/listdata";
import InputPopUp from "@/components/InputPopUp";

const ListKerusakanPage: React.FC = () => {
  const [openModal, setOpenModal] = useState(false);
  const [sortOption, setSortOption] = useState("judul");
  const [searchQuery, setSearchQuery] = useState("");
  const [listdata, setlistData] = useState<ListData[]>([]);
  const [loading, setLoading] = useState(true);

  const filteredListData = listdata.filter((item) => {
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

  return (
    <DashboardLayout>
      <div className="p-6 w-full flex flex-col items-start gap-2 justify-center">
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
        <>
          <button
            onClick={() => setOpenModal(true)}
            className="
      px-5
      py-3
      rounded-2xl
      bg-gradient-to-r
      from-sky-500
      to-cyan-500
      text-white
      font-semibold
      shadow-lg
    "
          >
            Add Data
          </button>

          <InputPopUp
            open={openModal}
            onClose={() => setOpenModal(false)}
            onSaved={() => loadTasks()}
          />
        </>

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

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin" />
          </div>
        ) : filteredListData.length === 0 ? (
          <div className="w-full rounded-3xl border border-dashed border-sky-200 bg-sky-50/40 px-6 py-10 text-center text-sm font-medium text-slate-500">
            No data matches your search.
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
