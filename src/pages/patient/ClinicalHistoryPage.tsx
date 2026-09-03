import { useState, useRef, useEffect } from 'react';
import { Logo } from '@/components/Logo';
import { ProgressBar } from '@/components/ProgressBar';
import { RedFlagAlert } from '@/components/RedFlagAlert';
import { Mic, MicOff, Volume2, Send, ArrowRight, AlertTriangle, Loader, Stethoscope, FileText, RefreshCw } from 'lucide-react';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { askNextQuestion, structureHistory, detectRedFlagsClient } from '@/services/clinical-history';
import { toast } from '@/hooks/useToast';
import type { ConversationMessage, HistorySection, RedFlag, StructuredClinicalData } from '@/types';

interface ClinicalHistoryPageProps {
  patientId: string;
  clinicalHistoryId: string;
  chiefComplaint: string;
  language: string;
  onComplete: (structuredData: StructuredClinicalData) => void;
  onBack: () => void;
}

const SECTIONS: { key: HistorySection; label: string; icon: string }[] = [
  { key: 'chief_complaint', label: 'Chief Complaint', icon: '1' },
  { key: 'history_of_present_illness', label: 'Present Illness', icon: '2' },
  { key: 'past_medical_history', label: 'Past Medical', icon: '3' },
  { key: 'past_surgical_history', label: 'Past Surgical', icon: '4' },
  { key: 'drug_history', label: 'Drug History', icon: '5' },
  { key: 'allergy_history', label: 'Allergies', icon: '6' },
  { key: 'family_history', label: 'Family History', icon: '7' },
  { key: 'personal_history', label: 'Personal History', icon: '8' },
  { key: 'review_of_systems', label: 'Review of Systems', icon: '9' },
];

