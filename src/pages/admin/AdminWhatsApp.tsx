import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Bot, CheckCircle2, Loader2, MessageCircle, RotateCcw, Search, Send, Settings2, UserRound } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Conversation {
    id: string; phone: string; name: string | null; status: "open" | "resolved";
    assignedTo: string | null; assignedName: string | null; botActive: boolean; needsHuman: boolean;
    unread: number; lastMessageAt: string; lastMessagePreview: string | null;
}
interface Msg {
    id: string; direction: "in" | "out"; sender: "client" | "bot" | "staff"; body: string;
    status: "sending" | "sent" | "failed"; error: string | null; createdAt: string; staffName: string | null;
}
interface Status { online: boolean; connected: boolean; ready: boolean; state: string | null }

const FILTERS: [string, string][] = [["all", "All"], ["human", "Needs a person"], ["mine", "Mine"], ["open", "Open"], ["resolved", "Resolved"]];

const clock = (iso: string) => {
    const d = new Date(iso);
    const today = new Date().toDateString() === d.toDateString();
    return today
        ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : d.toLocaleDateString([], { day: "numeric", month: "short" }) + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};
const label = (c: Pick<Conversation, "name" | "phone">) => c.name || `+${c.phone}`;

const AdminWhatsApp = () => {
    const { token, can, isFullAdmin } = useAdminAuth();
    const canManage = can("whatsapp", "manage");
    const [params, setParams] = useSearchParams();
    const [convs, setConvs] = useState<Conversation[]>([]);
    const [members, setMembers] = useState<{ id: string; name: string }[]>([]);
    const [status, setStatus] = useState<Status | null>(null);
    const [filter, setFilter] = useState("all");
    const [search, setSearch] = useState("");
    const [messages, setMessages] = useState<Msg[]>([]);
    const [text, setText] = useState("");
    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");
    const feedRef = useRef<HTMLDivElement>(null);

    const activeId = params.get("c");
    const active = convs.find((c) => c.id === activeId) ?? null;

    const api = useCallback(
        async (path: string, init?: RequestInit) => {
            const res = await fetch(`/api/whatsapp${path}`, {
                ...init,
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
            return data;
        },
        [token]
    );

    const loadList = useCallback(async () => {
        const q = new URLSearchParams({ status: filter, q: search.trim() });
        const d = await api(`/conversations?${q}`);
        setConvs(d.conversations);
    }, [api, filter, search]);

    // A phone number in the address (from an Ocean Shujaa registration) opens or creates that chat.
    useEffect(() => {
        const phone = params.get("phone");
        if (!phone || !token || !canManage) return;
        api("/conversations", { method: "POST", body: JSON.stringify({ phone, name: params.get("name") || undefined }) })
            .then((d) => setParams({ c: d.id }, { replace: true }))
            .catch((e) => { setError(e.message); setParams({}, { replace: true }); });
    }, [params, token, canManage, api, setParams]);

    useEffect(() => {
        if (!token) return;
        const t = setTimeout(() => loadList().catch((e) => setError(e.message)), search ? 250 : 0);
        const i = setInterval(() => { if (!document.hidden) loadList().catch(() => undefined); }, 5000);
        return () => { clearTimeout(t); clearInterval(i); };
    }, [token, loadList, search]);

    useEffect(() => {
        if (!token) return;
        api("/members").then((d) => setMembers(d.members)).catch(() => undefined);
        const poll = () => api("/status").then(setStatus).catch(() => undefined);
        poll();
        const i = setInterval(poll, 20000);
        return () => clearInterval(i);
    }, [token, api]);

    // Open chat: load history, mark read, then poll for new messages.
    useEffect(() => {
        if (!activeId || !token) { setMessages([]); return; }
        let cancelled = false;
        setMessages([]); setError("");
        api(`/conversations/${activeId}/messages`)
            .then((d) => { if (!cancelled) { setMessages(d.messages); api(`/conversations/${activeId}/read`, { method: "POST" }).then(loadList).catch(() => undefined); } })
            .catch((e) => !cancelled && setError(e.message));
        const i = setInterval(async () => {
            if (document.hidden) return;
            try {
                const d = await api(`/conversations/${activeId}/messages`);
                if (cancelled) return;
                setMessages((cur) => (d.messages.length !== cur.length || d.messages.at(-1)?.id !== cur.at(-1)?.id ? d.messages : cur));
                if (d.messages.some((m: Msg) => m.direction === "in")) api(`/conversations/${activeId}/read`, { method: "POST" }).catch(() => undefined);
            } catch { /* next tick */ }
        }, 4000);
        return () => { cancelled = true; clearInterval(i); };
    }, [activeId, token, api, loadList]);

    useEffect(() => {
        const el = feedRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [messages.length, activeId]);

    const patch = async (body: Record<string, unknown>) => {
        if (!active) return;
        try {
            const d = await api(`/conversations/${active.id}`, { method: "PATCH", body: JSON.stringify(body) });
            setConvs((list) => list.map((c) => (c.id === active.id ? d.conversation : c)));
            setError("");
        } catch (e) { setError(e instanceof Error ? e.message : "Could not update"); }
    };

    const send = async (e: FormEvent) => {
        e.preventDefault();
        const body = text.trim();
        if (!body || !active || sending) return;
        setSending(true); setError("");
        try {
            const d = await api(`/conversations/${active.id}/messages`, { method: "POST", body: JSON.stringify({ body }) });
            setMessages((m) => [...m, d.message]);
            setText("");
            loadList().catch(() => undefined);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not send");
        } finally { setSending(false); }
    };

    const notReady = status && !status.ready;

    return (
        <AdminLayout>
            <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-heading font-bold text-gray-900">WhatsApp</h1>
                        <p className="text-muted-foreground text-sm">Client chats. The menu bot answers first; a person takes over when asked.</p>
                    </div>
                    {isFullAdmin && (
                        <Button variant="outline" size="sm" asChild><Link to="/admin/whatsapp/setup"><Settings2 className="w-4 h-4" /> Setup</Link></Button>
                    )}
                </div>

                {notReady && (
                    <div className="rounded-lg border border-amber-300 bg-amber-50 text-amber-900 text-sm p-3">
                        WhatsApp is not connected ({status?.state ?? "offline"}). You can read past chats, but replies will not be delivered.
                        {isFullAdmin ? " Open Setup to link the number." : " Ask an administrator to link the number."}
                    </div>
                )}

                <div className="bg-white border rounded-xl overflow-hidden grid lg:grid-cols-[340px_minmax(0,1fr)] h-[calc(100vh-15rem)] min-h-[480px]">
                    {/* Conversation list */}
                    <div className={`${activeId ? "hidden lg:flex" : "flex"} flex-col border-r min-h-0`}>
                        <div className="p-3 space-y-2 border-b">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input placeholder="Search name or number" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
                            </div>
                            <div className="flex gap-1 overflow-x-auto">
                                {FILTERS.map(([id, name]) => (
                                    <button key={id} onClick={() => setFilter(id)} className={`px-2.5 py-1 rounded-full text-xs whitespace-nowrap ${filter === id ? "bg-primary text-primary-foreground" : "bg-gray-100 text-gray-700"}`}>{name}</button>
                                ))}
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto divide-y">
                            {convs.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No conversations here yet.</p>}
                            {convs.map((c) => (
                                <button key={c.id} onClick={() => setParams({ c: c.id })} className={`w-full text-left p-3 flex gap-3 hover:bg-gray-50 ${c.id === activeId ? "bg-gray-100" : ""}`}>
                                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 grid place-items-center shrink-0"><UserRound className="w-5 h-5" /></div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium truncate flex-1">{label(c)}</p>
                                            <span className="text-[11px] text-muted-foreground shrink-0">{clock(c.lastMessageAt)}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm text-muted-foreground truncate flex-1">{c.lastMessagePreview}</p>
                                            {c.unread > 0 && <span className="min-w-5 h-5 px-1.5 rounded-full bg-emerald-600 text-white text-[11px] font-bold grid place-items-center">{c.unread}</span>}
                                        </div>
                                        <div className="flex gap-1.5 mt-1">
                                            {c.needsHuman && <span className="text-[10px] px-1.5 rounded bg-amber-100 text-amber-800">needs a person</span>}
                                            {c.status === "resolved" && <span className="text-[10px] px-1.5 rounded bg-gray-100 text-gray-600">resolved</span>}
                                            {c.assignedName && <span className="text-[10px] px-1.5 rounded bg-blue-50 text-blue-700 truncate">{c.assignedName}</span>}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Chat pane */}
                    <div className={`${activeId ? "flex" : "hidden lg:flex"} flex-col min-h-0 min-w-0`}>
                        {!active ? (
                            <div className="flex-1 grid place-items-center text-muted-foreground text-sm p-6 text-center">
                                <div><MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-40" />Pick a conversation to read and reply.</div>
                            </div>
                        ) : (
                            <>
                                <div className="p-3 border-b flex flex-wrap items-center gap-2">
                                    <button className="lg:hidden p-1" onClick={() => setParams({})} aria-label="Back to chats"><ArrowLeft className="w-5 h-5" /></button>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-medium truncate">{label(active)}</p>
                                        <p className="text-xs text-muted-foreground">+{active.phone}</p>
                                    </div>
                                    {canManage && (
                                        <>
                                            <Select value={active.assignedTo ?? "none"} onValueChange={(v) => patch({ assignedTo: v === "none" ? null : v })}>
                                                <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="Assign" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">Unassigned</SelectItem>
                                                    {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                            {active.botActive
                                                ? <span className="text-xs inline-flex items-center gap-1 text-emerald-700"><Bot className="w-4 h-4" /> Bot on</span>
                                                : <Button size="sm" variant="outline" onClick={() => patch({ botActive: true })}><Bot className="w-4 h-4" /> Hand back to bot</Button>}
                                            {active.status === "open"
                                                ? <Button size="sm" variant="outline" onClick={() => patch({ status: "resolved" })}><CheckCircle2 className="w-4 h-4" /> Resolve</Button>
                                                : <Button size="sm" variant="outline" onClick={() => patch({ status: "open" })}><RotateCcw className="w-4 h-4" /> Reopen</Button>}
                                        </>
                                    )}
                                </div>

                                <div ref={feedRef} className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50">
                                    {messages.map((m) => (
                                        <div key={m.id} className={`flex ${m.direction === "out" ? "justify-end" : "justify-start"}`}>
                                            <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap break-words ${m.direction === "out" ? (m.sender === "bot" ? "bg-sky-50 border border-sky-100" : "bg-emerald-100") : "bg-white border"}`}>
                                                {m.direction === "out" && <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">{m.sender === "bot" ? "Bot" : m.staffName ?? "Staff"}</p>}
                                                {m.body}
                                                <p className="text-[10px] text-muted-foreground mt-1 text-right">
                                                    {clock(m.createdAt)}{m.status === "failed" && <span className="text-red-600"> · not delivered{m.error ? `: ${m.error}` : ""}</span>}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {error && <p className="px-3 pt-2 text-xs text-red-600">{error}</p>}
                                {canManage ? (
                                    <form onSubmit={send} className="p-3 border-t flex gap-2">
                                        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a reply" maxLength={4000} aria-label="Reply" />
                                        <Button type="submit" disabled={sending || !text.trim()}>{sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}<span className="sr-only sm:not-sr-only">Send</span></Button>
                                    </form>
                                ) : (
                                    <p className="p-3 border-t text-xs text-muted-foreground text-center">You can read this chat. Ask an administrator for reply access.</p>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
};

export default AdminWhatsApp;
