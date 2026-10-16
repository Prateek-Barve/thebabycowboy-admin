
import { useCallback, useEffect, useMemo, useState } from "react";
// import { useAuth } from "@clerk/react";
import {
  InteractionRequiredAuthError,
} from "@azure/msal-browser";
import { useMsal } from "@azure/msal-react";
import { contentApiRequest } from "../../authConfig";
import { contentApi } from "../../services/contentApi";
import type { Blog, BlogRequest } from "./blogs.types";

type BlogForm = {
  title: string;
  description: string;
  category: string;
  tags: string;
  coverImageUrl: string;
  externalUrl: string;
  publishedAt: string;
};

const emptyForm: BlogForm = {
  title: "",
  description: "",
  category: "",
  tags: "",
  coverImageUrl: "",
  externalUrl: "",
  publishedAt: "",
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

function toDateTimeLocal(value: string | null): string {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const localDate = new Date(
    date.getTime() - date.getTimezoneOffset() * 60_000,
  );

  return localDate.toISOString().slice(0, 16);
}

function formatDate(value: string | null): string {
  if (!value) return "Not published";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Invalid date";

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default function BlogsPage() {
  // const { getToken } = useAuth();
  const { instance, accounts } = useMsal();

const getToken = useCallback(async (): Promise<string | null> => {
  const account = instance.getActiveAccount() ?? accounts[0];

  if (!account) {
    return null;
  }

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

  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [showForm, setShowForm] = useState(false);
  const [editingBlog, setEditingBlog] = useState<Blog | null>(null);
  const [form, setForm] = useState<BlogForm>(emptyForm);

  const loadBlogs = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await contentApi.get<Blog[]>("/api/blogs");
      setBlogs(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBlogs();
  }, [loadBlogs]);

  const categories = useMemo(
    () =>
      [...new Set(blogs.map((blog) => blog.category.trim()).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b)),
    [blogs],
  );

  const filteredBlogs = useMemo(() => {
    const query = search.trim().toLowerCase();

    return blogs.filter((blog) => {
      const matchesSearch =
        blog.title.toLowerCase().includes(query) ||
        blog.description.toLowerCase().includes(query) ||
        blog.category.toLowerCase().includes(query) ||
        blog.tags.some((tag) => tag.toLowerCase().includes(query));

      const matchesCategory =
        categoryFilter === "all" || blog.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [blogs, search, categoryFilter]);

  const publishedCount = blogs.filter((blog) => {
    if (!blog.publishedAt) return false;
    const date = new Date(blog.publishedAt);
    return !Number.isNaN(date.getTime()) && date.getTime() <= Date.now();
  }).length;

  const scheduledCount = blogs.filter((blog) => {
    if (!blog.publishedAt) return false;
    const date = new Date(blog.publishedAt);
    return !Number.isNaN(date.getTime()) && date.getTime() > Date.now();
  }).length;

  const draftCount = blogs.length - publishedCount - scheduledCount;

  function openCreateForm() {
    setEditingBlog(null);
    setForm(emptyForm);
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function openEditForm(blog: Blog) {
    setEditingBlog(blog);
    setForm({
      title: blog.title,
      description: blog.description,
      category: blog.category,
      tags: blog.tags.join(", "),
      coverImageUrl: blog.coverImageUrl ?? "",
      externalUrl: blog.externalUrl,
      publishedAt: toDateTimeLocal(blog.publishedAt),
    });
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;
    setShowForm(false);
    setEditingBlog(null);
    setForm(emptyForm);
  }

  function updateField<K extends keyof BlogForm>(
    field: K,
    value: BlogForm[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const tags = [
      ...new Set(
        form.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      ),
    ];

    const payload: BlogRequest = {
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category.trim(),
      tags,
      coverImageUrl: form.coverImageUrl.trim() || null,
      externalUrl: form.externalUrl.trim(),
      publishedAt: form.publishedAt
        ? new Date(form.publishedAt).toISOString()
        : null,
    };

    if (
      !payload.title ||
      !payload.description ||
      !payload.category ||
      !payload.externalUrl
    ) {
      setError("Please complete all required fields.");
      return;
    }

    setSaving(true);

    try {
      if (editingBlog) {
        await contentApi.put(
          `/api/blogs/${editingBlog.id}`,
          payload,
          getToken,
        );
        setSuccess("Blog updated successfully.");
      } else {
        await contentApi.post("/api/blogs", payload, getToken);
        setSuccess("Blog created successfully.");
      }

      setShowForm(false);
      setEditingBlog(null);
      setForm(emptyForm);
      await loadBlogs();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(blog: Blog) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${blog.title}"? This cannot be undone.`,
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      await contentApi.delete(`/api/blogs/${blog.id}`, getToken);
      setSuccess("Blog deleted successfully.");
      await loadBlogs();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  function getPublicationLabel(blog: Blog): string {
    if (!blog.publishedAt) return "Draft";

    const date = new Date(blog.publishedAt);
    if (Number.isNaN(date.getTime())) return "Invalid date";

    return date.getTime() > Date.now() ? "Scheduled" : "Published";
  }

  return (
    <div className="blogs-page">
      <header className="blogs-header">
        <div>
          <span className="blogs-eyebrow">CONTENT MANAGEMENT</span>
          <h1>Blogs</h1>
          <p>Manage your writing, articles and external publications.</p>
        </div>

        <button className="blogs-primary-btn" onClick={openCreateForm}>
          <span aria-hidden="true">＋</span> New blog
        </button>
      </header>

      <section className="blogs-stats">
        <div className="blogs-stat-card">
          <span>Total articles</span>
          <strong>{blogs.length}</strong>
        </div>
        <div className="blogs-stat-card">
          <span>Published</span>
          <strong>{publishedCount}</strong>
        </div>
        <div className="blogs-stat-card">
          <span>Scheduled</span>
          <strong>{scheduledCount}</strong>
        </div>
        <div className="blogs-stat-card">
          <span>Drafts</span>
          <strong>{draftCount}</strong>
        </div>
      </section>

      <section className="blogs-toolbar">
        <div className="blogs-search">
          <span aria-hidden="true">⌕</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search titles, descriptions or tags..."
            aria-label="Search blogs"
          />
        </div>

        <select
          className="blogs-category-select"
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          aria-label="Filter by category"
        >
          <option value="all">All categories</option>
          {categories.map((category) => (
            <option value={category} key={category}>
              {category}
            </option>
          ))}
        </select>

        <span className="blogs-result-count">
          {filteredBlogs.length} {filteredBlogs.length === 1 ? "article" : "articles"}
        </span>
      </section>

      {error && (
        <div className="blogs-alert blogs-alert-error" role="alert">
          <span>{error}</span>
          <button onClick={() => setError("")} aria-label="Dismiss error">
            ×
          </button>
        </div>
      )}

      {success && (
        <div className="blogs-alert blogs-alert-success" role="status">
          <span>{success}</span>
          <button onClick={() => setSuccess("")} aria-label="Dismiss message">
            ×
          </button>
        </div>
      )}

      {loading ? (
        <div className="blogs-state">
          <div className="blogs-spinner" />
          <p>Loading your articles...</p>
        </div>
      ) : filteredBlogs.length === 0 ? (
        <div className="blogs-empty">
          <div className="blogs-empty-icon">✎</div>
          <h3>{search || categoryFilter !== "all" ? "No matching articles" : "Your writing space is ready"}</h3>
          <p>
            {search || categoryFilter !== "all"
              ? "Try changing your search or category filter."
              : "Create your first blog entry to get started."}
          </p>
          {!search && categoryFilter === "all" && (
            <button className="blogs-primary-btn" onClick={openCreateForm}>
              Create your first blog
            </button>
          )}
        </div>
      ) : (
        <div className="blogs-table-wrap">
          <table className="blogs-table">
            <thead>
              <tr>
                <th>Article</th>
                <th>Category</th>
                <th>Publication</th>
                <th>Published date</th>
                <th>Updated</th>
                <th className="blogs-actions-heading">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBlogs.map((blog) => (
                <tr key={blog.id}>
                  <td>
                    <div className="blogs-article-cell">
                      {blog.coverImageUrl ? (
                        <img
                          className="blogs-cover-thumb"
                          src={blog.coverImageUrl}
                          alt=""
                          loading="lazy"
                        />
                      ) : (
                        <div className="blogs-cover-placeholder">✎</div>
                      )}
                      <div className="blogs-article-info">
                        <strong>{blog.title}</strong>
                        <p>{blog.description}</p>
                        {blog.tags.length > 0 && (
                          <div className="blogs-tags">
                            {blog.tags.slice(0, 3).map((tag) => (
                              <span key={tag}>{tag}</span>
                            ))}
                            {blog.tags.length > 3 && (
                              <span>+{blog.tags.length - 3}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="blogs-category-pill">{blog.category}</span>
                  </td>
                  <td>
                    <span
                      className={`blogs-status blogs-status-${getPublicationLabel(blog).toLowerCase()}`}
                    >
                      <span />
                      {getPublicationLabel(blog)}
                    </span>
                  </td>
                  <td className="blogs-date-cell">
                    {formatDate(blog.publishedAt)}
                  </td>
                  <td className="blogs-date-cell">
                    {formatDate(blog.updatedAt)}
                  </td>
                  <td>
                    <div className="blogs-row-actions">
                      <button
                        className="blogs-action-btn"
                        onClick={() => openEditForm(blog)}
                      >
                        Edit
                      </button>
                      <button
                        className="blogs-action-btn blogs-action-delete"
                        onClick={() => void handleDelete(blog)}
                      >
                        Delete
                      </button>
                      <a
                        className="blogs-action-btn blogs-action-link"
                        href={blog.externalUrl}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Open ${blog.title} in a new tab`}
                        title="Open external article"
                      >
                        ↗
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="blogs-modal-backdrop">
          <div
            className="blogs-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="blogs-modal-title"
          >
            <header className="blogs-modal-header">
              <div>
                <span className="blogs-eyebrow">EDITORIAL WORKSPACE</span>
                <h2 id="blogs-modal-title">
                  {editingBlog ? "Edit article" : "Create a blog"}
                </h2>
                <p>Manage the article details displayed on your portfolio.</p>
              </div>
              <button
                className="blogs-close-btn"
                onClick={closeForm}
                disabled={saving}
                aria-label="Close dialog"
              >
                ×
              </button>
            </header>

            <form onSubmit={handleSubmit}>
              <div className="blogs-form-grid">
                <label className="blogs-field blogs-field-full">
                  Title *
                  <input
                    value={form.title}
                    onChange={(event) => updateField("title", event.target.value)}
                    placeholder="Enter your article title"
                    required
                    maxLength={200}
                  />
                </label>

                <label className="blogs-field blogs-field-full">
                  Short description *
                  <textarea
                    value={form.description}
                    onChange={(event) =>
                      updateField("description", event.target.value)
                    }
                    placeholder="A short summary of the article"
                    required
                    maxLength={500}
                    rows={3}
                  />
                  <span className="blogs-field-hint">
                    {form.description.length}/500 characters
                  </span>
                </label>

                <label className="blogs-field">
                  Category *
                  <input
                    value={form.category}
                    onChange={(event) =>
                      updateField("category", event.target.value)
                    }
                    placeholder="e.g. Engineering"
                    required
                    maxLength={100}
                    list="blogs-category-options"
                  />
                  <datalist id="blogs-category-options">
                    {categories.map((category) => (
                      <option value={category} key={category} />
                    ))}
                  </datalist>
                </label>

                <label className="blogs-field">
                  Tags
                  <input
                    value={form.tags}
                    onChange={(event) => updateField("tags", event.target.value)}
                    placeholder="React, .NET, AI"
                  />
                  <span className="blogs-field-hint">
                    Separate tags with commas.
                  </span>
                </label>

                <label className="blogs-field blogs-field-full">
                  External article URL *
                  <input
                    type="url"
                    value={form.externalUrl}
                    onChange={(event) =>
                      updateField("externalUrl", event.target.value)
                    }
                    placeholder="https://..."
                    required
                  />
                </label>

                <label className="blogs-field blogs-field-full">
                  Cover image URL
                  <input
                    type="url"
                    value={form.coverImageUrl}
                    onChange={(event) =>
                      updateField("coverImageUrl", event.target.value)
                    }
                    placeholder="https://..."
                  />
                </label>

                {form.coverImageUrl.trim() && (
                  <div className="blogs-image-preview blogs-field-full">
                    <span>Cover preview</span>
                    <img
                      src={form.coverImageUrl}
                      alt="Blog cover preview"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                      onLoad={(event) => {
                        event.currentTarget.style.display = "block";
                      }}
                    />
                  </div>
                )}

                <label className="blogs-field blogs-field-full">
                  Publication date and time
                  <input
                    type="datetime-local"
                    value={form.publishedAt}
                    onChange={(event) =>
                      updateField("publishedAt", event.target.value)
                    }
                  />
                  <span className="blogs-field-hint">
                    Leave empty for a draft. Future dates are marked as scheduled.
                    The selected time is interpreted in your local timezone.
                  </span>
                </label>
              </div>

              <footer className="blogs-modal-actions">
                <button
                  type="button"
                  className="blogs-secondary-btn"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="blogs-primary-btn"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingBlog
                      ? "Save changes"
                      : "Create article"}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
