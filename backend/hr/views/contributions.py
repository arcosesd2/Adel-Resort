from django.core.management import call_command
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from accounts.models import log_activity
from accounts.permissions import IsAdminOrSuperAdmin

from hr.models import SSSBracket, PhilHealthRate, PagIbigRate, BIRTaxBracket
from hr.serializers import (
    SSSBracketSerializer, PhilHealthRateSerializer,
    PagIbigRateSerializer, BIRTaxBracketSerializer,
)


def _crud_list(request, model, serializer_cls):
    if request.method == 'GET':
        qs = model.objects.all()
        return Response(serializer_cls(qs, many=True).data)
    serializer = serializer_cls(data=request.data)
    if serializer.is_valid():
        obj = serializer.save()
        log_activity(request.user, 'payroll', f'Created {model.__name__} #{obj.pk}')
        return Response(serializer_cls(obj).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


def _crud_detail(request, model, serializer_cls, pk):
    try:
        obj = model.objects.get(pk=pk)
    except model.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
    if request.method == 'GET':
        return Response(serializer_cls(obj).data)
    if request.method == 'PATCH':
        serializer = serializer_cls(obj, data=request.data, partial=True)
        if serializer.is_valid():
            obj = serializer.save()
            log_activity(request.user, 'payroll', f'Updated {model.__name__} #{obj.pk}')
            return Response(serializer_cls(obj).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    obj.delete()
    log_activity(request.user, 'payroll', f'Deleted {model.__name__} #{pk}')
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET', 'POST'])
@permission_classes([IsAdminOrSuperAdmin])
def sss_list(request):
    return _crud_list(request, SSSBracket, SSSBracketSerializer)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAdminOrSuperAdmin])
def sss_detail(request, pk):
    return _crud_detail(request, SSSBracket, SSSBracketSerializer, pk)


@api_view(['GET', 'POST'])
@permission_classes([IsAdminOrSuperAdmin])
def philhealth_list(request):
    return _crud_list(request, PhilHealthRate, PhilHealthRateSerializer)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAdminOrSuperAdmin])
def philhealth_detail(request, pk):
    return _crud_detail(request, PhilHealthRate, PhilHealthRateSerializer, pk)


@api_view(['GET', 'POST'])
@permission_classes([IsAdminOrSuperAdmin])
def pagibig_list(request):
    return _crud_list(request, PagIbigRate, PagIbigRateSerializer)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAdminOrSuperAdmin])
def pagibig_detail(request, pk):
    return _crud_detail(request, PagIbigRate, PagIbigRateSerializer, pk)


@api_view(['GET', 'POST'])
@permission_classes([IsAdminOrSuperAdmin])
def bir_list(request):
    return _crud_list(request, BIRTaxBracket, BIRTaxBracketSerializer)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAdminOrSuperAdmin])
def bir_detail(request, pk):
    return _crud_detail(request, BIRTaxBracket, BIRTaxBracketSerializer, pk)


@api_view(['POST'])
@permission_classes([IsAdminOrSuperAdmin])
def seed_tables(request):
    call_command('seed_contribution_tables')
    log_activity(request.user, 'payroll', 'Re-seeded contribution tables')
    return Response({'detail': 'Seeded.'})
