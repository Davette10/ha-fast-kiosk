"""Constants for Amazon Order Sync."""

from datetime import timedelta

DOMAIN = "amazon_order_sync"

CONF_OTP_SECRET = "otp_secret"
CONF_OTP_CODE = "otp_code"
CONF_TODO_ENTITY = "todo_entity"
CONF_HELPER_URL = "helper_url"
CONF_TOKEN = "token"
DEFAULT_HELPER_URL = "http://192.168.6.170:8765"

DEFAULT_TODO = "todo.amazon_orders"

# Low-risk pacing: look like a person checking Your Orders now and then.
MIN_GAP = timedelta(minutes=20)        # never two order-page reads closer than this
SCHEDULE_EVERY = timedelta(hours=4)    # background check while there are orders on the way
QUIET_START_HOUR = 22                  # no background checks between 10 PM ...
QUIET_END_HOUR = 7                     # ... and 7 AM
NEW_ORDER_DAYS = 7                     # add orders placed in the last week that the emails missed

SERVICE_REFRESH = "refresh"
SIGNAL_STATUS = f"{DOMAIN}_status"
