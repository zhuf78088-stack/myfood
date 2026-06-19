/**
 * 美食册子 - 后端服务器（Supabase 版）
 * Express + Supabase PostgreSQL + Supabase Storage 图片存储
 */

const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// Supabase 配置
const supabaseUrl = process.env.SUPABASE_URL || 'https://mptmpholnizmbxmimxhn.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wdG1waG9sbml6bWJ4bWlteGhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4NTE3MzgsImV4cCI6MjA5NzQyNzczOH0.RC5rXrt6GpwTVldoErnPbbQnoZDHwfp3Dr8bB8RnKIE';
const supabase = createClient(supabaseUrl, supabaseKey);
const BUCKET = 'dishes';

// ============ 中间件 ============
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// 图片上传：内存存储 → 上传到 Supabase Storage
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

/** 将 multer 文件上传到 Supabase Storage，返回公开访问 URL */
async function uploadToStorage(file) {
  const ext = path.extname(file.originalname);
  const filename = 'dish_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6) + ext;
  const { error } = await supabase.storage.from(BUCKET).upload(filename, file.buffer, {
    contentType: file.mimetype, upsert: false
  });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(filename).data.publicUrl;
}

// ============ 中间件 ============
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ============ API 路由 ============

// --- 登录 ---
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const { data, error } = await supabase
      .from('admins').select('*')
      .eq('username', username).eq('password', password).single();
    if (error || !data) return res.status(401).json({ error: '用户名或密码错误' });
    const { password: _, ...safe } = data;
    res.json({ admin: safe });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- 管理员 CRUD ---
app.get('/api/admins', async (req, res) => {
  try {
    const { data } = await supabase.from('admins').select('id,username,name,created_at');
    res.json(data || []);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admins', async (req, res) => {
  try {
    const { username, password, name } = req.body;
    if (!username || !password) return res.status(400).json({ error: '用户名和密码不能为空' });
    const { data: exist } = await supabase.from('admins').select('id').eq('username', username).single();
    if (exist) return res.status(400).json({ error: '用户名已存在' });
    const { data, error } = await supabase.from('admins').insert({
      username, password, name: name || username, created_at: new Date().toISOString().slice(0, 10)
    }).select('id,username,name,created_at').single();
    if (error) throw error;
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/admins/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const updates = {};
    if (req.body.name) updates.name = req.body.name;
    if (req.body.password) updates.password = req.body.password;
    const { data, error } = await supabase.from('admins').update(updates)
      .eq('id', id).select('id,username,name,created_at').single();
    if (error) throw error;
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/admins/:id', async (req, res) => {
  try {
    await supabase.from('admins').delete().eq('id', req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- 分类 CRUD ---
app.get('/api/categories', async (req, res) => {
  try {
    const { data } = await supabase.from('categories').select('*').order('order');
    res.json(data || []);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/categories', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: '分类名称不能为空' });
    const { data: maxData } = await supabase.from('categories').select('order').order('order', { ascending: false }).limit(1);
    const maxOrder = (maxData && maxData.length > 0) ? maxData[0].order : 0;
    const { data, error } = await supabase.from('categories').insert({
      name, order: maxOrder + 1, enabled: true
    }).select('*').single();
    if (error) throw error;
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/categories/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('categories').update(req.body)
      .eq('id', req.params.id).select('*').single();
    if (error) throw error;
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/categories/:id', async (req, res) => {
  try {
    await supabase.from('categories').delete().eq('id', req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- 菜品 CRUD ---
app.get('/api/dishes', async (req, res) => {
  try {
    let query = supabase.from('dishes').select('*');
    if (req.query.categoryId) query = query.eq('category_id', req.query.categoryId);
    if (req.query.status) query = query.eq('status', req.query.status);
    if (req.query.keyword) query = query.ilike('name', '%' + req.query.keyword + '%');
    query = query.order('order');
    const { data } = await query;
    // 转换字段名为前端兼容格式
    const dishes = (data || []).map(d => ({
      id: d.id, categoryId: d.category_id, name: d.name,
      status: d.status, images: d.images, order: d.order, createdAt: d.created_at
    }));
    res.json(dishes);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/dishes', upload.array('images', 10), async (req, res) => {
  try {
    const { categoryId, name, status } = req.body;
    if (!categoryId || !name) return res.status(400).json({ error: '分类和名称不能为空' });
    const catId = parseInt(categoryId);
    const { data: maxData } = await supabase.from('dishes').select('order')
      .eq('category_id', catId).order('order', { ascending: false }).limit(1);
    const maxOrder = (maxData && maxData.length > 0) ? maxData[0].order : 0;

    // 上传图片到 Supabase Storage
    const images = [];
    if (req.files && req.files.length > 0) {
      for (const f of req.files) {
        const url = await uploadToStorage(f);
        images.push(url);
      }
    }

    const dish = {
      category_id: catId, name, status: status || 'on',
      images, order: maxOrder + 1,
      created_at: new Date().toISOString().slice(0, 10)
    };
    const { data, error } = await supabase.from('dishes').insert(dish).select('*').single();
    if (error) throw error;
    res.json({
      id: data.id, categoryId: data.category_id, name: data.name,
      status: data.status, images: data.images, order: data.order, createdAt: data.created_at
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/dishes/:id', upload.array('images', 10), async (req, res) => {
  try {
    const id = req.params.id;
    const updates = {};
    if (req.body.categoryId) updates.category_id = parseInt(req.body.categoryId);
    if (req.body.name) updates.name = req.body.name;
    if (req.body.status) updates.status = req.body.status;

    // 图片：保留旧图 + 新上传到 Storage
    if (req.body.keepImages) {
      try { updates.images = JSON.parse(req.body.keepImages); } catch (e) { updates.images = []; }
    }
    if (req.files && req.files.length > 0) {
      const newUrls = [];
      for (const f of req.files) {
        const url = await uploadToStorage(f);
        newUrls.push(url);
      }
      updates.images = (updates.images || []).concat(newUrls);
    }

    const { data, error } = await supabase.from('dishes').update(updates)
      .eq('id', id).select('*').single();
    if (error) throw error;
    res.json({
      id: data.id, categoryId: data.category_id, name: data.name,
      status: data.status, images: data.images, order: data.order, createdAt: data.created_at
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/dishes/:id', async (req, res) => {
  try {
    await supabase.from('dishes').delete().eq('id', req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============ 启动服务器 ============
app.listen(PORT, () => {
  console.log('美食册子服务器已启动 (Supabase): http://localhost:' + PORT);
});
