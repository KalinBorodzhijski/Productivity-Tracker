const { ipcRenderer } = require('electron');
const fs = require('fs');
const lockfile = require('proper-lockfile');
const path = require('path');

let targets = {};
let modal;

let filePath = path.join(__dirname, 'year_targets.json')
if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify({}), 'utf-8');
}

function handleAddYearTargetModal() {
    modal = document.getElementById("addTaskModal");
    var btn = document.getElementById("add-target-btn");
    var span = document.getElementsByClassName("close")[0];

    btn.onclick = function () {
        modal.style.display = "block";
    }

    span.onclick = function () {
        modal.style.display = "none";
    }
    window.onclick = function (event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }
}

handleAddYearTargetModal()

window.navigateTo = function (page) {
    ipcRenderer.send('navigate', page);
};

const yearSelector = document.getElementById('year-selector');
const currentYear = new Date().getFullYear();
for (let year = currentYear + 1; year >= currentYear - 3; year--) {
    const option = document.createElement('option');
    option.value = year;
    option.innerText = year;
    yearSelector.appendChild(option);
}

function displayTargets(targets) {
    const targetsList = document.getElementById('targets-list');
    targetsList.innerHTML = '';

    targets.forEach((target, index) => {
        const targetElement = document.createElement('div');
        targetElement.classList.add('target-item');

        targetElement.innerHTML = `
            <div class="task-info">
                <input type="checkbox" id="target-${index}" ${target.completed ? 'checked' : ''} class="task-checkbox"/>
                <label for="target-${index}">${target.name}</label>
                <button class="delete-btn" id="delete-${index}">Delete</button>
            </div>
            <div class="task-progress">
                <input type="range" id="progress-slider-${index}" class="progress-slider" min="0" max="100" value="${target.progress}">
                <div id="progress-text-${index}" class="progress-text">${target.progress}%</div>
            </div>
        `;

        targetsList.appendChild(targetElement);

        const slider = document.getElementById(`progress-slider-${index}`);
        slider.addEventListener('input', (e) => {
            const newProgress = e.target.value;
            updateProgress(index, newProgress);
            updateSliderBackground(slider, newProgress);

            if (newProgress == "100") {
                document.getElementById(`target-${index}`).checked = true;
                updateCompletionStatus(index, true);
            }
        });

        const progressText = document.getElementById(`progress-text-${index}`);
        const checkbox = document.getElementById(`target-${index}`);

        // Set the slider and text based on completion status
        if (target.progress == 100 || target.completed) {
            checkbox.checked = true;
            slider.value = 100;
            slider.disabled = true;
            progressText.classList.add('completed');
        } else {
            slider.disabled = false;
            progressText.classList.remove('completed');
        }

        updateSliderBackground(slider, target.progress);

        document.getElementById(`target-${index}`).addEventListener('change', (e) => {
            updateCompletionStatus(index, e.target.checked);
        });

        document.getElementById(`delete-${index}`).addEventListener('click', () => {
            deleteTarget(index);
        })
    });
}
function updateSliderBackground(slider, value) {
    const percentage = (value - slider.min) / (slider.max - slider.min) * 100;
    slider.style.background = `linear-gradient(to right, #007bff ${percentage}%, #e9ecef ${percentage}%)`;
}


function updateProgress(index, newProgress) {
    const selectedYear = yearSelector.value;
    targets[selectedYear][index].progress = newProgress;
    document.getElementById(`progress-slider-${index}`).value = newProgress;
    document.getElementById(`progress-text-${index}`).textContent = `${newProgress}%`;
    const slider = document.getElementById(`progress-slider-${index}`);
    updateSliderBackground(slider, newProgress);
    saveTargets();
}

function deleteTarget(index) {
    const selectedYear = yearSelector.value;
    targets[selectedYear].splice(index, 1);
    saveTargets();
    displayTargets(targets[selectedYear]);
}

function updateCompletionStatus(index, completed) {
    const selectedYear = yearSelector.value;
    const task = targets[selectedYear][index];
    const slider = document.getElementById(`progress-slider-${index}`);
    const progressText = document.getElementById(`progress-text-${index}`);

    task.completed = completed;

    if (completed) {
        task.progress = '100';
        slider.value = '100';
        progressText.textContent = '100%';
        progressText.classList.add('completed');
        slider.disabled = true;
    } else {
        task.progress = '0';
        slider.value = '0';
        progressText.textContent = '0%';
        progressText.classList.remove('completed');
        slider.disabled = false;
    }

    updateSliderBackground(slider, task.progress);
    saveTargets();
}

function saveTargets() {
    lockfile.lock(filePath, { realpath: false })
        .then((release) => {
            fs.writeFile(filePath, JSON.stringify(targets), 'utf8', (err) => {
                if (err) {
                    console.error('An error occurred while saving targets:', err);
                    release();
                    return;
                }
                release();
            });
        })
        .catch((_err) => {
        });
}

