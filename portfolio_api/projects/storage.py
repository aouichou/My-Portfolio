# portfolio_api/projects/storage.py

import logging

from django.conf import settings
from django.core.files.storage import FileSystemStorage
from storages.backends.s3boto3 import S3Boto3Storage

logger = logging.getLogger(__name__)

class CustomS3Storage(S3Boto3Storage):
	"""Custom S3 storage that fixes hostname issues, skips file existence checks and handles ACL restrictions"""
	
	def exists(self, name):
		"""
		Skip the exists check completely to avoid SSL validation errors
		This is a workaround for the Bucketeer S3 permission issues
		"""
		logger.info("Skipping exists check for %s", name)
		return False

	def get_object_parameters(self, name=None):
		"""
		Remove ACL from object parameters to support buckets with ACLs disabled
		(Bucket owner enforced setting)
		"""
		params = super().get_object_parameters(name)
		if 'ACL' in params:
			logger.info("Removing ACL from S3 object parameters")
			del params['ACL']
		return params

	def url(self, name, parameters=None, expire=None):
		"""
		Generate URL with proper hostname format
		"""
		try:
			# Get bucket_name safely - it's defined in parent S3Boto3Storage class
			bucket_name_attr = getattr(self, 'bucket_name', None)
			
			# Make sure bucket_name doesn't have duplicated parts
			if bucket_name_attr and '.' in str(bucket_name_attr):
				# Only keep the first part of the bucket name
				parts = str(bucket_name_attr).split('.')
				self.bucket_name = parts[0]
				logger.info("Normalized bucket name to: %s", self.bucket_name)
			
			# Use the standard S3Boto3Storage url method
			return super().url(name, parameters, expire)
		except Exception as e:
			logger.error("Error generating URL for %s: %s", name, e)
			# Return a direct S3 URL as fallback
			region = getattr(self, 'region_name', 'eu-west-1')
			bucket = getattr(self, 'bucket_name', settings.AWS_STORAGE_BUCKET_NAME)
			return f"https://s3.{region}.amazonaws.com/{bucket}/{name}"

	def _normalize_name(self, name):
		"""
		Normalize the name to prevent path issues
		"""
		name = super()._normalize_name(name)
		return name.replace('//', '/')


def get_storage():
	"""
	Returns appropriate storage backend based on DEBUG setting.
	Use local FileSystemStorage in DEBUG mode, S3 in production.
	"""
	if settings.DEBUG:
		return FileSystemStorage()
	return CustomS3Storage()


# Lazy storage instantiation - will be called when field is accessed
class LazyStorage:
	def __call__(self):
		return get_storage()


s3_storage = LazyStorage()