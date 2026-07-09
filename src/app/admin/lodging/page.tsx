import { getAll } from "@/lib/repository/lodging";
import { Header } from "@/components/header";
import { LodgingList } from "./lodging-list";
import { LodgingForm } from "./lodging-form";

export default function AdminLodgingPage() {
  const options = getAll();

  return (
    <>
      <Header title="Lodging" description="Manage lodging options." />
      <LodgingList options={options} />
      <div style={{ marginTop: "2rem" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem" }}>Add Lodging Option</h2>
        <LodgingForm />
      </div>
    </>
  );
}
