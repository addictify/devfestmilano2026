"use client";

import { useSyncExternalStore } from "react";
import { FEEDBACK_OPENS_AT, isFeedbackOpen } from "@/lib/feedback-window";

/**
 * Whether session ratings are open, flipping by itself at the opening time
 * so a page left open overnight starts showing the form without a reload.
 * The static HTML is built before opening, so the server snapshot is closed.
 */
function subscribe(onChange: () => void) {
  const wait = new Date(FEEDBACK_OPENS_AT).getTime() - Date.now();
  // setTimeout overflows past ~24.8 days; nothing to schedule if already open.
  if (wait <= 0 || wait > 2 ** 31 - 1) return () => {};
  const id = setTimeout(onChange, wait + 1000);
  return () => clearTimeout(id);
}

export const useFeedbackOpen = () =>
  useSyncExternalStore(subscribe, () => isFeedbackOpen(), () => false);
