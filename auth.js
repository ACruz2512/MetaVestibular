(function () {
    var USERS_KEY = "metaVestibularUsers";
    var SESSION_KEY = "metaVestibularSession";
    var LEGACY_KEYS = ["metaVestibularStudy", "metaVestibularFavorites", "metaVestibularSettings"];
    var ITERATIONS = 150000;

    function get(store, key) {
        try { return window[store].getItem(key); } catch (e) { return null; }
    }
    function set(store, key, value) {
        try { window[store].setItem(key, value); return true; } catch (e) { return false; }
    }
    function remove(store, key) {
        try { window[store].removeItem(key); } catch (e) {  }
    }

    function readUsers() {
        try {
            var parsed = JSON.parse(get("localStorage", USERS_KEY) || "{}");
            return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
        } catch (e) { return {}; }
    }
    function writeUsers(users) { return set("localStorage", USERS_KEY, JSON.stringify(users)); }

    function normalizeEmail(email) { return String(email || "").trim().toLowerCase(); }

    function currentEmail() {
        var email = get("sessionStorage", SESSION_KEY) || get("localStorage", SESSION_KEY);
        if (!email) return null;
        return readUsers()[email] ? email : null;
    }

    function currentUser() {
        var email = currentEmail();
        if (!email) return null;
        var user = readUsers()[email];
        return { email: email, name: user.name || email };
    }

    function startSession(email, remember) {
        remove("sessionStorage", SESSION_KEY);
        remove("localStorage", SESSION_KEY);
        return set(remember ? "localStorage" : "sessionStorage", SESSION_KEY, email);
    }

    function logout() {
        remove("sessionStorage", SESSION_KEY);
        remove("localStorage", SESSION_KEY);
        window.location.replace("login.html");
    }

    function toHex(buffer) {
        return Array.prototype.map.call(new Uint8Array(buffer), function (b) {
            return ("0" + b.toString(16)).slice(-2);
        }).join("");
    }

    function randomSalt() {
        var bytes = new Uint8Array(16);
        if (window.crypto && window.crypto.getRandomValues) {
            window.crypto.getRandomValues(bytes);
        } else {
            for (var i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
        }
        return toHex(bytes);
    }

    function fallbackHash(text) {
        var h1 = 0xdeadbeef, h2 = 0x41c6ce57;
        for (var round = 0; round < 2000; round++) {
            for (var i = 0; i < text.length; i++) {
                var c = text.charCodeAt(i);
                h1 = Math.imul(h1 ^ c, 2654435761);
                h2 = Math.imul(h2 ^ c, 1597334677);
            }
            h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
            h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
        }
        return (h2 >>> 0).toString(16) + (h1 >>> 0).toString(16);
    }

    function hashPassword(password, salt) {
        var subtle = window.crypto && window.crypto.subtle;
        if (!subtle) return Promise.resolve({ alg: "fallback", hash: fallbackHash(salt + password) });
        var encoder = new TextEncoder();
        return subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"])
            .then(function (key) {
                return subtle.deriveBits(
                    { name: "PBKDF2", salt: encoder.encode(salt), iterations: ITERATIONS, hash: "SHA-256" },
                    key, 256
                );
            })
            .then(function (bits) { return { alg: "pbkdf2", hash: toHex(bits) }; });
    }

    function key(name) {
        var email = currentEmail();
        return email ? name + ":" + email : name;
    }

    function register(data) {
        var name = String(data.name || "").trim().slice(0, 40);
        var email = normalizeEmail(data.email);
        var password = String(data.password || "");

        if (!name) return Promise.reject(new Error("Informe seu nome."));
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Promise.reject(new Error("Informe um e-mail válido."));
        if (password.length < 6) return Promise.reject(new Error("A senha precisa ter pelo menos 6 caracteres."));

        var users = readUsers();
        if (users[email]) return Promise.reject(new Error("Já existe uma conta com este e-mail. Entre ou use outro e-mail."));

        var salt = randomSalt();
        return hashPassword(password, salt).then(function (result) {
            var isFirstAccount = Object.keys(users).length === 0;
            users[email] = { name: name, salt: salt, alg: result.alg, hash: result.hash, createdAt: Date.now() };
            if (!writeUsers(users)) throw new Error("Não foi possível salvar a conta neste navegador. Verifique as permissões de armazenamento.");

            LEGACY_KEYS.forEach(function (legacy) {
                var value = get("localStorage", legacy);
                if (isFirstAccount && value !== null) set("localStorage", legacy + ":" + email, value);
            });

            var settingsKey = "metaVestibularSettings:" + email;
            var settings = {};
            try { settings = JSON.parse(get("localStorage", settingsKey) || "{}") || {}; } catch (e) { settings = {}; }
            if (!settings.name) {
                settings.name = name;
                set("localStorage", settingsKey, JSON.stringify(settings));
            }

            if (!startSession(email, !!data.remember)) throw new Error("Conta criada, mas não foi possível iniciar a sessão. Tente entrar.");
            return { email: email, name: name };
        });
    }

    function login(data) {
        var email = normalizeEmail(data.email);
        var user = readUsers()[email];
        var invalid = new Error("E-mail ou senha incorretos.");
        if (!user) return Promise.reject(invalid);

        return hashPassword(String(data.password || ""), user.salt).then(function (result) {
            if (result.alg !== user.alg || result.hash !== user.hash) throw invalid;
            if (!startSession(email, !!data.remember)) throw new Error("Não foi possível iniciar a sessão. Verifique as permissões de armazenamento.");
            return { email: email, name: user.name };
        });
    }

    function safeNext(value) {

        return /^[A-Za-z0-9_-]+\.html(?:[?#].*)?$/.test(value || "") ? value : "index.html";
    }

    window.MetaAuth = {
        user: currentUser,
        key: key,
        register: register,
        login: login,
        logout: logout,
        safeNext: safeNext
    };

    var page = window.location.pathname.split("/").pop() || "index.html";
    var onLogin = page === "login.html";
    var user = currentUser();

    if (!user && !onLogin) {
        document.documentElement.style.visibility = "hidden";
        window.location.replace("login.html?next=" + encodeURIComponent(page + window.location.search + window.location.hash));
        return;
    }

    if (user && !onLogin) {
        document.addEventListener("DOMContentLoaded", function () { setupProfileMenu(user); });
    }

    function readJson(name, fallback) {
        try { var v = JSON.parse(get("localStorage", key(name))); return v === null ? fallback : v; } catch (e) { return fallback; }
    }

    function todayKey() {
        var d = new Date();
        return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
    }

    function getStats(totalQuestions) {
        var study = readJson("metaVestibularStudy", {});
        var settings = readJson("metaVestibularSettings", {});
        var attempts = Array.isArray(study.attempts) ? study.attempts : [];
        var answers = study.answers && typeof study.answers === "object" ? study.answers : {};
        var correct = attempts.filter(function (a) { return a && a.correct === true; }).length;
        var goal = Number(settings.dailyGoal);
        goal = Number.isInteger(goal) ? Math.min(100, Math.max(1, goal)) : 10;
        var today = attempts.filter(function (a) { return a && a.date === todayKey(); }).length;
        return {
            name: typeof settings.name === "string" && settings.name.trim() ? settings.name.trim().slice(0, 40) : "",
            answered: Object.keys(answers).length,
            total: totalQuestions,
            accuracy: attempts.length ? Math.round((correct / attempts.length) * 100) : 0,
            attempts: attempts.length,
            today: today,
            goal: goal
        };
    }

    function processPhoto(file) {
        return new Promise(function (resolve, reject) {
            if (!file || !/^image\/(png|jpe?g|webp|gif)$/i.test(file.type)) {
                reject(new Error("Escolha uma imagem PNG, JPG, WEBP ou GIF."));
                return;
            }
            var url = URL.createObjectURL(file);
            var img = new Image();
            img.onload = function () {
                var size = 256, side = Math.min(img.width, img.height);
                var canvas = document.createElement("canvas");
                canvas.width = size;
                canvas.height = size;
                canvas.getContext("2d").drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
                URL.revokeObjectURL(url);
                resolve(canvas.toDataURL("image/jpeg", 0.85));
            };
            img.onerror = function () {
                URL.revokeObjectURL(url);
                reject(new Error("Não foi possível ler essa imagem."));
            };
            img.src = url;
        });
    }

    function el(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    }

    function initials(name) {
        var parts = String(name).trim().split(/\s+/).filter(Boolean);
        if (!parts.length) return "?";
        return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
    }

    function setupProfileMenu(user) {
        var actions = document.querySelector(".header-actions");
        var button = actions && actions.querySelector(".profile-btn");
        if (!button) return;

        var bell = actions.querySelector(".icon-btn");
        if (bell) bell.addEventListener("click", function () { window.location.href = "destaques.html"; });

        var totalHolder = document.querySelector("[data-total-questions]");
        var totalQuestions = totalHolder ? Number(totalHolder.getAttribute("data-total-questions")) || 90 : 90;

        var buttonImg = el("img", "profile-btn-img");
        buttonImg.alt = "";
        buttonImg.hidden = true;
        button.appendChild(buttonImg);
        button.setAttribute("aria-haspopup", "dialog");
        button.setAttribute("aria-expanded", "false");
        button.setAttribute("aria-label", "Abrir meu perfil");
        button.title = "Meu perfil";

        var panel = el("div", "profile-menu");
        panel.id = "profile-menu";
        panel.setAttribute("role", "dialog");
        panel.setAttribute("aria-label", "Meu perfil");
        panel.hidden = true;

        var top = el("div", "profile-menu-top");
        var avatarWrap = el("div", "profile-avatar-wrap");
        var avatar = el("div", "profile-avatar");
        var avatarImg = el("img");
        avatarImg.alt = "Sua foto de perfil";
        var avatarText = el("span", "profile-avatar-initials");
        avatar.appendChild(avatarImg);
        avatar.appendChild(avatarText);
        var camera = el("button", "profile-camera");
        camera.type = "button";
        camera.title = "Alterar foto";
        camera.setAttribute("aria-label", "Alterar foto de perfil");
        camera.innerHTML = '<i class="fa-solid fa-camera" aria-hidden="true"></i>';
        var file = el("input");
        file.type = "file";
        file.accept = "image/png,image/jpeg,image/webp,image/gif";
        file.hidden = true;
        avatarWrap.appendChild(avatar);
        avatarWrap.appendChild(camera);
        avatarWrap.appendChild(file);

        var who = el("div", "profile-who");
        var nameEl = el("strong", "profile-name");
        var emailEl = el("span", "profile-email", user.email);
        who.appendChild(nameEl);
        who.appendChild(emailEl);
        top.appendChild(avatarWrap);
        top.appendChild(who);

        var message = el("p", "profile-message");
        message.setAttribute("role", "status");
        message.hidden = true;

        var stats = el("div", "profile-stats");
        function stat(label) {
            var box = el("div", "profile-stat");
            var value = el("strong", "", "0");
            box.appendChild(value);
            box.appendChild(el("span", "", label));
            stats.appendChild(box);
            return value;
        }
        var answeredEl = stat("Respondidas");
        var accuracyEl = stat("Acertos");
        var streakEl = stat("Tentativas");

        var goal = el("div", "profile-goal");
        var goalLabel = el("div", "profile-goal-label");
        var goalTitle = el("span", "", "Meta de hoje");
        var goalCount = el("strong");
        goalLabel.appendChild(goalTitle);
        goalLabel.appendChild(goalCount);
        var track = el("div", "profile-goal-track");
        var fill = el("span");
        track.appendChild(fill);
        goal.appendChild(goalLabel);
        goal.appendChild(track);

        var links = el("div", "profile-links");
        function link(href, icon, text) {
            var a = el("a", "profile-link");
            a.href = href;
            a.innerHTML = '<i class="fa-solid ' + icon + '" aria-hidden="true"></i>';
            a.appendChild(el("span", "", text));
            links.appendChild(a);
        }
        link("progresso.html", "fa-chart-line", "Meu progresso");
        link("configuracoes.html", "fa-gear", "Configurações");

        var removePhoto = el("button", "profile-link");
        removePhoto.type = "button";
        removePhoto.innerHTML = '<i class="fa-regular fa-trash-can" aria-hidden="true"></i>';
        removePhoto.appendChild(el("span", "", "Remover foto"));
        links.appendChild(removePhoto);

        var logoutBtn = el("button", "profile-link profile-logout");
        logoutBtn.type = "button";
        logoutBtn.innerHTML = '<i class="fa-solid fa-right-from-bracket" aria-hidden="true"></i>';
        logoutBtn.appendChild(el("span", "", "Sair da conta"));

        panel.appendChild(top);
        panel.appendChild(message);
        panel.appendChild(stats);
        panel.appendChild(goal);
        panel.appendChild(links);
        panel.appendChild(logoutBtn);
        document.body.appendChild(panel);

        function showMessage(text) {
            message.textContent = text;
            message.hidden = !text;
        }

        function render() {
            var s = getStats(totalQuestions);
            var displayName = s.name || user.name;
            nameEl.textContent = displayName;
            avatarText.textContent = initials(displayName);
            answeredEl.textContent = s.answered + "/" + s.total;
            accuracyEl.textContent = s.accuracy + "%";
            streakEl.textContent = String(s.attempts);
            goalCount.textContent = Math.min(s.today, s.goal) + " / " + s.goal + " questões";
            fill.style.width = Math.min(100, Math.round((s.today / s.goal) * 100)) + "%";

            var photo = get("localStorage", key("metaVestibularAvatar"));
            avatarImg.hidden = buttonImg.hidden = !photo;
            avatarText.hidden = !!photo;
            removePhoto.hidden = !photo;
            button.classList.toggle("has-avatar", !!photo);
            if (photo) { avatarImg.src = photo; buttonImg.src = photo; }
            button.title = "Meu perfil (" + displayName + ")";
        }

        function position() {
            var rect = button.getBoundingClientRect();
            panel.style.top = Math.round(rect.bottom + 10) + "px";
            panel.style.right = Math.max(12, Math.round(window.innerWidth - rect.right)) + "px";
        }

        function open() {
            showMessage("");
            render();
            position();
            panel.hidden = false;
            button.setAttribute("aria-expanded", "true");
            camera.focus();
        }
        function close(returnFocus) {
            panel.hidden = true;
            button.setAttribute("aria-expanded", "false");
            if (returnFocus) button.focus();
        }

        button.addEventListener("click", function (event) {
            event.stopPropagation();
            if (panel.hidden) open(); else close(false);
        });
        document.addEventListener("click", function (event) {
            if (!panel.hidden && !panel.contains(event.target) && !button.contains(event.target)) close(false);
        });
        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape" && !panel.hidden) close(true);
        });
        window.addEventListener("resize", function () { if (!panel.hidden) position(); });
        window.addEventListener("scroll", function () { if (!panel.hidden) position(); }, true);

        camera.addEventListener("click", function () { file.click(); });
        avatar.addEventListener("click", function () { file.click(); });
        file.addEventListener("change", function () {
            var chosen = file.files && file.files[0];
            file.value = "";
            if (!chosen) return;
            processPhoto(chosen).then(function (dataUrl) {
                if (!set("localStorage", key("metaVestibularAvatar"), dataUrl)) throw new Error("Não foi possível salvar a foto neste navegador.");
                showMessage("Foto atualizada!");
                render();
            }).catch(function (err) { showMessage(err.message); });
        });
        removePhoto.addEventListener("click", function () {
            remove("localStorage", key("metaVestibularAvatar"));
            showMessage("Foto removida.");
            render();
        });
        logoutBtn.addEventListener("click", logout);

        render();
    }
})();
