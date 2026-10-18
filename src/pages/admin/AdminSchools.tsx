import { useEffect, useState, useCallback, useMemo } from "react";
import { Search, Loader2, AlertCircle, RefreshCw, Download, Trash2, Save } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SchoolRow {
    id: string;
    name: string;
    schoolType: string;
    county: string;
    adminName: string;
    adminEmail: string;
    adminPhone: string;
    status: string;
    adminNotes: string | null;
    studentCount: number;
    createdAt: string;
}

interface Student {
    id: string;
    name: string;
    age: number | null;
    grade: string | null;
    level: string;
    guardianName: string | null;
    guardianPhone: string | null;
}

const STATUSES = ["pending", "confirmed", "waitlisted", "cancelled"];
const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    confirmed: "bg-green-100 text-green-800",
    waitlisted: "bg-blue-100 text-blue-800",
    cancelled: "bg-red-100 text-red-800",
};
const label = (v: string) => v.replace(/_/g, " ");
const BASE = "/api/schools/admin";

const AdminSchools = () => {
    const { token } = useAdminAuth();
    const [rows, setRows] = useState<SchoolRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [expanded, setExpanded] = useState<string | null>(null);
    const [students, setStudents] = useState<Student[] | null>(null);
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
            const res = await fetch(`${BASE}/list`, { headers });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || `Error ${res.status}`);
            }
            setRows((await res.json()).schools);
        } catch (e) {
            setFetchError(e instanceof Error ? e.message : "Failed to load schools");
        } finally {
            setIsLoading(false);
        }
    }, [token, headers]);

    useEffect(() => { load(); }, [load]);

    const open = async (s: SchoolRow) => {
        if (expanded === s.id) return setExpanded(null);
        setExpanded(s.id);
        setNoteDraft(s.adminNotes ?? "");
        setStudents(null);
        try {
            const res = await fetch(`${BASE}/${s.id}/students`, { headers });
            if (!res.ok) throw new Error();
            setStudents((await res.json()).students);
        } catch {
            setStudents([]);
        }
    };

    const patch = async (id: string, body: { status?: string; adminNotes?: string | null }) => {
        setBusyId(id);
        try {
            const res = await fetch(`${BASE}/${id}`, { method: "PATCH", headers, body: JSON.stringify(body) });
            if (!res.ok) throw new Error();
            const { school } = await res.json();
            setRows((r) => r.map((x) => (x.id === id ? { ...x, ...school } : x)));
        } catch {
            alert("Update failed. Please try again.");
        } finally {
            setBusyId(null);
        }
    };

    const remove = async (s: SchoolRow) => {
        if (!confirm(`Delete ${s.name} and all ${s.studentCount} of its students? This cannot be undone.`)) return;
        setBusyId(s.id);
        try {
            const res = await fetch(`${BASE}/${s.id}`, { method: "DELETE", headers });
            if (!res.ok) throw new Error();
            setRows((x) => x.filter((y) => y.id !== s.id));
            setExpanded(null);
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
        a.download = "ocean-shujaa-schools.csv";
        a.click();
        URL.revokeObjectURL(url);
    };

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return rows.filter((r) =>
            (statusFilter === "all" || r.status === statusFilter) &&
            (!q || [r.name, r.county, r.adminName, r.adminEmail, r.adminPhone].some((f) => f.toLowerCase().includes(q)))
        );
    }, [rows, search, statusFilter]);

    const totalStudents = useMemo(() => rows.filter((r) => r.status !== "cancelled").reduce((n, r) => n + r.studentCount, 0), [rows]);
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
                        <h1 className="text-2xl font-heading font-bold text-gray-900">School Registrations</h1>
                        <p className="text-muted-foreground">{rows.length} schools · {totalStudents} students on active schools</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={load}><RefreshCw className="w-4 h-4" /> Refresh</Button>
                        <Button onClick={exportCsv}><Download className="w-4 h-4" /> Export CSV</Button>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm border flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input placeholder="Search school, county, administrator, email, phone..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
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
                    {filtered.length === 0 && <p className="p-8 text-center text-muted-foreground">No schools found.</p>}
                    {filtered.map((s) => (
                        <div key={s.id} className="p-4">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3 cursor-pointer" onClick={() => open(s)}>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-900 truncate">{s.name}</p>
                                    <p className="text-sm text-muted-foreground truncate">
                                        {s.county} · <span className="capitalize">{label(s.schoolType)}</span> · {s.studentCount} students · {fmt(s.createdAt)}
                                    </p>
                                </div>
                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize self-start ${statusColors[s.status]}`}>{s.status}</span>
                            </div>

                            {expanded === s.id && (
                                <div className="mt-4 grid gap-4 md:grid-cols-2 text-sm">
                                    <div className="space-y-3">
                                        <div className="space-y-1">
                                            <p><span className="text-muted-foreground">Administrator:</span> {s.adminName}</p>
                                            <p><span className="text-muted-foreground">Phone:</span> <a className="text-primary" href={`tel:${s.adminPhone}`}>{s.adminPhone}</a></p>
                                            <p><span className="text-muted-foreground">Email:</span> <a className="text-primary" href={`mailto:${s.adminEmail}`}>{s.adminEmail}</a></p>
                                        </div>
                                        <div>
                                            <p className="font-medium mb-1">Students</p>
                                            {students === null && <Loader2 className="w-4 h-4 animate-spin" />}
                                            {students?.length === 0 && <p className="text-muted-foreground">No students added yet.</p>}
                                            {!!students?.length && (
                                                <ul className="max-h-56 overflow-auto divide-y border rounded-md">
                                                    {students.map((st) => (
                                                        <li key={st.id} className="px-3 py-1.5">
                                                            {st.name}
                                                            <span className="text-muted-foreground"> · {[label(st.level), st.grade, st.age != null && `${st.age} yrs`].filter(Boolean).join(" · ")}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <Select value={s.status} onValueChange={(v) => patch(s.id, { status: v })} disabled={busyId === s.id}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {STATUSES.map((x) => <SelectItem key={x} value={x} className="capitalize">{x}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <textarea
                                            className="w-full border rounded-md p-2 text-sm min-h-[80px]"
                                            placeholder="Admin notes (private)"
                                            maxLength={2000}
                                            value={noteDraft}
                                            onChange={(e) => setNoteDraft(e.target.value)}
                                        />
                                        <div className="flex gap-2">
                                            <Button size="sm" disabled={busyId === s.id} onClick={() => patch(s.id, { adminNotes: noteDraft })}>
                                                <Save className="w-4 h-4" /> Save notes
                                            </Button>
                                            <Button size="sm" variant="destructive" disabled={busyId === s.id} onClick={() => remove(s)}>
                                                <Trash2 className="w-4 h-4" /> Delete
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </AdminLayout>
    );
};

export default AdminSchools;
