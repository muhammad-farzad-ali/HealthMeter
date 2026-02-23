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
