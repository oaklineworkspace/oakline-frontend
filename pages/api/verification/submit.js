import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Parse form data
    const form = formidable({
      maxFileSize: 50 * 1024 * 1024, // 50MB max
      keepExtensions: true,
    });

    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) {
          console.error('Formidable parse error:', err);
          reject(err);
        } else {
          console.log('Formidable files:', Object.keys(files || {}));
          console.log('Formidable fields:', Object.keys(fields || {}));
          resolve([fields, files]);
        }
      });
    });

    const file = files.file?.[0] || files.file;
    const verificationType = fields.type?.[0] || fields.type || 'selfie';

    console.log('File details:', {
      exists: !!file,
      originalFilename: file?.originalFilename,
      newFilename: file?.newFilename,
      mimetype: file?.mimetype,
      size: file?.size
    });

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Check if user requires verification (either login verification or wire transfer verification)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('requires_verification, wire_transfer_suspended')
      .eq('id', user.id)
      .single();

    // Allow verification for either login requirement or wire transfer suspension
    const requiresAnyVerification = profile?.requires_verification || profile?.wire_transfer_suspended;
    
    if (profileError || !requiresAnyVerification) {
      return res.status(400).json({ error: 'Verification not required for this user' });
    }
    
    // Determine the context for this verification
    const isWireTransferVerification = !profile.requires_verification && profile.wire_transfer_suspended;

    // Upload file to Supabase Storage
    // Safely extract file extension
    const originalName = file.originalFilename || file.newFilename || 'upload';
    let fileExt = path.extname(originalName).toLowerCase();
    
    // Ensure file has a valid extension
    if (!fileExt || fileExt.length > 10) {
      // Default based on MIME type if extension is missing or invalid
      fileExt = file.mimetype?.includes('video') ? '.webm' : 
                file.mimetype?.includes('image') ? '.jpg' : '.bin';
    }
    
    // Create sanitized filename (only alphanumeric, underscore, hyphen)
    const sanitizedUserId = user.id.replace(/[^a-zA-Z0-9_-]/g, '_');
    const timestamp = Date.now();
    const fileName = `${sanitizedUserId}_${timestamp}${fileExt}`;
    const bucketName = 'verification-media';
    
    // Validate and create file path
    const sanitizedType = verificationType.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filePath = `${sanitizedType}/${fileName}`;
    
    // Additional validation: ensure path doesn't contain invalid characters
    if (!/^[a-zA-Z0-9_\/-]+$/.test(filePath)) {
      throw new Error('Invalid file path format');
    }

    // Read file content
    const fileContent = fs.readFileSync(file.filepath);
    
    console.log('Upload details:', {
      filePath,
      fileSize: fileContent.byteLength,
      contentType: file.mimetype,
      bucketName
    });

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin
      .storage
      .from(bucketName)
      .upload(filePath, fileContent, {
        contentType: file.mimetype,
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error details:', {
        message: uploadError.message,
        error: uploadError,
        filePath,
        statusCode: uploadError.statusCode
      });
      
      // If bucket doesn't exist, create it
      if (uploadError.message?.includes('not found')) {
        const { error: bucketError } = await supabaseAdmin
          .storage
          .createBucket(bucketName, {
            public: false,
            fileSizeLimit: 52428800 // 50MB
          });

        if (bucketError && !bucketError.message?.includes('already exists')) {
          throw new Error('Failed to create storage bucket');
        }

        // Try upload again
        const { error: retryError } = await supabaseAdmin
          .storage
          .from(bucketName)
          .upload(filePath, fileContent, {
            contentType: file.mimetype,
            upsert: false
          });

        if (retryError) {
          throw retryError;
        }
      } else {
        throw uploadError;
      }
    }

    // Clean up temp file
    fs.unlinkSync(file.filepath);

    // Determine the triggered_by value based on context
    const triggeredBy = isWireTransferVerification ? 'wire_transfer_suspension' : 'login';
    
    // Update or create verification record - scoped by triggered_by to keep contexts separate
    const existingQuery = supabaseAdmin
      .from('selfie_verifications')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'pending');
    
    // Scope to wire transfer verifications only if this is a wire transfer submission
    if (isWireTransferVerification) {
      existingQuery.eq('triggered_by', 'wire_transfer_suspension');
    } else {
      // For login verifications, exclude wire transfer records
      existingQuery.or('triggered_by.is.null,triggered_by.neq.wire_transfer_suspension');
    }
    
    const { data: existingVerification } = await existingQuery.single();

    const updateData = {
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      ...(verificationType === 'selfie' ? { image_path: filePath } : { video_path: filePath })
    };

    if (existingVerification) {
      // Update existing record (matching context)
      const { error: updateError } = await supabaseAdmin
        .from('selfie_verifications')
        .update(updateData)
        .eq('id', existingVerification.id);

      if (updateError) throw updateError;
    } else {
      // Create new record with appropriate context
      const insertData = {
        user_id: user.id,
        verification_type: verificationType === 'selfie' ? 'selfie' : 'video',
        reason: isWireTransferVerification 
          ? 'Wire transfer verification required' 
          : 'User submitted verification',
        triggered_by: triggeredBy,
        metadata: isWireTransferVerification 
          ? { context: 'wire_transfer_verification' }
          : {},
        ...updateData
      };
      
      const { error: insertError } = await supabaseAdmin
        .from('selfie_verifications')
        .insert(insertData);

      if (insertError) throw insertError;
    }

    return res.status(200).json({
      success: true,
      message: 'Verification submitted successfully',
      filePath
    });
  } catch (error) {
    console.error('Verification submission error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to submit verification'
    });
  }
}
