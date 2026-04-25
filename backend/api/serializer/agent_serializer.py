# ── api/serializers/agent_serializer.py ──────────────────────────────────────
from rest_framework import serializers
from django.contrib.auth.models import User
from api.models import fields as Field


class FieldSummarySerializer(serializers.ModelSerializer):
    latest_stage = serializers.SerializerMethodField()

    class Meta:
        model = Field
        fields = ('id', 'name', 'location', 'status', 'latest_stage')

    def get_latest_stage(self, obj):
        latest = obj.field_updates.order_by('-id').first()
        return latest.stages if latest else None


class AgentSerializer(serializers.ModelSerializer):
    fields = FieldSummarySerializer(many=True, read_only=True)
    fields_count = serializers.SerializerMethodField()
    at_risk_count = serializers.SerializerMethodField()
    completed_count = serializers.SerializerMethodField()
    performance = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            'id', 'first_name', 'last_name', 'email',
            'is_active', 'fields', 'fields_count',
            'at_risk_count', 'completed_count', 'performance',
        )

    def get_fields_count(self, obj):
        return obj.fields.count()

    def get_at_risk_count(self, obj):
        return obj.fields.filter(status='at_risk').count()

    def get_completed_count(self, obj):
        return obj.fields.filter(status='completed').count()

    def get_performance(self, obj):
        total = obj.fields.count()
        if total == 0:
            return 0
        completed = obj.fields.filter(status='completed').count()
        at_risk = obj.fields.filter(status='at_risk').count()
        score = ((completed * 1.0) + (total - at_risk - completed) * 0.5) / total
        return round(min(score * 100, 100))