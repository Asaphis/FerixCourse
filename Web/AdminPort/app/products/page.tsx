"use client";
import { useCallback, useEffect, useState } from "react";
import {
  createProduct,
  getCategories,
  getProducts,
  money,
  patch,
  shortDate,
} from "@/lib/admin";
import type { CategoryRow, ProductInput, ProductRow } from "@/lib/admin-types";
import { Badge, Emp, Err, Ic, Modal, Ph, SkList, toast, ToastHost } from "@/components/reb-ui";
import { Shell } from "@/components/shell";

/*
  Products — one list across courses and classrooms (GET /admin/products), the
  3-step create wizard (POST /admin/products) and publish toggles through the
  existing PATCH endpoints. Nothing is invented: counts come from the API.
*/

const LEVELS = ["Beginner", "Intermediate", "Advanced"];
const STEPS = ["Basics", "Details", "Review"] as const;

export default function ProductsPage() {
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [cats, setCats] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<"" | "Course" | "Classroom">("");

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState<ProductInput>({ kind: "Course", title: "", level: "Beginner", price_kobo: 0 });

  const load = useCallback(async () => {
    setError("");
    try {
      const [p, c] = await Promise.all([getProducts(), getCategories()]);
      setRows(p);
      setCats(c);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not load products.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = rows.filter((r) => {
    if (kind && r.kind !== kind) return false;
    if (q && !`${r.title} ${r.slug} ${r.category_name ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  async function togglePublish(r: ProductRow) {
    const next = !r.is_published;
    setError("");
    try {
      const path = r.kind === "Course" ? `/admin/courses/${r.id}` : `/admin/classrooms/${r.id}`;
      await patch(path, { is_published: next });
      setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, is_published: next } : x)));
      toast(`${r.title} ${next ? "published" : "unpublished"}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not change the publish state.");
    }
  }

  function startWizard() {
    setStep(0);
    setFormError("");
    setForm({ kind: kind || "Course", title: "", level: "Beginner", price_kobo: 0, is_published: false });
    setOpen(true);
  }

  async function create() {
    if (!form.title.trim()) {
      setFormError("A title is required.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const created = await createProduct({ ...form, title: form.title.trim() });
      setRows((prev) => [created, ...prev]);
      setOpen(false);
      toast(`${created.title} created`);
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : "Could not create the product.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Shell>
      <Ph
        title="Products"
        sub="Courses and live cohorts in one place. Publish state here is what learners see in the catalog."
        actions={
          <button type="button" className="reb-btn pri" onClick={startWizard}>
            <Ic name="plus" size={15} /> New product
          </button>
        }
      />

      {error ? <Err msg={error} onRetry={() => void load()} /> : null}

      <div className="qa" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div className="field-wrap" style={{ minWidth: 220 }}>
          <Ic name="search" size={15} />
          <input
            className="reb-input"
            style={{ background: "transparent", border: 0, padding: "9px 0" }}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products…"
            aria-label="Search products"
          />
        </div>
        <button type="button" className={`reb-btn sm ${kind === "" ? "pri" : "ghost"}`} onClick={() => setKind("")}>
          All · {rows.length}
        </button>
        <button type="button" className={`reb-btn sm ${kind === "Course" ? "pri" : "ghost"}`} onClick={() => setKind("Course")}>
          Courses · {rows.filter((r) => r.kind === "Course").length}
        </button>
        <button type="button" className={`reb-btn sm ${kind === "Classroom" ? "pri" : "ghost"}`} onClick={() => setKind("Classroom")}>
          Cohorts · {rows.filter((r) => r.kind === "Classroom").length}
        </button>
      </div>

      {loading ? (
        <SkList rows={4} />
      ) : filtered.length === 0 ? (
        <div className="reb-card">
          <Emp
            icon="bookOpen"
            title="No products yet"
            note="Create your first course or live cohort — it appears in the learner catalog the moment you publish it."
            action={
              <button type="button" className="reb-btn pri sm" onClick={startWizard}>
                <Ic name="plus" size={14} /> New product
              </button>
            }
          />
        </div>
      ) : (
        <div className="card-grid">
          {filtered.map((r) => (
            <article key={r.id} className="tile">
              <h3>
                <Ic name={r.kind === "Course" ? "bookOpen" : "monitorPlay"} size={14} />
                {r.kind === "Course" ? "Course" : "Live cohort"}
              </h3>
              <p style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.25 }}>{r.title}</p>
              <p className="hint">
                {r.category_name ? `${r.category_name} · ` : ""}
                {r.level} · created {shortDate(r.created_at)}
              </p>
              <p className="sub" style={{ marginTop: 6 }}>
                {r.kind === "Classroom"
                  ? `${r.enrolled}/${r.capacity ?? 0} seats · ${r.schedule_text || "schedule TBD"}`
                  : `${r.enrolled} enrolled`}
              </p>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 800 }}>{money(r.price_kobo, r.currency)}</span>
                <Badge tone={r.is_published ? "ok" : ""}>{r.is_published ? "Published" : "Draft"}</Badge>
                <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                  <button type="button" className="reb-btn ghost sm" onClick={() => void togglePublish(r)}>
                    {r.is_published ? "Unpublish" : "Publish"}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New product"
        sub="Courses and cohorts share the same listing shape."
        footer={
          <>
            {step > 0 ? (
              <button type="button" className="reb-btn ghost" onClick={() => setStep((s) => s - 1)}>
                Back
              </button>
            ) : null}
            <div style={{ flex: 1 }} />
            <button type="button" className="reb-btn ghost" onClick={() => setOpen(false)}>
              Cancel
            </button>
            {step < 2 ? (
              <button
                type="button"
                className="reb-btn pri"
                onClick={() => {
                  if (step === 0 && !form.title.trim()) {
                    setFormError("Give it a title first.");
                    return;
                  }
                  setFormError("");
                  setStep((s) => s + 1);
                }}
              >
                Continue
              </button>
            ) : (
              <button type="button" className="reb-btn pri" onClick={() => void create()} disabled={saving}>
                {saving ? "Creating…" : "Create product"}
              </button>
            )}
          </>
        }
      >
        <div className="steps">
          {STEPS.map((s, i) => (
            <span key={s} className={`step${i === step ? " on" : ""}`}>
              <Ic name={i < step ? "check" : "info"} size={14} /> {i + 1}. {s}
            </span>
          ))}
        </div>

        {step === 0 && (
          <div>
            <div className="field">
              <label htmlFor="pd-kind" className="kind">Type</label>
              <div style={{ display: "flex", gap: 8 }}>
                {(["Course", "Classroom"] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    className={`reb-btn sm ${form.kind === k ? "pri" : "ghost"}`}
                    onClick={() => setForm({ ...form, kind: k })}
                  >
                    <Ic name={k === "Course" ? "bookOpen" : "monitorPlay"} size={14} /> {k === "Course" ? "Course" : "Live cohort"}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <label htmlFor="pd-title" className="kind">Title</label>
              <input
                id="pd-title"
                className="reb-input"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder={form.kind === "Course" ? "e.g. Product Design Sprint" : "e.g. Backend Cohort — September"}
              />
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <div className="field">
              <label htmlFor="pd-level" className="kind">Level</label>
              <select
                id="pd-level"
                className="select"
                value={form.level ?? "Beginner"}
                onChange={(e) => setForm({ ...form, level: e.target.value })}
              >
                {LEVELS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="pd-price" className="kind">Price (kobo)</label>
              <input
                id="pd-price"
                className="reb-input"
                type="number"
                min={0}
                step={100}
                value={form.price_kobo ?? 0}
                onChange={(e) => setForm({ ...form, price_kobo: Number(e.target.value) || 0 })}
              />
              <p className="hint">{money(form.price_kobo ?? 0)}</p>
            </div>

            {form.kind === "Course" ? (
              <div className="field">
                <label htmlFor="pd-cat" className="kind">Category</label>
                <select
                  id="pd-cat"
                  className="select"
                  value={form.category_id ?? ""}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value || null })}
                >
                  <option value="">No category</option>
                  {cats.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <p className="hint">Manage categories in Settings.</p>
              </div>
            ) : (
              <>
                <div className="field">
                  <label htmlFor="pd-cap" className="kind">Seats</label>
                  <input
                    id="pd-cap"
                    className="reb-input"
                    type="number"
                    min={1}
                    value={form.capacity ?? 30}
                    onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) || 30 })}
                  />
                </div>
                <div className="field">
                  <label htmlFor="pd-sched" className="kind">Schedule text</label>
                  <input
                    id="pd-sched"
                    className="reb-input"
                    value={form.schedule_text ?? ""}
                    onChange={(e) => setForm({ ...form, schedule_text: e.target.value })}
                    placeholder="Tuesdays & Thursdays, 18:00 WAT"
                  />
                </div>
                <div className="field">
                  <label htmlFor="pd-start" className="kind">Starts at</label>
                  <input
                    id="pd-start"
                    className="reb-input"
                    type="datetime-local"
                    onChange={(e) => setForm({ ...form, starts_at: e.target.value || null })}
                  />
                </div>
              </>
            )}

            <div className="field">
              <label htmlFor="pd-desc" className="kind">Description</label>
              <textarea
                id="pd-desc"
                className="textarea"
                rows={3}
                value={form.description ?? ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What will learners get out of this?"
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="qa">
              <b>{form.title || "Untitled"}</b>
              <p className="hint" style={{ marginTop: 4 }}>
                {form.kind === "Course" ? "Course" : "Live cohort"} · {form.level} · {money(form.price_kobo ?? 0)}
                {form.kind === "Classroom" ? ` · ${form.capacity ?? 30} seats` : ""}
                {form.kind === "Course" && cats.find((c) => c.id === form.category_id) ? ` · ${cats.find((c) => c.id === form.category_id)?.name}` : ""}
              </p>
              {form.description ? <p className="sub" style={{ marginTop: 6 }}>{form.description}</p> : null}
            </div>
            <label className="qa" style={{ display: "flex", gap: 10, alignItems: "center", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={Boolean(form.is_published)}
                onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
              />
              <span style={{ flex: 1 }}>
                <b style={{ fontSize: 13.5 }}>Publish immediately</b>
                <span className="hint" style={{ display: "block" }}>Otherwise it stays a draft until you publish it.</span>
              </span>
            </label>
            {formError ? <Err msg={formError} /> : null}
          </div>
        )}
      </Modal>
      <ToastHost />
    </Shell>
  );
}
