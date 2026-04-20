from .views import create_view
from django.urls import include, path

urlpatterns = [
   
    path('create_view/',create_view, name='create_view'),
]
