import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const MODEL = "gpt-4o-mini";

const SECTION_ORDER = [
  "chief_complaint",
  "history_of_present_illness",
  "past_medical_history",
  "past_surgical_history",
  "drug_history",
  "allergy_history",
  "family_history",
  "personal_history",
  "review_of_systems",
] as const;

type Section = (typeof SECTION_ORDER)[number];

const SECTION_LABELS: Record<string, string> = {
  chief_complaint: "Chief Complaint",
  history_of_present_illness: "History of Present Illness",
  past_medical_history: "Past Medical History",
  past_surgical_history: "Past Surgical History",
  drug_history: "Drug History",
  allergy_history: "Allergy History",
  family_history: "Family History",
  personal_history: "Personal History",
  review_of_systems: "Review of Systems",
};

const SYSTEM_PROMPT = `You are MediKiosk, an AI clinical history assistant for Indian hospitals.
Your role is to collect structured clinical history from patients before their doctor consultation.

CRITICAL SAFETY RULES:
- You MUST NOT diagnose any disease or condition.
- You MUST NOT prescribe any medication or treatment.
- You MUST NOT invent patient information — only use what the patient provides.
- You MUST NOT claim medical certainty.
- You only collect information, clarify symptoms, and structure information.
- You flag predefined emergency symptoms for staff attention.
- The physician makes the final clinical decision.

The clinical history sections are (in order):
1. chief_complaint — Main symptom/reason for visit
2. history_of_present_illness — Detailed story of current symptom(s): onset, duration, location, character, severity, radiation, aggravating/relieving factors, associated symptoms
3. past_medical_history — Previous illnesses/conditions (diabetes, hypertension, thyroid, etc.)
4. past_surgical_history — Previous surgeries
5. drug_history — Current and past medications, dosage, duration
6. allergy_history — Drug/food/environmental allergies
7. family_history — Family medical conditions (parents, siblings)
8. personal_history — Lifestyle: smoking, alcohol, diet, occupation
9. review_of_systems — Brief screen of other body systems (fever, weight loss, appetite, sleep, bowel, urinary, skin)

CONVERSATION RULES:
- Ask ONE question at a time.
- Be brief, clear, and use simple language suitable for elderly/low-literacy patients.
- Remember previous answers — do not repeat questions already answered.
- Adapt follow-up questions based on patient answers. The next question MUST be directly relevant to what the patient just said.
- Ask clarification questions when the patient's answer is vague or unclear.
- When a section has enough information (usually 2-4 questions), move to the next section.
- Keep the conversation natural and conversational.
- Do not use medical jargon when asking questions.
- Understand colloquial expressions: "sugar" = diabetes, "BP" = hypertension/blood pressure, "tablet" = medication.
- If the patient says "I don't know", do not pressure them. Record as "Patient unable to provide information" and move on.
- If the patient corrects previous information, use the corrected version.
- NEVER ask a question whose answer was already provided earlier in the conversation.

You MUST respond in JSON format with these exact keys:
{
  "response_to_patient": "The single question or statement to show the patient. This is the ONLY text the patient sees.",
  "section": "The current clinical section being collected",
  "is_section_complete": false,
  "is_history_complete": false,
  "updated_patient_data": {
    "chief_complaint": "",
    "history_of_present_illness": "",
    "past_medical_history": "",
    "past_surgical_history": "",
    "drug_history": "",
    "allergy_history": "",
    "family_history": "",
    "personal_history": "",
    "review_of_systems": ""
  },
  "missing_information": ["list of important missing items"],
  "red_flags": []
}

Rules for the JSON:
- "response_to_patient" must be ONE short question or statement. Never more than 2 sentences.
- "is_section_complete" = true when you have collected enough information for the current section.
- "is_history_complete" = true when ALL 9 sections are complete.
- "updated_patient_data" must contain ALL accumulated patient data so far, with the current section's field updated based on the patient's latest answer.
- When a section is complete, set its field to a concise summary of what was collected.
- "missing_information" should list key missing items across all sections.
- "red_flags" should list any emergency symptoms detected: [{"type": "...", "description": "...", "severity": "critical"}]`;

