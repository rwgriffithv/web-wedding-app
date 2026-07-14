import { Header } from "@/components/header";
import { FaqForm } from "./faq-form";
import { FaqList } from "./faq-list";
import { QuestionList } from "./question-list";
import { getAll as getAllFaq } from "@/lib/repository/faq";
import { getAll as getAllQuestions, getStats } from "@/lib/repository/questions";
import { getAllConfig } from "@/lib/repository/site-config";
import { RateLimitForm } from "@/components/rate-limit-form";

export default function AdminHelpPage() {
  const faqItems = getAllFaq();
  const questions = getAllQuestions();
  const stats = getStats();
  const config = Object.fromEntries(getAllConfig().map((c) => [c.key, c.value]));

  return (
    <>
      <Header title="Help" description="Manage FAQ and view party questions." />
      <details className="admin-section">
        <summary>Rate Limiting</summary>
        <div className="admin-section-body">
          <RateLimitForm
            config={config}
            maxKey="question_rate_limit_max"
            windowKey="question_rate_limit_window"
            description="Rate limiting for help question submissions, per party. Changes take effect on next request."
          />
        </div>
      </details>
      <details className="admin-section" open>
        <summary>Add FAQ Item</summary>
        <div className="admin-section-body">
          <FaqForm />
        </div>
      </details>
      <details className="admin-section" open>
        <summary>FAQ Items ({faqItems.length})</summary>
        <div className="admin-section-body">
          <FaqList items={faqItems} />
        </div>
      </details>
      <details className="admin-section" open>
        <summary>Party Questions ({stats.unanswered} unanswered)</summary>
        <div className="admin-section-body">
          <QuestionList questions={questions} stats={stats} />
        </div>
      </details>
    </>
  );
}
