import datetime

def _get_start_of_tracking(kwargs):
    start_date = datetime.datetime(2023,8,8,0,0).isoformat() + "Z"
    end_date = datetime.datetime.now().isoformat() + "Z"
    return start_date, end_date

def _get_previous_week(kwargs):
    date = datetime.datetime.now()
    start_date = date + datetime.timedelta(-date.weekday(), weeks=-1)
    end_date = date + datetime.timedelta(-date.weekday() - 1)
    start_date = start_date.replace(hour=0, minute=0)
    end_date = end_date.replace(hour=23, minute=59)
    return start_date.isoformat() + "Z", end_date.isoformat() + "Z"

def _get_current_week(kwargs):
    date = datetime.datetime.now()
    start_date = date - datetime.timedelta(days=date.weekday())
    end_date = date
    start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
    end_date = end_date.replace(hour=23, minute=59, second=59, microsecond=999999)
    return start_date.isoformat() + "Z", end_date.isoformat() + "Z"

def _get_thirty_day_date(kwargs):
    date = datetime.datetime.now()
    result = date - datetime.timedelta(days=30)
    result = result.replace(hour=0, minute=0)
    return result.isoformat() + "Z", date.isoformat() + "Z"

def _get_selected_month(kwargs):
    month = int(kwargs['month'])
    year = int(kwargs['year'])
    first_date = datetime.datetime(year, month, 1)
    if month == 12:
        last_date = datetime.datetime(year, month, 31)
    else:
        last_date = datetime.datetime(year, month + 1, 1) + datetime.timedelta(days=-1)
        
    return first_date.isoformat() + "Z", last_date.isoformat() + "Z"

def _get_selected_week(kwargs):
    week = int(kwargs['week']) + 1
    year = int(kwargs['year'])
    firstdayofweek = datetime.datetime.strptime(f'{year}-W{int(week)- 1}-1', "%Y-W%W-%w")
    lastdayofweek = firstdayofweek + datetime.timedelta(days=6.9)
    return firstdayofweek.isoformat() + "Z", lastdayofweek.isoformat() + "Z"

def _get_specific_Sdate_and_Edate(kwargs):
    return kwargs['SDate'].isoformat() + "Z", kwargs['EDate'].isoformat() + "Z"



time_period_mapping = {
    'SOT':      _get_start_of_tracking,          # Start of tracking
    'PW':       _get_previous_week,              # Previous week
    'P30D':     _get_thirty_day_date,            # Previous 30 days
    'SM':       _get_selected_month,             # Selected month number
    'SW':       _get_selected_week,              # Selected week number
    'Dates':    _get_specific_Sdate_and_Edate,   # Selected date
    'CW':       _get_current_week                # Current week
}


def get_dates_for_timeperiod(period,**kwargs):
    result = time_period_mapping[period](kwargs)
    return result



