import { getAll } from "@/lib/repository/schedule";
import { Header } from "@/components/header";
import { ScheduleList } from "./schedule-list";
import { ScheduleForm } from "./schedule-form";

export default function AdminSchedulePage() {
  const items = getAll();

  return (
    <>
      <Header title="Schedule" description="Manage the event schedule." />
      <ScheduleList items={items} />
      <div style={{ marginTop: "2rem" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem" }}>Add Schedule Item</h2>
        <ScheduleForm />
      </div>
    </>
  );
}
