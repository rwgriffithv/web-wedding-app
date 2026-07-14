import type { FaqItem } from "@/lib/db";

export function FaqContent({ items }: { items: FaqItem[] }) {
  if (items.length === 0) {
    return <p className="empty-state">No FAQ items yet.</p>;
  }

  return (
    <div className="faq-list">
      {items.map(item => (
        <div className="faq-item" key={item.id}>
          <div className="help-question">
            <strong>Q:</strong> {item.question}
          </div>
          <div className="help-answer">
            <strong>A:</strong> {item.answer}
          </div>
        </div>
      ))}
    </div>
  );
}
