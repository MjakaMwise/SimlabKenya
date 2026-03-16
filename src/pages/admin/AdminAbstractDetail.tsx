import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
    ArrowLeft,
    Loader2,
    Download,
    FileText,
    Eye,
    User,
    School,
    Phone,
    Mail,
    Tag,
    Calendar,
} from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import FilePreviewModal, { AbstractPreview } from "@/components/admin/FilePreviewModal";

interface AbstractFile {
    originalName: string;
    url: string;
    mimeType: string;
    size: number;
}

interface Abstract {
    id: string;
    projectTitle: string;
    projectCategory: string;
    projectDescription: string;
    schoolName: string;
    studentNames?: string[];
    studentName?: string; // legacy field
    teacherName: string;
    teacherEmail: string;
    teacherContact: string;
    status: string;
    submittedAt: string;
    files: AbstractFile[];
}

const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    reviewed: "bg-blue-100 text-blue-800",
    accepted: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
};

const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileTypeFromMimeType = (mimeType: string): "pdf" | "docx" | undefined => {
    if (mimeType === "application/pdf") return "pdf";
    if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return "docx";
    return undefined;
};

const getFileExtension = (mimeType: string): string => {
    const mimeMap: Record<string, string> = {
        "application/pdf": ".pdf",
        "application/msword": ".doc",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
        "application/vnd.ms-excel": ".xls",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
        "application/vnd.oasis.opendocument.text": ".odt",
        "text/plain": ".txt",
    };
    return mimeMap[mimeType] || "";
};

