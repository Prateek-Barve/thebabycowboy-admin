// import { useCallback, useEffect, useState } from "react";
// import { contentApi, } from "../../services/contentApi";
// import type { Project } from "./project.types";
// import { ApiError } from "../../services/apiClient";

// export default function ProjectsPage() {
//   const [projects, setProjects] = useState<Project[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);

//   const loadProjects = useCallback(async () => {
//     try {
//       setLoading(true);
//       setError(null);

//       const data = await contentApi.get<Project[]>("/api/projects");

//       setProjects(data);
//     } catch (err) {
//       if (err instanceof ApiError) {
//         setError(`Unable to load projects (${err.status}): ${err.message}`);
//       } else {
//         setError(
//           err instanceof Error
//             ? err.message
//             : "Something went wrong while loading projects."
//         );
//       }
//     } finally {
//       setLoading(false);
//     }
//   }, []);

//   useEffect(() => {
//     void loadProjects();
//   }, [loadProjects]);

//   return (
//     <div className="projects-page">
//       <section className="projects-heading">
//         <div>
//           <p className="eyebrow">PORTFOLIO MANAGEMENT</p>
//           <h1>Projects</h1>
//           <p>Manage the projects displayed on your digital space.</p>
//         </div>

//         <button
//           type="button"
//           className="primary-button projects-add-button"
//           onClick={() => alert("We'll implement the Create Project form next.")}
//         >
//           + Add project
//         </button>
//       </section>

//       <section className="projects-toolbar">
//         <div>
//           <span className="projects-count">
//             {projects.length.toString().padStart(2, "0")}
//           </span>
//           <span> projects in your portfolio</span>
//         </div>

//         <button
//           type="button"
//           className="secondary-button"
//           onClick={() => void loadProjects()}
//           disabled={loading}
//         >
//           ↻ Refresh
//         </button>
//       </section>

//       {loading ? (
//         <div className="projects-message">
//           <span className="loading-spinner" />
//           <p>Loading your projects...</p>
//         </div>
//       ) : error ? (
//         <div className="projects-error">
//           <h3>Couldn't load projects</h3>
//           <p>{error}</p>

//           <button
//             type="button"
//             className="secondary-button"
//             onClick={() => void loadProjects()}
//           >
//             Try again
//           </button>
//         </div>
//       ) : projects.length === 0 ? (
//         <div className="projects-empty">
//           <span className="empty-icon">▦</span>
//           <h3>Your portfolio is waiting.</h3>
//           <p>
//             You haven't added any projects yet. Create your first project
//             to get started.
//           </p>
//         </div>
//       ) : (
//         <div className="projects-table-wrapper">
//           <table className="projects-table">
//             <thead>
//               <tr>
//                 <th>PROJECT</th>
//                 <th>DESCRIPTION</th>
//                 <th>TECHNOLOGIES</th>
//                 <th>LINK</th>
//               </tr>
//             </thead>

//             <tbody>
//               {projects.map((project) => (
//                 <tr key={project.id}>
//                   <td>
//                     <div className="project-identity">
//                       {project.thumbnailUrl ? (
//                         <img
//                           className="project-thumbnail"
//                           src={project.thumbnailUrl}
//                           alt=""
//                           loading="lazy"
//                         />
//                       ) : (
//                         <div className="project-thumbnail project-thumbnail-placeholder">
//                           ▦
//                         </div>
//                       )}

//                       <div className="project-name">
//                         <strong>{project.title}</strong>
//                         <span>
//                           {project.id.slice(0, 8).toUpperCase()}
//                         </span>
//                       </div>
//                     </div>
//                   </td>

//                   <td>
//                     <p className="project-description">
//                       {project.shortDescription}
//                     </p>
//                   </td>

//                   <td>
//                     <div className="project-skills">
//                       {project.skills?.length ? (
//                         <>
//                           {project.skills.slice(0, 3).map((skill) => (
//                             <span
//                               className="project-skill-tag"
//                               key={skill.id}
//                             >
//                               {skill.name}
//                             </span>
//                           ))}

