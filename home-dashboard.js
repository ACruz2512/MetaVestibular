(function () {
  "use strict";
  var STORAGE_KEY = window.MetaAuth ? window.MetaAuth.key("metaVestibularStudy") : "metaVestibularStudy";
  var TOTAL_QUESTIONS = 90;

  function readStudy() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      var data = raw ? JSON.parse(raw) : {};
      return data && typeof data === "object" ? data : {};
    } catch (error) {
      console.warn("Não foi possível carregar o progresso salvo.", error);
      return {};
    }
  }

  function updateHomeProgress() {
    var study = readStudy();
    var answers = study.answers && typeof study.answers === "object" ? study.answers : {};
    var completed = Object.keys(answers).length;
    var total = Number(document.querySelector("[data-total-questions]")?.dataset.totalQuestions) || TOTAL_QUESTIONS;
    var bounded = Math.min(completed, total);
    var value = total ? Math.round((bounded / total) * 100) : 0;
    var ring = document.getElementById("home-progress-ring");
    var label = document.getElementById("home-progress-value");
    var bar = document.getElementById("home-progress-bar");
    var message = document.getElementById("home-progress-message");
    var count = document.getElementById("home-progress-count");

    if (ring) {
      ring.style.strokeDashoffset = String(251.2 * (1 - value / 100));
      ring.setAttribute("aria-valuenow", String(value));
      ring.setAttribute("aria-valuetext", value + "% concluído");
    }
    if (label) label.textContent = value + "%";
    if (bar) {
      bar.style.width = value + "%";
      bar.setAttribute("aria-valuenow", String(value));
    }
    if (count) count.textContent = bounded + " de " + total + " questões";
    if (message) {
      message.textContent = bounded
        ? "Você já respondeu " + bounded + " de " + total + " questões. Continue no seu ritmo!"
        : "Responda às questões para acompanhar seu progresso. Vamos em frente!";
    }
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function goTo(node, target, label) {
    node.setAttribute("role", "link");
    node.setAttribute("tabindex", "0");
    node.setAttribute("aria-label", label);
    node.addEventListener("click", function () { window.location.href = target; });
    node.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        window.location.href = target;
      }
    });
  }

  function renderActivities() {
    var list = document.getElementById("home-activities");
    if (!list) return;
    var bank = Array.isArray(window.metaQuestionBank) ? window.metaQuestionBank : [];
    var attempts = Array.isArray(readStudy().attempts) ? readStudy().attempts : [];
    var seen = {};
    var recent = [];
    for (var i = attempts.length - 1; i >= 0 && recent.length < 4; i--) {
      var attempt = attempts[i];
      if (!attempt || seen[attempt.id]) continue;
      seen[attempt.id] = true;
      recent.push(attempt);
    }

    list.textContent = "";
    if (!recent.length) {
      var empty = el("div", "activity-item activity-empty");
      var info = el("div", "activity-info");
      info.appendChild(el("h4", "", "Nenhuma atividade ainda"));
      info.appendChild(el("span", "", "Responda sua primeira questão e ela aparece aqui."));
      var cta = el("a", "btn-primary", "Começar a praticar");
      cta.href = "questoes.html";
      empty.appendChild(info);
      empty.appendChild(cta);
      list.appendChild(empty);
      return;
    }

    recent.forEach(function (attempt) {
      var question = bank.filter(function (q) { return q.id === attempt.id; })[0];

      var title = (question && question.title) || attempt.title || "Questão respondida";
      var rawSubject = (question && question.subject) || attempt.subject || "Questões";
      var subject = rawSubject.charAt(0).toUpperCase() + rawSubject.slice(1).toLowerCase();

      var item = el("div", "activity-item");
      var icon = el("div", "activity-icon");
      var iconEl = document.createElement("i");
      iconEl.setAttribute("data-lucide", "edit-3");
      icon.appendChild(iconEl);
      var info = el("div", "activity-info");
      info.appendChild(el("h4", "", title));
      info.appendChild(el("span", "", subject + (attempt.date ? " • " + attempt.date.split("-").reverse().slice(0, 2).join("/") : "")));
      var status = el("div", "activity-status");
      status.appendChild(el("span", attempt.correct ? "badge badge-mint" : "badge badge-miss", attempt.correct ? "Acertou" : "Errou"));
      var arrow = document.createElement("i");
      arrow.setAttribute("data-lucide", "arrow-right");
      arrow.className = "activity-arrow";
      item.appendChild(icon);
      item.appendChild(info);
      item.appendChild(status);
      item.appendChild(arrow);
      goTo(item, "questoes.html", "Abrir " + title);
      list.appendChild(item);
    });
  }

  function navigateFromCards() {
    var highlightTargets = ["questoes.html", "livros.html", "progresso.html"];
    document.querySelectorAll(".highlight-item").forEach(function (item, index) {
      var target = highlightTargets[index] || "destaques.html";
      item.setAttribute("role", "link");
      item.setAttribute("tabindex", "0");
      item.addEventListener("click", function () { window.location.href = target; });
      item.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          window.location.href = target;
        }
      });
    });

    var progressCard = document.querySelector(".progress-card");
    if (progressCard) {
      progressCard.setAttribute("role", "link");
      progressCard.setAttribute("tabindex", "0");
      progressCard.setAttribute("aria-label", "Abrir meu progresso completo");
      progressCard.addEventListener("click", function () { window.location.href = "progresso.html"; });
      progressCard.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          window.location.href = "progresso.html";
        }
      });
    }

  }

  function initializeIcons() {
    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons();
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    renderActivities();
    initializeIcons();
    updateHomeProgress();
    navigateFromCards();
  });
  window.addEventListener("storage", function () { updateHomeProgress(); renderActivities(); initializeIcons(); });
  window.addEventListener("pageshow", updateHomeProgress);
})();
