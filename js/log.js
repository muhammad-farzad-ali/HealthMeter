document.addEventListener('DOMContentLoaded', async () => {
    await DB.openDB();
    
    document.getElementById('logDate').value = getTodayDate();
    document.getElementById('logDate').addEventListener('change', loadDateData);
    
    setupTabs();
    await loadDateData();
    await loadFoodOptions();
    await loadWorkoutOptions();
});

function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

function setupTabs() {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
            
            tab.classList.add('active');
            document.getElementById(tab.dataset.tab + 'Tab').classList.remove('hidden');
        });
    });
}

async function loadDateData() {
    const date = document.getElementById('logDate').value;
    const routines = await DB.getByIndex('routine', 'date', date);
    const routine = routines[0] || createEmptyDay(date);
    
    renderFoodList(routine.food_consumed || []);
    renderWorkoutList(routine.workouts || []);
    renderSleepList(routine.sleep || []);
    
    const hydration = routine.hydration || {};
    document.getElementById('waterInput').value = hydration.water_ml || '';
    document.getElementById('caffeineInput').value = hydration.caffeine_ml || '';
    
    document.getElementById('stepsInput').value = routine.steps || '';
    document.getElementById('meditationInput').value = routine.meditation_min || '';
    document.getElementById('workHoursInput').value = routine.work_hours || '';
    document.getElementById('screenTimeInput').value = routine.screen_time_min || '';
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

async function loadFoodOptions() {
    const foods = await DB.getStore('food');
    const select = document.getElementById('foodSelect');
    select.innerHTML = foods.map(f => 
        `<option value="${f.id}" data-cal="${f.calories}" data-pro="${f.protein}" data-carbs="${f.carbs}" data-fat="${f.fat}">${f.name}</option>`
    ).join('');
}

async function loadWorkoutOptions() {
    const workouts = await DB.getStore('workouts');
    const select = document.getElementById('workoutSelect');
    select.innerHTML = workouts.map(w => 
        `<option value="${w.id}" data-cal="${w.calories_burned_per_unit}">${w.name}</option>`
    ).join('');
}

async function getOrCreateRoutine(date) {
    const routines = await DB.getByIndex('routine', 'date', date);
    if (routines.length > 0) return routines[0];
    
    const newRoutine = createEmptyDay(date);
    await DB.add('routine', newRoutine);
    return newRoutine;
}

async function addFood() {
    const date = document.getElementById('logDate').value;
    const foodId = document.getElementById('foodSelect').value;
    const quantity = parseFloat(document.getElementById('foodQuantity').value) || 1;
    
    const select = document.getElementById('foodSelect');
    const option = select.options[select.selectedIndex];
    
    const food = {
        id: foodId,
        name: select.options[select.selectedIndex].text,
        quantity,
        calories: parseFloat(option.dataset.cal) || 0,
        protein: parseFloat(option.dataset.pro) || 0,
        carbs: parseFloat(option.dataset.carbs) || 0,
        fat: parseFloat(option.dataset.fat) || 0
    };
    
    const routine = await getOrCreateRoutine(date);
    routine.food_consumed = routine.food_consumed || [];
    routine.food_consumed.push(food);
    
    await DB.update('routine', routine);
    renderFoodList(routine.food_consumed);
    hideModal('foodModal');
}

async function removeFood(index) {
    const date = document.getElementById('logDate').value;
    const routine = await getOrCreateRoutine(date);
    routine.food_consumed.splice(index, 1);
    await DB.update('routine', routine);
    renderFoodList(routine.food_consumed);
}

function renderFoodList(foods) {
    const list = document.getElementById('foodList');
    if (!foods || foods.length === 0) {
        list.innerHTML = '<p class="empty-state">No food logged</p>';
        return;
    }
    
    list.innerHTML = foods.map((f, i) => `
        <div class="entry-item">
            <div>
                <div class="entry-name">${f.name} × ${f.quantity}</div>
                <div class="entry-detail">${Math.round(f.calories * f.quantity)} cal</div>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="removeFood(${i})">✕</button>
        </div>
    `).join('');
}

async function addWorkout() {
    const date = document.getElementById('logDate').value;
    const workoutId = document.getElementById('workoutSelect').value;
    const count = parseInt(document.getElementById('workoutCount').value) || 1;
    
    const select = document.getElementById('workoutSelect');
    const option = select.options[select.selectedIndex];
    const calPerUnit = parseFloat(option.dataset.cal) || 0;
    
    const workout = {
        id: workoutId,
        name: select.options[select.selectedIndex].text,
        count,
        calories_burned: Math.round(calPerUnit * count)
    };
    
    const routine = await getOrCreateRoutine(date);
    routine.workouts = routine.workouts || [];
    routine.workouts.push(workout);
    
    await DB.update('routine', routine);
    renderWorkoutList(routine.workouts);
    hideModal('workoutModal');
}

async function removeWorkout(index) {
    const date = document.getElementById('logDate').value;
    const routine = await getOrCreateRoutine(date);
    routine.workouts.splice(index, 1);
    await DB.update('routine', routine);
    renderWorkoutList(routine.workouts);
}

function renderWorkouts(workouts) {
    const list = document.getElementById('workoutList');
    if (!workouts || workouts.length === 0) {
        list.innerHTML = '<p class="empty-state">No workouts logged</p>';
        return;
    }
    
    list.innerHTML = workouts.map((w, i) => `
        <div class="entry-item">
            <div>
                <div class="entry-name">${w.name} × ${w.count}</div>
                <div class="entry-detail">${w.calories_burned || 0} cal burned</div>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="removeWorkout(${i})">✕</button>
        </div>
    `).join('');
}

async function addSleep() {
    const date = document.getElementById('logDate').value;
    const start = document.getElementById('sleepStart').value;
    const end = document.getElementById('sleepEnd').value;
    
    if (!start || !end) return;
    
    const session = { start, end };
    
    const routine = await getOrCreateRoutine(date);
    routine.sleep = routine.sleep || [];
    routine.sleep.push(session);
    
    await DB.update('routine', routine);
    renderSleepList(routine.sleep);
    hideModal('sleepModal');
}

async function removeSleep(index) {
    const date = document.getElementById('logDate').value;
    const routine = await getOrCreateRoutine(date);
    routine.sleep.splice(index, 1);
    await DB.update('routine', routine);
    renderSleepList(routine.sleep);
}

function renderSleepList(sessions) {
    const list = document.getElementById('sleepList');
    if (!sessions || sessions.length === 0) {
        list.innerHTML = '<p class="empty-state">No sleep logged</p>';
        return;
    }
    
    list.innerHTML = sessions.map((s, i) => `
        <div class="entry-item">
            <div>
                <div class="entry-name">${s.start} - ${s.end}</div>
                <div class="entry-detail">${calculateHours(s.start, s.end)} hours</div>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="removeSleep(${i})">✕</button>
        </div>
    `).join('');
}

function calculateHours(start, end) {
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    let hours = endH - startH;
    let mins = endM - startM;
    if (hours < 0) hours += 24;
    return (hours + mins / 60).toFixed(1);
}

async function saveSteps() {
    const date = document.getElementById('logDate').value;
    const steps = parseInt(document.getElementById('stepsInput').value) || 0;
    const routine = await getOrCreateRoutine(date);
    routine.steps = steps;
    await DB.update('routine', routine);
}

async function saveHydration() {
    const date = document.getElementById('logDate').value;
    const routine = await getOrCreateRoutine(date);
    routine.hydration = {
        water_ml: parseInt(document.getElementById('waterInput').value) || 0,
        caffeine_ml: parseInt(document.getElementById('caffeineInput').value) || 0
    };
    await DB.update('routine', routine);
}

async function saveWellbeing() {
    const date = document.getElementById('logDate').value;
    const routine = await getOrCreateRoutine(date);
    routine.meditation_min = parseInt(document.getElementById('meditationInput').value) || 0;
    routine.work_hours = parseFloat(document.getElementById('workHoursInput').value) || 0;
    routine.screen_time_min = parseInt(document.getElementById('screenTimeInput').value) || 0;
    await DB.update('routine', routine);
}

function showModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function hideModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}
