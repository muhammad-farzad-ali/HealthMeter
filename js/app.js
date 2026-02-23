document.addEventListener('DOMContentLoaded', async () => {
    await DB.openDB();
    await DB.initDefaults();
    
    displayCurrentDate();
    await loadTodayData();
});

function displayCurrentDate() {
    const dateEl = document.getElementById('currentDate');
    if (dateEl) {
        const today = new Date();
        dateEl.textContent = today.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }
}

function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

async function loadTodayData() {
    const date = getTodayDate();
    const [routine, targets] = await Promise.all([
        DB.getByIndex('routine', 'date', date),
        DB.getById('targets', 'daily')
    ]);

    const todayData = routine[0] || createEmptyDay(date);
    renderDashboard(todayData, targets);
}

function createEmptyDay(date) {
    return {
        date,
        food_consumed: [],
        steps: 0,
        workouts: [],
        sleep: [],
        hydration: { water_ml: 0, caffeine_ml: 0 },
        meditation_min: 0,
        work_hours: 0,
        screen_time_min: 0
    };
}

function renderDashboard(data, targets) {
    const targetCal = targets?.calories || 2000;
    const targetProtein = targets?.protein || 100;
    const targetCarbs = targets?.carbs || 250;
    const targetFat = targets?.fat || 65;

    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;

    const entriesList = document.getElementById('todayEntries');
    if (!entriesList) return;

    let entriesHTML = '';

    if (data.food_consumed && data.food_consumed.length > 0) {
        for (const item of data.food_consumed) {
            const cal = Math.round(item.calories * item.quantity);
            totalCalories += cal;
            totalProtein += (item.protein || 0) * item.quantity;
            totalCarbs += (item.carbs || 0) * item.quantity;
            totalFat += (item.fat || 0) * item.quantity;
            entriesHTML += `<li>🍎 ${item.name} × ${item.quantity} (${cal} cal)</li>`;
        }
    }

    if (data.steps > 0) {
        entriesHTML += `<li>👟 ${data.steps.toLocaleString()} steps</li>`;
    }

    if (data.workouts && data.workouts.length > 0) {
        for (const w of data.workouts) {
            entriesHTML += `<li>💪 ${w.name}: ${w.count} (${w.calories_burned || 0} cal)</li>`;
        }
    }

    if (data.sleep && data.sleep.length > 0) {
        for (const s of data.sleep) {
            const duration = calculateSleepHours(s.start, s.end);
            entriesHTML += `<li>😴 Sleep: ${duration}h</li>`;
        }
    }

    if (data.hydration?.water_ml > 0) {
        entriesHTML += `<li>💧 Water: ${data.hydration.water_ml}ml</li>`;
    }

    if (data.meditation_min > 0) {
        entriesHTML += `<li>🧘 Meditation: ${data.meditation_min}min</li>`;
    }

    if (data.work_hours > 0) {
        entriesHTML += `<li>💼 Work: ${data.work_hours}h</li>`;
    }

    if (!entriesHTML) {
        entriesHTML = '<li class="empty-state">No entries yet today</li>';
    }

    entriesList.innerHTML = entriesHTML;

    const caloriePercent = Math.min((totalCalories / targetCal) * 100, 100);
    const progressCircle = document.getElementById('calorieProgress');
    if (progressCircle) {
        const circumference = 251.2;
        const offset = circumference - (caloriePercent / 100) * circumference;
        progressCircle.style.strokeDashoffset = offset;
    }

    updateElement('caloriesConsumed', totalCalories);
    updateElement('calorieTarget', targetCal);

    const proteinPercent = Math.min((totalProtein / targetProtein) * 100, 100);
    updateElement('proteinProgress', proteinPercent, '%', 'width');
    updateElement('proteinConsumed', Math.round(totalProtein));
    updateElement('proteinTarget', targetProtein);

    updateElement('stepsValue', data.steps || 0);
    updateElement('waterValue', data.hydration?.water_ml || 0);
    updateElement('meditationValue', data.meditation_min || 0);

    const sleepHours = calculateTotalSleep(data.sleep);
    updateElement('sleepValue', sleepHours + 'h');

    const carbsPercent = Math.min((totalCarbs / targetCarbs) * 100, 100);
    const proteinFillPercent = Math.min((totalProtein / targetProtein) * 100, 100);
    const fatPercent = Math.min((totalFat / targetFat) * 100, 100);

    updateElement('carbsBar', carbsPercent, '%', 'width');
    updateElement('proteinBar', proteinFillPercent, '%', 'width');
    updateElement('fatBar', fatPercent, '%', 'width');
    updateElement('carbsValue', Math.round(totalCarbs) + 'g');
    updateElement('proteinMacroValue', Math.round(totalProtein) + 'g');
    updateElement('fatValue', Math.round(totalFat) + 'g');
}

function calculateSleepHours(start, end) {
    if (!start || !end) return 0;
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    let hours = endH - startH;
    let mins = endM - startM;
    if (hours < 0) hours += 24;
    return (hours + mins / 60).toFixed(1);
}

function calculateTotalSleep(sleepArray) {
    if (!sleepArray || sleepArray.length === 0) return 0;
    return sleepArray.reduce((total, s) => total + parseFloat(calculateSleepHours(s.start, s.end)), 0).toFixed(1);
}

function updateElement(id, value, suffix = '', prop = 'textContent') {
    const el = document.getElementById(id);
    if (el) {
        el[prop] = value + suffix;
    }
}

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
}

async function getTodayRoutine() {
    const date = getTodayDate();
    const routines = await DB.getByIndex('routine', 'date', date);
    return routines[0] || createEmptyDay(date);
}

async function saveTodayRoutine(data) {
    const existing = await getTodayRoutine();
    if (existing.id) {
        await DB.update('routine', { ...existing, ...data });
    } else {
        await DB.add('routine', { ...createEmptyDay(date), ...data, date: getTodayDate() });
    }
    await loadTodayData();
}
