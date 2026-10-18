import { createContext, useCallback, useContext, useState, ReactNode } from "react";

export interface School {
    id: string;
    name: string;
    schoolType: string;
    county: string;
    adminName: string;
    adminEmail: string;
    adminPhone: string;
    status: "pending" | "confirmed" | "waitlisted" | "cancelled";
}

interface SchoolAuthContextType {
    school: School | null;
    token: string | null;
    signIn: (email: string, password: string) => Promise<void>;
    register: (body: Record<string, unknown>) => Promise<void>;
    signOut: () => void;
    /** fetch against /api/schools with the bearer token; signs out on 401. */
    api: <T = unknown>(path: string, init?: { method?: string; body?: unknown }) => Promise<T>;
}

const STORAGE_KEY = "schoolSession";

const SchoolAuthContext = createContext<SchoolAuthContextType | undefined>(undefined);

const load = (): { token: string; school: School } | null => {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

const request = async (path: string, init: { method?: string; body?: unknown } = {}, token?: string | null) => {
    const res = await fetch(`/api/schools${path}`, {
        method: init.method ?? (init.body !== undefined ? "POST" : "GET"),
        headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
        body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data.error || `Request failed (${res.status})`), { status: res.status });
    return data;
};

export const SchoolAuthProvider = ({ children }: { children: ReactNode }) => {
    const [session, setSession] = useState(load);

    const start = (data: { token: string; school: School }) => {
        try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* private mode: stay signed in for this page only */ }
        setSession(data);
    };

    const signOut = useCallback(() => {
        try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
        setSession(null);
    }, []);

    const token = session?.token ?? null;

    const api = useCallback(
        async <T,>(path: string, init?: { method?: string; body?: unknown }) => {
            try {
                return (await request(path, init, token)) as T;
            } catch (e) {
                if ((e as { status?: number }).status === 401) signOut();
                throw e;
            }
        },
        [token, signOut]
    );

    return (
        <SchoolAuthContext.Provider
            value={{
                school: session?.school ?? null,
                token,
                signIn: async (email, password) => start(await request("/login", { body: { email, password } })),
                register: async (body) => start(await request("/register", { body })),
                signOut,
                api,
            }}
        >
            {children}
        </SchoolAuthContext.Provider>
    );
};

export const useSchoolAuth = () => {
    const ctx = useContext(SchoolAuthContext);
    if (!ctx) throw new Error("useSchoolAuth must be used within SchoolAuthProvider");
    return ctx;
};
