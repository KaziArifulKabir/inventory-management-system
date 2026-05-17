const express = require('express');
const session = require('express-session');
const mysql = require('mysql2');
const multer = require('multer');
const path = require('path');

const app = express();
// ---------- Multer image upload config ----------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mime = allowedTypes.test(file.mimetype);
    if (ext && mime) return cb(null, true);
    cb(new Error('Only image files are allowed'));
  }
});

// ---------- Middleware ----------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: 'inventory_pro_secret_2026',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }  // production এ true করবে
}));

// ---------- Database ----------
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',           // তোমার MySQL username
  password: '',  // তোমার পাসওয়ার্ড
  database: 'inventory_db'
});
db.connect(err => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  }
  console.log('✅ MySQL connected');
});

// ---------- Auth Middleware ----------
function checkAuth(req, res, next) {
  if (req.session.user) return next();
  res.redirect('/login.html');
}
// Role-based authorization middleware
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.session.user) {
      return res.redirect('/login.html');
    }
    if (!roles.includes(req.session.user.role)) {
      return res.status(403).send('Forbidden');
    }
    next();
  };
}

// ========== AUTH ROUTES ==========
const bcrypt = require('bcrypt');
const saltRounds = 10;

app.post('/api/register', async (req, res) => {
  const { owner_name, shop_name, email, username, user_id, password } = req.body;

  if (!username || !user_id || !email || !password) {
    return res.json({ success: false, message: 'All fields required' });
  }

  try {
    const hash = await bcrypt.hash(password, saltRounds);
    const sql = 'INSERT INTO users (owner_name, shop_name, email, username, user_id, password) VALUES (?,?,?,?,?,?)';
    db.query(sql, [owner_name, shop_name, email, username, user_id, hash], (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.json({ success: false, message: 'Username or User ID already exists' });
        console.error(err);
        return res.json({ success: false, message: 'Server error' });
      }
      res.json({ success: true, message: 'Registration successful!' });
    });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.json({ success: false, message: 'Username and password required' });
  }

  db.query('SELECT * FROM users WHERE username = ?', [username], async (err, results) => {
    if (err) return res.json({ success: false, message: 'Server error' });
    if (results.length === 0) return res.json({ success: false, message: 'Invalid credentials' });

    const user = results[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.json({ success: false, message: 'Invalid credentials' });

    req.session.user = { id: user.id, username: user.username, role: user.role };
    res.json({ success: true });
  });
});

// লগআউট
app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login.html'));
});

// ========== PROTECTED PAGE ROUTES ==========
const pages = ['dashboard','inventory','stock','locations','reports','users'];
// Profile page
app.get('/profile.html', checkAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});
pages.forEach(page => {
  app.get(`/${page}.html`, checkAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', `${page}.html`));
  });
});

// ========== API ROUTES (protected) ==========
// ড্যাশবোর্ড স্ট্যাট
app.get('/api/dashboard/stats', checkAuth, (req, res) => {
  const queries = {
    totalItems: 'SELECT COUNT(*) AS count FROM products',
    totalStock: 'SELECT SUM(stock) AS sum FROM products',
    inventoryValue: 'SELECT SUM(price * stock) AS value FROM products',
    lowStockCount: 'SELECT COUNT(*) AS count FROM products WHERE stock <= reorder_level',
    transactionCount: 'SELECT COUNT(*) AS count FROM transactions'
  };
  const stats = {};
  let pending = Object.keys(queries).length;
  Object.entries(queries).forEach(([key, sql]) => {
    db.query(sql, (err, results) => {
      if (err) stats[key] = 0;
      else stats[key] = results[0][Object.keys(results[0])[0]] || 0;
      pending--;
      if (pending === 0) res.json(stats);
    });
  });
});

// প্রোডাক্ট API
app.get('/api/products', checkAuth, (req, res) => {
  db.query('SELECT * FROM products ORDER BY created_at DESC', (err, results) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(results);
  });
});

// প্রোডাক্ট API (create)
app.post('/api/products', checkAuth, authorize('admin'), upload.single('productImage'), (req, res) => {
  const { name, sku, price, stock, reorderLevel, category, location } = req.body;

  if (!name || !sku || !price) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const parsedPrice = parseFloat(price);
  const parsedStock = parseInt(stock) || 0;
  const parsedReorder = parseInt(reorderLevel) || 5;
  const finalLocation = location || 'Main Warehouse';

  // ফাইল থাকলে তার পাথ, না থাকলে ডিফল্ট
  const imgPath = req.file ? '/uploads/' + req.file.filename : 'https://via.placeholder.com/150';

  db.query(
    'INSERT INTO products (name, sku, price, stock, reorder_level, img, category, location) VALUES (?,?,?,?,?,?,?,?)',
    [name.trim(), sku.trim(), parsedPrice, parsedStock, parsedReorder, imgPath, category, finalLocation],
    (err, result) => {
      if (err) return res.status(400).json({ message: err.sqlMessage || 'Error' });
      db.query(
        'INSERT INTO transactions (type, product_sku, product_name, quantity, to_location) VALUES ("add", ?, ?, ?, ?)',
        [sku, name, parsedStock, finalLocation]
      );
      res.status(201).json({ success: true, image: imgPath });
    }
  );
});

