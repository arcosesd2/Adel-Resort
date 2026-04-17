from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from accounts.permissions import IsAdminOrSuperAdmin
from hr.models import Holiday
from hr.serializers.holiday import HolidaySerializer


@api_view(['GET', 'POST'])
@permission_classes([IsAdminOrSuperAdmin])
def holiday_list(request):
    if request.method == 'GET':
        qs = Holiday.objects.all()
        year = request.query_params.get('year')
        if year:
            qs = qs.filter(date__year=int(year))
        month = request.query_params.get('month')
        if month:
            qs = qs.filter(date__month=int(month))
        holiday_type = request.query_params.get('holiday_type')
        if holiday_type:
            qs = qs.filter(holiday_type=holiday_type)
        return Response(HolidaySerializer(qs, many=True).data)
    serializer = HolidaySerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data, status=201)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAdminOrSuperAdmin])
def holiday_detail(request, pk):
    holiday = Holiday.objects.get(pk=pk)
    if request.method == 'GET':
        return Response(HolidaySerializer(holiday).data)
    if request.method == 'DELETE':
        holiday.delete()
        return Response(status=204)
    serializer = HolidaySerializer(holiday, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)
