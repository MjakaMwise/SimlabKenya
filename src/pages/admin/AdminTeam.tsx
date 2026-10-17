import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Bell, BellOff, CheckCircle2, ChevronDown, Circle, Download, Hash, ListTodo, Lock, Send, UserPlus } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useInstallPrompt, usePush } from "@/lib/pwa";

interface ChannelInfo { id: string; name: string; description: string; restricted: boolean; unread: number; mentions: number }
interface Member { id: string; name: string; role: string }
interface Msg {
    id: string; channel: string; body: string; mentions: string[]; isEvent: boolean; createdAt: string;
    authorId: string | null; authorName: string | null; refType: string | null; refLabel: string | null;
    taskId: string | null; taskStatus: "open" | "done" | null; taskAssigneeName: string | null;
}
interface Task {
    id: string; channel: string; title: string; status: "open" | "done"; dueDate: string | null;
    assigneeId: string; assigneeName: string; createdByName: string | null;
}

const REF_LINK: Record<string, (id: string) => string> = {
    order: () => `/admin/orders`,
    abstract: (id) => `/admin/abstracts/${id}`,
    registration: () => `/admin/ocean-shujaa`,
};

const clock = (iso: string) => {
    const d = new Date(iso);
    const today = new Date().toDateString() === d.toDateString();
    return today
        ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : d.toLocaleDateString([], { day: "numeric", month: "short" }) + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};
const dueLabel = (due: string | null, done: boolean) => {
    if (!due) return null;
    const late = !done && due < new Date().toISOString().slice(0, 10);
    return { text: new Date(due + "T00:00").toLocaleDateString([], { day: "numeric", month: "short" }), late };
};

