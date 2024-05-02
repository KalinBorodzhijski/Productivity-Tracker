import date_selector
from datetime import datetime, timedelta
import numpy as np
import pandas as pd


def _calculate_time_delta(event):
    '''
    Calculate time delta between the start and the end date of the event
    '''
    datetime_start = datetime.fromisoformat(event['start']['dateTime'])
    datetime_end = datetime.fromisoformat(event['end']['dateTime'])
    return datetime_end - datetime_start

#--------------------------------------------------------------------------------------------------------------

def _format_timedelta(timedelta):
    s = timedelta.total_seconds()
    hours, remainder = divmod(s, 3600)
    minutes, seconds = divmod(remainder, 60)
    return '{:02}:{:02}:{:02}'.format(int(hours), int(minutes), int(seconds))

#--------------------------------------------------------------------------------------------------------------

def _get_time_per_category(events,colors,params):
    '''
    Calculates total time spent per each category for the defined period of time
    
    Params:
    - events - Events for the specified period of time
    - colors - Color to Category name mapping dict
    
    Return:
    - Dict that contains the category name as key and total time spent for the category as value
    '''
    categories_list = list(colors.values())
    total_time_per_category = {key: timedelta(0) for key in categories_list}
    for event in events:
        if event['colorId'] in colors:
            delta = _calculate_time_delta(event)
            if delta > timedelta(0):
                total_time_per_category[colors[event['colorId']]] += delta
            else:
                print(f'{event} have negative timedelta !')
    
    result_dict = {key: _format_timedelta(total_time_per_category[key]) for key in total_time_per_category}
    return result_dict

#--------------------------------------------------------------------------------------------------------------

def _get_average_working_day(events,colors,params):
    average_woriking_day = dict({'Work':''})
    timedelta_working_day = timedelta(0)
    for event in events:
        if colors[event['colorId']] == "Work":
            delta = _calculate_time_delta(event)
            if delta > timedelta(0):
                timedelta_working_day += delta
    
    average_woriking_day["Work"] = _format_timedelta(timedelta_working_day/params['working_days'])
    return average_woriking_day

#--------------------------------------------------------------------------------------------------------------

def _get_average_session_duration(events,colors,params):
    categories_list = list(colors.values())
    average_session_duration = {key: list() for key in categories_list}
    result_dict = {key: '00:00:00' for key in categories_list}
    for event in events:
        if event['colorId'] in colors:
            delta = _calculate_time_delta(event)
            if delta > timedelta(0):
                average_session_duration[colors[event['colorId']]].append(delta)
                
    for category in average_session_duration:
        values_list = average_session_duration[category]
        if values_list:
            result_dict[category] = _format_timedelta(sum(values_list,timedelta()) / len(values_list))
    return result_dict            

#--------------------------------------------------------------------------------------------------------------

def _get_average_active_time(events,colors,params):
    total_active_time = timedelta(0)
    for event in events:
        delta = _calculate_time_delta(event)
        total_active_time += delta
    daily_active_time = _format_timedelta(total_active_time / params['total_days'])
    return dict({'Daily Average Active Time': daily_active_time})
    
#--------------------------------------------------------------------------------------------------------------

def _get_number_of_sessions(events,colors,params):
    categories_list = list(colors.values())
    number_of_sessions = {key: 0 for key in categories_list}
    for event in events:
        if event['colorId'] in colors:
            number_of_sessions[colors[event['colorId']]] += 1
    
    return number_of_sessions

#--------------------------------------------------------------------------------------------------------------

def _get_event_summary(events,colors,params):
    categories_list = list(colors.values())
    event_summary = {key: list() for key in categories_list}
    for event in events:
        if event['colorId'] in colors:
            delta = _calculate_time_delta(event)
            if delta > timedelta(0):
                event_time = datetime.fromisoformat(event['start']['dateTime']).date()
                event_summary[colors[event['colorId']]].append((event['summary'],_format_timedelta(delta),event_time.strftime('%d/%m/%Y')))

    for category in event_summary:
        event_summary[category].sort(key=lambda tup: tup[2])

    return event_summary

#--------------------------------------------------------------------------------------------------------------

def _get_events_for_timeperiod(service,time_period, **kwargs):
    '''
    Calls Goolge calendar API in order to fetch all the events based on the passed parameters.
    
    Params:
    - Service - The service object that manages the connetion to the server
    - Time period - The period of the time samples. Possible values:
        - 'SOT'     - Start of tracking. Defined by the date 08.08.2023 to NOW. No additional arguments needed.
        - 'PW'      - Previous week. No additional arguments needed.
        - 'CW'      - Current week. No additional arguments needed.
        - 'P30D'    - Previous 30 days. No additional arguments needed.
        - 'SM'      - Selected month. Pass as argument 'month' with the number of the month   
        - 'SW':     - Selected week. Pass as argument 'week' with the week number
        - 'Dates':  - Specific start and end date. Pass 'SDate' and 'EDate' datetime objects with the specific dates
    
    '''
    keys = ['summary','colorId','start','end']
    result_list = []
    start_date, end_date = date_selector.get_dates_for_timeperiod(time_period, **kwargs)
    events = service.events().list(calendarId='primary', timeMin=start_date, timeMax=end_date, maxResults=1000).execute()
    for event in events['items']:
        result_dict = {key: event[key] for key in keys if key in event}
        result_list.append(result_dict)
    return result_list,start_date, end_date

