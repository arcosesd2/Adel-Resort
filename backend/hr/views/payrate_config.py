from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from accounts.permissions import IsAdminOrSuperAdmin
from hr.models import PayRateConfig
from hr.serializers.payrate_config import PayRateConfigSerializer


@api_view(['GET', 'POST'])
@permission_classes([IsAdminOrSuperAdmin])
def config_list(request):
    if request.method == 'GET':
        qs = PayRateConfig.objects.all()
        return Response(PayRateConfigSerializer(qs, many=True).data)
    serializer = PayRateConfigSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    serializer.save(created_by=request.user)
    return Response(serializer.data, status=201)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAdminOrSuperAdmin])
def config_detail(request, pk):
    config = PayRateConfig.objects.get(pk=pk)
    if request.method == 'GET':
        return Response(PayRateConfigSerializer(config).data)
    if request.method == 'DELETE':
        config.delete()
        return Response(status=204)
    serializer = PayRateConfigSerializer(config, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAdminOrSuperAdmin])
def config_current(request):
    from django.utils import timezone
    today = timezone.now().date()
    config = (
        PayRateConfig.objects
        .filter(effective_from__lte=today)
        .order_by('-effective_from')
        .first()
    )
    if config is None:
        return Response({'detail': 'No effective pay rate config found.'}, status=404)
    return Response(PayRateConfigSerializer(config).data)