const AdminTeam = () => {
    const { token, user } = useAdminAuth();
    const [params, setParams] = useSearchParams();
    const [channels, setChannels] = useState<ChannelInfo[]>([]);
    const [openTasks, setOpenTasks] = useState(0);
    const [members, setMembers] = useState<Member[]>([]);
    const [messages, setMessages] = useState<Msg[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [text, setText] = useState("");
    const [picked, setPicked] = useState<Member[]>([]);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");
    const [sideOpen, setSideOpen] = useState(false);
    const [taskFor, setTaskFor] = useState<{ title: string; messageId: string | null } | null>(null);
    const [mention, setMention] = useState<{ q: string; start: number } | null>(null);
    const feedRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const stick = useRef(true);
    const push = usePush(token);
    const { canInstall, install } = useInstallPrompt();

    const channelId = params.get("channel") || "general";
    const tab = params.get("tab") === "tasks" ? "tasks" : "chat";
    const current = channels.find((c) => c.id === channelId);

    const api = useCallback(
        async (path: string, init?: RequestInit) => {
            const res = await fetch(`/api/chat${path}`, {
                ...init,
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(init?.headers || {}) },
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
            return data;
        },
        [token]
    );

    const loadChannels = useCallback(async () => {
        const d = await api("/channels");
        setChannels(d.channels);
        setOpenTasks(d.openTasks);
    }, [api]);

    const loadTasks = useCallback(
        () => api(`/tasks?scope=channel&channel=${channelId}`).then(setTasks).catch(() => undefined),
        [api, channelId]
    );

    useEffect(() => {
        loadChannels().catch(() => undefined);
        const t = setInterval(() => loadChannels().catch(() => undefined), 15000);
        return () => clearInterval(t);
    }, [loadChannels]);

    // Switching channel loads its history, people and tasks, then marks it read.
    useEffect(() => {
        let cancelled = false;
        setMessages([]); setTasks([]); setMembers([]); setPicked([]); setError("");
        stick.current = true;
        Promise.all([api(`/channels/${channelId}/messages`), api(`/channels/${channelId}/members`)])
            .then(([m, p]) => {
                if (cancelled) return;
                setMessages(m); setMembers(p);
                api(`/channels/${channelId}/read`, { method: "POST" }).then(loadChannels).catch(() => undefined);
            })
            .catch((e) => !cancelled && setError(e.message));
        loadTasks();
        return () => { cancelled = true; };
    }, [channelId, api, loadChannels, loadTasks]);

    // New messages arrive by polling every 4 seconds while the page is open.
    useEffect(() => {
        const t = setInterval(async () => {
            if (document.hidden) return;
            try {
                setMessages((cur) => {
                    const last = cur[cur.length - 1]?.createdAt;
                    if (!last) return cur;
                    api(`/channels/${channelId}/messages?after=${encodeURIComponent(last)}`).then((fresh: Msg[]) => {
                        if (!fresh.length) return;
                        setMessages((m) => [...m, ...fresh.filter((f) => !m.some((x) => x.id === f.id))]);
                        api(`/channels/${channelId}/read`, { method: "POST" }).then(loadChannels).catch(() => undefined);
                        if (fresh.some((f) => f.taskId)) loadTasks();
                    }).catch(() => undefined);
                    return cur;
                });
            } catch { /* try again on the next tick */ }
        }, 4000);
        return () => clearInterval(t);
    }, [api, channelId, loadChannels, loadTasks]);

    useEffect(() => {
        const el = feedRef.current;
        if (el && stick.current) el.scrollTop = el.scrollHeight;
    }, [messages, tab]);

    const go = (id: string, nextTab?: string) => { setSideOpen(false); setParams(nextTab === "tasks" ? { channel: id, tab: "tasks" } : { channel: id }); };
    const otherUnread = channels.filter((c) => c.id !== channelId).reduce((n, c) => n + c.unread, 0);

    // @mention suggestions: watch for "@word" right before the cursor.
    const onType = (value: string, cursor: number | null) => {
        setText(value);
        const upTo = value.slice(0, cursor ?? value.length);
        const m = /(^|\s)@([\w.-]*)$/.exec(upTo);
        setMention(m ? { q: m[2].toLowerCase(), start: upTo.length - m[2].length - 1 } : null);
    };
    const suggestions = useMemo(
        () => (mention ? members.filter((p) => p.id !== user?.id && p.name.toLowerCase().replace(/\s+/g, "").includes(mention.q.replace(/\s+/g, ""))).slice(0, 5) : []),
        [mention, members, user?.id]
    );
    const choose = (p: Member) => {
        if (!mention) return;
        const after = text.slice(mention.start + 1 + mention.q.length);
        const next = `${text.slice(0, mention.start)}@${p.name} ${after}`;
        setText(next);
        setPicked((cur) => (cur.some((c) => c.id === p.id) ? cur : [...cur, p]));
        setMention(null);
        requestAnimationFrame(() => inputRef.current?.focus());
    };

    const send = async (e: FormEvent) => {
        e.preventDefault();
        const body = text.trim();
        if (!body || sending) return;
        setSending(true); setError("");
        try {
            // Only people whose "@Name" is still in the text are notified.
            const ids = picked.filter((p) => body.includes(`@${p.name}`)).map((p) => p.id);
            const msg: Msg = await api(`/channels/${channelId}/messages`, { method: "POST", body: JSON.stringify({ body, mentions: ids }) });
            stick.current = true;
            setMessages((m) => (m.some((x) => x.id === msg.id) ? m : [...m, msg]));
            setText(""); setPicked([]);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setSending(false);
        }
    };

    const saveTask = async (title: string, assigneeId: string, dueDate: string, messageId: string | null) => {
        await api("/tasks", { method: "POST", body: JSON.stringify({ channel: channelId, title, assigneeId, dueDate: dueDate || null, messageId }) });
        setTaskFor(null);
        const [m] = await Promise.all([api(`/channels/${channelId}/messages`), loadTasks(), loadChannels()]);
        setMessages(m);
    };

    const setStatus = async (t: Task, status: "open" | "done") => {
        try {
            await api(`/tasks/${t.id}`, { method: "PATCH", body: JSON.stringify({ status }) });
            const [m] = await Promise.all([api(`/channels/${channelId}/messages`), loadTasks(), loadChannels()]);
            setMessages(m);
        } catch (err) {
            setError((err as Error).message);
        }
    };

    const renderBody = (m: Msg) => {
        const names = members.filter((p) => m.mentions.includes(p.id)).map((p) => `@${p.name}`);
        if (!names.length) return m.body;
        const re = new RegExp(`(${names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "g");
        return m.body.split(re).map((part, i) =>
            names.includes(part)
                ? <span key={i} className={`rounded px-1 font-semibold ${part === `@${members.find((p) => p.id === user?.id)?.name}` ? "bg-amber-200 text-amber-900" : "bg-primary/10 text-primary"}`}>{part}</span>
                : part
        );
    };

    const myOpen = tasks.filter((t) => t.status === "open");
    const done = tasks.filter((t) => t.status === "done");

    return (
        <AdminLayout>
            <div className="max-w-6xl mx-auto">
                <div className="hidden lg:flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div>
                        <h1 className="text-2xl font-heading font-bold">Team Desk</h1>
                        <p className="text-sm text-muted-foreground">Chat, mention and hand out tasks. New orders, registrations and abstracts appear here too.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {canInstall && <Button variant="outline" size="sm" onClick={install}><Download className="w-4 h-4" /> Install app</Button>}
                        {push.state === "off" && <Button size="sm" onClick={push.enable}><Bell className="w-4 h-4" /> Turn on notifications</Button>}
                        {push.state === "on" && <Button variant="outline" size="sm" onClick={push.disable}><BellOff className="w-4 h-4" /> Notifications on</Button>}
                    </div>
                </div>
                <div className="hidden lg:block">
                {push.state === "blocked" && <p className="mb-3 text-sm rounded-lg bg-amber-50 border border-amber-200 p-3">Notifications are blocked for this site. Allow them in your browser's site settings to get alerts.</p>}
                {push.state === "unconfigured" && <p className="mb-3 text-sm rounded-lg bg-gray-100 border p-3">Push alerts are not set up on the server yet. Ask the administrator to add the VAPID keys.</p>}
                {push.error && <p className="mb-3 text-sm text-destructive">{push.error}</p>}

                </div>
                <div className="grid lg:grid-cols-[220px_minmax(0,1fr)] bg-white lg:border lg:rounded-xl overflow-hidden -mx-4 -mt-4 -mb-4 lg:m-0 h-[calc(100dvh-8.5rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] lg:h-[calc(100vh-190px)] lg:min-h-[480px]">
                    <nav aria-label="Channels" className="hidden lg:flex lg:border-r bg-gray-50 p-2 flex-col gap-1 overflow-y-auto">
                        {channels.map((c) => (
                            <button
                                key={c.id}
                                onClick={() => go(c.id)}
                                aria-current={c.id === channelId}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left whitespace-nowrap ${c.id === channelId ? "bg-primary text-primary-foreground font-semibold" : "hover:bg-gray-200"}`}
                            >
                                {c.restricted ? <Lock className="w-3.5 h-3.5 shrink-0" /> : <Hash className="w-3.5 h-3.5 shrink-0" />}
                                <span className="flex-1">{c.name}</span>
                                {c.unread > 0 && c.id !== channelId && (
                                    <span className={`min-w-5 h-5 px-1.5 rounded-full text-[11px] font-bold grid place-items-center ${c.mentions ? "bg-amber-400 text-black" : "bg-primary/80 text-white"}`}>{c.unread}</span>
                                )}
                            </button>
                        ))}
                    </nav>

                    <section className="flex flex-col min-w-0 min-h-0">
                        <header className="flex items-center gap-2 px-3 lg:px-4 py-2.5 lg:py-3 border-b">
                            <button onClick={() => setSideOpen(true)} className="lg:hidden relative flex items-center gap-1.5 min-w-0 flex-1 text-left rounded-lg px-2 py-1.5 hover:bg-gray-100" aria-label="Open channels">
                                {current?.restricted ? <Lock className="w-4 h-4 shrink-0" /> : <Hash className="w-4 h-4 shrink-0" />}
                                <span className="font-heading font-bold truncate">{current?.name ?? channelId}</span>
                                <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />
                                {otherUnread > 0 && <span className="ml-1 min-w-5 h-5 px-1.5 rounded-full bg-amber-400 text-black text-[11px] font-bold grid place-items-center">{otherUnread}</span>}
                            </button>
                            <div className="hidden lg:block min-w-0 flex-1">
                                <h2 className="font-heading font-bold truncate"># {current?.name ?? channelId}</h2>
                                <p className="text-xs text-muted-foreground truncate">{current?.description}</p>
                            </div>
                            <div className="flex rounded-lg border overflow-hidden text-sm shrink-0" role="tablist">
                                <button role="tab" aria-selected={tab === "chat"} onClick={() => go(channelId)} className={`px-3 py-1.5 ${tab === "chat" ? "bg-primary text-primary-foreground" : "hover:bg-gray-100"}`}>Chat</button>
                                <button role="tab" aria-selected={tab === "tasks"} onClick={() => go(channelId, "tasks")} className={`px-3 py-1.5 flex items-center gap-1.5 ${tab === "tasks" ? "bg-primary text-primary-foreground" : "hover:bg-gray-100"}`}>
                                    <ListTodo className="w-4 h-4" /><span className="hidden sm:inline">Tasks</span>{tasks.filter((t) => t.status === "open").length > 0 && <span>({tasks.filter((t) => t.status === "open").length})</span>}
                                </button>
                            </div>
                            <Button size="sm" variant="outline" className="shrink-0" onClick={() => setTaskFor({ title: "", messageId: null })} aria-label="Assign task"><UserPlus className="w-4 h-4" /><span className="hidden sm:inline">Assign task</span></Button>
                        </header>

                        {tab === "chat" ? (
                            <>
                                <div
                                    ref={feedRef}
                                    onScroll={(e) => { const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; }}
                                    className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4"
                                    aria-live="polite"
                                >
                                    {messages.length === 0 && !error && <p className="text-sm text-muted-foreground text-center py-10">No messages yet. Say hello, or @mention a teammate.</p>}
                                    {messages.map((m) => {
                                        const mine = m.authorId === user?.id;
                                        const mentionsMe = !!user && m.mentions.includes(user.id);
                                        const link = m.refType && m.refType !== "task" ? REF_LINK[m.refType]?.(m.id) : null;
                                        return (
                                            <div key={m.id} className={`flex gap-3 ${mentionsMe ? "bg-amber-50 -mx-2 px-2 py-1 rounded-lg" : ""}`}>
                                                <div className={`w-9 h-9 shrink-0 rounded-full grid place-items-center text-xs font-bold ${m.isEvent ? "bg-amber-400 text-black rounded-lg" : "bg-primary text-primary-foreground"}`}>
                                                    {m.isEvent ? "SL" : (m.authorName || "?").slice(0, 2).toUpperCase()}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-semibold">{m.isEvent ? "SIM-Lab site" : mine ? "You" : m.authorName ?? "Former staff"} <span className="text-xs font-normal text-muted-foreground ml-1">{clock(m.createdAt)}</span></p>
                                                    {m.isEvent ? (
                                                        <div className="mt-1 border border-l-4 border-l-amber-400 rounded-md p-3 max-w-xl bg-white">
                                                            <p className="text-sm break-words">{m.body}</p>
                                                            <div className="mt-2 flex flex-wrap gap-2">
                                                                <Button size="sm" onClick={() => setTaskFor({ title: m.refLabel ? `Follow up: ${m.refLabel}` : m.body, messageId: m.id })}>Assign</Button>
                                                                {link && <Button size="sm" variant="outline" asChild><a href={link}>Open record</a></Button>}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <p className="text-sm whitespace-pre-wrap break-words">{renderBody(m)}</p>
                                                    )}
                                                    {m.refType === "task" && <p className="text-xs text-muted-foreground mt-0.5">Task {m.taskStatus === "done" ? "done" : "open"}{m.taskAssigneeName ? ` · ${m.taskAssigneeName}` : ""}</p>}
                                                    {!m.isEvent && m.refType !== "task" && !m.taskId && (
                                                        <button onClick={() => setTaskFor({ title: m.body.slice(0, 120), messageId: m.id })} className="text-xs text-muted-foreground hover:text-primary mt-0.5">Make this a task</button>
                                                    )}
                                                    {m.taskId && m.refType !== "task" && <p className="text-xs text-primary mt-0.5">Task for {m.taskAssigneeName} · {m.taskStatus === "done" ? "done" : "open"}</p>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <form onSubmit={send} className="relative border-t p-3 flex gap-2">
                                    {suggestions.length > 0 && (
                                        <ul role="listbox" aria-label="Mention a teammate" className="absolute bottom-full left-3 mb-1 w-64 bg-white border rounded-lg shadow-lg py-1 z-10">
                                            {suggestions.map((p) => (
                                                <li key={p.id} role="option" aria-selected="false">
                                                    <button type="button" onMouseDown={(e) => { e.preventDefault(); choose(p); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex justify-between">
                                                        {p.name}<span className="text-xs text-muted-foreground">{p.role}</span>
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                    <Input
                                        ref={inputRef}
                                        value={text}
                                        onChange={(e) => onType(e.target.value, e.target.selectionStart)}
                                        onKeyDown={(e) => { if (e.key === "Tab" && suggestions[0]) { e.preventDefault(); choose(suggestions[0]); } if (e.key === "Escape") setMention(null); }}
                                        maxLength={4000}
                                        placeholder={`Message #${current?.name ?? channelId}. Type @ to mention someone.`}
                                        aria-label="Message"
                                    />
                                    <Button type="submit" disabled={sending || !text.trim()}><Send className="w-4 h-4" /> Send</Button>
                                </form>
                                {error && <p className="px-4 pb-3 text-sm text-destructive" role="alert">{error}</p>}
                            </>
                        ) : (
                            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-6">
                                <p className="text-sm text-muted-foreground">{openTasks > 0 ? `You have ${openTasks} open ${openTasks === 1 ? "task" : "tasks"} across all channels.` : "You have no open tasks."}</p>
                                <TaskList title="Open" tasks={myOpen} me={user?.id} onToggle={(t) => setStatus(t, "done")} empty="Nothing open in this channel." />
                                <TaskList title="Done" tasks={done} me={user?.id} onToggle={(t) => setStatus(t, "open")} empty="Nothing finished yet." />
                            </div>
                        )}
                    </section>
                </div>
            </div>

            <Sheet open={sideOpen} onOpenChange={setSideOpen}>
                <SheetContent side="left" className="w-[85vw] max-w-sm p-0 flex flex-col pt-[env(safe-area-inset-top)]">
                    <SheetHeader className="p-4 border-b text-left">
                        <SheetTitle className="font-heading">Team Desk</SheetTitle>
                        <SheetDescription>{openTasks > 0 ? `You have ${openTasks} open ${openTasks === 1 ? "task" : "tasks"}.` : "Pick a channel."}</SheetDescription>
                    </SheetHeader>
                    <nav aria-label="Channels" className="flex-1 overflow-y-auto p-2 space-y-1">
                        {channels.map((c) => (
                            <button key={c.id} onClick={() => go(c.id)} aria-current={c.id === channelId} className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left ${c.id === channelId ? "bg-primary text-primary-foreground font-semibold" : "hover:bg-gray-100"}`}>
                                {c.restricted ? <Lock className="w-4 h-4 shrink-0" /> : <Hash className="w-4 h-4 shrink-0" />}
                                <span className="flex-1 min-w-0"><span className="block truncate">{c.name}</span><span className={`block text-xs truncate ${c.id === channelId ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{c.description}</span></span>
                                {c.unread > 0 && c.id !== channelId && <span className={`min-w-5 h-5 px-1.5 rounded-full text-[11px] font-bold grid place-items-center ${c.mentions ? "bg-amber-400 text-black" : "bg-primary/80 text-white"}`}>{c.unread}</span>}
                            </button>
                        ))}
                    </nav>
                    <div className="border-t p-3 space-y-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
                        {push.state === "off" && <Button className="w-full" onClick={push.enable}><Bell className="w-4 h-4" /> Turn on notifications</Button>}
                        {push.state === "on" && <Button variant="outline" className="w-full" onClick={push.disable}><BellOff className="w-4 h-4" /> Notifications on</Button>}
                        {canInstall && <Button variant="outline" className="w-full" onClick={install}><Download className="w-4 h-4" /> Install app</Button>}
                        {push.state === "blocked" && <p className="text-xs rounded-lg bg-amber-50 border border-amber-200 p-2">Notifications are blocked for this site. Allow them in your browser's site settings.</p>}
                        {push.state === "unconfigured" && <p className="text-xs rounded-lg bg-gray-100 border p-2">Push alerts are not set up on the server yet.</p>}
                        {push.error && <p className="text-xs text-destructive">{push.error}</p>}
                    </div>
                </SheetContent>
            </Sheet>

            {taskFor && <TaskDialog members={members} initial={taskFor.title} messageId={taskFor.messageId} meId={user?.id} onClose={() => setTaskFor(null)} onSave={saveTask} />}
        </AdminLayout>
    );
};

const TaskList = ({ title, tasks, me, onToggle, empty }: { title: string; tasks: Task[]; me?: string; onToggle: (t: Task) => void; empty: string }) => (
    <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{title}</h3>
        {tasks.length === 0 ? <p className="text-sm text-muted-foreground">{empty}</p> : (
            <ul className="space-y-2">
                {tasks.map((t) => {
                    const due = dueLabel(t.dueDate, t.status === "done");
                    return (
                        <li key={t.id} className="flex items-start gap-3 border rounded-lg p-3">
                            <button onClick={() => onToggle(t)} aria-label={t.status === "done" ? "Reopen task" : "Mark task done"} className="mt-0.5 text-primary">
                                {t.status === "done" ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                            </button>
                            <div className="min-w-0 flex-1">
                                <p className={`text-sm font-medium break-words ${t.status === "done" ? "line-through text-muted-foreground" : ""}`}>{t.title}</p>
                                <p className="text-xs text-muted-foreground">
                                    {t.assigneeId === me ? "You" : t.assigneeName}{t.createdByName && t.createdByName !== t.assigneeName ? ` · from ${t.createdByName}` : ""}
                                    {due && <span className={due.late ? "text-destructive font-semibold" : ""}> · due {due.text}{due.late ? " (late)" : ""}</span>}
                                </p>
                            </div>
                        </li>
                    );
                })}
            </ul>
        )}
    </div>
);

const TaskDialog = ({ members, initial, messageId, meId, onClose, onSave }: {
    members: Member[]; initial: string; messageId: string | null; meId?: string;
    onClose: () => void; onSave: (title: string, assigneeId: string, due: string, messageId: string | null) => Promise<void>;
}) => {
    const [title, setTitle] = useState(initial);
    const [who, setWho] = useState(meId && members.some((m) => m.id === meId) ? meId : members[0]?.id ?? "");
    const [due, setDue] = useState("");
    const [err, setErr] = useState("");
    const [busy, setBusy] = useState(false);
    useEffect(() => {
        const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        document.addEventListener("keydown", key);
        return () => document.removeEventListener("keydown", key);
    }, [onClose]);
    const submit = async (e: FormEvent) => {
        e.preventDefault();
        setBusy(true); setErr("");
        try { await onSave(title.trim(), who, due, messageId); } catch (x) { setErr((x as Error).message); setBusy(false); }
    };
    return (
        <div className="fixed inset-0 z-[60] grid place-items-center p-4" role="dialog" aria-modal="true" aria-labelledby="task-t">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <form onSubmit={submit} className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-5 space-y-4">
                <h2 id="task-t" className="font-heading font-bold text-lg">Assign a task</h2>
                <label className="block text-sm font-medium">What needs doing
                    <Input className="mt-1" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={300} required autoFocus />
                </label>
                <label className="block text-sm font-medium">Who
                    <select className="mt-1 w-full h-10 rounded-md border bg-white px-3 text-sm" value={who} onChange={(e) => setWho(e.target.value)} required>
                        {members.map((m) => <option key={m.id} value={m.id}>{m.id === meId ? `${m.name} (me)` : m.name}</option>)}
                    </select>
                </label>
                <label className="block text-sm font-medium">Due date (optional)
                    <Input className="mt-1" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
                </label>
                {err && <p className="text-sm text-destructive" role="alert">{err}</p>}
                <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                    <Button type="submit" disabled={busy || !title.trim() || !who}>Assign task</Button>
                </div>
            </form>
        </div>
    );
};

export default AdminTeam;
