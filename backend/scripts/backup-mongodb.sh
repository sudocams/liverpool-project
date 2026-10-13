#!/bin/sh
set -eu
umask 077
: "${MONGODB_URI:?Set MONGODB_URI to the database to back up}"

backup_dir=${BACKUP_DIR:-./backups}
retention_days=${BACKUP_RETENTION_DAYS:-30}
case "$retention_days" in
  ''|*[!0-9]*) echo "BACKUP_RETENTION_DAYS must be a non-negative integer." >&2; exit 2 ;;
esac
mkdir -p "$backup_dir"
stamp=$(date -u +%Y%m%dT%H%M%SZ)
archive="$backup_dir/cyberwolf-$stamp.archive.gz"
mongodump --uri="$MONGODB_URI" --archive="$archive" --gzip
if [ "$retention_days" -gt 0 ]; then
  find "$backup_dir" -type f -name 'cyberwolf-*.archive.gz' -mtime "+$retention_days" -delete
fi
echo "Created compressed MongoDB archive: $archive"
