from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from rest_framework.exceptions import AuthenticationFailed
from ..views.auth.send_otp import verify_otp


class RegisterSerializer(serializers.ModelSerializer):
    otp = serializers.CharField(write_only=True)
    first_name = serializers.CharField()
    last_name = serializers.CharField()

    class Meta:
        model = User
        fields = ('email', 'password', 'otp', 'first_name', 'last_name')
        extra_kwargs = {'password': {'write_only': True}}

    def validate(self, attrs):
        email = attrs.get('email')
        otp = attrs.pop('otp')
        if not verify_otp(email, otp):
            raise serializers.ValidationError("Invalid OTP")
        return attrs

    def create(self, validated_data):
        is_first_user = not User.objects.exists()  # 👈 first user check

        user = User.objects.create_user(
            username=validated_data['email'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
        )

        if is_first_user:
            user.is_staff = True
            user.is_superuser = True
            user.save()

        return user


class EmailLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')

        # authenticate directly using email as username
        user = authenticate(username=email, password=password)

        if not user:
            raise AuthenticationFailed('Invalid credentials')

        if not user.is_active:
            raise AuthenticationFailed('User account is disabled')

        return {
            'user': user,
            'email': user.email,
            'username': user.username,
            'is_admin': user.is_staff,
        }