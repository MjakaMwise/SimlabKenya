import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
    Search,
    FileText,
    Loader2,
    Eye,
    Filter,
    ChevronLeft,
    ChevronRight,
    AlertCircle,
    RefreshCw,
} from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface Abstract {
    id: string;
    projectTitle: string;
    projectCategory: string;
    schoolName: string;
    studentNames?: string[];
    studentName?: string; // legacy field
    teacherName: string;
    teacherEmail: string;
    teacherContact: string;
    projectDescription: string;
    status: string;
    submittedAt: string;
    files: { originalName: string; url: string; mimeType: string }[];
}

const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    reviewed: "bg-blue-100 text-blue-800",
    accepted: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
};

const ITEMS_PER_PAGE = 20;

const AdminAbstracts = () => {
    const { token } = useAdminAuth();
    const [abstracts, setAbstracts] = useState<Abstract[]>([]);
    const [filtered, setFiltered] = useState<Abstract[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);

    const fetchAbstracts = useCallback(async () => {
        if (!token) {
            setFetchError("Not authenticated — please log in again.");
            setIsLoading(false);
            return;
        }
        setFetchError(null);
        setIsLoading(true);
        try {
            const res = await fetch("/api/abstracts", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || `Error ${res.status}`);
            }
            setAbstracts(await res.json());
        } catch (error) {
            console.error("Error fetching abstracts:", error);
            setFetchError(error instanceof Error ? error.message : "Failed to load submissions");
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    const filterAbstracts = useCallback(() => {
        let result = [...abstracts];

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(
                (a) => {
                    const students = a.studentNames?.join(' ') ?? a.studentName ?? '';
                    return (
                        a.projectTitle.toLowerCase().includes(q) ||
                        a.schoolName.toLowerCase().includes(q) ||
                        students.toLowerCase().includes(q) ||
                        a.teacherName.toLowerCase().includes(q) ||
                        a.projectCategory.toLowerCase().includes(q)
                    );
                }
            );
        }

        if (statusFilter !== "all") {
            result = result.filter((a) => a.status === statusFilter);
        }

        setFiltered(result);
        setCurrentPage(1);
    }, [abstracts, searchQuery, statusFilter]);

    useEffect(() => { fetchAbstracts(); }, [fetchAbstracts]);
    useEffect(() => { filterAbstracts(); }, [filterAbstracts]);

    const formatDate = (dateString: string) =>
        new Date(dateString).toLocaleDateString("en-KE", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });

    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    const paginated = filtered.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    if (isLoading) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </AdminLayout>
        );
    }

    if (fetchError) {
        return (
            <AdminLayout>
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                    <AlertCircle className="w-10 h-10 text-destructive" />
                    <div className="text-center">
                        <p className="font-medium text-gray-900">Failed to load submissions</p>
                        <p className="text-sm text-muted-foreground mt-1">{fetchError}</p>
                    </div>
                    <Button variant="outline" onClick={fetchAbstracts}>
                        <RefreshCw className="w-4 h-4" /> Retry
                    </Button>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-heading font-bold text-gray-900">
                        Abstract Submissions
                    </h1>
                    <p className="text-muted-foreground">
                        Review and manage science fair abstract submissions
                    </p>
                </div>

                {/* Filters */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white p-4 rounded-xl shadow-sm border space-y-4"
                >
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by title, school, student, teacher..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-full sm:w-44">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="reviewed">Reviewed</SelectItem>
                                <SelectItem value="accepted">Accepted</SelectItem>
                                <SelectItem value="rejected">Rejected</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                        <p className="text-muted-foreground">
                            Showing {paginated.length} of {filtered.length} submissions
                        </p>
                        {(searchQuery || statusFilter !== "all") && (
                            <button
                                onClick={() => { setSearchQuery(""); setStatusFilter("all"); }}
                                className="text-primary hover:underline"
                            >
                                Clear filters
                            </button>
                        )}
                    </div>
                </motion.div>

                {/* Table */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-xl shadow-sm border overflow-hidden"
                >
                    {paginated.length === 0 ? (
                        <div className="p-12 text-center">
                            <Filter className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground">No submissions found</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 text-left">
                                    <tr>
                                        <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Project</th>
                                        <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden md:table-cell">School</th>
                                        <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Student</th>
                                        <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Files</th>
                                        <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                                        <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Date</th>
                                        <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {paginated.map((abstract) => (
                                        <tr key={abstract.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-4">
                                                <p className="font-medium text-sm">{abstract.projectTitle}</p>
                                                <p className="text-xs text-muted-foreground">{abstract.projectCategory}</p>
                                            </td>
                                            <td className="px-4 py-4 hidden md:table-cell text-sm">
                                                {abstract.schoolName}
                                            </td>
                                            <td className="px-4 py-4 hidden lg:table-cell text-sm">
                                                {abstract.studentNames && abstract.studentNames.length > 0
                                                    ? abstract.studentNames.join(', ')
                                                    : (abstract.studentName ?? '—')}
                                            </td>
                                            <td className="px-4 py-4 hidden sm:table-cell">
                                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                    <FileText className="w-4 h-4" />
                                                    {abstract.files?.length ?? 0}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${statusColors[abstract.status] || "bg-gray-100 text-gray-800"}`}>
                                                    {abstract.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 hidden lg:table-cell text-sm text-muted-foreground">
                                                {abstract.submittedAt ? formatDate(abstract.submittedAt) : "—"}
                                            </td>
                                            <td className="px-4 py-4">
                                                <Link
                                                    to={`/admin/abstracts/${abstract.id}`}
                                                    className="p-2 hover:bg-gray-100 rounded-lg inline-flex"
                                                    title="View Details"
                                                >
                                                    <Eye className="w-4 h-4 text-gray-600" />
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="px-6 py-4 border-t flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">
                                Page {currentPage} of {totalPages}
                            </p>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>
        </AdminLayout>
    );
};

export default AdminAbstracts;
