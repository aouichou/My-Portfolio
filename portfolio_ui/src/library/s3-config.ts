// portfolio_ui/src/library/s3-config.ts

export const S3_BUCKET_URL = 'https://portfolio-media.fly.storage.tigris.dev/media';

export const getMediaUrl = (path: string): string => {
  if (!path) {
    return "/fallback-image.jpg";
  }
  
  // Return direct URLs without modification
  if (path.startsWith('http')) {
    return path;
  }
  
  // Create proper URL for relative paths
  const finalUrl = `${S3_BUCKET_URL}/${path.replace(/^\//, '')}`;
  return finalUrl;
};