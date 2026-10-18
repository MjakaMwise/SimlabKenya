import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, KeyRound, Trash2, Copy, AlertCircle } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface Member {
    id: string;
    email: string;
    name: string | null;
    role: "admin" | "staff";
    permissions: string[];
    active: boolean;
    created_at: string;
}

type Access = "none" | "view" | "manage";
const AREAS: [string, string][] = [
    ["orders", "Orders"],
    ["abstracts", "Abstracts"],
    ["shop", "Shop (products)"],
    ["ocean", "Ocean Shujaa"],
    ["whatsapp", "WhatsApp inbox"],
    ["email", "Email"],
];

const accessOf = (perms: string[], area: string): Access =>
    perms.includes(`${area}:manage`) ? "manage" : perms.includes(`${area}:view`) ? "view" : "none";
const toPermissions = (access: Record<string, Access>) =>
    AREAS.flatMap(([a]) => (access[a] === "manage" ? [`${a}:manage`] : access[a] === "view" ? [`${a}:view`] : []));
const emptyAccess = (): Record<string, Access> => Object.fromEntries(AREAS.map(([a]) => [a, "none" as Access]));

const AccessPicker = ({ value, onChange }: { value: Record<string, Access>; onChange: (v: Record<string, Access>) => void }) => (
    <div className="space-y-3">
        {AREAS.map(([area, label]) => (
            <div key={area} className="flex items-center justify-between gap-4">
                <Label>{label}</Label>
                <Select value={value[area]} onValueChange={(v) => onChange({ ...value, [area]: v as Access })}>
                    <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">No access</SelectItem>
                        <SelectItem value="view">View only</SelectItem>
                        <SelectItem value="manage">View &amp; manage</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        ))}
    </div>
);

const summary = (perms: string[]) => {
    const parts = AREAS.map(([a, l]) => ({ l, x: accessOf(perms, a) })).filter((p) => p.x !== "none");
    return parts.length ? parts.map((p) => `${p.l.split(" ")[0]}: ${p.x}`).join(" · ") : "No access";
};

