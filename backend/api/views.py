from rest_framework.decorators import api_view
from rest_framework.response import Response

@api_view(['GET']) 
def create_view(request):
    data = {"age": 12, "name": "oscar"}
    return Response(data)