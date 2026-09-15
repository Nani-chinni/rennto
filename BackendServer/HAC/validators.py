"""
Shared upload validation.

Historically an oversized upload failed silently: only MemoryFileUploadHandler
was configured, so anything past FILE_UPLOAD_MAX_MEMORY_SIZE was dropped and the
request still returned 200 with an empty request.FILES. The handler config is
fixed, but a hard ceiling still needs to reject clearly rather than quietly.
"""

MAX_UPLOAD_BYTES = 50 * 1024 * 1024
MAX_UPLOAD_LABEL = "50 MB"


def validate_upload_size(uploaded_file, label="Image"):
    """
    Raise ValueError (which the views turn into a 400 carrying the message)
    when an uploaded file is over the limit. Returns the file so it can be
    used inline.
    """
    if not uploaded_file:
        return uploaded_file

    size = getattr(uploaded_file, "size", None)
    if size and size > MAX_UPLOAD_BYTES:
        actual = size / (1024 * 1024)
        name = getattr(uploaded_file, "name", "") or ""
        suffix = f' ("{name}")' if name else ""
        raise ValueError(
            f"{label}{suffix} must be less than {MAX_UPLOAD_LABEL}. "
            f"This one is {actual:.1f} MB."
        )
    return uploaded_file
