# ── api/serializers/field_serializer.py ──────────────────────────────────────
from rest_framework import serializers
from django.utils import timezone
from api.models import fields as Field, field_updates as FieldUpdate


class AgentMiniSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    email = serializers.EmailField()


class FieldUpdateSerializer(serializers.ModelSerializer):
    updated_by_name = serializers.SerializerMethodField()

    class Meta:
        model = FieldUpdate
        fields = ('id', 'field_id', 'updated_by', 'stages', 'notes', 'updated_by_name', 'created_at')
        extra_kwargs = {
            'field_id': {'required': True},
            'updated_by': {'required': True},
        }

    def get_updated_by_name(self, obj):
        if obj.updated_by:
            return f"{obj.updated_by.first_name} {obj.updated_by.last_name}"
        return "—"


class FieldSerializer(serializers.ModelSerializer):
    assigned_agent = AgentMiniSerializer(read_only=True)
    assigned_agent_id = serializers.PrimaryKeyRelatedField(
        source='assigned_agent',
        queryset=__import__('django.contrib.auth.models', fromlist=['User']).User.objects.filter(is_staff=False),
        write_only=True,
        required=False,
        allow_null=True,
    )
    latest_update = serializers.SerializerMethodField()
    days_since_update = serializers.SerializerMethodField()

    class Meta:
        model = Field
        fields = (
            'id', 'name', 'location', 'crop_type', 'planting_date',
            'status', 'created_at', 'assigned_agent', 'assigned_agent_id',
            'latest_update', 'days_since_update',
        )
        read_only_fields = ('created_at', 'status')

    def get_latest_update(self, obj):
        update = obj.field_updates.order_by('-created_at').first()
        if update:
            return {
                'id': update.id,
                'stages': update.stages,
                'notes': update.notes,
                'updated_by_name': f"{update.updated_by.first_name} {update.updated_by.last_name}" if update.updated_by else "—",
                'created_at': update.created_at.isoformat() if update.created_at else None,
            }
        return None

    def get_days_since_update(self, obj):
        latest = obj.field_updates.order_by('-created_at').first()
        if not latest or not latest.created_at:
            # No updates — count from field creation
            delta = timezone.now() - obj.created_at
            return delta.days
        delta = timezone.now() - latest.created_at
        return delta.days