const AdminStaff = () => {
    const { token } = useAdminAuth();
    const { toast } = useToast();
    const [members, setMembers] = useState<Member[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [form, setForm] = useState<{ id?: string; name: string; email: string; access: Record<string, Access> } | null>(null);
    const [saving, setSaving] = useState(false);
    const [secret, setSecret] = useState<{ email: string; password: string } | null>(null);
    const [toDelete, setToDelete] = useState<Member | null>(null);

    const api = useCallback(
        async (path: string, init?: RequestInit) => {
            const res = await fetch(`/api/admin/staff${path}`, {
                ...init,
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
            return data;
        },
        [token]
    );

    const load = useCallback(async () => {
        try {
            setMembers(await api(""));
            setError(null);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Could not load staff");
        } finally {
            setIsLoading(false);
        }
    }, [api]);

    useEffect(() => { if (token) load(); }, [token, load]);

    const fail = (e: unknown) =>
        toast({ title: "Error", description: e instanceof Error ? e.message : "Something went wrong", variant: "destructive" });

    const save = async () => {
        if (!form) return;
        setSaving(true);
        try {
            const permissions = toPermissions(form.access);
            if (form.id) {
                await api(`/${form.id}`, { method: "PATCH", body: JSON.stringify({ name: form.name, permissions }) });
                toast({ title: "Staff member updated" });
            } else {
                const data = await api("", { method: "POST", body: JSON.stringify({ name: form.name, email: form.email, permissions }) });
                setSecret({ email: data.staff.email, password: data.temporaryPassword });
            }
            setForm(null);
            load();
        } catch (e) {
            fail(e);
        } finally {
            setSaving(false);
        }
    };

    const toggleActive = async (m: Member) => {
        try {
            await api(`/${m.id}`, { method: "PATCH", body: JSON.stringify({ active: !m.active }) });
            load();
        } catch (e) { fail(e); }
    };

    const resetPassword = async (m: Member) => {
        try {
            const data = await api(`/${m.id}/reset-password`, { method: "POST" });
            setSecret({ email: m.email, password: data.temporaryPassword });
        } catch (e) { fail(e); }
    };

    const remove = async () => {
        if (!toDelete) return;
        try {
            await api(`/${toDelete.id}`, { method: "DELETE" });
            setToDelete(null);
            load();
        } catch (e) { fail(e); }
    };

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-heading font-bold">Staff</h1>
                        <p className="text-muted-foreground text-sm">Add staff and choose which areas they can view or manage.</p>
                    </div>
                    <Button onClick={() => setForm({ name: "", email: "", access: emptyAccess() })}>
                        <Plus className="w-4 h-4" /> Add staff
                    </Button>
                </div>

                {isLoading ? (
                    <div className="flex justify-center h-40 items-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                ) : error ? (
                    <div className="flex items-center gap-2 text-destructive"><AlertCircle className="w-4 h-4" />{error}</div>
                ) : (
                    <div className="bg-white rounded-xl border divide-y">
                        {members.map((m) => (
                            <div key={m.id} className="p-4 flex flex-wrap items-center gap-4">
                                <div className="flex-1 min-w-[220px]">
                                    <p className="font-medium">
                                        {m.name || m.email}
                                        {m.role === "admin" && <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Administrator</span>}
                                        {m.role === "staff" && !m.active && <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full">Deactivated</span>}
                                    </p>
                                    <p className="text-sm text-muted-foreground">{m.email}</p>
                                    <p className="text-xs text-muted-foreground mt-1">{m.role === "admin" ? "Full access" : summary(m.permissions)}</p>
                                </div>
                                {m.role === "staff" && (
                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" size="sm" onClick={() => setForm({ id: m.id, name: m.name ?? "", email: m.email, access: Object.fromEntries(AREAS.map(([a]) => [a, accessOf(m.permissions, a)])) })}>
                                            Permissions
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={() => resetPassword(m)}><KeyRound className="w-4 h-4" /> Reset password</Button>
                                        <Switch checked={m.active} onCheckedChange={() => toggleActive(m)} aria-label={m.active ? "Deactivate" : "Activate"} />
                                        <Button variant="ghost" size="icon" onClick={() => setToDelete(m)} aria-label="Delete"><Trash2 className="w-4 h-4 text-destructive" /></Button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{form?.id ? "Edit permissions" : "Add staff member"}</DialogTitle>
                        <DialogDescription>Changes to permissions apply immediately. Managing includes viewing.</DialogDescription>
                    </DialogHeader>
                    {form && (
                        <div className="space-y-4">
                            <div className="space-y-1.5"><Label htmlFor="sname">Name</Label>
                                <Input id="sname" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                            <div className="space-y-1.5"><Label htmlFor="semail">Email</Label>
                                <Input id="semail" type="email" value={form.email} disabled={!!form.id} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                            <AccessPicker value={form.access} onChange={(access) => setForm({ ...form, access })} />
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setForm(null)}>Cancel</Button>
                        <Button onClick={save} disabled={saving || !form?.name.trim() || !form?.email.trim()}>
                            {saving && <Loader2 className="w-4 h-4 animate-spin" />}{form?.id ? "Save" : "Create"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!secret} onOpenChange={(o) => !o && setSecret(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Temporary password</DialogTitle>
                        <DialogDescription>
                            Share this with {secret?.email} securely. It is shown only once; they should change it under Settings after signing in.
                            Sign-in also needs the code emailed to them.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex items-center gap-2">
                        <code className="flex-1 bg-gray-100 rounded px-3 py-2 font-mono text-sm break-all">{secret?.password}</code>
                        <Button variant="outline" size="icon" aria-label="Copy"
                            onClick={() => navigator.clipboard?.writeText(secret?.password ?? "").then(() => toast({ title: "Copied" }))}>
                            <Copy className="w-4 h-4" />
                        </Button>
                    </div>
                    <DialogFooter><Button onClick={() => setSecret(null)}>Done</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete {toDelete?.name || toDelete?.email}?</DialogTitle>
                        <DialogDescription>They lose access immediately. To keep the account but block sign-in, deactivate it instead.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setToDelete(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={remove}>Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
};

export default AdminStaff;
