@'
from datetime import datetime, timedelta, time, UTC
from zoneinfo import ZoneInfo
from django.utils import timezone
from django.db.models import Count, Q
from analytics.models import PageView, StaffVisitor

pht = ZoneInfo('Asia/Manila')
now_pht = timezone.now().astimezone(pht)
today = now_pht.date()
yesterday = today - timedelta(days=1)

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
anonymous_pv = public_pv.exclude(visitor_id__in=account_path_visitors)

def bounds(day):
    start_local = datetime.combine(day, time.min, tzinfo=pht)
    end_local = start_local + timedelta(days=1)
    return start_local.astimezone(UTC), end_local.astimezone(UTC)

def rows_for(day):
    start, end = bounds(day)
    qs = anonymous_pv.filter(timestamp__gte=start, timestamp__lt=end)
    return {
        r['page_path']: {
            'views': r['views'],
            'unique': r['unique_visitors'],
        }
        for r in qs.values('page_path')
        .annotate(views=Count('id'), unique_visitors=Count('visitor_id', distinct=True))
        .order_by('page_path')
    }

today_rows = rows_for(today)
yesterday_rows = rows_for(yesterday)
paths = sorted(
    set(today_rows) | set(yesterday_rows),
    key=lambda p: (
        -(today_rows.get(p, {}).get('views', 0) + yesterday_rows.get(p, {}).get('views', 0)),
        p,
    ),
)

print('as_of_pht=' + now_pht.isoformat())
print('today_pht=' + today.isoformat())
print('yesterday_pht=' + yesterday.isoformat())
print('page_path\tyesterday_views\tyesterday_unique\ttoday_views\ttoday_unique')
for p in paths:
    y = yesterday_rows.get(p, {'views': 0, 'unique': 0})
    t = today_rows.get(p, {'views': 0, 'unique': 0})
    print(f"{p}\t{y['views']}\t{y['unique']}\t{t['views']}\t{t['unique']}")
'@ | ssh root@74.208.142.44 "su - adel -c 'cd /home/adel/adel-beach-resort/backend && . venv/bin/activate && python manage.py shell'"
