import { getAllUsers, getPartyActivity } from "@/lib/repository/users";
import { Header } from "@/components/header";
import { UserForm } from "./user-form";
import { UserList } from "./user-list";
import { ActivityTable } from "./activity-table";

export default function AdminUsersPage() {
  const allUsers = getAllUsers();
  const editableUsers = allUsers.filter(u => u.type !== "party");
  const partyUsers = allUsers.filter(u => u.type === "party");
  const primaryAdminUsername = process.env.ADMIN_USERNAME ?? "admin";
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
          <div className="admin-list">
            {editableUsers.length === 0 && (
              <p className="empty-state">No users yet.</p>
            )}
            {editableUsers.map((u) => (
              <UserList key={u.id} user={u} isPrimaryAdmin={u.type === "admin" && u.username === primaryAdminUsername} />
            ))}
          </div>
        </div>
      </details>
      {partyUsers.length > 0 && (
        <details className="admin-section">
          <summary>System Accounts &mdash; Party Users ({partyUsers.length})</summary>
          <div className="admin-section-body">
            <p className="text-muted text-sm" style={{ marginBottom: "0.75rem" }}>
              These accounts are created automatically when parties are added. Their username and password match the party code used to log in. Manage them from the <a href="/admin/parties">Parties</a> page.
            </p>
            <div className="admin-list">
              {partyUsers.map((u) => (
                <div key={u.id} className="admin-list-item">
                  <div className="item-info">
                    <div className="item-title">{u.display_name}</div>
                    <div className="item-meta">
                      <span style={{ fontFamily: "monospace" }}>{u.username}</span> &middot; Type: party
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </details>
      )}
      <details className="admin-section">
        <summary>Activity</summary>
        <div className="admin-section-body">
          <p className="text-muted text-sm" style={{ marginBottom: "0.75rem" }}>
            Login and page view activity for party users. Click column headers to sort.
          </p>
          <ActivityTable users={activityUsers} />
        </div>
      </details>
    </>
  );
}
