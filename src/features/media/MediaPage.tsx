
// import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentProps,
} from "react";
import { ApiError, type TokenGetter } from "../../services/apiClient";
import { mediaApi } from "../../services/mediaApi";
import "./MediaPage.css";

type MediaCategory = "Book" | "Movie" | "Series" | "Playlist";

interface Genre {
  id: string;
  name: string;
  slug: string;
}

interface MediaItem {
  id: string;
  title: string;
  category: string;
  status: string;
  description: string | null;
  coverImageUrl: string | null;
  displayOrder: number;
  genres: Genre[];
  bookDetails: { author: string } | null;
  movieDetails: { director: string | null; releaseYear: number | null } | null;
  seriesDetails: {
    creator: string | null;
    seasonCount: number | null;
    episodeCount: number | null;
  } | null;
  playlistDetails: {
    spotifyPlaylistId: string;
    platform: string;
  } | null;
}

interface PagedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

interface MediaPayload {
  title: string;
  category: MediaCategory;
  status: string;
  description: string | null;
  coverImageUrl: string | null;
  displayOrder: number;
  genreSlugs: string[];
  bookDetails: { author: string } | null;
  movieDetails: {
    director: string | null;
    releaseYear: number | null;
  } | null;
  seriesDetails: {
    creator: string | null;
    seasonCount: number | null;
    episodeCount: number | null;
  } | null;
  playlistDetails: {
    spotifyPlaylistId: string;
    platform: string;
  } | null;
}

interface MediaForm {
  title: string;
  category: MediaCategory;
  status: string;
  description: string;
  coverImageUrl: string;
  displayOrder: string;
  genreSlugs: string;
  author: string;
  director: string;
  releaseYear: string;
  creator: string;
  seasonCount: string;
  episodeCount: string;
  spotifyPlaylistId: string;
  platform: string;
}

interface MediaPageProps {
  /**
   * Supply a token getter when Media API authentication is integrated.
   * The token must be issued for the Media API, not the Content API.
   */
  getToken?: TokenGetter;
}

const PAGE_SIZE = 10;

const emptyForm: MediaForm = {
  title: "",
  category: "Book",
  status: "",
  description: "",
  coverImageUrl: "",
  displayOrder: "0",
  genreSlugs: "",
  author: "",
  director: "",
  releaseYear: "",
  creator: "",
  seasonCount: "",
  episodeCount: "",
  spotifyPlaylistId: "",
  platform: "Spotify",
};

function nullableText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function nullableNumber(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toForm(item: MediaItem): MediaForm {
  return {
    title: item.title,
    category: item.category as MediaCategory,
    status: item.status,
    description: item.description ?? "",
    coverImageUrl: item.coverImageUrl ?? "",
    displayOrder: String(item.displayOrder),
    genreSlugs: item.genres.map((genre) => genre.slug).join(", "),
    author: item.bookDetails?.author ?? "",
    director: item.movieDetails?.director ?? "",
    releaseYear: item.movieDetails?.releaseYear?.toString() ?? "",
    creator: item.seriesDetails?.creator ?? "",
    seasonCount: item.seriesDetails?.seasonCount?.toString() ?? "",
    episodeCount: item.seriesDetails?.episodeCount?.toString() ?? "",
    spotifyPlaylistId: item.playlistDetails?.spotifyPlaylistId ?? "",
    platform: item.playlistDetails?.platform ?? "Spotify",
  };
}

function toPayload(form: MediaForm): MediaPayload {
  const category = form.category;

  return {
    title: form.title.trim(),
    category,
    status: form.status.trim(),
    description: nullableText(form.description),
    coverImageUrl: nullableText(form.coverImageUrl),
    displayOrder: Number(form.displayOrder || 0),
    genreSlugs: form.genreSlugs
      .split(",")
      .map((slug) => slug.trim())
      .filter(Boolean),
    bookDetails:
      category === "Book"
        ? { author: form.author.trim() }
        : null,
    movieDetails:
      category === "Movie"
        ? {
            director: nullableText(form.director),
            releaseYear: nullableNumber(form.releaseYear),
          }
        : null,
    seriesDetails:
      category === "Series"
        ? {
            creator: nullableText(form.creator),
            seasonCount: nullableNumber(form.seasonCount),
            episodeCount: nullableNumber(form.episodeCount),
          }
        : null,
    playlistDetails:
      category === "Playlist"
        ? {
            spotifyPlaylistId: form.spotifyPlaylistId.trim(),
            platform: form.platform.trim() || "Spotify",
          }
        : null,
  };
}

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return "Authentication is required for this operation.";
    }

    if (error.status === 403) {
      return "The API denied this operation. Check Media API authorization.";
    }

    return error.message;
  }

  return error instanceof Error ? error.message : "Something went wrong.";
}

