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
      maxFileSize: 10 * 1024 * 1024, // 10MB max
      keepExtensions: true,
      filter: ({ mimetype }) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
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
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { fields, files } = await parseForm(req);
    const loanId = Array.isArray(fields.loanId) ? fields.loanId[0] : fields.loanId;
    const file = Array.isArray(files.file) ? files.file[0] : files.file;

    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    if (!loanId) {
      return res.status(400).json({ error: 'Loan ID required' });
    }

    // Validate file type
    const allowedMimetypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedMimetypes.includes(file.mimetype)) {
      return res.status(400).json({ error: 'Invalid file type. Only JPG, PNG, and PDF are allowed' });
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      return res.status(400).json({ error: 'File size exceeds 10MB limit' });
    }

    // Read file data
    const fileData = fs.readFileSync(file.filepath);
    const fileExt = file.originalFilename?.split('.').pop() || 'jpg';
    const timestamp = Date.now();
    const fileName = `loan_deposit_proof_${loanId}_${timestamp}.${fileExt}`;
    const filePath = `loan_deposits/${user.id}/${loanId}/${fileName}`;

    // Upload to documents bucket
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('documents')
      .upload(filePath, fileData, {
        contentType: file.mimetype,
        upsert: false,
        cacheControl: '3600'
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return res.status(500).json({ error: 'File upload failed', details: uploadError.message });
    }

    return res.status(200).json({
      success: true,
      filePath: filePath,
      message: 'Proof file uploaded successfully'
    });

  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
