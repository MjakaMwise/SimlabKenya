import { useState } from "react";
import { motion } from "framer-motion";
import { User, Mail, Key, Bell, Store, Loader2 } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

const AdminSettings = () => {
    const { user } = useAdminAuth();
    const { toast } = useToast();
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [passwordData, setPasswordData] = useState({
        newPassword: "",
        confirmPassword: "",
    });
    const [notificationSettings, setNotificationSettings] = useState({
        emailOnNewOrder: true,
        emailDailySummary: false,
    });

    const handlePasswordChange = async () => {
        if (passwordData.newPassword.length < 6) {
            toast({
                title: "Password too short",
                description: "Password must be at least 6 characters",
                variant: "destructive",
            });
            return;
        }

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast({
                title: "Passwords don't match",
                description: "Please make sure both passwords are the same",
                variant: "destructive",
            });
            return;
        }

        setIsChangingPassword(true);

        try {
            const { error } = await supabase.auth.updateUser({
                password: passwordData.newPassword,
            });

            if (error) throw error;

            toast({
                title: "Password updated",
                description: "Your password has been changed successfully",
            });

            setPasswordData({ newPassword: "", confirmPassword: "" });
        } catch (error) {
            console.error("Password change error:", error);
            toast({
                title: "Error",
                description: "Failed to update password. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsChangingPassword(false);
        }
    };

    return (
        <AdminLayout>
            <div className="space-y-6 max-w-3xl">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-heading font-bold text-gray-900">
                        Settings
                    </h1>
                    <p className="text-muted-foreground">
                        Manage your account and preferences
                    </p>
                </div>

                {/* Account Info */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white p-6 rounded-xl shadow-sm border"
                >
                    <h2 className="text-lg font-heading font-bold mb-4 flex items-center gap-2">
                        <User className="w-5 h-5 text-primary" /> Account Information
                    </h2>
                    <div className="space-y-4">
                        <div>
                            <Label className="text-muted-foreground">Email Address</Label>
                            <div className="flex items-center gap-2 mt-1">
                                <Mail className="w-4 h-4 text-muted-foreground" />
                                <p className="font-medium">{user?.email}</p>
                            </div>
                        </div>
                        <div>
                            <Label className="text-muted-foreground">Role</Label>
                            <p className="font-medium mt-1">Administrator</p>
                        </div>
                        <div>
                            <Label className="text-muted-foreground">User ID</Label>
                            <p className="font-mono text-sm mt-1 text-muted-foreground">
                                {user?.id}
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* Change Password */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white p-6 rounded-xl shadow-sm border"
                >
                    <h2 className="text-lg font-heading font-bold mb-4 flex items-center gap-2">
                        <Key className="w-5 h-5 text-primary" /> Change Password
                    </h2>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="newPassword">New Password</Label>
                            <Input
                                id="newPassword"
                                type="password"
                                value={passwordData.newPassword}
                                onChange={(e) =>
                                    setPasswordData({ ...passwordData, newPassword: e.target.value })
                                }
                                placeholder="••••••••"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm New Password</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                value={passwordData.confirmPassword}
                                onChange={(e) =>
                                    setPasswordData({
                                        ...passwordData,
                                        confirmPassword: e.target.value,
                                    })
                                }
                                placeholder="••••••••"
                            />
                        </div>
                        <Button
                            onClick={handlePasswordChange}
                            disabled={isChangingPassword || !passwordData.newPassword}
                        >
                            {isChangingPassword ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" /> Updating...
                                </>
                            ) : (
                                "Update Password"
                            )}
                        </Button>
                    </div>
                </motion.div>

                {/* Notification Settings */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white p-6 rounded-xl shadow-sm border"
                >
                    <h2 className="text-lg font-heading font-bold mb-4 flex items-center gap-2">
                        <Bell className="w-5 h-5 text-primary" /> Notifications
                    </h2>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">Email on new order</p>
                                <p className="text-sm text-muted-foreground">
                                    Receive an email notification when a new order is placed
                                </p>
                            </div>
                            <Switch
                                checked={notificationSettings.emailOnNewOrder}
                                onCheckedChange={(checked) =>
                                    setNotificationSettings({
                                        ...notificationSettings,
                                        emailOnNewOrder: checked,
                                    })
                                }
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">Daily summary email</p>
                                <p className="text-sm text-muted-foreground">
                                    Receive a daily summary of all orders and activity
                                </p>
                            </div>
                            <Switch
                                checked={notificationSettings.emailDailySummary}
                                onCheckedChange={(checked) =>
                                    setNotificationSettings({
                                        ...notificationSettings,
                                        emailDailySummary: checked,
                                    })
                                }
                            />
                        </div>
                    </div>
                </motion.div>

                {/* Shop Info */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white p-6 rounded-xl shadow-sm border"
                >
                    <h2 className="text-lg font-heading font-bold mb-4 flex items-center gap-2">
                        <Store className="w-5 h-5 text-primary" /> Shop Information
                    </h2>
                    <div className="space-y-4">
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                                <Label className="text-muted-foreground">Shop Name</Label>
                                <p className="font-medium mt-1">SIM-Lab Kenya Shop</p>
                            </div>
                            <div>
                                <Label className="text-muted-foreground">Contact Email</Label>
                                <p className="font-medium mt-1">simlabkenya@gmail.com</p>
                            </div>
                            <div>
                                <Label className="text-muted-foreground">Phone</Label>
                                <p className="font-medium mt-1">+254 727 054 994</p>
                            </div>
                            <div>
                                <Label className="text-muted-foreground">Location</Label>
                                <p className="font-medium mt-1">IOME001 Innovation Hub, Mombasa</p>
                            </div>
                        </div>
                        <div className="pt-4 border-t">
                            <p className="text-sm text-muted-foreground">
                                To update shop information, please edit the website code or contact your developer.
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* Danger Zone */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-red-50 p-6 rounded-xl border border-red-200"
                >
                    <h2 className="text-lg font-heading font-bold mb-4 text-red-700">
                        Danger Zone
                    </h2>
                    <p className="text-sm text-red-600 mb-4">
                        These actions are irreversible. Please proceed with caution.
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant="outline"
                            className="border-red-300 text-red-600 hover:bg-red-100"
                            onClick={() => {
                                toast({
                                    title: "Feature coming soon",
                                    description: "Data export will be available in a future update",
                                });
                            }}
                        >
                            Export All Data
                        </Button>
                        <Button
                            variant="outline"
                            className="border-red-300 text-red-600 hover:bg-red-100"
                            onClick={() => {
                                toast({
                                    title: "Contact support",
                                    description: "To delete all orders, please contact support",
                                    variant: "destructive",
                                });
                            }}
                        >
                            Delete All Orders
                        </Button>
                    </div>
                </motion.div>
            </div>
        </AdminLayout>
    );
};

export default AdminSettings;