//                           {project.skills.length > 3 && (
//                             <span className="project-skill-more">
//                               +{project.skills.length - 3}
//                             </span>
//                           )}
//                         </>
//                       ) : (
//                         <span className="project-no-skills">
//                           No skills assigned
//                         </span>
//                       )}
//                     </div>
//                   </td>

//                   <td>
//                     {project.gitHubUrl ? (
//                       <a
//                         className="project-github-link"
//                         href={project.gitHubUrl}
//                         target="_blank"
//                         rel="noopener noreferrer"
//                       >
//                         GitHub ↗
//                       </a>
//                     ) : (
//                       <span className="project-no-skills">—</span>
//                     )}
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       )}
//     </div>
//   );
// }

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/react";
import { ApiError } from "../../services/apiClient";
import { contentApi } from "../../services/contentApi";
import type {
  Project,
  ProjectRequest,
  ProjectStatus,
  SkillOption,
} from "./project.types";

const emptyForm: ProjectRequest = {
  title: "",
  shortDescription: "",
  description: "",
  status: "InProgress",
  thumbnailUrl: null,
  gitHubUrl: null,
  skillIds: [],
};

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return `${error.message} (HTTP ${error.status})`;
  }

  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}

function getProjectStatus(status: ProjectStatus): string {
  switch (status) {
    case "InProgress":
      return "In progress";
    case "Completed":
      return "Completed";
    case "Archived":
      return "Archived";
  }
}

