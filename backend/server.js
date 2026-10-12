require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sql, poolPromise } = require('./db');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const DATA_FILE = path.join(__dirname, 'data.json');

// data inicial por si se borra el json
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

// lee el json local o jala la data del front si no existe
function loadData() {
if (!fs.existsSync(DATA_FILE)) {
    const menuPath = path.join(__dirname, '..', 'src', 'app', 'core', 'menu.json');
    if (fs.existsSync(menuPath)) {
    try {
        defaultData.products = JSON.parse(fs.readFileSync(menuPath, 'utf8'));
    } catch (err) {
        console.warn('error leyendo menu.json');
    }
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData, null, 2));
    return defaultData;
}
return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function saveData(data) {
fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

let db = loadData();

// health check
app.get('/api/v1/health', (req, res) => {
res.json({ status: 'OK', uptime: process.uptime() });
});

// endpoints conectados directo a RDS
app.get('/api/v1/categories', async (req, res) => {
try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
    SELECT 
        CategoriaId AS id,
        Nombre AS nombre,
        EsPostre AS postre
    FROM Categoria
    `);
    
    // si hay data en aws mandamos eso, si no usamos local
    if (result.recordset && result.recordset.length > 0) {
    return res.json(result.recordset);
    }
    res.json(db.categories || []);
} catch (err) {
    console.error('fallo query categorias en aws:', err.message);
    res.json(db.categories || []);
}
});

app.get('/api/v1/products', async (req, res) => {
try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
    SELECT 
        ProductoId AS id,
        Nombre AS nombre,
        Descripcion AS descripcion,
        CategoriaId AS categoriaId,
        ImagenUrl AS imagenUrl,
        Precio AS precio,
        DescuentoPct AS descuentoPct,
        Personalizable AS personalizable,
        Activo AS activo
    FROM Producto
    WHERE Activo = 1
    `);
    
    if (result.recordset && result.recordset.length > 0) {
    return res.json(result.recordset);
    }
    res.json(db.products || []);
} catch (err) {
    console.error('fallo query productos en aws:', err.message);
    res.json(db.products || []);
}
});

// modulos con persistencia local
const RESOURCES = ['users', 'orders', 'stock', 'suppliers', 'purchases'];

RESOURCES.forEach((resource) => {
const basePath = `/api/v1/${resource}`;

app.get(basePath, (req, res) => {
    res.json(db[resource] || []);
});

app.post(basePath, (req, res) => {
    const newItem = req.body;
    if (!db[resource]) db[resource] = [];
    db[resource].push(newItem);
    saveData(db);
    res.status(201).json(newItem);
});

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
console.log(`Server corriendo en http://localhost:${PORT}/api/v1`);
});