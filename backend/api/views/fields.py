# ── api/views/fields.py ───────────────────────────────────────────────────────
from django.utils import timezone
from django.contrib.auth.models import User
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework import status
from api.models import fields as Field, field_updates as FieldUpdate
from api.serializer.field_serializer import FieldSerializer, FieldUpdateSerializer


class FieldListCreateView(APIView):
    """
    GET  /api/fields/  — list all fields (admin sees all, agent sees own)
    POST /api/fields/  — create field (admin only)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.is_staff:
            qs = Field.objects.select_related('assigned_agent') \
                              .prefetch_related('field_updates') \
                              .order_by('-created_at')
        else:
            qs = Field.objects.filter(assigned_agent=request.user) \
                              .select_related('assigned_agent') \
                              .prefetch_related('field_updates') \
                              .order_by('-created_at')
        return Response(FieldSerializer(qs, many=True).data)

    def post(self, request):
        if not request.user.is_staff:
            return Response({'detail': 'Admin only.'}, status=403)
        serializer = FieldSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class FieldDetailView(APIView):
    """
    GET    /api/fields/<id>/  — single field detail
    PATCH  /api/fields/<id>/  — update field info (admin)
    DELETE /api/fields/<id>/  — delete field (admin)
    """
    permission_classes = [IsAuthenticated]

    def get_object(self, pk, user):
        try:
            f = Field.objects.select_related('assigned_agent') \
                             .prefetch_related('field_updates').get(pk=pk)
            if not user.is_staff and f.assigned_agent != user:
                return None
            return f
        except Field.DoesNotExist:
            return None

    def get(self, request, pk):
        f = self.get_object(pk, request.user)
        if not f:
            return Response({'detail': 'Not found.'}, status=404)
        return Response(FieldSerializer(f).data)

    def patch(self, request, pk):
        if not request.user.is_staff:
            return Response({'detail': 'Admin only.'}, status=403)
        try:
            f = Field.objects.get(pk=pk)
        except Field.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=404)
        serializer = FieldSerializer(f, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk):
        if not request.user.is_staff:
            return Response({'detail': 'Admin only.'}, status=403)
        try:
            Field.objects.get(pk=pk).delete()
        except Field.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=404)
        return Response(status=status.HTTP_204_NO_CONTENT)


class AssignAgentView(APIView):
    """
    PATCH /api/fields/<id>/assign/
    Admin assigns or unassigns an agent to a field.
    """
    permission_classes = [IsAdminUser]

    def patch(self, request, pk):
        try:
            field = Field.objects.get(pk=pk)
        except Field.DoesNotExist:
            return Response({'detail': 'Field not found.'}, status=404)

        agent_id = request.data.get('assigned_agent')
        if agent_id:
            try:
                agent = User.objects.get(pk=agent_id, is_staff=False)
                field.assigned_agent = agent
            except User.DoesNotExist:
                return Response({'detail': 'Agent not found.'}, status=404)
        else:
            field.assigned_agent = None

        field.save()
        return Response(FieldSerializer(field).data)


class FieldUpdateListCreateView(APIView):
    """
    GET  /api/fields/<id>/updates/  — update history
    POST /api/fields/<id>/updates/  — log a new update (agent or admin)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        updates = FieldUpdate.objects.filter(field_id=pk).order_by('-created_at')
        return Response(FieldUpdateSerializer(updates, many=True).data)

    def post(self, request, pk):
        try:
            field = Field.objects.get(pk=pk)
        except Field.DoesNotExist:
            return Response({'detail': 'Field not found.'}, status=404)

        # Only assigned agent or admin can log updates
        if not request.user.is_staff and field.assigned_agent != request.user:
            return Response({'detail': 'You are not assigned to this field.'}, status=403)

        data = {
            'field_id': field.id,
            'updated_by': request.user.id,
            'stages': request.data.get('stages'),
            'notes': request.data.get('notes', ''),
        }
        serializer = FieldUpdateSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        update = serializer.save()

        # Auto-clear at_risk when an update is logged
        if field.status == 'at_risk':
            field.status = 'active'
            field.save()

        return Response(FieldUpdateSerializer(update).data, status=status.HTTP_201_CREATED)