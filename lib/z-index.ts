/**
 * Shared stacking order for app UI layers.
 *
 * Keep the semantic names here so components do not depend on raw z-index
 * values. The order is intentionally sparse so a future layer can be added
 * without renumbering the existing ones.
 *
 * 10  content states inside a page
 * 20  content controls and page-level floating controls
 * 30  desktop route layer
 * 40  app navigation and fixed chrome
 * 50  floating actions
 * 55  mobile back-to-top button above the tab bar
 * 60  mobile route layer and menus
 * 70  modal surfaces
 * 100 loading overlay
 * 200 toast notifications
 * 300 splash screen
 */
export const appZIndex = {
  content: "z-10",
  contentControl: "z-20",
  backToTop: "z-55 md:z-20",
  navigation: "z-40",
  floatingAction: "z-50",
  routeLayer: "z-60 md:z-30",
  menu: "z-60",
  modal: "z-70",
  loading: "z-100",
  toast: "z-200",
  splash: "z-300",
} as const;
