import { getAll } from "@/lib/repository/schedule";
import { Header } from "@/components/header";
import { ScheduleList } from "./schedule-list";
import { ScheduleForm } from "./schedule-form";

export default function AdminSchedulePage() {
  const items = getAll();

  return (
    <>
      <Header title="Schedule" description="Manage the event schedule." />
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