const RED_FLAG_PATTERNS: { patterns: string[]; type: string; description: string; severity: "high" | "critical" }[] = [
  { patterns: ["severe chest pain", "crushing chest pain", "chest pain with sweating", "chest pain radiating", "chest pain spreading", "chest hurting since", "chest has been hurting", "chest has been hurting since", "my chest has been hurting"], type: "severe_chest_pain", description: "Severe chest pain — possible cardiac emergency", severity: "critical" },
  { patterns: ["chest pain and breathing", "chest pain with breathless", "chest pain and shortness of breath", "chest hurts and breathing", "chest pain and can't breathe", "short of breath", "difficulty breathing", "breathing difficulty", "can't breathe", "breathless", "severe shortness of breath", "gasping", "trouble breathing"], type: "severe_breathing", description: "Breathing difficulty — requires immediate attention", severity: "critical" },
  { patterns: ["one side weakness", "sudden weakness", "hemiparesis", "facial droop", "one-sided weakness", "left side weak", "right side weak"], type: "sudden_weakness", description: "Sudden weakness on one side — possible stroke", severity: "critical" },
  { patterns: ["difficulty speaking", "slurred speech", "can't speak", "unable to speak", "sudden speech difficulty"], type: "speech_difficulty", description: "Sudden difficulty speaking — possible stroke", severity: "critical" },
  { patterns: ["loss of consciousness", "fainted", "unconscious", "passed out", "blackout"], type: "loss_of_consciousness", description: "Loss of consciousness — requires immediate evaluation", severity: "critical" },
  { patterns: ["uncontrolled bleeding", "severe bleeding", "heavy bleeding", "blood won't stop"], type: "severe_bleeding", description: "Severe uncontrolled bleeding — requires immediate attention", severity: "critical" },
  { patterns: ["severe allergic reaction", "anaphylaxis", "swelling of face", "swelling of throat", "lips swelling"], type: "severe_allergy", description: "Severe allergic reaction — requires immediate attention", severity: "critical" },
];

function detectRedFlags(text: string): { type: string; description: string; severity: "high" | "critical" }[] {
  const lower = text.toLowerCase();
  const detected: { type: string; description: string; severity: "high" | "critical" }[] = [];
  for (const flag of RED_FLAG_PATTERNS) {
    for (const pattern of flag.patterns) {
      if (lower.includes(pattern)) {
        if (!detected.find((d) => d.type === flag.type)) {
          detected.push({ type: flag.type, description: flag.description, severity: flag.severity });
        }
        break;
      }
    }
  }
  return detected;
}

function getNextSection(currentSection: string): string | null {
  const idx = SECTION_ORDER.indexOf(currentSection as Section);
  if (idx < 0 || idx >= SECTION_ORDER.length - 1) return null;
  return SECTION_ORDER[idx + 1];
}

async function callOpenAI(messages: { role: string; content: string }[], jsonMode = false): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }

  const body: Record<string, unknown> = {
    model: MODEL,
    messages,
    temperature: 0.3,
    max_tokens: 300,
  };
  if (jsonMode) {
    body.response_format = { type: "json_object" };
    body.max_tokens = 2000;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("OpenAI returned empty response");
    }
    return content;
  } finally {
    clearTimeout(timeout);
  }
}

function parseJsonResponse(text: string): Record<string, unknown> {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error("Could not parse JSON from AI response");
  }
}

