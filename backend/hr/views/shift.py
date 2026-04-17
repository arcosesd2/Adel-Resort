from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from accounts.permissions import IsAdminOrSuperAdmin
from hr.models import Shift, ShiftAssignment
from hr.serializers.shift import (
    ShiftSerializer, ShiftAssignmentSerializer, ShiftAssignmentWriteSerializer,
)


@api_view(['GET', 'POST'])
@permission_classes([IsAdminOrSuperAdmin])
def shift_list(request):
    if request.method == 'GET':
        qs = Shift.objects.all()
        is_active = request.query_params.get('is_active')
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() == 'true')
        return Response(ShiftSerializer(qs, many=True).data)
    serializer = ShiftSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data, status=201)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAdminOrSuperAdmin])
def shift_detail(request, pk):
    shift = Shift.objects.get(pk=pk)
    if request.method == 'GET':
        data = ShiftSerializer(shift).data
        data['assignments'] = ShiftAssignmentSerializer(
            shift.assignments.all()[:50], many=True
        ).data
        return Response(data)
    if request.method == 'DELETE':
        shift.is_active = False
        shift.save(update_fields=['is_active'])
        return Response(status=204)
    serializer = ShiftSerializer(shift, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)


@api_view(['GET', 'POST'])
@permission_classes([IsAdminOrSuperAdmin])
def assignment_list(request):
    if request.method == 'GET':
        qs = ShiftAssignment.objects.select_related('employee', 'employee__user', 'shift')
        employee = request.query_params.get('employee')
        if employee:
            qs = qs.filter(employee_id=int(employee))
        shift = request.query_params.get('shift')
        if shift:
            qs = qs.filter(shift_id=int(shift))
        current_only = request.query_params.get('current')
        if current_only and current_only.lower() == 'true':
            from datetime import date
            today = date.today()
            from django.db.models import Q
            qs = qs.filter(effective_date__lte=today).filter(
                Q(end_date__isnull=True) | Q(end_date__gte=today)
            )
        return Response(ShiftAssignmentSerializer(qs, many=True).data)
    serializer = ShiftAssignmentWriteSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    serializer.save(created_by=request.user)
    return Response(ShiftAssignmentSerializer(serializer.instance).data, status=201)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAdminOrSuperAdmin])
def assignment_detail(request, pk):
    assignment = ShiftAssignment.objects.get(pk=pk)
    if request.method == 'GET':
        return Response(ShiftAssignmentSerializer(assignment).data)
    if request.method == 'DELETE':
        assignment.delete()
        return Response(status=204)
    serializer = ShiftAssignmentWriteSerializer(assignment, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(ShiftAssignmentSerializer(serializer.instance).data)
