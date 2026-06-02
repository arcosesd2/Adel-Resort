def get_client_ip(request):
    """Return the client IP recorded by the trusted reverse proxy."""
    x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded:
        forwarded_ips = [ip.strip() for ip in x_forwarded.split(',') if ip.strip()]
        if forwarded_ips:
            return forwarded_ips[-1]
    return request.META.get('REMOTE_ADDR')
