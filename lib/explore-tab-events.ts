const exploreTabSelectEvent = "flashmaple:explore-tab-select";

export function notifyExploreTabSelection(tab: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<string>(exploreTabSelectEvent, { detail: tab }));
}

export function subscribeExploreTabSelection(listener: (tab: string) => void) {
  if (typeof window === "undefined") return () => {};

  const handleSelection = (event: Event) => {
    listener((event as CustomEvent<string>).detail);
  };

  window.addEventListener(exploreTabSelectEvent, handleSelection);
  return () => window.removeEventListener(exploreTabSelectEvent, handleSelection);
}
