@'
from datetime import datetime, timedelta, time, UTC
from zoneinfo import ZoneInfo
from django.utils import timezone
from django.db.models import Q
from analytics.models import PageView, StaffVisitor

pht = ZoneInfo('Asia/Manila')
now_pht = timezone.now().astimezone(pht)
today_date = now_pht.date()
yesterday_date = today_date - timedelta(days=1)

staff_ids = StaffVisitor.objects.values_list('visitor_id', flat=True)
public_pv = PageView.objects.exclude(visitor_id__in=staff_ids)
account_like = (
    Q(page_path__startswith='/dashboard') |
    Q(page_path__startswith='/account') |
    Q(page_path__startswith='/booking/') |
    Q(page_path__startswith='/checkout') |
    Q(page_path__startswith='/admin-dashboard')
)
account_path_visitors = public_pv.filter(account_like).values_list('visitor_id', flat=True).distinct()
anonymous_like_pv = public_pv.exclude(visitor_id__in=account_path_visitors)

def bounds(day):
    start_local = datetime.combine(day, time.min, tzinfo=pht)
    end_local = start_local + timedelta(days=1)
    return start_local.astimezone(UTC), end_local.astimezone(UTC)

def report(label, day):
    start_utc, end_utc = bounds(day)
    qs = anonymous_like_pv.filter(timestamp__gte=start_utc, timestamp__lt=end_utc)
    print(label)
    print('date_pht=' + day.isoformat())
    print('unique_visitors_without_account=' + str(qs.values('visitor_id').distinct().count()))
    print('page_views_without_account=' + str(qs.count()))
    print('')

print('as_of_pht=' + now_pht.isoformat())
report('TODAY', today_date)
report('YESTERDAY', yesterday_date)
'@ | ssh root@74.208.142.44 "su - adel -c 'cd /home/adel/adel-beach-resort/backend && . venv/bin/activate && python manage.py shell'"
