
import { Link } from "react-router-dom";

const sections = [
  {
    title: "Projects",
    description: "Manage your portfolio projects.",
    path: "/projects",
    icon: "▦",
  },
  {
    title: "Skills & Categories",
    description: "Organize your technical skills.",
    path: "/skills",
    icon: "◇",
  },
  {
    title: "Certifications",
    description: "Maintain your certifications.",
    path: "/certifications",
    icon: "✧",
  },
  {
    title: "Travel",
    description: "Manage trips and travel photos.",
    path: "/travel",
    icon: "↗",
  },
  {
    title: "Blogs",
    description: "Create and update your writing.",
    path: "/blogs",
    icon: "≡",
  },
  {
    title: "Journals",
    description: "Manage private and public entries.",
    path: "/journals",
    icon: "▤",
  },
  {
    title: "The Shelf",
    description: "Manage books, movies, series and playlists.",
    path: "/media",
    icon: "▣",
  },
];

export default function Dashboard() {
  return (
    <div className="dashboard-page">
      <section className="welcome-panel">
        <div>
          <p className="eyebrow">YOUR WORKSPACE</p>
          <h1>Good to have you back.</h1>
          <p>
            Your personal space, your projects, your stories.
            Everything in one place.
          </p>
        </div>

        <div className="welcome-mark" aria-hidden="true">
          b.
        </div>
      </section>

      <section className="section-heading">
        <div>
          <h2>Content management</h2>
          <p>Choose a section to manage your content.</p>
        </div>
        <span className="section-count">07 SECTIONS</span>
      </section>

      <div className="management-grid">
        {sections.map((section, index) => (
          <Link
            className="management-card"
            to={section.path}
            key={section.path}
          >
            <div className="management-card-top">
              <span className="management-icon" aria-hidden="true">
                {section.icon}
              </span>
              <span className="card-number">
                {String(index + 1).padStart(2, "0")}
              </span>
            </div>

            <h3>{section.title}</h3>
            <p>{section.description}</p>

            <span className="card-action">
              Open section <span aria-hidden="true">↗</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
