import paramiko

vps2 = paramiko.SSHClient()
vps2.set_missing_host_key_policy(paramiko.AutoAddPolicy())
vps2.connect('74.208.142.42', username='root')

# Get ALL failed login attempts
cmd = """su - adel -c 'cd /home/adel/adel-beach-resort/backend && source venv/bin/activate && python manage.py shell -c "
from accounts.models import LoginAttempt
failed = LoginAttempt.objects.filter(success=False).order_by(\\\"-created_at\\\")
print(f\\\"Total failed attempts: {failed.count()}\\\")
print()
for a in failed:
    print(f\\\"{a.created_at} | ip={a.ip_address} | user={a.username} | reason={a.failure_reason} | agent={a.user_agent[:60] if a.user_agent else None}\\\")
"'"""

stdin, stdout, stderr = vps2.exec_command(cmd)
print("=== FAILED LOGIN ATTEMPTS ===")
print(stdout.read().decode())

# Get IPs with most failed attempts
cmd2 = """su - adel -c 'cd /home/adel/adel-beach-resort/backend && source venv/bin/activate && python manage.py shell -c "
from accounts.models import LoginAttempt
from django.db.models import Count
from collections import Counter
failed = LoginAttempt.objects.filter(success=False)
ip_counts = Counter(a.ip_address for a in failed)
print(\\\"Failed attempts by IP:\\\")
for ip, count in ip_counts.most_common():
    print(f\\\"  {ip}: {count} attempts\\\")
user_counts = Counter(a.username for a in failed)
print()
print(\\\"Failed attempts by username:\\\")
for user, count in user_counts.most_common():
    print(f\\\"  {user}: {count} attempts\\\")
"'"""

stdin, stdout, stderr = vps2.exec_command(cmd2)
print("\n=== FAILED ATTEMPT STATS ===")
print(stdout.read().decode())

vps2.close()