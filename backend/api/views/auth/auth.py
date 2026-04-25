from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from rest_framework import status
from django.contrib.auth.models import User
import secrets, string


class CreateAgentView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        email = request.data.get('email')
        first_name = request.data.get('first_name', '')
        last_name = request.data.get('last_name', '')

        if not email:
            return Response({'error': 'Email is required'}, status=400)
        if User.objects.filter(email=email).exists():
            return Response({'error': 'User already exists'}, status=400)

        # Generate a temporary password
        temp_password = ''.join(
            secrets.choice(string.ascii_letters + string.digits) for _ in range(12)
        )

        user = User.objects.create_user(
            username=email,
            email=email,
            password=temp_password,
            first_name=first_name,
            last_name=last_name,
            is_staff=False,
        )

        # TODO: Email the temp_password to the agent
        return Response({
            'message': f'Agent {email} created successfully',
            'temp_password': temp_password  # Remove in production; email instead
        }, status=status.HTTP_201_CREATED)