export default function ProjectsPage() {
  const { getToken } = useAuth();

  const [projects, setProjects] = useState<Project[]>([]);
  const [skills, setSkills] = useState<SkillOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [form, setForm] = useState<ProjectRequest>(emptyForm);

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await contentApi.get<Project[]>("/api/projects");
      setProjects(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSkills = useCallback(async () => {
    try {
      const data = await contentApi.get<SkillOption[]>("/api/skills");
      setSkills(data);
    } catch (err) {
      setFormError(
        `Couldn't load available skills. ${getErrorMessage(err)}`
      );
    }
  }, []);

  useEffect(() => {
    void loadProjects();
    void loadSkills();
  }, [loadProjects, loadSkills]);

  function openCreateModal() {
    setEditingProject(null);
    setForm(emptyForm);
    setFormError(null);
    setNotice(null);
    setModalOpen(true);
  }

  function openEditModal(project: Project) {
    setEditingProject(project);
    setForm({
      title: project.title ?? "",
      shortDescription: project.shortDescription ?? "",
      description: project.description ?? "",
      status: project.status ?? "InProgress",
      thumbnailUrl: project.thumbnailUrl ?? null,
      gitHubUrl: project.gitHubUrl ?? null,
      skillIds: (project.skills ?? []).map((skill) => skill.id),
    });
    setFormError(null);
    setNotice(null);
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;

    setModalOpen(false);
    setEditingProject(null);
    setFormError(null);
  }

  function updateField<K extends keyof ProjectRequest>(
    field: K,
    value: ProjectRequest[K]
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function toggleSkill(skillId: string) {
    setForm((current) => ({
      ...current,
      skillIds: current.skillIds.includes(skillId)
        ? current.skillIds.filter((id) => id !== skillId)
        : [...current.skillIds, skillId],
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setNotice(null);

    const payload: ProjectRequest = {
      ...form,
      title: form.title.trim(),
      shortDescription: form.shortDescription.trim(),
      description: form.description.trim(),
      thumbnailUrl: form.thumbnailUrl?.trim() || null,
      gitHubUrl: form.gitHubUrl?.trim() || null,
    };

    if (!payload.title || !payload.shortDescription || !payload.description) {
      setFormError("Please complete all required fields.");
      return;
    }

    try {
      setSaving(true);

      if (editingProject) {
        await contentApi.put(
          `/api/projects/${editingProject.id}`,
          payload,
          getToken
        );
      } else {
        await contentApi.post("/api/projects", payload, getToken);
      }

      setModalOpen(false);
      setEditingProject(null);
      setNotice(
        editingProject
          ? "Project updated successfully."
          : "Project created successfully."
      );

      await loadProjects();
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(project: Project) {
    const confirmed = window.confirm(
      `Delete "${project.title}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    setNotice(null);
    setError(null);
    setDeletingId(project.id);

    try {
      await contentApi.delete(
        `/api/projects/${project.id}`,
        getToken
      );

      setProjects((current) =>
        current.filter((item) => item.id !== project.id)
      );

      setNotice(`"${project.title}" was deleted.`);
    } catch (err) {
      setError(`Couldn't delete project. ${getErrorMessage(err)}`);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="projects-page">
      <section className="projects-heading">
        <div>
          <p className="eyebrow">PORTFOLIO MANAGEMENT</p>
          <h1>Projects</h1>
          <p>Manage the projects displayed on your digital space.</p>
        </div>

        <button
          type="button"
          className="primary-button projects-add-button"
          onClick={openCreateModal}
        >
          + Add project
        </button>
      </section>

      {notice && (
        <div className="projects-notice" role="status">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice(null)}>
            Dismiss
          </button>
        </div>
      )}

      <section className="projects-toolbar">
        <div>
          <span className="projects-count">
            {projects.length.toString().padStart(2, "0")}
          </span>
          <span> projects in your portfolio</span>
        </div>

        <button
          type="button"
          className="secondary-button"
          onClick={() => void loadProjects()}
          disabled={loading}
        >
          ↻ Refresh
        </button>
      </section>

      {error && (
        <div className="projects-error-banner" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
        <div className="projects-message">
          <span className="loading-spinner" />
          <p>Loading your projects...</p>
        </div>
      ) : error && projects.length === 0 ? (
        <div className="projects-empty">
          <h3>Couldn't load projects</h3>
          <p>Check the API connection and try again.</p>
          <button
            type="button"
            className="secondary-button"
            onClick={() => void loadProjects()}
          >
            Try again
          </button>
        </div>
      ) : projects.length === 0 ? (
        <div className="projects-empty">
          <span className="empty-icon">▦</span>
          <h3>Your portfolio is waiting.</h3>
          <p>Create your first project to get started.</p>
          <button
            type="button"
            className="primary-button projects-empty-button"
            onClick={openCreateModal}
          >
            + Create your first project
          </button>
        </div>
      ) : (
        <div className="projects-table-wrapper">
          <table className="projects-table">
            <thead>
              <tr>
                <th>PROJECT</th>
                <th>DESCRIPTION</th>
                <th>TECHNOLOGIES</th>
                <th>STATUS</th>
                <th>LINK</th>
                <th>ACTIONS</th>
              </tr>
            </thead>

            <tbody>
              {projects.map((project) => (
                <tr key={project.id}>
                  <td>
                    <div className="project-identity">
                      {project.thumbnailUrl ? (
                        <img
                          className="project-thumbnail"
                          src={project.thumbnailUrl}
                          alt=""
                          loading="lazy"
                        />
                      ) : (
                        <div className="project-thumbnail project-thumbnail-placeholder">
                          ▦
                        </div>
                      )}

                      <div className="project-name">
                        <strong>{project.title}</strong>
                        <span>{project.id.slice(0, 8).toUpperCase()}</span>
                      </div>
                    </div>
                  </td>

                  <td>
                    <p className="project-description">
                      {project.shortDescription}
                    </p>
                  </td>

                  <td>
                    <div className="project-skills">
                      {project.skills?.length ? (
                        <>
                          {project.skills.slice(0, 3).map((skill) => (
                            <span className="project-skill-tag" key={skill.id}>
                              {skill.name}
                            </span>
                          ))}
                          {project.skills.length > 3 && (
                            <span className="project-skill-more">
                              +{project.skills.length - 3}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="project-no-skills">No skills</span>
                      )}
                    </div>
                  </td>

                  <td>
                    <span
                      className={`project-status project-status--${project.status}`}
                    >
                      {getProjectStatus(project.status)}
                    </span>
                  </td>

                  <td>
                    {project.gitHubUrl ? (
                      <a
                        className="project-github-link"
                        href={project.gitHubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        GitHub ↗
                      </a>
                    ) : (
                      <span className="project-no-skills">—</span>
                    )}
                  </td>

                  <td>
                    <div className="project-actions">
                      <button
                        type="button"
                        className="project-action-button"
                        onClick={() => openEditModal(project)}
                        aria-label={`Edit ${project.title}`}
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        className="project-action-button project-action-delete"
                        onClick={() => void handleDelete(project)}
                        disabled={deletingId === project.id}
                        aria-label={`Delete ${project.title}`}
                      >
                        {deletingId === project.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div
          className="project-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <section
            className="project-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="project-modal-title"
          >
            <header className="project-modal-header">
              <div>
                <p className="eyebrow">PORTFOLIO MANAGEMENT</p>
                <h2 id="project-modal-title">
                  {editingProject ? "Edit project" : "Create project"}
                </h2>
              </div>

              <button
                type="button"
                className="project-modal-close"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close dialog"
              >
                ×
              </button>
            </header>

            <form className="project-form" onSubmit={handleSubmit}>
              <label className="project-form-field">
                <span>Project title *</span>
                <input
                  required
                  maxLength={150}
                  value={form.title}
                  onChange={(event) => updateField("title", event.target.value)}
                  placeholder="e.g. AI API Testing Agent"
                />
              </label>

              <label className="project-form-field">
                <span>Short description *</span>
                <textarea
                  required
                  rows={2}
                  maxLength={500}
                  value={form.shortDescription}
                  onChange={(event) =>
                    updateField("shortDescription", event.target.value)
                  }
                  placeholder="A short summary displayed on your portfolio."
                />
              </label>

              <label className="project-form-field">
                <span>Full description *</span>
                <textarea
                  required
                  rows={5}
                  value={form.description}
                  onChange={(event) =>
                    updateField("description", event.target.value)
                  }
                  placeholder="Describe the project, its purpose and features."
                />
              </label>

              <label className="project-form-field">
                <span>Status *</span>
                <select
                  value={form.status}
                  onChange={(event) =>
                    updateField("status", event.target.value as ProjectStatus)
                  }
                >
                  <option value="InProgress">In progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Archived">Archived</option>
                </select>
              </label>

              <label className="project-form-field">
                <span>Thumbnail image URL</span>
                <input
                  type="url"
                  value={form.thumbnailUrl ?? ""}
                  onChange={(event) =>
                    updateField("thumbnailUrl", event.target.value || null)
                  }
                  placeholder="https://..."
                />
              </label>

              <label className="project-form-field">
                <span>GitHub URL</span>
                <input
                  type="url"
                  value={form.gitHubUrl ?? ""}
                  onChange={(event) =>
                    updateField("gitHubUrl", event.target.value || null)
                  }
                  placeholder="https://github.com/..."
                />
              </label>

              <fieldset className="project-skills-fieldset">
                <legend>Technologies and skills</legend>
                <p>Select the skills associated with this project.</p>

                {skills.length === 0 ? (
                  <p className="project-no-skills">
                    No skills loaded. You can save the project without skills,
                    or revisit after fixing the skills endpoint.
                  </p>
                ) : (
                  <div className="project-skill-options">
                    {skills.map((skill) => (
                      <label className="project-skill-option" key={skill.id}>
                        <input
                          type="checkbox"
                          checked={form.skillIds.includes(skill.id)}
                          onChange={() => toggleSkill(skill.id)}
                        />
                        <span>{skill.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </fieldset>

              {formError && (
                <div className="project-form-error" role="alert">
                  {formError}
                </div>
              )}

              <footer className="project-form-footer">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button project-save-button"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingProject
                      ? "Save changes"
                      : "Create project"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
