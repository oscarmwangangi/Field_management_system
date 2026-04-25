import random
from django.core.mail import send_mail
from django.http import JsonResponse
from rest_framework.views import APIView

OTP_STORAGE = {}

def send_otp(email):
    
    code = random.randint(100000, 999999)
    OTP_STORAGE[email] = str(code)
    send_mail('Your OTP', f'Use this code: {code}', 'no-reply@site.com', [email])
    return code

def verify_otp(email, code):
    valid = OTP_STORAGE.get(email) == code
    if valid:
        OTP_STORAGE.pop(email, None)
    return valid



class SendOtpView(APIView):
    def post(self, request):
        email = request.data.get('email')
        if not email:
            return JsonResponse({'error': 'Email is required'}, status=400)
        send_otp(email)
        return JsonResponse({'message': 'OTP sent successfully'})