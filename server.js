const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(session({
    secret: 'mySecretKeyChangeThis',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, JSON.stringify([]));

function readUsers() {
    return JSON.parse(fs.readFileSync(USERS_FILE));
}

function saveUser(user) {
    const users = readUsers();
    if (!users.find(u => u.email === user.email)) {
        users.push(user);
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    }
}

app.post('/api/register', (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
    if (readUsers().find(u => u.email === email)) return res.status(400).json({ error: 'البريد موجود' });
    saveUser({ id: Date.now(), name, email, password, timestamp: new Date().toISOString() });
    res.json({ success: true, message: 'تم التسجيل بنجاح' });
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const user = readUsers().find(u => u.email === email && u.password === password);
    if (user) {
        req.session.user = { name: user.name, email: user.email };
        res.json({ success: true, message: `مرحباً ${user.name}` });
    } else {
        res.status(401).json({ error: 'بيانات غير صحيحة' });
    }
});

app.get('/api/check-session', (req, res) => {
    res.json({ loggedIn: !!req.session.user, user: req.session.user });
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// ------------------- لوحة المشرف -------------------
app.post('/api/admin/login', (req, res) => {
    if (req.body.password === '12345') {
        req.session.isAdmin = true;
        res.json({ success: true });
    } else {
        res.status(401).json({ error: 'كلمة مرور غير صحيحة' });
    }
});

app.get('/api/admin/users', (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ error: 'غير مصرح' });
    res.json(readUsers());
});

app.post('/api/admin/logout', (req, res) => {
    req.session.isAdmin = false;
    res.json({ success: true });
});

// ------------------- تقديم الصفحة الرئيسية الموحدة -------------------
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => console.log(`✅ الخادم يعمل على http://localhost:${PORT}`));