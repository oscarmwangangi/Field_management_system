from django.db import models

class users(models.Model):

    class Role(models.TextChoices):
        ADMIN = 'admin','Admin'
        AGENT = 'agent' ,'Agent'
        
    name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=100)
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.AGENT)
    created_at = models.DateTimeField(auto_now_add=True)

class fields(models.Model):
    class Status(models.TextChoices):
        ACTIVE = 'active', 'Active'
        AT_RISK = 'at_risk', 'At_risk'
        COMPLETED = 'completed', 'Completed'

    name = models.CharField(max_length=100)
    location = models.CharField(max_length=100)
    crop_type = models.CharField(max_length=100)
    planting_date = models.DateTimeField
    status = models.CharField(max_length=100, choices=Status.choices, default=Status.ACTIVE)
    created_at = models.DateTimeField(auto_now_add=True)
    assigned_agent = models.ForeignKey(users,on_delete=models.SET_NULL,null=True,blank=True,related_name='fields')

class field_updates(models.Model):
    class Stages(models.TextChoices):
        PLANTED = 'planted','Planted'
        GROWING = 'growing' ,'Growing'
        READY = 'ready','Ready'
        HARVESTED = 'harvested','Harvested'

    field_id = models.ForeignKey(fields, on_delete=models.SET_NULL,null=True,blank=True)
    updated_by = models.ForeignKey(users,on_delete=models.SET_NULL,null=True,blank=True)
    notes = models.CharField(max_length=100)
    stages = models.CharField(max_length=100, choices=Stages.choices)