function loadTargets() {
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('An error occurred while loading targets:', err);
            return;
        }

        try {
            const fileData = JSON.parse(data);
            const selectedYear = yearSelector.value;
            targets = fileData || {};
            displayTargets(targets[selectedYear] || []);
        } catch (parseErr) {
            console.error('Error parsing JSON data:', parseErr);
        }
    });
}


document.getElementById('newTaskForm').addEventListener('submit', function (event) {
    event.preventDefault();

    const taskName = document.getElementById('taskName').value;
    const selectedYear = yearSelector.value;

    const newTask = {
        name: taskName,
        progress: '0',
        completed: false
    };

    if (!targets[selectedYear]) {
        targets[selectedYear] = [];
    }

    targets[selectedYear].push(newTask);
    saveTargets();
    document.getElementById('taskName').value = '';
    modal.style.display = "none";
    displayTargets(targets[selectedYear]);
});

yearSelector.addEventListener('change', loadTargets);
loadTargets()
document.getElementById('add-target-btn').addEventListener('click', () => { });


//--------------------------------------------------------------------------------------------------------------
// MONTH TARGETS IMPLEMENTATION
const monthDropdown = document.getElementById('month-dropdown');
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

let monthlyTargets = {};

let filePathMontly = path.join(__dirname, 'month_targets.json')
if (!fs.existsSync(filePathMontly)) {
    fs.writeFileSync(filePathMontly, JSON.stringify({}), 'utf-8');
}

const currentMonth = new Date().getMonth();
months.forEach((month, index) => {
    const option = document.createElement('option');
    option.value = index + 1;
    option.textContent = month;
    option.selected = index === currentMonth;
    monthDropdown.appendChild(option);
});

const yearInput = document.getElementById('year-input');
yearInput.value = new Date().getFullYear();

document.getElementById('prev-year-btn').addEventListener('click', () => {
    yearInput.value = parseInt(yearInput.value) - 1;
});

document.getElementById('next-year-btn').addEventListener('click', () => {
    yearInput.value = parseInt(yearInput.value) + 1;
});

window.onclick = function (event) {
    const modal = document.getElementById('addMonthlyTaskModal');
    if (event.target === modal) {
        modal.style.display = "none";
    }
}
document.getElementById('update-targets-btn').addEventListener('click', () => {
    loadMonthlyTargets()
});


const categories = ['Четене', 'Продуктвни дейности', 'Тренировки', 'Университет', 'Инвестиране и Side hustle', 'Лични проекти', 'Учене'];

document.getElementById('globalAddTaskBtn').addEventListener('click', () => {
    openAddTaskModal();
});

function addTaskToCategory(category, taskName, completed = false) {
    const taskContainer = document.getElementById(`monthlyTaskContainer-${category}`);
    const taskElement = document.createElement('div');
    taskElement.className = 'task-monthly';
    taskElement.innerHTML = `
        <div class="task-content-monthly">
            <input type="checkbox" class="task-checkbox-monthly" onchange="updateTaskStats('${category}'); toggleTaskCompletion(this, '${category}')">
            <span class="task-name-monthly">${taskName}</span>
        </div>
        <button class="delete-task-btn-monthly" onclick="deleteTask(this, '${category}')">Delete</button>
    `;

    if (completed) {
        const checkbox = taskElement.querySelector('.task-checkbox-monthly');
        const deleteButton = taskElement.querySelector('.delete-task-btn-monthly');
        checkbox.checked = completed;
        taskElement.classList.add('completed-task');
        deleteButton.style.display = 'none';
    }

    taskContainer.appendChild(taskElement);
    updateTaskStats(category);
}

function deleteTask(buttonElement, category) {
    const taskElement = buttonElement.closest('.task-monthly');
    const taskName = taskElement.querySelector('.task-name-monthly').textContent;
    const selectedYear = yearInput.value;
    const selectedMonth = months[monthDropdown.value - 1]

    const tasks = monthlyTargets[selectedYear]?.[selectedMonth]?.[category];
    if (tasks) {
        const taskIndex = tasks.findIndex(task => task.name === taskName);
        if (taskIndex > -1) {
            tasks.splice(taskIndex, 1);
        }
    }

    taskElement.remove();
    updateTaskStats(category);
    saveMonthlyTargets();
}

function toggleTaskCompletion(checkbox, category) {
    const taskElement = checkbox.closest('.task-monthly');
    const taskName = taskElement.querySelector('.task-name-monthly').textContent;
    const deleteButton = taskElement.querySelector('.delete-task-btn-monthly');
    const selectedYear = yearInput.value;
    const selectedMonth = months[monthDropdown.value - 1];


    const tasks = monthlyTargets[selectedYear][selectedMonth][category];
    const taskIndex = tasks.findIndex(task => task.name === taskName);
    if (taskIndex > -1) {
        tasks[taskIndex].completed = checkbox.checked;
    }

    saveMonthlyTargets()

    if (checkbox.checked) {
        taskElement.classList.add('completed-task');
        deleteButton.style.display = 'none';
    } else {
        taskElement.classList.remove('completed-task');
        deleteButton.style.display = 'block';
    }
    updateTaskStats(category);
}

