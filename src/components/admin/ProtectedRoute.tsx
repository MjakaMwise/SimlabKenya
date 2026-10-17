import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth, Area } from "@/hooks/useAdminAuth";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
    children: ReactNode;
    /** Require view access to this area (staff need it delegated; administrators always pass). */
    area?: Area;
    /** Administrators only. */
    adminOnly?: boolean;
}

const ProtectedRoute = ({ children, area, adminOnly }: ProtectedRouteProps) => {
    const { user, isLoading, isAdmin, isMfaVerified, isFullAdmin, can } = useAdminAuth();
    const allowed = adminOnly ? isFullAdmin : area ? can(area, "view") : true;
    const navigate = useNavigate();

    useEffect(() => {
        if (!isLoading) {
            if (!user) {
                navigate("/admin/login");
            } else if (!isAdmin) {
                navigate("/admin/login?error=unauthorized");
            } else if (!isMfaVerified) {
                navigate("/admin/login?mfa=required");
            } else if (!allowed) {
                navigate("/admin/settings", { replace: true });
            }
        }
    }, [user, isLoading, isAdmin, isMfaVerified, allowed, navigate]);

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

    if (!user || !isAdmin || !isMfaVerified || !allowed) {
        return null;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
