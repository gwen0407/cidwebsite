export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = () => {
  // Use environment variables if available, otherwise fallback to defaults
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL || "https://manus.im/oauth";
  const appId = import.meta.env.VITE_APP_ID || "cidwebsite-gwen0407";

  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  let url: URL;
  try {
    url = new URL(`${oauthPortalUrl}/app-auth`);
  } catch (e) {
    console.error("Invalid VITE_OAUTH_PORTAL_URL:", oauthPortalUrl);
    // Fallback to the standard Manus OAuth portal if the provided URL is invalid
    url = new URL("https://manus.im/oauth/app-auth");
  }

  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};
