export { COOKIE_NAME, ONE_YEAR_MS } from "../../shared/const";

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = () => {
  // Use the local login page instead of external OAuth
  return "/login";
};
