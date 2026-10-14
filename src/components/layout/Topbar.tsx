
import { useLocation } from "react-router-dom";
import { UserButton } from "@clerk/react";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/projects": "Projects",
  "/skills": "Skills & Categories",
  "/certifications": "Certifications",
  "/travel": "Travel",
  "/blogs": "Blogs",
  "/journals": "Journals",
  "/media": "The Shelf",
};

interface TopbarProps {
  onMenuClick: () => void;
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const location = useLocation();
  const title = pageTitles[location.pathname] ?? "Admin";

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          type="button"
          className="menu-button"
          aria-label="Open navigation"
          onClick={onMenuClick}
        >
          ☰
        </button>

        <div>
          <p className="topbar-overline">YOUR DIGITAL SPACE</p>
          <h2>{title}</h2>
        </div>
      </div>

      <div className="topbar-right">
        <span className="admin-label">OWNER</span>
        <UserButton />
      </div>
    </header>
  );
}
