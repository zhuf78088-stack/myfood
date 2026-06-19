/**
 * 美食册子 - 共享数据层（API 版）
 * 通过后端 API 存取数据，替代 localStorage
 * 接口保持与旧版兼容
 */

const DB = {
  // API 基础函数
  async _api(url, options) {
    var resp = await fetch(url, options);
    var data = await resp.json();
    if (!resp.ok) throw new Error(data.error || '请求失败');
    return data;
  },
  _getQS(filters) {
    var parts = [];
    if (filters) {
      if (filters.categoryId !== undefined && filters.categoryId !== null) parts.push('categoryId=' + encodeURIComponent(filters.categoryId));
      if (filters.status) parts.push('status=' + encodeURIComponent(filters.status));
      if (filters.keyword) parts.push('keyword=' + encodeURIComponent(filters.keyword));
    }
    return parts.length ? '?' + parts.join('&') : '';
  },

  // 初始化（API 版无需初始化，保留兼容）
  init() {},

  // ---- 分类 ----
  async getCategories() {
    return this._api('/api/categories');
  },
  async addCategory(name) {
    return this._api('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name })
    });
  },
  async updateCategory(id, updates) {
    return this._api('/api/categories/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
  },
  async deleteCategory(id) {
    return this._api('/api/categories/' + id, { method: 'DELETE' });
  },

  // ---- 菜品 ----
  async getDishes(filters) {
    return this._api('/api/dishes' + this._getQS(filters));
  },
  async addDish(dish, files) {
    var form = new FormData();
    form.append('categoryId', dish.categoryId);
    form.append('name', dish.name);
    form.append('status', dish.status || 'on');
    if (files && files.length) {
      for (var i = 0; i < files.length; i++) form.append('images', files[i]);
    }
    return this._api('/api/dishes', { method: 'POST', body: form });
  },
  async updateDish(id, dish, files, keep) {
    var form = new FormData();
    if (dish.categoryId !== undefined) form.append('categoryId', dish.categoryId);
    if (dish.name !== undefined) form.append('name', dish.name);
    if (dish.status !== undefined) form.append('status', dish.status);
    if (keep !== undefined) form.append('keepImages', JSON.stringify(keep));
    if (files && files.length) {
      for (var i = 0; i < files.length; i++) form.append('images', files[i]);
    }
    return this._api('/api/dishes/' + id, { method: 'PUT', body: form });
  },
  async deleteDish(id) {
    return this._api('/api/dishes/' + id, { method: 'DELETE' });
  },

  // ---- 管理员 ----
  async getAdmins() {
    return this._api('/api/admins');
  },
  async addAdmin(admin) {
    return this._api('/api/admins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(admin)
    });
  },
  async updateAdmin(id, updates) {
    return this._api('/api/admins/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
  },
  async deleteAdmin(id) {
    return this._api('/api/admins/' + id, { method: 'DELETE' });
  },
  async login(username, password) {
    return this._api('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username, password: password })
    });
  },

  // 兼容旧接口（reset 不适用）
  reset() { /* API 版不支持重置 */ }
};
