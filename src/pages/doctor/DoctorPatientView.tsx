import { useState, useEffect } from 'react';
import { ArrowLeft, User, FileText, Calendar, Pill, FlaskConical, AlertTriangle, Edit3, CheckCheck, Eye, Stethoscope } from 'lucide-react';
import { PriorityBadge, StatusBadge, ProcessingStatusBadge } from '@/components/Badges';
import { getPatient } from '@/services/patients';
import { getClinicalHistory, getClinicalHistoryById, getClinicalSummary, updateClinicalSummary, acknowledgeRedFlag, getRedFlagAlertsForPatient } from '@/services/clinical-history';
import { getDocuments, getAllExtractions, getTimelineEvents, getDocumentDownloadUrl } from '@/services/documents';
import { createDoctorReview, updateDoctorReview, getDoctorReview, updatePatient, logAudit } from '@/services/patients';
import { toast } from '@/hooks/useToast';
import type { Patient, ClinicalHistory, ClinicalSummary, MedicalDocument, DocumentExtraction, TimelineEvent, RedFlagAlert } from '@/types';

interface DoctorPatientViewProps {
  patientId: string;
  doctorId: string;
  onBack: () => void;
}

type Tab = 'info' | 'history' | 'documents' | 'timeline' | 'summary';

export function DoctorPatientView({ patientId, doctorId, onBack }: DoctorPatientViewProps) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [history, setHistory] = useState<ClinicalHistory | null>(null);
  const [summary, setSummary] = useState<ClinicalSummary | null>(null);
  const [documents, setDocuments] = useState<MedicalDocument[]>([]);
  const [extractions, setExtractions] = useState<DocumentExtraction[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [alerts, setAlerts] = useState<RedFlagAlert[]>([]);
  const [review, setReview] = useState<Record<string, unknown> | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('info');
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [p, h, s, docs, exts, events, flagAlerts, rev] = await Promise.all([
          getPatient(patientId),
          getClinicalHistory(patientId).then((h) => h ? getClinicalHistoryById(h.id) : null),
          getClinicalSummary(patientId),
          getDocuments(patientId),
          getAllExtractions(patientId),
          getTimelineEvents(patientId),
          getRedFlagAlertsForPatient(patientId),
          getDoctorReview(patientId),
        ]);
        setPatient(p);
        setHistory(h as ClinicalHistory | null);
        setSummary(s as ClinicalSummary | null);
        setDocuments(docs);
        setExtractions(exts);
        setTimeline(events);
        setAlerts(flagAlerts);
        setReview(rev);

        if (s) {
          setEditData({
            chief_complaint: s.chief_complaint || '',
            history_of_present_illness: s.history_of_present_illness || '',
            past_medical_history: s.past_medical_history || '',
            past_surgical_history: s.past_surgical_history || '',
            drug_history: s.drug_history || '',
            allergy_history: s.allergy_history || '',
            family_history: s.family_history || '',
            personal_history: s.personal_history || '',
            review_of_systems: s.review_of_systems || '',
            previous_investigations: s.previous_investigations || '',
            current_medications: s.current_medications || '',
            important_document_findings: s.important_document_findings || '',
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [patientId]);

  async function handleSaveEdit() {
    if (!summary) return;
    try {
      await updateClinicalSummary(summary.id, editData);
      const updated = { ...summary, ...editData } as ClinicalSummary;
      setSummary(updated);
      setEditing(false);
      toast('success', 'Summary updated');
    } catch (err) {
      toast('error', 'Could not save changes');
      console.error(err);
    }
  }

  async function handleConfirmSummary() {
    if (!summary) return;
    try {
      await updateClinicalSummary(summary.id, { is_verified: true, verified_by: doctorId, verified_at: new Date().toISOString() });
      setSummary({ ...summary, is_verified: true, verified_by: doctorId, verified_at: new Date().toISOString() });
      if (review) {
        await updateDoctorReview((review as { id: string }).id, { review_status: 'confirmed', reviewed_at: new Date().toISOString() });
      } else {
        await createDoctorReview({ patient_id: patientId, doctor_id: doctorId, clinical_summary_id: summary.id, review_status: 'confirmed' });
      }
      await updatePatient(patientId, { status: 'reviewed' });
      await logAudit({ actor_type: 'doctor', action: 'confirmed_summary', patient_id: patientId, details: { doctor_id: doctorId } });
      toast('success', 'Summary confirmed and patient marked as reviewed');
    } catch (err) {
      toast('error', 'Could not confirm summary');
      console.error(err);
    }
  }

  async function handleMarkReviewed() {
    try {
      if (review) {
        await updateDoctorReview((review as { id: string }).id, { review_status: 'reviewed', reviewed_at: new Date().toISOString() });
      } else {
        await createDoctorReview({ patient_id: patientId, doctor_id: doctorId, review_status: 'reviewed' });
      }
      await updatePatient(patientId, { status: 'reviewed' });
      await logAudit({ actor_type: 'doctor', action: 'marked_reviewed', patient_id: patientId, details: { doctor_id: doctorId } });
      toast('success', 'Patient marked as reviewed');
    } catch (err) {
      toast('error', 'Could not update review status');
      console.error(err);
    }
  }

  async function handleAcknowledgeAlert(alertId: string) {
    try {
      await acknowledgeRedFlag(alertId, doctorId);
      setAlerts((prev) => prev.map((a) => a.id === alertId ? { ...a, acknowledged: true } : a));
      toast('success', 'Alert acknowledged');
    } catch (err) {
      toast('error', 'Could not acknowledge alert');
      console.error(err);
    }
  }

  async function handleViewDoc(doc: MedicalDocument) {
    try {
      const url = await getDocumentDownloadUrl(doc.storage_path);
      window.open(url, '_blank');
    } catch (err) {
      toast('error', 'Could not open document');
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-sm text-neutral-500">Loading patient...</div>;
  }

  if (!patient) {
    return <div className="p-8 text-center text-sm text-neutral-500">Patient not found</div>;
  }

  const tabs: { key: Tab; label: string; icon: typeof User }[] = [
    { key: 'info', label: 'Patient Info', icon: User },
    { key: 'history', label: 'Clinical History', icon: Stethoscope },
    { key: 'documents', label: 'Documents', icon: FileText },
    { key: 'timeline', label: 'Timeline', icon: Calendar },
    { key: 'summary', label: 'AI Summary', icon: FileText },
  ];

  const summaryFields = [
    { key: 'chief_complaint', label: 'Chief Complaint' },
    { key: 'history_of_present_illness', label: 'History of Present Illness' },
    { key: 'past_medical_history', label: 'Past Medical History' },
    { key: 'past_surgical_history', label: 'Past Surgical History' },
    { key: 'drug_history', label: 'Drug History' },
    { key: 'allergy_history', label: 'Allergy History' },
    { key: 'family_history', label: 'Family History' },
    { key: 'personal_history', label: 'Personal History' },
    { key: 'review_of_systems', label: 'Review of Systems' },
    { key: 'previous_investigations', label: 'Previous Investigations' },
    { key: 'current_medications', label: 'Current Medications' },
    { key: 'important_document_findings', label: 'Important Document Findings' },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="btn-ghost">
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div>
            <h1 className="text-xl font-bold text-neutral-900">{patient.full_name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <PriorityBadge priority={patient.priority} />
              <StatusBadge status={patient.status} />
              <span className="text-xs text-neutral-400">{patient.age}y • {patient.gender}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Red flag alerts */}
      {alerts.length > 0 && (
        <div className="card p-4 mb-4 border-l-4 border-l-error-500">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-error-600" />
            <h3 className="text-sm font-semibold text-error-700">Red Flag Alerts ({alerts.length})</h3>
          </div>
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div key={alert.id} className="flex items-center justify-between bg-error-50 rounded-lg p-2">
                <div>
                  <p className="text-sm text-error-700">{alert.flag_description}</p>
                  <p className="text-xs text-neutral-500">{new Date(alert.created_at).toLocaleString()}</p>
                </div>
                {alert.acknowledged ? (
                  <span className="badge-success">Ack</span>
                ) : (
                  <button onClick={() => handleAcknowledgeAlert(alert.id)} className="btn-ghost text-xs text-error-600">
                    Acknowledge
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-neutral-200 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'info' && (
        <div className="card p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div><span className="text-neutral-500">Full Name:</span> <span className="font-medium text-neutral-900">{patient.full_name}</span></div>
            <div><span className="text-neutral-500">Age:</span> <span className="font-medium text-neutral-900">{patient.age || '-'}</span></div>
            <div><span className="text-neutral-500">Gender:</span> <span className="font-medium text-neutral-900 capitalize">{patient.gender || '-'}</span></div>
            <div><span className="text-neutral-500">Phone:</span> <span className="font-medium text-neutral-900">{patient.phone_number || '-'}</span></div>
            <div><span className="text-neutral-500">Blood Group:</span> <span className="font-medium text-neutral-900">{patient.blood_group || '-'}</span></div>
            <div><span className="text-neutral-500">Language:</span> <span className="font-medium text-neutral-900 capitalize">{patient.preferred_language}</span></div>
            <div><span className="text-neutral-500">ABHA ID:</span> <span className="font-medium text-neutral-900">{patient.abha_id || '-'}</span></div>
            <div><span className="text-neutral-500">Emergency:</span> <span className="font-medium text-neutral-900">{patient.emergency_contact_name || '-'} {patient.emergency_contact_phone || ''}</span></div>
            <div className="md:col-span-3"><span className="text-neutral-500">Address:</span> <span className="font-medium text-neutral-900">{patient.address || '-'}</span></div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="card p-6">
          {history ? (
            <div>
              <h3 className="section-title mb-3">Conversation History</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-thin">
                {history.conversation_history?.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                      msg.role === 'user' ? 'bg-secondary-50 text-neutral-800' : 'bg-neutral-100 text-neutral-700'
                    }`}>
                      <p className="text-xs font-medium text-neutral-400 mb-0.5 capitalize">{msg.role}</p>
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
              {history.structured_data && Object.keys(history.structured_data).length > 0 && (
                <div className="mt-4 pt-4 border-t border-neutral-200">
                  <h3 className="section-title mb-3">Structured Data</h3>
                  <div className="space-y-2 text-sm">
                    {Object.entries(history.structured_data).map(([key, value]) => (
                      value && (
                        <div key={key}>
                          <span className="text-neutral-500 capitalize">{key.replace(/_/g, ' ')}:</span>{' '}
                          <span className="text-neutral-800">{String(value)}</span>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-neutral-400">No clinical history recorded</p>
          )}
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="space-y-3">
          {documents.length === 0 ? (
            <div className="card p-8 text-center text-sm text-neutral-400">No documents uploaded</div>
          ) : (
            documents.map((doc) => {
              const extraction = extractions.find((e) => e.document_id === doc.id);
              return (
                <div key={doc.id} className="card p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <FileText className="w-5 h-5 text-neutral-400" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-neutral-900">{doc.file_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <ProcessingStatusBadge status={doc.processing_status} />
                        <span className="text-xs text-neutral-400">{new Date(doc.uploaded_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <button onClick={() => handleViewDoc(doc)} className="btn-ghost text-sm">
                      <Eye className="w-4 h-4" /> View
                    </button>
                  </div>
                  {extraction && (
                    <div className="mt-3 pt-3 border-t border-neutral-100 space-y-2">
                      {extraction.extracted_medications?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-neutral-500 flex items-center gap-1 mb-1"><Pill className="w-3 h-3" /> Medications</p>
                          <div className="flex flex-wrap gap-1">
                            {extraction.extracted_medications.map((med, i) => (
                              <span key={i} className="badge-info">{med.name} {med.dosage || ''}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {extraction.extracted_investigations?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-neutral-500 flex items-center gap-1 mb-1"><FlaskConical className="w-3 h-3" /> Investigations</p>
                          <div className="flex flex-wrap gap-1">
                            {extraction.extracted_investigations.map((inv, i) => (
                              <span key={i} className={`badge ${inv.is_abnormal ? 'badge-error' : 'badge-neutral'}`}>
                                {inv.test_name}: {inv.value} {inv.unit || ''}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {extraction.extracted_diagnoses?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-neutral-500 mb-1">Diagnoses</p>
                          <div className="flex flex-wrap gap-1">
                            {extraction.extracted_diagnoses.map((d, i) => (
                              <span key={i} className="badge-warning">{d.name}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === 'timeline' && (
        <div className="space-y-3">
          {timeline.length === 0 ? (
            <div className="card p-8 text-center text-sm text-neutral-400">No timeline events</div>
          ) : (
            timeline.map((event) => (
              <div key={event.id} className="card p-4 flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5 text-primary-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-neutral-900">{event.event_title}</p>
                  {event.event_description && <p className="text-xs text-neutral-500 mt-0.5">{event.event_description}</p>}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-neutral-400">{event.event_date ? new Date(event.event_date).toLocaleDateString() : 'No date'}</span>
                    <span className="text-xs text-neutral-400 capitalize">• {event.event_type.replace('_', ' ')}</span>
                    <span className="text-xs text-neutral-400">• {event.source}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'summary' && (
        <div>
          <div className="card p-4 mb-4 bg-warning-50 border-warning-200">
            <p className="text-sm text-neutral-700">
              <strong>AI-generated draft — physician verification required.</strong> This summary must be reviewed and confirmed by a qualified healthcare professional.
            </p>
          </div>

          {summary ? (
            <div className="card p-6">
              <div className="space-y-4">
                {summaryFields.map((field) => {
                  const value = editing ? editData[field.key] : (summary as unknown as Record<string, string>)[field.key];
                  return (
                    <div key={field.key}>
                      <label className="label">{field.label}</label>
                      {editing ? (
                        <textarea
                          className="input"
                          value={editData[field.key] || ''}
                          onChange={(e) => setEditData((prev) => ({ ...prev, [field.key]: e.target.value }))}
                          rows={2}
                        />
                      ) : (
                        <p className="text-sm text-neutral-700 whitespace-pre-wrap">{value || '-'}</p>
                      )}
                    </div>
                  );
                })}

                {summary.red_flags?.length > 0 && (
                  <div>
                    <label className="label flex items-center gap-1"><AlertTriangle className="w-4 h-4 text-error-500" /> Red Flags</label>
                    <ul className="space-y-1">
                      {summary.red_flags.map((flag, i) => (
                        <li key={i} className="text-sm text-error-700">• {flag.description || flag.type}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {summary.missing_information?.length > 0 && (
                  <div>
                    <label className="label">Missing Information</label>
                    <ul className="space-y-1">
                      {summary.missing_information.map((info, i) => (
                        <li key={i} className="text-sm text-neutral-600">• {info}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {summary.is_verified && (
                <div className="mt-4 p-3 bg-success-50 rounded-lg flex items-center gap-2">
                  <CheckCheck className="w-5 h-5 text-success-600" />
                  <span className="text-sm text-success-700">Summary verified by doctor</span>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-neutral-200">
                {!summary.is_verified && (
                  <>
                    {editing ? (
                      <>
                        <button onClick={handleSaveEdit} className="btn-primary">Save Changes</button>
                        <button onClick={() => setEditing(false)} className="btn-secondary">Cancel</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => setEditing(true)} className="btn-secondary">
                          <Edit3 className="w-4 h-4" /> Edit Summary
                        </button>
                        <button onClick={handleConfirmSummary} className="btn-primary">
                          <CheckCheck className="w-4 h-4" /> Confirm Summary
                        </button>
                      </>
                    )}
                  </>
                )}
                <button onClick={handleMarkReviewed} className="btn-ghost">
                  Mark Reviewed
                </button>
              </div>
            </div>
          ) : (
            <div className="card p-8 text-center text-sm text-neutral-400">No AI summary generated yet</div>
          )}
        </div>
      )}
    </div>
  );
}
