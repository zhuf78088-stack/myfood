/**
 * 美食册子 - 后端服务器
 * Express + JSON 文件存储 + multer 图片上传
 */

const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ============ 中间件 ============
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));  // 静态前端
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // 图片

// ============ 数据库（JSON 文件）============
const DB_PATH = path.join(__dirname, 'data.json');

const DEFAULT_DATA = {
  admins: [
    { id: 1, username: 'admin', password: 'admin123', name: '超级管理员', createdAt: '2026-01-01' }
  ],
  categories: [
    { id: 1, name: '招牌主食', order: 1, enabled: true },
    { id: 2, name: '精选小炒', order: 2, enabled: true },
    { id: 3, name: '汤羹煲类', order: 3, enabled: true },
    { id: 4, name: '特色凉菜', order: 4, enabled: true },
    { id: 5, name: '甜品饮品', order: 5, enabled: true }
  ],
  dishes: [
    { id: 1, categoryId: 1, name: '红烧肉盖饭', status: 'on',
      images: ['https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&q=80'],
      order: 1, createdAt: '2026-01-05' },
    { id: 2, categoryId: 1, name: '扬州炒饭', status: 'on',
      images: ['https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&q=80'],
      order: 2, createdAt: '2026-01-06' },
    { id: 3, categoryId: 2, name: '番茄炒蛋', status: 'on',
      images: ['https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&q=80'],
      order: 1, createdAt: '2026-01-07' },
    { id: 4, categoryId: 2, name: '宫保鸡丁', status: 'on',
      images: ['https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=400&q=80'],
      order: 2, createdAt: '2026-01-08' },
    { id: 5, categoryId: 2, name: '鱼香肉丝', status: 'on',
      images: ['https://images.unsplash.com/photo-1547592180-85f173990554?w=400&q=80'],
      order: 3, createdAt: '2026-01-09' },
    { id: 6, categoryId: 3, name: '酸辣汤', status: 'on',
      images: ['https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400&q=80'],
      order: 1, createdAt: '2026-01-10' },
    { id: 7, categoryId: 3, name: '老火靓汤', status: 'on',
      images: ['https://images.unsplash.com/photo-1613844237701-8f3664fc2eff?w=400&q=80'],
      order: 2, createdAt: '2026-01-11' },
    { id: 8, categoryId: 4, name: '夫妻肺片', status: 'on',
      images: ['https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400&q=80'],
      order: 1, createdAt: '2026-01-12' },
    { id: 9, categoryId: 5, name: '芒果班戟', status: 'on',
      images: ['https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400&q=80'],
      order: 1, createdAt: '2026-01-13' },
    { id: 10, categoryId: 5, name: '杨枝甘露', status: 'on',
      images: ['https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?w=400&q=80'],
      order: 2, createdAt: '2026-01-14' }
  ]
};

let nextId = 100;

function loadDB() {
  if (!fs.existsSync(DB_PATH)) {
    // 首次启动，写入默认数据
    saveDB(DEFAULT_DATA);
    return JSON.parse(JSON.stringify(DEFAULT_DATA));
  }
  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  return JSON.parse(raw);
}

function saveDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// 启动时加载
let db = loadDB();

// 生成唯一 ID
function genId() {
  nextId++;
  return nextId;
}

// ============ 图片上传配置 ============
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, 'dish_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6) + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('仅支持图片文件'));
  }
});

// ============ API 路由 ============

// --- 登录 ---
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  db = loadDB();
  const admin = (db.admins || []).find(a => a.username === username && a.password === password);
  if (!admin) return res.status(401).json({ error: '用户名或密码错误' });
  const { password: _, ...safe } = admin;
  res.json({ admin: safe });
});

// --- 管理员 CRUD ---
app.get('/api/admins', (req, res) => {
  db = loadDB();
  const admins = (db.admins || []).map(a => { const { password: _, ...safe } = a; return safe; });
  res.json(admins);
});

app.post('/api/admins', (req, res) => {
  db = loadDB();
  const { username, password, name } = req.body;
  if (!username || !password) return res.status(400).json({ error: '用户名和密码不能为空' });
  if ((db.admins || []).find(a => a.username === username)) {
    return res.status(400).json({ error: '用户名已存在' });
  }
  const admin = { id: genId(), username, password, name: name || username, createdAt: new Date().toISOString().slice(0, 10) };
  db.admins = db.admins || [];
  db.admins.push(admin);
  saveDB(db);
  const { password: _, ...safe } = admin;
  res.json(safe);
});

app.put('/api/admins/:id', (req, res) => {
  db = loadDB();
  const id = parseInt(req.params.id);
  const idx = (db.admins || []).findIndex(a => a.id === id);
  if (idx === -1) return res.status(404).json({ error: '管理员不存在' });
  const { name, password } = req.body;
  if (name) db.admins[idx].name = name;
  if (password) db.admins[idx].password = password;
  saveDB(db);
  const { password: _, ...safe } = db.admins[idx];
  res.json(safe);
});

