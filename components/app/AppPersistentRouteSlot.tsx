"use client";

import { useState, type ReactNode } from "react";

export function AppPersistentRouteSlot({ children }: { children: ReactNode }) {
  const [persistedChildren, setPersistedChildren] = useState<ReactNode>(children);

  // During a soft navigation Next can temporarily provide null for the
  // implicit children slot while the parallel route is being resolved. Keep
  // the previous tree in the DOM until the next route is ready so an overlay
  // back navigation never exposes the document background.
  if (children !== null && children !== undefined && children !== persistedChildren) {
    setPersistedChildren(children);
  }

  return <>{children ?? persistedChildren}</>;
}
