/**
 * Pre-paint decision for the notifications prompt.
 *
 * The prompt is in the server HTML for everyone. This inline script runs in
 * <head>, before first paint, and sets html[data-push] so CSS can hide it for
 * people it doesn't apply to. Deciding later (after hydration and an async
 * service-worker check) made the prompt pop in and push the page down —
 * a layout shift that lands right as someone taps a session.
 *
 *   on   — subscribed on this device (remembered by usePushNotifications)
 *   off  — can subscribe, hasn't
 *   ios  — iPhone/iPad Safari tab: Web Push needs the Home Screen app first
 *   none — can't (no Push API, no VAPID key, or refused in the browser)
 */
export const PUSH_STORAGE_KEY = "devfest-push";

const hasKey = Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);

export const pushStateScript = `(function(){try{
var n=navigator,w=window,s,
ios=/iPad|iPhone|iPod/.test(n.userAgent)||(n.platform==="MacIntel"&&n.maxTouchPoints>1),
app=w.matchMedia("(display-mode: standalone)").matches||n.standalone===true;
if(!${hasKey}||!("serviceWorker" in n)||!("PushManager" in w)||!("Notification" in w))s=ios&&!app?"ios":"none";
else if(Notification.permission==="denied")s="none";
else if(Notification.permission==="granted"&&localStorage.getItem("${PUSH_STORAGE_KEY}")==="on")s="on";
else s="off";
document.documentElement.setAttribute("data-push",s);
}catch(e){}})();`;
