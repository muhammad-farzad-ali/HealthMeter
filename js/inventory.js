document.addEventListener('DOMContentLoaded', async () => {
    await DB.openDB();
    setupTabs();
    await loadInventory();
});

let allFoods = [];
let allWorkouts = [];

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

async function loadInventory() {
    allFoods = await DB.getStore('food');
    allWorkouts = await DB.getStore('workouts');
    
    renderFoodList(allFoods);
    renderWorkoutList(allWorkouts);
}

function renderFoodList(foods) {
    const list = document.getElementById('foodList');
    if (!foods || foods.length === 0) {
        list.innerHTML = '<p class="empty-state">No food items. Add some to start tracking!</p>';
        return;
    }
    
    list.innerHTML = foods.map(f => `
        <div class="entry-item">
            <div>
                <div class="entry-name">${f.name}</div>
                <div class="entry-detail">${f.calories} cal | P: ${f.protein}g | C: ${f.carbs}g | F: ${f.fat}g</div>
            </div>
            <div class="entry-actions">
                <button class="btn btn-secondary btn-sm" onclick="editFood('${f.id}')">Edit</button>
                <button class="btn btn-danger btn-sm" onclick="deleteFood('${f.id}')">Delete</button>
            </div>
        </div>
    `).join('');
}

function renderWorkoutList(workouts) {
    const list = document.getElementById('workoutList');
    if (!workouts || workouts.length === 0) {
        list.innerHTML = '<p class="empty-state">No workout types. Add some to start tracking!</p>';
        return;
    }
    
    list.innerHTML = workouts.map(w => `
        <div class="entry-item">
            <div>
                <div class="entry-name">${w.name}</div>
                <div class="entry-detail">${w.calories_burned_per_unit} cal/${w.unit_type || 'unit'}</div>
            </div>
            <div class="entry-actions">
                <button class="btn btn-secondary btn-sm" onclick="editWorkout('${w.id}')">Edit</button>
                <button class="btn btn-danger btn-sm" onclick="deleteWorkout('${w.id}')">Delete</button>
            </div>
        </div>
    `).join('');
}

async function addFood() {
    const food = {
        name: document.getElementById('foodName').value.trim(),
        calories: parseFloat(document.getElementById('foodCalories').value) || 0,
        protein: parseFloat(document.getElementById('foodProtein').value) || 0,
        carbs: parseFloat(document.getElementById('foodCarbs').value) || 0,
        fat: parseFloat(document.getElementById('foodFat').value) || 0
    };
    
    if (!food.name) return alert('Please enter a name');
    
    await DB.add('food', food);
    hideModal('foodModal');
    clearFoodForm();
    await loadInventory();
}

async function editFood(id) {
    const food = await DB.getById('food', id);
    if (!food) return;
    
    document.getElementById('foodName').value = food.name;
    document.getElementById('foodCalories').value = food.calories;
    document.getElementById('foodProtein').value = food.protein;
    document.getElementById('foodCarbs').value = food.carbs;
    document.getElementById('foodFat').value = food.fat;
    
    const btn = document.querySelector('#foodModal .btn-primary');
    btn.textContent = 'Update Food';
    btn.onclick = () => updateFood(id);
    
    showModal('foodModal');
}

async function updateFood(id) {
    const food = {
        id,
        name: document.getElementById('foodName').value.trim(),
        calories: parseFloat(document.getElementById('foodCalories').value) || 0,
        protein: parseFloat(document.getElementById('foodProtein').value) || 0,
        carbs: parseFloat(document.getElementById('foodCarbs').value) || 0,
        fat: parseFloat(document.getElementById('foodFat').value) || 0
    };
    
    await DB.update('food', food);
    hideModal('foodModal');
    clearFoodForm();
    await loadInventory();
}

async function deleteFood(id) {
    if (!confirm('Delete this food item?')) return;
    await DB.remove('food', id);
    await loadInventory();
}

function clearFoodForm() {
    document.getElementById('foodName').value = '';
    document.getElementById('foodCalories').value = '';
    document.getElementById('foodProtein').value = '';
    document.getElementById('foodCarbs').value = '';
    document.getElementById('foodFat').value = '';
    
    const btn = document.querySelector('#foodModal .btn-primary');
    btn.textContent = 'Add Food';
    btn.onclick = addFood;
}

async function addWorkout() {
    const workout = {
        name: document.getElementById('workoutName').value.trim(),
        unit_type: document.getElementById('workoutUnit').value.trim() || 'unit',
        calories_burned_per_unit: parseFloat(document.getElementById('workoutCalories').value) || 0
    };
    
    if (!workout.name) return alert('Please enter a name');
    
    await DB.add('workouts', workout);
    hideModal('workoutModal');
    clearWorkoutForm();
    await loadInventory();
}

async function editWorkout(id) {
    const workout = await DB.getById('workouts', id);
    if (!workout) return;
    
    document.getElementById('workoutName').value = workout.name;
    document.getElementById('workoutUnit').value = workout.unit_type;
    document.getElementById('workoutCalories').value = workout.calories_burned_per_unit;
    
    const btn = document.querySelector('#workoutModal .btn-primary');
    btn.textContent = 'Update Workout';
    btn.onclick = () => updateWorkout(id);
    
    showModal('workoutModal');
}

async function updateWorkout(id) {
    const workout = {
        id,
        name: document.getElementById('workoutName').value.trim(),
        unit_type: document.getElementById('workoutUnit').value.trim() || 'unit',
        calories_burned_per_unit: parseFloat(document.getElementById('workoutCalories').value) || 0
    };
    
    await DB.update('workouts', workout);
    hideModal('workoutModal');
    clearWorkoutForm();
    await loadInventory();
}

async function deleteWorkout(id) {
    if (!confirm('Delete this workout type?')) return;
    await DB.remove('workouts', id);
    await loadInventory();
}

function clearWorkoutForm() {
    document.getElementById('workoutName').value = '';
    document.getElementById('workoutUnit').value = '';
    document.getElementById('workoutCalories').value = '';
    
    const btn = document.querySelector('#workoutModal .btn-primary');
    btn.textContent = 'Add Workout';
    btn.onclick = addWorkout;
}

function filterFood() {
    const query = document.getElementById('foodSearch').value.toLowerCase();
    const filtered = allFoods.filter(f => f.name.toLowerCase().includes(query));
    renderFoodList(filtered);
}

function filterWorkouts() {
    const query = document.getElementById('workoutSearch').value.toLowerCase();
    const filtered = allWorkouts.filter(w => w.name.toLowerCase().includes(query));
    renderWorkoutList(filtered);
}

function showModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function hideModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}
