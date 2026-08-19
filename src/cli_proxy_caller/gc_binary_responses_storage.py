from datetime import datetime, timedelta, timezone


JOB_TTL = timedelta(minutes=0)



def gc(buckets,jobs):
    """Mutating input object"""
    timestamp_now = datetime.now(timezone.utc)
    cutoff = timestamp_now + JOB_TTL

    for binary_data_bucket_id, binary_data_bucket in list(buckets.items()):
        with binary_data_bucket.lock:
            created_at = binary_data_bucket.created_at

            if \
                   (created_at is not None and (binary_data_bucket.created_at >= cutoff) and binary_data_bucket.accessed) \
                or (binary_data_bucket.job_belonging_to_id not in jobs) \
            :
                del buckets[binary_data_bucket_id]
