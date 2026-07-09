import { getImages } from "@/lib/repository/dress-code";
import { Header } from "@/components/header";
import { DressCodeImageList } from "./image-list";
import { DressCodeImageForm } from "./image-form";

export default function AdminDressCodePage() {
  const images = getImages();

  return (
    <>
      <Header title="Dress Code" description="Manage dress code mood board images." />
      <DressCodeImageList images={images} />
      <div style={{ marginTop: "2rem" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem" }}>Add Image</h2>
        <DressCodeImageForm />
      </div>
    </>
  );
}
