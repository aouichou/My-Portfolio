export const S3_BUCKET_URL = 'https://s3.eu-west-1.amazonaws.com/bucketeer-0a244e0e-1266-4baf-88d1-99a1b4b3e579';

export const getMediaUrl = (path: string): string => {
  if (!path) return "/fallback-image.jpg";
  
  // For S3 bucket URLs, try to use a local version first
  if (path.includes('bucketeer-0a244e0e-1266-4baf-88d1-99a1b4b3e579')) {
    // Extract just the relative path part
    const relPath = path.split('bucketeer-0a244e0e-1266-4baf-88d1-99a1b4b3e579/')[1];
    if (relPath) {
      return `/${relPath}`; // Return as a local path
    }
  }
  
  // For all other cases, return the path as-is
  return path;
};