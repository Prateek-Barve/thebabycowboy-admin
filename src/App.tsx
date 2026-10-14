// // 
// import {
//   Show,
//   SignInButton,
//   SignUpButton,
//   UserButton,
// } from "@clerk/react";

// function App() {
//   return (
//     <main className="auth-test">
//       <h1>thebabycowboy Admin</h1>
//       <p>Your private content management application.</p>

//       <Show when="signed-out">
//         <div className="auth-test__actions">
//           <SignInButton>
//             <button type="button">Sign in</button>
//           </SignInButton>

//           <SignUpButton>
//             <button type="button">Create account</button>
//           </SignUpButton>
//         </div>
//       </Show>

//       <Show when="signed-in">
//         <div className="auth-test__signed-in">
//           <p>Authentication successful.</p>
//           <p>Next, we'll connect your account to the Admin dashboard.</p>
//           <UserButton />
//         </div>
//       </Show>
//     </main>
//   );
// }

// export default App;

import { BrowserRouter } from "react-router-dom";
import {
  Show,
  SignInButton
} from "@clerk/react";
import AdminRouter from "./app/router";

function App() {
  return (
    <BrowserRouter>
      <Show when="signed-out">
        <main className="sign-in-page">
          <div className="sign-in-card">
            <span className="brand-mark">b.</span>
            <p className="eyebrow">PRIVATE WORKSPACE</p>
            <h1>thebabycowboy</h1>
            <p>Sign in to access your content management studio.</p>

            <SignInButton mode="modal">
              <button className="primary-button" type="button">
                Sign in to continue <span aria-hidden="true">↗</span>
              </button>
            </SignInButton>

            <small>Authorized owner access only.</small>
          </div>
        </main>
      </Show>

      <Show when="signed-in">
        <AdminRouter />
      </Show>
    </BrowserRouter>
  );
}

export default App;
