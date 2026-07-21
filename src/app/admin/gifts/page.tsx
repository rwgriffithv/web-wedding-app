import { GIFTS_TEXT_KEY } from "@/lib/constants";
import { getConfig } from "@/lib/repository/site-config";
import { Header } from "@/components/header";
import { TabTextForm } from "@/components/tab-text-form";
import { saveGiftsText } from "./actions";

export default function AdminGiftsPage() {
  const giftsText = getConfig(GIFTS_TEXT_KEY);

  return (
    <>
      <Header title="Gifts" description="Manage the gift registry information shown on the Guide page." />
      <details className="admin-section" open>
        <summary>Gifts Intro Text</summary>
        <div className="admin-section-body">
          <TabTextForm label="Gifts Tab Intro Text" fieldName={GIFTS_TEXT_KEY} currentText={giftsText} maxLength={1000} action={saveGiftsText} />
        </div>
      </details>
    </>
  );
}
