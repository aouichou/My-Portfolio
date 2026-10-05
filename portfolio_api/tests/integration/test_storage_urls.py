# tests/integration/test_storage_urls.py
"""F2-08 — CustomS3Storage URL-building paths (storage.py).

The storage layer builds the demo-file URLs handed to browsers
(GET /api/projects/{slug}/files/). These tests pin the URL-building
behavior including the external escape hatch, without touching R2:

- url() happy path delegates to the S3Boto3 parent ( boto3 client
  stubbed — no network )
- a dotted bucket name is normalized to its first label BEFORE the
  parent builds the URL ( the old hostname-corruption bug )
- any parent failure falls back to a plain https://s3.… URL — never
  raises into the view
- exists() always False ( skip-the-head workaround ) and ACL stripped
  from object parameters ( bucket-owner-enforced buckets )
- get_storage() selects FileSystemStorage under DEBUG else S3
"""

from unittest import mock

from django.core.files.storage import FileSystemStorage
from django.test import override_settings
from projects.storage import CustomS3Storage, get_storage
from storages.backends.s3boto3 import S3Boto3Storage


def make_storage():
    """A CustomS3Storage with the S3Boto3 PARENT url() stubbed.

    The parent would build a signed URL via boto3; the stub records the
    name/bucket OUR url() hands down so assertions run on the CustomS3
    logic ( and no client/credentials are needed ). The patch is active
    only inside the returned context manager.
    """
    calls = {}

    def fake_parent_url(self, name, parameters=None, expire=None):
        calls['name'] = name
        calls['bucket'] = self.bucket_name
        return f'https://r2.example.com/{self.bucket_name}/{name}'

    return mock.patch.object(S3Boto3Storage, 'url', fake_parent_url), calls


class TestCustomS3StorageUrl:

    def test_url_delegates_and_returns_parent_url(self):
        storage = CustomS3Storage()
        storage.bucket_name = 'media-bucket'
        patcher, calls = make_storage()
        with patcher:
            url = storage.url('project-files/minishell.zip')
        assert url == ('https://r2.example.com/media-bucket/'
                       'project-files/minishell.zip')
        assert calls['name'] == 'project-files/minishell.zip'

    def test_dotted_bucket_name_normalized_before_url_build(self):
        """The pre-rework hostname bug: a bucket name carrying a domain
        suffix must be cut to its first label before the parent builds
        the URL."""
        storage = CustomS3Storage()
        storage.bucket_name = 'media.aouichou.me.s3.amazonaws.com'
        patcher, calls = make_storage()
        with patcher:
            url = storage.url('some/file.zip')
        assert 'media.aouichou.me.s3.amazonaws.com/' not in url
        assert calls['bucket'] == 'media'
        assert url == 'https://r2.example.com/media/some/file.zip'

    def test_parent_failure_returns_external_fallback_url(self):
        """The escape hatch: any exception in the parent url() must
        produce a usable https URL, not raise into the view."""
        storage = CustomS3Storage()
        storage.bucket_name = 'media-bucket'
        storage.region_name = 'auto'

        def exploding_url(self, name, parameters=None, expire=None):
            raise RuntimeError('no credentials')

        with mock.patch.object(S3Boto3Storage, 'url', exploding_url):
            url = storage.url('project-files/lost.zip')
        assert url == ('https://s3.auto.amazonaws.com/media-bucket/'
                       'project-files/lost.zip')

    def test_fallback_defaults_region_when_unset(self):
        storage = CustomS3Storage()
        storage.bucket_name = 'media-bucket'
        if hasattr(storage, 'region_name'):
            del storage.region_name

        def exploding_url(self, name, parameters=None, expire=None):
            raise RuntimeError('no credentials')

        with mock.patch.object(S3Boto3Storage, 'url', exploding_url):
            url = storage.url('f.txt')
        assert url.startswith('https://s3.')
        assert 'eu-west-1' in url  # the documented default region


class TestCustomS3StorageWorkarounds:

    def test_exists_always_false_skips_head(self):
        storage = CustomS3Storage()
        assert storage.exists('anything') is False

    def test_acl_stripped_from_object_parameters(self):
        """Bucket-owner-enforced buckets reject ACL params — they must be
        removed before upload."""
        storage = CustomS3Storage()
        with mock.patch.object(
                S3Boto3Storage, 'get_object_parameters',
                return_value={'ACL': 'public-read',
                              'ContentType': 'text/plain'}):
            params = storage.get_object_parameters('x.txt')
        assert 'ACL' not in params
        assert params['ContentType'] == 'text/plain'

    def test_params_untouched_when_no_acl(self):
        storage = CustomS3Storage()
        with mock.patch.object(
                S3Boto3Storage, 'get_object_parameters',
                return_value={'ContentType': 'text/plain'}):
            params = storage.get_object_parameters('x.txt')
        assert params == {'ContentType': 'text/plain'}


    def test_normalize_name_collapses_double_slashes(self):
        """The path-hygiene workaround: '//' in object names must not
        survive normalization."""
        storage = CustomS3Storage()
        with mock.patch.object(S3Boto3Storage, '_normalize_name',
                               side_effect=lambda name: name):
            assert storage._normalize_name('a//b/file.txt') == 'a/b/file.txt'
            assert storage._normalize_name('clean/path.txt') == 'clean/path.txt'


class TestLazyStorage:

    @override_settings(DEBUG=True)
    def test_lazy_storage_call_returns_local_fs_in_debug(self):
        from projects.storage import LazyStorage
        assert isinstance(LazyStorage()(), FileSystemStorage)

    @override_settings(DEBUG=False)
    def test_lazy_storage_call_returns_s3_in_production(self):
        from projects.storage import LazyStorage
        assert isinstance(LazyStorage()(), CustomS3Storage)


# ═════════════════════════════════════════════════════════════════════════════
# Documented skips — F2-08
# ═════════════════════════════════════════════════════════════════════════════
# consumers.py line 165 (`Forward task cancelled` log) — the success path
# of `await self.forward_task` after cancel(): reached only when the task
# completes between the done() check and cancellation delivery — an event-
# loop race not reachable deterministically without instrumenting asyncio
# internals. The CancelledError sibling (166) IS covered. Not forced.
#
# The 180s dial timeout is asserted at the asyncio.wait_for boundary
# (stubbed) — actually sleeping 180s is not a deterministic fast test.


class TestGetStorageSelection:

    @override_settings(DEBUG=True)
    def test_debug_uses_local_filesystem(self):
        assert isinstance(get_storage(), FileSystemStorage)

    @override_settings(DEBUG=False)
    def test_production_uses_custom_s3(self):
        assert isinstance(get_storage(), CustomS3Storage)
