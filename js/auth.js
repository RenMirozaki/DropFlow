// auth.js — DropFlow
const Auth = {
    // Текущий пользователь из сессии
    current() { return Store.getSession(); },
    isAdmin() { const u = this.current(); return !!u && u.role === 'admin'; },
    isLoggedIn() { return !!this.current(); },

    // Вход через сервер
    async login(loginOrEmail, password) {
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ login: loginOrEmail, password })
            });
            const data = await res.json();
            if (!data.success) return { ok: false, error: data.error || 'Ошибка входа' };

            const session = {
                token: data.token,
                login: data.user.login,
                name: data.user.name,
                email: data.user.email,
                phone: data.user.phone,
                role: data.user.role,
                loginAt: new Date().toISOString()
            };
            Store.setSession(session);
            return { ok: true, user: session };
        } catch (e) {
            console.error('Ошибка входа:', e);
            return { ok: false, error: 'Не удалось связаться с сервером' };
        }
    },

    // Регистрация через сервер
    async register({ name, email, phone, login, password }) {
        if (!name || !email || !phone || !login || !password) return { ok: false, error: 'Заполните все поля' };
        // Проверка, что введено ФИО (минимум 3 слова)
        if (name.trim().split(/\s+/).length < 3) {
            return { ok: false, error: 'Пожалуйста, укажите ФИО (например: Иванов Иван Иванович).' };
        }
        if (password.length < 6) return { ok: false, error: 'Пароль минимум 6 символов' };

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, phone, login, password })
            });
            const data = await res.json();
            if (!data.success) return { ok: false, error: data.error || 'Ошибка регистрации' };

            const session = {
                token: data.token,
                login: data.user.login,
                name: data.user.name,
                email: data.user.email,
                phone: data.user.phone,
                role: data.user.role,
                loginAt: new Date().toISOString()
            };
            Store.setSession(session);
            return { ok: true, user: session };
        } catch (e) {
            console.error('Ошибка регистрации:', e);
            return { ok: false, error: 'Не удалось связаться с сервером' };
        }
    },

    // Обновление данных пользователя с сервера (при загрузке страницы)
    async refresh() {
        if (!this.isLoggedIn()) return;
        try {
            const res = await fetch('/api/auth/me', { headers: Store.authHeaders() });
            if (res.status === 401) { this.logout(); return; }
            const data = await res.json();
            if (data.success) {
                const s = Store.getSession();
                Store.setSession(Object.assign({}, s, data.user));
            }
        } catch (e) { /* сервер недоступен — оставляем текущую сессию */ }
    },

    logout() {
        Store.clearSession();
        sessionStorage.removeItem('df_admin_logged');
    }
};
