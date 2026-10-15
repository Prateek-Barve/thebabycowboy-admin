
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/react";

import { contentApi } from "../../services/contentApi";
import type {
  Skill,
  SkillCategory,
  SkillRequest,
  SkillCategoryRequest,
} from "./skills.types";

type EditorMode = "create" | "edit";

type Notice = {
  type: "success" | "error";
  message: string;
};

export default function SkillsPage() {
  const { getToken } = useAuth();

  const [skills, setSkills] = useState<Skill[]>([]);
  const [categories, setCategories] = useState<SkillCategory[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [notice, setNotice] = useState<Notice | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [skillEditor, setSkillEditor] = useState<{
    mode: EditorMode;
    skill: Skill | null;
  } | null>(null);

  const [categoryEditor, setCategoryEditor] = useState<{
    mode: EditorMode;
    category: SkillCategory | null;
  } | null>(null);

  const [skillName, setSkillName] = useState("");
  const [iconUrl, setIconUrl] = useState("");
  const [skillCategoryId, setSkillCategoryId] = useState("");

  const [categoryName, setCategoryName] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);

    try {
      const [skillsData, categoriesData] = await Promise.all([
        contentApi.get<Skill[]>("/api/skills"),
        contentApi.get<SkillCategory[]>("/api/skill-categories"),
      ]);

      setSkills(skillsData);
      setCategories(categoriesData);
    } catch (error) {
      setNotice({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to load skills and categories.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredSkills = useMemo(() => {
    const query = search.trim().toLowerCase();

    return skills.filter((skill) => {
      const matchesSearch =
        skill.name.toLowerCase().includes(query) ||
        skill.categoryName.toLowerCase().includes(query);

      const matchesCategory =
        categoryFilter === "all" ||
        skill.skillCategoryId === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [skills, search, categoryFilter]);

  const showSuccess = (message: string) => {
    setNotice({ type: "success", message });
  };

  const showError = (error: unknown, fallback: string) => {
    setNotice({
      type: "error",
      message: error instanceof Error ? error.message : fallback,
    });
  };

  const openCreateSkill = () => {
    setSkillName("");
    setIconUrl("");
    setSkillCategoryId(categories[0]?.id ?? "");
    setNotice(null);

    setSkillEditor({ mode: "create", skill: null });
  };

  const openEditSkill = (skill: Skill) => {
    setSkillName(skill.name);
    setIconUrl(skill.iconUrl ?? "");
    setSkillCategoryId(skill.skillCategoryId);
    setNotice(null);

    setSkillEditor({ mode: "edit", skill });
  };

  const closeSkillEditor = () => {
    if (!saving) {
      setSkillEditor(null);
    }
  };

  const saveSkill = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!skillName.trim()) {
      setNotice({ type: "error", message: "Skill name is required." });
      return;
    }

    if (!skillCategoryId) {
      setNotice({
        type: "error",
        message: "Please select a skill category.",
      });
      return;
    }

    const payload: SkillRequest = {
      name: skillName.trim(),
      iconUrl: iconUrl.trim() || null,
      skillCategoryId,
    };

    setSaving(true);
    setNotice(null);

    try {
      if (skillEditor?.mode === "edit" && skillEditor.skill) {
        await contentApi.put(
          `/api/skills/${skillEditor.skill.id}`,
          payload,
          getToken,
        );

        showSuccess("Skill updated successfully.");
      } else {
        await contentApi.post("/api/skills", payload, getToken);
        showSuccess("Skill created successfully.");
      }

      setSkillEditor(null);
      await loadData();
    } catch (error) {
      showError(error, "Failed to save the skill.");
    } finally {
      setSaving(false);
    }
  };

  const deleteSkill = async (skill: Skill) => {
    const confirmed = window.confirm(
      `Delete "${skill.name}"? This action cannot be undone.`,
    );

    if (!confirmed) return;

    setDeletingId(skill.id);
    setNotice(null);

    try {
      await contentApi.delete(`/api/skills/${skill.id}`, getToken);

      setSkills((current) =>
        current.filter((item) => item.id !== skill.id),
      );

      showSuccess(`"${skill.name}" was deleted.`);
    } catch (error) {
      showError(error, "Failed to delete the skill.");
    } finally {
      setDeletingId(null);
    }
  };

  const openCreateCategory = () => {
    setCategoryName("");
    setNotice(null);
    setCategoryEditor({ mode: "create", category: null });
  };

  const openEditCategory = (category: SkillCategory) => {
    setCategoryName(category.name);
    setNotice(null);
    setCategoryEditor({ mode: "edit", category });
  };

  const closeCategoryEditor = () => {
    if (!saving) {
      setCategoryEditor(null);
    }
  };

  const saveCategory = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!categoryName.trim()) {
      setNotice({
        type: "error",
        message: "Category name is required.",
      });
      return;
    }

    const payload: SkillCategoryRequest = {
      name: categoryName.trim(),
    };

    setSaving(true);
    setNotice(null);

    try {
      if (categoryEditor?.mode === "edit" && categoryEditor.category) {
        await contentApi.put(
          `/api/skill-categories/${categoryEditor.category.id}`,
          payload,
          getToken,
        );

        showSuccess("Category renamed successfully.");
      } else {
        await contentApi.post(
          "/api/skill-categories",
          payload,
          getToken,
        );

        showSuccess("Category created successfully.");
      }

      setCategoryEditor(null);
      await loadData();
    } catch (error) {
      showError(error, "Failed to save the category.");
    } finally {
      setSaving(false);
    }
  };

  const deleteCategory = async (category: SkillCategory) => {
    const associatedSkills = skills.filter(
      (skill) => skill.skillCategoryId === category.id,
    );

    if (associatedSkills.length > 0) {
      setNotice({
        type: "error",
        message:
          `Cannot delete "${category.name}" because it contains ` +
          `${associatedSkills.length} skill(s). Move or delete those skills first.`,
      });
      return;
    }

    const confirmed = window.confirm(
      `Delete category "${category.name}"? This action cannot be undone.`,
    );

    if (!confirmed) return;

    setDeletingId(category.id);
    setNotice(null);

    try {
      await contentApi.delete(
        `/api/skill-categories/${category.id}`,
        getToken,
      );

      setCategories((current) =>
        current.filter((item) => item.id !== category.id),
      );

      if (categoryFilter === category.id) {
        setCategoryFilter("all");
      }

      showSuccess(`Category "${category.name}" was deleted.`);
    } catch (error) {
      showError(
        error,
        "Failed to delete the category. Check whether skills still reference it.",
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="skills-page">
      <header className="skills-page-header">
        <div>
          <span className="skills-eyebrow">CONTENT MANAGEMENT</span>
          <h1>Skills & Categories</h1>
          <p>
            Manage your technical skills and organize them into categories.
          </p>
        </div>

        <button
          type="button"
          className="skills-primary-button"
          onClick={openCreateSkill}
          disabled={categories.length === 0}
          title={
            categories.length === 0
              ? "Create a category before adding skills"
              : "Create a new skill"
          }
        >
          <span aria-hidden="true">＋</span> Add Skill
        </button>
      </header>

      {notice && (
        <div
          className={`skills-notice skills-notice-${notice.type}`}
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

      {loading ? (
        <div className="skills-loading">
          <span className="skills-spinner" />
          <p>Loading your skills...</p>
        </div>
      ) : (
        <>
          <section className="skills-stat-grid">
            <article className="skills-stat-card">
              <span>Total skills</span>
              <strong>{skills.length}</strong>
              <small>Technical abilities</small>
            </article>

            <article className="skills-stat-card">
              <span>Categories</span>
              <strong>{categories.length}</strong>
              <small>Skill groupings</small>
            </article>

            <article className="skills-stat-card">
              <span>Filtered results</span>
              <strong>{filteredSkills.length}</strong>
              <small>Matching skills</small>
            </article>
          </section>

          <section className="skills-panel">
            <div className="skills-panel-header">
              <div>
                <h2>All Skills</h2>
                <p>Create, update, search, filter, or remove skills.</p>
              </div>

              <button
                type="button"
                className="skills-secondary-button"
                onClick={openCreateSkill}
                disabled={categories.length === 0}
              >
                + New Skill
              </button>
            </div>

            <div className="skills-toolbar">
              <label className="skills-search">
                <span aria-hidden="true">⌕</span>
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search skills or categories..."
                  aria-label="Search skills"
                />
              </label>

              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                aria-label="Filter by category"
                className="skills-filter"
              >
                <option value="all">All categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {categories.length === 0 && (
              <div className="skills-empty">
                <h3>Create your first category</h3>
                <p>
                  Skills must belong to a category. Create one below to get
                  started.
                </p>
              </div>
            )}

            {filteredSkills.length === 0 && categories.length > 0 ? (
              <div className="skills-empty">
                <h3>No skills found</h3>
                <p>Try another search or create a new skill.</p>
              </div>
            ) : (
              filteredSkills.length > 0 && (
                <div className="skills-table-wrap">
                  <table className="skills-table">
                    <thead>
                      <tr>
                        <th>Skill</th>
                        <th>Category</th>
                        <th>Icon URL</th>
                        <th className="skills-actions-column">Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredSkills.map((skill) => (
                        <tr key={skill.id}>
                          <td>
                            <div className="skills-name-cell">
                              {skill.iconUrl ? (
                                <img
                                  className="skills-icon-preview"
                                  src={skill.iconUrl}
                                  alt=""
                                  loading="lazy"
                                  onError={(event) => {
                                    event.currentTarget.style.visibility =
                                      "hidden";
                                  }}
                                />
                              ) : (
                                <span className="skills-icon-placeholder">
                                  {skill.name.charAt(0).toUpperCase()}
                                </span>
                              )}

                              <strong>{skill.name}</strong>
                            </div>
                          </td>

                          <td>
                            <span className="skills-category-pill">
                              {skill.categoryName}
                            </span>
                          </td>

                          <td>
                            <span className="skills-url-text">
                              {skill.iconUrl || "—"}
                            </span>
                          </td>

                          <td>
                            <div className="skills-row-actions">
                              <button
                                type="button"
                                className="skills-action-edit"
                                onClick={() => openEditSkill(skill)}
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                className="skills-action-delete"
                                disabled={deletingId === skill.id}
                                onClick={() => void deleteSkill(skill)}
                              >
                                {deletingId === skill.id
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
              )
            )}
          </section>

          <section className="skills-panel">
            <div className="skills-panel-header">
              <div>
                <h2>Skill Categories</h2>
                <p>
                  Organize your skills. Categories with assigned skills cannot
                  be deleted until those skills are moved or removed.
                </p>
              </div>

              <button
                type="button"
                className="skills-primary-button"
                onClick={openCreateCategory}
              >
                + Add Category
              </button>
            </div>

            {categories.length === 0 ? (
              <div className="skills-empty">
                <h3>No categories yet</h3>
                <p>Create a category to start organizing your skills.</p>
              </div>
            ) : (
              <div className="skills-category-grid">
                {categories.map((category) => {
                  const count = skills.filter(
                    (skill) => skill.skillCategoryId === category.id,
                  ).length;

                  return (
                    <article
                      className="skills-category-card"
                      key={category.id}
                    >
                      <div className="skills-category-card-top">
                        <span className="skills-category-symbol">
                          #
                        </span>

                        <span className="skills-category-count">
                          {count} {count === 1 ? "skill" : "skills"}
                        </span>
                      </div>

                      <h3>{category.name}</h3>

                      <div className="skills-category-actions">
                        <button
                          type="button"
                          className="skills-action-edit"
                          onClick={() => openEditCategory(category)}
                        >
                          Rename
                        </button>

                        <button
                          type="button"
                          className="skills-action-delete"
                          disabled={
                            deletingId === category.id || count > 0
                          }
                          title={
                            count > 0
                              ? "Move or delete this category's skills first"
                              : "Delete category"
                          }
                          onClick={() => void deleteCategory(category)}
                        >
                          {deletingId === category.id
                            ? "Deleting..."
                            : "Delete"}
                        </button>
                      </div>

                      {count > 0 && (
                        <small className="skills-category-hint">
                          Move or delete its skills before deleting this
                          category.
                        </small>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}

      {skillEditor && (
        <div
          className="skills-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeSkillEditor();
            }
          }}
        >
          <section
            className="skills-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="skill-modal-title"
          >
            <div className="skills-modal-header">
              <div>
                <span className="skills-eyebrow">SKILL DETAILS</span>
                <h2 id="skill-modal-title">
                  {skillEditor.mode === "create"
                    ? "Add a Skill"
                    : "Edit Skill"}
                </h2>
              </div>

              <button
                type="button"
                className="skills-modal-close"
                onClick={closeSkillEditor}
                disabled={saving}
                aria-label="Close dialog"
              >
                ×
              </button>
            </div>

            <form onSubmit={saveSkill}>
              <label className="skills-form-field">
                <span>Skill Name *</span>
                <input
                  value={skillName}
                  onChange={(event) => setSkillName(event.target.value)}
                  placeholder="e.g. ASP.NET Core"
                  required
                  maxLength={150}
                  autoFocus
                />
              </label>

              <label className="skills-form-field">
                <span>Icon URL</span>
                <input
                  type="url"
                  value={iconUrl}
                  onChange={(event) => setIconUrl(event.target.value)}
                  placeholder="https://example.com/icon.svg"
                />
                <small>
                  Optional. Use a publicly accessible image URL.
                </small>
              </label>

              <label className="skills-form-field">
                <span>Category *</span>
                <select
                  value={skillCategoryId}
                  onChange={(event) =>
                    setSkillCategoryId(event.target.value)
                  }
                  required
                >
                  <option value="" disabled>
                    Select a category
                  </option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="skills-modal-footer">
                <button
                  type="button"
                  className="skills-secondary-button"
                  onClick={closeSkillEditor}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="skills-primary-button"
                  disabled={saving || categories.length === 0}
                >
                  {saving
                    ? "Saving..."
                    : skillEditor.mode === "create"
                      ? "Create Skill"
                      : "Save Changes"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {categoryEditor && (
        <div
          className="skills-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeCategoryEditor();
            }
          }}
        >
          <section
            className="skills-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="category-modal-title"
          >
            <div className="skills-modal-header">
              <div>
                <span className="skills-eyebrow">CATEGORY DETAILS</span>
                <h2 id="category-modal-title">
                  {categoryEditor.mode === "create"
                    ? "Add a Category"
                    : "Rename Category"}
                </h2>
              </div>

              <button
                type="button"
                className="skills-modal-close"
                onClick={closeCategoryEditor}
                disabled={saving}
                aria-label="Close dialog"
              >
                ×
              </button>
            </div>

            <form onSubmit={saveCategory}>
              <label className="skills-form-field">
                <span>Category Name *</span>
                <input
                  value={categoryName}
                  onChange={(event) => setCategoryName(event.target.value)}
                  placeholder="e.g. Backend Development"
                  required
                  maxLength={150}
                  autoFocus
                />
              </label>

              <div className="skills-modal-footer">
                <button
                  type="button"
                  className="skills-secondary-button"
                  onClick={closeCategoryEditor}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="skills-primary-button"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : categoryEditor.mode === "create"
                      ? "Create Category"
                      : "Save Changes"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
