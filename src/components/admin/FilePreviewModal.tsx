import { useState, useEffect } from "react";
import { ExternalLink, Download, Loader2, AlertCircle, FileText, Info } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

export interface AbstractPreview {
  title: string;
  author: string;
  email?: string;
  category?: string;
  description?: string;
  fileType?: "pdf" | "docx";
  viewUrl?: string;
  downloadUrl?: string;
  fileName?: string;
  fileSize?: number;
  submittedAt?: string;
  status?: string;
  emailSent?: boolean;
  emailHistory?: Array<{ status: string; sentAt: string; message: string }>;
}

interface FilePreviewModalProps {
  abstract: AbstractPreview;
  onClose: () => void;
}

const statusClasses: Record<string, string> = {
  pending:  "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  review:   "bg-blue-100 text-blue-800",
};

function formatSize(bytes?: number): string {
  if (!bytes) return "Unknown";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FilePreviewModal({ abstract, onClose }: FilePreviewModalProps) {
  const [loading, setLoading]   = useState(true);
  const [docxHtml, setDocxHtml] = useState<string | null>(null);
  const [error, setError]       = useState<string | null>(null);

  const isPdf  = abstract.fileType === "pdf";
  const isDocx = abstract.fileType === "docx";

  useEffect(() => {
    if (isDocx && abstract.viewUrl) {
      convertDocx();
    } else {
      setLoading(false);
    }
  }, []);

  async function convertDocx() {
    try {
      setLoading(true);
      const mammoth = await import("mammoth");
      const res = await fetch(abstract.viewUrl!);
      const arrayBuffer = await res.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      setDocxHtml(result.value);
    } catch {
      setError("Could not load document preview");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogTitle className="sr-only">{abstract.title}</DialogTitle>

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b bg-gray-50 shrink-0 pr-14">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-gray-900 truncate">{abstract.title}</h2>
            <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
              <span>{abstract.author}</span>
              {abstract.category && <><span>·</span><span>{abstract.category}</span></>}
              {abstract.fileType && (
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                  abstract.fileType === "pdf"
                    ? "bg-red-100 text-red-700"
                    : "bg-blue-100 text-blue-700"
                }`}>
                  {abstract.fileType.toUpperCase()}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Tabs + Actions bar */}
        <Tabs defaultValue="preview" className="flex flex-col flex-1 min-h-0">
          <div className="flex items-center border-b shrink-0 bg-white px-2">
            <TabsList className="h-auto p-0 bg-transparent rounded-none gap-0">
              <TabsTrigger
                value="preview"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 font-medium"
              >
                <FileText className="w-4 h-4 mr-1.5" /> Preview
              </TabsTrigger>
              <TabsTrigger
                value="details"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 font-medium"
              >
                <Info className="w-4 h-4 mr-1.5" /> Details
              </TabsTrigger>
            </TabsList>

            <div className="ml-auto flex items-center gap-2 px-2 py-1.5">
              {abstract.viewUrl && (
                <Button variant="outline" size="sm" asChild>
                  <a href={abstract.viewUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="w-3.5 h-3.5 mr-1" /> Open
                  </a>
                </Button>
              )}
              {abstract.downloadUrl && (
                <Button variant="outline" size="sm" asChild>
                  <a href={abstract.downloadUrl} download={abstract.fileName}>
                    <Download className="w-3.5 h-3.5 mr-1" /> Download
                  </a>
                </Button>
              )}
            </div>
          </div>

          {/* Preview Tab */}
          <TabsContent value="preview" className="flex-1 min-h-0 m-0 data-[state=active]:flex data-[state=active]:flex-col">
            {!abstract.viewUrl ? (
              <div className="flex flex-col items-center justify-center flex-1 gap-3 text-muted-foreground">
                <FileText className="w-12 h-12 opacity-40" />
                <p>No file attached</p>
              </div>
            ) : loading ? (
              <div className="flex flex-col items-center justify-center flex-1 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Loading preview...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center flex-1 gap-3">
                <AlertCircle className="w-8 h-8 text-destructive" />
                <p className="text-destructive">{error}</p>
                <Button variant="outline" size="sm" asChild>
                  <a href={abstract.viewUrl} target="_blank" rel="noreferrer">Open in new tab</a>
                </Button>
              </div>
            ) : isPdf ? (
              <iframe
                src={`${abstract.viewUrl}#toolbar=0`}
                className="flex-1 w-full border-none"
                title={abstract.title}
                onLoad={() => setLoading(false)}
                onError={() => { setError("PDF preview unavailable"); setLoading(false); }}
              />
            ) : isDocx && docxHtml ? (
              <div className="flex-1 overflow-auto">
                <div
                  className="p-8 max-w-3xl mx-auto leading-relaxed text-gray-700 prose prose-sm"
                  dangerouslySetInnerHTML={{ __html: docxHtml }}
                />
              </div>
            ) : null}
          </TabsContent>

          {/* Details Tab */}
          <TabsContent value="details" className="flex-1 min-h-0 m-0 overflow-auto">
            <div className="p-6 max-w-2xl">
              <div className="divide-y">
                <DetailRow label="Title"     value={abstract.title} />
                <DetailRow label="Author"    value={abstract.author} />
                {abstract.email    && <DetailRow label="Email"     value={abstract.email} />}
                {abstract.category && <DetailRow label="Category"  value={abstract.category} />}
                {abstract.fileName && <DetailRow label="File Name" value={abstract.fileName} />}
                {abstract.fileType && (
                  <DetailRow label="File Type" value={abstract.fileType.toUpperCase()} />
                )}
                {abstract.fileSize !== undefined && (
                  <DetailRow label="File Size" value={formatSize(abstract.fileSize)} />
                )}
                {abstract.submittedAt && (
                  <DetailRow
                    label="Submitted"
                    value={new Date(abstract.submittedAt).toLocaleString("en-KE", {
                      timeZone: "Africa/Nairobi",
                    })}
                  />
                )}
                {abstract.status && (
                  <DetailRow
                    label="Status"
                    value={
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                        statusClasses[abstract.status] || "bg-gray-100 text-gray-700"
                      }`}>
                        {abstract.status}
                      </span>
                    }
                  />
                )}
                {abstract.emailSent !== undefined && (
                  <DetailRow label="Email Sent" value={abstract.emailSent ? "✅ Yes" : "❌ No"} />
                )}
              </div>

              {abstract.description && (
                <div className="mt-6 p-4 bg-blue-50 border-l-4 border-primary rounded-r-lg">
                  <p className="font-semibold text-sm text-gray-700 mb-2">Abstract Description</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{abstract.description}</p>
                </div>
              )}

              {abstract.emailHistory && abstract.emailHistory.length > 0 && (
                <div className="mt-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg">
                  <p className="font-semibold text-sm text-gray-700 mb-3">
                    Email History ({abstract.emailHistory.length})
                  </p>
                  <div className="space-y-3">
                    {abstract.emailHistory.map((email, i) => (
                      <div key={i} className="pt-3 first:pt-0 border-t first:border-0 border-yellow-200">
                        <div className="flex items-center gap-2">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                            statusClasses[email.status] || "bg-gray-100 text-gray-700"
                          }`}>
                            {email.status}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(email.sentAt).toLocaleString("en-KE", {
                              timeZone: "Africa/Nairobi",
                            })}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-600">{email.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex py-3 text-sm">
      <span className="w-36 font-semibold text-gray-500 shrink-0">{label}</span>
      <span className="text-gray-800">{value}</span>
    </div>
  );
}
