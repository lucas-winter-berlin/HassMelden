import ComplaintForm from "@/components/ComplaintForm";
import SiteNav from "@/components/SiteNav";

export default function Home() {
  return (
    <main className="px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto w-full max-w-6xl">
        <SiteNav active="home" />
      </div>
      <ComplaintForm />
    </main>
  );
}
