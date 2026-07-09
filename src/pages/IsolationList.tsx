import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/MainLayout";
import { pb } from "@/lib/pocketbase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, FileSpreadsheet, Download, Eye, Loader2, AlertCircle } from "lucide-react";
import * as XLSX from "xlsx";

interface BlankCollectionRecord {
  id: string;
  title: string;
  excel: string;
  collectionId: string;
  collectionName: string;
  created: string;
  updated: string;
}

export default function IsolationList() {
  const [records, setRecords] = useState<BlankCollectionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewTitle, setPreviewTitle] = useState("");
  const [previewError, setPreviewError] = useState("");

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const data = await pb.collection("blank_collection").getFullList({
        sort: "-created",
      });
      setRecords(data as any);
    } catch (err) {
      console.error("Error fetching blank_collection:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = records.filter(record => 
    record.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getFileName = (record: BlankCollectionRecord): string => {
    if (!record.excel) return "";
    return Array.isArray(record.excel) ? record.excel[0] : record.excel;
  };

  const getFileUrl = (record: BlankCollectionRecord) => {
    const fileName = getFileName(record);
    return pb.files.getUrl(record, fileName);
  };

  const handlePreview = async (record: BlankCollectionRecord) => {
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewHtml("");
    setPreviewError("");
    setPreviewTitle(record.title || "Preview");

    try {
      const fileUrl = getFileUrl(record);
      const response = await fetch(fileUrl, { mode: 'cors' });
      if (!response.ok) throw new Error("Failed to fetch the file.");
      
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      
      if (workbook.SheetNames.length === 0) {
        throw new Error("Excel file has no sheets.");
      }
      
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // Convert sheet to HTML table
      const htmlString = XLSX.utils.sheet_to_html(worksheet, { id: "excel-preview-table" });
      setPreviewHtml(htmlString);
    } catch (err: any) {
      console.error("Preview error:", err);
      setPreviewError(err.message || "Failed to preview the Excel file.");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDownload = async (record: BlankCollectionRecord) => {
    try {
      const fileUrl = getFileUrl(record);
      
      // Fetch the file as a Blob. Using mode: 'cors' ensures we get a readable blob across domains.
      const response = await fetch(fileUrl, { mode: 'cors' });
      if (!response.ok) throw new Error("Failed to fetch file");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const a = document.createElement("a");
      a.href = url;
      a.style.display = "none";
      
      // Use exact title
      const fileName = getFileName(record);
      const extension = fileName.split('.').pop() || "xlsx";
      const exactTitle = record.title || "Isolation List";
      
      a.download = `${exactTitle}.${extension}`;
      document.body.appendChild(a);
      a.click();
      
      // Small timeout to allow the browser to initiate the download before cleaning up
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 100);
      
    } catch (err) {
      console.error("Error downloading file via blob:", err);
      // Fallback: append download=1 to pocketbase URL
      const fallbackUrl = new URL(getFileUrl(record));
      fallbackUrl.searchParams.append("download", "1");
      window.open(fallbackUrl.toString(), "_self");
    }
  };

  return (
    <DashboardLayout>
      <div className="flex w-full flex-col h-[calc(100vh-20px)] overflow-hidden gap-4 p-2 sm:p-4">
        
        {/* Header Area */}
        <section className="w-full shrink-0 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border shadow-sm">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-xl">
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Isolation List</h1>
              <p className="text-xs font-semibold text-slate-500">View and download blank collection templates</p>
            </div>
          </div>
          
          <div className="relative w-full sm:w-72 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search by title..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10 w-full rounded-xl bg-slate-50 border-slate-200"
            />
          </div>
        </section>

        {/* Content Area */}
        <section className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-2 pb-4">
          {loading ? (
            <div className="flex w-full h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="flex flex-col w-full h-40 items-center justify-center text-slate-400 gap-2 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
              <FileSpreadsheet className="h-8 w-8 opacity-20" />
              <p className="text-sm font-semibold">No records found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredRecords.map((record) => (
                <div key={record.id} className="group relative flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden p-4 gap-4 hover:border-emerald-200">
                  <div className="flex items-start gap-3">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl shrink-0 group-hover:scale-110 transition-transform">
                      <FileSpreadsheet size={20} />
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                      <h3 className="font-bold text-slate-800 text-sm truncate" title={record.title}>
                        {record.title || "Untitled"}
                      </h3>
                      <p className="text-[10px] font-semibold text-slate-400 truncate mt-0.5">
                        {getFileName(record) || "No file attached"}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-auto pt-2 border-t border-slate-100">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 h-8 text-xs font-bold rounded-lg border-slate-200 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50"
                      onClick={() => handlePreview(record)}
                      disabled={!record.excel}
                    >
                      <Eye className="h-3.5 w-3.5 mr-1.5" /> Preview
                    </Button>
                    <Button 
                      size="sm" 
                      className="flex-1 h-8 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => handleDownload(record)}
                      disabled={!record.excel}
                    >
                      <Download className="h-3.5 w-3.5 mr-1.5" /> Download
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-[90vw] w-[1200px] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl">
          <DialogHeader className="p-4 sm:p-5 border-b bg-slate-50/50 shrink-0">
            <DialogTitle className="flex items-center gap-2 text-lg text-slate-800">
              <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
              Preview: {previewTitle}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto bg-slate-100/50 p-4">
            {previewLoading ? (
              <div className="flex flex-col h-full items-center justify-center text-slate-400 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                <p className="text-sm font-semibold animate-pulse">Loading Excel preview...</p>
              </div>
            ) : previewError ? (
              <div className="flex flex-col h-full items-center justify-center text-red-500 gap-2 bg-red-50 rounded-xl border border-red-100 p-6">
                <AlertCircle className="h-10 w-10 opacity-80" />
                <p className="text-sm font-bold">{previewError}</p>
                <p className="text-xs text-red-400 text-center max-w-sm mt-1">
                  The file might be corrupted, password-protected, or in an unsupported format. Please download it instead.
                </p>
              </div>
            ) : (
              <div 
                className="w-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-auto p-4 max-h-full
                  [&>table]:w-full [&>table]:border-collapse [&>table]:text-xs [&>table]:text-slate-700
                  [&>table>tbody>tr>td]:border [&>table>tbody>tr>td]:border-slate-200 [&>table>tbody>tr>td]:p-1.5 [&>table>tbody>tr>td]:whitespace-nowrap
                  [&>table>thead>tr>th]:border [&>table>thead>tr>th]:border-slate-300 [&>table>thead>tr>th]:p-2 [&>table>thead>tr>th]:bg-slate-50 [&>table>thead>tr>th]:font-bold [&>table>thead>tr>th]:text-left
                "
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
