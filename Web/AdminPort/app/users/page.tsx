"use client";
import { useState } from "react";
import Link from "next/link";
import { Shell } from "@/components/shell";
import { Badge, Emp, Err, Ic, Ph, SecHead, Sk } from "@/components/reb-ui";
import { initials, shortDate } from "@/lib/admin";
import { useAdmin } from "@/lib/use-admin";
import type { Profile } from "@/lib/admin-types";

/*
  Learner directory — every row links to /users/:id, where access, role and
  payments are editable (GET/PUT /admin/users/:id behind it).
*/

export default function UsersPage() {
  const [q, setQ] = useState("");
  const [applied, setApplied] = useState("");
  const users = useAdmin<Profile[]>(`/admin/users?search=${encodeURIComponent(applied)}`);

  const rows = users.data ?? [];

  return (
    <Shell>
      <Ph
        title="Learners"
        sub="Search accounts, open a profile, and manage access, roles and payments."
        actions={
          <button type="button" className="reb-btn ghost sm" onClick={() => users.reload()}>
            <Ic name="refresh" size={14} /> Refresh
          </button>
        }
      />

      <form
        className="qa"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          setApplied(q);
        }}
        style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}
      >
        <div className="field-wrap" style={{ flex: "1 1 300px" }}>
          <Ic name="search" size={15} />
          <label className="sr-only" htmlFor="ad-user-search" style={{ position: "absolute", left: -9999 }}>
            Search by name or email
          </label>
          <input
            id="ad-user-search"
            className="reb-input"
            type="search"
            style={{ background: "transparent", border: 0, padding: "9px 0" }}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or email…"
          />
        </div>
        <button type="submit" className="reb-btn pri sm">
          <Ic name="search" size={14} /> Search
        </button>
        {applied ? (
          <button
            type="button"
            className="reb-btn ghost sm"
            onClick={() => {
              setQ("");
              setApplied("");
            }}
          >
            <Ic name="x" size={14} /> Clear
          </button>
        ) : null}
      </form>

      {users.error ? <Err msg={users.error} onRetry={users.reload} /> : null}

      <section className="reb-card">
        <SecHead icon="users" title={`Accounts · ${rows.length}`} />
        {users.loading && rows.length === 0 ? (
          <Sk h={54} mb={8} />
        ) : rows.length === 0 && !users.error ? (
          <Emp
            icon="users"
            title={applied ? `No accounts match "${applied}"` : "No learners yet"}
            note={applied ? "Try a different name or email." : "Accounts appear here as soon as learners register."}
          />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="tbl">
              <caption style={{ display: "none" }}>Registered accounts</caption>
              <thead>
                <tr>
                  <th scope="col">Account</th>
                  <th scope="col">Email</th>
                  <th scope="col">Role</th>
                  <th scope="col">Status</th>
                  <th scope="col">Joined</th>
                  <th scope="col">
                    <span>Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span className="avatar" style={{ width: 30, height: 30, fontSize: 11 }}>
                          {initials(u.full_name || u.email)}
                        </span>
                        <Link href={`/users/${u.id}`} style={{ fontWeight: 700, color: "inherit" }}>
                          {u.full_name || "—"}
                        </Link>
                      </span>
                    </td>
                    <td className="hint">{u.email}</td>
                    <td>
                      <Badge tone={u.role === "ADMIN" ? "brand" : u.role === "INSTRUCTOR" ? "info" : ""}>
                        {u.role}
                      </Badge>
                    </td>
                    <td>{u.is_active ? <Badge tone="ok">Active</Badge> : <Badge tone="danger">Disabled</Badge>}</td>
                    <td className="hint">{shortDate(u.created_at)}</td>
                    <td>
                      <Link className="reb-btn ghost sm" href={`/users/${u.id}`}>
                        <Ic name="eye" size={13} /> Manage
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </Shell>
  );
}
