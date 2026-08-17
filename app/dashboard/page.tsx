import DashboardView from "@/components/DashboardView";
import SiteNav from "@/components/SiteNav";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard · HassMelden",
  description:
    "Dummy-Auswertungsdashboard für Meldungen nach Kategorie, Plattform und Status",
};

export default function DashboardPage() {
  return (
    <main className="px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto w-full max-w-6xl">
        <SiteNav active="dashboard" />
        <DashboardView />
      </div>
    </main>
  );
}
