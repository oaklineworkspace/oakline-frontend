
import formidable from 'formidable';
import fs from 'fs';
import { supabaseAdmin } from '../../lib/supabaseAdmin';

export const config = {
  api: {
    bodyParser: false,
  },
};

const parseForm = (req) => {
  return new Promise((resolve, reject) => {
    const form = formidable({ 
      multiples: false,
      maxFileSize: 10 * 1024 * 1024, // 10MB
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
      return res.status(401).json({ error: 'Unauthorized - Missing authentication token' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized - Invalid authentication' });
    }

    const { fields, files } = await parseForm(req);
    const loanId = Array.isArray(fields.loanId) ? fields.loanId[0] : fields.loanId;
    const file = Array.isArray(files.file) ? files.file[0] : files.file;

    if (!loanId) {
      return res.status(400).json({ error: 'Missing loanId' });
    }

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Verify loan belongs to user
    const { data: loan, error: loanError } = await supabaseAdmin
      .from('loans')
      .select('id, user_id')
      .eq('id', loanId)
      .eq('user_id', user.id)
      .single();

    if (loanError || !loan) {
      return res.status(404).json({ error: 'Loan not found or unauthorized' });
    }

    // Upload file to storage
    const fileData = fs.readFileSync(file.filepath);
    const fileExt = file.originalFilename?.split('.').pop() || 'jpg';
    const fileName = `loan-payment-proof-${loanId}-${Date.now()}.${fileExt}`;
    const filePath = `loan_payment_proofs/${user.id}/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('documents')
      .upload(filePath, fileData, {
        contentType: file.mimetype,
        upsert: false
      });

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      return res.status(500).json({ error: 'Failed to upload file to storage' });
    }

    // Clean up temp file
    fs.unlinkSync(file.filepath);

    return res.status(200).json({
      success: true,
      message: 'Proof uploaded successfully',
      filePath: filePath,
      fileName: fileName
    });

  } catch (error) {
    console.error('Error uploading loan payment proof:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
