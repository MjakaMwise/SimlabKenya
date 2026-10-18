import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Circle, Loader2, Plus, Save, Trash2 } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface Status { online: boolean; connected: boolean; ready: boolean; state: string | null; qr: string | null }
interface BotNode { id: string; text: string; options: { key: string; goto: string }[]; input: string | null; action: string | null }
interface Hours { enabled: boolean; start: string; end: string; days: number[] }

const STEPS = [
    { id: "server", title: "Server" },
    { id: "link", title: "Link number" },
    { id: "bot", title: "Bot menu" },
    { id: "team", title: "Team" },
    { id: "test", title: "Test" },
] as const;
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const Code = ({ children }: { children: string }) => (
    <pre className="bg-gray-900 text-gray-100 text-xs sm:text-sm rounded-lg p-3 overflow-x-auto"><code>{children}</code></pre>
);

const AdminWhatsAppSetup = () => {
    const { token } = useAdminAuth();
    const { toast } = useToast();
    const [params, setParams] = useSearchParams();
    const step = Math.max(0, STEPS.findIndex((s) => s.id === params.get("step")));
    const [status, setStatus] = useState<Status | null>(null);
    const [nodes, setNodes] = useState<BotNode[]>([]);
    const [enabled, setEnabled] = useState(true);
    const [hours, setHours] = useState<Hours>({ enabled: false, start: "08:00", end: "17:00", days: [1, 2, 3, 4, 5] });
    const [saving, setSaving] = useState<string | null>(null);

    const api = useCallback(
        async (path: string, init?: RequestInit) => {
            const res = await fetch(`/api/whatsapp${path}`, { ...init, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
            return data;
        },
        [token]
    );

    const poll = useCallback(() => api("/status").then(setStatus).catch(() => undefined), [api]);
    useEffect(() => {
        if (!token) return;
        poll();
        const i = setInterval(poll, 4000);
        return () => clearInterval(i);
    }, [token, poll]);

    useEffect(() => {
        if (!token) return;
        Promise.all([api("/bot/nodes"), api("/bot/settings")])
            .then(([n, s]) => { setNodes(n.nodes); setEnabled(s.enabled); if (s.hours) setHours(s.hours); })
            .catch((e) => toast({ title: "Could not load the bot", description: e.message, variant: "destructive" }));
    }, [token, api, toast]);

    const go = (i: number) => setParams({ step: STEPS[Math.min(Math.max(i, 0), STEPS.length - 1)].id });
    const fail = (e: unknown) => toast({ title: "Error", description: e instanceof Error ? e.message : "Something went wrong", variant: "destructive" });

    const saveSettings = async () => {
        setSaving("settings");
        try { await api("/bot/settings", { method: "PUT", body: JSON.stringify({ enabled, hours }) }); toast({ title: "Bot settings saved" }); }
        catch (e) { fail(e); } finally { setSaving(null); }
    };
    const saveNode = async (n: BotNode) => {
        setSaving(n.id);
        try { await api(`/bot/nodes/${n.id}`, { method: "PUT", body: JSON.stringify({ text: n.text, options: n.options }) }); toast({ title: `Saved "${n.id}"` }); }
        catch (e) { fail(e); } finally { setSaving(null); }
    };
    const editNode = (id: string, patch: Partial<BotNode>) => setNodes((list) => list.map((n) => (n.id === id ? { ...n, ...patch } : n)));

    const done = [status?.online ?? false, status?.ready ?? false, true, true, status?.ready ?? false];

    return (
        <AdminLayout>
            <div className="max-w-3xl space-y-6">
                <div>
                    <Link to="/admin/whatsapp" className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:text-foreground"><ArrowLeft className="w-4 h-4" /> Back to WhatsApp</Link>
                    <h1 className="text-2xl font-heading font-bold text-gray-900 mt-1">WhatsApp setup</h1>
                    <p className="text-muted-foreground text-sm">Five short pages. You can come back to any of them later.</p>
                </div>

                <ol className="grid grid-cols-5 gap-1">
                    {STEPS.map((s, i) => (
                        <li key={s.id}>
                            <button onClick={() => go(i)} className={`w-full text-center py-2 rounded-lg text-xs sm:text-sm flex flex-col items-center gap-1 ${i === step ? "bg-primary text-primary-foreground" : "bg-white border hover:bg-gray-50"}`}>
                                {done[i] && i !== step ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Circle className="w-4 h-4 opacity-60" />}
                                {s.title}
                            </button>
                        </li>
                    ))}
                </ol>

                <div className="bg-white border rounded-xl p-5 space-y-4">
                    {step === 0 && (
                        <>
                            <h2 className="font-heading font-semibold text-lg">1. Start the WhatsApp server</h2>
                            <p className="text-sm text-muted-foreground">WhatsApp runs in its own container next to the website. On the server, run the setup script. It creates the access key, starts the container and shows the QR code.</p>
                            <Code>{"cd /path/to/SimlabKenya\n./deploy/whatsapp-setup.sh"}</Code>
                            <p className="text-sm flex items-center gap-2">
                                {status?.online ? <><Check className="w-4 h-4 text-emerald-600" /> The server is running.</> : <><Loader2 className="w-4 h-4 animate-spin" /> Waiting for the server. This page checks every few seconds.</>}
                            </p>
                        </>
                    )}

                    {step === 1 && (
                        <>
                            <h2 className="font-heading font-semibold text-lg">2. Link the business number</h2>
                            {status?.ready ? (
                                <p className="text-sm flex items-center gap-2 text-emerald-700"><CheckCircle2 className="w-5 h-5" /> The number is linked and ready.</p>
                            ) : (
                                <>
                                    <ol className="text-sm text-muted-foreground list-decimal pl-5 space-y-1">
                                        <li>On the business phone open WhatsApp, then Settings, then Linked devices.</li>
                                        <li>Tap Link a device and scan the code below.</li>
                                        <li>Keep the phone online. WhatsApp signs the link out if the phone stays offline for about two weeks.</li>
                                    </ol>
                                    {status?.qr ? (
                                        <div className="bg-white p-3 inline-block border rounded-lg"><QRCodeSVG value={status.qr} size={220} /></div>
                                    ) : (
                                        <div className="text-sm rounded-lg border p-3 space-y-2">
                                            <p>No code is available to show here yet. Scan it from the server instead:</p>
                                            <Code>{"./deploy/whatsapp-setup.sh --qr"}</Code>
                                        </div>
                                    )}
                                    <p className="text-xs text-muted-foreground">Status: {status?.state ?? "checking"}. Use a dedicated business number, not a personal one.</p>
                                </>
                            )}
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <h2 className="font-heading font-semibold text-lg">3. Bot menu</h2>
                            <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                                <div><p className="font-medium text-sm">Answer new messages with the menu</p><p className="text-xs text-muted-foreground">Turn off to leave every chat to your team.</p></div>
                                <Switch checked={enabled} onCheckedChange={setEnabled} aria-label="Bot on" />
                            </div>
                            <div className="rounded-lg border p-3 space-y-3">
                                <div className="flex items-center justify-between gap-3">
                                    <div><p className="font-medium text-sm">Only answer outside business hours</p><p className="text-xs text-muted-foreground">Nairobi time. During these hours messages wait for a person.</p></div>
                                    <Switch checked={hours.enabled} onCheckedChange={(v) => setHours({ ...hours, enabled: v })} aria-label="Business hours" />
                                </div>
                                {hours.enabled && (
                                    <div className="flex flex-wrap items-center gap-3 text-sm">
                                        <Input type="time" className="w-32" value={hours.start} onChange={(e) => setHours({ ...hours, start: e.target.value })} aria-label="Opens" />
                                        <span>to</span>
                                        <Input type="time" className="w-32" value={hours.end} onChange={(e) => setHours({ ...hours, end: e.target.value })} aria-label="Closes" />
                                        <div className="flex gap-1">
                                            {DAYS.map((d, i) => (
                                                <button key={d} type="button" onClick={() => setHours({ ...hours, days: hours.days.includes(i) ? hours.days.filter((x) => x !== i) : [...hours.days, i] })}
                                                    className={`px-2 py-1 rounded text-xs ${hours.days.includes(i) ? "bg-primary text-primary-foreground" : "bg-gray-100"}`}>{d}</button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <Button size="sm" onClick={saveSettings} disabled={saving === "settings"}>{saving === "settings" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save</Button>
                            </div>

                            <p className="text-sm text-muted-foreground">Each screen the client sees. An option's key is what they type, and "goes to" names the screen it opens.</p>
                            {nodes.map((n) => (
                                <div key={n.id} className="rounded-lg border p-3 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <code className="text-xs bg-gray-100 rounded px-1.5 py-0.5">{n.id}</code>
                                        {n.input && <span className="text-xs text-muted-foreground">looks up an {n.input === "order" ? "order" : "registration"} from what the client types</span>}
                                        {n.action === "human" && <span className="text-xs text-muted-foreground">hands the chat to your team</span>}
                                    </div>
                                    <Textarea rows={Math.min(8, n.text.split("\n").length + 1)} value={n.text} onChange={(e) => editNode(n.id, { text: e.target.value })} aria-label={`Text for ${n.id}`} />
                                    {n.options.map((o, i) => (
                                        <div key={i} className="flex items-center gap-2 text-sm">
                                            <Input className="w-16" value={o.key} maxLength={10} onChange={(e) => editNode(n.id, { options: n.options.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)) })} aria-label="Key" />
                                            <span className="text-muted-foreground">goes to</span>
                                            <select className="border rounded-md h-10 px-2 bg-white text-sm min-w-0 flex-1" value={o.goto} onChange={(e) => editNode(n.id, { options: n.options.map((x, j) => (j === i ? { ...x, goto: e.target.value } : x)) })} aria-label="Goes to">
                                                {nodes.map((t) => <option key={t.id} value={t.id}>{t.id}</option>)}
                                            </select>
                                            <Button variant="ghost" size="icon" onClick={() => editNode(n.id, { options: n.options.filter((_, j) => j !== i) })} aria-label="Remove option"><Trash2 className="w-4 h-4" /></Button>
                                        </div>
                                    ))}
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={() => editNode(n.id, { options: [...n.options, { key: "", goto: "main" }] })}><Plus className="w-4 h-4" /> Option</Button>
                                        <Button size="sm" onClick={() => saveNode(n)} disabled={saving === n.id}>{saving === n.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save screen</Button>
                                    </div>
                                </div>
                            ))}
                        </>
                    )}

                    {step === 3 && (
                        <>
                            <h2 className="font-heading font-semibold text-lg">4. Choose who can use it</h2>
                            <p className="text-sm text-muted-foreground">On the Staff page, set WhatsApp inbox for each person:</p>
                            <ul className="text-sm list-disc pl-5 space-y-1 text-muted-foreground">
                                <li><b className="text-foreground">View only</b> reads conversations.</li>
                                <li><b className="text-foreground">View &amp; manage</b> replies, assigns chats, resolves them and hands them back to the bot.</li>
                            </ul>
                            <Button asChild variant="outline"><Link to="/admin/staff">Open Staff</Link></Button>
                        </>
                    )}

                    {step === 4 && (
                        <>
                            <h2 className="font-heading font-semibold text-lg">5. Test it</h2>
                            <ol className="text-sm text-muted-foreground list-decimal pl-5 space-y-1">
                                <li>From another phone, send "hi" to the business number.</li>
                                <li>The menu should arrive within a few seconds.</li>
                                <li>Reply 5. The chat shows "needs a person" in the inbox.</li>
                            </ol>
                            <p className="text-sm flex items-center gap-2">
                                {status?.ready ? <><CheckCircle2 className="w-5 h-5 text-emerald-600" /> WhatsApp is connected.</> : <><Circle className="w-5 h-5" /> Not connected yet. Finish steps 1 and 2.</>}
                            </p>
                            <Button asChild><Link to="/admin/whatsapp">Open the inbox</Link></Button>
                        </>
                    )}
                </div>

                <div className="flex justify-between">
                    <Button variant="outline" onClick={() => go(step - 1)} disabled={step === 0}><ArrowLeft className="w-4 h-4" /> Back</Button>
                    <Button onClick={() => go(step + 1)} disabled={step === STEPS.length - 1}>Next <ArrowRight className="w-4 h-4" /></Button>
                </div>
            </div>
        </AdminLayout>
    );
};

export default AdminWhatsAppSetup;
