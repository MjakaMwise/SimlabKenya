import { useState } from "react";
import { PageHead, SectionHead, CheckList } from "@/site/ui";
import { useSite } from "@/site/SiteContext";

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
  const { toast: say } = useSite();
  const toast = ({ title, description }: { title: string; description?: string; variant?: string }) =>
    say(description ? `${title}: ${description}` : title);
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
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
        const message = err.details
          ? `${err.error}: ${err.details}`
          : err.error || "Submission failed";
        throw new Error(message);
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
    <>
      <PageHead title="Abstract Submission" sub="Submit your science fair project abstract and showcase your innovation." />

      <section className="sec">
        <div className="wrap cols">
          <div>
            <SectionHead title="Submit Your Abstract" lede="We invite students and innovators to share their projects. Give us the details, attach your abstract, and our team will review it and get back to you." />
            <form onSubmit={handleSubmit} noValidate style={{ marginTop: 28 }}>
              <label htmlFor="schoolName">Name of School *
                <input type="text" id="schoolName" name="schoolName" value={formData.schoolName} onChange={handleChange} placeholder="Enter your school name" />
              </label>

              <div style={{ display: "grid", gap: 8 }}>
                <div className="stu" style={{ justifyContent: "space-between" }}>
                  <span className="mono">Student name(s) *</span>
                  <button type="button" className="btn out" style={{ minHeight: 36, padding: "0 14px", fontSize: ".85rem" }} onClick={() => setStudentNames((p) => [...p, ""])}>+ Add student</button>
                </div>
                {studentNames.map((name, idx) => (
                  <div key={idx} className="stu">
                    <input type="text" aria-label={`Student ${idx + 1} name`} value={name} placeholder={idx === 0 ? "Enter student name" : `Student ${idx + 1} name`}
                      onChange={(e) => setStudentNames((p) => p.map((v, i) => (i === idx ? e.target.value : v)))} />
                    {studentNames.length > 1 && (
                      <button type="button" className="linkbtn" aria-label="Remove student" onClick={() => setStudentNames((p) => p.filter((_, i) => i !== idx))}>Remove</button>
                    )}
                  </div>
                ))}
              </div>

              <div className="two">
                <label htmlFor="teacherName">Teacher or Patron *
                  <input type="text" id="teacherName" name="teacherName" value={formData.teacherName} onChange={handleChange} placeholder="Full name" />
                </label>
                <label htmlFor="teacherEmail">Teacher/Patron Email *
                  <input type="email" id="teacherEmail" name="teacherEmail" value={formData.teacherEmail} onChange={handleChange} placeholder="teacher@school.ac.ke" />
                </label>
              </div>
              <label htmlFor="teacherContact">Teacher/Patron Phone *
                <input type="tel" id="teacherContact" name="teacherContact" value={formData.teacherContact} onChange={handleChange} placeholder="+254 7XX XXX XXX" />
              </label>
              <label htmlFor="projectTitle">Title of Project *
                <input type="text" id="projectTitle" name="projectTitle" value={formData.projectTitle} onChange={handleChange} placeholder="Enter your project title" />
              </label>
              <label htmlFor="projectCategory">Project Category *
                <select id="projectCategory" name="projectCategory" value={formData.projectCategory} onChange={handleChange}>
                  <option value="">Select a category</option>
                  {PROJECT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label htmlFor="projectDescription">Brief Description of Project *
                <textarea id="projectDescription" name="projectDescription" maxLength={500} rows={4} value={formData.projectDescription} onChange={handleChange} placeholder="A brief description of your project (max 500 characters)" />
                <span className="hint">{formData.projectDescription.length}/500 characters</span>
              </label>

              <div style={{ display: "grid", gap: 10 }}>
                <label className="drop" htmlFor="abstract-file">
                  <b>Click to upload your abstract *</b>
                  <small>PDF, Word, Excel or text. Up to 5MB each, multiple files allowed.</small>
                  <input type="file" id="abstract-file" accept=".pdf,.doc,.docx,.xls,.xlsx,.odt,.txt" multiple onChange={handleFileChange} />
                </label>
                {abstractFiles.length > 0 && (
                  <ul className="flist">
                    {abstractFiles.map((file, i) => (
                      <li key={file.name}>
                        <span>{file.name} <small>({(file.size / 1024).toFixed(0)} KB)</small></span>
                        <button type="button" className="linkbtn" aria-label={`Remove ${file.name}`} onClick={() => removeFile(i)}>Remove</button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div><button className="btn go xl" type="submit" disabled={isSubmitting}>{isSubmitting ? "Submitting..." : "Submit abstract"}</button></div>

              {submissionStatus === "success" && (
                <div className="alert ok" role="status"><div><b>Submission successful!</b>Your abstract has been received. A confirmation email is on its way.</div></div>
              )}
              {submissionStatus === "error" && (
                <div className="alert bad" role="alert"><div><b>Submission failed</b>Something went wrong. Please check your connection and try again.</div></div>
              )}
              <p className="hint">* All fields are required.</p>
            </form>
          </div>

          <div style={{ display: "grid", gap: 22 }}>
            <div className="card">
              <h3 style={{ color: "var(--head)", marginBottom: 12 }}>What to include</h3>
              <CheckList items={["Project objective and goals", "Methodology and approach", "Key findings or results", "Impact and significance"]} />
            </div>
            <div className="card">
              <h3 style={{ color: "var(--head)", marginBottom: 12 }}>Requirements</h3>
              <CheckList items={["PDF, Word, Excel or text format", "Maximum 5MB per file", "Multiple files allowed", "200 to 300 words recommended", "Clear and concise language"]} />
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Abstract;
