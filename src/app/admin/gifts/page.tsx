import { getConfig } from "@/lib/repository/site-config";
import { Header } from "@/components/header";
import { TabTextForm } from "@/components/tab-text-form";
import { saveGiftsText } from "./actions";

export default function AdminGiftsPage() {
  const giftsText = getConfig("gifts_text");

  return (
    <>
      <Header title="Gifts" description="Manage the gift registry information shown on the Guide page." />
      <details className="admin-section" open>
        <summary>Gifts Intro Text</summary>
        <div className="admin-section-body">
          <TabTextForm label="Gifts Tab Intro Text" fieldName="gifts_text" currentText={giftsText} maxLength={1000} action={saveGiftsText} />
        </div>
      </details>
    </>
  );
}
