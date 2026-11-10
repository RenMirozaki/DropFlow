const Auth = {
    current() { return Store.getSession(); },
    isAdmin() { const u = this.current(); return !!u && u.role === 'admin'; },
    isLoggedIn() { return !!this.current(); },

    login(loginOrEmail, password) {
        const users = Store.getUsers();
        const key = String(loginOrEmail).trim().toLowerCase();
        const user = users.find(u => u.login.toLowerCase() === key || (u.email && u.email.toLowerCase() === key));
        
        if (!user) return { ok: false, error: 'Пользователь не найден' };
        if (user.password !== password) return { ok: false, error: 'Неверный пароль' };

        const session = { login: user.login, name: user.name, email: user.email, phone: user.phone, role: user.role, loginAt: new Date().toISOString() };
        Store.setSession(session);
        
        if (user.role === 'admin') {
            sessionStorage.setItem('df_admin_logged', 'true');
        }
        return { ok: true, user: session };
    },

    register({ name, email, phone, login, password }) {
        if (!name || !email || !phone || !login || !password) return { ok: false, error: 'Заполните все поля' };
                // Проверка, что введено хотя бы Имя и Фамилия
        if (name.trim().split(/\s+/).length < 3) {
            return { ok: false, error: 'Пожалуйста, укажите ФИО (например: Иванов Иван Иванович).' };
        }
        if (password.length < 6) return { ok: false, error: 'Пароль минимум 6 символов' };

        const users = Store.getUsers();
        if (users.some(u => u.login.toLowerCase() === login.toLowerCase())) return { ok: false, error: 'Логин занят' };
        
        const newUser = { login, password, name, email, phone, role: 'user', createdAt: new Date().toISOString() };
        users.push(newUser);
        Store.setUsers(users);

        const session = { login: newUser.login, name: newUser.name, email: newUser.email, phone: newUser.phone, role: newUser.role, loginAt: new Date().toISOString() };
        Store.setSession(session);
        return { ok: true, user: session };
    },

    logout() { 
        Store.clearSession(); 
        sessionStorage.removeItem('df_admin_logged');
    }
};