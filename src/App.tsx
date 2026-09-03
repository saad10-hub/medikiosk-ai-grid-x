import { useState } from 'react';
import { ToastContainer } from '@/components/ToastContainer';
import { useSession } from '@/hooks/useSession';
import { recordConsent } from '@/services/patients';
import { toast } from '@/hooks/useToast';
import type { Language, HistoryMode, StructuredClinicalData, ClinicalSummaryData, AYUSHData, Patient, MedicalDocument, DocumentExtraction, TimelineEvent, ClinicalSummary } from '@/types';

// Patient pages
import { WelcomePage } from '@/pages/patient/WelcomePage';
import { LanguagePage } from '@/pages/patient/LanguagePage';
import { ConsentPage } from '@/pages/patient/ConsentPage';
import { ModeSelectPage } from '@/pages/patient/ModeSelectPage';
import { PatientInfoPage } from '@/pages/patient/PatientInfoPage';
import { ChiefComplaintPage } from '@/pages/patient/ChiefComplaintPage';
import { ClinicalHistoryPage } from '@/pages/patient/ClinicalHistoryPage';
import { AYUSHPage } from '@/pages/patient/AYUSHPage';
import { DocumentUploadPage } from '@/pages/patient/DocumentUploadPage';
import { TimelinePage } from '@/pages/patient/TimelinePage';
import { SummaryPage } from '@/pages/patient/SummaryPage';
import { ReviewPage } from '@/pages/patient/ReviewPage';

// Staff pages
import { StaffLoginPage } from '@/pages/staff/StaffLoginPage';
import { DoctorDashboard } from '@/pages/doctor/DoctorDashboard';
import { DoctorPatientView } from '@/pages/doctor/DoctorPatientView';
import { FHIRView } from '@/pages/doctor/FHIRView';
import { SettingsPage } from '@/pages/doctor/SettingsPage';
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { DoctorLayout } from '@/layouts/DoctorLayout';

// Demo data
import { DEMO_PATIENT, DEMO_SUMMARY, DEMO_STRUCTURED_DATA, DEMO_DOCUMENTS, DEMO_TIMELINE } from '@/services/demo-data';

type PatientStep = 'welcome' | 'language' | 'consent' | 'mode' | 'info' | 'complaint' | 'history' | 'ayush' | 'documents' | 'timeline' | 'summary' | 'review' | 'demo';
type AppView = 'patient' | 'staff-login' | 'doctor' | 'admin';

