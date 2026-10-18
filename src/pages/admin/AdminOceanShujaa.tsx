import { useEffect, useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search, Loader2, AlertCircle, RefreshCw, Download, Trash2, Save, MessageCircle, Mail } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Registration {
    id: string;
    participantName: string;
    participantAge: number | null;
    level: string;
    institution: string;
    guardianName: string;
    guardianPhone: string;
    guardianEmail: string;
    groupSize: number;
    notes: string | null;
    status: string;
    adminNotes: string | null;
    createdAt: string;
}

const STATUSES = ["pending", "confirmed", "waitlisted", "cancelled"];
const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    confirmed: "bg-green-100 text-green-800",
    waitlisted: "bg-blue-100 text-blue-800",
    cancelled: "bg-red-100 text-red-800",
};
const levelLabel = (l: string) => l.replace(/_/g, " ");
const BASE = "/api/ocean-shujaa/admin";

const AdminOceanShujaa = () => {
    const { token, can } = useAdminAuth();
    const canManage = can("ocean", "manage");
    const [rows, setRows] = useState<Registration[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [expanded, setExpanded] = useState<string | null>(null);
    const [noteDraft, setNoteDraft] = useState("");
    const [busyId, setBusyId] = useState<string | null>(null);

    const headers = useMemo(() => ({ Authorization: `Bearer ${token}`, "Content-Type": "application/json" }), [token]);

    const load = useCallback(async () => {
        if (!token) {
            setFetchError("Not authenticated — please log in again.");
            setIsLoading(false);
            return;
        }
        setFetchError(null);
        setIsLoading(true);
        try {
            const res = await fetch(`${BASE}/registrations`, { headers });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || `Error ${res.status}`);
            }
            setRows((await res.json()).registrations);
        } catch (e) {
            setFetchError(e instanceof Error ? e.message : "Failed to load registrations");
        } finally {
            setIsLoading(false);
        }
    }, [token, headers]);

    useEffect(() => { load(); }, [load]);

    const patch = async (id: string, body: { status?: string; adminNotes?: string | null }) => {
        setBusyId(id);
        try {
            const res = await fetch(`${BASE}/registrations/${id}`, { method: "PATCH", headers, body: JSON.stringify(body) });
            if (!res.ok) throw new Error();
            const { registration } = await res.json();
            setRows((r) => r.map((x) => (x.id === id ? registration : x)));
        } catch {
            alert("Update failed. Please try again.");
        } finally {
            setBusyId(null);
        }
    };

    const remove = async (r: Registration) => {
        if (!confirm(`Delete the registration for ${r.participantName}? This cannot be undone.`)) return;
        setBusyId(r.id);
        try {
            const res = await fetch(`${BASE}/registrations/${r.id}`, { method: "DELETE", headers });
            if (!res.ok) throw new Error();
            setRows((x) => x.filter((y) => y.id !== r.id));
        } catch {
            alert("Delete failed. Please try again.");
        } finally {
            setBusyId(null);
        }
    };

    const exportCsv = async () => {
        const res = await fetch(`${BASE}/export.csv`, { headers });
        if (!res.ok) return alert("Export failed.");
        const url = URL.createObjectURL(await res.blob());
        const a = document.createElement("a");
        a.href = url;
        a.download = "ocean-shujaa-registrations.csv";
        a.click();
        URL.revokeObjectURL(url);
    };

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return rows.filter((r) =>
            (statusFilter === "all" || r.status === statusFilter) &&
            (!q || [r.participantName, r.institution, r.guardianName, r.guardianEmail, r.guardianPhone]
                .some((f) => f.toLowerCase().includes(q)))
        );
    }, [rows, search, statusFilter]);

    const counts = useMemo(() => {
        const c: Record<string, number> = Object.fromEntries(STATUSES.map((s) => [s, 0]));
        let participants = 0;
        for (const r of rows) {
            c[r.status] = (c[r.status] ?? 0) + 1;
            if (r.status !== "cancelled") participants += r.groupSize;
        }
        return { c, participants };
    }, [rows]);

    const fmt = (d: string) => new Date(d).toLocaleDateString("en-KE", { year: "numeric", month: "short", day: "numeric" });

    if (isLoading) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            </AdminLayout>
        );
    }

    if (fetchError) {
        return (
            <AdminLayout>
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                    <AlertCircle className="w-10 h-10 text-destructive" />
                    <p className="text-sm text-muted-foreground">{fetchError}</p>
                    <Button variant="outline" onClick={load}><RefreshCw className="w-4 h-4" /> Retry</Button>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-heading font-bold text-gray-900">Ocean Shujaa Registrations</h1>
                        <p className="text-muted-foreground">
                            {rows.length} registrations · {counts.participants} active participants
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={load}><RefreshCw className="w-4 h-4" /> Refresh</Button>
                        <Button onClick={exportCsv}><Download className="w-4 h-4" /> Export CSV</Button>
                    </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {STATUSES.map((s) => (
                        <div key={s} className="bg-white border rounded-xl p-4">
                            <p className="text-sm text-muted-foreground capitalize">{s}</p>
                            <p className="text-2xl font-bold">{counts.c[s] ?? 0}</p>
                        </div>
                    ))}
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm border flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input placeholder="Search name, school, guardian, email, phone..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Status" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>

                <div className="bg-white rounded-xl shadow-sm border divide-y">
                    {filtered.length === 0 && <p className="p-8 text-center text-muted-foreground">No registrations found.</p>}
                    {filtered.map((r) => {
                        const open = expanded === r.id;
                        return (
                            <div key={r.id} className="p-4">
                                <div
                                    className="flex flex-col sm:flex-row sm:items-center gap-3 cursor-pointer"
                                    onClick={() => { setExpanded(open ? null : r.id); setNoteDraft(r.adminNotes ?? ""); }}
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900 truncate">
                                            {r.participantName}{r.groupSize > 1 && <span className="text-muted-foreground"> (+{r.groupSize - 1})</span>}
                                        </p>
                                        <p className="text-sm text-muted-foreground truncate">
                                            {r.institution} · <span className="capitalize">{levelLabel(r.level)}</span> · {fmt(r.createdAt)}
                                        </p>
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize self-start ${statusColors[r.status]}`}>{r.status}</span>
                                </div>

                                {open && (
                                    <div className="mt-4 grid gap-4 md:grid-cols-2 text-sm">
                                        <div className="space-y-1">
                                            <p><span className="text-muted-foreground">Guardian:</span> {r.guardianName}</p>
                                            <p><span className="text-muted-foreground">Phone:</span> <a className="text-primary" href={`tel:${r.guardianPhone}`}>{r.guardianPhone}</a></p>
                                            <p><span className="text-muted-foreground">Email:</span> <a className="text-primary" href={`mailto:${r.guardianEmail}`}>{r.guardianEmail}</a></p>
                                            {r.participantAge != null && <p><span className="text-muted-foreground">Age:</span> {r.participantAge}</p>}
                                            <p><span className="text-muted-foreground">Participants:</span> {r.groupSize}</p>
                                            {r.notes && <p><span className="text-muted-foreground">Their note:</span> {r.notes}</p>}
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex flex-wrap gap-2">
                                                <Button size="sm" variant="outline" asChild>
                                                    <Link to={`/admin/whatsapp?phone=${encodeURIComponent(r.guardianPhone)}&name=${encodeURIComponent(r.guardianName)}`}><MessageCircle className="w-4 h-4" /> WhatsApp guardian</Link>
                                                </Button>
                                                <Button size="sm" variant="outline" asChild>
                                                    <Link to={`/admin/email?to=${encodeURIComponent(r.guardianEmail)}&name=${encodeURIComponent(r.guardianName)}`}><Mail className="w-4 h-4" /> Email guardian</Link>
                                                </Button>
                                            </div>
                                            <Select value={r.status} onValueChange={(v) => patch(r.id, { status: v })} disabled={busyId === r.id || !canManage}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                            <textarea
                                                className="w-full border rounded-md p-2 text-sm min-h-[80px]"
                                                placeholder="Admin notes (private)"
                                                disabled={!canManage}
                                                maxLength={2000}
                                                value={noteDraft}
                                                onChange={(e) => setNoteDraft(e.target.value)}
                                            />
                                            {canManage && <div className="flex gap-2">
                                                <Button size="sm" disabled={busyId === r.id} onClick={() => patch(r.id, { adminNotes: noteDraft })}>
                                                    <Save className="w-4 h-4" /> Save notes
                                                </Button>
                                                <Button size="sm" variant="destructive" disabled={busyId === r.id} onClick={() => remove(r)}>
                                                    <Trash2 className="w-4 h-4" /> Delete
                                                </Button>
                                            </div>}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </AdminLayout>
    );
};

export default AdminOceanShujaa;
