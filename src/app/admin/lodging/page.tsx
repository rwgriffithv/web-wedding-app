import { getAll } from "@/lib/repository/lodging";
import { Header } from "@/components/header";
import { LodgingList } from "./lodging-list";
import { LodgingForm } from "./lodging-form";

export default function AdminLodgingPage() {
  const options = getAll();

  return (
    <>
      <Header title="Lodging" description="Manage lodging options." />
      <details className="admin-section" open>
        <summary>Add Lodging Option</summary>
        <div className="admin-section-body">
          <LodgingForm />
        </div>
      </details>
      <details className="admin-section" open>
        <summary>Lodging Options ({options.length})</summary>
        <div className="admin-section-body">
          <LodgingList options={options} />
        </div>
      </details>
    </>
  );
}
