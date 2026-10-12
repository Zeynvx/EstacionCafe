// Servidor de la API para Estación Café
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Habilitar CORS para que Angular (puerto 4200) pueda consultar la API
app.use(cors());
app.use(express.json());

const DATA_FILE = path.join(__dirname, 'data.json');

// Datos base si aún no existe el archivo data.json
const defaultData = {
products: [],
categories: [
    { id: 'cafes', nombre: 'Cafés de especialidad', postre: false },
    { id: 'postres', nombre: 'Postres y repostería', postre: true },
    { id: 'bebidas', nombre: 'Bebidas frías', postre: false },
    { id: 'combos', nombre: 'Combos', postre: false }
],
users: [],
orders: [],
stock: [
    { id: 'cafe', nombre: 'Café en grano', unidad: 'kg', cantidad: 12, minimo: 3 },
    { id: 'leche', nombre: 'Leche entera', unidad: 'L', cantidad: 20, minimo: 5 }
],
suppliers: [],
purchases: []
};

// Carga datos desde data.json o precarga el menu.json del frontend
function loadData() {
if (!fs.existsSync(DATA_FILE)) {
    const menuPath = path.join(__dirname, '..', 'src', 'app', 'core', 'menu.json');
    if (fs.existsSync(menuPath)) {
    try {
        defaultData.products = JSON.parse(fs.readFileSync(menuPath, 'utf8'));
    } catch (err) {
        console.warn('No se pudo leer menu.json inicial');
    }
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData, null, 2));
    return defaultData;
}
return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

// Guarda cambios en data.json cada vez que se agrega o edita algo
function saveData(data) {
fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

let db = loadData();

// Verificación de estado del servidor
app.get('/api/v1/health', (req, res) => {
res.json({ status: 'OK', uptime: process.uptime() });
});

// Recursos definidos en el frontend (api.config.ts)
const RESOURCES = ['products', 'categories', 'users', 'orders', 'stock', 'suppliers', 'purchases'];

RESOURCES.forEach((resource) => {
const basePath = `/api/v1/${resource}`;

  // Obtener todos
app.get(basePath, (req, res) => {
    res.json(db[resource] || []);
});

  // Crear nuevo
app.post(basePath, (req, res) => {
    const newItem = req.body;
    if (!db[resource]) db[resource] = [];
    db[resource].push(newItem);
    saveData(db);
    res.status(201).json(newItem);
});

  // Actualizar por ID
app.put(`${basePath}/:id`, (req, res) => {
    const id = req.params.id;
    const updatedItem = req.body;
    const index = (db[resource] || []).findIndex((item) => String(item.id) === String(id));

    if (index !== -1) {
    db[resource][index] = updatedItem;
    } else {
    db[resource].push(updatedItem);
    }
    saveData(db);
    res.json(updatedItem);
});

  // Eliminar por ID
app.delete(`${basePath}/:id`, (req, res) => {
    const id = req.params.id;
    if (db[resource]) {
    db[resource] = db[resource].filter((item) => String(item.id) !== String(id));
    saveData(db);
    }
    res.status(204).send();
});
});

app.listen(PORT, () => {
console.log(`Servidor de API corriendo en http://localhost:${PORT}/api/v1`);
});