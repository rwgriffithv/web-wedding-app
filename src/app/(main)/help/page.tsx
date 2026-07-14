import Link from "next/link";
import { parseSession } from "@/lib/auth";
import { getAll as getAllFaq } from "@/lib/repository/faq";
import { getByPartyId } from "@/lib/repository/questions";
import { FaqContent } from "./faq-content";
import { MyQuestions } from "./my-questions";

interface HelpPageProps {
  searchParams: Promise<{ tab?: string }>;
}

const TABS = [
  { id: "faq", label: "FAQ" },
  { id: "my-questions", label: "My Questions" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function isValidTab(tab: string | undefined): tab is TabId {
  return TABS.some((t) => t.id === tab);
}

export default async function HelpPage({ searchParams }: HelpPageProps) {
  const params = await searchParams;
  const session = await parseSession();
  const activeTab: TabId = isValidTab(params.tab) ? params.tab : "faq";

  const faqItems = getAllFaq();
  const partyQuestions = session?.partyId ? getByPartyId(session.partyId) : [];

  return (
    <div className="page-content">
      <h1>Help</h1>

      <nav className="content-tabs" role="tablist" aria-label="Help sections">
        {TABS.map((tab) => (
          <Link
            key={tab.id}
            id={`help-tab-${tab.id}`}
            href={tab.id === "faq" ? "/help" : `/help?tab=${tab.id}`}
            className={`content-tab${activeTab === tab.id ? " active" : ""}`}
            role="tab"
            tabIndex={0}
            aria-selected={activeTab === tab.id}
            aria-controls={`help-panel-${tab.id}`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {activeTab === "faq" && (
        <div id="help-panel-faq" role="tabpanel" aria-labelledby="help-tab-faq">
          <FaqContent items={faqItems} />
        </div>
      )}

      {activeTab === "my-questions" && (
        <div id="help-panel-my-questions" role="tabpanel" aria-labelledby="help-tab-my-questions">
          {session?.partyId ? (
            <MyQuestions questions={partyQuestions} />
          ) : (
            <p className="empty-state">Questions are only available when logged in with a party code.</p>
          )}
        </div>
      )}
    </div>
  );
}
