import { getAll } from "@/lib/repository/schedule";
import { getConfig } from "@/lib/repository/site-config";
import { Header } from "@/components/header";
import { TabTextForm } from "@/components/tab-text-form";
import { ScheduleList } from "./schedule-list";
import { ScheduleForm } from "./schedule-form";
import { saveScheduleText } from "./actions";

export default function AdminSchedulePage() {
  const items = getAll();
  const scheduleText = getConfig("schedule_text");

  return (
    <>
      <Header title="Schedule" description="Manage the event schedule." />
      <details className="admin-section" open>
        <summary>Schedule Intro Text</summary>
        <div className="admin-section-body">
          <TabTextForm label="Schedule Tab Intro Text" fieldName="schedule_text" currentText={scheduleText} maxLength={1000} action={saveScheduleText} />
        </div>
      </details>
      <details className="admin-section" open>
        <summary>Add Schedule Item</summary>
        <div className="admin-section-body">
          <ScheduleForm />
        </div>
      </details>
      <details className="admin-section" open>
        <summary>Schedule Items ({items.length})</summary>
        <div className="admin-section-body">
          <ScheduleList items={items} />
        </div>
      </details>
    </>
  );
}
