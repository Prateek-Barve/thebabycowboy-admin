
import { useCallback, useEffect, useMemo, useState } from "react";
// import { useAuth } from "@clerk/react";
import { InteractionRequiredAuthError } from "@azure/msal-browser";
import { useMsal } from "@azure/msal-react";
import { contentApiRequest } from "../../authConfig";
import { ApiError } from "../../services/apiClient";
import { contentApi } from "../../services/contentApi";
import type {
  Journal,
  JournalRequest,
} from "./journals.types";

type VisibilityFilter = "all" | "public" | "private";

const emptyForm: JournalRequest = {
  title: "",
  content: "",
  mood: "",
  category: "",
  tags: [],
  isPublic: false,
  images: [],
};

function formatDate(value: string) {
  if (!value) return "—";

  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

export default function JournalsPage() {
  // const { getToken } = useAuth();
  const { instance, accounts } = useMsal();

const getToken = useCallback(async (): Promise<string | null> => {
  const account = instance.getActiveAccount() ?? accounts[0];

  if (!account) return null;

  try {
    const response = await instance.acquireTokenSilent({
      ...contentApiRequest,
      account,
    });

    return response.accessToken;
  } catch (error) {
    if (error instanceof InteractionRequiredAuthError) {
      const response = await instance.acquireTokenPopup({
        ...contentApiRequest,
        account,
      });

      return response.accessToken;
    }

    throw error;
  }
}, [instance, accounts]);

  const [journals, setJournals] = useState<Journal[]>([]);
  const [form, setForm] = useState<JournalRequest>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [visibility, setVisibility] =
    useState<VisibilityFilter>("all");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showEditor, setShowEditor] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Journal | null>(
    null
  );

  const loadJournals = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const token = await getToken();

      if (!token) {
        throw new Error("Unable to obtain an authentication token.");
      }

      const baseUrl = (
        import.meta.env.VITE_CONTENT_API_URL as string
      ).replace(/\/+$/, "");

      const response = await fetch(`${baseUrl}/api/journals`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(
          response.status === 401 || response.status === 403
            ? "You are not authorized to view journal entries."
            : `Failed to load journals (HTTP ${response.status}).`
        );
      }

      const data: Journal[] = await response.json();
      setJournals(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    void loadJournals();
  }, [loadJournals]);
  


  const filteredJournals = useMemo(() => {
    const term = search.trim().toLowerCase();

    return journals.filter((journal) => {
      const matchesSearch =
        !term ||
        journal.title.toLowerCase().includes(term) ||
        journal.content.toLowerCase().includes(term) ||
        journal.category.toLowerCase().includes(term) ||
        (journal.mood ?? "").toLowerCase().includes(term) ||
        journal.tags.some((tag) => tag.toLowerCase().includes(term));

      const matchesVisibility =
        visibility === "all" ||
        (visibility === "public" && journal.isPublic) ||
        (visibility === "private" && !journal.isPublic);

      return matchesSearch && matchesVisibility;
    });
  }, [journals, search, visibility]);

  const publicCount = journals.filter((item) => item.isPublic).length;
  const privateCount = journals.length - publicCount;

  function updateField<K extends keyof JournalRequest>(
    field: K,
    value: JournalRequest[K]
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function startCreate() {
    setEditingId(null);
    setForm({ ...emptyForm, images: [] });
    setError("");
    setSuccess("");
    setShowEditor(true);
  }

  function startEdit(journal: Journal) {
    setEditingId(journal.id);

    setForm({
      title: journal.title,
      content: journal.content,
      mood: journal.mood ?? "",
      category: journal.category,
      tags: [...journal.tags],
      isPublic: journal.isPublic,
      images: journal.images
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((image) => ({
          imageUrl: image.imageUrl,
          caption: image.caption ?? "",
          sortOrder: image.sortOrder,
        })),
    });

    setError("");
    setSuccess("");
    setShowEditor(true);
  }

  function addImage() {
    setForm((current) => ({
      ...current,
      images: [
        ...current.images,
        {
          imageUrl: "",
          caption: "",
          sortOrder: current.images.length,
        },
      ],
    }));
  }

  function updateImage(
    index: number,
    field: "imageUrl" | "caption",
    value: string
  ) {
    setForm((current) => ({
      ...current,
      images: current.images.map((image, imageIndex) =>
        imageIndex === index ? { ...image, [field]: value } : image
      ),
    }));
  }

  function removeImage(index: number) {
    setForm((current) => ({
      ...current,
      images: current.images
        .filter((_, imageIndex) => imageIndex !== index)
        .map((image, sortOrder) => ({ ...image, sortOrder })),
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const payload: JournalRequest = {
      ...form,
      title: form.title.trim(),
      content: form.content.trim(),
      mood: form.mood?.trim() || null,
      category: form.category.trim(),
      tags: form.tags
        .map((tag) => tag.trim())
        .filter(Boolean)
        .filter((tag, index, all) => all.indexOf(tag) === index),
      images: form.images
        .filter((image) => image.imageUrl.trim())
        .map((image, index) => ({
          imageUrl: image.imageUrl.trim(),
          caption: image.caption?.trim() || null,
          sortOrder: index,
        })),
    };

    if (!payload.title || !payload.content || !payload.category) {
      setError("Title, content, and category are required.");
      return;
    }

    setSaving(true);

    try {
      if (editingId) {
        await contentApi.put(
          `/api/journals/${editingId}`,
          payload,
          getToken
        );
        setSuccess("Journal entry updated successfully.");
      } else {
        await contentApi.post("/api/journals", payload, getToken);
        setSuccess("Journal entry created successfully.");
      }

      setShowEditor(false);
      setEditingId(null);
      setForm({ ...emptyForm, images: [] });
      await loadJournals();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    setError("");
    setSuccess("");

    try {
      await contentApi.delete(
        `/api/journals/${deleteTarget.id}`,
        getToken
      );

      setDeleteTarget(null);
      setSuccess("Journal entry deleted successfully.");
      await loadJournals();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div className="journal-admin">
      <div className="journal-page-header">
        <div>
          <span className="journal-eyebrow">PERSONAL ARCHIVE</span>
          <h1>Journal</h1>
          <p>
            Manage your reflections, private notes, and public journal
            entries.
          </p>
        </div>

        <button className="journal-primary-btn" onClick={startCreate}>
          <span aria-hidden="true">＋</span> New entry
        </button>
      </div>

      {error && (
        <div className="journal-alert journal-alert-error" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="journal-alert journal-alert-success" role="status">
          {success}
        </div>
      )}

      <div className="journal-stats">
        <div className="journal-stat-card">
          <span>Total entries</span>
          <strong>{journals.length}</strong>
        </div>
        <div className="journal-stat-card">
          <span>Public</span>
          <strong>{publicCount}</strong>
        </div>
        <div className="journal-stat-card">
          <span>Private</span>
          <strong>{privateCount}</strong>
        </div>
      </div>

      <div className="journal-toolbar">
        <div className="journal-search">
          <span aria-hidden="true">⌕</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search title, content, mood, tags..."
            aria-label="Search journal entries"
          />
        </div>

        <select
          value={visibility}
          onChange={(event) =>
            setVisibility(event.target.value as VisibilityFilter)
          }
          aria-label="Filter by visibility"
        >
          <option value="all">All entries</option>
          <option value="public">Public only</option>
          <option value="private">Private only</option>
        </select>

        <button
          className="journal-secondary-btn"
          onClick={() => void loadJournals()}
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="journal-empty-state">Loading journal entries...</div>
      ) : filteredJournals.length === 0 ? (
        <div className="journal-empty-state">
          <span className="journal-empty-icon" aria-hidden="true">✎</span>
          <h3>
            {journals.length === 0
              ? "Your journal starts here"
              : "No entries found"}
          </h3>
          <p>
            {journals.length === 0
              ? "Create your first entry to start building your archive."
              : "Try another search term or change the visibility filter."}
          </p>
          {journals.length === 0 && (
            <button
              className="journal-primary-btn"
              onClick={startCreate}
            >
              Create your first entry
            </button>
          )}
        </div>
      ) : (
        <div className="journal-table-wrap">
          <table className="journal-table">
            <thead>
              <tr>
                <th>Entry</th>
                <th>Category / Mood</th>
                <th>Visibility</th>
                <th>Images</th>
                <th>Last updated</th>
                <th className="journal-actions-heading">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredJournals.map((journal) => (
                <tr key={journal.id}>
                  <td>
                    <div className="journal-entry-cell">
                      <strong>{journal.title}</strong>
                      <p>
                        {journal.content.length > 100
                          ? `${journal.content.slice(0, 100)}…`
                          : journal.content}
                      </p>
                      {journal.tags.length > 0 && (
                        <div className="journal-tag-list">
                          {journal.tags.slice(0, 3).map((tag) => (
                            <span key={tag}>{tag}</span>
                          ))}
                          {journal.tags.length > 3 && (
                            <span>+{journal.tags.length - 3}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <strong>{journal.category}</strong>
                    <span className="journal-muted">
                      {journal.mood || "No mood"}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`journal-visibility ${
                        journal.isPublic ? "is-public" : "is-private"
                      }`}
                    >
                      <span aria-hidden="true">
                        {journal.isPublic ? "●" : "●"}
                      </span>
                      {journal.isPublic ? "Public" : "Private"}
                    </span>
                  </td>
                  <td>{journal.images?.length ?? 0}</td>
                  <td className="journal-date">
                    {formatDate(journal.updatedAt)}
                  </td>
                  <td>
                    <div className="journal-row-actions">
                      <button
                        className="journal-action-btn"
                        onClick={() => startEdit(journal)}
                      >
                        Edit
                      </button>
                      <button
                        className="journal-action-btn danger"
                        onClick={() => setDeleteTarget(journal)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="journal-results-count">
        Showing {filteredJournals.length} of {journals.length} entries
      </div>

      {showEditor && (
        <div
          className="journal-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              setShowEditor(false);
            }
          }}
        >
          <section
            className="journal-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="journal-editor-title"
          >
            <div className="journal-modal-header">
              <div>
                <span className="journal-eyebrow">JOURNAL EDITOR</span>
                <h2 id="journal-editor-title">
                  {editingId ? "Edit entry" : "New entry"}
                </h2>
              </div>
              <button
                className="journal-modal-close"
                type="button"
                aria-label="Close editor"
                disabled={saving}
                onClick={() => setShowEditor(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="journal-form-grid">
                <label className="journal-field journal-field-full">
                  Title <span>*</span>
                  <input
                    value={form.title}
                    onChange={(event) =>
                      updateField("title", event.target.value)
                    }
                    maxLength={200}
                    required
                    placeholder="A thought worth keeping..."
                  />
                </label>

                <label className="journal-field">
                  Category <span>*</span>
                  <input
                    value={form.category}
                    onChange={(event) =>
                      updateField("category", event.target.value)
                    }
                    required
                    placeholder="Life, Learning, Travel..."
                  />
                </label>

                <label className="journal-field">
                  Mood
                  <input
                    value={form.mood ?? ""}
                    onChange={(event) =>
                      updateField("mood", event.target.value)
                    }
                    placeholder="Reflective, Happy, Calm..."
                  />
                </label>

                <label className="journal-field journal-field-full">
                  Content <span>*</span>
                  <textarea
                    value={form.content}
                    onChange={(event) =>
                      updateField("content", event.target.value)
                    }
                    required
                    rows={9}
                    placeholder="Write your thoughts..."
                  />
                </label>

                <label className="journal-field journal-field-full">
                  Tags
                  <input
                    value={form.tags.join(", ")}
                    onChange={(event) =>
                      updateField(
                        "tags",
                        event.target.value.split(",").map((tag) => tag.trim())
                      )
                    }
                    placeholder="personal, learning, memories"
                  />
                  <small>Separate tags with commas.</small>
                </label>
              </div>

              <div className="journal-images-section">
                <div className="journal-section-heading">
                  <div>
                    <h3>Images</h3>
                    <p>Add image URLs and optional captions.</p>
                  </div>
                  <button
                    type="button"
                    className="journal-secondary-btn"
                    onClick={addImage}
                  >
                    + Add image
                  </button>
                </div>

                {form.images.length === 0 ? (
                  <div className="journal-no-images">
                    No images attached to this entry.
                  </div>
                ) : (
                  <div className="journal-image-editor-list">
                    {form.images.map((image, index) => (
                      <div className="journal-image-editor" key={index}>
                        <div className="journal-image-number">
                          {String(index + 1).padStart(2, "0")}
                        </div>
                        <div className="journal-image-fields">
                          <label className="journal-field">
                            Image URL
                            <input
                              type="url"
                              value={image.imageUrl}
                              onChange={(event) =>
                                updateImage(index, "imageUrl", event.target.value)
                              }
                              placeholder="https://..."
                            />
                          </label>
                          <label className="journal-field">
                            Caption
                            <input
                              value={image.caption ?? ""}
                              onChange={(event) =>
                                updateImage(index, "caption", event.target.value)
                              }
                              placeholder="Optional caption"
                            />
                          </label>
                        </div>
                        <button
                          type="button"
                          className="journal-remove-image"
                          onClick={() => removeImage(index)}
                          aria-label={`Remove image ${index + 1}`}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <label className="journal-visibility-toggle">
                <input
                  type="checkbox"
                  checked={form.isPublic}
                  onChange={(event) =>
                    updateField("isPublic", event.target.checked)
                  }
                />
                <span className="journal-toggle-copy">
                  <strong>Publish this entry</strong>
                  <small>
                    {form.isPublic
                      ? "This entry is marked public and can appear on your portfolio."
                      : "This entry stays private and is only available in the admin."}
                  </small>
                </span>
                <span
                  className={`journal-toggle-status ${
                    form.isPublic ? "active" : ""
                  }`}
                >
                  {form.isPublic ? "Public" : "Private"}
                </span>
              </label>

              <div className="journal-modal-footer">
                <button
                  type="button"
                  className="journal-secondary-btn"
                  disabled={saving}
                  onClick={() => setShowEditor(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="journal-primary-btn"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingId
                      ? "Save changes"
                      : "Create entry"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {deleteTarget && (
        <div className="journal-modal-backdrop">
          <section
            className="journal-confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="journal-delete-title"
          >
            <span className="journal-delete-icon" aria-hidden="true">!</span>
            <h2 id="journal-delete-title">Delete this entry?</h2>
            <p>
              “{deleteTarget.title}” will be permanently deleted. This
              action cannot be undone.
            </p>
            <div className="journal-modal-footer">
              <button
                className="journal-secondary-btn"
                disabled={saving}
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
              <button
                className="journal-danger-btn"
                disabled={saving}
                onClick={() => void handleDelete()}
              >
                {saving ? "Deleting..." : "Delete entry"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
