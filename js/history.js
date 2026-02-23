let calorieChart = null;
let macroChart = null;
let activityChart = null;
let stepsChart = null;
let currentView = 'daily';

document.addEventListener('DOMContentLoaded', async () => {
    await DB.openDB();
    setupTabs();
    await loadHistory();
});

function setupTabs() {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', async () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentView = tab.dataset.view;
            await loadHistory();
        });
    });
}

async function loadHistory() {
    const routines = await DB.getStore('routine');
    routines.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    const chartData = getChartData(routines);
    renderCharts(chartData);
    renderHistoryList(routines);
}

function getChartData(routines) {
    const now = new Date();
    let days;
    
    switch (currentView) {
        case 'weekly':
            days = 7;
            break;
        case 'monthly':
            days = 30;
            break;
        default:
            days = 7;
    }
    
    const labels = [];
    const calories = [];
    const protein = [];
    const carbs = [];
    const fat = [];
    const sleep = [];
    const workoutMins = [];
    const steps = [];
    const water = [];
    
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const routine = routines.find(r => r.date === dateStr);
        
        labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        
        let dayCal = 0, dayPro = 0, dayCarbs = 0, dayFat = 0;
        if (routine?.food_consumed) {
            for (const food of routine.food_consumed) {
                dayCal += (food.calories || 0) * food.quantity;
                dayPro += (food.protein || 0) * food.quantity;
                dayCarbs += (food.carbs || 0) * food.quantity;
                dayFat += (food.fat || 0) * food.quantity;
            }
        }
        calories.push(Math.round(dayCal));
        protein.push(Math.round(dayPro));
        carbs.push(Math.round(dayCarbs));
        fat.push(Math.round(dayFat));
        
        let daySleep = 0;
        if (routine?.sleep) {
            for (const s of routine.sleep) {
                const [startH, startM] = (s.start || '0:0').split(':').map(Number);
                const [endH, endM] = (s.end || '0:0').split(':').map(Number);
                let h = endH - startH;
                let m = endM - startM;
                if (h < 0) h += 24;
                daySleep += h + m / 60;
            }
        }
        sleep.push(daySleep.toFixed(1));
        
        let dayWorkouts = 0;
        if (routine?.workouts) {
            for (const w of routine.workouts) {
                dayWorkouts += w.count || 0;
            }
        }
        workoutMins.push(dayWorkouts);
        
        steps.push(routine?.steps || 0);
        water.push(routine?.hydration?.water_ml || 0);
    }
    
    return { labels, calories, protein, carbs, fat, sleep, workoutMins, steps, water };
}

function renderCharts(data) {
    renderCalorieChart(data);
    renderMacroChart(data);
    renderActivityChart(data);
    renderStepsChart(data);
}

function renderCalorieChart(data) {
    const ctx = document.getElementById('calorieChart').getContext('2d');
    if (calorieChart) calorieChart.destroy();
    
    calorieChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Calories',
                data: data.calories,
                backgroundColor: '#2563eb',
                borderRadius: 4
            }]
        },
        options: getChartOptions('Calories')
    });
}

function renderMacroChart(data) {
    const ctx = document.getElementById('macroChart').getContext('2d');
    if (macroChart) macroChart.destroy();
    
    macroChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [
                { label: 'Protein', data: data.protein, borderColor: '#22c55e', backgroundColor: '#22c55e', tension: 0.3 },
                { label: 'Carbs', data: data.carbs, borderColor: '#f59e0b', backgroundColor: '#f59e0b', tension: 0.3 },
                { label: 'Fat', data: data.fat, borderColor: '#ef4444', backgroundColor: '#ef4444', tension: 0.3 }
            ]
        },
        options: getChartOptions('Grams')
    });
}

function renderActivityChart(data) {
    const ctx = document.getElementById('activityChart').getContext('2d');
    if (activityChart) activityChart.destroy();
    
    activityChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [
                { label: 'Sleep (hrs)', data: data.sleep, backgroundColor: '#8b5cf6', borderRadius: 4 },
                { label: 'Workouts (reps)', data: data.workoutMins, backgroundColor: '#ec4899', borderRadius: 4 }
            ]
        },
        options: getChartOptions('')
    });
}

function renderStepsChart(data) {
    const ctx = document.getElementById('stepsChart').getContext('2d');
    if (stepsChart) stepsChart.destroy();
    
    stepsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [
                { label: 'Steps', data: data.steps, backgroundColor: '#06b6d4', borderRadius: 4 },
                { label: 'Water (ml)', data: data.water, backgroundColor: '#3b82f6', borderRadius: 4 }
            ]
        },
        options: getChartOptions('')
    });
}

function getChartOptions(label) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: true, position: 'top' } },
        scales: {
            y: { beginAtZero: true, grid: { color: '#e2e8f0' } },
            x: { grid: { display: false } }
        }
    };
}

function renderHistoryList(routines) {
    const list = document.getElementById('historyList');
    
    if (!routines || routines.length === 0) {
        list.innerHTML = '<p class="empty-state">No history yet</p>';
        return;
    }
    
    const now = new Date();
    let days;
    switch (currentView) {
        case 'weekly': days = 7; break;
        case 'monthly': days = 30; break;
        default: days = 7;
    }
    
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - days);
    const filtered = routines.filter(r => new Date(r.date) >= cutoff);
    
    list.innerHTML = filtered.map(r => {
        let totalCal = 0, totalProtein = 0;
        if (r.food_consumed) {
            for (const food of r.food_consumed) {
                totalCal += (food.calories || 0) * food.quantity;
                totalProtein += (food.protein || 0) * food.quantity;
            }
        }
        
        const date = new Date(r.date).toLocaleDateString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric'
        });
        
        return `
            <div class="entry-item">
                <div>
                    <div class="entry-name">${date}</div>
                    <div class="entry-detail">
                        ${totalCal} cal | ${Math.round(totalProtein)}g protein | 
                        ${r.steps || 0} steps | ${r.hydration?.water_ml || 0}ml water | ${r.hydration?.caffeine_ml || 0}ml caffeine
                    </div>
                </div>
            </div>
        `;
    }).join('');
}
