import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs/promises';
import dotenv from 'dotenv';

dotenv.config(); // Make sure environment variables are loaded

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,     // Use uppercase env keys for consistency
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

/**
 * Uploads a file to Cloudinary and deletes the local file after upload.
 * @param {string} localfilepath - Absolute path to the local file
 * @returns {object|null} - The Cloudinary response object or null on failure
 */
const FileUpload = async (localfilepath) => {
  try {
    if (!localfilepath) {
      console.error("No file path provided for upload.");
      return null;
    }

    // Upload the file to Cloudinary
    const res = await cloudinary.uploader.upload(localfilepath, {
      resource_type: 'auto',
    });

    // Delete the file locally after successful upload
    await fs.unlink(localfilepath);

    return res;
  } catch (error) {
    console.error('❌ Cloudinary Upload Error:', error.message);

    // Try to delete the file even if upload failed
    try {
      await fs.unlink(localfilepath);
    } catch (unlinkError) {
      if (unlinkError.code !== 'ENOENT') {
        console.error('❌ Failed to delete local file:', unlinkError.message);
      }
    }

    return null;
  }
};

export { FileUpload };
