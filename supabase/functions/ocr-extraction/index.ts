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

const SYSTEM_PROMPT = `You are MediKiosk OCR + AI document extraction service.
You extract structured medical information from OCR text of medical documents.

CRITICAL RULES:
- Do NOT diagnose. Only extract what is written in the document.
- Do NOT invent information. If something is not in the text, do not include it.
- Highlight abnormal lab values where reference ranges are available.
- Extract medications, dosages, investigations, diagnoses, procedures, and dates.
- Be conservative — only extract clearly stated information.`;

async function callOpenAI(messages: { role: string; content: string }[], jsonMode = false): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }

  const body: Record<string, unknown> = {
    model: "gpt-4o-mini",
    messages,
    temperature: 0.1,
  };
  if (jsonMode) {
    body.response_format = { type: "json_object" };
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    const documentId = requestBody.document_id as string;
    const patientId = requestBody.patient_id as string;
    const textContent = requestBody.text_content as string;
    const fileName = requestBody.file_name as string;

    if (!documentId || !patientId) {
      return new Response(JSON.stringify({ error: "document_id and patient_id are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Update document status to processing
    await supabase.from("medical_documents").update({
      processing_status: "processing",
    }).eq("id", documentId);

    let rawText = textContent || "";

    // If no text content provided, try to download and extract from storage
    if (!rawText) {
      const { data: docRecord } = await supabase
        .from("medical_documents")
        .select("storage_path, file_type")
        .eq("id", documentId)
        .single();

      if (docRecord) {
        const { data: fileData, error: fileError } = await supabase
          .storage
          .from("medical-documents")
          .download(docRecord.storage_path);

        if (!fileError && fileData) {
          // For images, we'd use vision API; for text-like files, read directly
          // For the prototype, we'll use the OpenAI vision API for images
          if (docRecord.file_type && docRecord.file_type.startsWith("image/")) {
            // Convert to base64
            const arrayBuffer = await fileData.arrayBuffer();
            const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

            const visionResponse = await fetch("https://api.openai.com/v1/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${OPENAI_API_KEY}`,
              },
              body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                  {
                    role: "user",
                    content: [
                      {
                        type: "text",
                        text: "Extract ALL text from this medical document image. Return only the raw text, preserving the structure and layout. Include all medications, dosages, lab values, dates, diagnoses, and instructions.",
                      },
                      {
                        type: "image_url",
                        image_url: { url: `data:${docRecord.file_type};base64,${base64}` },
                      },
                    ],
                  },
                ],
                temperature: 0.1,
              }),
            });

            if (visionResponse.ok) {
              const visionData = await visionResponse.json();
              rawText = visionData.choices[0].message.content;
            }
          } else {
            // For PDFs and other — try reading as text (simplified for prototype)
            try {
              rawText = await fileData.text();
            } catch {
              rawText = `[Binary file: ${fileName}]`;
            }
          }
        }
      }
    }

    if (!rawText || rawText.trim().length === 0) {
      await supabase.from("medical_documents").update({
        processing_status: "needs_review",
      }).eq("id", documentId);

      return new Response(JSON.stringify({
        error: "No text could be extracted from the document",
        raw_text: "",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use AI to structure the extracted text
    const extractionPrompt = `Extract structured medical information from the following document text.

CRITICAL RULES:
- Do NOT diagnose. Only extract what is written.
- Do NOT invent information.
- Highlight abnormal lab values where reference ranges are available.

Return a JSON object with these exact keys:
{
  "diagnoses": [{"name": "", "date": ""}],
  "medications": [{"name": "", "dosage": "", "frequency": "", "duration": ""}],
  "investigations": [{"test_name": "", "value": "", "unit": "", "reference_range": "", "is_abnormal": false, "date": ""}],
  "procedures": [{"name": "", "date": ""}],
  "dates": [{"event": "", "date": ""}]
}

Document text:
${rawText}`;

    let structuredData: Record<string, unknown>;
    let confidenceScore = 0.7;

    if (OPENAI_API_KEY) {
      try {
        const aiResponse = await callOpenAI(
          [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: extractionPrompt },
          ],
          true
        );
        structuredData = JSON.parse(aiResponse);
        confidenceScore = 0.85;
      } catch (err) {
        structuredData = {
          diagnoses: [],
          medications: [],
          investigations: [],
          procedures: [],
          dates: [],
        };
      }
    } else {
      structuredData = {
        diagnoses: [],
        medications: [],
        investigations: [],
        procedures: [],
        dates: [],
      };
    }

    // Find abnormal values
    const investigations = (structuredData.investigations || []) as { is_abnormal?: boolean }[];
    const abnormalValues = investigations.filter((inv) => inv.is_abnormal === true);

    // Save extraction to database
    const { data: extractionRecord } = await supabase.from("document_extractions").insert({
      document_id: documentId,
      patient_id: patientId,
      raw_text: rawText,
      structured_data: structuredData,
      extracted_diagnoses: structuredData.diagnoses || [],
      extracted_medications: structuredData.medications || [],
      extracted_investigations: structuredData.investigations || [],
      extracted_procedures: structuredData.procedures || [],
      extracted_dates: structuredData.dates || [],
      abnormal_values: abnormalValues,
      confidence_score: confidenceScore,
      processing_notes: OPENAI_API_KEY ? "Processed with AI extraction" : "AI not configured — basic extraction only",
    }).select("*").single();

    // Update document status
    await supabase.from("medical_documents").update({
      processing_status: "processed",
      processed_at: new Date().toISOString(),
    }).eq("id", documentId);

    // Create timeline events from extracted data
    if (extractionRecord) {
      const timelineEvents: Record<string, unknown>[] = [];
      const diagnoses = (structuredData.diagnoses || []) as { name: string; date?: string }[];
      const procedures = (structuredData.procedures || []) as { name: string; date?: string }[];
      const dates = (structuredData.dates || []) as { event: string; date: string }[];

      for (const diag of diagnoses) {
        timelineEvents.push({
          patient_id: patientId,
          event_date: diag.date || null,
          event_type: "diagnosis",
          event_title: diag.name,
          event_description: `Diagnosis from document: ${fileName}`,
          source: "document",
          source_document_id: documentId,
          metadata: { diagnosis: diag },
        });
      }

      for (const proc of procedures) {
        timelineEvents.push({
          patient_id: patientId,
          event_date: proc.date || null,
          event_type: proc.name.toLowerCase().includes("surgery") ? "surgery" : "investigation",
          event_title: proc.name,
          event_description: `Procedure from document: ${fileName}`,
          source: "document",
          source_document_id: documentId,
          metadata: { procedure: proc },
        });
      }

      for (const date of dates) {
        if (date.event && date.date) {
          timelineEvents.push({
            patient_id: patientId,
            event_date: date.date,
            event_type: "consultation",
            event_title: date.event,
            event_description: `From document: ${fileName}`,
            source: "document",
            source_document_id: documentId,
            metadata: { date_event: date },
          });
        }
      }

      if (timelineEvents.length > 0) {
        await supabase.from("clinical_timeline").insert(timelineEvents);
      }
    }

    return new Response(JSON.stringify({
      raw_text: rawText,
      structured_data: structuredData,
      abnormal_values: abnormalValues,
      confidence_score: confidenceScore,
      extraction_id: extractionRecord?.id,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
