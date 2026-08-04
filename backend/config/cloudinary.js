import { v2 as cloudinary } from 'cloudinary';

/**
 * Configure Cloudinary SDK for media & document uploads
 */
export const configureCloudinary = () => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  console.log('☁️ Cloudinary SDK Configured Successfully');
  return cloudinary;
};

export { cloudinary };
