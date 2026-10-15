
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/react";

import { contentApi } from "../../services/contentApi";
import type {
  Certification,
  CertificationRequest,
} from "./certifications.types";

type Notice = {
  type: "success" | "error";
  message: string;
};

export default function CertificationsPage() {
  const { getToken } = useAuth();

  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [notice, setNotice] = useState<Notice | null>(null);
  const [search, setSearch] = useState("");

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingCertification, setEditingCertification] =
    useState<Certification | null>(null);

  const [name, setName] = useState("");
  const [issuer, setIssuer] = useState("");
  const [url, setUrl] = useState("");

  const loadCertifications = useCallback(async () => {
    setLoading(true);

    try {
      const data = await contentApi.get<Certification[]>(
        "/api/certifications",
      );

      setCertifications(data);
    } catch (error) {
      setNotice({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to load certifications.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCertifications();
  }, [loadCertifications]);

  const filteredCertifications = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return certifications;

    return certifications.filter(
      (certification) =>
        certification.name.toLowerCase().includes(query) ||
        certification.issuer.toLowerCase().includes(query) ||
        (certification.url ?? "").toLowerCase().includes(query),
    );
  }, [certifications, search]);

  const openCreate = () => {
    setEditingCertification(null);
    setName("");
    setIssuer("");
    setUrl("");
    setNotice(null);
    setEditorOpen(true);
  };

  const openEdit = (certification: Certification) => {
    setEditingCertification(certification);
    setName(certification.name);
    setIssuer(certification.issuer);
    setUrl(certification.url ?? "");
    setNotice(null);
    setEditorOpen(true);
  };

  const closeEditor = () => {
    if (!saving) {
      setEditorOpen(false);
      setEditingCertification(null);
    }
  };

  const saveCertification = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const trimmedName = name.trim();
    const trimmedIssuer = issuer.trim();
    const trimmedUrl = url.trim();

    if (!trimmedName || !trimmedIssuer) {
      setNotice({
        type: "error",
        message: "Certification name and issuer are required.",
      });
      return;
    }

    if (trimmedUrl) {
      try {
        const parsedUrl = new URL(trimmedUrl);

        if (!["http:", "https:"].includes(parsedUrl.protocol)) {
          throw new Error("Invalid protocol");
        }
      } catch {
        setNotice({
          type: "error",
          message: "Enter a valid URL starting with https:// or http://.",
        });
        return;
      }
    }

    const payload: CertificationRequest = {
      name: trimmedName,
      issuer: trimmedIssuer,
      url: trimmedUrl || null,
    };

    setSaving(true);
    setNotice(null);

    try {
      if (editingCertification) {
        await contentApi.put(
          `/api/certifications/${editingCertification.id}`,
          payload,
          getToken,
        );

        setNotice({
          type: "success",
          message: "Certification updated successfully.",
        });
      } else {
        await contentApi.post(
          "/api/certifications",
          payload,
          getToken,
        );

        setNotice({
          type: "success",
          message: "Certification created successfully.",
        });
      }

      setEditorOpen(false);
      setEditingCertification(null);

      await loadCertifications();
    } catch (error) {
      setNotice({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to save certification.",
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteCertification = async (
    certification: Certification,
  ) => {
    const confirmed = window.confirm(
      `Delete "${certification.name}" issued by ${certification.issuer}? This action cannot be undone.`,
    );

    if (!confirmed) return;

    setDeletingId(certification.id);
    setNotice(null);

    try {
      await contentApi.delete(
        `/api/certifications/${certification.id}`,
        getToken,
      );

      setCertifications((current) =>
        current.filter((item) => item.id !== certification.id),
      );

      setNotice({
        type: "success",
        message: `"${certification.name}" was deleted successfully.`,
      });
    } catch (error) {
      setNotice({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to delete certification.",
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="certifications-page">
      <header className="certifications-page-header">
        <div>
          <span className="certifications-eyebrow">
            CONTENT MANAGEMENT
          </span>
          <h1>Certifications</h1>
          <p>
            Manage your professional certifications and verification links.
          </p>
        </div>

        <button
          type="button"
          className="certifications-primary-button"
          onClick={openCreate}
        >
          <span aria-hidden="true">＋</span> Add Certification
        </button>
      </header>

      {notice && (
        <div
          className={`certifications-notice certifications-notice-${notice.type}`}
          role="status"
        >
          <span>{notice.message}</span>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => setNotice(null)}
          >
            ×
          </button>
        </div>
      )}

      <section className="certifications-stats">
        <article className="certifications-stat-card">
          <span>Total certifications</span>
          <strong>{certifications.length}</strong>
          <small>All saved credentials</small>
        </article>

        <article className="certifications-stat-card">
          <span>Issuers</span>
          <strong>
            {new Set(
              certifications.map((item) => item.issuer.trim().toLowerCase()),
            ).size}
          </strong>
          <small>Distinct issuing organizations</small>
        </article>

        <article className="certifications-stat-card">
          <span>With verification links</span>
          <strong>
            {certifications.filter((item) => Boolean(item.url?.trim())).length}
          </strong>
          <small>Credentials with a URL</small>
        </article>
      </section>

      <section className="certifications-panel">
        <div className="certifications-panel-header">
          <div>
            <h2>All Certifications</h2>
            <p>
              Create, update, search, and remove certifications from your
              portfolio.
            </p>
          </div>

          <span className="certifications-total-pill">
            {filteredCertifications.length} results
          </span>
        </div>

        <div className="certifications-toolbar">
          <label className="certifications-search">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, issuer, or URL..."
              aria-label="Search certifications"
            />
          </label>
        </div>

        {loading ? (
          <div className="certifications-loading">
            <span className="certifications-spinner" />
            <p>Loading certifications...</p>
          </div>
        ) : filteredCertifications.length === 0 ? (
          <div className="certifications-empty">
            <div className="certifications-empty-symbol">✳</div>
            <h3>
              {search.trim()
                ? "No matching certifications"
                : "No certifications yet"}
            </h3>
            <p>
              {search.trim()
                ? "Try a different search term."
                : "Add your first certification to start building your credentials collection."}
            </p>

            {!search.trim() && (
              <button
                type="button"
                className="certifications-primary-button"
                onClick={openCreate}
              >
                + Add Certification
              </button>
            )}
          </div>
        ) : (
          <div className="certifications-table-wrap">
            <table className="certifications-table">
              <thead>
                <tr>
                  <th>Certification</th>
                  <th>Issuer</th>
                  <th>Verification</th>
                  <th className="certifications-actions-heading">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredCertifications.map((certification) => (
                  <tr key={certification.id}>
                    <td>
                      <div className="certifications-name-cell">
                        <span className="certifications-item-symbol">
                          <span aria-hidden="true">✳</span>
                        </span>
                        <div>
                          <strong>{certification.name}</strong>
                          <small>Professional credential</small>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className="certifications-issuer">
                        {certification.issuer}
                      </span>
                    </td>

                    <td>
                      {certification.url ? (
                        <a
                          className="certifications-link"
                          href={certification.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View credential
                          <span aria-hidden="true"> ↗</span>
                        </a>
                      ) : (
                        <span className="certifications-no-link">
                          No URL added
                        </span>
                      )}
                    </td>

                    <td>
                      <div className="certifications-row-actions">
                        <button
                          type="button"
                          className="certifications-action-edit"
                          onClick={() => openEdit(certification)}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="certifications-action-delete"
                          disabled={deletingId === certification.id}
                          onClick={() => void deleteCertification(certification)}
                        >
                          {deletingId === certification.id
                            ? "Deleting..."
                            : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editorOpen && (
        <div
          className="certifications-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeEditor();
            }
          }}
        >
          <section
            className="certifications-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="certifications-modal-title"
          >
            <div className="certifications-modal-header">
              <div>
                <span className="certifications-eyebrow">
                  CREDENTIAL DETAILS
                </span>
                <h2 id="certifications-modal-title">
                  {editingCertification
                    ? "Edit Certification"
                    : "Add Certification"}
                </h2>
                <p>
                  Enter the certification details as you want them displayed
                  in your portfolio.
                </p>
              </div>

              <button
                type="button"
                className="certifications-modal-close"
                onClick={closeEditor}
                disabled={saving}
                aria-label="Close dialog"
              >
                ×
              </button>
            </div>

            <form onSubmit={saveCertification}>
              <label className="certifications-form-field">
                <span>Certification Name *</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Azure Developer Associate"
                  maxLength={200}
                  required
                  autoFocus
                />
              </label>

              <label className="certifications-form-field">
                <span>Issuing Organization *</span>
                <input
                  value={issuer}
                  onChange={(event) => setIssuer(event.target.value)}
                  placeholder="e.g. Microsoft"
                  maxLength={200}
                  required
                />
              </label>

              <label className="certifications-form-field">
                <span>Credential URL</span>
                <input
                  type="url"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="https://..."
                />
                <small>
                  Optional. Add a public certificate or verification link.
                </small>
              </label>

              <div className="certifications-modal-footer">
                <button
                  type="button"
                  className="certifications-secondary-button"
                  onClick={closeEditor}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="certifications-primary-button"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingCertification
                      ? "Save Changes"
                      : "Create Certification"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
