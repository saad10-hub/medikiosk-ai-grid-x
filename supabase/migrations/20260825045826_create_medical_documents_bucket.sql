/*
# Create medical-documents storage bucket

1. Storage
- Create private bucket 'medical-documents' for medical file uploads
- Bucket is NOT public — files accessed via signed URLs only
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('medical-documents', 'medical-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: allow anon+authenticated to upload/read/delete
-- (kiosk model — patient session is anon)
DROP POLICY IF EXISTS "med_docs_upload" ON storage.objects;
CREATE POLICY "med_docs_upload" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'medical-documents');

DROP POLICY IF EXISTS "med_docs_read" ON storage.objects;
CREATE POLICY "med_docs_read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'medical-documents');

DROP POLICY IF EXISTS "med_docs_update" ON storage.objects;
CREATE POLICY "med_docs_update" ON storage.objects
  FOR UPDATE TO anon, authenticated
  USING (bucket_id = 'medical-documents')
  WITH CHECK (bucket_id = 'medical-documents');

DROP POLICY IF EXISTS "med_docs_delete" ON storage.objects;
CREATE POLICY "med_docs_delete" ON storage.objects
  FOR DELETE TO anon, authenticated
  USING (bucket_id = 'medical-documents');
