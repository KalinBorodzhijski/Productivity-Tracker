from event_analyzer import analyze # type: ignore
import authentication
from googleapiclient.discovery import build
import os
from google.auth.exceptions import RefreshError
from flask import Flask, request, jsonify


app = Flask(__name__)
try:
    creds = authentication.authentication()
except RefreshError as error:
    if error.args[0] == 'invalid_grant: Token has been expired or revoked.':
        os.remove('token.json')
        creds = authentication.authentication()
    else:
        exit()
        
service = build("calendar", "v3", credentials=creds)

@app.route('/analysis/time-per-category', methods=['GET'])
def time_per_category():
    return perform_analysis('TimePerCategory')

# Average Working Day Analysis
@app.route('/analysis/average-working-day', methods=['GET'])
def average_working_day():
    return perform_analysis('AverageWorkingDay')

# Average Session Duration Analysis
@app.route('/analysis/average-session-duration', methods=['GET'])
def average_session_duration():
    return perform_analysis('AverageSessionDuration')

# Average Active Time Per Day Analysis
@app.route('/analysis/average-active-time-per-day', methods=['GET'])
def average_active_time_per_day():
    return perform_analysis('AverageActiveTimePerDay')

# Number Of Sessions Analysis
@app.route('/analysis/number-of-sessions', methods=['GET'])
def number_of_sessions():
    return perform_analysis('NumberOfSessions')

# Event Summary Analysis
@app.route('/analysis/event-summary', methods=['GET'])
def event_summary():
    return perform_analysis('EventSummary')

def perform_analysis(analysis_type):
    period = request.args.get('period')
    kwargs = {}

    if period == 'SW':
        kwargs['week'] = request.args.get('week')
        kwargs['year'] = request.args.get('year')
    elif period == 'SM':
        kwargs['month'] = request.args.get('month')
        kwargs['year'] = request.args.get('year')
    elif period == 'Dates':
        kwargs['SDate'] = request.args.get('SDate')
        kwargs['EDate'] = request.args.get('EDate')

    data = analyze(service, analysis_type, period, **kwargs)
    return jsonify(data)


if __name__ == "__main__":
    app.run(use_reloader=False, debug=False)
    