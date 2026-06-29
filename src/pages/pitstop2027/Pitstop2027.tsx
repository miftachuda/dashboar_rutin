import * as Tabs from "@radix-ui/react-tabs";
import DashboardLayout from "@/components/MainLayout";
import AdditionalsJoblist from "./AdditionalsJoblist";
import CleaningStrainer from "./CleaningStrainer";
import DailyActivity from "./DailyActivity";
import Main from "./Main";
import Progress from "./Progress";
import RestrokeCV from "./RestrokeCV";

const tabs = [
  { value: "progress", label: "Progress", Component: Progress },
  { value: "main", label: "Main", Component: Main },
  {
    value: "additionals-joblist",
    label: "Additionals Joblist",
    Component: AdditionalsJoblist,
  },
  { value: "restroke-cv", label: "Restroke CV", Component: RestrokeCV },
  { value: "daily-activity", label: "Daily ActiviTy", Component: DailyActivity },
  {
    value: "cleaning-strainer",
    label: "Cleaning Strainer",
    Component: CleaningStrainer,
  },
];

export default function Pitstop2027() {
  return (
    <DashboardLayout>
      <Tabs.Root defaultValue="progress" className="flex h-full flex-col bg-slate-50">
        <div className="border-b border-sky-100 bg-white px-4 py-3 shadow-sm sm:px-6">
          <Tabs.List className="flex gap-2 overflow-x-auto whitespace-nowrap" aria-label="Pitstop 2027 menu">
            {tabs.map(({ value, label }) => (
              <Tabs.Trigger
                key={value}
                value={value}
                className="rounded-full border border-sky-100 px-4 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-50 data-[state=active]:border-sky-500 data-[state=active]:bg-sky-500 data-[state=active]:text-white data-[state=active]:shadow-sm"
              >
                {label}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-4 sm:p-6">
          {tabs.map(({ value, Component }) => (
            <Tabs.Content key={value} value={value} className="h-full outline-none">
              <Component />
            </Tabs.Content>
          ))}
        </div>
      </Tabs.Root>
    </DashboardLayout>
  );
}
