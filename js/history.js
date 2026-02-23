let chart = null;
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
    
    const { labels, data } = getChartData(routines);
    renderChart(labels, data);
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
    
    const result = [];
    const labels = [];
    
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const routine = routines.find(r => r.date === dateStr);
        let totalCal = 0;
        
        if (routine?.food_consumed) {
            for (const food of routine.food_consumed) {
                totalCal += (food.calories || 0) * food.quantity;
            }
        }
        
        labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        result.push(Math.round(totalCal));
    }
    
    return { labels, data: result };
}

function renderChart(labels, data) {
    const ctx = document.getElementById('calorieChart').getContext('2d');
    
    if (chart) {
        chart.destroy();
    }
    
    chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Calories',
                data,
                backgroundColor: '#2563eb',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: '#e2e8f0'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
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
        case 'weekly':
            days = 7;
            break;
        case 'monthly':
            days = 30;
            break;
        default:
            days = 7;
    }
    
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - days);
    
    const filtered = routines.filter(r => new Date(r.date) >= cutoff);
    
    list.innerHTML = filtered.map(r => {
        let totalCal = 0;
        let totalProtein = 0;
        
        if (r.food_consumed) {
            for (const food of r.food_consumed) {
                totalCal += (food.calories || 0) * food.quantity;
                totalProtein += (food.protein || 0) * food.quantity;
            }
        }
        
        const date = new Date(r.date).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
        
        return `
            <div class="entry-item">
                <div>
                    <div class="entry-name">${date}</div>
                    <div class="entry-detail">
                        ${totalCal} cal | ${Math.round(totalProtein)}g protein | 
                        ${r.steps || 0} steps | ${r.hydration?.water_ml || 0}ml water
                    </div>
                </div>
            </div>
        `;
    }).join('');
}
