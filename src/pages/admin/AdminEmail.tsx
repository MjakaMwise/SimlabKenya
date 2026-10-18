import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AlertCircle, Eye, Loader2, RefreshCw, RotateCcw, Send, Users } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface Group { id: string; label: string; count: number }
interface Batch { batchId: string; subject: string; createdAt: string; sentBy: string | null; total: number; sent: number; failed: number; queued: number }
interface BatchRecipient { id: string; toEmail: string; toName: string | null; status: "queued" | "sent" | "failed"; error: string | null }

const splitAddresses = (raw: string) =>
    [...new Set(raw.split(/[\s,;]+/).map((a) => a.trim().toLowerCase()).filter(Boolean))];

const AdminEmail = () => {
    const { token, user, can } = useAdminAuth();
    const { toast } = useToast();
    const [params] = useSearchParams();
    const canSend = can("email", "manage");

    const [groups, setGroups] = useState<Group[]>([]);
    const [batches, setBatches] = useState<Batch[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const [picked, setPicked] = useState<string[]>([]);
    const [addresses, setAddresses] = useState(params.get("to") ?? "");
    const [subject, setSubject] = useState("");
    const [body, setBody] = useState(params.get("name") ? `Dear ${params.get("name")},\n\n` : "Dear {{name}},\n\n");
    const [busy, setBusy] = useState(false);
    const [confirm, setConfirm] = useState<{ count: number; sample: string[] } | null>(null);
    const [previewHtml, setPreviewHtml] = useState<string | null>(null);
    const [detail, setDetail] = useState<{ batch: Batch; rows: BatchRecipient[] } | null>(null);

    const api = useCallback(
        async (path: string, init?: RequestInit) => {
            const res = await fetch(`/api/email${path}`, {
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
            const [g, l] = await Promise.all([api("/groups"), api("/log")]);
            setGroups(g.groups);
            setBatches(l.batches);
            setError(null);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Could not load email");
        } finally {
            setLoading(false);
        }
    }, [api]);

    useEffect(() => { if (token) load(); }, [token, load]);

    // While anything is still sending, keep the log fresh.
    const sending = batches.some((b) => b.queued > 0);
    useEffect(() => {
        if (!sending) return;
        const t = setInterval(load, 4000);
        return () => clearInterval(t);
    }, [sending, load]);

    const fail = (e: unknown) =>
        toast({ title: "Error", description: e instanceof Error ? e.message : "Something went wrong", variant: "destructive" });

    const typed = useMemo(() => splitAddresses(addresses), [addresses]);
    const selection = { groups: picked, addresses: typed };
    const ready = subject.trim().length >= 2 && body.trim().length >= 2 && (picked.length > 0 || typed.length > 0);

    const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

    const review = async () => {
        setBusy(true);
        try { setConfirm(await api("/count", { method: "POST", body: JSON.stringify(selection) })); }
        catch (e) { fail(e); }
        finally { setBusy(false); }
    };

    const post = async (payload: typeof selection, okTitle: string) => {
        setBusy(true);
        try {
            const r = await api("/send", { method: "POST", body: JSON.stringify({ subject, body, ...payload }) });
            toast({ title: okTitle, description: `${r.recipients} ${r.recipients === 1 ? "email" : "emails"} queued.` });
            setConfirm(null);
            await load();
        } catch (e) { fail(e); }
        finally { setBusy(false); }
    };

    const sendTest = () => user?.email && post({ groups: [], addresses: [user.email] }, "Test sent");

    const showPreview = async () => {
        try { setPreviewHtml((await api("/preview", { method: "POST", body: JSON.stringify({ subject, body }) })).html); }
        catch (e) { fail(e); }
    };

    const openBatch = async (b: Batch) => {
        try { setDetail({ batch: b, rows: (await api(`/log/${b.batchId}`)).recipients }); }
        catch (e) { fail(e); }
    };

    const retry = async (b: Batch) => {
        try {
            await api(`/log/${b.batchId}/retry`, { method: "POST" });
            setDetail(null);
            toast({ title: "Retrying failed emails" });
            await load();
        } catch (e) { fail(e); }
    };

    const when = (iso: string) => new Date(iso).toLocaleString("en-KE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

    if (loading) {
        return <AdminLayout><div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></AdminLayout>;
    }
    if (error) {
        return (
            <AdminLayout>
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                    <AlertCircle className="w-10 h-10 text-destructive" />
                    <p className="text-sm text-muted-foreground">{error}</p>
                    <Button variant="outline" onClick={load}><RefreshCw className="w-4 h-4" /> Retry</Button>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-heading font-bold text-gray-900">Email</h1>
                    <p className="text-muted-foreground">Send to one person or many. Everyone gets their own copy.</p>
                </div>

                {canSend && (
                    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                        <div className="bg-white border rounded-xl p-5 space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="addresses">Email addresses</Label>
                                <Textarea id="addresses" rows={2} placeholder="Type or paste addresses, separated by commas, spaces or new lines" value={addresses} onChange={(e) => setAddresses(e.target.value)} />
                                {typed.length > 0 && <p className="text-xs text-muted-foreground">{typed.length} {typed.length === 1 ? "address" : "addresses"}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="subject">Subject</Label>
                                <Input id="subject" maxLength={200} value={subject} onChange={(e) => setSubject(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="body">Message</Label>
                                <Textarea id="body" rows={12} value={body} onChange={(e) => setBody(e.target.value)} />
                                <p className="text-xs text-muted-foreground">
                                    Use <code>{"{{name}}"}</code> for the person's name and <code>{"{{participant}}"}</code> for the participant, school or project when the list has one.
                                    Leave a blank line between paragraphs.
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Button variant="outline" onClick={showPreview} disabled={subject.trim().length < 2 || body.trim().length < 2}><Eye className="w-4 h-4" /> Preview</Button>
                                <Button variant="outline" onClick={sendTest} disabled={busy || !ready && (subject.trim().length < 2 || body.trim().length < 2)}>Send test to me</Button>
                                <Button onClick={review} disabled={!ready || busy} className="ml-auto"><Send className="w-4 h-4" /> Review and send</Button>
                            </div>
                        </div>

                        <div className="bg-white border rounded-xl p-5 space-y-3 self-start">
                            <h2 className="font-heading font-semibold flex items-center gap-2"><Users className="w-4 h-4" /> Add a group</h2>
                            <p className="text-xs text-muted-foreground">People are counted once, even if they are in several groups or typed above.</p>
                            {groups.map((g) => (
                                <label key={g.id} className="flex items-center gap-3 text-sm cursor-pointer">
                                    <Checkbox checked={picked.includes(g.id)} onCheckedChange={() => toggle(g.id)} />
                                    <span className="flex-1">{g.label}</span>
                                    <span className="text-muted-foreground tabular-nums">{g.count}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}

                <div className="bg-white border rounded-xl">
                    <div className="flex items-center justify-between p-4 border-b">
                        <h2 className="font-heading font-semibold">Send log</h2>
                        <Button variant="ghost" size="sm" onClick={load}><RefreshCw className="w-4 h-4" /> Refresh</Button>
                    </div>
                    {batches.length === 0 && <p className="p-8 text-center text-muted-foreground">Nothing sent yet.</p>}
                    <div className="divide-y">
                        {batches.map((b) => (
                            <button key={b.batchId} onClick={() => openBatch(b)} className="w-full text-left p-4 hover:bg-gray-50 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">{b.subject}</p>
                                    <p className="text-xs text-muted-foreground">{when(b.createdAt)} · {b.sentBy ?? "Unknown"}</p>
                                </div>
                                <p className="text-sm tabular-nums">
                                    <span className="text-green-700">{b.sent} sent</span>
                                    {b.queued > 0 && <span className="text-amber-600"> · {b.queued} sending</span>}
                                    {b.failed > 0 && <span className="text-red-600"> · {b.failed} failed</span>}
                                    <span className="text-muted-foreground"> of {b.total}</span>
                                </p>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Send to {confirm?.count} {confirm?.count === 1 ? "person" : "people"}?</DialogTitle>
                        <DialogDescription>
                            Subject: {subject}. {confirm && confirm.count > 1 && "Each person receives their own email and cannot see the others."}
                            {confirm && confirm.count > 0 && ` Starting with ${confirm.sample.join(", ")}${confirm.count > confirm.sample.length ? "…" : ""}.`}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConfirm(null)}>Cancel</Button>
                        <Button disabled={busy || !confirm?.count} onClick={() => post(selection, "Sending")}>
                            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send now
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={previewHtml !== null} onOpenChange={(o) => !o && setPreviewHtml(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Preview</DialogTitle>
                        <DialogDescription>Shown for a sample recipient named Amina.</DialogDescription>
                    </DialogHeader>
                    <iframe title="Email preview" sandbox="" srcDoc={previewHtml ?? ""} className="w-full h-[60vh] border rounded-md bg-white" />
                </DialogContent>
            </Dialog>

            <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle className="truncate">{detail?.batch.subject}</DialogTitle>
                        <DialogDescription>{detail && `${detail.batch.sent} sent, ${detail.batch.failed} failed, ${detail.batch.queued} sending`}</DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[50vh] overflow-y-auto divide-y border rounded-md text-sm">
                        {detail?.rows.map((r) => (
                            <div key={r.id} className="p-2.5 flex items-start gap-3">
                                <div className="flex-1 min-w-0">
                                    <p className="truncate">{r.toName ? `${r.toName} · ` : ""}{r.toEmail}</p>
                                    {r.error && <p className="text-xs text-red-600">{r.error}</p>}
                                </div>
                                <span className={`text-xs font-medium ${r.status === "sent" ? "text-green-700" : r.status === "failed" ? "text-red-600" : "text-amber-600"}`}>{r.status}</span>
                            </div>
                        ))}
                    </div>
                    {canSend && detail && detail.batch.failed > 0 && (
                        <DialogFooter>
                            <Button onClick={() => retry(detail.batch)}><RotateCcw className="w-4 h-4" /> Retry {detail.batch.failed} failed</Button>
                        </DialogFooter>
                    )}
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
};

export default AdminEmail;
