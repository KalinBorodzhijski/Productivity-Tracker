const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

let tasksFilePath = path.join(__dirname, 'tasks.json')
console.log(tasksFilePath)
window.navigateTo = function (page) {
    ipcRenderer.send('navigate', page);
};

//----------------------------------------------------------------------------------------------------------
// Week and Year selectors
document.getElementById('yearSelect').addEventListener('change', updateWeekSelector);

function populateYearSelector() {
    const currentYear = new Date().getFullYear();
    const yearSelect = document.getElementById('yearSelect');

    for (let year = 2020; year <= new Date().getFullYear(); year++) {
        const yearOption = document.createElement('option');
        yearOption.value = year;
        yearOption.textContent = year;
        yearSelect.appendChild(yearOption);
    }

    yearSelect.value = currentYear;
}

function getCurrentWeekNumber(date) {
    startDate = new Date(date.getFullYear(), 0, 1);
    let days = Math.floor((date - startDate) / (24 * 60 * 60 * 1000));
    let weekNumber = Math.ceil(days / 7);
    return weekNumber;
}

function updateWeekSelector() {
    const weekSelect = document.getElementById('weekSelect');
    const selectedYear = document.getElementById('yearSelect').value;
    const totalWeeks = getWeeksInYear(selectedYear);

    weekSelect.innerHTML = '';
    for (let week = 1; week <= totalWeeks; week++) {
        const weekOption = document.createElement('option');
        weekOption.value = week;
        weekOption.textContent = `Week ${week}`;
        weekSelect.appendChild(weekOption);
    }

    if (selectedYear == new Date().getFullYear()) {
        const currentWeek = getCurrentWeekNumber(new Date());
        weekSelect.value = currentWeek;
    }
}

function getWeeksInYear(year) {
    const lastDayOfYear = new Date(year, 11, 31);
    const lastDayWeek = lastDayOfYear.getDay();
    const daysInYear = lastDayOfYear.getDayOfYear();
    return Math.ceil((daysInYear + lastDayWeek) / 7);
}

Date.prototype.getDayOfYear = function () {
    const start = new Date(this.getFullYear(), 0, 0);
    const diff = this - start;
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
}

//----------------------------------------------------------------------------------------------------------
// Week program

function getDatesOfWeek(year, weekNumber) {
    const firstDayOfWeek = getDateOfIsoWeek(weekNumber, year)
    return Array.from({ length: 7 }).map((_, index) => {
        const date = new Date(firstDayOfWeek);
        date.setDate(date.getDate() + index);
        return date;
    });
}

function getDateOfIsoWeek(week, year) {
    week = parseFloat(week);
    year = parseFloat(year);

    if (week < 1 || week > 53) {
        throw new RangeError("ISO 8601 weeks are numbered from 1 to 53");
    } else if (!Number.isInteger(week)) {
        throw new TypeError("Week must be an integer");
    } else if (!Number.isInteger(year)) {
        throw new TypeError("Year must be an integer");
    }

    const simple = new Date(year, 0, 1 + (week - 1) * 7);
    const dayOfWeek = simple.getDay();
    const isoWeekStart = simple;

    isoWeekStart.setDate(simple.getDate() - dayOfWeek + 1);
    if (dayOfWeek > 4) {
        isoWeekStart.setDate(isoWeekStart.getDate() + 7);
    }

    if (isoWeekStart.getFullYear() > year ||
        (isoWeekStart.getFullYear() == year &&
            isoWeekStart.getMonth() == 11 &&
            isoWeekStart.getDate() > 28)) {
        throw new RangeError(`${year} has no ISO week ${week}`);
    }

    return isoWeekStart;
}

let selected_year = document.getElementById('yearSelect').value;
let selected_week = document.getElementById('weekSelect').value;

function loadWeek() {
    const year = document.getElementById('yearSelect').value;
    const week = document.getElementById('weekSelect').value;
    selected_year = year
    selected_week = week
    generateProgramGrid(year, week);
}