export default function MediaPage({ getToken }: MediaPageProps) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState<MediaForm>(emptyForm);
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const query = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
      });

      if (categoryFilter !== "All") {
        query.set("category", categoryFilter);
      }

      const result = await mediaApi.get<PagedResponse<MediaItem>>(
        `/api/media?${query.toString()}`
      );

      setItems(result.items);
      setTotalPages(result.totalPages);
      setTotalCount(result.totalCount);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, categoryFilter]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const visibleItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return items;

    return items.filter((item) => {
      const genreNames = item.genres.map((genre) => genre.name).join(" ");

      return `${item.title} ${item.category} ${item.status} ${genreNames}`
        .toLowerCase()
        .includes(query);
    });
  }, [items, search]);

  function startCreate() {
    setEditingItem(null);
    setForm({ ...emptyForm });
    setError("");
    setNotice("");
    setFormOpen(true);
  }

  function startEdit(item: MediaItem) {
    setEditingItem(item);
    setForm(toForm(item));
    setError("");
    setNotice("");
    setFormOpen(true);
  }

  function closeForm() {
    if (saving) return;
    setFormOpen(false);
    setEditingItem(null);
  }

  function updateField<K extends keyof MediaForm>(
    field: K,
    value: MediaForm[K]
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function requireMediaToken(): Promise<string> {
    if (!getToken) {
      throw new Error(
        "Media API authentication has not been connected to this page yet. " +
        "Reading items works, but create, edit and delete require a Media API token."
      );
    }

    const token = await getToken();

    if (!token) {
      throw new Error("No Media API access token is available.");
    }

    return token;
  }

//   async function handleSubmit(event: FormEvent<HTMLFormElement>) {
//     event.preventDefault();
//     setSaving(true);
//     setError("");
//     setNotice("");

//     try {
//       const token = await requireMediaToken();
//       const payload = toPayload(form);

//       if (editingItem) {
//         await mediaApi.put(
//           `/api/media/${editingItem.id}`,
//           payload,
//           async () => token
//         );
//         setNotice("Media item updated successfully.");
//       } else {
//         await mediaApi.post(
//           "/api/media",
//           payload,
//           async () => token
//         );
//         setNotice("Media item created successfully.");
//       }

//       setFormOpen(false);
//       setEditingItem(null);
//       await loadItems();
//     } catch (err) {
//       setError(getErrorMessage(err));
//     } finally {
//       setSaving(false);
//     }
//   }
const handleSubmit: NonNullable<
  ComponentProps<"form">["onSubmit"]
> = async (event) => {
  event.preventDefault();

  setSaving(true);
  setError("");
  setNotice("");

  try {
    const token = await requireMediaToken();
    const payload = toPayload(form);

    if (editingItem) {
      await mediaApi.put(
        `/api/media/${editingItem.id}`,
        payload,
        async () => token
      );

      setNotice("Media item updated successfully.");
    } else {
      await mediaApi.post(
        "/api/media",
        payload,
        async () => token
      );

      setNotice("Media item created successfully.");
    }

    setFormOpen(false);
    setEditingItem(null);

    await loadItems();
  } catch (err) {
    setError(getErrorMessage(err));
  } finally {
    setSaving(false);
  }
};

  async function handleDelete(item: MediaItem) {
    const confirmed = window.confirm(
      `Delete "${item.title}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    setError("");
    setNotice("");

    try {
      const token = await requireMediaToken();

      await mediaApi.delete(
        `/api/media/${item.id}`,
        async () => token
      );

      setNotice(`"${item.title}" was deleted.`);

      if (items.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        await loadItems();
      }
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  function changeCategory(value: string) {
    setPage(1);
    setCategoryFilter(value);
  }

  return (
    <main className="media-admin">
      <header className="media-admin__header">
        <div>
          <p className="media-admin__eyebrow">CONTENT MANAGEMENT</p>
          <h1>The Shelf</h1>
          <p className="media-admin__subtitle">
            Manage your books, movies, series and playlists.
          </p>
        </div>

        <button
          type="button"
          className="media-button media-button--primary"
          onClick={startCreate}
        >
          + Add media
        </button>
      </header>

      <section className="media-stats" aria-label="Media summary">
        <div className="media-stat">
          <span>Total items on current query</span>
          <strong>{totalCount}</strong>
        </div>
        <div className="media-stat">
          <span>Current page</span>
          <strong>{page}{totalPages ? ` / ${totalPages}` : ""}</strong>
        </div>
      </section>

      <section className="media-toolbar">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search this page by title, status or genre..."
          aria-label="Search current page"
        />

        <select
          value={categoryFilter}
          onChange={(event) => changeCategory(event.target.value)}
          aria-label="Filter category"
        >
          <option value="All">All categories</option>
          <option value="Book">Books</option>
          <option value="Movie">Movies</option>
          <option value="Series">Series</option>
          <option value="Playlist">Playlists</option>
        </select>

        <button
          type="button"
          className="media-button"
          onClick={() => void loadItems()}
          disabled={loading}
        >
          Refresh
        </button>
      </section>

      {error && (
        <div className="media-alert media-alert--error" role="alert">
          {error}
        </div>
      )}

      {notice && (
        <div className="media-alert media-alert--success" role="status">
          {notice}
        </div>
      )}

      {formOpen && (
        <section className="media-form-panel">
          <div className="media-form-panel__header">
            <div>
              <p className="media-admin__eyebrow">
                {editingItem ? "EDIT ENTRY" : "NEW ENTRY"}
              </p>
              <h2>{editingItem ? "Edit media" : "Add media"}</h2>
            </div>

            <button
              type="button"
              className="media-button"
              onClick={closeForm}
              disabled={saving}
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleSubmit} className="media-form">
            <label>
              Title *
              <input
                required
                maxLength={200}
                value={form.title}
                onChange={(event) => updateField("title", event.target.value)}
              />
            </label>

            <label>
              Category *
              <select
                value={form.category}
                onChange={(event) =>
                  updateField("category", event.target.value as MediaCategory)
                }
              >
                <option value="Book">Book</option>
                <option value="Movie">Movie</option>
                <option value="Series">Series</option>
                <option value="Playlist">Playlist</option>
              </select>
            </label>

            <label>
              Status *
              <input
                required
                value={form.status}
                onChange={(event) => updateField("status", event.target.value)}
                placeholder="Use a status accepted by your API"
              />
            </label>

            <label>
              Display order
              <input
                type="number"
                step="1"
                value={form.displayOrder}
                onChange={(event) =>
                  updateField("displayOrder", event.target.value)
                }
              />
            </label>

            <label className="media-form__full">
              Description
              <textarea
                rows={3}
                value={form.description}
                onChange={(event) =>
                  updateField("description", event.target.value)
                }
              />
            </label>

            <label className="media-form__full">
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

            <label className="media-form__full">
              Genre slugs
              <input
                value={form.genreSlugs}
                onChange={(event) =>
                  updateField("genreSlugs", event.target.value)
                }
                placeholder="fiction, mystery, classic"
              />
              <small>Separate slugs with commas. Use existing genre slugs.</small>
            </label>

            {form.category === "Book" && (
              <label className="media-form__full">
                Author *
                <input
                  required
                  value={form.author}
                  onChange={(event) => updateField("author", event.target.value)}
                />
              </label>
            )}

            {form.category === "Movie" && (
              <>
                <label>
                  Director
                  <input
                    value={form.director}
                    onChange={(event) =>
                      updateField("director", event.target.value)
                    }
                  />
                </label>
                <label>
                  Release year
                  <input
                    type="number"
                    min="1800"
                    max="2200"
                    value={form.releaseYear}
                    onChange={(event) =>
                      updateField("releaseYear", event.target.value)
                    }
                  />
                </label>
              </>
            )}

            {form.category === "Series" && (
              <>
                <label>
                  Creator
                  <input
                    value={form.creator}
                    onChange={(event) =>
                      updateField("creator", event.target.value)
                    }
                  />
                </label>
                <label>
                  Number of seasons
                  <input
                    type="number"
                    min="0"
                    value={form.seasonCount}
                    onChange={(event) =>
                      updateField("seasonCount", event.target.value)
                    }
                  />
                </label>
                <label>
                  Number of episodes
                  <input
                    type="number"
                    min="0"
                    value={form.episodeCount}
                    onChange={(event) =>
                      updateField("episodeCount", event.target.value)
                    }
                  />
                </label>
              </>
            )}

            {form.category === "Playlist" && (
              <>
                <label className="media-form__full">
                  Spotify playlist ID *
                  <input
                    required
                    value={form.spotifyPlaylistId}
                    onChange={(event) =>
                      updateField("spotifyPlaylistId", event.target.value)
                    }
                  />
                </label>
                <label>
                  Platform
                  <input
                    required
                    value={form.platform}
                    onChange={(event) =>
                      updateField("platform", event.target.value)
                    }
                  />
                </label>
              </>
            )}

            <div className="media-form__actions media-form__full">
              <button
                type="button"
                className="media-button"
                onClick={closeForm}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="media-button media-button--primary"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingItem
                    ? "Save changes"
                    : "Create item"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="media-list-section">
        <div className="media-list-section__header">
          <h2>Media items</h2>
          <span>{visibleItems.length} shown on this page</span>
        </div>

        {loading ? (
          <div className="media-empty">Loading your Shelf...</div>
        ) : error && items.length === 0 ? (
          <div className="media-empty">Unable to load media items.</div>
        ) : visibleItems.length === 0 ? (
          <div className="media-empty">
            {items.length === 0
              ? "No media items found. Add your first item."
              : "No items on this page match your search."}
          </div>
        ) : (
          <div className="media-list">
            {visibleItems.map((item) => (
              <article className="media-card" key={item.id}>
                {item.coverImageUrl ? (
                  <img
                    className="media-card__cover"
                    src={item.coverImageUrl}
                    alt={`${item.title} cover`}
                    loading="lazy"
                  />
                ) : (
                  <div className="media-card__placeholder">
                    {item.category.slice(0, 1).toUpperCase()}
                  </div>
                )}

                <div className="media-card__body">
                  <div className="media-card__title-row">
                    <div>
                      <span className="media-card__category">
                        {item.category}
                      </span>
                      <h3>{item.title}</h3>
                    </div>
                    <span className="media-card__order">
                      #{item.displayOrder}
                    </span>
                  </div>

                  <p className="media-card__status">{item.status}</p>

                  {item.category === "Book" && item.bookDetails && (
                    <p className="media-card__detail">
                      Author: {item.bookDetails.author}
                    </p>
                  )}

                  {item.category === "Movie" && item.movieDetails && (
                    <p className="media-card__detail">
                      {item.movieDetails.director || "Director unknown"}
                      {item.movieDetails.releaseYear
                        ? ` · ${item.movieDetails.releaseYear}`
                        : ""}
                    </p>
                  )}

                  {item.category === "Series" && item.seriesDetails && (
                    <p className="media-card__detail">
                      {item.seriesDetails.creator || "Creator unknown"}
                      {item.seriesDetails.seasonCount != null
                        ? ` · ${item.seriesDetails.seasonCount} seasons`
                        : ""}
                      {item.seriesDetails.episodeCount != null
                        ? ` · ${item.seriesDetails.episodeCount} episodes`
                        : ""}
                    </p>
                  )}

                  {item.category === "Playlist" && item.playlistDetails && (
                    <p className="media-card__detail">
                      {item.playlistDetails.platform} playlist
                    </p>
                  )}

                  {item.description && (
                    <p className="media-card__description">
                      {item.description}
                    </p>
                  )}

                  {item.genres.length > 0 && (
                    <div className="media-card__genres">
                      {item.genres.map((genre) => (
                        <span key={genre.id}>{genre.name}</span>
                      ))}
                    </div>
                  )}

                  <div className="media-card__actions">
                    <button
                      type="button"
                      className="media-button"
                      onClick={() => startEdit(item)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="media-button media-button--danger"
                      onClick={() => void handleDelete(item)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        <nav className="media-pagination" aria-label="Media pagination">
          <button
            type="button"
            className="media-button"
            disabled={loading || page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Previous
          </button>
          <span>
            Page {page}{totalPages > 0 ? ` of ${totalPages}` : ""}
          </span>
          <button
            type="button"
            className="media-button"
            disabled={loading || totalPages === 0 || page >= totalPages}
            onClick={() =>
              setPage((current) => Math.min(totalPages, current + 1))
            }
          >
            Next
          </button>
        </nav>
      </section>
    </main>
  );
}
