import { useState, useRef } from 'react';
import { Logo } from '@/components/Logo';
import { ProgressBar } from '@/components/ProgressBar';
import { ProcessingStatusBadge } from '@/components/Badges';
import { Upload, FileText, ArrowLeft, ArrowRight, Trash2, Loader, CheckCircle2, AlertCircle, Eye } from 'lucide-react';
import { uploadDocument, getDocuments, processDocument, deleteDocument, getDocumentDownloadUrl } from '@/services/documents';
import { toast } from '@/hooks/useToast';
import type { MedicalDocument, DocumentType } from '@/types';

interface DocumentUploadPageProps {
  patientId: string;
  onComplete: () => void;
  onBack: () => void;
}

const DOC_TYPES: { value: DocumentType; label: string }[] = [
  { value: 'prescription', label: 'Prescription' },
  { value: 'blood_report', label: 'Blood Report' },
  { value: 'lab_report', label: 'Lab Report' },
  { value: 'discharge_summary', label: 'Discharge Summary' },
  { value: 'scan_report', label: 'Scan Report' },
  { value: 'medical_certificate', label: 'Medical Certificate' },
  { value: 'other', label: 'Other' },
];

export function DocumentUploadPage({ patientId, onComplete, onBack }: DocumentUploadPageProps) {
  const [documents, setDocuments] = useState<MedicalDocument[]>([]);
  const [selectedType, setSelectedType] = useState<DocumentType>('prescription');
  const [uploading, setUploading] = useState(false);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function loadDocuments() {
    try {
      const docs = await getDocuments(patientId);
      setDocuments(docs);
    } catch (err) {
      console.error(err);
    }
    setLoaded(true);
  }

  if (!loaded) {
    loadDocuments();
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const doc = await uploadDocument(file, patientId, selectedType);
        setDocuments((prev) => [doc, ...prev]);
        // Process the document
        setProcessingIds((prev) => new Set(prev).add(doc.id));
        try {
          await processDocument(doc.id, patientId, doc.file_name);
          const updatedDocs = await getDocuments(patientId);
          setDocuments(updatedDocs);
        } catch (err) {
          toast('error', `Could not process ${doc.file_name}. You can try again later.`);
          console.error(err);
        } finally {
          setProcessingIds((prev) => {
            const next = new Set(prev);
            next.delete(doc.id);
            return next;
          });
        }
      }
      toast('success', 'Document(s) uploaded successfully');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      toast('error', message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDelete(doc: MedicalDocument) {
    if (!confirm('Are you sure you want to delete this document?')) return;
    try {
      await deleteDocument(doc.id, doc.storage_path);
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      toast('success', 'Document deleted');
    } catch (err) {
      toast('error', 'Could not delete document');
      console.error(err);
    }
  }

  async function handleView(doc: MedicalDocument) {
    try {
      const url = await getDocumentDownloadUrl(doc.storage_path);
      window.open(url, '_blank');
    } catch (err) {
      toast('error', 'Could not open document');
      console.error(err);
    }
  }

  async function handleReprocess(doc: MedicalDocument) {
    setProcessingIds((prev) => new Set(prev).add(doc.id));
    try {
      await processDocument(doc.id, patientId, doc.file_name);
      const updatedDocs = await getDocuments(patientId);
      setDocuments(updatedDocs);
      toast('success', 'Document reprocessed');
    } catch (err) {
      toast('error', 'Could not reprocess document');
      console.error(err);
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(doc.id);
        return next;
      });
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <header className="px-6 py-5 flex items-center justify-between">
        <Logo size="md" />
        <ProgressBar current={6} total={6} label="Document Upload" />
      </header>

      <main className="flex-1 flex items-start justify-center px-6 py-8 overflow-y-auto">
        <div className="max-w-3xl w-full">
          <div className="text-center mb-6 animate-fade-in">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-100 mb-3">
              <FileText className="w-7 h-7 text-primary-600" />
            </div>
            <h1 className="text-2xl font-bold text-neutral-900 mb-1">Upload Medical Documents</h1>
            <p className="text-sm text-neutral-500">Upload prescriptions, lab reports, and other medical records (PDF, JPG, PNG)</p>
          </div>

          {/* Upload area */}
          <div className="card p-6 mb-6 animate-slide-up">
            <div className="mb-4">
              <label className="label">Document Type</label>
              <select
                className="input"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as DocumentType)}
              >
                {DOC_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-neutral-300 rounded-xl p-8 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-colors"
            >
              {uploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader className="w-8 h-8 text-primary-600 animate-spin" />
                  <p className="text-sm text-neutral-600">Uploading...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-8 h-8 text-neutral-400" />
                  <p className="text-base font-medium text-neutral-700">Click to upload documents</p>
                  <p className="text-xs text-neutral-400">PDF, JPG, PNG — up to 10MB each</p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Document list */}
          {documents.length > 0 && (
            <div className="space-y-3 mb-6">
              <h2 className="section-title">Uploaded Documents ({documents.length})</h2>
              {documents.map((doc) => (
                <div key={doc.id} className="card p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-neutral-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900 truncate">{doc.file_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <ProcessingStatusBadge status={
                        processingIds.has(doc.id) ? 'processing' : doc.processing_status
                      } />
                      <span className="text-xs text-neutral-400">
                        {new Date(doc.uploaded_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {doc.processing_status === 'processed' && (
                      <CheckCircle2 className="w-5 h-5 text-success-500" />
                    )}
                    {doc.processing_status === 'failed' && (
                      <button
                        onClick={() => handleReprocess(doc)}
                        className="btn-ghost text-xs"
                        title="Retry processing"
                      >
                        <AlertCircle className="w-4 h-4 text-error-500" />
                      </button>
                    )}
                    <button onClick={() => handleView(doc)} className="btn-ghost" title="View document">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(doc)} className="btn-ghost text-error-500" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {loaded && documents.length === 0 && (
            <div className="card p-8 text-center text-neutral-400 mb-6">
              <p className="text-sm">No documents uploaded yet. You can skip this step if you don't have any.</p>
            </div>
          )}

          <div className="flex justify-between">
            <button onClick={onBack} className="btn-ghost">
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button onClick={onComplete} className="btn-primary">
              Continue to Timeline
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
