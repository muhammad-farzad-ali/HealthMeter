document.addEventListener('DOMContentLoaded', async () => {
    await DB.openDB();
    await loadTargets();
});

async function loadTargets() {
    const targets = await DB.getById('targets', 'daily');
    
    if (targets) {
        document.getElementById('targetCalories').value = targets.calories || 2000;
        document.getElementById('targetProtein').value = targets.protein || 100;
        document.getElementById('targetCarbs').value = targets.carbs || 250;
        document.getElementById('targetFat').value = targets.fat || 65;
        document.getElementById('targetWater').value = targets.water || 2000;
        document.getElementById('targetSteps').value = targets.steps || 10000;
    }
}

async function saveTargets() {
    const targets = {
        id: 'daily',
        calories: parseInt(document.getElementById('targetCalories').value) || 2000,
        protein: parseInt(document.getElementById('targetProtein').value) || 100,
        carbs: parseInt(document.getElementById('targetCarbs').value) || 250,
        fat: parseInt(document.getElementById('targetFat').value) || 65,
        water: parseInt(document.getElementById('targetWater').value) || 2000,
        steps: parseInt(document.getElementById('targetSteps').value) || 10000
    };
    
    await DB.update('targets', targets);
    showNotification('Targets saved!');
}

async function exportData() {
    try {
        const data = await DB.exportAllData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `healthmeter-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showNotification('Data exported successfully!');
    } catch (error) {
        console.error('Export failed:', error);
        alert('Export failed: ' + error.message);
    }
}

async function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        if (!confirm('This will replace all existing data. Continue?')) {
            return;
        }
        
        await DB.importAllData(data);
        await loadTargets();
        
        showNotification('Data imported successfully!');
    } catch (error) {
        console.error('Import failed:', error);
        alert('Import failed: ' + error.message);
    }
    
    event.target.value = '';
}

async function clearAllData() {
    if (!confirm('Are you sure you want to delete ALL data? This cannot be undone!')) {
        return;
    }
    
    if (!confirm('This will delete all your food inventory, workouts, and log entries. Continue?')) {
        return;
    }
    
    try {
        await DB.clearAllData();
        await DB.initDefaults();
        await loadTargets();
        
        showNotification('All data cleared');
    } catch (error) {
        console.error('Clear failed:', error);
        alert('Clear failed: ' + error.message);
    }
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: #22c55e;
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 0.9rem;
        z-index: 1000;
        animation: fadeIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}

const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; transform: translateX(-50%) translateY(20px); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }
`;
document.head.appendChild(style);
