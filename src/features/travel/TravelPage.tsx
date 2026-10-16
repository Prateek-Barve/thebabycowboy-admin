
import { useCallback, useEffect, useState } from "react";
// import { useAuth } from "@clerk/react";
import { InteractionRequiredAuthError } from "@azure/msal-browser";
import { useMsal } from "@azure/msal-react";
import { contentApiRequest } from "../../authConfig";
import { contentApi } from "../../services/contentApi";
import type {
  TravelTrip,
  TravelTripRequest,
  TravelPhotoRequest,
} from "./travel.types";

type TripForm = {
  title: string;
  location: string;
  country: string;
  description: string;
  coverImageUrl: string;
};

type PhotoForm = {
  imageUrl: string;
  caption: string;
};

const emptyTripForm: TripForm = {
  title: "",
  location: "",
  country: "",
  description: "",
  coverImageUrl: "",
};

const emptyPhotoForm: PhotoForm = {
  imageUrl: "",
  caption: "",
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

export default function TravelPage() {
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
  const [trips, setTrips] = useState<TravelTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");

  const [showTripForm, setShowTripForm] = useState(false);
  const [editingTrip, setEditingTrip] = useState<TravelTrip | null>(null);
  const [tripForm, setTripForm] = useState<TripForm>(emptyTripForm);

  const [expandedTripId, setExpandedTripId] = useState<string | null>(null);
  const [photoTrip, setPhotoTrip] = useState<TravelTrip | null>(null);
  const [photoForm, setPhotoForm] = useState<PhotoForm>(emptyPhotoForm);

  const loadTrips = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await contentApi.get<TravelTrip[]>("/api/travel");
      setTrips(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTrips();
  }, [loadTrips]);

  const filteredTrips = trips.filter((trip) => {
    const query = search.trim().toLowerCase();

    return (
      trip.title.toLowerCase().includes(query) ||
      trip.location.toLowerCase().includes(query) ||
      trip.country.toLowerCase().includes(query)
    );
  });

  function openCreateForm() {
    setEditingTrip(null);
    setTripForm(emptyTripForm);
    setError("");
    setSuccess("");
    setShowTripForm(true);
  }

  function openEditForm(trip: TravelTrip) {
    setEditingTrip(trip);
    setTripForm({
      title: trip.title,
      location: trip.location,
      country: trip.country,
      description: trip.description,
      coverImageUrl: trip.coverImageUrl ?? "",
    });
    setError("");
    setSuccess("");
    setShowTripForm(true);
  }

  function closeTripForm() {
    if (saving) return;
    setShowTripForm(false);
    setEditingTrip(null);
    setTripForm(emptyTripForm);
  }

  async function handleTripSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const payload: TravelTripRequest = {
      title: tripForm.title.trim(),
      location: tripForm.location.trim(),
      country: tripForm.country.trim(),
      description: tripForm.description.trim(),
      coverImageUrl: tripForm.coverImageUrl.trim() || null,
    };

    if (
      !payload.title ||
      !payload.location ||
      !payload.country ||
      !payload.description
    ) {
      setError("Please fill in all required fields.");
      return;
    }

    setSaving(true);

    try {
      if (editingTrip) {
        await contentApi.put(
          `/api/travel/${editingTrip.id}`,
          payload,
          getToken,
        );
        setSuccess("Travel trip updated successfully.");
      } else {
        await contentApi.post("/api/travel", payload, getToken);
        setSuccess("Travel trip created successfully.");
      }

      setShowTripForm(false);
      setEditingTrip(null);
      setTripForm(emptyTripForm);
      await loadTrips();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteTrip(trip: TravelTrip) {
    const confirmed = window.confirm(
      `Delete "${trip.title}"? This may also remove its associated photos.`,
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      await contentApi.delete(`/api/travel/${trip.id}`, getToken);

      if (expandedTripId === trip.id) setExpandedTripId(null);
      if (photoTrip?.id === trip.id) setPhotoTrip(null);

      setSuccess("Travel trip deleted successfully.");
      await loadTrips();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  function openPhotoForm(trip: TravelTrip) {
    setPhotoTrip(trip);
    setPhotoForm(emptyPhotoForm);
    setError("");
    setSuccess("");
  }

  async function handlePhotoSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!photoTrip) return;

    setError("");
    setSuccess("");

    const payload: TravelPhotoRequest = {
      imageUrl: photoForm.imageUrl.trim(),
      caption: photoForm.caption.trim() || null,
    };

    if (!payload.imageUrl) {
      setError("Please enter an image URL.");
      return;
    }

    setSaving(true);

    try {
      await contentApi.post(
        `/api/travel/${photoTrip.id}/photos`,
        payload,
        getToken,
      );

      setSuccess("Photo added successfully.");
      setPhotoForm(emptyPhotoForm);
      await loadTrips();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeletePhoto(trip: TravelTrip, photoId: string) {
    const confirmed = window.confirm("Delete this travel photo?");
    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      await contentApi.delete(
        `/api/travel/${trip.id}/photos/${photoId}`,
        getToken,
      );

      setSuccess("Photo deleted successfully.");
      await loadTrips();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  const closePhotoForm = () => {
    if (saving) return;
    setPhotoTrip(null);
    setPhotoForm(emptyPhotoForm);
  };

  return (
    <div className="travel-page">
      <div className="travel-header">
        <div>
          <span className="travel-eyebrow">CONTENT MANAGEMENT</span>
          <h1>Travel</h1>
          <p>Manage your trips, destinations and travel photo collections.</p>
        </div>

        <button className="travel-primary-btn" onClick={openCreateForm}>
          <span aria-hidden="true">＋</span> Add trip
        </button>
      </div>

      <div className="travel-stats">
        <div className="travel-stat-card">
          <span>Total trips</span>
          <strong>{trips.length}</strong>
        </div>
        <div className="travel-stat-card">
          <span>Destinations</span>
          <strong>
            {new Set(trips.map((trip) => trip.country.trim().toLowerCase()))
              .size}
          </strong>
        </div>
        <div className="travel-stat-card">
          <span>Total photos</span>
          <strong>
            {trips.reduce((total, trip) => total + trip.photos.length, 0)}
          </strong>
        </div>
      </div>

      <div className="travel-toolbar">
        <div className="travel-search">
          <span aria-hidden="true">⌕</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search trips, locations or countries..."
            aria-label="Search travel trips"
          />
        </div>
        <span className="travel-result-count">
          {filteredTrips.length} {filteredTrips.length === 1 ? "trip" : "trips"}
        </span>
      </div>

      {error && (
        <div className="travel-alert travel-alert-error" role="alert">
          <span>{error}</span>
          <button onClick={() => setError("")} aria-label="Dismiss error">
            ×
          </button>
        </div>
      )}

      {success && (
        <div className="travel-alert travel-alert-success" role="status">
          <span>{success}</span>
          <button onClick={() => setSuccess("")} aria-label="Dismiss message">
            ×
          </button>
        </div>
      )}

      {loading ? (
        <div className="travel-state">
          <div className="travel-spinner" />
          <p>Loading your travel collection...</p>
        </div>
      ) : filteredTrips.length === 0 ? (
        <div className="travel-empty">
          <div className="travel-empty-icon">⌖</div>
          <h3>{search ? "No trips found" : "Your travel story starts here"}</h3>
          <p>
            {search
              ? "Try another title, location or country."
              : "Add your first trip to start building your collection."}
          </p>
          {!search && (
            <button className="travel-primary-btn" onClick={openCreateForm}>
              Add your first trip
            </button>
          )}
        </div>
      ) : (
        <div className="travel-trip-list">
          {filteredTrips.map((trip) => {
            const expanded = expandedTripId === trip.id;

            return (
              <article className="travel-trip-card" key={trip.id}>
                <div className="travel-trip-main">
                  <div className="travel-cover">
                    {trip.coverImageUrl ? (
                      <img
                        src={trip.coverImageUrl}
                        alt={`${trip.title} cover`}
                        loading="lazy"
                      />
                    ) : (
                      <div className="travel-cover-placeholder">⌖</div>
                    )}
                  </div>

                  <div className="travel-trip-info">
                    <div className="travel-trip-heading">
                      <h2>{trip.title}</h2>
                      <span className="travel-photo-count">
                        {trip.photos.length}{" "}
                        {trip.photos.length === 1 ? "photo" : "photos"}
                      </span>
                    </div>
                    <p className="travel-location">
                      <span aria-hidden="true">⌖</span> {trip.location},{" "}
                      {trip.country}
                    </p>
                    <p className="travel-description">{trip.description}</p>

                    <div className="travel-trip-actions">
                      <button
                        className="travel-btn travel-btn-secondary"
                        onClick={() =>
                          setExpandedTripId(expanded ? null : trip.id)
                        }
                      >
                        {expanded ? "Hide photos" : "Manage photos"}
                      </button>
                      <button
                        className="travel-btn travel-btn-secondary"
                        onClick={() => openEditForm(trip)}
                      >
                        Edit trip
                      </button>
                      <button
                        className="travel-btn travel-btn-danger"
                        onClick={() => void handleDeleteTrip(trip)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>

                {expanded && (
                  <div className="travel-photos-panel">
                    <div className="travel-photos-heading">
                      <div>
                        <h3>Photo collection</h3>
                        <p>Images attached to {trip.title}</p>
                      </div>
                      <button
                        className="travel-primary-btn"
                        onClick={() => openPhotoForm(trip)}
                      >
                        ＋ Add photo
                      </button>
                    </div>

                    {trip.photos.length === 0 ? (
                      <p className="travel-no-photos">
                        No photos yet. Add the first one to this trip.
                      </p>
                    ) : (
                      <div className="travel-photo-grid">
                        {trip.photos.map((photo) => (
                          <div className="travel-photo-card" key={photo.id}>
                            <img
                              src={photo.imageUrl}
                              alt={photo.caption || `${trip.title} photo`}
                              loading="lazy"
                            />
                            <div className="travel-photo-footer">
                              <span>{photo.caption || "Untitled photo"}</span>
                              <button
                                className="travel-icon-delete"
                                title="Delete photo"
                                aria-label={`Delete photo ${photo.caption || photo.id}`}
                                onClick={() =>
                                  void handleDeletePhoto(trip, photo.id)
                                }
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {showTripForm && (
        <div className="travel-modal-backdrop">
          <div
            className="travel-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="travel-trip-modal-title"
          >
            <div className="travel-modal-header">
              <div>
                <span className="travel-eyebrow">TRAVEL COLLECTION</span>
                <h2 id="travel-trip-modal-title">
                  {editingTrip ? "Edit trip" : "Create a trip"}
                </h2>
              </div>
              <button
                className="travel-modal-close"
                onClick={closeTripForm}
                disabled={saving}
                aria-label="Close dialog"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleTripSubmit}>
              <div className="travel-form-grid">
                <label className="travel-field travel-field-full">
                  Trip title *
                  <input
                    value={tripForm.title}
                    onChange={(event) =>
                      setTripForm({ ...tripForm, title: event.target.value })
                    }
                    placeholder="e.g. Kodaikanal Escape"
                    required
                    maxLength={200}
                  />
                </label>

                <label className="travel-field">
                  Location *
                  <input
                    value={tripForm.location}
                    onChange={(event) =>
                      setTripForm({ ...tripForm, location: event.target.value })
                    }
                    placeholder="e.g. Kodaikanal"
                    required
                    maxLength={200}
                  />
                </label>

                <label className="travel-field">
                  Country *
                  <input
                    value={tripForm.country}
                    onChange={(event) =>
                      setTripForm({ ...tripForm, country: event.target.value })
                    }
                    placeholder="e.g. India"
                    required
                    maxLength={100}
                  />
                </label>

                <label className="travel-field travel-field-full">
                  Description *
                  <textarea
                    value={tripForm.description}
                    onChange={(event) =>
                      setTripForm({
                        ...tripForm,
                        description: event.target.value,
                      })
                    }
                    placeholder="Tell the story of this trip..."
                    required
                    rows={4}
                  />
                </label>

                <label className="travel-field travel-field-full">
                  Cover image URL
                  <input
                    type="url"
                    value={tripForm.coverImageUrl}
                    onChange={(event) =>
                      setTripForm({
                        ...tripForm,
                        coverImageUrl: event.target.value,
                      })
                    }
                    placeholder="https://..."
                  />
                  <span className="travel-field-hint">
                    Leave blank if you don't have a cover image.
                  </span>
                </label>
              </div>

              <div className="travel-modal-actions">
                <button
                  type="button"
                  className="travel-btn travel-btn-secondary"
                  onClick={closeTripForm}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="travel-primary-btn"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingTrip
                      ? "Save changes"
                      : "Create trip"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {photoTrip && (
        <div className="travel-modal-backdrop">
          <div
            className="travel-modal travel-photo-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="travel-photo-modal-title"
          >
            <div className="travel-modal-header">
              <div>
                <span className="travel-eyebrow">PHOTO COLLECTION</span>
                <h2 id="travel-photo-modal-title">Add a photo</h2>
                <p className="travel-modal-subtitle">{photoTrip.title}</p>
              </div>
              <button
                className="travel-modal-close"
                onClick={closePhotoForm}
                disabled={saving}
                aria-label="Close dialog"
              >
                ×
              </button>
            </div>

            <form onSubmit={handlePhotoSubmit}>
              <div className="travel-form-grid">
                <label className="travel-field travel-field-full">
                  Image URL *
                  <input
                    type="url"
                    value={photoForm.imageUrl}
                    onChange={(event) =>
                      setPhotoForm({
                        ...photoForm,
                        imageUrl: event.target.value,
                      })
                    }
                    placeholder="https://..."
                    required
                  />
                </label>

                <label className="travel-field travel-field-full">
                  Caption
                  <input
                    value={photoForm.caption}
                    onChange={(event) =>
                      setPhotoForm({
                        ...photoForm,
                        caption: event.target.value,
                      })
                    }
                    placeholder="A short description of this photo"
                    maxLength={300}
                  />
                </label>
              </div>

              {photoForm.imageUrl.trim() && (
                <div className="travel-image-preview">
                  <span>Preview</span>
                  <img
                    src={photoForm.imageUrl}
                    alt={photoForm.caption || "Travel photo preview"}
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                    onLoad={(event) => {
                      event.currentTarget.style.display = "block";
                    }}
                  />
                </div>
              )}

              <div className="travel-modal-actions">
                <button
                  type="button"
                  className="travel-btn travel-btn-secondary"
                  onClick={closePhotoForm}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="travel-primary-btn"
                  disabled={saving}
                >
                  {saving ? "Adding..." : "Add photo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
