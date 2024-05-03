const { ipcRenderer } = require('electron');
const axios = require('axios');

let timePerCategoryChartInstance = null;
let averageSessionDurationChartInstance = null;
let numberOfSessionsChartInstance = null;

const TIME_PERIOD_MAPPING = {
    "Previous week": "PW",
    "Current week": "CW",
    "Previous 30 days": "P30D",
    "Based on month number": "SM",
    "Based on week number": "SW",
    "Based on selected range": "Dates"
};


window.navigateTo = function (page) {
    ipcRenderer.send('navigate', page);
};

updateAllData();


// Function to make a GET request to an endpoint
async function fetchData(endpoint, queryParams) {
    try {
        const response = await axios.get(`http://127.0.0.1:5000${endpoint}`, { params: queryParams });
        return response.data;
    } catch (error) {
        console.error('Error fetching data:', error);
        return null;
    }
}
// Function to construct query parameters based on selected time period
function constructQueryParams() {
    const selectedPeriod = document.getElementById('timePeriodSelect').value;
    const periodCode = TIME_PERIOD_MAPPING[selectedPeriod];
    let params = new URLSearchParams({ period: periodCode });

    if (periodCode === 'SW') {
        params.append('week', document.getElementById('weekSelector').value);
        params.append('year', document.getElementById('yearSelectorForWeek').value);
    } else if (periodCode === 'SM') {
        params.append('month', document.getElementById('monthSelector').value);
        params.append('year', document.getElementById('yearSelectorForMonth').value);
    } else if (periodCode === 'Dates') {
        params.append('SDate', document.getElementById('startDateInput').value);
        params.append('EDate', document.getElementById('endDateInput').value);
    }

    return params;
}
//---------------------------------------------------------------------------------------------------------------------------------------
// ADDITIONAL FILEDS

document.getElementById('updateDataButton').addEventListener('click', updateAllData);

document.addEventListener('DOMContentLoaded', function () {

    document.getElementById('timePeriodSelect').addEventListener('change', function () {
        var selectedValue = this.value;

        // Hide all additional fields initially
        document.getElementById('monthYearSelector').style.display = 'none';
        document.getElementById('weekYearSelector').style.display = 'none';
        document.getElementById('dateRangeSelector').style.display = 'none';

        // Show the relevant additional fields based on selection
        if (selectedValue === 'Based on month number') {
            document.getElementById('monthYearSelector').style.display = 'block';
        } else if (selectedValue === 'Based on week number') {
            document.getElementById('weekYearSelector').style.display = 'block';
        } else if (selectedValue === 'Based on selected range') {
            document.getElementById('dateRangeSelector').style.display = 'block';
        }
    });
    // Initialize with the default selection
    document.getElementById('timePeriodSelect').dispatchEvent(new Event('change'));
});

function populateYearOptions() {
    const currentYear = new Date().getFullYear();
    for (let year = currentYear; year >= currentYear - 10; year--) {
        document.getElementById('yearSelectorForWeek').innerHTML += `<option value="${year}">${year}</option>`;
        document.getElementById('yearSelectorForMonth').innerHTML += `<option value="${year}">${year}</option>`;
    }

    populateWeekData(currentYear)
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    let monthOptions = '';
    months.forEach((month, index) => {
        monthOptions += `<option value="${index + 1}">${month}</option>`;
    });
    document.getElementById('monthSelector').innerHTML = monthOptions;
}

function populateWeekData(currentYear) {
    const numOfWeeks = getNumberOfWeeks(currentYear);
    let weekOptions = '';
    for (let week = 1; week <= numOfWeeks; week++) {
        weekOptions += `<option value="${week}">Week ${week}</option>`;
    }
    document.getElementById('weekSelector').innerHTML = weekOptions;

}

populateYearOptions();

// Function to calculate the number of weeks in a year
function getNumberOfWeeks(year) {
    const d = new Date(year, 11, 31);
    const week = d.getDay();
    return d.getDate() + week < 32 ? 52 : 53;
}

// Function to update week options based on the selected year
document.getElementById('yearSelectorForWeek').addEventListener('change', function () {
    const year = this.value;
    if (!year) {
        document.getElementById('weekSelectorContainer').style.display = 'none';
        return;
    }
    populateWeekData(year)
});


//---------------------------------------------------------------------------------------------------------------------------------------
// DATA LOADING

// Function to display data in a container
function displayData(containerId, data) {
    const container = document.getElementById(containerId);
    container.textContent = JSON.stringify(data, null, 2);
}

