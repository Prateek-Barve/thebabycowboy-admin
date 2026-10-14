
import { NavLink } from "react-router-dom";

const navigation = [
  {
    label: "WORKSPACE",
    items: [
      { label: "Dashboard", path: "/", icon: "⌂" },
    ],
  },
  {
    label: "PORTFOLIO",
    items: [
      { label: "Projects", path: "/projects", icon: "▦" },
      { label: "Skills & Categories", path: "/skills", icon: "◇" },
      { label: "Certifications", path: "/certifications", icon: "✧" },
      { label: "Travel", path: "/travel", icon: "↗" },
      { label: "Blogs", path: "/blogs", icon: "≡" },
      { label: "Journals", path: "/journals", icon: "▤" },
      { label: "The Shelf", path: "/media", icon: "▣" },
    ],
  },
];

interface SidebarProps {
  open: boolean;
  onNavigate: () => void;
}

export default function Sidebar({ open, onNavigate }: SidebarProps) {
  return (
    <>
      {open && (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={onNavigate}
        />
      )}

      <aside className={`sidebar ${open ? "sidebar--open" : ""}`}>
        <NavLink to="/" className="sidebar-brand" onClick={onNavigate}>
          <span className="brand-mark">b.</span>
          <span>
            <strong>thebabycowboy</strong>
            <small>ADMIN STUDIO</small>
          </span>
        </NavLink>

        <nav className="sidebar-nav">
          {navigation.map((group) => (
            <div className="nav-group" key={group.label}>
              <p className="nav-group-label">{group.label}</p>

              {group.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === "/"}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `nav-link ${isActive ? "nav-link--active" : ""}`
                  }
                >
                  <span className="nav-icon" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span className="status-dot" />
          <span>Private workspace</span>
        </div>
      </aside>
    </>
  );
}