function App() {
  const { session, loading, setPatientId, signOut } = useSession();
  const [view, setView] = useState<AppView>('patient');
  const [patientStep, setPatientStep] = useState<PatientStep>('welcome');
  const [language, setLanguage] = useState<Language>('en');
  const [historyMode, setHistoryMode] = useState<HistoryMode>('allopathic');
  const [clinicalHistoryId, setClinicalHistoryId] = useState<string>('');
  const [chiefComplaint, setChiefComplaint] = useState<string>('');
  const [structuredData, setStructuredData] = useState<StructuredClinicalData>({});
  const [summary, setSummary] = useState<ClinicalSummaryData | null>(null);
  const [summaryId, setSummaryId] = useState<string | null>(null);
  const [ayushData, setAyushData] = useState<AYUSHData | null>(null);
  const [doctorTab, setDoctorTab] = useState('dashboard');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [showFHIR, setShowFHIR] = useState(false);

  // Auto-switch to doctor/admin view if authenticated
  if (!loading && session.profile && view === 'patient') {
    if (session.profile.role === 'admin') setView('admin');
    else if (session.profile.role === 'doctor') setView('doctor');
  }

  // ============================================================
  // STAFF LOGIN
  // ============================================================
  if (view === 'staff-login') {
    return (
      <>
        <StaffLoginPage
          onBack={() => { setView('patient'); setPatientStep('welcome'); }}
          onLoginSuccess={() => {
            if (session.profile?.role === 'admin') setView('admin');
            else setView('doctor');
          }}
        />
        <ToastContainer />
      </>
    );
  }

  // ============================================================
  // ADMIN DASHBOARD
  // ============================================================
  if (view === 'admin' && session.profile?.role === 'admin') {
    return (
      <>
        <AdminDashboard onSignOut={async () => { await signOut(); setView('patient'); setPatientStep('welcome'); }} />
        <ToastContainer />
      </>
    );
  }

  // ============================================================
  // DOCTOR DASHBOARD
  // ============================================================
  if (view === 'doctor' && session.profile?.role === 'doctor') {
    // Settings tab
    if (doctorTab === 'settings' && !selectedPatientId && !showFHIR) {
      return (
        <>
          <DoctorLayout
            profile={session.profile}
            activeTab={doctorTab}
            onTabChange={setDoctorTab}
            onSignOut={async () => { await signOut(); setView('patient'); setPatientStep('welcome'); }}
          >
            <SettingsPage profile={session.profile} />
          </DoctorLayout>
          <ToastContainer />
        </>
      );
    }

    // FHIR view
    if (showFHIR && selectedPatientId) {
      return (
        <>
          <DoctorLayout
            profile={session.profile}
            activeTab={doctorTab}
            onTabChange={(tab) => { setDoctorTab(tab); setShowFHIR(false); }}
            onSignOut={async () => { await signOut(); setView('patient'); setPatientStep('welcome'); }}
          >
            <FHIRView
              patient={DEMO_PATIENT}
              documents={DEMO_DOCUMENTS}
              timeline={DEMO_TIMELINE}
              summary={null}
              onBack={() => setShowFHIR(false)}
            />
          </DoctorLayout>
          <ToastContainer />
        </>
      );
    }

    // Patient detail view
    if (selectedPatientId) {
      return (
        <>
          <DoctorLayout
            profile={session.profile}
            activeTab={doctorTab}
            onTabChange={(tab) => { setDoctorTab(tab); setSelectedPatientId(null); }}
            onSignOut={async () => { await signOut(); setView('patient'); setPatientStep('welcome'); }}
          >
            <DoctorPatientView
              patientId={selectedPatientId}
              doctorId={session.profile.id}
              onBack={() => setSelectedPatientId(null)}
            />
          </DoctorLayout>
          <ToastContainer />
        </>
      );
    }

    return (
      <>
        <DoctorLayout
          profile={session.profile}
          activeTab={doctorTab}
          onTabChange={setDoctorTab}
          onSignOut={async () => { await signOut(); setView('patient'); setPatientStep('welcome'); }}
        >
          <DoctorDashboard
            doctorId={session.profile.id}
            doctorName={session.profile.full_name}
            onViewPatient={(id) => setSelectedPatientId(id)}
          />
        </DoctorLayout>
        <ToastContainer />
      </>
    );
  }

  // ============================================================
  // DEMO MODE
  // ============================================================
  if (patientStep === 'demo') {
    return (
      <>
        <DemoSummaryView
          onBack={() => { setPatientStep('welcome'); }}
        />
        <ToastContainer />
      </>
    );
  }

  // ============================================================
  // PATIENT FLOW
  // ============================================================
  switch (patientStep) {
    case 'welcome':
      return (
        <>
          <WelcomePage
            onStart={() => setPatientStep('language')}
            onExistingPatient={() => setPatientStep('info')}
            onStaffLogin={() => setView('staff-login')}
            onDemo={() => setPatientStep('demo')}
          />
          <ToastContainer />
        </>
      );

    case 'language':
      return (
        <>
          <LanguagePage
            onSelect={(lang) => { setLanguage(lang); setPatientStep('consent'); }}
            onBack={() => setPatientStep('welcome')}
          />
          <ToastContainer />
        </>
      );

    case 'consent':
      return (
        <>
          <ConsentPage
            language={language}
            onConsent={() => setPatientStep('mode')}
            onBack={() => setPatientStep('language')}
          />
          <ToastContainer />
        </>
      );

    case 'mode':
      return (
        <>
          <ModeSelectPage
            onSelect={(mode) => { setHistoryMode(mode); setPatientStep('info'); }}
            onBack={() => setPatientStep('consent')}
          />
          <ToastContainer />
        </>
      );

    case 'info':
      return (
        <>
          <PatientInfoPage
            language={language}
            historyMode={historyMode}
            onComplete={(patientId) => {
              setPatientId(patientId);
              recordConsent(patientId, true, 'Patient consented to medical history collection via MediKiosk').catch(() => {});
              setPatientStep('complaint');
            }}
            onBack={() => setPatientStep('mode')}
          />
          <ToastContainer />
        </>
      );

    case 'complaint':
      return (
        <>
          <ChiefComplaintPage
            patientId={session.patientId || ''}
            onComplete={(historyId, complaint) => {
              setClinicalHistoryId(historyId);
              setChiefComplaint(complaint);
              setPatientStep('history');
            }}
            onBack={() => setPatientStep('info')}
          />
          <ToastContainer />
        </>
      );

    case 'history':
      return (
        <>
          <ClinicalHistoryPage
            patientId={session.patientId || ''}
            clinicalHistoryId={clinicalHistoryId}
            chiefComplaint={chiefComplaint}
            language={language}
            onComplete={(data) => {
              setStructuredData(data);
              if (historyMode === 'ayush') {
                setPatientStep('ayush');
              } else {
                setPatientStep('documents');
              }
            }}
            onBack={() => setPatientStep('complaint')}
          />
          <ToastContainer />
        </>
      );

    case 'ayush':
      return (
        <>
          <AYUSHPage
            onComplete={(data) => {
              setAyushData(data);
              setPatientStep('documents');
            }}
            onBack={() => setPatientStep('history')}
          />
          <ToastContainer />
        </>
      );

    case 'documents':
      return (
        <>
          <DocumentUploadPage
            patientId={session.patientId || ''}
            onComplete={() => setPatientStep('timeline')}
            onBack={() => setPatientStep(historyMode === 'ayush' ? 'ayush' : 'history')}
          />
          <ToastContainer />
        </>
      );

    case 'timeline':
      return (
        <>
          <TimelinePage
            patientId={session.patientId || ''}
            onComplete={() => setPatientStep('summary')}
            onBack={() => setPatientStep('documents')}
          />
          <ToastContainer />
        </>
      );

    case 'summary':
      return (
        <>
          <SummaryPage
            patientId={session.patientId || ''}
            clinicalHistoryId={clinicalHistoryId}
            structuredData={structuredData}
            onComplete={(sum, sumId) => {
              setSummary(sum);
              setSummaryId(sumId);
              setPatientStep('review');
            }}
            onBack={() => setPatientStep('timeline')}
          />
          <ToastContainer />
        </>
      );

    case 'review':
      return (
        <>
          <ReviewPage
            patientId={session.patientId || ''}
            summary={summary || ({} as ClinicalSummaryData)}
            onComplete={() => {
              setPatientId(null);
              setPatientStep('welcome');
              setStructuredData({});
              setSummary(null);
              setSummaryId(null);
              setAyushData(null);
            }}
            onEdit={() => setPatientStep('info')}
            onBack={() => setPatientStep('summary')}
          />
          <ToastContainer />
        </>
      );

    default:
      return (
        <>
          <WelcomePage
            onStart={() => setPatientStep('language')}
            onExistingPatient={() => setPatientStep('info')}
            onStaffLogin={() => setView('staff-login')}
            onDemo={() => setPatientStep('demo')}
          />
          <ToastContainer />
        </>
      );
  }
}

