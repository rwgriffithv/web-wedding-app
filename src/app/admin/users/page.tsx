import { getAllUsers, getPartyActivity } from "@/lib/repository/users";
import { getEnvConfig } from "@/lib/env";
import { Header } from "@/components/header";
import { UserForm } from "./user-form";
import { UserTable } from "./user-table";
import { PartyUserTable } from "./party-user-table";
import { ActivityTable } from "./activity-table";

export default function AdminUsersPage() {
  const allUsers = getAllUsers();
  const editableUsers = allUsers.filter(u => u.type !== "party");
  const partyUsers = allUsers.filter(u => u.type === "party");
  const primaryAdminUsername = getEnvConfig().adminUsername;
  const activityUsers = getPartyActivity();

  return (
    <>
      <Header title="Users" description="Manage user accounts for admin and viewer access." />
      <details className="admin-section" open>
        <summary>Add User</summary>
        <div className="admin-section-body">
          <UserForm />
        </div>
      </details>
      <details className="admin-section" open>
        <summary>Users ({editableUsers.length})</summary>
        <div className="admin-section-body">
          <UserTable users={editableUsers} primaryAdminUsername={primaryAdminUsername} />
        </div>
      </details>
      {partyUsers.length > 0 && (
        <details className="admin-section">
          <summary>System Accounts &mdash; Party Users ({partyUsers.length})</summary>
          <div className="admin-section-body">
            <p className="text-muted text-sm mb-3">
              These accounts are created automatically when parties are added. Their username and password match the party code used to log in. Manage them from the <a href="/admin/parties">Parties</a> page.
            </p>
            <PartyUserTable partyUsers={partyUsers} />
          </div>
        </details>
      )}
      <details className="admin-section">
        <summary>Activity</summary>
        <div className="admin-section-body">
          <p className="text-muted text-sm mb-3">
            Login and page view activity for party users. Click column headers to sort.
          </p>
          <ActivityTable users={activityUsers} />
        </div>
      </details>
    </>
  );
}
