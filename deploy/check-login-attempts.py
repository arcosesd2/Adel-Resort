import paramiko

vps2 = paramiko.SSHClient()
vps2.set_missing_host_key_policy(paramiko.AutoAddPolicy())
vps2.connect('74.208.142.42', username='root')

cmd = """su - adel -c 'cd /home/adel/adel-beach-resort/backend && source venv/bin/activate && python manage.py shell -c "
from accounts.models import LoginAttempt
# Show recent attempts
attempts = LoginAttempt.objects.all().order_by(\\\"-timestamp\\\")[:20]
for a in attempts:
    print(f\\\"{a.timestamp} | ip={a.ip_address} | username={a.username} | success={a.success}\\\" )
print(f\\\"\\\\nTotal login attempts: {LoginAttempt.objects.count()}\\\")
print(f\\\"Failed attempts: {LoginAttempt.objects.filter(success=False).count()}\\\")
print(f\\\"Successful attempts: {LoginAttempt.objects.filter(success=True).count()}\\\")
"'"""

stdin, stdout, stderr = vps2.exec_command(cmd)
print("=== RECENT LOGIN ATTEMPTS ===")
print(stdout.read().decode())
err = stderr.read().decode()
if err:
    for line in err.split('\n'):
        if 'Error' in line:
            print("ERR:", line)

vps2.close()