// ============================================================
// DEMO MODE VIEW — Shows sample patient data without database
// ============================================================
function DemoSummaryView({ onBack }: { onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<'summary' | 'timeline' | 'documents' | 'fhir'>('summary');

  const summarySections = [
    { label: 'Chief Complaint', value: DEMO_SUMMARY.chief_complaint },
    { label: 'History of Present Illness', value: DEMO_SUMMARY.history_of_present_illness },
    { label: 'Past Medical History', value: DEMO_SUMMARY.past_medical_history },
    { label: 'Past Surgical History', value: DEMO_SUMMARY.past_surgical_history },
    { label: 'Drug History', value: DEMO_SUMMARY.drug_history },
    { label: 'Allergy History', value: DEMO_SUMMARY.allergy_history },
    { label: 'Family History', value: DEMO_SUMMARY.family_history },
    { label: 'Personal History', value: DEMO_SUMMARY.personal_history },
    { label: 'Review of Systems', value: DEMO_SUMMARY.review_of_systems },
    { label: 'Previous Investigations', value: DEMO_SUMMARY.previous_investigations },
    { label: 'Current Medications', value: DEMO_SUMMARY.current_medications },
    { label: 'Important Document Findings', value: DEMO_SUMMARY.important_document_findings },
  ];

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Demo header */}
      <header className="bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="btn-ghost text-sm">
            ← Back to Home
          </button>
          <div>
            <h1 className="text-lg font-bold text-neutral-900">{DEMO_PATIENT.full_name}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="badge-warning">DEMO MODE</span>
              <span className="text-xs text-neutral-400">{DEMO_PATIENT.age}y • {DEMO_PATIENT.gender} • {DEMO_PATIENT.blood_group}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="p-6 max-w-4xl mx-auto">
        {/* Demo notice */}
        <div className="card p-4 mb-4 bg-accent-50 border-accent-200">
          <p className="text-sm text-neutral-700">
            <strong>Demo Mode:</strong> This shows sample data for Rahul Kumar (45, male, fever for 3 days). No real health information is used. This demonstrates the complete MediKiosk workflow.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 border-b border-neutral-200 overflow-x-auto">
          {[
            { key: 'summary' as const, label: 'Clinical Summary' },
            { key: 'timeline' as const, label: 'Timeline' },
            { key: 'documents' as const, label: 'Documents' },
            { key: 'fhir' as const, label: 'FHIR/ABDM' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.key ? 'border-primary-600 text-primary-700' : 'border-transparent text-neutral-500 hover:text-neutral-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'summary' && (
          <div>
            <div className="card p-4 mb-4 bg-warning-50 border-warning-200">
              <p className="text-sm text-neutral-700">
                <strong>AI-generated draft — physician verification required.</strong>
              </p>
            </div>
            <div className="card p-6">
              <div className="space-y-4">
                {summarySections.map((s) => s.value && (
                  <div key={s.label}>
                    <h3 className="text-sm font-semibold text-neutral-900 mb-1">{s.label}</h3>
                    <p className="text-sm text-neutral-600 whitespace-pre-wrap">{s.value}</p>
                  </div>
                ))}
                {DEMO_SUMMARY.missing_information.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-900 mb-1">Missing Information</h3>
                    <ul className="space-y-1">
                      {DEMO_SUMMARY.missing_information.map((info, i) => (
                        <li key={i} className="text-sm text-neutral-600">• {info}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'timeline' && (
          <div className="space-y-3">
            {DEMO_TIMELINE.map((event) => (
              <div key={event.id} className="card p-4 flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary-700">{event.event_date ? new Date(event.event_date).getFullYear() : '-'}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-neutral-900">{event.event_title}</p>
                  {event.event_description && <p className="text-xs text-neutral-500 mt-0.5">{event.event_description}</p>}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-neutral-400 capitalize">{event.event_type.replace('_', ' ')}</span>
                    <span className="text-xs text-neutral-400">• {event.source}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="space-y-3">
            {DEMO_DOCUMENTS.map((doc) => (
              <div key={doc.id} className="card p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center">
                    <span className="text-xs font-bold text-neutral-500">PDF</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-neutral-900">{doc.file_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="badge-success">Processed</span>
                      <span className="text-xs text-neutral-400">{new Date(doc.uploaded_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'fhir' && (
          <FHIRView
            patient={DEMO_PATIENT}
            documents={DEMO_DOCUMENTS}
            timeline={DEMO_TIMELINE}
            onBack={() => setActiveTab('summary')}
          />
        )}
      </div>
    </div>
  );
}

export default App;
