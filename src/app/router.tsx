
// import { Navigate, Route, Routes } from "react-router-dom";
// import AdminLayout from "../components/layout/AdminLayout";
// import Dashboard from "../features/dashboard/Dashboard";
// import ProjectsPage from "../features/projects/ProjectsPage";
// import SkillsPage from "../features/skills/SkillsPage";
// import CertificationsPage from "../features/certifications/CertificationsPage";
// import TravelPage from "../features/travel/TravelPage";
// import BlogsPage from "../features/blogs/BlogsPage";
// import JournalsPage from "../features/journals/JournalsPage";
// import MediaPage from "../features/media/MediaPage";

// // function PlaceholderPage({ title }: { title: string }) {
// //   return (
// //     <section className="page-content">
// //       <div className="page-heading">
// //         <p className="eyebrow">CONTENT MANAGEMENT</p>
// //         <h1>{title}</h1>
// //         <p>We'll connect this section to your existing API next.</p>
// //       </div>
// //     </section>
// //   );
// // }

// export default function AdminRouter() {
//   return (
//     <Routes>
//       <Route element={<AdminLayout />}>
//         <Route index element={<Dashboard />} />
//         <Route path="projects" element={<ProjectsPage />} />
//         <Route path="skills" element={<SkillsPage />} />
//         <Route path="certifications" element={<CertificationsPage />} />
//         <Route path="travel" element={<TravelPage />} />
//         <Route path="blogs" element={<BlogsPage />} />
//         <Route path="journals" element={<JournalsPage />} />
//         <Route path="media" element={<MediaPage />} />
//         <Route path="*" element={<Navigate to="/" replace />} />
//       </Route>
//     </Routes>
//   );
// }

import { useCallback } from "react";
import {
  InteractionRequiredAuthError,
} from "@azure/msal-browser";
import { useMsal } from "@azure/msal-react";
import { Navigate, Route, Routes } from "react-router-dom";

import { mediaApiRequest } from "../authConfig";
import AdminLayout from "../components/layout/AdminLayout";
import Dashboard from "../features/dashboard/Dashboard";
import ProjectsPage from "../features/projects/ProjectsPage";
import SkillsPage from "../features/skills/SkillsPage";
import CertificationsPage from "../features/certifications/CertificationsPage";
import TravelPage from "../features/travel/TravelPage";
import BlogsPage from "../features/blogs/BlogsPage";
import JournalsPage from "../features/journals/JournalsPage";
import MediaPage from "../features/media/MediaPage";

export default function AdminRouter() {
  const { instance, accounts } = useMsal();

  const getMediaApiToken = useCallback(async (): Promise<string> => {
    const account =
      instance.getActiveAccount() ??
      accounts[0] ??
      instance.getAllAccounts()[0];

    if (!account) {
      throw new Error(
        "No signed-in Microsoft Entra account was found. Please sign in again."
      );
    }

    try {
      const result = await instance.acquireTokenSilent({
        ...mediaApiRequest,
        account,
      });

      return result.accessToken;
    } catch (error) {
      if (error instanceof InteractionRequiredAuthError) {
        const result = await instance.acquireTokenPopup({
          ...mediaApiRequest,
          account,
        });

        return result.accessToken;
      }

      throw error;
    }
  }, [instance, accounts]);

  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="skills" element={<SkillsPage />} />
        <Route path="certifications" element={<CertificationsPage />} />
        <Route path="travel" element={<TravelPage />} />
        <Route path="blogs" element={<BlogsPage />} />
        <Route path="journals" element={<JournalsPage />} />
        <Route
          path="media"
          element={<MediaPage getToken={getMediaApiToken} />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