function getFallbackQuestion(section: string, conversationLength: number): string {
  const questions: Record<string, string[]> = {
    chief_complaint: [
      "What is the main problem you are experiencing today?",
      "Can you describe the symptom in your own words?",
      "How long have you had this problem?",
    ],
    history_of_present_illness: [
      "When did this problem start?",
      "How would you describe the severity — mild, moderate, or severe?",
      "Does anything make it better or worse?",
      "Are there any other symptoms associated with this?",
    ],
    past_medical_history: [
      "Do you have any previous medical conditions like diabetes, high blood pressure, or thyroid?",
      "Have you been hospitalized before? If so, when and why?",
    ],
    past_surgical_history: [
      "Have you had any surgeries in the past?",
      "Were there any complications from any surgery?",
    ],
    drug_history: [
      "What medications are you currently taking?",
      "Are you taking any medicines regularly? Please include the dose.",
    ],
    allergy_history: [
      "Are you allergic to any medications, foods, or other substances?",
      "What happens when you are exposed to the allergy?",
    ],
    family_history: [
      "Does anyone in your family have diabetes, high blood pressure, or heart disease?",
      "Are there any hereditary conditions in your family?",
    ],
    personal_history: [
      "Do you smoke or use tobacco products?",
      "Do you consume alcohol? If so, how frequently?",
      "Can you describe your typical daily diet?",
    ],
    review_of_systems: [
      "Have you noticed any recent weight loss, fever, or changes in appetite?",
      "Do you have any issues with sleep, bowel movements, or urination?",
    ],
  };

  const sectionQuestions = questions[section] || questions.chief_complaint;
  const idx = Math.min(conversationLength, sectionQuestions.length - 1);
  return sectionQuestions[idx];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    const action = requestBody.action as string;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ============================================================
    // ACTION: ask_question — Get next AI question for history interview
    // ============================================================
    if (action === "ask_question") {
      const conversationHistory = (requestBody.conversation_history || []) as { role: string; content: string; section?: string }[];
      const currentSection = (requestBody.current_section || "chief_complaint") as string;
      const patientAnswer = requestBody.patient_answer as string | undefined;
      const language = (requestBody.language || "en") as string;
      const patientData = (requestBody.patient_data || {}) as Record<string, string>;

      // Build proper alternating chat messages for OpenAI
      const chatMessages: { role: string; content: string }[] = [
        { role: "system", content: SYSTEM_PROMPT },
      ];

      // Add section context as a system-level instruction
      const sectionIdx = SECTION_ORDER.indexOf(currentSection as Section);
      const completedSections = SECTION_ORDER.slice(0, sectionIdx).map((s) => SECTION_LABELS[s]);

      const langInstruction = language === "hi"
        ? "The patient may speak Hindi/Hinglish. Understand Hindi responses and respond in simple English (or simple Hindi if the patient clearly prefers Hindi)."
        : language === "ta"
        ? "The patient may speak Tamil/Tanglish. Understand Tamil responses and respond in simple English (or simple Tamil if the patient clearly prefers Tamil)."
        : "Ask questions in simple, clear English.";

      const sectionContext = `CURRENT SECTION: ${SECTION_LABELS[currentSection] || currentSection}
COMPLETED SECTIONS: ${completedSections.length > 0 ? completedSections.join(", ") : "None yet"}
${langInstruction}

ACCUMULATED PATIENT DATA SO FAR (do NOT re-ask any of this):
${JSON.stringify(patientData, null, 2)}

INSTRUCTIONS:
- You are currently collecting the "${currentSection}" section.
- The patient just answered your last question. Understand their answer, extract relevant information, update the "${currentSection}" field in updated_patient_data, then ask the NEXT most relevant follow-up question.
- The follow-up question MUST be directly related to what the patient just said and relevant to the current section.
- Do NOT jump to an unrelated topic. Do NOT ask about a different section unless the current one is complete.
- If the patient's answer is vague (e.g. "sometimes", "yes"), ask a clarification question.
- If the patient says "I don't know", record it and move to the next missing item.
- If the current section has enough information (2-4 questions answered), set is_section_complete=true and start the next section by asking its first question in response_to_patient.
- If this is the last section (review_of_systems) and it's complete, set is_history_complete=true and say "Thank you. I have collected the information needed for your clinical history."`;

      chatMessages.push({ role: "system", content: sectionContext });

      // Add the actual conversation as alternating user/assistant messages
      for (const msg of conversationHistory) {
        if (msg.role === "assistant" || msg.role === "user") {
          chatMessages.push({ role: msg.role, content: msg.content });
        }
      }

      // Add the patient's new answer if not already in history
      if (patientAnswer) {
        chatMessages.push({ role: "user", content: patientAnswer });
      }

      // Detect red flags in the patient's answer
      let redFlags: { type: string; description: string; severity: string }[] = [];
      if (patientAnswer) {
        redFlags = detectRedFlags(patientAnswer);
      }

      let displayMessage: string | null = null;
      let nextSection: string | null = null;
      let isSectionComplete = false;
      let historyComplete = false;
      let updatedPatientData = patientData;
      let missingInformation: string[] = [];
      let usedFallback = false;

      try {
        const aiResponse = await callOpenAI(chatMessages, true);
        const parsed = parseJsonResponse(aiResponse);

        displayMessage = (parsed.response_to_patient as string) || null;
        isSectionComplete = Boolean(parsed.is_section_complete);
        historyComplete = Boolean(parsed.is_history_complete);
        updatedPatientData = (parsed.updated_patient_data as Record<string, string>) || patientData;
        missingInformation = (parsed.missing_information as string[]) || [];
        nextSection = (parsed.section as string) || currentSection;

        // If section is complete, determine next section
        if (isSectionComplete && !historyComplete) {
          const ns = getNextSection(currentSection);
          nextSection = ns || currentSection;
        }
        if (historyComplete) {
          nextSection = null;
        }
      } catch (err) {
        console.error("OpenAI call failed for ask_question, using fallback:", err instanceof Error ? err.message : String(err));
        usedFallback = true;
        const sectionConversationLength = conversationHistory.filter(
          (m) => m.content && m.role === "assistant"
        ).length;
        if (sectionConversationLength >= 3) {
          isSectionComplete = true;
          const ns = getNextSection(currentSection);
          nextSection = ns;
          if (!ns) {
            historyComplete = true;
          }
          if (ns) {
            displayMessage = getFallbackQuestion(ns, 0);
          } else {
            displayMessage = "Thank you. I have collected the information needed for your clinical history.";
          }
        } else {
          displayMessage = getFallbackQuestion(currentSection, sectionConversationLength);
        }
      }

      if (historyComplete) {
        displayMessage = "Thank you. I have collected the information needed for your clinical history. You can now proceed to generate your clinical summary.";
      }

      // Update conversation in database
      if (requestBody.clinical_history_id) {
        const newMessages: unknown[] = [...conversationHistory];
        if (patientAnswer) {
          newMessages.push({ role: "user", content: patientAnswer, section: currentSection, timestamp: new Date().toISOString() });
        }
        if (displayMessage && !historyComplete) {
          newMessages.push({ role: "assistant", content: displayMessage, section: nextSection || currentSection, timestamp: new Date().toISOString() });
        }

        const updateData: Record<string, unknown> = {
          conversation_history: newMessages,
          current_question: historyComplete ? null : displayMessage,
          structured_data: updatedPatientData,
        };

        if (isSectionComplete && nextSection) {
          updateData.current_section = nextSection;
        }
        if (historyComplete) {
          updateData.status = "completed";
        }

        if (redFlags.length > 0) {
          const existingFlags = (requestBody.existing_red_flags || []) as { type: string; description: string; severity: string }[];
          const allFlags = [...existingFlags, ...redFlags];
          updateData.red_flags_detected = allFlags;

          for (const flag of redFlags) {
            await supabase.from("red_flag_alerts").insert({
              patient_id: requestBody.patient_id,
              clinical_history_id: requestBody.clinical_history_id,
              flag_type: flag.type,
              flag_description: flag.description,
              severity: flag.severity,
            });
          }

          await supabase.from("patients").update({ priority: "urgent" }).eq("id", requestBody.patient_id);
        }

        await supabase.from("clinical_histories").update(updateData).eq("id", requestBody.clinical_history_id);

        // Save individual answers
        if (patientAnswer) {
          await supabase.from("history_answers").insert({
            clinical_history_id: requestBody.clinical_history_id,
            patient_id: requestBody.patient_id,
            section: currentSection,
            question: conversationHistory.length > 0 ? conversationHistory[conversationHistory.length - 1]?.content || "" : "Initial question",
            answer: patientAnswer,
            question_role: "user",
          });
        }
        if (displayMessage && !historyComplete) {
          await supabase.from("history_answers").insert({
            clinical_history_id: requestBody.clinical_history_id,
            patient_id: requestBody.patient_id,
            section: nextSection || currentSection,
            question: displayMessage,
            answer: null,
            question_role: "assistant",
          });
        }
      }

      return new Response(JSON.stringify({
        message: displayMessage,
        section: nextSection || currentSection,
        is_section_complete: isSectionComplete,
        is_complete: historyComplete,
        next_section: nextSection,
        red_flags: redFlags,
        updated_patient_data: updatedPatientData,
        missing_information: missingInformation,
        used_fallback: usedFallback,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============================================================
    // ACTION: structure_history — Convert conversation to structured data
    // ============================================================
    if (action === "structure_history") {
      const conversationHistory = (requestBody.conversation_history || []) as { role: string; content: string }[];
      const existingPatientData = (requestBody.patient_data || {}) as Record<string, string>;

      const structurePrompt = `You are MediKiosk AI. Convert the following clinical history conversation into structured JSON.

CRITICAL RULES:
- Do NOT diagnose. Only organize what the patient said.
- Do NOT invent information. If something was not mentioned, use "Not reported" or leave empty.
- Use the patient's own words where possible.
- Organize information into the correct clinical sections.
- If the patient corrected earlier information, use the corrected version.
- Understand colloquial expressions: "sugar" = diabetes, "BP" = hypertension, "tablet" = medication.

Return a JSON object with these exact keys:
{
  "chief_complaint": "main symptom or reason for visit",
  "history_of_present_illness": "detailed story of current illness — onset, duration, character, severity, aggravating/relieving factors, associated symptoms",
  "past_medical_history": "previous conditions or 'No significant past history reported'",
  "past_surgical_history": "previous surgeries or 'No surgical history reported'",
  "drug_history": "current and past medications",
  "allergy_history": "allergies or 'No known allergies reported'",
  "family_history": "family medical conditions or 'No significant family history reported'",
  "personal_history": "lifestyle factors — smoking, alcohol, diet, occupation",
  "review_of_systems": "screening of other systems or 'Not remarkable'",
  "red_flags": [],
  "missing_information": ["list of important information that was not collected"]
}

Existing patient data (if any):
${JSON.stringify(existingPatientData, null, 2)}

Conversation:
${JSON.stringify(conversationHistory.map((m) => ({ role: m.role, content: m.content })))}`;

      let structuredData: Record<string, unknown>;

      try {
        const aiResponse = await callOpenAI(
          [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: structurePrompt }],
          true
        );
        structuredData = parseJsonResponse(aiResponse);
      } catch (err) {
        console.error("OpenAI structure_history failed, using fallback:", err instanceof Error ? err.message : String(err));
        structuredData = extractStructuredDataFromConversation(conversationHistory, existingPatientData);
      }

      // Ensure all keys exist
      const defaultData: Record<string, unknown> = {
        chief_complaint: "",
        history_of_present_illness: "",
        past_medical_history: "",
        past_surgical_history: "",
        drug_history: "",
        allergy_history: "",
        family_history: "",
        personal_history: "",
        review_of_systems: "",
        red_flags: [],
        missing_information: [],
      };
      structuredData = { ...defaultData, ...structuredData };

      // Update clinical history in database
      if (requestBody.clinical_history_id) {
        await supabase.from("clinical_histories").update({
          structured_data: structuredData,
          missing_information: (structuredData.missing_information as string[]) || [],
          status: "structured",
        }).eq("id", requestBody.clinical_history_id);
      }

      return new Response(JSON.stringify({
        structured_data: structuredData,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============================================================
    // ACTION: generate_summary — Generate physician-ready clinical summary
    // ============================================================
    if (action === "generate_summary") {
      const structuredData = (requestBody.structured_data || {}) as Record<string, unknown>;
      const documentFindings = (requestBody.document_findings || "") as string;
      const timelineEvents = (requestBody.timeline_events || []) as unknown[];

      const summaryPrompt = `You are MediKiosk AI. Generate a physician-ready clinical summary from the following structured clinical data.

CRITICAL RULES:
- Do NOT diagnose. Only organize and summarize the information provided.
- Do NOT invent information. Only use what is provided.
- If information is missing or was not reported, write "Not reported" for that field.
- Flag missing information that the physician may need to ask about.
- The summary must be concise, structured, and physician-readable.
- Clearly separate patient-reported history from document-derived findings.
- Do NOT create medications, investigations, or diagnoses that the patient did not mention.

Return a JSON object with these exact keys:
{
  "chief_complaint": "",
  "history_of_present_illness": "",
  "past_medical_history": "",
  "past_surgical_history": "",
  "drug_history": "",
  "allergy_history": "",
  "family_history": "",
  "personal_history": "",
  "review_of_systems": "",
  "previous_investigations": "",
  "current_medications": "",
  "important_document_findings": "",
  "red_flags": [],
  "missing_information": []
}

Structured Clinical Data:
${JSON.stringify(structuredData, null, 2)}

Document Findings (from OCR/AI extraction):
${documentFindings || "No documents uploaded."}

Timeline Events:
${JSON.stringify(timelineEvents, null, 2)}`;

      let summaryData: Record<string, unknown>;

      try {
        const aiResponse = await callOpenAI(
          [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: summaryPrompt }],
          true
        );
        summaryData = parseJsonResponse(aiResponse);
      } catch (err) {
        console.error("OpenAI generate_summary failed, using fallback:", err instanceof Error ? err.message : String(err));
        summaryData = {
          chief_complaint: (structuredData.chief_complaint as string) || "Not reported",
          history_of_present_illness: (structuredData.history_of_present_illness as string) || "Not reported",
          past_medical_history: (structuredData.past_medical_history as string) || "Not reported",
          past_surgical_history: (structuredData.past_surgical_history as string) || "Not reported",
          drug_history: (structuredData.drug_history as string) || "Not reported",
          allergy_history: (structuredData.allergy_history as string) || "Not reported",
          family_history: (structuredData.family_history as string) || "Not reported",
          personal_history: (structuredData.personal_history as string) || "Not reported",
          review_of_systems: (structuredData.review_of_systems as string) || "Not reported",
          previous_investigations: "Not reported",
          current_medications: (structuredData.drug_history as string) || "Not reported",
          important_document_findings: documentFindings || "No documents uploaded.",
          red_flags: (structuredData.red_flags as unknown[]) || [],
          missing_information: (structuredData.missing_information as string[]) || [],
        };
      }

      // Ensure all keys exist
      const defaultSummary: Record<string, unknown> = {
        chief_complaint: "Not reported",
        history_of_present_illness: "Not reported",
        past_medical_history: "Not reported",
        past_surgical_history: "Not reported",
        drug_history: "Not reported",
        allergy_history: "Not reported",
        family_history: "Not reported",
        personal_history: "Not reported",
        review_of_systems: "Not reported",
        previous_investigations: "Not reported",
        current_medications: "Not reported",
        important_document_findings: "No documents uploaded.",
        red_flags: [],
        missing_information: [],
      };
      summaryData = { ...defaultSummary, ...summaryData };

      // Save summary to database
      if (requestBody.patient_id) {
        const { data } = await supabase.from("clinical_summaries").insert({
          patient_id: requestBody.patient_id,
          clinical_history_id: requestBody.clinical_history_id || null,
          summary_data: summaryData,
          chief_complaint: (summaryData.chief_complaint as string) || null,
          history_of_present_illness: (summaryData.history_of_present_illness as string) || null,
          past_medical_history: (summaryData.past_medical_history as string) || null,
          past_surgical_history: (summaryData.past_surgical_history as string) || null,
          drug_history: (summaryData.drug_history as string) || null,
          allergy_history: (summaryData.allergy_history as string) || null,
          family_history: (summaryData.family_history as string) || null,
          personal_history: (summaryData.personal_history as string) || null,
          review_of_systems: (summaryData.review_of_systems as string) || null,
          previous_investigations: (summaryData.previous_investigations as string) || null,
          current_medications: (summaryData.current_medications as string) || null,
          important_document_findings: (summaryData.important_document_findings as string) || null,
          red_flags: (summaryData.red_flags as unknown[]) || [],
          missing_information: (summaryData.missing_information as string[]) || [],
        }).select("*").single();

        return new Response(JSON.stringify({
          summary: summaryData,
          summary_id: data?.id,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({
        summary: summaryData,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Edge function error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ============================================================
// Fallback: Extract structured data from conversation without AI
// ============================================================
function extractStructuredDataFromConversation(
  conversation: { role: string; content: string }[],
  existingData: Record<string, string>,
): Record<string, unknown> {
  const data: Record<string, unknown> = {
    chief_complaint: existingData.chief_complaint || "",
    history_of_present_illness: existingData.history_of_present_illness || "",
    past_medical_history: existingData.past_medical_history || "",
    past_surgical_history: existingData.past_surgical_history || "",
    drug_history: existingData.drug_history || "",
    allergy_history: existingData.allergy_history || "",
    family_history: existingData.family_history || "",
    personal_history: existingData.personal_history || "",
    review_of_systems: existingData.review_of_systems || "",
    red_flags: [],
    missing_information: ["AI structuring was unavailable — manual review required"],
  };

  const patientAnswers = conversation
    .filter((m) => m.role === "user")
    .map((m) => m.content);

  if (!data.chief_complaint && patientAnswers.length > 0) {
    data.chief_complaint = patientAnswers[0];
  }

  if (!data.history_of_present_illness && patientAnswers.length > 1) {
    data.history_of_present_illness = patientAnswers.slice(0, 4).join(" ");
  }

  return data;
}
