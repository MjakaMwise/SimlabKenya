import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface OTPVerificationProps {
    email: string;
    onVerify: (otp: string) => Promise<{ error: Error | null }>;
    onResend: () => Promise<{ error: Error | null }>;
    isLoading?: boolean;
    onCancel: () => void;
    onSuccess?: () => void;
}

const OTPVerification = ({
    email,
    onVerify,
    onResend,
    isLoading = false,
    onCancel,
    onSuccess,
}: OTPVerificationProps) => {
    const [otp, setOtp] = useState(["", "", "", "", "", ""]);
    const [error, setError] = useState("");
    const [isVerifying, setIsVerifying] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [resendTimer, setResendTimer] = useState(0);
    const [isVerified, setIsVerified] = useState(false);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Countdown timer for resend
    useEffect(() => {
        if (resendTimer > 0) {
            const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [resendTimer]);

    // Navigate to admin dashboard after successful verification
    useEffect(() => {
        if (isVerified && onSuccess) {
            const timer = setTimeout(onSuccess, 1500); // Wait 1.5 seconds to show success screen
            return () => clearTimeout(timer);
        }
    }, [isVerified, onSuccess]);

    const handleInputChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return; // Only allow digits

        const newOtp = [...otp];
        newOtp[index] = value.slice(-1); // Take only last character
        setOtp(newOtp);

        // Auto-focus next input
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (
        index: number,
        e: React.KeyboardEvent<HTMLInputElement>
    ) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        } else if (e.key === "ArrowLeft" && index > 0) {
            inputRefs.current[index - 1]?.focus();
        } else if (e.key === "ArrowRight" && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const otpCode = otp.join("");

        if (otpCode.length !== 6) {
            setError("Please enter all 6 digits");
            return;
        }

        setError("");
        setIsVerifying(true);

        const { error } = await onVerify(otpCode);

        if (error) {
            setError(error.message);
            setIsVerifying(false);
        } else {
            setIsVerified(true);
        }
    };

    const handleResend = async () => {
        setError("");
        setIsResending(true);

        const { error } = await onResend();

        if (error) {
            setError(error.message);
        } else {
            setResendTimer(30); // 30 second cooldown
            setOtp(["", "", "", "", "", ""]);
        }

        setIsResending(false);
    };

    if (isVerified) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-4"
            >
                <div className="flex justify-center">
                    <CheckCircle className="w-16 h-16 text-green-500" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                    Successfully Verified!
                </h2>
                <p className="text-gray-600">
                    You are now signing in to the admin panel.
                </p>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
        >
            <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Two-Factor Authentication
                </h2>
                <p className="text-gray-600 text-sm">
                    We've sent a verification code to <br />
                    <span className="font-semibold text-gray-900">{email}</span>
                </p>
            </div>

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

                <div>
                    <Label className="block text-center mb-4 text-sm font-medium text-gray-700">
                        Enter 6-digit code
                    </Label>
                    <div className="flex justify-center gap-2">
                        {otp.map((digit, index) => (
                            <Input
                                key={index}
                                ref={(el) => {
                                    inputRefs.current[index] = el;
                                }}
                                type="text"
                                inputMode="numeric"
                                maxLength={1}
                                value={digit}
                                onChange={(e) =>
                                    handleInputChange(index, e.target.value)
                                }
                                onKeyDown={(e) => handleKeyDown(index, e)}
                                placeholder="•"
                                className="w-12 h-12 text-center text-2xl font-bold tracking-widest border-2"
                                disabled={isVerifying || isLoading}
                            />
                        ))}
                    </div>
                </div>

                <Button
                    type="submit"
                    variant="cta"
                    size="lg"
                    className="w-full"
                    disabled={isVerifying || isLoading || otp.join("").length !== 6}
                >
                    {isVerifying ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" /> Verifying...
                        </>
                    ) : (
                        "Verify Code"
                    )}
                </Button>
            </form>

            <div className="space-y-3 text-center">
                <p className="text-sm text-gray-600">
                    {resendTimer > 0
                        ? `Resend code in ${resendTimer}s`
                        : "Didn't receive the code?"}
                </p>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleResend}
                    disabled={resendTimer > 0 || isResending || isLoading}
                    className="w-full"
                >
                    {isResending ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" /> Resending...
                        </>
                    ) : (
                        "Resend Code"
                    )}
                </Button>
            </div>

            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onCancel}
                disabled={isVerifying || isLoading}
                className="w-full"
            >
                ← Back to Login
            </Button>
        </motion.div>
    );
};

export default OTPVerification;