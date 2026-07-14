import { getImages } from "@/lib/repository/dress-code";
import { getConfig } from "@/lib/repository/site-config";
import { Header } from "@/components/header";
import { TabTextForm } from "@/components/tab-text-form";
import { DressCodeImageList } from "./image-list";
import { DressCodeImageForm } from "./image-form";
import { saveDressCodeText } from "./actions";

export default function AdminDressCodePage() {
  const images = getImages();
  const dressCodeText = getConfig("dress_code_text");

  return (
    <>
      <Header title="Dress Code" description="Manage dress code description and mood board images." />
      <details className="admin-section" open>
        <summary>Dress Code Description</summary>
        <div className="admin-section-body">
          <TabTextForm label="Dress Code Description" fieldName="dress_code_text" currentText={dressCodeText} maxLength={5000} action={saveDressCodeText} />
        </div>
      </details>
      <details className="admin-section" open>
        <summary>Add Image</summary>
        <div className="admin-section-body">
          <DressCodeImageForm />
        </div>
      </details>
      <details className="admin-section" open>
        <summary>Mood Board Images ({images.length})</summary>
        <div className="admin-section-body">
          <DressCodeImageList images={images} />
        </div>
      </details>
    </>
  );
}
