const express = require('express');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ إعداد الجلسة بشكل صحيح على Vercel (HTTPS)
app.use(session({
    secret: 'mySecretKeyChangeThisForProduction',
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: true,           // 🔥 مهم لـ HTTPS على Vercel
        httpOnly: true,
        sameSite: 'lax'
    }
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// ------------------- تخزين المستخدمين في الذاكرة (للتجربة) -------------------
// ⚠️ تنبيه: البيانات ستُفقد عند إعادة تشغيل الدالة. لا تستخدم هذا في الإنتاج الحقيقي.
let users = [];   // مصفوفة في الذاكرة

// ------------------- واجهات API -------------------
app.post('/api/register', (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
    }
    if (users.find(u => u.email === email)) {
        return res.status(400).json({ error: 'البريد الإلكتروني موجود مسبقاً' });
    }
    const newUser = {
        id: Date.now(),
        name,
        email,
        password,
        timestamp: new Date().toISOString()
    };
    users.push(newUser);
    res.json({ success: true, message: 'تم التسجيل بنجاح' });
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
        req.session.user = { name: user.name, email: user.email };
        res.json({ success: true, message: `مرحباً ${user.name}` });
    } else {
        res.status(401).json({ error: 'البريد أو كلمة المرور غير صحيحة' });
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
    // حذف كلمات المرور من الاستجابة (اختياري)
    const safeUsers = users.map(({ password, ...rest }) => rest);
    res.json(safeUsers);
});

app.post('/api/admin/logout', (req, res) => {
    req.session.isAdmin = false;
    res.json({ success: true });
});

// ------------------- تقديم الصفحة الرئيسية -------------------
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => console.log(`✅ الخادم يعمل على المنفذ ${PORT}`));