
import { LogLevel, type Configuration } from "@azure/msal-browser";

const tenantSubdomain = import.meta.env.VITE_ENTRA_TENANT_SUBDOMAIN;
const tenantDomain = import.meta.env.VITE_ENTRA_TENANT_DOMAIN;
const clientId = import.meta.env.VITE_ENTRA_ADMIN_CLIENT_ID;
const contentApiScope = import.meta.env.VITE_ENTRA_CONTENT_API_SCOPE;
const mediaApiScope = import.meta.env.VITE_ENTRA_MEDIA_API_SCOPE;

if (
  !tenantSubdomain ||
  !tenantDomain ||
  !clientId ||
  !contentApiScope ||
  !mediaApiScope
) {
  throw new Error(
    "Missing Microsoft Entra configuration. Check your .env.local file."
  );
}

export const msalConfig: Configuration = {
  auth: {
    clientId,
    authority: `https://${tenantSubdomain}.ciamlogin.com/${tenantDomain}`,
    knownAuthorities: [
      `${tenantSubdomain}.ciamlogin.com`,
      "2643b107-719f-4a66-9bf3-f7a1a889fa93.ciamlogin.com",
    ],
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: "sessionStorage",
  },
  system: {
    loggerOptions: {
      logLevel: LogLevel.Warning,
      piiLoggingEnabled: false,
    },
  },
};

export const contentApiRequest = {
  scopes: [contentApiScope],
};

export const mediaApiRequest = {
  scopes: [mediaApiScope],
};