app.delete('/api/admins/:id', (req, res) => {
  db = loadDB();
  const id = parseInt(req.params.id);
  db.admins = (db.admins || []).filter(a => a.id !== id);
  saveDB(db);
  res.json({ success: true });
});

// --- 分类 CRUD ---
app.get('/api/categories', (req, res) => {
  db = loadDB();
  const cats = (db.categories || []).sort((a, b) => a.order - b.order);
  res.json(cats);
});

app.post('/api/categories', (req, res) => {
  db = loadDB();
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: '分类名称不能为空' });
  const maxOrder = (db.categories || []).reduce((m, c) => Math.max(m, c.order), 0);
  const cat = { id: genId(), name, order: maxOrder + 1, enabled: true };
  db.categories = db.categories || [];
  db.categories.push(cat);
  saveDB(db);
  res.json(cat);
});

app.put('/api/categories/:id', (req, res) => {
  db = loadDB();
  const id = parseInt(req.params.id);
  const idx = (db.categories || []).findIndex(c => c.id === id);
  if (idx === -1) return res.status(404).json({ error: '分类不存在' });
  Object.assign(db.categories[idx], req.body);
  saveDB(db);
  res.json(db.categories[idx]);
});

app.delete('/api/categories/:id', (req, res) => {
  db = loadDB();
  const id = parseInt(req.params.id);
  db.categories = (db.categories || []).filter(c => c.id !== id);
  db.dishes = (db.dishes || []).filter(d => d.categoryId !== id);
  saveDB(db);
  res.json({ success: true });
});

// --- 菜品 CRUD ---
app.get('/api/dishes', (req, res) => {
  db = loadDB();
  let dishes = db.dishes || [];
  if (req.query.categoryId) {
    const catId = parseInt(req.query.categoryId);
    dishes = dishes.filter(d => d.categoryId === catId);
  }
  if (req.query.status) {
    dishes = dishes.filter(d => d.status === req.query.status);
  }
  if (req.query.keyword) {
    const kw = req.query.keyword.toLowerCase();
    dishes = dishes.filter(d => d.name.toLowerCase().includes(kw));
  }
  res.json(dishes.sort((a, b) => a.order - b.order));
});

app.post('/api/dishes', upload.array('images', 10), (req, res) => {
  db = loadDB();
  const { categoryId, name, status } = req.body;
  if (!categoryId || !name) return res.status(400).json({ error: '分类和名称不能为空' });
  const catId = parseInt(categoryId);
  const maxOrder = (db.dishes || [])
    .filter(d => d.categoryId === catId)
    .reduce((m, d) => Math.max(m, d.order), 0);
  const images = (req.files || []).map(f => '/uploads/' + f.filename);
  const dish = {
    id: genId(),
    categoryId: catId,
    name,
    status: status || 'on',
    images,
    order: maxOrder + 1,
    createdAt: new Date().toISOString().slice(0, 10)
  };
  db.dishes = db.dishes || [];
  db.dishes.push(dish);
  saveDB(db);
  res.json(dish);
});

app.put('/api/dishes/:id', upload.array('images', 10), async (req, res) => {
  db = loadDB();
  const id = parseInt(req.params.id);
  const idx = (db.dishes || []).findIndex(d => d.id === id);
  if (idx === -1) return res.status(404).json({ error: '菜品不存在' });

  const { categoryId, name, status, keepImages } = req.body;
  if (categoryId) db.dishes[idx].categoryId = parseInt(categoryId);
  if (name) db.dishes[idx].name = name;
  if (status) db.dishes[idx].status = status;

  // 处理图片：保留旧图 + 新增图
  let newImages = [];
  if (keepImages) {
    try { newImages = JSON.parse(keepImages); } catch (e) { newImages = []; }
  }
  const uploadedUrls = (req.files || []).map(f => '/uploads/' + f.filename);
  db.dishes[idx].images = newImages.concat(uploadedUrls);

  saveDB(db);
  res.json(db.dishes[idx]);
});

app.delete('/api/dishes/:id', (req, res) => {
  db = loadDB();
  const id = parseInt(req.params.id);
  // 尝试删除本地图片文件
  const dish = (db.dishes || []).find(d => d.id === id);
  if (dish && dish.images) {
    dish.images.forEach(img => {
      if (img.startsWith('/uploads/')) {
        const filePath = path.join(__dirname, img);
        if (fs.existsSync(filePath)) {
          try { fs.unlinkSync(filePath); } catch (e) {}
        }
      }
    });
  }
  db.dishes = (db.dishes || []).filter(d => d.id !== id);
  saveDB(db);
  res.json({ success: true });
});

// ============ 启动服务器 ============
app.listen(PORT, () => {
  console.log('美食册子服务器已启动: http://localhost:' + PORT);
  console.log('  前台: http://localhost:' + PORT + '/index.html');
  console.log('  后台: http://localhost:' + PORT + '/admin.html');
});
