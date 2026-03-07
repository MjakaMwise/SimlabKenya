import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
    children: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
    const { user, isLoading, isAdmin, isMfaVerified } = useAdminAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!isLoading) {
            if (!user) {
                navigate("/admin/login");
            } else if (!isAdmin) {
                navigate("/admin/login?error=unauthorized");
            } else if (!isMfaVerified) {
                navigate("/admin/login?mfa=required");
            }
        }
    }, [user, isLoading, isAdmin, isMfaVerified, navigate]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    if (!user || !isAdmin || !isMfaVerified) {
        return null;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
