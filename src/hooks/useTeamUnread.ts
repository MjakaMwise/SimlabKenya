import { useEffect, useState } from "react";
import { useAdminAuth } from "./useAdminAuth";

/** Unread chat messages plus open tasks for the signed-in person, refreshed every 30 seconds. */
export const useTeamUnread = () => {
    const { token } = useAdminAuth();
    const [count, setCount] = useState(0);
    useEffect(() => {
        if (!token) return;
        let stop = false;
        const load = () =>
            fetch("/api/chat/channels", { headers: { Authorization: `Bearer ${token}` } })
                .then((r) => (r.ok ? r.json() : null))
                .then((d) => { if (d && !stop) setCount(d.channels.reduce((n: number, c: { unread: number }) => n + c.unread, 0)); })
                .catch(() => undefined);
        load();
        const t = setInterval(load, 30000);
        return () => { stop = true; clearInterval(t); };
    }, [token]);
    return count;
};