function getFormattedDate(date) {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

function generateProgramGrid(year, weekNumber) {
    const taskData = readTasksFromFile();
    const weekData = taskData[year] && taskData[year][`week${weekNumber}`] || {};
    const programGrid = document.getElementById('programGrid');
    programGrid.innerHTML = '';
    finishWeekButton.style.display = 'block';

    if (weekData.initialSetupDone) {
        completeInitialSetupButton.style.display = 'none';
    }
    else{
        completeInitialSetupButton.style.display = 'block';
    }


    const datesOfWeek = getDatesOfWeek(year, weekNumber);
    datesOfWeek.forEach(date => {
        const dayName = date.toLocaleString('en-us', { weekday: 'long' });
        const dayContainer = document.createElement('div');
        dayContainer.classList.add('day-container');
        dayContainer.setAttribute('data-day', dayName);

        // Day Header
        const header = document.createElement('div');
        header.classList.add('day-header');
        header.innerHTML = `<span class="day-name">${date.toLocaleString('en-us', { weekday: 'long' })}</span>
                            <span class="day-date">${getFormattedDate(date)}</span>
                            <span class="task-count">0/0</span>`;
        dayContainer.appendChild(header);

        // Task List
        const taskList = document.createElement('ul');
        taskList.classList.add('task-list');
        dayContainer.appendChild(taskList);

        // Load tasks for the day
        const dayData = weekData[dayName] || { initial: [], additional: [] };
        dayData.initial.forEach(task => addTaskToDay(taskList, task.content, task.completed, 'initial'));
        dayData.additional.forEach(task => addTaskToDay(taskList, task.content, task.completed, 'additional'));

        // Day Footer with Input Field and Add Task Button
        const footer = document.createElement('div');
        footer.classList.add('day-footer');
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'Enter a task';
        input.classList.add('add-task-input');
        footer.appendChild(input);
        const addButton = document.createElement('button');
        addButton.textContent = 'Add Task';
        addButton.classList.add('add-task-button');

        addButton.onclick = () => {
            if (input.value.trim() !== '') {
                const taskData = readTasksFromFile();
                const weekData = taskData[year] && taskData[year][`week${weekNumber}`] || {};
                if (weekData.initialSetupDone) {
                    addTaskToDay(taskList, input.value.trim(), false, 'additional');
                }
                else {
                    addTaskToDay(taskList, input.value.trim(), false, 'initial');
                }
                input.value = '';
                saveWeek()
            }
        };

        // Event listener for pressing Enter key in the input field
        input.addEventListener('keypress', function (event) {
            if (event.key === 'Enter') {
                if (input.value.trim() !== '') {
                    const taskData = readTasksFromFile();
                    const weekData = taskData[year] && taskData[year][`week${weekNumber}`] || {};
                    if (weekData.initialSetupDone) {
                        addTaskToDay(taskList, input.value.trim(), false, 'additional');
                    }
                    else {
                        addTaskToDay(taskList, input.value.trim(), false, 'initial');
                    }
                    input.value = '';
                    saveWeek()
                }
            }
        });

        footer.appendChild(addButton);
        dayContainer.appendChild(footer);

        programGrid.appendChild(dayContainer);

    });

    // Results Container
    const resultsContainer = document.createElement('div');
    resultsContainer.classList.add('results-container');
    resultsContainer.style.display = 'none'
    programGrid.appendChild(resultsContainer);


    if (taskData[year] && taskData[year][`week${weekNumber}`] && taskData[year][`week${weekNumber}`].finished) {
        handle_finished_week()
    }
}

document.getElementById('completeInitialSetupButton').addEventListener('click', () => {
    const year = selected_year;
    const week = selected_week;
    let taskData = readTasksFromFile();

    taskData[year] = taskData[year] || {};
    taskData[year][`week${week}`] = taskData[year][`week${week}`] || {};
    taskData[year][`week${week}`].initialSetupDone = true;
    completeInitialSetupButton.style.display = 'none';

    writeTasksToFile(taskData);
});


function addTaskToDay(taskList, taskContent, isCompleted = false, taskType = 'additional') {
    const taskItem = document.createElement('li');
    taskItem.classList.add('task', taskType);

    const textSpan = document.createElement('span');
    textSpan.textContent = taskContent;
    taskItem.appendChild(textSpan);

    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.classList.add('delete-task-button');
    taskItem.appendChild(deleteButton);

    if (isCompleted) {
        taskItem.classList.add('task-completed');
        deleteButton.style.display = 'none';
    }

    taskItem.onclick = () => {
        taskItem.classList.toggle('task-completed');
        updateTaskCount(taskList);
        if (taskItem.classList.contains('task-completed')) {
            deleteButton.style.display = 'none';
        } else {
            deleteButton.style.display = 'block';
        }
        saveWeek();
    };

    taskList.appendChild(taskItem);
    updateTaskCount(taskList);

    deleteButton.onclick = (event) => {
        event.stopPropagation();
        taskItem.remove();
        updateTaskCount(taskList);
        saveWeek()
    };
}


function updateTaskCount(taskList) {
    const initialTasks = taskList.querySelectorAll('.task.initial');
    const totalTasks = initialTasks.length;

    // Count both initial and additional completed tasks for the completed count
    const completedTasks = taskList.querySelectorAll('.task.initial.task-completed').length
        + taskList.querySelectorAll('.task.additional.task-completed').length;

    // Update the task count display
    const taskCountDisplay = taskList.previousElementSibling.querySelector('.task-count');
    if (taskCountDisplay) {
        taskCountDisplay.textContent = `${completedTasks}/${totalTasks}`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    populateYearSelector();
    updateWeekSelector();
    document.getElementById('loadWeekButton').addEventListener('click', loadWeek);
    loadWeek();
});

function saveWeek(isFinished = false) {
    const year = selected_year;
    const week = selected_week;
    let taskData = readTasksFromFile();

    if (!taskData[year]) taskData[year] = {};
    if (!taskData[year][`week${week}`]) taskData[year][`week${week}`] = {};

    taskData[year][`week${week}`].finished = isFinished;

    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    daysOfWeek.forEach(day => {
        const dayContainer = document.querySelector(`.day-container[data-day="${day}"]`);

        const initialTasks = Array.from(dayContainer.querySelectorAll('.task.initial')).map(task => ({
            content: task.querySelector('span').textContent,
            completed: task.classList.contains('task-completed')
        }));

        const additionalTasks = Array.from(dayContainer.querySelectorAll('.task.additional')).map(task => ({
            content: task.querySelector('span').textContent,
            completed: task.classList.contains('task-completed')
        }));

        taskData[year][`week${week}`][day] = { initial: initialTasks, additional: additionalTasks };

    });

    writeTasksToFile(taskData);
}


function finishWeek() {
    const isConfirmed = confirm('Are you sure you want to finish the week? This action cannot be undone.');
    if (!isConfirmed) {
        return;
    }
    handle_finished_week()
    saveWeek(true);
}

function handle_finished_week() {
    const addTaskButtons = document.querySelectorAll('.add-task-button');
    const deleteTaskButtons = document.querySelectorAll('.delete-task-button');
    const taskInputs = document.querySelectorAll('.add-task-input');

    addTaskButtons.forEach(btn => btn.style.display = 'none');
    deleteTaskButtons.forEach(btn => btn.style.display = 'none');
    taskInputs.forEach(input => input.style.display = 'none');
    finishWeekButton.style.display = 'none';

    const taskItems = document.querySelectorAll('.program-grid .task');
    taskItems.forEach(taskItem => {
        taskItem.onclick = null;
    });

    displayWeekResults();
}

function displayWeekResults() {
    const resultsContainer = document.querySelector('.results-container');
    resultsContainer.style.display = 'block';
    resultsContainer.innerHTML = '';

    let totalInitialTasks = 0;
    let completedTasks = 0;

    const taskLists = document.querySelectorAll('.task-list');
    taskLists.forEach(list => {
        // Count only initial tasks for the total
        totalInitialTasks += list.querySelectorAll('.task.initial').length;
        // Count both initial and additional completed tasks
        completedTasks += list.querySelectorAll('.task.initial.task-completed').length
            + list.querySelectorAll('.task.additional.task-completed').length;
    });

    const completionRate = totalInitialTasks > 0 ? (completedTasks / totalInitialTasks) * 100 : 0;
    const isSuccess = completionRate >= 85;

    // Display Total Initial Tasks
    const totalTasksDetail = document.createElement('div');
    totalTasksDetail.classList.add('result-detail');
    totalTasksDetail.textContent = `Total Initial Tasks: ${totalInitialTasks}`;
    resultsContainer.appendChild(totalTasksDetail);

    // Display Completed Tasks
    const completedTasksDetail = document.createElement('div');
    completedTasksDetail.classList.add('result-detail');
    completedTasksDetail.textContent = `Completed Tasks: ${completedTasks}`;
    resultsContainer.appendChild(completedTasksDetail);

    // Display Completion Rate
    const completionRateDetail = document.createElement('div');
    completionRateDetail.classList.add('result-detail');
    completionRateDetail.textContent = `Completion Rate: ${completionRate.toFixed(2)}%`;
    resultsContainer.appendChild(completionRateDetail);

    // Display Status Message
    const statusMessage = document.createElement('div');
    statusMessage.classList.add('status-message');
    if (isSuccess) {
        statusMessage.classList.add('success-message');
        statusMessage.textContent = 'Congratulations! The week was a success!';
    } else {
        statusMessage.classList.add('failure-message');
        statusMessage.textContent = 'Keep pushing! You can do better next week!';
    }
    resultsContainer.appendChild(statusMessage);
}
document.getElementById('finishWeekButton').addEventListener('click', finishWeek);

function readTasksFromFile() {
    if (!fs.existsSync(tasksFilePath)) {
        fs.mkdirSync(path.dirname(tasksFilePath), { recursive: true });
        fs.writeFileSync(tasksFilePath, JSON.stringify({}), 'utf8');
    }
    const data = fs.readFileSync(tasksFilePath, 'utf8');
    return JSON.parse(data);
}

function writeTasksToFile(taskData) {
    const data = JSON.stringify(taskData, null, 2);
    fs.writeFileSync(tasksFilePath, data, 'utf8');
}