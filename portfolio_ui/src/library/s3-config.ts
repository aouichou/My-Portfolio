export const S3_BUCKET_URL = 'https://s3.eu-west-1.amazonaws.com/bucketeer-0a244e0e-1266-4baf-88d1-99a1b4b3e579';

export const getMediaUrl = (path: string): string => {
  if (!path) return "/fallback-image.jpg";
  
  // Already a full URL
  if (path.startsWith('http')) {
    // For S3 bucket images, use our proxy to avoid CORS issues
    if (path.includes('bucketeer-0a244e0e-1266-4baf-88d1-99a1b4b3e579')) {
      return `/api/image-proxy?url=${encodeURIComponent(path)}`;
    }
    return path;
  }
  
  // Build path properly
  const fullPath = `${S3_BUCKET_URL}/${path.replace(/^\//, '')}`;
  
  // Use proxy for all S3 URLs
  return `/api/image-proxy?url=${encodeURIComponent(fullPath)}`;
};