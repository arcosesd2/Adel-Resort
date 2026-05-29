import paramiko

vps2 = paramiko.SSHClient()
vps2.set_missing_host_key_policy(paramiko.AutoAddPolicy())
vps2.connect('74.208.142.42', username='root')

# Just pull the latest code via Git using a personal access or try resetting the remote
# First workaround: copy the changed files via a tar archive

import os

# Create list of key changed files
changed_files = [
    'app/globals.css',
    'app/layout.js',
    'app/page.js',
    'app/about/page.js',
    'app/availability/page.js',
    'app/pricing/page.js',
    'app/news/page.js',
    'app/promotions/page.js',
    'app/events/page.js',
    'app/rooms/page.js',
    'app/rooms/[id]/page.js',
    'app/checkout/page.js',
    'app/booking/[id]/page.js',
    'app/auth/login/page.js',
    'app/auth/register/page.js',
    'app/auth/forgot-password/page.js',
    'app/auth/reset-password/page.js',
    'app/account/layout.js',
    'app/account/page.js',
    'app/account/security/page.js',
    'app/account/notifications/page.js',
    'app/account/favorites/page.js',
    'app/account/reviews/page.js',
    'app/account/preferences/page.js',
    'app/account/verify-email/page.js',
    'app/account/verify-subscription/page.js',
    'app/dashboard/page.js',
    'app/dashboard/attendance/page.js',
    'app/dashboard/leave/page.js',
    'app/dashboard/loans/page.js',
    'app/dashboard/payslips/page.js',
    'app/admin-account/layout.js',
    'app/admin-account/page.js',
    'app/admin-account/security/page.js',
    'app/admin-account/notifications/page.js',
    'components/ThemeToggle.jsx',
    'components/Navbar.jsx',
    'components/Footer.jsx',
    'components/HeroSection.jsx',
    'components/RoomCard.jsx',
    'components/RoomFilters.jsx',
    'components/BookingForm.jsx',
    'components/SlotPicker.jsx',
    'components/RoomReviews.jsx',
    'components/ReviewForm.jsx',
    'components/ReviewCard.jsx',
    'components/NewsletterForm.jsx',
    'components/EventCard.jsx',
    'components/NewsCard.jsx',
    'components/ChatWidget.jsx',
    'components/FavoriteButton.jsx',
    'components/PublicCalendar.jsx',
    'components/GCashPaymentForm.jsx',
    'components/BookingReceipt.jsx',
    'components/NotificationPopup.jsx',
]

base = 'C:\\Users\\Adiel\\vps2-adel-resort\\frontend'
remote_base = '/home/adel/adel-beach-resort/frontend'

uploaded = 0
for f in changed_files:
    local_path = os.path.join(base, f.replace('/', os.sep))
    remote_path = f'{remote_base}/{f}'
    if os.path.exists(local_path):
        try:
            sftp = vps2.open_sftp()
            sftp.put(local_path, remote_path)
            sftp.close()
            uploaded += 1
            print(f'Uploaded: {f}')
        except Exception as e:
            print(f'ERROR {f}: {e}')
    else:
        print(f'SKIP (not found): {f}')

# Also upload admin-dashboard files
admin_dirs = [
    'page.js', 'analytics/page.js', 'news/page.js', 'events/page.js',
    'payments/page.js', 'leave/page.js', 'attendance/page.js',
    'shifts/page.js', 'holidays/page.js', 'pay-rates/page.js',
    'settings/page.js', 'users/page.js', 'payslips/page.js',
    'loans/page.js', 'loans/[id]/page.js', 'payroll/page.js',
    'payroll/runs/[id]/page.js', 'employees/page.js',
    'employees/[id]/page.js', 'login-activity/page.js',
    'promotions/page.js', 'manage-rooms/page.js',
    'pricing/page.js', 'occupancy/page.js', 'vouchers/page.js',
    'bookings/page.js', 'subscribers/page.js', 'hero/page.js',
    'rooms/page.js', 'reviews/page.js', 'activity-log/page.js',
    'devices/page.js', 'gcash/page.js',
]

for f in admin_dirs:
    local_path = os.path.join(base, 'app', 'admin-dashboard', f.replace('/', os.sep))
    remote_path = f'{remote_base}/app/admin-dashboard/{f}'
    if os.path.exists(local_path):
        try:
            sftp = vps2.open_sftp()
            # Create parent directories if needed
            parent = os.path.dirname(remote_path)
            try:
                sftp.stat(parent)
            except:
                vps2.exec_command(f'mkdir -p {parent}')
            sftp.put(local_path, remote_path)
            sftp.close()
            uploaded += 1
        except Exception as e:
            print(f'ERROR admin-dashboard/{f}: {e}')

# Also upload tailwind config and package.json
for extra in ['tailwind.config.js', 'next.config.js', 'package.json']:
    local_path = os.path.join(base, extra)
    remote_path = f'{remote_base}/{extra}'
    if os.path.exists(local_path):
        try:
            sftp = vps2.open_sftp()
            sftp.put(local_path, remote_path)
            sftp.close()
            uploaded += 1
            print(f'Uploaded: {extra}')
        except Exception as e:
            print(f'ERROR {extra}: {e}')

print(f'\nTotal files uploaded: {uploaded}')

vps2.close()