# ── api/views/agents.py ───────────────────────────────────────────────────────
import secrets
import string
from django.contrib.auth.models import User
from django.db.models import Count, Avg
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework import status
from api.serializer.agent_serializer import AgentSerializer
from api.models import fields as Field


class AgentListView(APIView):
    """
    GET /api/agents/
    Returns all non-admin users (agents) with their field summaries.
    Accessible by admin only.
    """
    permission_classes = [IsAdminUser]

    def get(self, request):
        agents = User.objects.filter(
            is_staff=False,
            is_superuser=False
        ).prefetch_related('fields', 'fields__field_updates')
        serializer = AgentSerializer(agents, many=True)
        return Response(serializer.data)


class AgentStatsView(APIView):
    """
    GET /api/agents/stats/
    Returns dashboard summary stats.
    """
    permission_classes = [IsAdminUser]

    def get(self, request):
        agents = User.objects.filter(is_staff=False, is_superuser=False)
        total_agents = agents.count()

        # Average fields per agent
        if total_agents > 0:
            total_fields = Field.objects.filter(
                assigned_agent__isnull=False
            ).count()
            avg_fields = round(total_fields / total_agents, 1)
        else:
            avg_fields = 0.0

        at_risk_fields = Field.objects.filter(status='at_risk').count()

        return Response({
            'total_agents': total_agents,
            'avg_fields_per_agent': avg_fields,
            'at_risk_fields': at_risk_fields,
        })


class CreateAgentView(APIView):
    """
    POST /api/agents/create/
    Admin creates a new agent. Returns a temporary password.
    """
    permission_classes = [IsAdminUser]

    def post(self, request):
        email = request.data.get('email', '').strip()
        first_name = request.data.get('first_name', '').strip()
        last_name = request.data.get('last_name', '').strip()

        if not email:
            return Response({'error': 'Email is required.'}, status=400)
        if not first_name or not last_name:
            return Response({'error': 'First and last name are required.'}, status=400)
        if User.objects.filter(email=email).exists():
            return Response({'error': 'An account with this email already exists.'}, status=400)

        # Generate secure temp password
        alphabet = string.ascii_letters + string.digits
        temp_password = ''.join(secrets.choice(alphabet) for _ in range(12))

        user = User.objects.create_user(
            username=email,
            email=email,
            password=temp_password,
            first_name=first_name,
            last_name=last_name,
            is_staff=False,
            is_superuser=False,
        )

        return Response({
            'message': f'Agent {email} created successfully.',
            'agent_id': user.id,
            'temp_password': temp_password,  # In production: email this instead
        }, status=status.HTTP_201_CREATED)


class AgentDetailView(APIView):
    """
    GET  /api/agents/<id>/   — agent detail
    DELETE /api/agents/<id>/ — deactivate agent (admin only)
    """
    permission_classes = [IsAdminUser]

    def get(self, request, pk):
        try:
            agent = User.objects.prefetch_related(
                'fields', 'fields__field_updates'
            ).get(pk=pk, is_staff=False)
        except User.DoesNotExist:
            return Response({'error': 'Agent not found.'}, status=404)
        return Response(AgentSerializer(agent).data)

    def delete(self, request, pk):
        try:
            agent = User.objects.get(pk=pk, is_staff=False)
        except User.DoesNotExist:
            return Response({'error': 'Agent not found.'}, status=404)
        agent.is_active = False
        agent.save()
        return Response({'message': f'Agent {agent.email} deactivated.'})