#!/usr/bin/env python
"""
r2_demo_zip.py — upload/verify demo zips in the R2 bucket (F4-05a).

Companion to scripts/make_demo_zip.sh (which BUILDS the zip; this script
is the explicit, separate UPLOAD step). Runs inside the backend container
(where boto3 + the R2 env vars live):

    docker exec portfolio-backend-dev python scripts/r2_demo_zip.py <cmd> ...

Commands:
    info <slug>      object size + mtime for project-files/<slug>.zip
    upload <file> <slug>
                     upload a local file (inside the container) as
                     project-files/<slug>.zip — overwrites (R2 has no
                     versioning; overwriting a demo zip is the intended
                     update path)
    ls               list project-files/* objects with sizes
    download <slug> <dest>
                     fetch project-files/<slug>.zip to <dest> (for
                     inspection/repackaging; never prints contents)

Credentials come from the container env (AWS_ACCESS_KEY_ID /
AWS_SECRET_ACCESS_KEY / AWS_S3_ENDPOINT_URL / AWS_STORAGE_BUCKET_NAME —
same vars the terminal service uses). Values are NEVER printed.
Exit codes: 0 ok · 1 usage/env error · 2 R2 error.
"""
import os
import sys
import time

import boto3
from botocore.config import Config

BUCKET = os.getenv('AWS_STORAGE_BUCKET_NAME', 'portfolio-bucket')
ENDPOINT = os.getenv('AWS_S3_ENDPOINT_URL')

# Why not print the endpoint: it embeds the R2 account id — not a secret
# per se, but no reason to broadcast it. Creds are never read here.


def client():
    if not all([os.getenv('AWS_ACCESS_KEY_ID'),
                os.getenv('AWS_SECRET_ACCESS_KEY'),
                ENDPOINT]):
        print('ERROR: R2 env vars missing (AWS_ACCESS_KEY_ID, '
              'AWS_SECRET_ACCESS_KEY, AWS_S3_ENDPOINT_URL)')
        sys.exit(1)
    return boto3.client(
        's3',
        endpoint_url=ENDPOINT,
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
        region_name='auto',
        config=Config(signature_version='s3v4',
                      s3={'addressing_style': 'path'}),
    )


def key_for(slug: str) -> str:
    return f'project-files/{slug}.zip'


def human(nbytes: int) -> str:
    return f'{nbytes / 1024 / 1024:.2f} MB'


def cmd_info(s3, slug):
    try:
        head = s3.head_object(Bucket=BUCKET, Key=key_for(slug))
    except s3.exceptions.ClientError as exc:
        code = exc.response.get('Error', {}).get('Code')
        if code == '404':
            print(f'{key_for(slug)}: NOT FOUND')
            return
        raise
    print(f'{key_for(slug)}: {head["ContentLength"]} bytes '
          f'({human(head["ContentLength"])}), '
          f'last-modified {head["LastModified"]}')


def cmd_upload(s3, local, slug):
    size = os.path.getsize(local)
    t0 = time.monotonic()
    s3.upload_file(local, BUCKET, key_for(slug))
    dt = time.monotonic() - t0
    # Verify what R2 now holds (size must match the local artifact).
    head = s3.head_object(Bucket=BUCKET, Key=key_for(slug))
    ok = head['ContentLength'] == size
    print(f'UPLOADED {local} -> {key_for(slug)} '
          f'({human(size)}) in {dt:.1f}s; remote size '
          f'{"MATCHES" if ok else "MISMATCH!"}')
    if not ok:
        sys.exit(2)


def cmd_ls(s3):
    resp = s3.list_objects_v2(Bucket=BUCKET, Prefix='project-files/')
    for obj in resp.get('Contents', []):
        print(f'{obj["Key"]}: {human(obj["Size"])} '
              f'({obj["LastModified"]})')
    if not resp.get('Contents'):
        print('(no project-files/ objects)')


def cmd_download(s3, slug, dest):
    s3.download_file(BUCKET, key_for(slug), dest)
    size = os.path.getsize(dest)
    print(f'DOWNLOADED {key_for(slug)} -> {dest} ({human(size)})')


def main():
    argv = sys.argv[1:]
    if not argv:
        print(__doc__)
        sys.exit(1)
    cmd, args = argv[0], argv[1:]
    s3 = client()
    try:
        if cmd == 'info' and len(args) == 1:
            cmd_info(s3, args[0])
        elif cmd == 'upload' and len(args) == 2:
            cmd_upload(s3, args[0], args[1])
        elif cmd == 'ls' and not args:
            cmd_ls(s3)
        elif cmd == 'download' and len(args) == 2:
            cmd_download(s3, args[0], args[1])
        else:
            print(__doc__)
            sys.exit(1)
    except s3.exceptions.ClientError as exc:
        # R2-side failure (network/creds/bucket) — print the error CLASS,
        # never the request signature or credentials.
        print(f'R2 ERROR: {exc.response.get("Error", {}).get("Code", exc)}')
        sys.exit(2)


if __name__ == '__main__':
    main()
