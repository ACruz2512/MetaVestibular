(function () {
    var auth = window.MetaAuth;
    var error = document.getElementById("login-error");
    var forms = { login: document.getElementById("form-login"), register: document.getElementById("form-register") };
    var tabs = document.querySelectorAll(".login-tab");

    var themeButton = document.getElementById("login-theme-toggle");
    function isDark() {
        try { return JSON.parse(localStorage.getItem("metaVestibularTheme")) === "dark"; } catch (e) { return false; }
    }
    function applyTheme() {
        var dark = isDark();
        if (dark) document.documentElement.setAttribute("data-theme", "dark");
        else document.documentElement.removeAttribute("data-theme");
        themeButton.setAttribute("aria-pressed", String(dark));
        themeButton.setAttribute("aria-label", dark ? "Ativar modo claro" : "Ativar modo escuro");
        themeButton.title = dark ? "Ativar modo claro" : "Ativar modo escuro";
        themeButton.firstElementChild.className = dark ? "fa-solid fa-sun" : "fa-solid fa-moon";
    }
    themeButton.addEventListener("click", function () {
        try { localStorage.setItem("metaVestibularTheme", JSON.stringify(isDark() ? "light" : "dark")); } catch (e) {  }
        applyTheme();
    });
    applyTheme();

    function next() {
        var params = new URLSearchParams(window.location.search);
        return auth.safeNext(params.get("next"));
    }

    if (auth.user()) { window.location.replace(next()); return; }

    function showError(message) {
        error.textContent = message;
        error.hidden = !message;
    }

    function setMode(mode) {
        showError("");
        Object.keys(forms).forEach(function (name) { forms[name].hidden = name !== mode; });
        Array.prototype.forEach.call(tabs, function (tab) {
            var active = tab.getAttribute("data-mode") === mode;
            tab.classList.toggle("active", active);
            tab.setAttribute("aria-selected", String(active));
        });
        var first = forms[mode].querySelector("input");
        if (first) first.focus();
    }

    Array.prototype.forEach.call(tabs, function (tab) {
        tab.addEventListener("click", function () { setMode(tab.getAttribute("data-mode")); });
    });

    Array.prototype.forEach.call(document.querySelectorAll("[data-toggle-password]"), function (button) {
        button.addEventListener("click", function () {
            var input = document.getElementById(button.getAttribute("data-toggle-password"));
            var show = input.type === "password";
            input.type = show ? "text" : "password";
            button.setAttribute("aria-label", show ? "Ocultar senha" : "Mostrar senha");
            button.firstElementChild.className = show ? "fa-regular fa-eye-slash" : "fa-regular fa-eye";
        });
    });

    function submit(form, action) {
        form.addEventListener("submit", function (event) {
            event.preventDefault();
            showError("");
            var data = {
                name: form.elements.name ? form.elements.name.value : "",
                email: form.elements.email.value,
                password: form.elements.password.value,
                remember: form.elements.remember.checked
            };
            if (form.elements.confirm && form.elements.confirm.value !== data.password) {
                showError("As senhas não conferem.");
                return;
            }
            var button = form.querySelector(".login-submit");
            button.disabled = true;
            action(data).then(function () {
                window.location.replace(next());
            }).catch(function (err) {
                showError(err && err.message ? err.message : "Algo deu errado. Tente novamente.");
                button.disabled = false;
            });
        });
    }

    submit(forms.login, auth.login);
    submit(forms.register, auth.register);

    var params = new URLSearchParams(window.location.search);
    if (params.get("modo") === "cadastro") setMode("register");
    else forms.login.querySelector("input").focus();
})();
