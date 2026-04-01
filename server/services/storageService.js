const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

let supabase = null;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('[STORAGE] Minimum Supabase environment variables not found! File uploads will fail, but server will continue running.');
} else {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
}

const BUCKET_NAME = 'complaints-media';

/**
 * Uploads a file buffer to Supabase Storage
 * @param {Buffer} buffer The file buffer (from multer memoryStorage)
 * @param {string} originalName The original filename 
 * @param {string} mimetype The MIME type of the file
 * @returns {Promise<string>} The absolute public URL of the uploaded image
 */
async function uploadMedia(buffer, originalName, mimetype) {
  if (!supabase) {
    console.error('[STORAGE] Attempted to upload, but Supabase is not configured.');
    throw new Error('Storage service is not configured');
  }
  try {
    const ext = originalName.split('.').pop() || 'jpg';
    const filePath = `${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, buffer, {
        contentType: mimetype,
        upsert: false
      });

    if (error) {
      console.error('[STORAGE] Upload error:', error.message);
      throw error;
    }

    // Get the public URL
    const { data: publicData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    return publicData.publicUrl;
  } catch (err) {
    console.error('[STORAGE] Fatal error uploading file:', err);
    throw new Error('Failed to upload media to cloud storage');
  }
}

module.exports = { uploadMedia };
