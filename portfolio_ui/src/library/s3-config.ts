export const S3_BUCKET_URL = 'https://s3.eu-west-1.amazonaws.com/bucketeer-0a244e0e-1266-4baf-88d1-99a1b4b3e579';

export const getMediaUrl = (path: string): string => {
  if (!path) return "/fallback-image.jpg";
  
  // Direct access now that bucket is public
  if (path.startsWith('http')) {
    return path;  // Use direct URL, no proxy
  }
  
  // Build path properly for relative paths
  return `${S3_BUCKET_URL}/${path.replace(/^\//, '')}`;
};