#--------------------------------------------------------------------------------------------------------------

def _get_colors(service):
    result_dict = dict()
    colors = service.colors().get().execute()
    for color in colors['event']:
        result_dict[color] = colors['event'][color]['background']
    return result_dict

#--------------------------------------------------------------------------------------------------------------

analysis = {
    'TimePerCategory': _get_time_per_category,
    'AverageWorkingDay': _get_average_working_day,
    'AverageSessionDuration': _get_average_session_duration,
    'AverageActiveTimePerDay': _get_average_active_time,
    'NumberOfSessions': _get_number_of_sessions,
    'EventSummary': _get_event_summary
    # TODO: Add total time per week in line for the past weeks per each feature
    # TODO: Add count successful and not weeks in the analysis
}

Categories = {
    # Color index : Category name
    "10"    : "Work",                       # Работа - тъмно зелено
    "9"     : "University",                 # Университет - тъмно синьо
    "6"     : "University Study",           # Учене университет - оранжево
    "3"     : "Reading",                    # Четене - Лилаво
    "11"    : "Personal Projects",          # Лични проекти - Червено
    "2"     : "Personal Study",             # Лично учене - Светло зелено
    "5"     : "Workouts",                   # Тренировки - Жълто
    "7"     : "Investing and Buisness",     # Инвестиране - Светло синьо
    "4"     : "Productive Activity"         # Продуктивна дейност - Розово
}

color_mapping = {
    "1": "#a4bdfc",
    "2": "#7ae7bf",
    "3": "#dbadff",
    "4": "#ff887c",
    "5": "#fbd75b",
    "6": "#ffb878",
    "7": "#46d6db",
    "8": "#e1e1e1",
    "9": "#5484ed",
    "10": "#51b749",
    "11": "#dc2127",
}

def analyze(service, analysis_type, period, **kwargs):
    '''
    Does the wanted analysis and returns the result.
    
    Params:
    - Service - The service object that manages the connetion to the server
    
    - Analysis_type - Type of analysis to be done on the data. Possible values are:
        - TimePerCategory - For the specified period of time gives total time per category
        - AverageWorkingDay - For the specified period of time gives the average time spent working
        - AverageSessionDuration - For the specified period of time gives average session duration per category
        - AverageActiveTimePerDay - For the specified period of time gives the average active time per day and category
        - NumberOfSessions - For the specified period of time gives the total number of sessions per each category
        - EventSummary - For the specified period of time gives the names of different events per category and their time
        
    - Period - The period of the time samples. Possible values:
        - 'SOT'     - Start of tracking. Defined by the date 08.08.2023 to NOW. No additional arguments needed.
        - 'PW'      - Previous week. No additional arguments needed.
        - 'CW'      - Current week. No additional arguments needed.
        - 'P30D'    - Previous 30 days. No additional arguments needed.
        - 'SM'      - Selected month. Pass as argument 'month' with the number of the month   
        - 'SW':     - Selected week. Pass as argument 'week' with the week number
        - 'Dates':  - Specific start and end date. Pass 'SDate' and 'EDate' datetime objects with the specific dates
        
    Return:
    - Returns dictionary that contains all the categories and as value the desired analysis
    
    '''
    result = dict()
    events, start_date, end_date = _get_events_for_timeperiod(service,period,**kwargs)
    colors = _get_colors(service)
    
    # Remove events with no color ID and no valid date
    events[:] = [event for event in events if 'dateTime' in event['start'] and 'colorId' in event]

    if colors != color_mapping:
        print('There is new color mapping')
        
    if analysis_type in analysis:
        params = dict()
        if analysis_type == 'AverageWorkingDay':
            working_days = np.busday_count(datetime.fromisoformat(start_date).date(), 
                                           datetime.fromisoformat(end_date).date())
            params['working_days'] = working_days
        elif analysis_type == 'AverageActiveTimePerDay':
            total_days_in_period = datetime.fromisoformat(end_date) - datetime.fromisoformat(start_date)
            timedelta_days = pd.to_timedelta(total_days_in_period).round('1d')
            params['total_days'] = timedelta_days.days

        result = analysis[analysis_type](events,Categories,params)
    else:
        print(f'Analysis "{analysis_type}" is not defined.')
        
    return result
#--------------------------------------------------------------------------------------------------------------
