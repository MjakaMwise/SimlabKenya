import { createContext, useContext, useState, ReactNode } from "react";

interface AdminUser {
    id: string;
    email: string;
}

interface Result {
    error: Error | null;
}

interface AdminAuthContextType {
    user: AdminUser | null;
    token: string | null;
    isLoading: boolean;
    isAdmin: boolean;
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

    return (
        <AdminAuthContext.Provider
            value={{
                user: session?.user ?? null,
                token: session?.token ?? null,
                isLoading: false,
                isAdmin: signedIn,
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
