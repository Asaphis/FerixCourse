"use client";
import { useCallback, useEffect, useState } from "react";
import { Shell } from "@/components/shell";
import { Badge, Emp, Err, Ic, Ph, SecHead, SkList, toast, ToastHost } from "@/components/reb-ui";
import { adminFetch, createCategory, deleteCategory, getCategories, money, updateCategory } from "@/lib/admin";
import type { CategoryRow } from "@/lib/admin-types";

/*
  Settings — the registration fee (PUT /admin/settings/:key) plus the Categories
  tab (GET/POST/PATCH/DELETE /admin/categories). The API answers 409 when a
  category is duplicated or still used by courses; that message is shown as-is
  instead of being swallowed.
*/

type SettingRow = { key: string; value: unknown; updated_at: string };

export default function SettingsPage() {
  const [tab, setTab] = useState<"fee" | "categories">("fee");
  const [settings, setSettings] = useState<SettingRow[]>([]);
  const [fee, setFee] = useState({ enabled: false, amount_kobo: 0, currency: "NGN", description: "" });
  const [savingFee, setSavingFee] = useState(false);
  const [msg, setMsg] = useState("");

  const [cats, setCats] = useState<CategoryRow[]>([]);
  const [catName, setCatName] = useState("");
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [catError, setCatError] = useState("");

  const loadSettings = useCallback(async () => {
    try {
      const s = (await adminFetch<SettingRow[]>("/admin/settings")) ?? [];
      setSettings(s);
      const f = s.find((x) => x.key === "registration_fee");
      if (!f?.value) return;
      try {
        const parsed = typeof f.value === "string" ? JSON.parse(f.value) : f.value;
        if (parsed && typeof parsed === "object") setFee((prev) => ({ ...prev, ...(parsed as typeof fee) }));
      } catch {
        /* Legacy non-JSON value — keep the defaults rather than break the form. */
      }
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Could not load settings.");
    }
  }, []);

  const loadCats = useCallback(async () => {
    setCatError("");
    try {
      setCats(await getCategories());
    } catch (e: unknown) {
      setCatError(e instanceof Error ? e.message : "Could not load categories.");
    }
  }, []);

  useEffect(() => {
    void loadSettings();
    void loadCats();
  }, [loadSettings, loadCats]);

  async function saveFee(e: React.FormEvent) {
    e.preventDefault();
    setSavingFee(true);
    setMsg("");
    try {
      await adminFetch("/admin/settings/registration_fee", { method: "PUT", body: JSON.stringify({ value: fee }) });
      setMsg("Registration fee saved.");
      toast("Settings saved");
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Could not save the setting.");
    } finally {
      setSavingFee(false);
    }
  }

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    const name = catName.trim();
    if (!name) return;
    setAdding(true);
    setCatError("");
    try {
      await createCategory({ name });
      setCatName("");
      await loadCats();
      toast("Category added");
    } catch (err: unknown) {
      setCatError(err instanceof Error ? err.message : "Could not add the category.");
    } finally {
      setAdding(false);
    }
  }

  async function rename(c: CategoryRow) {
    const name = window.prompt("New name", c.name);
    if (!name || name.trim() === c.name) return;
    setBusyId(c.id);
    setCatError("");
    try {
      await updateCategory(c.id, { name: name.trim() });
      await loadCats();
    } catch (e: unknown) {
      setCatError(e instanceof Error ? e.message : "Could not rename the category.");
    } finally {
      setBusyId("");
    }
  }

  async function remove(c: CategoryRow) {
    if (!window.confirm(`Delete "${c.name}"?`)) return;
    setBusyId(c.id);
    setCatError("");
    try {
      await deleteCategory(c.id);
      await loadCats();
      toast("Category deleted");
    } catch (e: unknown) {
      // 409 carries used_by — show the server's reason instead of a generic error.
      setCatError(e instanceof Error ? e.message : "Could not delete the category.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <Shell>
      <Ph title="Settings" sub="Platform settings and the categories used across the catalog." />

      <div className="tabs" role="tablist" aria-label="Settings sections" style={{ marginBottom: 18 }}>
        <button type="button" role="tab" aria-selected={tab === "fee"} className={tab === "fee" ? "on" : undefined} onClick={() => setTab("fee")}>
          <Ic name="settings" size={14} /> Registration fee
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "categories"}
          className={tab === "categories" ? "on" : undefined}
          onClick={() => setTab("categories")}
        >
          <Ic name="layers" size={14} /> Categories <span className="cnt">{cats.length}</span>
        </button>
      </div>

      {msg ? (
        <div className="alert" role="status" style={{ marginBottom: 14 }}>
          <Ic name="check" size={16} />
          <span style={{ flex: 1 }}>{msg}</span>
        </div>
      ) : null}

      {tab === "fee" ? (
        <form onSubmit={saveFee} className="reb-card" style={{ maxWidth: 720 }}>
          <SecHead icon="dollar" title="Registration fee" />
          <p className="sub" style={{ marginTop: 0 }}>Charged once when a learner registers. Leave disabled for free sign-ups.</p>
          <label className="qa" style={{ display: "flex", gap: 10, alignItems: "center", cursor: "pointer" }}>
            <input type="checkbox" checked={fee.enabled} onChange={(e) => setFee({ ...fee, enabled: e.target.checked })} />
            <span style={{ flex: 1 }}>
              <b style={{ fontSize: 13.5 }}>Enabled</b>
              <span className="hint" style={{ display: "block" }}>{fee.enabled ? "New accounts are charged on sign-up" : "Sign-up stays free"}</span>
            </span>
          </label>
          <div className="field">
            <label htmlFor="st-amount" className="kind">Amount (kobo)</label>
            <input
              id="st-amount"
              className="reb-input"
              type="number"
              min={0}
              value={fee.amount_kobo}
              onChange={(e) => setFee({ ...fee, amount_kobo: Number(e.target.value) })}
            />
            <p className="hint">{money(fee.amount_kobo, fee.currency)}</p>
          </div>
          <div className="field">
            <label htmlFor="st-cur" className="kind">Currency</label>
            <input id="st-cur" className="reb-input" value={fee.currency} onChange={(e) => setFee({ ...fee, currency: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="st-desc" className="kind">Description</label>
            <input id="st-desc" className="reb-input" value={fee.description} onChange={(e) => setFee({ ...fee, description: e.target.value })} />
          </div>
          <button type="submit" className="reb-btn pri" disabled={savingFee}>
            <Ic name="check" size={15} /> {savingFee ? "Saving…" : "Save fee"}
          </button>
        </form>
      ) : (
        <div className="grid2">
          <section className="reb-card">
            <SecHead icon="layers" title={`Categories · ${cats.length}`} />
            {catError ? <Err msg={catError} /> : null}
            {cats.length === 0 ? (
              <Emp icon="layers" title="No categories" note="Categories group courses in the learner catalog. Add your first one." />
            ) : (
              <div>
                {cats.map((c) => (
                  <div key={c.id} className="qa" style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <b style={{ fontSize: 13.5 }}>{c.name}</b>
                      <span className="hint" style={{ display: "block" }}>/{c.slug}</span>
                    </span>
                    <Badge tone={c.course_count ? "info" : ""}>{c.course_count} courses</Badge>
                    <button type="button" className="reb-btn ghost sm" onClick={() => void rename(c)} disabled={busyId === c.id} aria-label={`Rename ${c.name}`}>
                      <Ic name="edit" size={13} />
                    </button>
                    <button type="button" className="reb-btn ghost sm" onClick={() => void remove(c)} disabled={busyId === c.id} aria-label={`Delete ${c.name}`}>
                      <Ic name="trash" size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="reb-card">
            <SecHead icon="plus" title="Add a category" />
            <form onSubmit={addCategory}>
              <div className="field">
                <label htmlFor="cat-name" className="kind">Name</label>
                <input
                  id="cat-name"
                  className="reb-input"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="e.g. Backend engineering"
                  required
                />
                <p className="hint">The slug is generated from the name.</p>
              </div>
              <button type="submit" className="reb-btn pri" disabled={adding || !catName.trim()}>
                <Ic name="plus" size={15} /> {adding ? "Adding…" : "Add category"}
              </button>
            </form>
          </section>
        </div>
      )}

      {tab === "fee" && settings.length > 0 ? (
        <section className="reb-card" style={{ marginTop: 18, maxWidth: 720 }}>
          <SecHead icon="list" title={`All settings · ${settings.length}`} />
          {settings.map((s) => (
            <div key={s.key} className="kv">
              <b>{s.key}</b>
              <span style={{ color: "var(--muted)", fontSize: 12.5, wordBreak: "break-word" }}>
                {typeof s.value === "string" ? s.value : JSON.stringify(s.value)}
              </span>
            </div>
          ))}
        </section>
      ) : null}
      <ToastHost />
    </Shell>
  );
}
