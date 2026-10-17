/* Install prompt, service worker and push subscription helpers for the admin app. */
import { useCallback, useEffect, useState } from "react";

export const pushSupported = () =>
    typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

/** Registers the service worker once. Safe to call repeatedly. */
export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
    try {
        return await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    } catch {
        return null;
    }
};

/** Adds the web app manifest, only while the admin app is on screen, so the public site is not offered for install. */
export const useAdminManifest = () => {
    useEffect(() => {
        const link = document.createElement("link");
        link.rel = "manifest";
        link.href = "/manifest.webmanifest";
        document.head.appendChild(link);
        const theme = document.createElement("meta");
        theme.name = "theme-color";
        theme.content = "#0d5672";
        document.head.appendChild(theme);
        registerServiceWorker();
        return () => { link.remove(); theme.remove(); };
    }, []);
};

interface InstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const isStandalone = () =>
    window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;

/** `canInstall` is true when the browser offers a one-tap install; `install()` shows its prompt. */
export const useInstallPrompt = () => {
    const [evt, setEvt] = useState<InstallPromptEvent | null>(null);
    const [installed, setInstalled] = useState(() => typeof window !== "undefined" && isStandalone());
    useEffect(() => {
        const onPrompt = (e: Event) => { e.preventDefault(); setEvt(e as InstallPromptEvent); };
        const onInstalled = () => { setEvt(null); setInstalled(true); };
        window.addEventListener("beforeinstallprompt", onPrompt);
        window.addEventListener("appinstalled", onInstalled);
        return () => {
            window.removeEventListener("beforeinstallprompt", onPrompt);
            window.removeEventListener("appinstalled", onInstalled);
        };
    }, []);
    const install = useCallback(async () => {
        if (!evt) return;
        await evt.prompt();
        await evt.userChoice.catch(() => undefined);
        setEvt(null);
    }, [evt]);
    return { canInstall: !!evt && !installed, installed, install };
};

const keyToBytes = (b64: string) => {
    const pad = "=".repeat((4 - (b64.length % 4)) % 4);
    const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
    return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

export type PushState = "unsupported" | "unconfigured" | "blocked" | "off" | "on" | "loading";

/** Turns notifications on or off for this device and reports the current state. */
export const usePush = (token: string | null) => {
    const [state, setState] = useState<PushState>(pushSupported() ? "loading" : "unsupported");
    const [error, setError] = useState("");
    const [publicKey, setPublicKey] = useState<string | null>(null);

    const headers = useCallback(
        () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token}` }),
        [token]
    );

    const refresh = useCallback(async () => {
        if (!pushSupported() || !token) return;
        try {
            const res = await fetch("/api/chat/push/key", { headers: headers() });
            const k = await res.json();
            if (!k.enabled) return setState("unconfigured");
            setPublicKey(k.publicKey);
            if (Notification.permission === "denied") return setState("blocked");
            const reg = await navigator.serviceWorker.getRegistration("/");
            const sub = await reg?.pushManager.getSubscription();
            setState(sub && Notification.permission === "granted" ? "on" : "off");
        } catch {
            setState("off");
        }
    }, [token, headers]);

    useEffect(() => { refresh(); }, [refresh]);

    const enable = useCallback(async () => {
        setError("");
        if (!publicKey) return;
        try {
            const perm = await Notification.requestPermission();
            if (perm !== "granted") return setState(perm === "denied" ? "blocked" : "off");
            const reg = (await registerServiceWorker()) ?? (await navigator.serviceWorker.ready);
            await navigator.serviceWorker.ready;
            const existing = await reg.pushManager.getSubscription();
            const sub = existing ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(publicKey) }));
            const res = await fetch("/api/chat/push/subscribe", { method: "POST", headers: headers(), body: JSON.stringify(sub.toJSON()) });
            if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Could not turn on notifications.");
            setState("on");
        } catch (e) {
            setError(e instanceof Error ? e.message : "Could not turn on notifications.");
            setState("off");
        }
    }, [publicKey, headers]);

    const disable = useCallback(async () => {
        try {
            const reg = await navigator.serviceWorker.getRegistration("/");
            const sub = await reg?.pushManager.getSubscription();
            if (sub) {
                await fetch("/api/chat/push/unsubscribe", { method: "POST", headers: headers(), body: JSON.stringify({ endpoint: sub.endpoint }) });
                await sub.unsubscribe();
            }
        } finally {
            setState("off");
        }
    }, [headers]);

    return { state, error, enable, disable };
};
