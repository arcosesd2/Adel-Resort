import paramiko

vps2 = paramiko.SSHClient()
vps2.set_missing_host_key_policy(paramiko.AutoAddPolicy())
vps2.connect('74.208.142.42', username='root')

# Check all users
cmd = """su - adel -c 'cd /home/adel/adel-beach-resort/backend && source venv/bin/activate && python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
for u in User.objects.all():
    print(f\\\"{u.username} | active={u.is_active} | staff={u.is_staff} | superuser={u.is_superuser} | last_login={u.last_login}\\\" )
"'"""
stdin, stdout, stderr = vps2.exec_command(cmd)
print("=== USERS ===")
print(stdout.read().decode())
err = stderr.read().decode()
if err:
    # Filter for important errors only
    for line in err.split('\n'):
        if 'Error' in line or 'error' in line.lower():
            print("ERR:", line)

# Check for any blocked/failed login tables
cmd2 = """su - adel -c 'cd /home/adel/adel-beach-resort/backend && source venv/bin/activate && python manage.py shell -c "
from django.apps import apps
for app in apps.get_app_configs():
    for model in app.get_models():
        name = model.__name__.lower()
        if any(x in name for x in [\\\"block\\\", \\\"black\\\", \\\"lock\\\", \\\"attempt\\\", \\\"throttle\\\", \\\"ban\\\", \\\"fail\\\"]):
            print(f\\\"{app.label}.{model.__name__}: {model.objects.count()} rows\\\")
"'"""
stdin, stdout, stderr = vps2.exec_command(cmd2)
print("=== BLOCK/LOGIN TABLES ===")
print(stdout.read().decode())

# Check if django-axes is installed
cmd3 = "pip list 2>/dev/null | grep -i axes || echo 'Not installed'"
cmd3b = """su - adel -c 'cd /home/adel/adel-beach-resort/backend && source venv/bin/activate && pip list | grep -i axes || echo Not-installed'"""
stdin, stdout, stderr = vps2.exec_command(cmd3b)
print("=== AXES ===")
print(stdout.read().decode())

# Check failed login attempts in Django admin log
cmd4 = """su - adel -c 'cd /home/adel/adel-beach-resort/backend && source venv/bin/activate && python manage.py shell -c "
from django.contrib.admin.models import LogEntry
entries = LogEntry.objects.all().order_by(\\\"-action_time\\\")[:10]
for e in entries:
    print(f\\\"{e.action_time} | {e.user} | {e.change_message}\\\" )
"'"""
stdin, stdout, stderr = vps2.exec_command(cmd4)
print("=== RECENT ADMIN LOGS ===")
print(stdout.read().decode())

vps2.close()