import { getAll } from "@/lib/repository/media";
import { Header } from "@/components/header";
import { MediaList } from "./media-list";
import { MediaForm } from "./media-form";

export default function AdminMediaPage() {
  const items = getAll();

  return (
    <>
      <Header title="Media Gallery" description="Manage photos and videos." />
      <MediaList items={items} />
      <div style={{ marginTop: "2rem" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem" }}>Add Media</h2>
        <MediaForm />
      </div>
    </>
  );
}
