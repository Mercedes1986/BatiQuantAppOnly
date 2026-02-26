export const AD_CONFIG = {
  // ✅ UNIFIÉ : doit matcher index.html (meta + script)
  PUBLISHER_ID: "ca-pub-2793469545509663",

  // Routes où on ne veut aucune pub (sensibles / UX / conformité)
  DENY_LIST: ["/app/settings", "/app/quotes", "/app/invoices", "/app/print"],

  // Dans l’app : on autorise seulement des placements "safe"
  APP_SAFE_ROUTES: [
    "/app",
    "/app/dashboard",
    "/app/calculator",
    "/app/house",
    "/app/projects",
    "/app/materials",
  ],
};

const startsWithAny = (pathname: string, routes: string[]) =>
  routes.some((route) => pathname === route || pathname.startsWith(route + "/"));

export const getAdPermission = (
  pathname: string
): "deny" | "content" | "safe_only" => {
  if (startsWithAny(pathname, AD_CONFIG.DENY_LIST)) return "deny";

  // Plus de pages “contenu” : l’appli uniquement.
  return "safe_only";
};
