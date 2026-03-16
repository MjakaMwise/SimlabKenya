import { motion } from "framer-motion";
import { useState } from "react";
import { Upload, FileText, CheckCircle2, XCircle, X, Plus, Trash2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";

const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.oasis.opendocument.text",
  "text/plain",
];

const PROJECT_CATEGORIES = [
  "Biology",
  "Chemistry",
  "Physics",
  "Engineering",
  "Environmental Science",
  "Mathematics",
  "Technology & IT",
  "Medicine & Health",
  "Agriculture",
  "Other",
];

const Abstract = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    schoolName: "",
    teacherName: "",
    teacherEmail: "",
    teacherContact: "",
    projectTitle: "",
    projectDescription: "",
    projectCategory: "",
  });
  const [studentNames, setStudentNames] = useState<string[]>([""]);
  const [abstractFiles, setAbstractFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<"success" | "error" | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCategoryChange = (value: string) => {
    setFormData((prev) => ({ ...prev, projectCategory: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    const valid: File[] = [];

    for (const file of selected) {
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: `"${file.name}" is not a supported document type — skipped`,
          variant: "destructive",
        });
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `"${file.name}" exceeds 5MB — skipped`,
          variant: "destructive",
        });
        continue;
      }
      valid.push(file);
    }

    if (valid.length > 0) {
      setAbstractFiles((prev) => {
        const existing = new Set(prev.map((f) => f.name));
        return [...prev, ...valid.filter((f) => !existing.has(f.name))];
      });
    }
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    setAbstractFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[\d\s\+\-\(\)]{7,15}$/;

    const filledStudents = studentNames.map((s) => s.trim()).filter(Boolean);
    if (
      !formData.schoolName.trim() ||
      filledStudents.length === 0 ||
      !formData.teacherName.trim() ||
      !formData.teacherEmail.trim() ||
      !formData.teacherContact.trim() ||
      !formData.projectTitle.trim() ||
      !formData.projectDescription.trim() ||
      !formData.projectCategory ||
      abstractFiles.length === 0
    ) {
      toast({
        title: "Missing fields",
        description: "Please fill in all fields and upload at least one abstract",
        variant: "destructive",
      });
      return;
    }

    if (!emailRegex.test(formData.teacherEmail.trim())) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address for the teacher/patron",
        variant: "destructive",
      });
      return;
    }

    if (!phoneRegex.test(formData.teacherContact.trim())) {
      toast({
        title: "Invalid phone number",
        description: "Please enter a valid phone number",
        variant: "destructive",
      });
      return;
    }

    if (formData.projectTitle.trim().length < 5) {
      toast({
        title: "Project title too short",
        description: "Please enter a more descriptive project title",
        variant: "destructive",
      });
      return;
    }

    if (formData.projectDescription.trim().length < 30) {
      toast({
        title: "Description too short",
        description: "Please provide at least 30 characters for the project description",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    setSubmissionStatus(null);

    try {
      // Build multipart form — backend handles Cloudinary upload, Firestore save, and emails
      const body = new FormData();
      body.append("schoolName", formData.schoolName.trim());
      filledStudents.forEach((name) => body.append("studentNames", name));
      body.append("teacherName", formData.teacherName.trim());
      body.append("teacherEmail", formData.teacherEmail.trim().toLowerCase());
      body.append("teacherContact", formData.teacherContact.trim());
      body.append("projectTitle", formData.projectTitle.trim());
      body.append("projectDescription", formData.projectDescription.trim());
      body.append("projectCategory", formData.projectCategory);
      abstractFiles.forEach((file) => body.append("files", file));

      const res = await fetch("/api/abstracts", { method: "POST", body });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Submission failed");
      }

      setSubmissionStatus("success");
      toast({
        title: "Abstract submitted successfully!",
        description: "Thank you for your submission. We will review it and get back to you soon.",
      });

      setFormData({
        schoolName: "",
        teacherName: "",
        teacherEmail: "",
        teacherContact: "",
        projectTitle: "",
        projectDescription: "",
        projectCategory: "",
      });
      setStudentNames([""]);
      setAbstractFiles([]);
    } catch (error) {
      console.error("Submission error:", error);
      setSubmissionStatus("error");
      toast({
        title: "Submission failed",
        description: "There was an error submitting your abstract. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />
      <PageHero
        title="Science Fair Abstract Submission"
        description="Submit your science fair project abstract and showcase your innovation"
      />

      <main className="flex-grow container-custom py-12">
        <div className="max-w-4xl mx-auto">
          {/* Info Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 p-8">
              <div className="flex gap-4">
                <FileText className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-3">
                    Submit Your Abstract
                  </h2>
                  <p className="text-gray-700 leading-relaxed">
                    We invite students and innovators to share their groundbreaking
                    projects. Please provide detailed information about your project and
                    upload your abstract in PDF or Word format. Our team will review your
                    submission and get back to you with results.
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Form Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            viewport={{ once: true }}
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-900">
                  Name of School *
                </label>
                <Input
                  name="schoolName"
                  value={formData.schoolName}
                  onChange={handleChange}
                  placeholder="Enter your school name"
                  required
                />
              </div>

              {/* Dynamic student names */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-semibold text-gray-900">
                    Student Name(s) *
                  </label>
                  <button
                    type="button"
                    onClick={() => setStudentNames((prev) => [...prev, ""])}
                    className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Student
                  </button>
                </div>
                <div className="space-y-2">
                  {studentNames.map((name, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        value={name}
                        onChange={(e) =>
                          setStudentNames((prev) =>
                            prev.map((v, i) => (i === idx ? e.target.value : v))
                          )
                        }
                        placeholder={idx === 0 ? "Enter student name" : `Student ${idx + 1} name`}
                        required={idx === 0}
                      />
                      {studentNames.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setStudentNames((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="shrink-0 text-gray-400 hover:text-red-500 transition-colors"
                          aria-label="Remove student"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-900">
                    Name of Teacher or Patron *
                  </label>
                  <Input
                    name="teacherName"
                    value={formData.teacherName}
                    onChange={handleChange}
                    placeholder="Enter teacher or patron name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-900">
                    Teacher/Patron Email Address *
                  </label>
                  <Input
                    name="teacherEmail"
                    value={formData.teacherEmail}
                    onChange={handleChange}
                    placeholder="teacher@school.ac.ke"
                    type="email"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-900">
                  Teacher/Patron Phone Number *
                </label>
                <Input
                  name="teacherContact"
                  value={formData.teacherContact}
                  onChange={handleChange}
                  placeholder="+254 7XX XXX XXX"
                  type="tel"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-900">
                  Title of Project *
                </label>
                <Input
                  name="projectTitle"
                  value={formData.projectTitle}
                  onChange={handleChange}
                  placeholder="Enter your project title"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-900">
                  Project Category *
                </label>
                <Select value={formData.projectCategory} onValueChange={handleCategoryChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-900">
                  Brief Description of Project *
                </label>
                <Textarea
                  name="projectDescription"
                  value={formData.projectDescription}
                  onChange={handleChange}
                  placeholder="Provide a brief description of your project (max 500 characters)"
                  maxLength={500}
                  rows={4}
                  required
                />
                <p className="text-xs text-gray-500">
                  {formData.projectDescription.length}/500 characters
                </p>
              </div>

              {/* Abstract Upload */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-900">
                  Abstract Upload (PDF or Word) *
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.odt,.txt"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                    id="abstract-file"
                  />
                  <label htmlFor="abstract-file" className="cursor-pointer block">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary hover:bg-primary/5 transition-colors">
                      <Upload className="w-10 h-10 mx-auto text-gray-400 mb-3" />
                      <p className="text-sm font-medium text-gray-900 mb-1">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">
                        PDF, Word (.doc, .docx), Excel, or text — up to 5MB each, multiple files allowed
                      </p>
                    </div>
                  </label>
                </div>

                {abstractFiles.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {abstractFiles.map((file, i) => (
                      <li
                        key={file.name}
                        className="flex items-center justify-between gap-3 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm"
                      >
                        <span className="flex items-center gap-2 truncate">
                          <FileText className="w-4 h-4 text-primary shrink-0" />
                          <span className="truncate text-gray-800">{file.name}</span>
                          <span className="text-gray-400 shrink-0">
                            ({(file.size / 1024).toFixed(0)} KB)
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFile(i)}
                          className="shrink-0 text-gray-400 hover:text-red-500 transition-colors"
                          aria-label={`Remove ${file.name}`}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="pt-6">
                <Button
                  type="submit"
                  variant="cta"
                  size="lg"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Submitting..." : "Submit Abstract"}
                </Button>
              </div>

              {submissionStatus === "success" && (
                <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-green-800">Submission Successful!</p>
                    <p className="text-sm text-green-700 mt-0.5">
                      Your abstract has been received. We will review it and get back to you soon.
                    </p>
                  </div>
                </div>
              )}

              {submissionStatus === "error" && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-red-800">Submission Failed</p>
                    <p className="text-sm text-red-700 mt-0.5">
                      Something went wrong. Please check your connection and try again.
                    </p>
                  </div>
                </div>
              )}

              <p className="text-xs text-gray-500 text-center">* All fields are required</p>
            </form>
          </motion.div>

          {/* Guidelines Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
            className="mt-16 pt-12 border-t border-gray-200"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Submission Guidelines</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-6 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-3">What to Include</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex gap-2">
                    <span className="text-primary font-bold">•</span>
                    Project objective and goals
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary font-bold">•</span>
                    Methodology and approach
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary font-bold">•</span>
                    Key findings or results
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary font-bold">•</span>
                    Impact and significance
                  </li>
                </ul>
              </Card>

              <Card className="p-6 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-3">Requirements</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex gap-2">
                    <span className="text-primary font-bold">•</span>
                    PDF, Word (.doc, .docx), Excel, or text format
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary font-bold">•</span>
                    Maximum 5MB per file
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary font-bold">•</span>
                    Multiple files allowed
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary font-bold">•</span>
                    200-300 words recommended
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary font-bold">•</span>
                    Clear and concise language
                  </li>
                </ul>
              </Card>
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Abstract;