app.put('/api/products/:sku', checkAuth, authorize('admin'), (req, res) => {
  const { stock, price, location } = req.body;
  const updateFields = [];
  const values = [];
  if (stock !== undefined) { updateFields.push('stock = ?'); values.push(stock); }
  if (price !== undefined) { updateFields.push('price = ?'); values.push(price); }
  if (location) { updateFields.push('location = ?'); values.push(location); }
  if (updateFields.length === 0) return res.status(400).json({ message: 'Nothing to update' });
  values.push(req.params.sku);
  db.query(`UPDATE products SET ${updateFields.join(', ')} WHERE sku = ?`, values, (err, result) => {
    if (err) return res.status(400).json({ message: err.sqlMessage });
    res.json({ success: true });
  });
});

app.delete('/api/products/:sku', checkAuth, authorize('admin'), (req, res) => {
  const sku = req.params.sku;
  db.query('SELECT stock FROM products WHERE sku = ?', [sku], (err, results) => {
    if (err || results.length === 0) return res.status(400).json({ message: 'Product not found' });
    if (results[0].stock > 0) return res.status(400).json({ message: 'Cannot delete product with stock > 0' });
    db.query('DELETE FROM products WHERE sku = ?', [sku], (err2) => {
      if (err2) return res.status(400).json({ message: err2.sqlMessage });
      res.json({ success: true });
    });
  });
});

// ট্রানজেকশন API
app.post('/api/transactions/sell', checkAuth, (req, res) => {
  const { sku, quantity } = req.body;
  if (!sku || !quantity) return res.status(400).json({ message: 'Missing data' });
  db.query('SELECT * FROM products WHERE sku = ?', [sku], (err, products) => {
    if (err || products.length === 0) return res.status(400).json({ message: 'Product not found' });
    const product = products[0];
    if (product.stock < quantity) return res.status(400).json({ message: 'Insufficient stock' });
    db.query('UPDATE products SET stock = stock - ? WHERE sku = ?', [quantity, sku], (err2) => {
      if (err2) return res.status(400).json({ message: err2.sqlMessage });
      db.query('INSERT INTO transactions (type, product_sku, product_name, quantity, from_location) VALUES ("sale", ?, ?, ?, ?)',
        [sku, product.name, quantity, product.location]);
      res.json({ success: true });
    });
  });
});

app.post('/api/transactions/stock-in', checkAuth, (req, res) => {
  const { item, qty, location } = req.body;
  if (!item || !qty || !location) return res.status(400).json({ message: 'Missing fields' });
  db.query('SELECT * FROM products WHERE sku = ?', [item], (err, results) => {
    if (err || results.length === 0) {
      db.query('SELECT * FROM products WHERE name = ?', [item], (err2, results2) => {
        if (err2 || results2.length === 0) return res.status(400).json({ message: 'Product not found' });
        updateStock(results2[0], qty, location, res);
      });
    } else {
      updateStock(results[0], qty, location, res);
    }
  });
  function updateStock(product, qty, location, res) {
    db.query('UPDATE products SET stock = stock + ?, location = ? WHERE sku = ?', [qty, location, product.sku], (err) => {
      if (err) return res.status(400).json({ message: err.sqlMessage });
      db.query('INSERT INTO transactions (type, product_sku, product_name, quantity, to_location) VALUES ("stock-in", ?, ?, ?, ?)',
        [product.sku, product.name, qty, location]);
      res.json({ success: true });
    });
  }
});

app.post('/api/transactions/stock-out', checkAuth, (req, res) => {
  const { item, qty, location, reason } = req.body;
  if (!item || !qty || !location) return res.status(400).json({ message: 'Missing fields' });
  db.query('SELECT * FROM products WHERE sku = ? OR name = ?', [item, item], (err, products) => {
    if (err || products.length === 0) return res.status(400).json({ message: 'Product not found' });
    const product = products[0];
    if (product.stock < qty) return res.status(400).json({ message: 'Insufficient stock' });
    db.query('UPDATE products SET stock = stock - ? WHERE sku = ?', [qty, product.sku], (err2) => {
      if (err2) return res.status(400).json({ message: err2.sqlMessage });
      db.query('INSERT INTO transactions (type, product_sku, product_name, quantity, from_location, reason) VALUES ("stock-out", ?, ?, ?, ?, ?)',
        [product.sku, product.name, qty, location, reason || '']);
      res.json({ success: true });
    });
  });
});

