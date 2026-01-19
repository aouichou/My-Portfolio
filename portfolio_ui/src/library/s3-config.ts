export const S3_BUCKET_URL = 'https://media.aouichou.me';

export const getMediaUrl = (path: string): string => {
  if (!path) {
    return "/fallback-image.jpg";
  }
  
  // Return direct URLs without modification
  if (path.startsWith('http')) {
    // In development, replace localhost media URLs with S3 for galleries
    // since gallery images don't exist in local dev environment
    if (typeof window !== 'undefined') {
      const isLocalhost = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1';
      
      if (isLocalhost && path.includes('/media/galleries/')) {
        // Extract the path after /media/
        const mediaPath = path.split('/media/')[1];
        return `${S3_BUCKET_URL}/${mediaPath}`;
      }
    }
    return path;
  }
  
  // Create proper URL for relative paths
  const finalUrl = `${S3_BUCKET_URL}/${path.replace(/^\//, '')}`;
  return finalUrl;
};