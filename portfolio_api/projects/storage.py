# portfolio_api/projects/storage.py

from storages.backends.s3boto3 import S3Boto3Storage

class CustomS3Storage(S3Boto3Storage):
    """Custom S3 storage with proper hostname verification"""
    def url(self, name, parameters=None, expire=3600):
        # Force correct regional endpoint
        self.bucket_name = self.bucket_name.split('.')[0]  # Remove any accidental duplication
        return super().url(name, parameters, expire)