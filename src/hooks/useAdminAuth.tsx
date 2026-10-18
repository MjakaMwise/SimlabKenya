import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Area = "orders" | "abstracts" | "shop" | "ocean" | "whatsapp" | "email";
export type Level = "view" | "manage";

interface AdminUser {
    id: string;
    email: string;
    name?: string | null;
    /** Sessions from before staff accounts existed have no role; they belong to administrators. */
    role?: "admin" | "staff";
    permissions?: string[];
}

interface Result {
    error: Error | null;
}

interface AdminAuthContextType {
    user: AdminUser | null;
    token: string | null;
    isLoading: boolean;
    isAdmin: boolean;
    /** True for full administrators (not delegated staff). */
    isFullAdmin: boolean;
    /** Whether the signed-in person may view/manage an area. Mirrors the server's checks. */
    can: (area: Area, level: Level) => boolean;
    isMfaVerified: boolean;
    /** True after the password was accepted and a code was emailed, until the code is verified. */
    awaitingOtp: boolean;
    pendingEmail: string | null;
    signIn: (email: string, password: string) => Promise<Result>;
    resendOtp: () => Promise<Result>;
    verifyOtp: (code: string) => Promise<Result>;
    cancelOtp: () => void;
    signOut: () => Promise<void>;
}

const STORAGE_KEY = "adminSession";

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

const loadSession = (): { token: string; user: AdminUser } | null => {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

const post = async (path: string, body: unknown, bearer?: string) => {
    const res = await fetch(`/api/admin/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(bearer && { Authorization: `Bearer ${bearer}` }) },
        body: JSON.stringify(body ?? {}),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
};

export const AdminAuthProvider = ({ children }: { children: ReactNode }) => {
    const [session, setSession] = useState(loadSession);
    const [pending, setPending] = useState<{ token: string; email: string } | null>(null);

    const signIn = async (email: string, password: string): Promise<Result> => {
        try {
            const data = await post("login", { email, password });
            setPending({ token: data.pendingToken, email: data.email });
            return { error: null };
        } catch (error) {
            return { error: error as Error };
        }
    };

    const resendOtp = async (): Promise<Result> => {
        if (!pending) return { error: new Error("Please sign in again") };
        try {
            await post("resend-otp", {}, pending.token);
            return { error: null };
        } catch (error) {
            return { error: error as Error };
        }
    };

    const verifyOtp = async (code: string): Promise<Result> => {
        if (!pending) return { error: new Error("Please sign in again") };
        try {
            const data = await post("verify-otp", { otp: code }, pending.token);
            const next = { token: data.token as string, user: data.user as AdminUser };
            try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* storage blocked */ }
            setSession(next);
            setPending(null);
            return { error: null };
        } catch (error) {
            return { error: error as Error };
        }
    };

    const cancelOtp = () => setPending(null);

    const signOut = async () => {
        try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* storage blocked */ }
        setSession(null);
        setPending(null);
    };

    const signedIn = !!session;
    const token = session?.token ?? null;

    // Pick up changes to role/permissions made since sign-in, and drop sessions the server no longer accepts.
    useEffect(() => {
        if (!token) return;
        let cancelled = false;
        fetch("/api/admin/me", { headers: { Authorization: `Bearer ${token}` } })
            .then(async (res) => {
                if (cancelled) return;
                if (res.status === 401) return signOut();
                if (!res.ok) return;
                const me = await res.json();
                setSession((s) => {
                    if (!s) return s;
                    const next = { ...s, user: { ...s.user, ...me } };
                    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* storage blocked */ }
                    return next;
                });
            })
            .catch(() => { /* offline: keep the cached session */ });
        return () => { cancelled = true; };
    }, [token]);

    const isFullAdmin = signedIn && (session?.user.role ?? "admin") === "admin";
    const can = (area: Area, level: Level) => {
        if (!signedIn) return false;
        if (isFullAdmin) return true;
        const perms = session?.user.permissions ?? [];
        return perms.includes(`${area}:manage`) || (level === "view" && perms.includes(`${area}:view`));
    };

    return (
        <AdminAuthContext.Provider
            value={{
                user: session?.user ?? null,
                token: session?.token ?? null,
                isLoading: false,
                isAdmin: signedIn,
                isFullAdmin,
                can,
                isMfaVerified: signedIn,
                awaitingOtp: !!pending,
                pendingEmail: pending?.email ?? null,
                signIn,
                resendOtp,
                verifyOtp,
                cancelOtp,
                signOut,
            }}
        >
            {children}
        </AdminAuthContext.Provider>
    );
};

export const useAdminAuth = () => {
    const context = useContext(AdminAuthContext);
    if (!context) {
        throw new Error("useAdminAuth must be used within an AdminAuthProvider");
    }
    return context;
};