app.post('/api/transactions/transfer', checkAuth, (req, res) => {
  const { item, qty, from, to } = req.body;
  if (!item || !qty || !from || !to) return res.status(400).json({ message: 'Missing fields' });
  db.query('SELECT * FROM products WHERE sku = ? OR name = ?', [item, item], (err, products) => {
    if (err || products.length === 0) return res.status(400).json({ message: 'Product not found' });
    const product = products[0];
    if (product.stock < qty) return res.status(400).json({ message: 'Insufficient stock' });
    db.query('UPDATE products SET location = ? WHERE sku = ?', [to, product.sku], (err2) => {
      if (err2) return res.status(400).json({ message: err2.sqlMessage });
      db.query('INSERT INTO transactions (type, product_sku, product_name, quantity, from_location, to_location) VALUES ("transfer", ?, ?, ?, ?, ?)',
        [product.sku, product.name, qty, from, to]);
      res.json({ success: true });
    });
  });
});

// লোকেশন API
app.get('/api/locations', checkAuth, (req, res) => {
  db.query('SELECT l.*, (SELECT COUNT(*) FROM products WHERE location = l.name) AS stockCount FROM locations l', (err, results) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(results);
  });
});

app.post('/api/locations', checkAuth, (req, res) => {
  const { name, type, capacity, manager } = req.body;
  if (!name || !type) return res.status(400).json({ message: 'Name and type required' });
  db.query('INSERT INTO locations (name, type, capacity, manager) VALUES (?,?,?,?)', [name, type, capacity, manager], (err) => {
    if (err) return res.status(400).json({ message: err.sqlMessage });
    res.status(201).json({ success: true });
  });
});

// ইউজার API (শুধু অ্যাডমিন)
app.get('/api/users', checkAuth, authorize('admin'), (req, res) => {
  db.query('SELECT id, user_id, owner_name, shop_name, email, username, role, created_at FROM users', (err, results) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(results);
  });
});
// নিজের প্রোফাইল API (লগইন করা ইউজার)
app.get('/api/profile', checkAuth, (req, res) => {
  const userId = req.session.user.id;
  db.query('SELECT user_id, owner_name, shop_name, email, username, role, created_at FROM users WHERE id = ?', [userId], (err, results) => {
    if (err || results.length === 0) return res.status(500).json({ error: 'User not found' });
    res.json(results[0]);
  });
});
// প্রোফাইল আপডেট API (PUT)
app.put('/api/profile', checkAuth, (req, res) => {
  const userId = req.session.user.id;
  const { owner_name, shop_name, email, username, user_id } = req.body;

  if (!email || !username || !user_id) {
    return res.json({ success: false, message: 'Email, Username, and User ID are required' });
  }

  // চেক করো যে ইউজারনেম বা ইউজার আইডি অন্য কেউ ব্যবহার করছে কিনা (নিজের ছাড়া)
  const checkSql = 'SELECT id FROM users WHERE (username = ? OR user_id = ?) AND id != ?';
  db.query(checkSql, [username, user_id, userId], (err, results) => {
    if (err) return res.json({ success: false, message: 'Database error' });
    if (results.length > 0) {
      return res.json({ success: false, message: 'Username or User ID already exists' });
    }

    const updateSql = 'UPDATE users SET owner_name = ?, shop_name = ?, email = ?, username = ?, user_id = ? WHERE id = ?';
    db.query(updateSql, [owner_name, shop_name, email, username, user_id, userId], (err2) => {
      if (err2) return res.json({ success: false, message: 'Update failed' });
      // সেশন আপডেট (নতুন username রেখে দিতে পারো, যদিও লগইনে এখনো old username থাকবে না, কিন্তু আমরা সেশনেও নতুন নাম রাখতে পারি)
      req.session.user.username = username; // যদি ইউজারনেম চেঞ্জ করে
      res.json({ success: true, message: 'Profile updated!' });
    });
  });
});
// ট্রানজেকশন লিস্ট (রিসেন্ট অ্যাক্টিভিটি)
app.get('/api/transactions', checkAuth, (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  db.query('SELECT * FROM transactions ORDER BY created_at DESC LIMIT ?', [limit], (err, results) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(results);
  });
});

// Catch-all — যেকোনো অপরিচিত route-কে লগইন পেজে পাঠাবে
app.use((req, res) => {
  res.redirect('/login.html');
});

// ---------- Start server ----------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});