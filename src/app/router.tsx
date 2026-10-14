
import { Navigate, Route, Routes } from "react-router-dom";
import AdminLayout from "../components/layout/AdminLayout";
import Dashboard from "../features/dashboard/Dashboard";

function PlaceholderPage({ title }: { title: string }) {
  return (
    <section className="page-content">
      <div className="page-heading">
        <p className="eyebrow">CONTENT MANAGEMENT</p>
        <h1>{title}</h1>
        <p>We'll connect this section to your existing API next.</p>
      </div>
    </section>
  );
}

export default function AdminRouter() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="projects" element={<PlaceholderPage title="Projects" />} />
        <Route path="skills" element={<PlaceholderPage title="Skills & Categories" />} />
        <Route path="certifications" element={<PlaceholderPage title="Certifications" />} />
        <Route path="travel" element={<PlaceholderPage title="Travel" />} />
        <Route path="blogs" element={<PlaceholderPage title="Blogs" />} />
        <Route path="journals" element={<PlaceholderPage title="Journals" />} />
        <Route path="media" element={<PlaceholderPage title="The Shelf" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
