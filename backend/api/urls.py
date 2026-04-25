from django.urls import include, path
from .views.auth.register import RegisterView
from .views.auth.auth import CreateAgentView
from .views.auth.send_otp import SendOtpView
from .views.auth.login import LoginView
from .views.agent import AgentListView, AgentStatsView, CreateAgentView, AgentDetailView
from .views.fields import FieldListCreateView, FieldDetailView, AssignAgentView, FieldUpdateListCreateView




urlpatterns = [
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('agents/create/', CreateAgentView.as_view(), name='create_agent'),
    path('auth/send-otp/', SendOtpView.as_view(), name='send-otp'),
    path('auth/login/', LoginView.as_view(), name='login'),

    path('agents/', AgentListView.as_view(), name='agent-list'),
    path('agents/stats/', AgentStatsView.as_view(), name='agent-stats'),
    path('agents/create/', CreateAgentView.as_view(), name='create-agent'),
    path('agents/<int:pk>/', AgentDetailView.as_view(), name='agent-detail'),

    path('fields/',                          FieldListCreateView.as_view(),     name='field-list'),
    path('fields/<int:pk>/',                 FieldDetailView.as_view(),         name='field-detail'),
    path('fields/<int:pk>/assign/',          AssignAgentView.as_view(),         name='field-assign'),
    path('fields/<int:pk>/updates/',         FieldUpdateListCreateView.as_view(), name='field-updates'),
    path('fields/<int:pk>/updates/',         FieldUpdateListCreateView.as_view(), name='field-updates'),
]
