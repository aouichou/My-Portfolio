#!/usr/bin/env python
"""
Upload large files directly to R2 storage bypassing Django admin.
Usage: python upload_to_r2.py /path/to/file.gif projects/minishell/demo.gif
"""
import os
import sys

import boto3
from botocore.config import Config

# R2 Configuration
AWS_ACCESS_KEY_ID = os.getenv('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY')
AWS_STORAGE_BUCKET_NAME = os.getenv('AWS_STORAGE_BUCKET_NAME', 'portfolio-bucket')
AWS_S3_ENDPOINT_URL = os.getenv('AWS_S3_ENDPOINT_URL')

def upload_file(local_path, r2_key):
    """Upload a file directly to R2 storage."""
    if not all([AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_ENDPOINT_URL]):
        print("ERROR: Missing R2 credentials. Set environment variables:")
        print("  AWS_ACCESS_KEY_ID")
        print("  AWS_SECRET_ACCESS_KEY")
        print("  AWS_S3_ENDPOINT_URL")
        sys.exit(1)
    
    if not os.path.exists(local_path):
        print(f"ERROR: File not found: {local_path}")
        sys.exit(1)
    
    # Configure S3 client for R2
    s3_client = boto3.client(
        's3',
        endpoint_url=AWS_S3_ENDPOINT_URL,
        aws_access_key_id=AWS_ACCESS_KEY_ID,
        aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
        region_name='auto',
        config=Config(
            signature_version='s3v4',
            s3={'addressing_style': 'path'}
        )
    )
    
    # Get file size
    file_size = os.path.getsize(local_path)
    print(f"Uploading {local_path} ({file_size / 1024 / 1024:.2f} MB)")
    print(f"Destination: {r2_key}")
    
    # Upload with progress
    try:
        s3_client.upload_file(
            local_path,
            AWS_STORAGE_BUCKET_NAME,
            r2_key,
            Callback=lambda bytes_transferred: print(f"  Uploaded {bytes_transferred / 1024 / 1024:.2f} MB", end='\r')
        )
        print("\n✅ Upload successful!")
        print(f"URL: https://media.aouichou.me/{r2_key}")
    except Exception as e:
        print(f"\n❌ Upload failed: {e}")
        sys.exit(1)

if __name__ == '__main__':
    if len(sys.argv) != 3:
        print("Usage: python upload_to_r2.py <local_file> <r2_key>")
        print("Example: python upload_to_r2.py ./demo.gif projects/minishell/demo.gif")
        sys.exit(1)
    
    upload_file(sys.argv[1], sys.argv[2])
