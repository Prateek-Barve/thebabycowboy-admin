
// import { BrowserRouter } from "react-router-dom";
// import {
//   Show,
//   SignInButton
// } from "@clerk/react";
// import AdminRouter from "./app/router";

// function App() {
//   return (
//     <BrowserRouter>
//       <Show when="signed-out">
//         <main className="sign-in-page">
//           <div className="sign-in-card">
//             <span className="brand-mark">b.</span>
//             <p className="eyebrow">PRIVATE WORKSPACE</p>
//             <h1>thebabycowboy</h1>
//             <p>Sign in to access your content management studio.</p>

//             <SignInButton mode="modal">
//               <button className="primary-button" type="button">
//                 Sign in to continue <span aria-hidden="true">↗</span>
//               </button>
//             </SignInButton>

//             <small>Authorized owner access only.</small>
//           </div>
//         </main>
//       </Show>

//       <Show when="signed-in">
//         <AdminRouter />
//       </Show>
//     </BrowserRouter>
//   );
// }

// export default App;

import { BrowserRouter } from "react-router-dom";
import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import AdminRouter from "./app/router";
import { contentApiRequest } from "./authConfig";

function App() {
  const isAuthenticated = useIsAuthenticated();
  const { instance, inProgress } = useMsal();

  function handleSignIn() {
    void instance.loginRedirect({
      scopes: contentApiRequest.scopes,
    });
  }

  if (inProgress !== "none") {
    return (
      <main className="sign-in-page">
        <div className="sign-in-card">
          <p>Connecting to your workspace...</p>
        </div>
      </main>
    );
  }

  return (
    <BrowserRouter>
      {isAuthenticated ? (
        <AdminRouter />
      ) : (
        <main className="sign-in-page">
          <div className="sign-in-card">
            <span className="brand-mark">b.</span>
            <p className="eyebrow">PRIVATE WORKSPACE</p>
            <h1>thebabycowboy</h1>
            <p>
              Sign in to access your content management studio.
            </p>

            <button
              className="primary-button"
              type="button"
              onClick={handleSignIn}
            >
              Sign in to continue{" "}
              <span aria-hidden="true">↗</span>
            </button>

            <small>Authorized owner access only.</small>
          </div>
        </main>
      )}
    </BrowserRouter>
  );
}

export default App;