export function ClinicalHistoryPage({
  patientId,
  clinicalHistoryId,
  chiefComplaint,
  language,
  onComplete,
  onBack,
}: ClinicalHistoryPageProps) {
  const [conversation, setConversation] = useState<ConversationMessage[]>([
    { role: 'assistant', content: `Hello. I will help collect your medical history before you meet the doctor. What is the main problem you are experiencing today?`, section: 'chief_complaint' },
  ]);
  const [currentSection, setCurrentSection] = useState<HistorySection>('chief_complaint');
  const [textInput, setTextInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [redFlags, setRedFlags] = useState<RedFlag[]>([]);
  const [showRedFlagAlert, setShowRedFlagAlert] = useState(false);
  const [redFlagDescription, setRedFlagDescription] = useState('');
  const [structuring, setStructuring] = useState(false);
  const [sectionProgress, setSectionProgress] = useState<HistorySection[]>(['chief_complaint']);
  const [historyComplete, setHistoryComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAnswer, setLastAnswer] = useState<string>('');
  const [patientData, setPatientData] = useState<Record<string, string>>({});

  const { isSupported, startListening, stopListening, speak, stopSpeaking } = useSpeechRecognition(language);
  const conversationEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation, aiLoading]);

  // Speak the initial question on load
  useEffect(() => {
    const timer = setTimeout(() => {
      speak(conversation[0].content);
      setIsSpeaking(true);
      setTimeout(() => setIsSpeaking(false), 3000);
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleVoiceInput() {
    if (isListening) {
      stopListening();
      setIsListening(false);
      return;
    }

    setIsListening(true);
    startListening(
      (text) => {
        setIsListening(false);
        setTextInput(text);
      },
      (err) => {
        setIsListening(false);
        toast('error', `Voice input error: ${err}`);
      }
    );
  }

  function handleSpeakQuestion() {
    const lastAssistant = [...conversation].reverse().find((m) => m.role === 'assistant');
    if (lastAssistant) {
      speak(lastAssistant.content);
      setIsSpeaking(true);
      setTimeout(() => setIsSpeaking(false), 3000);
    }
  }

  function addRedFlags(newFlags: RedFlag[]) {
    setRedFlags((prev) => {
      const updated = [...prev];
      for (const f of newFlags) {
        if (!updated.find((nf) => nf.type === f.type)) {
          updated.push(f);
        }
      }
      return updated;
    });
  }

  async function handleSubmitAnswer() {
    const answer = textInput.trim();
    if (!answer || aiLoading) return;

    setError(null);
    setLastAnswer(answer);

    // Client-side red flag detection
    const clientFlags = detectRedFlagsClient(answer);
    if (clientFlags.length > 0) {
      addRedFlags(clientFlags);
      setRedFlagDescription(clientFlags.map((f) => f.description).join('; '));
      setShowRedFlagAlert(true);
    }

    // Add user message to conversation
    const userMessage: ConversationMessage = {
      role: 'user',
      content: answer,
      section: currentSection,
      timestamp: new Date().toISOString(),
    };
    const newConversation = [...conversation, userMessage];
    setConversation(newConversation);
    setTextInput('');
    setAiLoading(true);

    try {
      const result = await askNextQuestion(
        clinicalHistoryId,
        patientId,
        conversation,
        currentSection,
        answer,
        redFlags,
        language,
        patientData
      );

      // Update structured patient data from AI
      if (result.updatedPatientData) {
        setPatientData(result.updatedPatientData);
      }

      // Handle server-side red flags
      if (result.redFlags && result.redFlags.length > 0) {
        addRedFlags(result.redFlags);
        setRedFlagDescription(result.redFlags.map((f) => f.description).join('; '));
        setShowRedFlagAlert(true);
      }

      // Handle section completion
      if (result.isSectionComplete && result.section && result.section !== currentSection) {
        setCurrentSection(result.section);
        setSectionProgress((prev) => prev.includes(result.section) ? prev : [...prev, result.section]);
      }

      // Check if entire history is complete
      if (result.isComplete) {
        if (result.question) {
          const msg = result.question;
          const aiMessage: ConversationMessage = {
            role: 'assistant',
            content: msg,
            section: currentSection,
            timestamp: new Date().toISOString(),
          };
          setConversation((prev) => [...prev, aiMessage]);
        }
        setHistoryComplete(true);
        return;
      }

      // Add AI message to conversation
      if (result.question) {
        const msg = result.question;
        const sec = result.section || currentSection;
        const aiMessage: ConversationMessage = {
          role: 'assistant',
          content: msg,
          section: sec,
          timestamp: new Date().toISOString(),
        };
        setConversation((prev) => [...prev, aiMessage]);
        speak(msg);
        setIsSpeaking(true);
        setTimeout(() => setIsSpeaking(false), 3000);
      }
    } catch (err) {
      console.error('AI conversation error:', err);
      setError('We could not process your response. Please try again.');
      toast('error', 'Could not get AI response. Please try again.');
    } finally {
      setAiLoading(false);
    }
  }

  async function handleRetry() {
    setError(null);
    if (!lastAnswer) return;

    setAiLoading(true);
    try {
      const result = await askNextQuestion(
        clinicalHistoryId,
        patientId,
        conversation.filter((m) => m.content !== lastAnswer || m.role !== 'user'),
        currentSection,
        lastAnswer,
        redFlags,
        language,
        patientData
      );

      if (result.updatedPatientData) {
        setPatientData(result.updatedPatientData);
      }

      if (result.redFlags && result.redFlags.length > 0) {
        addRedFlags(result.redFlags);
        setRedFlagDescription(result.redFlags.map((f) => f.description).join('; '));
        setShowRedFlagAlert(true);
      }

      if (result.isSectionComplete && result.section && result.section !== currentSection) {
        setCurrentSection(result.section);
        setSectionProgress((prev) => prev.includes(result.section) ? prev : [...prev, result.section]);
      }

      if (result.isComplete) {
        if (result.question) {
          const msg = result.question;
          setConversation((prev) => [...prev, {
            role: 'assistant',
            content: msg,
            section: currentSection,
            timestamp: new Date().toISOString(),
          }]);
        }
        setHistoryComplete(true);
        return;
      }

      if (result.question) {
        const msg = result.question;
        const sec = result.section || currentSection;
        setConversation((prev) => [...prev, {
          role: 'assistant',
          content: msg,
          section: sec,
          timestamp: new Date().toISOString(),
        }]);
        speak(msg);
        setIsSpeaking(true);
        setTimeout(() => setIsSpeaking(false), 3000);
      }
    } catch (err) {
      console.error('Retry failed:', err);
      setError('We are still having trouble. You can skip to the summary with the information collected so far.');
    } finally {
      setAiLoading(false);
    }
  }

  async function finalizeHistory(finalConversation?: ConversationMessage[]) {
    const conv = finalConversation || conversation;
    setStructuring(true);
    try {
      const structured = await structureHistory(clinicalHistoryId, patientId, conv, patientData);
      onComplete(structured);
    } catch (err) {
      toast('error', 'Could not structure your clinical history. Proceeding with collected information.');
      console.error(err);
      onComplete({});
    } finally {
      setStructuring(false);
    }
  }

  const currentSectionIdx = SECTIONS.findIndex((s) => s.key === currentSection);
  const currentSectionLabel = SECTIONS[currentSectionIdx]?.label || currentSection;

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      {showRedFlagAlert && (
        <RedFlagAlert
          description={redFlagDescription}
          onClose={() => setShowRedFlagAlert(false)}
        />
      )}

      <header className="px-6 py-4 flex items-center justify-between bg-white border-b border-neutral-200">
        <Logo size="sm" />
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2">
            {SECTIONS.map((s, i) => (
              <div
                key={s.key}
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                  sectionProgress.includes(s.key)
                    ? 'bg-primary-600 text-white'
                    : i === currentSectionIdx
                    ? 'bg-primary-100 text-primary-700 ring-2 ring-primary-300'
                    : 'bg-neutral-200 text-neutral-400'
                }`}
                title={s.label}
              >
                {s.icon}
              </div>
            ))}
          </div>
          <span className="text-sm font-medium text-neutral-600">{currentSectionLabel}</span>
        </div>
      </header>

      {/* Red flag banner */}
      {redFlags.length > 0 && !showRedFlagAlert && (
        <div className="bg-error-50 border-b border-error-200 px-6 py-2 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-error-600" />
          <span className="text-sm text-error-700">
            Priority alert detected. Hospital staff will be notified.
          </span>
        </div>
      )}

      <main className="flex-1 flex flex-col max-w-3xl w-full mx-auto px-6 py-4">
        {/* Conversation area */}
        <div className="flex-1 overflow-y-auto scrollbar-thin space-y-4 pb-4">
          {conversation.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
            >
              {msg.role === 'assistant' && (
                <div className="w-9 h-9 rounded-full bg-primary-600 flex items-center justify-center shrink-0 mr-3">
                  <Stethoscope className="w-5 h-5 text-white" />
                </div>
              )}
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-secondary-600 text-white rounded-tr-sm'
                    : 'bg-white border border-neutral-200 text-neutral-800 rounded-tl-sm'
                }`}
              >
                <p className="text-base leading-relaxed">{msg.content}</p>
                {msg.section && msg.role === 'assistant' && (
                  <p className="text-xs mt-1 opacity-60">{SECTIONS.find((s) => s.key === msg.section)?.label}</p>
                )}
              </div>
            </div>
          ))}

          {aiLoading && (
            <div className="flex justify-start">
              <div className="w-9 h-9 rounded-full bg-primary-600 flex items-center justify-center shrink-0 mr-3">
                <Loader className="w-5 h-5 text-white animate-spin" />
              </div>
              <div className="bg-white border border-neutral-200 rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-neutral-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-neutral-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-neutral-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <p className="text-xs text-neutral-400 mt-1">AI is thinking...</p>
              </div>
            </div>
          )}

          {error && !aiLoading && (
            <div className="card p-4 bg-error-50 border-error-200 animate-fade-in">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-error-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-neutral-700">{error}</p>
                  <button onClick={handleRetry} className="btn-secondary text-sm mt-3">
                    <RefreshCw className="w-4 h-4" />
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          )}

          {structuring && (
            <div className="card p-6 text-center animate-fade-in">
              <Loader className="w-8 h-8 text-primary-600 animate-spin mx-auto mb-3" />
              <p className="text-base font-medium text-neutral-700">Organizing your clinical history...</p>
              <p className="text-sm text-neutral-500 mt-1">This may take a moment</p>
            </div>
          )}

          <div ref={conversationEndRef} />
        </div>

        {/* History complete — show generate summary button */}
        {historyComplete && !structuring && (
          <div className="border-t border-neutral-200 pt-4 bg-neutral-50">
            <div className="card p-6 text-center bg-primary-50 border-primary-200 animate-fade-in">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary-600 mb-3">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-neutral-900 mb-1">History Collection Complete</h3>
              <p className="text-sm text-neutral-600 mb-4">
                Thank you. I have collected the information needed for your clinical history.
              </p>
              <button
                onClick={() => finalizeHistory()}
                className="btn-primary-lg mx-auto"
              >
                Generate Clinical Summary
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Input area */}
        {!structuring && !historyComplete && (
          <div className="border-t border-neutral-200 pt-4 bg-neutral-50">
            {/* Voice controls */}
            <div className="flex items-center justify-center gap-3 mb-3">
              <button
                onClick={handleVoiceInput}
                disabled={aiLoading}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  isListening
                    ? 'bg-error-600 text-white'
                    : 'bg-primary-600 text-white hover:bg-primary-700'
                }`}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                {isListening ? 'Stop' : 'Speak'}
              </button>
              <button
                onClick={handleSpeakQuestion}
                disabled={aiLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                <Volume2 className={`w-5 h-5 ${isSpeaking ? 'text-primary-600' : ''}`} />
                Read Question
              </button>
            </div>

            {!isSupported && (
              <p className="text-xs text-center text-neutral-400 mb-2">
                Voice input not supported in this browser. Use text input below.
              </p>
            )}

            {/* Text input */}
            <div className="flex gap-2">
              <input
                className="input flex-1"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !aiLoading && handleSubmitAnswer()}
                placeholder="Type your answer here..."
                disabled={aiLoading}
              />
              <button
                onClick={handleSubmitAnswer}
                disabled={aiLoading || !textInput.trim()}
                className="btn-primary"
              >
                {aiLoading ? <Loader className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </div>

            <div className="flex justify-between mt-3">
              <button onClick={onBack} className="btn-ghost text-sm">
                Back
              </button>
              <button
                onClick={() => finalizeHistory()}
                className="btn-ghost text-sm text-primary-600 hover:text-primary-700"
                disabled={aiLoading}
              >
                Skip to Summary
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="px-6 py-2 text-center border-t border-neutral-200 bg-white">
        <p className="text-xs text-neutral-400">
          AI-generated information is for clinical documentation support and must be reviewed by a qualified healthcare professional.
        </p>
      </footer>
    </div>
  );
}
