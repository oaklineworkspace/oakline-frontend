import { supabaseAdmin } from '../../../lib/supabaseAdmin';
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
      maxFileSize: 5 * 1024 * 1024,
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
    const loan_id = Array.isArray(fields.loan_id) ? fields.loan_id[0] : fields.loan_id;
    const file = Array.isArray(files.file) ? files.file[0] : files.file;

    if (!loan_id) {
      return res.status(400).json({ error: 'Missing loan_id' });
    }

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { data: loan, error: loanError } = await supabaseAdmin
      .from('loans')
      .select('*')
      .eq('id', loan_id)
      .eq('user_id', user.id)
      .single();

    if (loanError || !loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    const fileData = fs.readFileSync(file.filepath);
    const fileExt = file.originalFilename?.split('.').pop() || 'jpg';
    const fileName = `loan-proof-${loan_id}-${Date.now()}.${fileExt}`;
    const filePath = `loan_proofs/${user.id}/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('documents')
      .upload(filePath, fileData, {
        contentType: file.mimetype,
        upsert: false
      });

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      return res.status(500).json({ error: 'Failed to upload file' });
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from('documents')
      .getPublicUrl(filePath);

    const proofUrl = publicUrlData.publicUrl;

    const currentDocuments = loan.documents || [];
    const newDocument = {
      type: 'payment_proof',
      name: file.originalFilename,
      url: proofUrl,
      uploaded_at: new Date().toISOString(),
      size: file.size,
      mimetype: file.mimetype
    };

    const { error: updateError } = await supabaseAdmin
      .from('loans')
      .update({
        documents: [...currentDocuments, newDocument],
        updated_at: new Date().toISOString()
      })
      .eq('id', loan_id)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating loan documents:', updateError);
      return res.status(500).json({ error: 'Failed to update loan documents' });
    }

    await supabaseAdmin
      .from('notifications')
      .insert([{
        user_id: user.id,
        type: 'loan',
        title: 'Payment Proof Uploaded',
        message: `Your payment proof for ${loan.loan_type?.replace(/_/g, ' ')} loan has been uploaded successfully. Our team will review it shortly.`,
        read: false,
        created_at: new Date().toISOString()
      }]);

    fs.unlinkSync(file.filepath);

    return res.status(200).json({
      success: true,
      message: 'Proof uploaded successfully',
      document: newDocument
    });

  } catch (error) {
    console.error('Error uploading deposit proof:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
