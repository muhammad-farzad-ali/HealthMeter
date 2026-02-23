const DB_NAME = 'HealthMeterDB';
const DB_VERSION = 1;

let db = null;

const schema = {
    food: { keyPath: 'id', indexes: [{ name: 'name', keyPath: 'name' }] },
    workouts: { keyPath: 'id', indexes: [{ name: 'name', keyPath: 'name' }] },
    routine: { keyPath: 'id', indexes: [{ name: 'date', keyPath: 'date' }] },
    targets: { keyPath: 'id' },
    metadata: { keyPath: 'key' }
};

function openDB() {
    return new Promise((resolve, reject) => {
        if (db) {
            resolve(db);
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const database = event.target.result;

            for (const [storeName, config] of Object.entries(schema)) {
                if (!database.objectStoreNames.contains(storeName)) {
                    const store = database.createObjectStore(storeName, { keyPath: config.keyPath, autoIncrement: storeName !== 'metadata' });
                    for (const idx of config.indexes || []) {
                        store.createIndex(idx.name, idx.keyPath, { unique: false });
                    }
                }
            }

            database.createObjectStore('metadata', { keyPath: 'key' });
        };
    });
}

function getStore(storeName, mode = 'readonly') {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);
        const request = store.getAll();
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function getById(storeName, id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(id);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function getByIndex(storeName, indexName, value) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const index = store.index(indexName);
        const request = index.getAll(value);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function add(storeName, data) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        
        if (!data.id) {
            data.id = Date.now().toString(36) + Math.random().toString(36).substr(2);
        }
        data.createdAt = data.createdAt || new Date().toISOString();
        data.updatedAt = new Date().toISOString();
        
        const request = store.add(data);
        
        request.onsuccess = () => resolve(data);
        request.onerror = () => reject(request.error);
    });
}

function update(storeName, data) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        
        data.updatedAt = new Date().toISOString();
        
        const request = store.put(data);
        
        request.onsuccess = () => resolve(data);
        request.onerror = () => reject(request.error);
    });
}

function remove(storeName, id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(id);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

function clearStore(storeName) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

async function getMetadata(key) {
    const result = await getById('metadata', key);
    return result?.value;
}

async function setMetadata(key, value) {
    return update('metadata', { key, value });
}

async function exportAllData() {
    const data = {
        version: DB_VERSION,
        exportedAt: new Date().toISOString(),
        food: await getStore('food'),
        workouts: await getStore('workouts'),
        routine: await getStore('routine'),
        targets: await getStore('targets'),
        metadata: await getStore('metadata')
    };
    return data;
}

async function importAllData(importData) {
    if (!importData || !importData.version) {
        throw new Error('Invalid import data format');
    }

    const stores = ['food', 'workouts', 'routine', 'targets', 'metadata'];
    
    for (const storeName of stores) {
        await clearStore(storeName);
        const items = importData[storeName] || [];
        for (const item of items) {
            await add(storeName, item);
        }
    }
    
    await setMetadata('lastImport', new Date().toISOString());
}

async function clearAllData() {
    const stores = ['food', 'workouts', 'routine', 'targets', 'metadata'];
    for (const storeName of stores) {
        await clearStore(storeName);
    }
}

const sampleFoods = [
    { name: 'Apple', calories: 95, protein: 0.5, carbs: 25, fat: 0.3 },
    { name: 'Banana', calories: 105, protein: 1.3, carbs: 27, fat: 0.4 },
    { name: 'Chicken Breast (100g)', calories: 165, protein: 31, carbs: 0, fat: 3.6 },
    { name: 'Rice (1 cup)', calories: 206, protein: 4.3, carbs: 45, fat: 0.4 },
    { name: 'Egg (large)', calories: 78, protein: 6, carbs: 0.6, fat: 5 },
    { name: 'Oatmeal (1 cup)', calories: 158, protein: 6, carbs: 27, fat: 3 },
    { name: 'Greek Yogurt (1 cup)', calories: 130, protein: 23, carbs: 9, fat: 0 },
    { name: 'Almonds (28g)', calories: 164, protein: 6, carbs: 6, fat: 14 },
    { name: 'Salmon (100g)', calories: 208, protein: 20, carbs: 0, fat: 13 },
    { name: 'Broccoli (1 cup)', calories: 55, protein: 3.7, carbs: 11, fat: 0.6 },
    { name: 'Sweet Potato', calories: 103, protein: 2.3, carbs: 24, fat: 0.1 },
    { name: 'Avocado (half)', calories: 160, protein: 2, carbs: 9, fat: 15 },
    { name: 'Protein Shake', calories: 120, protein: 24, carbs: 3, fat: 1 },
    { name: 'Toast (1 slice)', calories: 75, protein: 2.5, carbs: 14, fat: 1 },
    { name: 'Milk (1 cup)', calories: 103, protein: 8, carbs: 12, fat: 2.4 }
];

const sampleWorkouts = [
    { name: 'Pushups', unit_type: 'reps', calories_burned_per_unit: 0.4 },
    { name: 'Squats', unit_type: 'reps', calories_burned_per_unit: 0.3 },
    { name: 'Plank', unit_type: 'seconds', calories_burned_per_unit: 0.05 },
    { name: 'Running', unit_type: 'minutes', calories_burned_per_unit: 10 },
    { name: 'Walking', unit_type: 'minutes', calories_burned_per_unit: 4 },
    { name: 'Cycling', unit_type: 'minutes', calories_burned_per_unit: 8 },
    { name: 'Jump Rope', unit_type: 'minutes', calories_burned_per_unit: 12 },
    { name: 'Burpees', unit_type: 'reps', calories_burned_per_unit: 0.5 },
    { name: 'Lunges', unit_type: 'reps', calories_burned_per_unit: 0.2 },
    { name: 'Pull-ups', unit_type: 'reps', calories_burned_per_unit: 1 }
];

async function initDefaults() {
    const targets = await getStore('targets');
    if (targets.length === 0) {
        await add('targets', {
            id: 'daily',
            calories: 2000,
            protein: 100,
            carbs: 250,
            fat: 65,
            water: 2000,
            steps: 10000
        });
    }

    const foods = await getStore('food');
    if (foods.length === 0) {
        for (const food of sampleFoods) {
            await add('food', food);
        }
    }

    const workouts = await getStore('workouts');
    if (workouts.length === 0) {
        for (const workout of sampleWorkouts) {
            await add('workouts', workout);
        }
    }
}

const DB = {
    openDB,
    getStore,
    getById,
    getByIndex,
    add,
    update,
    remove,
    clearStore,
    getMetadata,
    setMetadata,
    exportAllData,
    importAllData,
    clearAllData,
    initDefaults
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DB;
}
