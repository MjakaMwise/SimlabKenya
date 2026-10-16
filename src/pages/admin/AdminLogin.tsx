import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, Mail, Lock, AlertCircle } from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import OTPVerification from "@/components/admin/OTPVerification";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logo from "@/assets/logo.jpeg";

const AdminLogin = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const {
        signIn, resendOtp, verifyOtp, cancelOtp,
        user, isAdmin, isMfaVerified, awaitingOtp, pendingEmail,
        isLoading: authLoading,
    } = useAdminAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const shouldShowOtp = awaitingOtp && !isMfaVerified;

    useEffect(() => {
        if (!authLoading && user && isAdmin && isMfaVerified) {
            navigate("/admin");
        }
        if (searchParams.get("error") === "unauthorized") {
            setError("You don't have admin access. Please contact support.");
        }
    }, [user, isAdmin, isMfaVerified, authLoading, navigate, searchParams]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);
        try {
            const { error } = await signIn(email, password);
            if (error) setError(error.message);
            else setPassword("");
        } finally {
            setIsLoading(false);
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md"
            >
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                    {/* Header */}
                    <div className="bg-primary p-6 text-center">
                        <img
                            src={logo}
                            alt="SIM-Lab Kenya"
                            className="w-16 h-16 rounded-full mx-auto mb-4 border-4 border-white/20"
                        />
                        <h1 className="text-2xl font-heading font-bold text-white">
                            Admin Panel
                        </h1>
                        <p className="text-primary-foreground/80 text-sm mt-1">
                            SIM-Lab Kenya Administration
                        </p>
                    </div>

                    {/* Body */}
                    <div className="p-6 space-y-4">
                        {shouldShowOtp ? (
                            <>
                                                                <OTPVerification
                                    email={pendingEmail ?? email}
                                    onVerify={verifyOtp}
                                    onResend={resendOtp}
                                    onCancel={cancelOtp}
                                    onSuccess={() => navigate("/admin")}
                                />
                            </>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm"
                                    >
                                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                        {error}
                                    </motion.div>
                                )}

                                <div className="space-y-2">
                                    <Label htmlFor="email">Email Address</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                        <Input
                                            id="email"
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="admin@simlabkenya.com"
                                            className="pl-10"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="password">Password</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                        <Input
                                            id="password"
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Enter your password"
                                            className="pl-10"
                                            required
                                        />
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    variant="cta"
                                    size="lg"
                                    className="w-full"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" /> Signing in...
                                        </>
                                    ) : (
                                        "Sign In"
                                    )}
                                </Button>
                            </form>
                        )}
                    </div>

                    {/* Footer */}
                    {!shouldShowOtp && (
                        <div className="px-6 pb-6 text-center">
                            <a
                                href="/"
                                className="text-sm text-muted-foreground hover:text-primary"
                            >
                                â† Back to Website
                            </a>
                        </div>
                    )}
                </div>

                <p className="text-center text-sm text-muted-foreground mt-6">
                    Need help? Contact{" "}
                    <a href="mailto:simlabkenya@gmail.com" className="text-primary">
                        simlabkenya@gmail.com
                    </a>
                </p>
            </motion.div>
        </div>
    );
};

export default AdminLogin;




