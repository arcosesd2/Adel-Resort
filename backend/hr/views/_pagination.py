from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class HRPageNumberPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 500


def paginate_or_list(request, qs, serializer_cls, **serializer_kwargs):
    """Backward-compatible pagination: returns a paginated envelope only when
    `?page=` is supplied, otherwise falls back to the legacy `limit`-capped list.
    """
    if request.query_params.get('page'):
        paginator = HRPageNumberPagination()
        page = paginator.paginate_queryset(qs, request)
        if page is not None:
            ser = serializer_cls(page, many=True, **serializer_kwargs)
            return paginator.get_paginated_response(ser.data)
    try:
        limit = min(int(request.query_params.get('limit', 200)), 500)
    except (ValueError, TypeError):
        limit = 200
    ser = serializer_cls(qs[:limit], many=True, **serializer_kwargs)
    return Response(ser.data)
