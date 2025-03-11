# portfolio_api/projects/storage.py

from storages.backends.s3boto3 import S3Boto3Storage
import logging

logger = logging.getLogger(__name__)

class CustomS3Storage(S3Boto3Storage):
    """Custom S3 storage that skips file existence checks to avoid permission issues."""
    
    def exists(self, name):
        """
        Override the exists method to avoid the HEAD request that's causing 403 errors.
        Always return False to force upload attempt.
        """
        logger.info(f"Skipping exists check for {name}")
        return False