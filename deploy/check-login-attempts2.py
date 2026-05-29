import paramiko

vps2 = paramiko.SSHClient()
vps2.set_missing_host_key_policy(paramiko.AutoAddPolicy())
vps2.connect('74.208.142.42', username='root')

cmd = """su - adel -c 'cd /home/adel/adel-beach-resort/backend && source venv/bin/activate && python manage.py shell -c "
from accounts.models import LoginAttempt
attempts = LoginAttempt.objects.all().order_by(\\\"-created_at\\\")[:20]
for a in attempts:
    print(f\\\"{a.created_at} | ip={a.ip_address} | user={a.username} | success={a.success} | reason={getattr(a, chr(102)+chr(97)+chr(105)+chr(108)+chr(117)+chr(114)+chr(101)+chr(95)+chr(114)+chr(101)+chr(97)+chr(115)+chr(111)+chr(110), None)}\\\")
print()
print(f\\\"Total: {LoginAttempt.objects.count()}\\\")
print(f\\\"Failed: {LoginAttempt.objects.filter(success=False).count()}\\\")
print(f\\\"Successful: {LoginAttempt.objects.filter(success=True).count()}\\\")
"'"""

stdin, stdout, stderr = vps2.exec_command(cmd)
print(stdout.read().decode())
print(stderr.read().decode()[:500] if stderr else '')

vps2.close()