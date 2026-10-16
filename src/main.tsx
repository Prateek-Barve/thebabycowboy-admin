
// import { StrictMode } from "react";
// import { createRoot } from "react-dom/client";
// import { ClerkProvider } from "@clerk/react";
// import App from "./App";
// import "./index.css";

// const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// if (!publishableKey) {
//   throw new Error(
//     "Missing VITE_CLERK_PUBLISHABLE_KEY in .env.local"
//   );
// }

// createRoot(document.getElementById("root")!).render(
//   <StrictMode>
//     <ClerkProvider publishableKey={publishableKey}>
//       <App />
//     </ClerkProvider>
//   </StrictMode>
// );

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  PublicClientApplication,
} from "@azure/msal-browser";
import { MsalProvider } from "@azure/msal-react";
import App from "./App";
import { msalConfig } from "./authConfig";
import "./index.css";

const msalInstance = new PublicClientApplication(msalConfig);

async function startApp() {
  await msalInstance.initialize();
  await msalInstance.handleRedirectPromise();

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <MsalProvider instance={msalInstance}>
        <App />
      </MsalProvider>
    </StrictMode>
  );
}

void startApp().catch((error: unknown) => {
  console.error("Failed to initialize Microsoft authentication:", error);

  document.getElementById("root")!.textContent =
    "Authentication could not be initialized. Check the browser console.";
});