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
  const [listdata, setlistData] = useState<ListData[]>([]);
  const [loading, setLoading] = useState(true);

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
    };
  }
  async function loadTasks() {
    try {
      const ListData = await pb.collection("db_maintenance").getFullList({
        sort: sortOption,
      });

      const fetchedListData: ListData[] = ListData.map(recordToListData);
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
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin" />
          </div>
        ) : (
          <ListDataCard data={listdata} />
        )}
      </div>
    </DashboardLayout>
  );
};

export default ListKerusakanPage;