function updateTaskStats(category) {
    const taskContainer = document.getElementById(`monthlyTaskContainer-${category}`);
    const tasks = taskContainer.getElementsByClassName('task-checkbox-monthly');
    let completedCount = 0;

    Array.from(tasks).forEach(task => {
        if (task.checked) completedCount++;
    });

    const statsDiv = document.getElementById(`monthlyStats-${category}`);
    statsDiv.textContent = `Completed: ${completedCount} / Total: ${tasks.length}`;
    updateOverallStats()
}

function openAddTaskModal() {
    const categoryDropdown = document.getElementById('MonthlyTaskCategory');
    categoryDropdown.innerHTML = '';

    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categoryDropdown.appendChild(option);
    });

    document.getElementById('addMonthlyTaskModal').style.display = 'block';
}

function closeModal() {
    const modal = document.getElementById('addMonthlyTaskModal');
    modal.style.display = 'none';
}

document.querySelector('.modal-monthly .close-span').addEventListener('click', closeModal);

document.getElementById('MonthlyNewTaskForm').addEventListener('submit', function (event) {
    event.preventDefault();
    const taskName = document.getElementById('MonthlyTaskName').value;
    const category = document.getElementById('MonthlyTaskCategory').value;
    const selectedYear = yearInput.value;
    const selectedMonth = months[monthDropdown.value - 1]

    const newTask = {
        name: taskName,
        completed: false
    };

    if (!monthlyTargets[selectedYear]) {
        monthlyTargets[selectedYear] = {};
    }
    if (!monthlyTargets[selectedYear][selectedMonth]) {
        monthlyTargets[selectedYear][selectedMonth] = {};
    }
    if (!monthlyTargets[selectedYear][selectedMonth][category]) {
        monthlyTargets[selectedYear][selectedMonth][category] = [];
    }

    monthlyTargets[selectedYear][selectedMonth][category].push(newTask);
    saveMonthlyTargets()
    addTaskToCategory(category, taskName);

    document.getElementById('addMonthlyTaskModal').style.display = 'none';
    this.reset();
});

function updateOverallStats() {
    let totalTasks = 0;
    let completedTasks = 0;

    categories.forEach(category => {
        const tasks = document.getElementById(`monthlyTaskContainer-${category}`).getElementsByClassName('task-monthly');
        totalTasks += tasks.length;
        Array.from(tasks).forEach(task => {
            if (task.querySelector('.task-checkbox-monthly').checked) {
                completedTasks++;
            }
        });
    });

    const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    document.getElementById('completed-tasks').textContent = completedTasks;
    document.getElementById('total-tasks').textContent = totalTasks;
    document.getElementById('completion-percentage').textContent = `${completionPercentage}%`;
}


function saveMonthlyTargets() {
    lockfile.lock(filePathMontly, { realpath: false })
        .then((release) => {
            fs.writeFile(filePathMontly, JSON.stringify(monthlyTargets), 'utf8', (err) => {
                if (err) {
                    console.error('An error occurred while saving targets:', err);
                    release();
                    return;
                }
                release();
            });
        })
        .catch((_err) => {
        });
}

function loadMonthlyTargets() {
    fs.readFile(filePathMontly, 'utf8', (err, data) => {
        if (err) {
            console.error('An error occurred while loading targets:', err);
            return;
        }

        try {
            const fileData = JSON.parse(data);
            const selectedYear = yearInput.value;
            const selectedMonth = months[monthDropdown.value - 1]
            monthlyTargets = fileData || {};
            displayMonthlyTargets(monthlyTargets[selectedYear]?.[selectedMonth] || []);
        } catch (parseErr) {
            console.error('Error parsing JSON data:', parseErr);
        }
    });
}

function displayMonthlyTargets(targets) {
    const categoriesContainer = document.getElementById('monthly-categories');
    categoriesContainer.innerHTML = ''

    categories.forEach(category => {
        const categorySection = document.createElement('div');
        categorySection.className = 'monthly-category-section';
        categorySection.innerHTML = `
            <h3>${category}</h3>
            <div id="monthlyTaskContainer-${category}" class="monthly-task-container"></div>
            <div class="monthly-task-stats" id="monthlyStats-${category}">Completed: 0 / Total: 0</div>
        `;
        categoriesContainer.appendChild(categorySection);
    });

    categories.forEach(category => {
        const tasks = targets[category] || [];
        tasks.forEach(task => {
            addTaskToCategory(category, task.name, task.completed);
        });
    });
}
loadMonthlyTargets()