const AdminAbstractDetail = () => {
    const { id } = useParams<{ id: string }>();
    const { token } = useAdminAuth();
    const { toast } = useToast();
    const [abstract, setAbstract] = useState<Abstract | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [selectedFile, setSelectedFile] = useState<{ file: AbstractFile; abstract: Abstract } | null>(null);

    useEffect(() => {
        if (token && id) fetchAbstract();
    }, [token, id]);

    const fetchAbstract = async () => {
        try {
            const res = await fetch(`/api/abstracts/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error("Not found");
            setAbstract(await res.json());
        } catch {
            toast({ title: "Error", description: "Failed to load submission", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const handleStatusChange = async (newStatus: string) => {
        if (!abstract) return;
        setIsUpdating(true);
        try {
            const res = await fetch(`/api/abstracts/${abstract.id}/status`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ status: newStatus }),
            });
            if (!res.ok) throw new Error("Failed to update");
            setAbstract((prev) => prev ? { ...prev, status: newStatus } : prev);
            toast({ title: "Status updated", description: `Marked as ${newStatus}` });
        } catch {
            toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
        } finally {
            setIsUpdating(false);
        }
    };

    if (isLoading) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </AdminLayout>
        );
    }

    if (!abstract) {
        return (
            <AdminLayout>
                <div className="text-center py-20">
                    <p className="text-muted-foreground">Submission not found</p>
                    <Button asChild className="mt-4" variant="outline">
                        <Link to="/admin/abstracts"><ArrowLeft className="w-4 h-4" /> Back</Link>
                    </Button>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="space-y-6 max-w-4xl mx-auto">
                {/* Back + Header */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0 flex-1">
                        <Link
                            to="/admin/abstracts"
                            className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1 mb-2"
                        >
                            <ArrowLeft className="w-4 h-4" /> Back to Submissions
                        </Link>
                        <h1 className="text-2xl font-heading font-bold text-gray-900 break-words">
                            {abstract.projectTitle}
                        </h1>
                        <p className="text-muted-foreground">{abstract.projectCategory}</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${statusColors[abstract.status] || "bg-gray-100 text-gray-800"}`}>
                            {abstract.status}
                        </span>
                        <div className="flex items-center gap-2">
                            <Select
                                value={abstract.status}
                                onValueChange={handleStatusChange}
                                disabled={isUpdating}
                            >
                                <SelectTrigger className="w-36">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="reviewed">Reviewed</SelectItem>
                                    <SelectItem value="accepted">Accepted</SelectItem>
                                    <SelectItem value="rejected">Rejected</SelectItem>
                                </SelectContent>
                            </Select>
                            {isUpdating && <Loader2 className="w-4 h-4 animate-spin" />}
                        </div>
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Main Details */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="lg:col-span-2 space-y-6"
                    >
                        {/* Project Description */}
                        <div className="bg-white rounded-xl shadow-sm border p-6">
                            <h2 className="font-heading font-bold mb-3">Project Description</h2>
                            <p
                                className="text-gray-700 leading-relaxed whitespace-pre-wrap break-words"
                                style={{ overflowWrap: "anywhere" }}
                            >
                                {abstract.projectDescription}
                            </p>
                        </div>

                        {/* Files */}
                        <div className="bg-white rounded-xl shadow-sm border p-6">
                            <h2 className="font-heading font-bold mb-4 flex items-center gap-2">
                                <FileText className="w-5 h-5" /> Submitted Files ({abstract.files?.length ?? 0})
                            </h2>
                            {abstract.files?.length > 0 ? (
                                <div className="space-y-3">
                                    {abstract.files.map((file, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <FileText className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium truncate">{file.originalName}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {file.size ? `${formatBytes(file.size)} · ` : ""}{file.mimeType}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="ml-3 flex items-center gap-2 flex-shrink-0">
                                                {getFileTypeFromMimeType(file.mimeType) && (
                                                    <button
                                                        onClick={() => setSelectedFile({ file, abstract })}
                                                        className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                                                        title="Preview file"
                                                    >
                                                        <Eye className="w-4 h-4 text-gray-600" />
                                                    </button>
                                                )}
                                                <a
                                                    href={file.url}
                                                    download={file.originalName}
                                                    rel="noopener noreferrer"
                                                    className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                                                    title="Download"
                                                >
                                                    <Download className="w-4 h-4 text-gray-600" />
                                                </a>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-muted-foreground text-sm">No files attached</p>
                            )}
                        </div>
                    </motion.div>

                    {/* Sidebar */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="space-y-4"
                    >
                        {/* Submission Info */}
                        <div className="bg-white rounded-xl shadow-sm border p-5 space-y-4">
                            <h2 className="font-heading font-bold text-sm uppercase tracking-wide text-muted-foreground">
                                Submission Details
                            </h2>

                            <div className="flex items-start gap-3">
                                <Calendar className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-xs text-muted-foreground">Submitted</p>
                                    <p className="text-sm font-medium">
                                        {abstract.submittedAt
                                            ? new Date(abstract.submittedAt).toLocaleDateString("en-KE", {
                                                year: "numeric", month: "long", day: "numeric",
                                              })
                                            : "—"}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <Tag className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-xs text-muted-foreground">Category</p>
                                    <p className="text-sm font-medium">{abstract.projectCategory}</p>
                                </div>
                            </div>
                        </div>

                        {/* School & Student */}
                        <div className="bg-white rounded-xl shadow-sm border p-5 space-y-4">
                            <h2 className="font-heading font-bold text-sm uppercase tracking-wide text-muted-foreground">
                                Participants
                            </h2>

                            <div className="flex items-start gap-3">
                                <School className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-xs text-muted-foreground">School</p>
                                    <p className="text-sm font-medium">{abstract.schoolName}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <User className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-xs text-muted-foreground">
                                        {(abstract.studentNames?.length ?? 1) > 1 ? "Students" : "Student"}
                                    </p>
                                    {abstract.studentNames && abstract.studentNames.length > 0 ? (
                                        abstract.studentNames.length === 1 ? (
                                            <p className="text-sm font-medium">{abstract.studentNames[0]}</p>
                                        ) : (
                                            <ul className="space-y-0.5">
                                                {abstract.studentNames.map((name, i) => (
                                                    <li key={i} className="text-sm font-medium">{name}</li>
                                                ))}
                                            </ul>
                                        )
                                    ) : (
                                        <p className="text-sm font-medium">{abstract.studentName ?? "—"}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Teacher Contact */}
                        <div className="bg-white rounded-xl shadow-sm border p-5 space-y-4">
                            <h2 className="font-heading font-bold text-sm uppercase tracking-wide text-muted-foreground">
                                Teacher / Supervisor
                            </h2>

                            <div className="flex items-start gap-3">
                                <User className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-xs text-muted-foreground">Name</p>
                                    <p className="text-sm font-medium">{abstract.teacherName}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <Mail className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-xs text-muted-foreground">Email</p>
                                    <a
                                        href={`mailto:${abstract.teacherEmail}`}
                                        className="text-sm font-medium text-primary hover:underline break-all"
                                    >
                                        {abstract.teacherEmail}
                                    </a>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <Phone className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-xs text-muted-foreground">Phone</p>
                                    <a
                                        href={`tel:${abstract.teacherContact}`}
                                        className="text-sm font-medium text-primary hover:underline"
                                    >
                                        {abstract.teacherContact}
                                    </a>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>

            {selectedFile && (
                <FilePreviewModal
                    abstract={{
                        title: selectedFile.abstract.projectTitle,
                        author: selectedFile.abstract.teacherName,
                        email: selectedFile.abstract.teacherEmail,
                        category: selectedFile.abstract.projectCategory,
                        description: selectedFile.abstract.projectDescription,
                        fileType: getFileTypeFromMimeType(selectedFile.file.mimeType),
                        viewUrl: selectedFile.file.url,
                        downloadUrl: selectedFile.file.url,
                        fileName: selectedFile.file.originalName,
                        fileSize: selectedFile.file.size,
                        submittedAt: selectedFile.abstract.submittedAt,
                        status: selectedFile.abstract.status,
                    }}
                    onClose={() => setSelectedFile(null)}
                />
            )}
        </AdminLayout>
    );
};

export default AdminAbstractDetail;
