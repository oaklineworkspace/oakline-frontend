import { supabaseAdmin } from '../../lib/supabaseAdmin';
import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

const parseForm = (req) => {
  return new Promise((resolve, reject) => {
    const form = formidable({
      multiples: false,
      maxFileSize: 5 * 1024 * 1024, // 5MB max
      keepExtensions: true,
      filter: ({ mimetype }) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
        return allowedTypes.includes(mimetype);
      }
    });

    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      resolve({ fields, files });
    });
  });
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fields, files } = await parseForm(req);
    const email = Array.isArray(fields.email) ? fields.email[0] : fields.email;
    const documentType = Array.isArray(fields.documentType) ? fields.documentType[0] : fields.documentType;
    const file = Array.isArray(files.file) ? files.file[0] : files.file;

    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }

    if (!documentType || !['front', 'back'].includes(documentType)) {
      return res.status(400).json({ error: 'Invalid document type. Must be "front" or "back"' });
    }

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Validate file type
    const allowedMimetypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedMimetypes.includes(file.mimetype)) {
      return res.status(400).json({ error: 'Invalid file type. Only JPG and PNG are allowed' });
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return res.status(400).json({ error: 'File size exceeds 5MB limit' });
    }

    // Read file data
    const fileData = fs.readFileSync(file.filepath);
    const fileExt = file.originalFilename?.split('.').pop() || 'jpg';
    const timestamp = Date.now();
    const sanitizedEmail = email.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const fileName = `id-${documentType}-${sanitizedEmail}-${timestamp}.${fileExt}`;
    const filePath = `id_documents/${sanitizedEmail}/${fileName}`;

    console.log('Preparing upload:', {
      fileName,
      filePath,
      fileSize: fileData.length,
      mimeType: file.mimetype
    });

    // Upload to Supabase Storage (use the bucket you created)
    // First, try to upload to 'documents' bucket, if it doesn't exist, try 'id-documents'
    let uploadData, uploadError, bucketName = 'documents';

    const uploadResult = await supabaseAdmin.storage
      .from(bucketName)
      .upload(filePath, fileData, {
        contentType: file.mimetype,
        upsert: false,
        cacheControl: '3600'
      });

    uploadData = uploadResult.data;
    uploadError = uploadResult.error;

    // If documents bucket doesn't exist, try id-documents bucket
    if (uploadError && uploadError.message?.includes('not found')) {
      bucketName = 'id-documents';
      const retryResult = await supabaseAdmin.storage
        .from(bucketName)
        .upload(filePath, fileData, {
          contentType: file.mimetype,
          upsert: false,
          cacheControl: '3600'
        });
      uploadData = retryResult.data;
      uploadError = retryResult.error;
    }

    if (uploadError) {
      console.error('Error uploading file to Supabase Storage:', {
        error: uploadError,
        message: uploadError.message,
        statusCode: uploadError.statusCode,
        bucket: bucketName,
        filePath: filePath
      });
      // Clean up temp file
      fs.unlinkSync(file.filepath);
      return res.status(500).json({
        error: 'Failed to upload file to storage',
        details: uploadError.message || uploadError.error || JSON.stringify(uploadError) || 'Storage upload failed',
        bucket: bucketName,
        hint: 'Check if the bucket exists and storage policies allow service_role uploads'
      });
    }

    console.log(`File uploaded successfully to bucket: ${bucketName}, path: ${filePath}`);

    // Generate a signed URL for temporary secure access (valid for 1 hour)
    // This is only used for preview during application submission
    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
      .from(bucketName)
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    if (signedUrlError) {
      console.error('Error creating signed URL:', signedUrlError);
      // Clean up temp file
      fs.unlinkSync(file.filepath);
      return res.status(500).json({
        error: 'Failed to create secure URL',
        details: signedUrlError.message || 'Signed URL creation failed'
      });
    }

    // Clean up temp file
    fs.unlinkSync(file.filepath);

    console.log(`✅ ID ${documentType} uploaded successfully to storage: ${filePath}`);

    return res.status(200).json({
      success: true,
      message: `ID ${documentType} uploaded successfully`,
      filePath: filePath, // Store only the path reference in database
      previewUrl: signedUrlData.signedUrl, // Temporary signed URL for preview
      fileName: fileName
    });

  } catch (error) {
    console.error('Upload error:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({
      error: 'Upload failed',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}