"use client";
import { useState } from "react";
import Link from "next/link";
import { Shell } from "@/components/shell";
import { Icon } from "@/components/icons";
import { Avatar, Badge, EmptyState, ErrorNote, PageHead, SectionHead, Skeleton } from "@/components/ui";
import { shortDate } from "@/lib/admin";
import { useAdmin } from "@/lib/use-admin";
import type { Profile } from "@/lib/admin-types";

/*
  Learner directory.

  Previously this list rendered rows that could not be opened, so the console
  could see that a learner existed but not inspect or fix anything about them.
  Every row now links to /users/:id, where access, role and payments are
  editable — and /admin/users/:id is the endpoint behind it.
*/

export default function UsersPage() {
  const [q, setQ] = useState("");
  const [applied, setApplied] = useState("");
  const users = useAdmin<Profile[]>(`/admin/users?search=${encodeURIComponent(applied)}`);

  const rows = users.data ?? [];

  return (
    <Shell>
      <PageHead
        title="Learners"
        sub="Search accounts, open a profile, and manage access, roles and payments."
        actions={
          <button type="button" className="ad-btn ad-btn-ghost" onClick={() => users.reload()}>
            <Icon name="refresh" size={14} /> Refresh
          </button>
        }
      />

      <form
        className="ad-toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          setApplied(q);
        }}
        role="search"
      >
        <div className="ad-field" style={{ flex: "1 1 320px" }}>
          <label className="ad-label" htmlFor="ad-user-search">
            Search by name or email
          </label>
          <input
            id="ad-user-search"
            className="ad-input"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="e.g. ada@example.com"
          />
        </div>
        <button type="submit" className="ad-btn ad-btn-primary">
          <Icon name="search" size={14} /> Search
        </button>
        {applied ? (
          <button
            type="button"
            className="ad-btn ad-btn-ghost"
            onClick={() => {
              setQ("");
              setApplied("");
            }}
          >
            <Icon name="x" size={14} /> Clear
          </button>
        ) : null}
      </form>

      {users.error ? <ErrorNote message={users.error} onRetry={users.reload} /> : null}

      {users.loading && rows.length === 0 ? (
        <Skeleton height={62} count={5} />
      ) : rows.length === 0 && !users.error ? (
        <EmptyState
          icon="users"
          title={applied ? `No accounts match “${applied}”` : "No learners yet"}
          body={applied ? "Try a different name or email." : "Accounts appear here as soon as learners register."}
        />
      ) : (
        <>
          <SectionHead title="Accounts" count={rows.length} />
          <div className="ad-card ad-card-pad-0">
            <div className="ad-table-wrap">
              <table className="ad-table">
                <caption className="ad-sr-only">Registered accounts</caption>
                <thead>
                  <tr>
                    <th scope="col">Account</th>
                    <th scope="col">Email</th>
                    <th scope="col">Role</th>
                    <th scope="col">Status</th>
                    <th scope="col">Joined</th>
                    <th scope="col">
                      <span className="ad-sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <Avatar name={u.full_name || u.email} />
                          <Link className="ad-row-title" href={`/users/${u.id}`}>
                            {u.full_name || "—"}
                          </Link>
                        </span>
                      </td>
                      <td className="ad-muted">{u.email}</td>
                      <td>
                        <Badge tone={u.role === "ADMIN" ? "brand" : u.role === "INSTRUCTOR" ? "info" : "neutral"}>
                          {u.role}
                        </Badge>
                      </td>
                      <td>{u.is_active ? <Badge tone="ok">Active</Badge> : <Badge tone="danger">Disabled</Badge>}</td>
                      <td className="ad-muted">{shortDate(u.created_at)}</td>
                      <td>
                        <span className="ad-row-actions">
                          <Link className="ad-btn ad-btn-ghost ad-btn-sm" href={`/users/${u.id}`}>
                            <Icon name="eye" size={13} /> Manage
                          </Link>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </Shell>
  );
}
