
import { supabaseAdmin } from '../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, documentType, frontPath, backPath } = req.body;

    if (!email || !documentType || !frontPath || !backPath) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: 'email, documentType, frontPath, and backPath are required'
      });
    }

    // Validate document type
    const validTypes = ['ID Card', 'Passport', 'Driver License'];
    if (!validTypes.includes(documentType)) {
      return res.status(400).json({ 
        error: 'Invalid document type',
        details: `Document type must be one of: ${validTypes.join(', ')}`
      });
    }

    // Find the user by email
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (userError) {
      console.error('Error fetching users:', userError);
      return res.status(500).json({ error: 'Failed to find user' });
    }

    const user = userData.users.find(u => u.email === email.toLowerCase());
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user already has a document record
    const { data: existingDoc, error: checkError } = await supabaseAdmin
      .from('user_id_documents')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing documents:', checkError);
      return res.status(500).json({ error: 'Failed to check existing documents' });
    }

    let result;
    
    if (existingDoc) {
      // Update existing record
      const { data, error } = await supabaseAdmin
        .from('user_id_documents')
        .update({
          document_type: documentType,
          front_url: frontPath,
          back_url: backPath,
          status: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingDoc.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating document:', error);
        return res.status(500).json({ 
          error: 'Failed to update document',
          details: error.message 
        });
      }

      result = data;
    } else {
      // Create new record
      const { data, error } = await supabaseAdmin
        .from('user_id_documents')
        .insert([{
          user_id: user.id,
          document_type: documentType,
          front_url: frontPath,
          back_url: backPath,
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error('Error inserting document:', error);
        return res.status(500).json({ 
          error: 'Failed to save document',
          details: error.message 
        });
      }

      result = data;
    }

    console.log('✅ ID document saved to database:', result.id);

    return res.status(200).json({
      success: true,
      message: 'ID document saved successfully',
      document: {
        id: result.id,
        user_id: result.user_id,
        document_type: result.document_type,
        status: result.status
      }
    });

  } catch (error) {
    console.error('Error saving ID document:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
