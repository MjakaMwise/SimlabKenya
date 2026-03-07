import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";

interface AdminAuthContextType {
    user: User | null;
    session: Session | null;
    isLoading: boolean;
    isAdmin: boolean;
    isMfaVerified: boolean;
    setMfaVerified: (value: boolean) => void;
    signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
    signOut: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const AdminAuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isMfaVerified, setIsMfaVerified] = useState(false);

    useEffect(() => {
        const syncMfa = (activeSession: Session | null) => {
            const userId = activeSession?.user?.id;
            if (!userId) {
                setIsMfaVerified(false);
                return;
            }
            const key = `adminMfaVerified:${userId}`;
            setIsMfaVerified(sessionStorage.getItem(key) === "true");
        };

        const resolveAdmin = async (activeSession: Session | null) => {
            if (!activeSession) {
                setIsAdmin(false);
                return;
            }
            const { data, error } = await supabase.rpc("is_admin");
            if (error) {
                console.error("Failed to resolve admin status:", error);
                setIsAdmin(false);
                return;
            }
            setIsAdmin(Boolean(data));
        };

        // Get initial session
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            syncMfa(session);
            await resolveAdmin(session);
            setIsLoading(false);
        });

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            syncMfa(session);
            await resolveAdmin(session);
            setIsLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signIn = async (email: string, password: string) => {
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) throw error;
            return { error: null };
        } catch (error) {
            return { error: error as Error };
        }
    };

    const signOut = async () => {
        const userId = session?.user?.id ?? user?.id;
        if (userId) {
            sessionStorage.removeItem(`adminMfaVerified:${userId}`);
        }
        setIsMfaVerified(false);
        await supabase.auth.signOut();
    };

    const setMfaVerified = (value: boolean) => {
        const userId = session?.user?.id ?? user?.id;
        if (userId) {
            const key = `adminMfaVerified:${userId}`;
            if (value) {
                sessionStorage.setItem(key, "true");
            } else {
                sessionStorage.removeItem(key);
            }
        }
        setIsMfaVerified(value);
    };

    return (
        <AdminAuthContext.Provider
            value={{
                user,
                session,
                isLoading,
                isAdmin,
                isMfaVerified,
                setMfaVerified,
                signIn,
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
