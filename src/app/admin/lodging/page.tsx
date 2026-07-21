import { LODGING_TEXT_KEY } from "@/lib/constants";
import { getAll } from "@/lib/repository/lodging";
import { getConfig } from "@/lib/repository/site-config";
import { Header } from "@/components/header";
import { TabTextForm } from "@/components/tab-text-form";
import { LodgingList } from "./lodging-list";
import { LodgingForm } from "./lodging-form";
import { saveLodgingText } from "./actions";

export default function AdminLodgingPage() {
  const options = getAll();
  const lodgingText = getConfig(LODGING_TEXT_KEY);

  return (
    <>
      <Header title="Lodging" description="Manage lodging options." />
      <details className="admin-section" open>
        <summary>Lodging Intro Text</summary>
        <div className="admin-section-body">
          <TabTextForm label="Lodging Tab Intro Text" fieldName={LODGING_TEXT_KEY} currentText={lodgingText} maxLength={1000} action={saveLodgingText} />
        </div>
      </details>
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
