"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { useAuth } from "@/hooks/useAuth";
import { apiUrl } from "@/lib/api-base";

/**
 * Subscribe this browser to event notifications.
 *
 * Deliberately not asked for on page load. A permission prompt that arrives
 * unprompted is the one people refuse, and a refusal is close to permanent —
 * the browser stops asking, and there is no way back from the site. So the
 * prompt only ever follows a click on the toggle.
 */
export type PushState =
  | "unsupported" // no service worker or Push API (older iOS Safari, http://)
  | "loading"
  | "denied" // refused at the browser level; the toggle can't undo this
  | "off"
  | "on";

/** VAPID keys travel as base64url; PushManager wants the raw bytes. */
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = atob(padded);
  // Backed by a plain ArrayBuffer, which is what applicationServerKey accepts;
  // a bare Uint8Array may be typed over a SharedArrayBuffer.
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function supported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    PUBLIC_KEY.length > 0
  );
}

export function usePushNotifications() {
  const [state, setState] = useState<PushState>("loading");
  const [busy, setBusy] = useState(false);
  const locale = useLocale();
  const { user } = useAuth();

  // Reading the current state needs the service worker registration, which is
  // async and browser-only, so it can't be a render-time initial value. The
  // rule against setState-in-effect exists to catch state derived from props;
  // this is an external system being sampled, which is what effects are for.
  useEffect(() => {
    let active = true;
    void (async () => {
      if (!supported()) return active && setState("unsupported");
      if (Notification.permission === "denied") return active && setState("denied");
      const registration = await navigator.serviceWorker.getRegistration();
      const existing = await registration?.pushManager.getSubscription();
      if (active) setState(existing ? "on" : "off");
    })();
    return () => {
      active = false;
    };
  }, []);

  // Re-register after sign-in so the stored row gains the uid, which is what
  // session reminders match on. Without this, someone who subscribed while
  // signed out would get announcements but never a reminder.
  useEffect(() => {
    if (!user || state !== "on") return;
    void (async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      const existing = await registration?.pushManager.getSubscription();
      if (!existing) return;
      await fetch(apiUrl("/api/push/subscribe"), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify({ subscription: existing.toJSON(), locale }),
      }).catch(() => {});
    })();
  }, [user, state, locale]);

  const enable = useCallback(async () => {
    if (!supported()) return;
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }
      const registration =
        (await navigator.serviceWorker.getRegistration()) ??
        (await navigator.serviceWorker.register("/sw.js"));
      await navigator.serviceWorker.ready;

      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          // Required by Chrome: every push must show something. The service
          // worker honours this by always calling showNotification.
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(PUBLIC_KEY),
        }));

      const headers: Record<string, string> = { "content-type": "application/json" };
      if (user) headers.authorization = `Bearer ${await user.getIdToken()}`;
      const res = await fetch(apiUrl("/api/push/subscribe"), {
        method: "POST",
        headers,
        body: JSON.stringify({ subscription: subscription.toJSON(), locale }),
      });
      if (!res.ok) {
        // The browser would keep a subscription the server never stored, and
        // the toggle would read "on" while nothing could ever arrive.
        await subscription.unsubscribe().catch(() => {});
        setState("off");
        return;
      }
      setState("on");
    } catch {
      setState("off");
    } finally {
      setBusy(false);
    }
  }, [locale, user]);

  const disable = useCallback(async () => {
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe().catch(() => {});
        await fetch(apiUrl("/api/push/subscribe"), {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ endpoint }),
        }).catch(() => {});
      }
      setState("off");
    } finally {
      setBusy(false);
    }
  }, []);

  return { state, busy, enable, disable };
}
