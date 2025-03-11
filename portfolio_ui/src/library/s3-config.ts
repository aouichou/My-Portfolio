export const S3_BUCKET_URL = 'https://s3.eu-west-1.amazonaws.com/bucketeer-0a244e0e-1266-4baf-88d1-99a1b4b3e579';

export const getMediaUrl = (path: string): string => {
  if (!path) {
    console.log('Empty path provided to getMediaUrl');
    return "/fallback-image.jpg";
  }
  
  // For debugging purposes
  console.log('Original image path:', path);
  
  // Return direct URLs without modification
  if (path.startsWith('http')) {
    console.log('Using direct URL:', path);
    return path;
  }
  
  // Create proper URL for relative paths
  const finalUrl = `${S3_BUCKET_URL}/${path.replace(/^\//, '')}`;
  console.log('Generated S3 URL:', finalUrl);
  return finalUrl;
};