// Fetch and display data for each analysis type
async function updateAllData() {
    const queryParams = constructQueryParams();

    const timePerCategoryData = await fetchData('/analysis/time-per-category', queryParams);
    createTimePerCategoryChart(timePerCategoryData);

    const averageWorkingDayData = await fetchData('/analysis/average-working-day', queryParams);
    document.getElementById('averageWorkingDayData').textContent = averageWorkingDayData.Work;

    const averageSessionDurationData = await fetchData('/analysis/average-session-duration', queryParams);
    createAverageSessionDurationChart(averageSessionDurationData);

    const averageActiveTimePerDayData = await fetchData('/analysis/average-active-time-per-day', queryParams);
    document.getElementById('averageActiveTimePerDayData').textContent = averageActiveTimePerDayData["Daily Average Active Time"];

    const numberOfSessionsData = await fetchData('/analysis/number-of-sessions', queryParams);
    createNumberOfSessionsChart(numberOfSessionsData);

    const eventSummaryData = await fetchData('/analysis/event-summary', queryParams);
    renderEventSummary(eventSummaryData)
}

function parseTimeToHours(timeStr) {
    const [hours, minutes, seconds] = timeStr.split(':').map(Number);
    return hours + minutes / 60 + seconds / 3600;
}

//---------------------------------------------------------------------------------------------------------------------------------------
// DATA VISUALIZATION
function getRandomColor() {
    const r = Math.floor(Math.random() * 255);
    const g = Math.floor(Math.random() * 255);
    const b = Math.floor(Math.random() * 255);
    return `rgba(${r}, ${g}, ${b}, 0.5)`;
}

// Function to create a bar chart for Time Per Category
function createTimePerCategoryChart(data) {
    const ctx = document.getElementById('timePerCategoryCanvas').getContext('2d');

    if (timePerCategoryChartInstance) {
        timePerCategoryChartInstance.destroy();
    }
    const categories = Object.keys(data);
    const times = categories.map(category => parseTimeToHours(data[category]));
    const backgroundColors = categories.map(() => getRandomColor());

    timePerCategoryChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: categories,
            datasets: [{
                label: 'Time Spent (in hours)',
                data: times,
                backgroundColor: backgroundColors,
                borderColor: backgroundColors.map(color => color.replace('0.5', '1')),
                borderWidth: 1
            }]
        },
        options: { scales: { y: { beginAtZero: true } }, plugins: { legend: { display: false } } }
    });
}

function createAverageSessionDurationChart(data) {
    const ctx = document.getElementById('averageSessionDurationCanvas').getContext('2d');

    // Destroy existing chart instance if it exists
    if (averageSessionDurationChartInstance) {
        averageSessionDurationChartInstance.destroy();
    }

    const categories = Object.keys(data);
    const times = categories.map(category => parseTimeToHours(data[category]));
    const backgroundColors = categories.map(() => getRandomColor());

    averageSessionDurationChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: categories,
            datasets: [{
                label: 'Average Session Duration',
                data: times,
                backgroundColor: backgroundColors,
                borderColor: backgroundColors.map(color => color.replace('0.5', '1')),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
        }
    });
}

function createNumberOfSessionsChart(data) {
    const ctx = document.getElementById('numberOfSessionsCanvas').getContext('2d');
    if (numberOfSessionsChartInstance) {
        numberOfSessionsChartInstance.destroy();
    }

    const numberOfCategories = Object.keys(data).length;
    const heightPerBar = 30;
    const totalHeight = numberOfCategories * heightPerBar;

    ctx.canvas.height = totalHeight;
    const sortedCategories = Object.keys(data).sort((a, b) => data[b] - data[a]);
    const sortedSessions = sortedCategories.map(category => data[category]);
    const backgroundColors = sortedCategories.map(() => getRandomColor());

    numberOfSessionsChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedCategories,
            datasets: [{
                label: '',
                data: sortedSessions,
                backgroundColor: backgroundColors,
                borderColor: backgroundColors.map(color => color.replace('0.5', '1')),
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            scales: { x: { beginAtZero: true } },
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}
function parseDateString(dateStr) {
    const [day, month, year] = dateStr.split('/');
    return new Date(`${year}-${month}-${day}`);
}

function renderEventSummary(data) {
    const container = document.getElementById('eventSummary');
    container.innerHTML = '';

    Object.entries(data).forEach(([category, events]) => {

        const sortedEvents = events.sort((a, b) => parseDateString(a[2]) - parseDateString(b[2]));

        const categoryDiv = document.createElement('div');
        categoryDiv.classList.add('event-category');

        const header = document.createElement('h4');
        header.textContent = category;
        categoryDiv.appendChild(header);

        const eventList = document.createElement('ul');
        eventList.classList.add('event-list');

        sortedEvents.forEach(event => {
            const listItem = document.createElement('li');
            listItem.innerHTML = `<strong>${event[0]}</strong> - Duration: ${event[1]}, Date: ${event[2]}`;
            eventList.appendChild(listItem);
        });

        categoryDiv.appendChild(eventList);
        container.appendChild(categoryDiv);
    });
}