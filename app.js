(function(){
  "use strict";

  var NAV_TARGET = { inicio: "dashboard", estoque: "estoque", producao: "producao1", vendas: "vendas", mais: "mais" };
  var BACK_TARGET = { producao2: "producao1", clientes: "mais", custos: "mais", configuracoes: "mais", estoqueForm: "estoque", estoqueDetalhe: "estoque", estoqueMovimentar: "estoqueDetalhe", estoqueVelasAjustar: "estoque", producaoVariacao: "producao1", producaoLotes: "producao1", criarConta: "login", clienteForm: "clientes", clienteDetalhe: "clientes", vendaClientePicker: "vendas", vendaItemPicker: "vendas", vendaLotePicker: "vendas", custoFixoForm: "custos", cupomForm: "vendas", receitaItemForm: "configuracoes", variacaoForm: "configuracoes" };

  function screens(){ return document.querySelectorAll(".screen"); }

  var prefersReducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // No celular quem rola é a própria .screen; no layout de computador (style.css,
  // >=900px) é o .content interno que rola, com a .screen fixa — por isso ao trocar de
  // tela é preciso zerar os dois, senão no computador a tela reaparece rolada onde
  // ficou da última vez.
  function resetScroll(el){
    el.scrollTop = 0;
    var contentEl = el.querySelector(".content");
    if (contentEl) contentEl.scrollTop = 0;
  }

  function showScreen(name){
    var target = document.querySelector('.screen[data-screen="' + name + '"]');
    if (!target) return;
    var current = document.querySelector(".screen:not([hidden])");
    if (current === target) { resetScroll(target); return; }

    try { history.replaceState(null, "", "#" + name); } catch (e) {}

    if (prefersReducedMotion) {
      screens().forEach(function(el){ el.hidden = el !== target; });
      resetScroll(target);
      return;
    }

    // Crossfade: both screens sit on top of each other (.screen is position:absolute,
    // see style.css) for one transition window, then the outgoing one gets re-hidden.
    // .screen-enter/.screen-exit and the transition itself live in style.css.
    resetScroll(target);
    target.hidden = false;
    target.style.zIndex = "2";
    if (current) current.style.zIndex = "1";

    target.classList.add("screen-enter");
    void target.offsetWidth; // flush layout so the next class change actually transitions
    requestAnimationFrame(function(){
      target.classList.remove("screen-enter");
      if (current) current.classList.add("screen-exit");
    });

    window.setTimeout(function(){
      screens().forEach(function(el){
        if (el !== target) el.hidden = true;
        el.classList.remove("screen-exit");
        el.style.zIndex = "";
      });
    }, 220);
  }

  function currentScreen(){
    // During the brief crossfade window two screens can both lack [hidden] at once
    // (see showScreen) — the outgoing one is marked .screen-exit, so prefer whichever
    // visible screen ISN'T that to always report the one the user actually lands on.
    var visible = document.querySelector(".screen:not([hidden]):not(.screen-exit)") || document.querySelector(".screen:not([hidden])");
    return visible ? visible.dataset.screen : null;
  }

  function initFromHash(){
    var name = (location.hash || "").replace("#", "");
    if (name && document.querySelector('.screen[data-screen="' + name + '"]')) {
      showScreen(name);
    }
  }

  // ---------- Login / Conta — módulo 9 ----------
  // Conta local: e-mail e senha ficam salvos só neste navegador (sem backend/sync entre
  // aparelhos — foi uma escolha explícita, não uma limitação escondida). "Sair da conta"
  // encerra a sessão sem apagar os dados da loja, prontos pro próximo login.
  var CONTA_KEY = "pp_conta_v1";
  var SESSAO_KEY = "pp_sessao_v1";

  function loadContaState(){
    try {
      var raw = localStorage.getItem(CONTA_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed.criada === "boolean") return parsed;
      }
    } catch (e) {}
    return { criada: false, email: "", senha: "" };
  }
  function saveContaState(){
    try { localStorage.setItem(CONTA_KEY, JSON.stringify(contaState)); } catch (e) {}
  }
  function loadSessaoState(){
    try {
      var raw = localStorage.getItem(SESSAO_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed.logado === "boolean") return parsed;
      }
    } catch (e) {}
    return { logado: false };
  }
  function saveSessaoState(){
    try { localStorage.setItem(SESSAO_KEY, JSON.stringify(sessaoState)); } catch (e) {}
  }
  var contaState = loadContaState();
  var sessaoState = loadSessaoState();

  // ---------- Tema (modo escuro) ----------
  // A preferência já é aplicada por um script inline no <head> (antes deste arquivo
  // carregar, pra não piscar claro); aqui só mantemos o estado em JS e o switch em
  // Configurações sincronizados com o que foi salvo.
  var TEMA_KEY = "pp_tema_v1";
  function loadTema(){
    try { return localStorage.getItem(TEMA_KEY) === "escuro" ? "escuro" : "claro"; } catch (e) { return "claro"; }
  }
  function applyTema(tema){
    document.documentElement.setAttribute("data-theme", tema === "escuro" ? "dark" : "light");
  }
  var temaState = loadTema();
  applyTema(temaState);
  function setTema(tema){
    temaState = tema === "escuro" ? "escuro" : "claro";
    applyTema(temaState);
    try { localStorage.setItem(TEMA_KEY, temaState); } catch (e) {}
  }

  function submitSignup(){
    var email = document.getElementById("signupEmail").value.trim();
    var senha = document.getElementById("signupSenha").value;
    var senha2 = document.getElementById("signupSenhaConfirm").value;
    var errEl = document.getElementById("signupError");
    // Unhide before setting the text: role="alert" only gets announced by screen readers for
    // content that changes while the node is already exposed, not for a node that appears and
    // is filled in in the same breath.
    function fail(msg){ if (errEl) { errEl.hidden = false; errEl.textContent = msg; } }
    if (!email || email.indexOf("@") === -1) { fail("digite um e-mail válido."); return; }
    if (senha.length < 6) { fail("a senha precisa ter pelo menos 6 caracteres."); return; }
    if (senha !== senha2) { fail("as senhas não coincidem."); return; }
    if (errEl) errEl.hidden = true;
    contaState = { criada: true, email: email, senha: senha };
    saveContaState();
    sessaoState.logado = true;
    saveSessaoState();
    showScreen("dashboard");
  }

  function submitLogin(){
    var email = document.getElementById("loginEmail").value.trim();
    var senha = document.getElementById("loginSenha").value;
    var errEl = document.getElementById("loginError");
    if (!contaState.criada) {
      if (errEl) { errEl.hidden = false; errEl.textContent = "nenhuma conta encontrada neste aparelho — crie a conta da loja."; }
      return;
    }
    if (email.toLowerCase() !== contaState.email.toLowerCase() || senha !== contaState.senha) {
      if (errEl) { errEl.hidden = false; errEl.textContent = "e-mail ou senha incorretos."; }
      return;
    }
    if (errEl) errEl.hidden = true;
    sessaoState.logado = true;
    saveSessaoState();
    showScreen("dashboard");
  }

  function logout(){
    sessaoState.logado = false;
    saveSessaoState();
    showScreen("login");
  }

  function checkAuthAndInit(){
    if (contaState.criada && sessaoState.logado) {
      initFromHash();
      if (currentScreen() === "login" || !currentScreen()) showScreen("dashboard");
    } else {
      showScreen("login");
    }
  }

  // ---------- Estoque de insumos ----------
  var ESTOQUE_KEY = "pp_estoque_v1";
  var MESES = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];

  var DEFAULT_ESTOQUE_STATE = {
    insumos: [
      { id: "i1", nome: "Cera de soja", unidade: "kg", quantidade: 2.4, custoMedio: 28.10, minimo: 5 },
      { id: "i2", nome: "Essência Pera e Fresia", unidade: "ml", quantidade: 480, custoMedio: 0.19, minimo: 200 },
      { id: "i3", nome: "Essência Lavanda", unidade: "ml", quantidade: 310, custoMedio: 0.21, minimo: 200 },
      { id: "i4", nome: "Jarra 180 ml", unidade: "un", quantidade: 96, custoMedio: 4.80, minimo: 40 },
      { id: "i5", nome: "Pavio algodão", unidade: "un", quantidade: 210, custoMedio: 0.42, minimo: 200 }
    ],
    movimentacoes: [
      { id: "m1", insumoId: "i1", tipo: "entrada", quantidade: 10, valor: 281.00, data: "2026-08-22" },
      { id: "m2", insumoId: "i1", tipo: "saida", quantidade: 2.2, valor: 61.82, motivo: "Produção", data: "2026-08-15" },
      { id: "m3", insumoId: "i1", tipo: "entrada", quantidade: 5, valor: 142.50, data: "2026-08-02" },
      { id: "m4", insumoId: "i1", tipo: "saida", quantidade: 1.8, valor: 50.58, motivo: "Produção", data: "2026-07-20" }
    ]
  };

  var estoqueState = loadEstoqueState();
  var currentInsumoId = null;
  var currentMovTipo = "entrada";
  var formMode = "novo";
  var formEditingId = null;

  function loadEstoqueState(){
    try {
      var raw = localStorage.getItem(ESTOQUE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.insumos) && Array.isArray(parsed.movimentacoes)) return parsed;
      }
    } catch (e) {}
    return JSON.parse(JSON.stringify(DEFAULT_ESTOQUE_STATE));
  }

  function saveEstoqueState(){
    try { localStorage.setItem(ESTOQUE_KEY, JSON.stringify(estoqueState)); } catch (e) {}
  }

  function uid(prefix){ return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function round2(n){ return Math.round((n + Number.EPSILON) * 100) / 100; }

  function strToNum(s){
    if (typeof s !== "string" || !s.trim()) return 0;
    var n = parseFloat(s.replace(",", "."));
    return isFinite(n) ? n : 0;
  }
  function numToStr(n){
    var r = round2(n || 0);
    var s = r.toFixed(2);
    s = s.replace(/0+$/, "").replace(/\.$/, "");
    if (s.indexOf(".") !== -1) s = s.replace(".", ",");
    return s === "" || s === "-0" ? "0" : s;
  }
  function fmtQty(n, unidade){ return numToStr(n) + " " + unidade; }
  function fmtMoney(n){ return "R$ " + round2(n || 0).toFixed(2).replace(".", ","); }
  function fmtMoneyPerUnit(n, unidade){ return fmtMoney(n) + "/" + unidade; }
  function todayISO(){
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function formatDateBR(iso){
    var p = iso.split("-");
    return parseInt(p[2], 10) + " " + MESES[parseInt(p[1], 10) - 1] + " " + p[0];
  }
  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, function(c){
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  // Shared "you haven't created anything here yet" layout: icon circle, headline, one line
  // of guidance and (when there's somewhere useful to send the user) a single CTA button.
  // Reserved for true first-run empty states — a zero-result search/filter stays a plain
  // one-line message instead, so a quiet "no matches" doesn't get inflated into a fake dead end.
  // opts: { icon: <svg path/shape markup>, title, sub, ctaLabel?, ctaAttr? (e.g. 'data-action="x"') }
  function emptyStateHTML(opts){
    var cta = opts.ctaLabel ? '<button class="btn btn-ghost" ' + opts.ctaAttr + ' style="display:inline-flex;padding:10px 20px;margin-top:16px;">' + opts.ctaLabel + '</button>' : '';
    return '' +
      '<div class="emptystate">' +
        '<div class="emptystate-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + opts.icon + '</svg></div>' +
        '<div class="emptystate-title">' + opts.title + '</div>' +
        '<div class="emptystate-sub">' + opts.sub + '</div>' +
        cta +
      '</div>';
  }
  function findInsumo(id){
    for (var i = 0; i < estoqueState.insumos.length; i++) if (estoqueState.insumos[i].id === id) return estoqueState.insumos[i];
    return null;
  }

  // ---------- Configurações (receita padrão, jarra, derretimento) — módulo 8 ----------
  // receitaPadrao é uma lista de ingredientes por vela. Os 3 originais carregam um "papel"
  // (cera/essencia/pavio) que liga cada um a uma regra especial: cera sofre a perda de
  // derretimento e é dosada em g contra um insumo em kg; essência usa o insumo escolhido em
  // cada variação do catálogo (não um insumo fixo); os demais (pavio e itens novos) apontam
  // direto pra um insumo do Estoque. Itens sem papel são ingredientes livres, adicionados pelo
  // usuário — todos podem ser renomeados ou removidos em Configurações.
  var CONFIG_KEY = "pp_config_v1";
  var DEFAULT_CONFIG = {
    receitaPadrao: [
      { id: "r1", papel: "cera", nome: "Cera de soja", unidade: "g", insumoId: "i1", qtdPorVela: 150 },
      { id: "r2", papel: "essencia", nome: "Essência", unidade: "ml", insumoId: null, qtdPorVela: 7 },
      { id: "r3", papel: "pavio", nome: "Pavio", unidade: "un", insumoId: "i5", qtdPorVela: 1 }
    ],
    jarraCapacidadeMl: 180,
    perdaDerretimentoPct: 4,
    jarraInsumoId: "i4",
    avisoCanais: { push: true, email: false, whatsapp: false }
  };

  function migrateReceitaPadrao(parsed){
    // Formato antigo (antes da receita virar lista editável): objeto fixo com ceraG/essenciaMl/pavioUn
    // e os insumos de cera/pavio guardados soltos em ceraInsumoId/pavioInsumoId.
    var old = parsed.receitaPadrao;
    parsed.receitaPadrao = [
      { id: "r1", papel: "cera", nome: "Cera de soja", unidade: "g", insumoId: parsed.ceraInsumoId || "i1", qtdPorVela: old.ceraG },
      { id: "r2", papel: "essencia", nome: "Essência", unidade: "ml", insumoId: null, qtdPorVela: old.essenciaMl },
      { id: "r3", papel: "pavio", nome: "Pavio", unidade: "un", insumoId: parsed.pavioInsumoId || "i5", qtdPorVela: old.pavioUn }
    ];
    delete parsed.ceraInsumoId;
    delete parsed.pavioInsumoId;
    return parsed;
  }

  function loadConfigState(){
    try {
      var raw = localStorage.getItem(CONFIG_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.receitaPadrao) {
          if (!Array.isArray(parsed.receitaPadrao)) parsed = migrateReceitaPadrao(parsed);
          if (!parsed.avisoCanais) parsed.avisoCanais = JSON.parse(JSON.stringify(DEFAULT_CONFIG.avisoCanais));
          return parsed;
        }
      }
    } catch (e) {}
    return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  }
  function saveConfigState(){
    try { localStorage.setItem(CONFIG_KEY, JSON.stringify(configState)); } catch (e) {}
  }
  var configState = loadConfigState();

  // ---------- Catálogo de produtos (variações: cheiro + cor) — módulo 0 ----------
  // Adicionar, renomear e excluir variações é feito em Configurações (preço de venda por
  // variação); as demais telas (Estoque de Produção, Vendas, Cupom) só leem esses dados.
  var CATALOGO_KEY = "pp_catalogo_v1";
  var DEFAULT_CATALOGO = {
    variacoes: [
      { id: "v1", cheiro: "Pera e Fresia", cor: "âmbar", essenciaInsumoId: "i2", precoVenda: 79.00 },
      { id: "v2", cheiro: "Lavanda", cor: "fosco", essenciaInsumoId: "i3", precoVenda: 79.00 },
      { id: "v3", cheiro: "Pera e Fresia", cor: "fosco", essenciaInsumoId: "i2", precoVenda: 79.00 },
      { id: "v4", cheiro: "Lavanda", cor: "âmbar", essenciaInsumoId: "i3", precoVenda: 79.00 }
    ]
  };

  function loadCatalogoState(){
    try {
      var raw = localStorage.getItem(CATALOGO_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.variacoes) && parsed.variacoes.length) return parsed;
      }
    } catch (e) {}
    return JSON.parse(JSON.stringify(DEFAULT_CATALOGO));
  }
  function saveCatalogoState(){
    try { localStorage.setItem(CATALOGO_KEY, JSON.stringify(catalogoState)); } catch (e) {}
  }
  var catalogoState = loadCatalogoState();

  function findVariacao(id){
    for (var i = 0; i < catalogoState.variacoes.length; i++) if (catalogoState.variacoes[i].id === id) return catalogoState.variacoes[i];
    return null;
  }
  function variacaoLabel(v){ return v ? (v.cheiro + " · " + v.cor) : "—"; }

  function findReceitaItem(id){
    for (var i = 0; i < configState.receitaPadrao.length; i++) if (configState.receitaPadrao[i].id === id) return configState.receitaPadrao[i];
    return null;
  }

  // ---------- Estoque de produção (velas prontas, por variação do catálogo) ----------
  var PRODUCAO_ESTOQUE_KEY = "pp_estoque_producao_v1";
  var DEFAULT_PRODUCAO_ESTOQUE = {
    estoques: [
      { variacaoId: "v1", quantidade: 12, minimo: 10 },
      { variacaoId: "v2", quantidade: 5, minimo: 10 },
      { variacaoId: "v3", quantidade: 0, minimo: 10 },
      { variacaoId: "v4", quantidade: 0, minimo: 10 }
    ],
    movimentacoes: []
  };

  function loadProducaoEstoqueState(){
    try {
      var raw = localStorage.getItem(PRODUCAO_ESTOQUE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.estoques) && Array.isArray(parsed.movimentacoes)) return parsed;
      }
    } catch (e) {}
    return JSON.parse(JSON.stringify(DEFAULT_PRODUCAO_ESTOQUE));
  }
  function saveProducaoEstoqueState(){
    try { localStorage.setItem(PRODUCAO_ESTOQUE_KEY, JSON.stringify(producaoEstoqueState)); } catch (e) {}
  }
  var producaoEstoqueState = loadProducaoEstoqueState();
  var currentVelaVariacaoId = null;
  var velaMovTipo = "entrada";

  function findEstoqueVela(variacaoId){
    for (var i = 0; i < producaoEstoqueState.estoques.length; i++) if (producaoEstoqueState.estoques[i].variacaoId === variacaoId) return producaoEstoqueState.estoques[i];
    return null;
  }
  function qtdVela(variacaoId){
    var e = findEstoqueVela(variacaoId);
    return e ? e.quantidade : 0;
  }

  // ---------- Registro de produção (lotes) — módulo 6 ----------
  var LOTES_KEY = "pp_lotes_v1";
  var DEFAULT_LOTES = { lotes: [] };

  function loadLotesState(){
    try {
      var raw = localStorage.getItem(LOTES_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.lotes)) return parsed;
      }
    } catch (e) {}
    return JSON.parse(JSON.stringify(DEFAULT_LOTES));
  }
  function saveLotesState(){
    try { localStorage.setItem(LOTES_KEY, JSON.stringify(lotesState)); } catch (e) {}
  }
  var lotesState = loadLotesState();

  function findLote(id){
    for (var i = 0; i < lotesState.lotes.length; i++) if (lotesState.lotes[i].id === id) return lotesState.lotes[i];
    return null;
  }

  function velaRowHTML(v){
    var entry = findEstoqueVela(v.id);
    var qty = entry ? entry.quantidade : 0;
    var minimo = entry ? (entry.minimo || 0) : 0;
    var below = minimo > 0 && qty < minimo;
    var menuBtn = below ? '<div class="badge warn">abaixo do mínimo</div>' : "";
    var minTxt = minimo > 0 ? (" · mín " + numToStr(minimo) + " un") : "";
    return '' +
      '<div class="raised-sm" role="button" tabindex="0" aria-label="Ajustar estoque · ' + escapeHtml(variacaoLabel(v)) + '" data-vela-id="' + v.id + '" style="padding:15px 16px;margin-bottom:11px;cursor:pointer;">' +
        '<div class="between" style="margin-bottom:6px;">' +
          '<div style="font-size:14px;font-weight:600;">' + escapeHtml(v.cheiro) + ' · ' + escapeHtml(v.cor) + '</div>' +
          menuBtn +
        '</div>' +
        '<div class="between">' +
          '<div style="font-size:18px;font-weight:700;">' + numToStr(qty) + ' un</div>' +
          '<div style="font-size:11.5px;color:var(--text-faint);">' + minTxt.replace(/^ · /, "") + '</div>' +
        '</div>' +
      '</div>';
  }

  function renderVelasList(){
    var listEl = document.getElementById("estoqueVelasList");
    if (listEl) {
      listEl.innerHTML = catalogoState.variacoes.length ? catalogoState.variacoes.map(velaRowHTML).join("") : emptyStateHTML({
        icon: '<path d="M12 3c-3 4-5.2 6.4-5.2 9.4A5.2 5.2 0 0 0 12 21a5.2 5.2 0 0 0 5.2-5.2c0-1.2-.4-2.1-1.1-2.8.1 1-.3 2-1.1 2.5.4-2.1-1-3.6-3-6.5z"/>',
        title: "nenhuma variação no catálogo",
        sub: "variações de vela (cera, fragrância, cor) são cadastradas em Configurações.",
        ctaLabel: "ir para configurações",
        ctaAttr: 'data-goto="configuracoes"'
      });
    }
    var countEl = document.getElementById("estoqueVelasCount");
    if (countEl) {
      var n = catalogoState.variacoes.length;
      countEl.textContent = n + (n === 1 ? " variação" : " variações");
    }
  }

  function setEstoqueTab(tab){
    document.querySelectorAll('.screen[data-screen="estoque"] [data-esttab]').forEach(function(p){ p.classList.toggle("active", p.dataset.esttab === tab); p.setAttribute("aria-pressed", (p.dataset.esttab === tab) ? "true" : "false"); });
    var panelInsumos = document.getElementById("estoquePanelInsumos");
    var panelVelas = document.getElementById("estoquePanelVelas");
    var panelReposicao = document.getElementById("estoquePanelReposicao");
    var panelSoon = document.getElementById("estoquePanelSoon");
    var addBtn = document.getElementById("estoqueAddBtn");
    if (panelInsumos) panelInsumos.hidden = tab !== "insumos";
    if (panelVelas) panelVelas.hidden = tab !== "velas";
    if (panelReposicao) panelReposicao.hidden = tab !== "reposicao";
    if (panelSoon) panelSoon.hidden = tab !== "soon";
    if (addBtn) addBtn.hidden = tab !== "insumos";
    if (tab === "velas") renderVelasList();
    if (tab === "reposicao") renderReposicaoPanel();
  }

  function openVelasAjustar(variacaoId, tipo){
    var v = findVariacao(variacaoId);
    if (!v) return;
    currentVelaVariacaoId = variacaoId;
    var entry = findEstoqueVela(variacaoId);
    document.getElementById("velaMovCrumb").textContent = variacaoLabel(v);
    document.getElementById("velaMovQtd").value = "";
    document.getElementById("velaMovMinimo").value = entry && entry.minimo > 0 ? numToStr(entry.minimo) : "";
    document.getElementById("velaMovData").textContent = formatDateBR(todayISO());
    setVelaMotivoPill(tipo === "saida" ? "Venda" : "Produção");
    setVelaMovTipo(tipo || "entrada");
    showScreen("estoqueVelasAjustar");
  }

  function setVelaMovTipo(tipo){
    velaMovTipo = tipo;
    document.querySelectorAll('.screen[data-screen="estoqueVelasAjustar"] [data-velatipo]').forEach(function(p){ p.classList.toggle("active", p.dataset.velatipo === tipo); p.setAttribute("aria-pressed", (p.dataset.velatipo === tipo) ? "true" : "false"); });
    document.getElementById("velaMovSubmitBtn").textContent = tipo === "entrada" ? "Adicionar ao estoque" : "Remover do estoque";
    updateVelasPreview();
  }
  function setVelaMotivoPill(motivo){
    document.querySelectorAll('#velaMotivoPills [data-velamotivo]').forEach(function(p){ p.classList.toggle("active", p.dataset.velamotivo === motivo); p.setAttribute("aria-pressed", (p.dataset.velamotivo === motivo) ? "true" : "false"); });
  }
  function getVelaMotivoPill(){
    var active = document.querySelector('#velaMotivoPills .pill.active');
    return active ? active.dataset.velamotivo : "Produção";
  }
  function updateVelasPreview(){
    if (!currentVelaVariacaoId) return;
    var atual = qtdVela(currentVelaVariacaoId);
    var qtd = strToNum(document.getElementById("velaMovQtd").value);
    var warnEl = document.getElementById("velaMovWarning");
    var submitBtn = document.getElementById("velaMovSubmitBtn");
    warnEl.hidden = true;
    submitBtn.removeAttribute("disabled");
    var depois = velaMovTipo === "entrada" ? atual + (qtd > 0 ? qtd : 0) : atual - (qtd > 0 ? qtd : 0);
    if (velaMovTipo === "saida" && qtd > atual) {
      warnEl.hidden = false;
      warnEl.textContent = "quantidade maior que o estoque disponível (" + numToStr(atual) + " un)";
      submitBtn.setAttribute("disabled", "disabled");
    }
    document.getElementById("velaMovPreview").textContent = numToStr(atual) + " un → " + numToStr(Math.max(depois, 0)) + " un";
  }
  function submitVelasAjuste(){
    var qtd = strToNum(document.getElementById("velaMovQtd").value);
    var minimo = strToNum(document.getElementById("velaMovMinimo").value);
    var entry = findEstoqueVela(currentVelaVariacaoId);
    if (!entry) { entry = { variacaoId: currentVelaVariacaoId, quantidade: 0, minimo: 0 }; producaoEstoqueState.estoques.push(entry); }
    entry.minimo = round2(minimo);
    if (qtd > 0) {
      if (velaMovTipo === "entrada") {
        entry.quantidade = round2(entry.quantidade + qtd);
      } else {
        if (qtd > entry.quantidade) return;
        entry.quantidade = round2(Math.max(0, entry.quantidade - qtd));
      }
      producaoEstoqueState.movimentacoes.push({ id: uid("pm"), variacaoId: currentVelaVariacaoId, tipo: velaMovTipo, quantidade: round2(qtd), motivo: getVelaMotivoPill(), data: todayISO() });
    }
    saveProducaoEstoqueState();
    renderVelasList();
    refreshAvisos();
    showScreen("estoque");
  }

  // ---------- Configurações: formulário ----------
  function renderConfigForm(){
    var map = {
      cfgJarraCap: configState.jarraCapacidadeMl,
      cfgPerda: configState.perdaDerretimentoPct
    };
    Object.keys(map).forEach(function(id){
      var el = document.getElementById(id);
      if (el && document.activeElement !== el) el.value = numToStr(map[id]);
    });
    var canais = configState.avisoCanais || {};
    ["push", "email", "whatsapp"].forEach(function(c){
      var el = document.querySelector('[data-canal="' + c + '"]');
      if (el) setSwitchVisual(el, !!canais[c]);
    });
    var temaSwitch = document.querySelector('[data-tema-toggle]');
    if (temaSwitch) setSwitchVisual(temaSwitch, temaState === "escuro");
    renderReceitaPadrao();
    renderPrecoVariacoes();
  }

  function renderReceitaPadrao(){
    var listEl = document.getElementById("cfgReceitaList");
    if (!listEl) return;
    var itens = configState.receitaPadrao;
    listEl.innerHTML = itens.length ? itens.map(function(item, idx){
      var borderStyle = idx === itens.length - 1 ? "" : "border-bottom:1px solid var(--line);";
      return '<div class="between" data-receita-id="' + item.id + '" style="padding:11px 0;' + borderStyle + 'cursor:pointer;">' +
        '<span style="font-size:13.5px;">' + escapeHtml(item.nome) + '</span>' +
        '<span class="row" style="gap:4px;">' +
          '<input type="text" class="cfg-receita-input" data-receita-item-id="' + item.id + '" inputmode="decimal" value="' + numToStr(item.qtdPorVela) + '" style="width:56px;text-align:right;border:none;background:none;font-family:\'DM Sans\',sans-serif;font-size:13.5px;font-weight:600;color:var(--text-dim);padding:0;"/>' +
          '<span style="font-size:13.5px;font-weight:600;color:var(--text-dim);">' + escapeHtml(item.unidade) + '</span>' +
        '</span>' +
      '</div>';
    }).join("") : '<div style="text-align:center;color:var(--text-faint);font-size:12.5px;padding:14px 0;">nenhum ingrediente cadastrado ainda.</div>';
  }

  function renderPrecoVariacoes(){
    var listEl = document.getElementById("cfgPrecosList");
    if (!listEl) return;
    listEl.innerHTML = catalogoState.variacoes.length ? catalogoState.variacoes.map(function(v, idx){
      var borderStyle = idx === catalogoState.variacoes.length - 1 ? "" : "border-bottom:1px solid var(--line);";
      return '<div class="between" data-variacao-row-id="' + v.id + '" style="padding:11px 0;' + borderStyle + 'cursor:pointer;">' +
        '<span style="font-size:13.5px;">' + escapeHtml(variacaoLabel(v)) + '</span>' +
        '<span class="row" style="gap:4px;">' +
          '<span style="font-size:13.5px;font-weight:600;color:var(--text-dim);">R$</span>' +
          '<input type="text" class="cfg-preco-input" data-variacao-id="' + v.id + '" inputmode="decimal" value="' + numToStr(v.precoVenda) + '" style="width:64px;text-align:right;border:none;background:none;font-family:\'DM Sans\',sans-serif;font-size:13.5px;font-weight:600;color:var(--text-dim);padding:0;"/>' +
        '</span>' +
      '</div>';
    }).join("") : '<div style="text-align:center;color:var(--text-faint);font-size:12.5px;padding:14px 0;">nenhuma variação cadastrada ainda.</div>';
    var countEl = document.getElementById("cfgPrecosCount");
    if (countEl) { var n = catalogoState.variacoes.length; countEl.textContent = n + (n === 1 ? " item" : " itens"); }
  }
  function onConfigInput(id, value){
    var n = strToNum(value);
    if (id === "cfgJarraCap") configState.jarraCapacidadeMl = n;
    else if (id === "cfgPerda") configState.perdaDerretimentoPct = n;
    saveConfigState();
    renderCalcInsumos();
  }

  // ---------- Configurações: ingrediente da receita padrão (adicionar/renomear/excluir) ----------
  var CHECKMARK_SVG = '<span style="color:var(--primary);width:16px;height:16px;flex:none;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-9"/></svg></span>';

  var receitaItemFormMode = "novo";
  var receitaItemFormEditingId = null;
  var receitaItemFormInsumoId = null;

  function receitaInsumoPickRowHTML(insumo, selectedId){
    return '<div class="raised-sm" role="button" tabindex="0" data-pick-receita-insumo-id="' + insumo.id + '" style="padding:13px 15px;margin-bottom:9px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;">' +
      '<div style="font-size:13.5px;font-weight:600;">' + escapeHtml(insumo.nome) + '</div>' +
      (insumo.id === selectedId ? CHECKMARK_SVG : '') +
    '</div>';
  }

  function renderReceitaItemFormInsumoList(){
    var listEl = document.getElementById("receitaItemFormInsumoList");
    var emptyEl = document.getElementById("receitaItemFormInsumoEmpty");
    if (!listEl) return;
    listEl.innerHTML = estoqueState.insumos.map(function(i){ return receitaInsumoPickRowHTML(i, receitaItemFormInsumoId); }).join("");
    if (emptyEl) emptyEl.hidden = estoqueState.insumos.length > 0;
    var unidadeEl = document.getElementById("receitaItemFormUnidade");
    if (unidadeEl) {
      var insumo = findInsumo(receitaItemFormInsumoId);
      unidadeEl.textContent = insumo ? insumo.unidade : "—";
    }
  }

  function openReceitaItemForm(mode, id){
    receitaItemFormMode = mode;
    receitaItemFormEditingId = mode === "editar" ? id : null;
    var item = mode === "editar" ? findReceitaItem(id) : null;
    var papel = item ? item.papel : null;

    document.getElementById("receitaItemFormTitle").textContent = mode === "editar" ? "Editar ingrediente" : "Novo ingrediente";
    document.getElementById("receitaItemFormNome").value = item ? item.nome : "";
    document.getElementById("receitaItemFormQtd").value = item ? numToStr(item.qtdPorVela) : "";
    document.getElementById("receitaItemFormRemoveWrap").hidden = mode !== "editar";

    var insumoWrap = document.getElementById("receitaItemFormInsumoWrap");
    var hintEl = document.getElementById("receitaItemFormHint");
    if (papel === "cera") {
      insumoWrap.hidden = true;
      receitaItemFormInsumoId = item.insumoId;
      document.getElementById("receitaItemFormUnidade").textContent = "g";
      hintEl.textContent = "A quantidade é sempre em gramas por vela — entra no cálculo já com a perda de derretimento definida acima aplicada.";
    } else if (papel === "essencia") {
      insumoWrap.hidden = true;
      receitaItemFormInsumoId = null;
      document.getElementById("receitaItemFormUnidade").textContent = "ml";
      hintEl.textContent = "A essência usada é sempre a escolhida em cada variação do catálogo — aqui você só ajusta a quantidade padrão por vela.";
    } else {
      insumoWrap.hidden = false;
      receitaItemFormInsumoId = item ? item.insumoId : (estoqueState.insumos[0] ? estoqueState.insumos[0].id : null);
      hintEl.textContent = "Escolha de qual insumo do Estoque esse ingrediente é debitado ao registrar um lote.";
      renderReceitaItemFormInsumoList();
    }
    showScreen("receitaItemForm");
  }

  function submitReceitaItemForm(){
    var nomeEl = document.getElementById("receitaItemFormNome");
    var nome = nomeEl.value.trim();
    if (!nome) { nomeEl.focus(); return; }
    var qtd = strToNum(document.getElementById("receitaItemFormQtd").value);
    var item = receitaItemFormMode === "editar" ? findReceitaItem(receitaItemFormEditingId) : null;
    var papel = item ? item.papel : null;
    var precisaInsumo = papel !== "cera" && papel !== "essencia";

    if (precisaInsumo && !receitaItemFormInsumoId) return;

    if (item) {
      item.nome = nome;
      item.qtdPorVela = round2(qtd);
      if (precisaInsumo) {
        item.insumoId = receitaItemFormInsumoId;
        var insumo = findInsumo(receitaItemFormInsumoId);
        if (insumo) item.unidade = insumo.unidade;
      }
    } else {
      var novoInsumo = findInsumo(receitaItemFormInsumoId);
      configState.receitaPadrao.push({
        id: uid("r"),
        papel: null,
        nome: nome,
        unidade: novoInsumo ? novoInsumo.unidade : "un",
        insumoId: receitaItemFormInsumoId,
        qtdPorVela: round2(qtd)
      });
    }
    saveConfigState();
    renderReceitaPadrao();
    renderCalcInsumos();
    showScreen("configuracoes");
  }

  function removeReceitaItem(){
    if (!receitaItemFormEditingId) return;
    var item = findReceitaItem(receitaItemFormEditingId);
    if (!item) return;
    if (!window.confirm('Remover "' + item.nome + '" da receita padrão?')) return;
    configState.receitaPadrao = configState.receitaPadrao.filter(function(r){ return r.id !== receitaItemFormEditingId; });
    saveConfigState();
    renderReceitaPadrao();
    renderCalcInsumos();
    showScreen("configuracoes");
  }

  // ---------- Configurações: variação do catálogo (adicionar/renomear/excluir) ----------
  var variacaoFormMode = "novo";
  var variacaoFormEditingId = null;
  var variacaoFormEssenciaId = null;

  function renderVariacaoFormEssenciaList(){
    var listEl = document.getElementById("variacaoFormEssenciaList");
    if (!listEl) return;
    var nenhumaRow = '<div class="raised-sm" role="button" tabindex="0" data-pick-variacao-essencia-id="" style="padding:13px 15px;margin-bottom:9px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;">' +
      '<div style="font-size:13.5px;font-weight:600;color:var(--text-faint);">nenhuma</div>' +
      (!variacaoFormEssenciaId ? CHECKMARK_SVG : '') +
    '</div>';
    listEl.innerHTML = nenhumaRow + estoqueState.insumos.map(function(i){
      return '<div class="raised-sm" role="button" tabindex="0" data-pick-variacao-essencia-id="' + i.id + '" style="padding:13px 15px;margin-bottom:9px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;">' +
        '<div style="font-size:13.5px;font-weight:600;">' + escapeHtml(i.nome) + '</div>' +
        (i.id === variacaoFormEssenciaId ? CHECKMARK_SVG : '') +
      '</div>';
    }).join("");
  }

  function openVariacaoForm(mode, id){
    variacaoFormMode = mode;
    variacaoFormEditingId = mode === "editar" ? id : null;
    var v = mode === "editar" ? findVariacao(id) : null;

    document.getElementById("variacaoFormTitle").textContent = mode === "editar" ? "Editar variação" : "Nova variação";
    document.getElementById("variacaoFormCheiro").value = v ? v.cheiro : "";
    document.getElementById("variacaoFormCor").value = v ? v.cor : "";
    document.getElementById("variacaoFormPreco").value = v ? numToStr(v.precoVenda) : "";
    document.getElementById("variacaoFormRemoveWrap").hidden = mode !== "editar";
    variacaoFormEssenciaId = v ? (v.essenciaInsumoId || null) : null;
    renderVariacaoFormEssenciaList();
    showScreen("variacaoForm");
  }

  function submitVariacaoForm(){
    var cheiroEl = document.getElementById("variacaoFormCheiro");
    var corEl = document.getElementById("variacaoFormCor");
    var cheiro = cheiroEl.value.trim();
    var cor = corEl.value.trim();
    if (!cheiro) { cheiroEl.focus(); return; }
    if (!cor) { corEl.focus(); return; }
    var preco = strToNum(document.getElementById("variacaoFormPreco").value);

    if (variacaoFormMode === "editar") {
      var v = findVariacao(variacaoFormEditingId);
      if (!v) return;
      v.cheiro = cheiro;
      v.cor = cor;
      v.precoVenda = round2(preco);
      v.essenciaInsumoId = variacaoFormEssenciaId;
    } else {
      catalogoState.variacoes.push({ id: uid("v"), cheiro: cheiro, cor: cor, essenciaInsumoId: variacaoFormEssenciaId, precoVenda: round2(preco) });
    }
    saveCatalogoState();
    renderPrecoVariacoes();
    renderVelasList();
    renderCustos();
    if (!currentCalcVariacaoId) currentCalcVariacaoId = catalogoState.variacoes[0] ? catalogoState.variacoes[0].id : null;
    renderCalcInsumos();
    showScreen("configuracoes");
  }

  function removeVariacao(){
    if (!variacaoFormEditingId) return;
    if (catalogoState.variacoes.length <= 1) { window.alert("é preciso manter ao menos uma variação cadastrada."); return; }
    var v = findVariacao(variacaoFormEditingId);
    if (!v) return;
    if (!window.confirm('Remover "' + variacaoLabel(v) + '" e todo o estoque/histórico de velas prontas dela?')) return;
    var removedId = variacaoFormEditingId;
    catalogoState.variacoes = catalogoState.variacoes.filter(function(vv){ return vv.id !== removedId; });
    producaoEstoqueState.estoques = producaoEstoqueState.estoques.filter(function(e){ return e.variacaoId !== removedId; });
    producaoEstoqueState.movimentacoes = producaoEstoqueState.movimentacoes.filter(function(m){ return m.variacaoId !== removedId; });
    saveCatalogoState();
    saveProducaoEstoqueState();
    if (currentCalcVariacaoId === removedId) currentCalcVariacaoId = catalogoState.variacoes[0] ? catalogoState.variacoes[0].id : null;
    renderPrecoVariacoes();
    renderVelasList();
    renderCustos();
    refreshAvisos();
    renderCalcInsumos();
    showScreen("configuracoes");
  }

  function setSwitchVisual(el, on){
    el.setAttribute("aria-checked", on ? "true" : "false");
    var knob = el.firstElementChild;
    if (on) {
      el.style.background = "var(--primary)";
      if (knob) { knob.style.right = "3px"; knob.style.left = ""; }
    } else {
      el.style.background = "";
      if (knob) { knob.style.left = "3px"; knob.style.right = ""; }
    }
  }

  // ---------- Aviso de reposição (insumos + velas prontas abaixo do mínimo) — módulo 7 ----------
  function computeReposicaoItems(){
    var items = [];
    estoqueState.insumos.forEach(function(i){
      if (i.minimo > 0 && i.quantidade < i.minimo) {
        items.push({ tipo: "insumo", nome: i.nome, atual: i.quantidade, minimo: i.minimo, unidade: i.unidade, deficitPct: (i.minimo - i.quantidade) / i.minimo });
      }
    });
    producaoEstoqueState.estoques.forEach(function(e){
      var minimo = e.minimo || 0;
      if (minimo > 0 && e.quantidade < minimo) {
        var v = findVariacao(e.variacaoId);
        items.push({ tipo: "vela", nome: variacaoLabel(v), atual: e.quantidade, minimo: minimo, unidade: "un", deficitPct: (minimo - e.quantidade) / minimo });
      }
    });
    items.sort(function(a, b){ return b.deficitPct - a.deficitPct; });
    return items;
  }

  function reposicaoRowHTML(item){
    var tipoLabel = item.tipo === "insumo" ? "Insumo" : "Vela pronta";
    return '<div class="raised-sm" style="padding:15px 16px;margin-bottom:11px;">' +
      '<div class="between" style="margin-bottom:6px;">' +
        '<div style="font-size:14px;font-weight:600;">' + escapeHtml(item.nome) + '</div>' +
        '<div class="badge warn">' + tipoLabel + '</div>' +
      '</div>' +
      '<div class="between">' +
        '<div style="font-size:13.5px;color:var(--text-dim);">' + fmtQty(item.atual, item.unidade) + ' em estoque</div>' +
        '<div style="font-size:11.5px;color:var(--text-faint);">mín ' + fmtQty(item.minimo, item.unidade) + '</div>' +
      '</div>' +
    '</div>';
  }

  function renderReposicaoPanel(){
    var items = computeReposicaoItems();
    var listEl = document.getElementById("estoqueReposicaoList");
    if (listEl) listEl.innerHTML = items.length ? items.map(reposicaoRowHTML).join("") : '<div style="text-align:center;color:var(--text-faint);font-size:12.5px;padding:24px 0;">tudo certo — nada abaixo do mínimo.</div>';
    var countEl = document.getElementById("estoqueReposicaoCount");
    if (countEl) countEl.textContent = items.length + (items.length === 1 ? " item abaixo do mínimo" : " itens abaixo do mínimo");
    var statusEl = document.getElementById("reposicaoNotifyStatus");
    if (statusEl) statusEl.textContent = "";
  }

  function sendReposicaoNotification(){
    var items = computeReposicaoItems();
    var statusEl = document.getElementById("reposicaoNotifyStatus");
    if (!items.length) {
      if (statusEl) statusEl.textContent = "nada abaixo do mínimo agora — nenhum aviso necessário.";
      return;
    }
    var canais = configState.avisoCanais || {};
    var title = items.length + (items.length === 1 ? " item abaixo do mínimo" : " itens abaixo do mínimo");
    var lines = items.slice(0, 8).map(function(it){ return "- " + it.nome + ": " + fmtQty(it.atual, it.unidade) + " (mín " + fmtQty(it.minimo, it.unidade) + ")"; });
    if (items.length > 8) lines.push("...e mais " + (items.length - 8));
    var body = lines.join("\n");

    var sent = [];
    var blocked = [];
    if (canais.push) {
      if (!("Notification" in window)) {
        blocked.push("push (não suportado neste navegador)");
      } else if (Notification.permission === "granted") {
        new Notification(title, { body: body });
        sent.push("push");
      } else if (Notification.permission === "denied") {
        blocked.push("push (bloqueado nas permissões do navegador)");
      } else {
        Notification.requestPermission().then(function(p){ if (p === "granted") new Notification(title, { body: body }); });
        sent.push("push (pedindo permissão)");
      }
    }
    if (canais.email) {
      window.open("mailto:?subject=" + encodeURIComponent("Ateliê Parágrafo · " + title) + "&body=" + encodeURIComponent(body), "_blank");
      sent.push("e-mail");
    }
    if (canais.whatsapp) {
      window.open("https://wa.me/?text=" + encodeURIComponent(title + "\n\n" + body), "_blank");
      sent.push("WhatsApp");
    }
    if (statusEl) {
      if (!sent.length && !blocked.length) {
        statusEl.textContent = "nenhum canal ativo — ligue Push, E-mail ou WhatsApp em Configurações.";
      } else {
        var msg = sent.length ? ("aviso enviado por: " + sent.join(", ")) : "";
        if (blocked.length) msg += (msg ? " · " : "") + blocked.join(", ");
        statusEl.textContent = msg;
      }
    }
  }

  function renderDashboardAvisos(){
    var items = computeReposicaoItems();
    var badgeEl = document.getElementById("dashAvisosBadge");
    var btnEl = document.getElementById("dashAvisosBtn");
    var bannerEl = document.getElementById("dashUrgentBanner");
    var bannerTextEl = document.getElementById("dashUrgentText");
    var bannerMoreEl = document.getElementById("dashUrgentMore");
    if (badgeEl) {
      badgeEl.hidden = items.length === 0;
      badgeEl.textContent = items.length;
    }
    if (btnEl) btnEl.setAttribute("aria-label", "Avisos urgentes, " + items.length + " pendentes, em ordem de prioridade");
    if (bannerEl) {
      if (!items.length) {
        bannerEl.hidden = true;
      } else {
        bannerEl.hidden = false;
        var top = items[0];
        if (bannerTextEl) {
          bannerTextEl.textContent = top.tipo === "insumo"
            ? (top.nome + " tá acabando — melhor repor antes do próximo lote.")
            : (top.nome + " tá com poucas velas prontas — hora de produzir mais.");
        }
        var rest = items.length - 1;
        if (bannerMoreEl) {
          bannerMoreEl.hidden = rest <= 0;
          var countSpan = document.getElementById("dashUrgentMoreCount");
          if (countSpan) countSpan.textContent = rest > 0 ? ("+" + rest) : "";
        }
      }
    }
  }

  function refreshAvisos(){
    renderDashboardAvisos();
    renderReposicaoPanel();
    var badgeEl = document.getElementById("estReposicaoBadge");
    if (badgeEl) {
      var n = computeReposicaoItems().length;
      badgeEl.hidden = n === 0;
      badgeEl.textContent = n;
    }
  }

  // ---------- Calculadora de velas (Produção · módulo 4) ----------
  var currentCalcVariacaoId = catalogoState.variacoes.length ? catalogoState.variacoes[0].id : null;
  var currentCalcQty = 24;
  var calcAdjusting = false;
  var calcAdjustPct = {};

  // Fonte única de verdade dos totais do lote atual — usada pela lista de insumos,
  // pela calculadora de lucro e pelo registro de produção, pra não haver divergência entre elas.
  // Percorre a receita padrão (lista editável em Configurações) e resolve o insumo de cada linha:
  // cera sofre a perda de derretimento e converte g → kg contra o insumo; essência usa o insumo
  // escolhido na variação atual do catálogo; os demais (pavio e ingredientes livres) apontam
  // direto pro insumo salvo na própria linha da receita.
  function computeCalcTotals(){
    var variacao = findVariacao(currentCalcVariacaoId);
    var perda = configState.perdaDerretimentoPct || 0;
    var perdaMult = 1 + perda / 100; // a perda de derretimento só afeta a cera (resíduo na panela/forma)
    var qty = currentCalcQty;
    var ceraPerVelaG = 0, essPerVelaMl = 0;

    var itens = configState.receitaPadrao.map(function(item){
      var mult = 1 + (calcAdjustPct[item.id] || 0) / 100;
      var qtdPorVela = item.qtdPorVela * mult;
      var insumo, qtdTotal, unidade;
      if (item.papel === "cera") {
        qtdPorVela = qtdPorVela * perdaMult;
        ceraPerVelaG = qtdPorVela;
        insumo = findInsumo(item.insumoId);
        qtdTotal = round2((qtdPorVela * qty) / 1000); // g -> kg
        unidade = insumo ? insumo.unidade : "kg";
      } else if (item.papel === "essencia") {
        essPerVelaMl = qtdPorVela;
        insumo = findInsumo(variacao ? variacao.essenciaInsumoId : null);
        qtdTotal = round2(qtdPorVela * qty);
        unidade = insumo ? insumo.unidade : item.unidade;
      } else {
        insumo = findInsumo(item.insumoId);
        qtdTotal = round2(qtdPorVela * qty);
        unidade = insumo ? insumo.unidade : item.unidade;
      }
      return { id: item.id, insumo: insumo, nome: insumo ? insumo.nome : item.nome, unidade: unidade, qtd: qtdTotal, adjustable: item.papel !== "pavio" };
    });

    var jarraInsumo = findInsumo(configState.jarraInsumoId);
    itens.push({ id: "jarra", insumo: jarraInsumo, nome: jarraInsumo ? jarraInsumo.nome : "Jarra", unidade: jarraInsumo ? jarraInsumo.unidade : "un", qtd: round2(qty), adjustable: false });

    return { variacao: variacao, qty: qty, perda: perda, ceraPerVelaG: ceraPerVelaG, essPerVelaMl: essPerVelaMl, itens: itens };
  }

  function calcInsumoRowHTML(id, nome, totalQtd, unidade, insumo, adjustable){
    var disponivel = insumo ? insumo.quantidade : 0;
    var falta = totalQtd - disponivel;
    var subHTML = falta > 0.005
      ? '<div style="font-size:10.5px;color:var(--warn);">falta ' + numToStr(falta) + '</div>'
      : '<div style="font-size:10.5px;color:var(--text-faint);">tem ' + numToStr(disponivel) + '</div>';
    var adjustHTML = "";
    if (adjustable && calcAdjusting) {
      var pct = calcAdjustPct[id] || 0;
      adjustHTML = '<div style="margin-top:6px;"><span class="row" style="gap:4px;justify-content:flex-end;">' +
        '<input type="text" class="calc-adjust-input" data-insumo="' + id + '" inputmode="decimal" value="' + (pct === 0 ? "" : numToStr(pct)) + '" placeholder="0" style="width:44px;text-align:right;border:none;background:var(--bg);box-shadow:inset 2px 2px 5px var(--shadow-d),inset -2px -2px 5px var(--shadow-l);border-radius:8px;padding:4px 6px;font-family:\'DM Sans\',sans-serif;font-size:11.5px;color:var(--text);"/>' +
        '<span style="font-size:11px;color:var(--text-faint);">% neste lote</span></span></div>';
    }
    return '<div class="between" style="padding:12px 0;border-bottom:1px solid var(--line);align-items:flex-start;">' +
        '<div style="font-size:13.5px;font-weight:500;padding-top:2px;">' + escapeHtml(nome) + '</div>' +
        '<div style="text-align:right;">' +
          '<div style="font-size:13.5px;font-weight:700;">' + numToStr(totalQtd) + ' ' + unidade + '</div>' +
          subHTML +
          adjustHTML +
        '</div>' +
      '</div>';
  }

  function renderCalcInsumos(){
    var listEl = document.getElementById("calcInsumosList");
    if (!listEl) return;
    var totals = computeCalcTotals();

    var labelEl = document.getElementById("calcVariacaoLabel");
    if (labelEl) labelEl.textContent = variacaoLabel(totals.variacao);
    var qtyEl = document.getElementById("calcQtyOutput");
    if (qtyEl) qtyEl.textContent = totals.qty;

    listEl.innerHTML = totals.itens.map(function(it){
      return calcInsumoRowHTML(it.id, it.nome, it.qtd, it.unidade, it.insumo, it.adjustable);
    }).join("");

    var perdaLabelEl = document.getElementById("calcPerdaLabel");
    if (perdaLabelEl) perdaLabelEl.textContent = "perda " + numToStr(totals.perda) + "% inclusa";

    var capacidade = configState.jarraCapacidadeMl || 0;
    var volumePorJarraMl = round2(totals.ceraPerVelaG + totals.essPerVelaMl); // ~1 g de cera derretida ocupa ~1 ml
    var capEl = document.getElementById("calcCapacidadeInfo");
    if (capEl) {
      if (capacidade > 0 && volumePorJarraMl > capacidade) {
        capEl.textContent = "cada jarra recebe ~" + numToStr(volumePorJarraMl) + " ml da receita — excede a capacidade de " + numToStr(capacidade) + " ml definida em Configurações.";
        capEl.style.color = "var(--warn)";
      } else {
        capEl.textContent = "cada jarra (" + numToStr(capacidade) + " ml) recebe ~" + numToStr(volumePorJarraMl) + " ml da receita — dentro da capacidade.";
        capEl.style.color = "var(--text-faint)";
      }
    }

    var toggleBtn = document.getElementById("calcAdjustToggleBtn");
    if (toggleBtn) toggleBtn.textContent = calcAdjusting ? "Ocultar ajuste do lote" : "Ajustar só este lote";
  }

  // ---------- Calculadora de lucro (Produção · módulo 5) ----------
  function setText(id, text){
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function renderLucro(){
    var totals = computeCalcTotals();
    var variacao = totals.variacao;
    var custoTotal = 0;
    var insuficiente = false;
    totals.itens.forEach(function(it){
      if (it.insumo) {
        custoTotal += it.qtd * it.insumo.custoMedio;
        if (it.qtd > it.insumo.quantidade + 0.005) insuficiente = true;
      } else {
        insuficiente = true;
      }
    });
    var precoUnit = variacao ? variacao.precoVenda : 0;
    var receitaTotal = precoUnit * totals.qty;
    var margemBruta = receitaTotal - custoTotal;
    var margemPct = receitaTotal > 0 ? (margemBruta / receitaTotal * 100) : 0;

    setText("lucroCustoTotal", fmtMoney(custoTotal));
    setText("lucroReceitaLabel", "Preço de venda × " + totals.qty);
    setText("lucroReceitaTotal", fmtMoney(receitaTotal));
    setText("lucroMargemPct", numToStr(margemPct) + "%");
    setText("lucroCreditaTexto", "credita " + totals.qty + " velas prontas no Estoque de Produção");
    setText("lucroQuote", '"Lote de ' + variacaoLabel(variacao) + ' pronto: ' + totals.qty + ' velas na prateleira, cera e essência já descontadas."');

    var warnEl = document.getElementById("registrarLoteWarning");
    var btn = document.getElementById("registrarLoteBtn");
    if (warnEl && btn) {
      if (insuficiente) {
        warnEl.hidden = false;
        warnEl.textContent = "insumo insuficiente pra este lote — ajuste a quantidade, o ajuste do lote, ou reponha o estoque antes de registrar.";
        btn.setAttribute("disabled", "disabled");
      } else {
        warnEl.hidden = true;
        btn.removeAttribute("disabled");
      }
    }
  }

  // Registrar o lote: debita insumos, credita velas prontas no Estoque de Produção e gera
  // automaticamente uma entrada no Registro de Produção — não é um histórico separado.
  function registrarLote(){
    var totals = computeCalcTotals();
    var variacao = totals.variacao;
    if (!variacao) return;
    for (var i = 0; i < totals.itens.length; i++) {
      var it = totals.itens[i];
      if (!it.insumo || it.qtd > it.insumo.quantidade + 0.005) return;
    }

    var custoTotal = 0;
    var insumosUsados = [];
    totals.itens.forEach(function(it){
      it.insumo.quantidade = round2(it.insumo.quantidade - it.qtd);
      custoTotal += it.qtd * it.insumo.custoMedio;
      insumosUsados.push({ insumoId: it.insumo.id, nome: it.insumo.nome, quantidade: it.qtd, unidade: it.unidade });
    });
    saveEstoqueState();

    var velaEntry = findEstoqueVela(variacao.id);
    if (!velaEntry) { velaEntry = { variacaoId: variacao.id, quantidade: 0, minimo: 0 }; producaoEstoqueState.estoques.push(velaEntry); }
    velaEntry.quantidade = round2(velaEntry.quantidade + totals.qty);
    saveProducaoEstoqueState();

    var receitaTotal = variacao.precoVenda * totals.qty;
    lotesState.lotes.unshift({
      id: uid("l"),
      data: todayISO(),
      variacaoId: variacao.id,
      quantidade: totals.qty,
      custoTotal: round2(custoTotal),
      receitaTotal: round2(receitaTotal),
      insumosUsados: insumosUsados
    });
    saveLotesState();

    renderEstoqueList();
    renderVelasList();
    refreshAvisos();
    renderCustos();
    showScreen("producao1");
  }

  function renderVariacaoPicker(){
    var listEl = document.getElementById("calcVariacaoList");
    if (!listEl) return;
    listEl.innerHTML = catalogoState.variacoes.map(function(v){
      var selected = v.id === currentCalcVariacaoId;
      return '<div class="raised-sm" role="button" tabindex="0" data-pick-variacao-id="' + v.id + '" style="padding:15px 16px;margin-bottom:11px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;">' +
        '<div style="font-size:14px;font-weight:600;">' + escapeHtml(v.cheiro) + ' · ' + escapeHtml(v.cor) + '</div>' +
        (selected ? '<span style="color:var(--primary);width:16px;height:16px;flex:none;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-9"/></svg></span>' : '') +
      '</div>';
    }).join("");
  }

  function saveCalcAsDefault(){
    configState.receitaPadrao.forEach(function(item){
      var mult = 1 + (calcAdjustPct[item.id] || 0) / 100;
      if (mult !== 1) item.qtdPorVela = round2(item.qtdPorVela * mult);
    });
    saveConfigState();
    calcAdjustPct = {};
    renderConfigForm();
    renderCalcInsumos();
  }

  function loteRowHTML(lote){
    var v = findVariacao(lote.variacaoId);
    var margem = lote.receitaTotal > 0 ? round2((lote.receitaTotal - lote.custoTotal) / lote.receitaTotal * 100) : 0;
    var insumosTxt = lote.insumosUsados.map(function(iu){ return escapeHtml(iu.nome) + " " + numToStr(iu.quantidade) + iu.unidade; }).join(" · ");
    return '<div class="raised-sm" style="padding:15px 16px;margin-bottom:11px;">' +
      '<div class="between" style="margin-bottom:6px;align-items:flex-start;">' +
        '<div>' +
          '<div style="font-size:14px;font-weight:600;">' + escapeHtml(variacaoLabel(v)) + '</div>' +
          '<div style="font-size:11px;color:var(--text-faint);margin-top:2px;">' + formatDateBR(lote.data) + ' · ' + numToStr(lote.quantidade) + ' velas</div>' +
        '</div>' +
        '<div class="tapicon" role="button" aria-label="Excluir lote" data-action="lote-delete" data-lote-id="' + lote.id + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-8 0 1 12a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-12"/></svg></div>' +
      '</div>' +
      '<div class="between" style="padding-top:8px;border-top:1px solid var(--line);">' +
        '<div style="font-size:12px;color:var(--text-faint);">custo ' + fmtMoney(lote.custoTotal) + ' · margem ' + numToStr(margem) + '%</div>' +
      '</div>' +
      '<div style="font-size:11px;color:var(--text-faint);margin-top:6px;">' + insumosTxt + '</div>' +
    '</div>';
  }

  function renderLotesList(){
    var listEl = document.getElementById("lotesList");
    if (listEl) {
      listEl.innerHTML = lotesState.lotes.length ? lotesState.lotes.map(loteRowHTML).join("") : emptyStateHTML({
        icon: '<path d="M12 3c-3 4-5.2 6.4-5.2 9.4A5.2 5.2 0 0 0 12 21a5.2 5.2 0 0 0 5.2-5.2c0-1.2-.4-2.1-1.1-2.8.1 1-.3 2-1.1 2.5.4-2.1-1-3.6-3-6.5z"/>',
        title: "nenhum lote registrado ainda",
        sub: "registre um lote de produção pra debitar os insumos usados e creditar as velas prontas automaticamente.",
        ctaLabel: "ir para produção",
        ctaAttr: 'data-goto="producao1"'
      });
    }
    var countEl = document.getElementById("lotesCount");
    if (countEl) {
      var n = lotesState.lotes.length;
      countEl.textContent = n + (n === 1 ? " lote registrado" : " lotes registrados");
    }
  }

  // Excluir um lote reverte automaticamente o débito de insumos e o crédito de velas prontas,
  // pra não deixar o estoque desalinhado.
  function deleteLote(id){
    var lote = findLote(id);
    if (!lote) return;
    if (!window.confirm("Excluir este lote? Isso devolve os insumos debitados e remove as velas creditadas.")) return;
    lote.insumosUsados.forEach(function(iu){
      var insumo = findInsumo(iu.insumoId);
      if (insumo) insumo.quantidade = round2(insumo.quantidade + iu.quantidade);
    });
    saveEstoqueState();
    var velaEntry = findEstoqueVela(lote.variacaoId);
    if (velaEntry) velaEntry.quantidade = round2(Math.max(0, velaEntry.quantidade - lote.quantidade));
    saveProducaoEstoqueState();
    lotesState.lotes = lotesState.lotes.filter(function(l){ return l.id !== id; });
    saveLotesState();
    renderLotesList();
    renderEstoqueList();
    renderVelasList();
    refreshAvisos();
    renderCustos();
  }

  function csvEscape(v){
    var s = String(v);
    if (/[";\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
    return s;
  }
  function downloadBlob(content, mime, filename){
    var blob = new Blob([content], { type: mime });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
  }
  function exportLotesCSV(){
    var rows = [["Data", "Variação", "Quantidade", "Custo total", "Receita", "Margem bruta %", "Insumos usados"]];
    lotesState.lotes.forEach(function(l){
      var v = findVariacao(l.variacaoId);
      var margem = l.receitaTotal > 0 ? round2((l.receitaTotal - l.custoTotal) / l.receitaTotal * 100) : 0;
      var insumosTxt = l.insumosUsados.map(function(iu){ return iu.nome + " " + numToStr(iu.quantidade) + iu.unidade; }).join("; ");
      rows.push([formatDateBR(l.data), variacaoLabel(v), numToStr(l.quantidade), numToStr(l.custoTotal), numToStr(l.receitaTotal), numToStr(margem), insumosTxt]);
    });
    var csv = rows.map(function(r){ return r.map(csvEscape).join(";"); }).join("\r\n");
    downloadBlob("﻿" + csv, "text/csv;charset=utf-8", "registro-producao.csv");
  }

  // ---------- Controle de clientes — módulo 10 ----------
  var CLIENTES_KEY = "pp_clientes_v1";
  var DEFAULT_CLIENTES = {
    clientes: [
      { id: "c1", nome: "Ana Ribeiro", telefone: "(11) 9 8842-1130", email: "", endereco: "", numeroCompras: 14, totalGasto: 2310.00, criadoEm: "2026-01-10" },
      { id: "c2", nome: "Marina Costa", telefone: "", email: "", endereco: "", numeroCompras: 9, totalGasto: 1180.00, criadoEm: "2026-02-03" },
      { id: "c3", nome: "Júlia Menezes", telefone: "", email: "", endereco: "", numeroCompras: 6, totalGasto: 870.00, criadoEm: "2026-03-15" }
    ]
  };

  function loadClientesState(){
    try {
      var raw = localStorage.getItem(CLIENTES_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.clientes)) return parsed;
      }
    } catch (e) {}
    return JSON.parse(JSON.stringify(DEFAULT_CLIENTES));
  }
  function saveClientesState(){
    try { localStorage.setItem(CLIENTES_KEY, JSON.stringify(clientesState)); } catch (e) {}
  }
  var clientesState = loadClientesState();
  var clienteFormMode = "novo";
  var clienteFormEditingId = null;
  var currentClienteId = null;

  function findCliente(id){
    for (var i = 0; i < clientesState.clientes.length; i++) if (clientesState.clientes[i].id === id) return clientesState.clientes[i];
    return null;
  }

  // id de quem mais gastou no total — usado só pro selo "#1 do mês" no cartão em destaque
  function computeClienteTopId(){
    var top = null;
    clientesState.clientes.forEach(function(c){ if (!top || c.totalGasto > top.totalGasto) top = c; });
    return top ? top.id : null;
  }

  function clienteFeaturedHTML(c, isTop){
    var initial = c.nome.trim().charAt(0).toUpperCase() || "?";
    var ticket = c.numeroCompras > 0 ? (c.totalGasto / c.numeroCompras) : 0;
    return '<div class="raised card">' +
      '<div class="row" style="align-items:flex-start;margin-bottom:14px;">' +
        '<div class="raised-sm" style="width:48px;height:48px;border-radius:15px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;color:var(--primary);flex:none;">' + escapeHtml(initial) + '</div>' +
        '<div style="flex:1;">' +
          '<div class="between"><div style="font-size:15px;font-weight:700;">' + escapeHtml(c.nome) + ' <span style="font-weight:400;color:var(--text-faint);font-size:12px;">#' + c.id.slice(-4).toUpperCase() + '</span></div>' + (isTop ? '<div class="badge primary">#1 do mês</div>' : '') + '</div>' +
          (c.telefone ? '<div style="font-size:12px;color:var(--text-faint);margin-top:3px;">' + escapeHtml(c.telefone) + '</div>' : '') +
        '</div>' +
      '</div>' +
      '<div class="row" style="gap:24px;margin-bottom:14px;">' +
        '<div><div class="label" style="margin-bottom:4px;">compras</div><div style="font-size:18px;font-weight:700;">' + c.numeroCompras + '</div></div>' +
        '<div><div class="label" style="margin-bottom:4px;">gasto total</div><div style="font-size:18px;font-weight:700;">' + fmtMoney(c.totalGasto) + '</div></div>' +
      '</div>' +
      (c.numeroCompras > 0 ? '<div class="quote" style="font-size:14px;margin-bottom:14px;">"ticket médio de ' + fmtMoney(ticket) + ' por compra."</div>' : '') +
      '<div class="row" style="gap:10px;">' +
        '<button class="btn btn-ghost" data-action="cliente-detalhe" data-cliente-id="' + c.id + '" style="flex:1;">Histórico</button>' +
        '<button class="btn btn-ghost" data-action="cliente-editar" data-cliente-id="' + c.id + '" style="flex:1;">Editar</button>' +
      '</div>' +
    '</div>';
  }

  function clienteRowHTML(c){
    var initial = c.nome.trim().charAt(0).toUpperCase() || "?";
    return '<div class="row" role="button" tabindex="0" aria-label="Ver cliente · ' + escapeHtml(c.nome) + '" data-cliente-id="' + c.id + '" style="padding:13px 4px;border-bottom:1px solid var(--line);cursor:pointer;">' +
        '<div class="raised-sm" style="width:38px;height:38px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--primary);flex:none;">' + escapeHtml(initial) + '</div>' +
        '<div style="flex:1;"><div style="font-size:13.5px;font-weight:600;">' + escapeHtml(c.nome) + '</div><div style="font-size:11.5px;color:var(--text-faint);margin-top:2px;">' + c.numeroCompras + ' compras · ' + fmtMoney(c.totalGasto) + '</div></div>' +
        '<div style="color:var(--text-faint);width:14px;height:14px;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg></div>' +
      '</div>';
  }

  function renderClientesList(){
    var searchEl = document.getElementById("clientesSearchInput");
    var q = searchEl ? searchEl.value.trim().toLowerCase() : "";
    var filtroEl = document.querySelector('.screen[data-screen="clientes"] [data-clientefiltro].active');
    var filtroTipo = filtroEl ? filtroEl.dataset.clientefiltro : "todos";

    var list = clientesState.clientes.filter(function(c){
      return !q || c.nome.toLowerCase().indexOf(q) !== -1 || (c.telefone || "").toLowerCase().indexOf(q) !== -1;
    });
    list = list.slice();
    if (filtroTipo === "compras") list.sort(function(a, b){ return b.numeroCompras - a.numeroCompras; });
    else if (filtroTipo === "gasto") list.sort(function(a, b){ return b.totalGasto - a.totalGasto; });
    else list.sort(function(a, b){ return (b.criadoEm || "").localeCompare(a.criadoEm || ""); });

    var featuredEl = document.getElementById("clientesFeatured");
    var restEl = document.getElementById("clientesRestList");
    var emptyEl = document.getElementById("clientesEmpty");
    var countEl = document.getElementById("clientesCount");
    var n = clientesState.clientes.length;
    if (countEl) countEl.textContent = "todos os cadastros · " + n;

    if (!list.length) {
      if (featuredEl) featuredEl.innerHTML = "";
      if (restEl) restEl.innerHTML = "";
      if (emptyEl) {
        emptyEl.hidden = false;
        emptyEl.innerHTML = clientesState.clientes.length === 0 ? emptyStateHTML({
          icon: '<circle cx="12" cy="8" r="3.4"/><path d="M5 20c1-4 4-6 7-6s6 2 7 6"/>',
          title: "nenhum cliente cadastrado ainda",
          sub: "cadastre quem compra de você pra acompanhar histórico e ranking de compras.",
          ctaLabel: "cadastrar primeiro cliente",
          ctaAttr: 'data-action="cliente-add"'
        }) : '<div style="text-align:center;color:var(--text-faint);font-size:12.5px;padding:24px 0;">nenhum cliente encontrado</div>';
      }
      return;
    }
    if (emptyEl) emptyEl.hidden = true;
    var topId = computeClienteTopId();
    var featured = list[0];
    var rest = list.slice(1);
    if (featuredEl) featuredEl.innerHTML = clienteFeaturedHTML(featured, featured.id === topId);
    if (restEl) restEl.innerHTML = rest.map(clienteRowHTML).join("");
  }

  function openClienteForm(mode, id){
    clienteFormMode = mode;
    clienteFormEditingId = id || null;
    var isEdit = mode === "editar";
    setText("clienteFormTitle", isEdit ? "Editar cliente" : "Novo cliente");
    var removeWrap = document.getElementById("clienteFormRemoveWrap");
    if (removeWrap) removeWrap.hidden = !isEdit;
    var c = isEdit ? findCliente(id) : null;
    document.getElementById("clienteFormNome").value = c ? c.nome : "";
    document.getElementById("clienteFormTelefone").value = c ? (c.telefone || "") : "";
    document.getElementById("clienteFormEmail").value = c ? (c.email || "") : "";
    document.getElementById("clienteFormEndereco").value = c ? (c.endereco || "") : "";
    showScreen("clienteForm");
  }

  function submitClienteForm(){
    var nomeEl = document.getElementById("clienteFormNome");
    var nome = nomeEl.value.trim();
    if (!nome) { nomeEl.focus(); return; }
    var telefone = document.getElementById("clienteFormTelefone").value.trim();
    var email = document.getElementById("clienteFormEmail").value.trim();
    var endereco = document.getElementById("clienteFormEndereco").value.trim();
    if (clienteFormMode === "editar") {
      var c = findCliente(clienteFormEditingId);
      if (!c) return;
      c.nome = nome; c.telefone = telefone; c.email = email; c.endereco = endereco;
    } else {
      clientesState.clientes.push({ id: uid("c"), nome: nome, telefone: telefone, email: email, endereco: endereco, numeroCompras: 0, totalGasto: 0, criadoEm: todayISO() });
    }
    saveClientesState();
    renderClientesList();
    showScreen("clientes");
  }

  function removeCliente(){
    if (!clienteFormEditingId) return;
    var c = findCliente(clienteFormEditingId);
    if (!c) return;
    if (!window.confirm('Remover "' + c.nome + '" do cadastro de clientes?')) return;
    clientesState.clientes = clientesState.clientes.filter(function(x){ return x.id !== clienteFormEditingId; });
    saveClientesState();
    renderClientesList();
    showScreen("clientes");
  }

  function openClienteDetalhe(id){
    var c = findCliente(id);
    if (!c) return;
    currentClienteId = id;
    setText("clienteDetNome", c.nome);
    setText("clienteDetTelefone", c.telefone || "—");
    setText("clienteDetEmail", c.email || "—");
    setText("clienteDetEndereco", c.endereco || "—");
    setText("clienteDetCompras", c.numeroCompras);
    setText("clienteDetGasto", fmtMoney(c.totalGasto));
    setText("clienteDetTicket", c.numeroCompras > 0 ? fmtMoney(c.totalGasto / c.numeroCompras) : "—");
    setText("clienteDetDesde", formatDateBR(c.criadoEm));
    showScreen("clienteDetalhe");
  }

  // ---------- Controle de custos ----------
  // Custos fixos cadastráveis (aluguel, mão de obra, embalagem, taxas etc.). O custo real por
  // vela soma o custo médio de insumo (tirado dos lotes já registrados em Produção) com a fatia
  // rateada dos custos fixos, dividida pela produção mensal estimada. O lucro líquido real —
  // receita real do mês menos custo de insumo do mês menos os custos fixos cheios — é o número
  // que alimenta o card "lucro líquido real" do Dashboard.
  var CUSTOS_KEY = "pp_custos_v1";
  var DEFAULT_CUSTOS_STATE = {
    fixos: [
      { id: "cf1", nome: "Aluguel do ateliê", valor: 1400 },
      { id: "cf2", nome: "Mão de obra", valor: 1100 },
      { id: "cf3", nome: "Embalagem", valor: 320 },
      { id: "cf4", nome: "Taxas marketplace / cartão", valor: 360 }
    ],
    rateioBase: 40
  };

  function loadCustosState(){
    try {
      var raw = localStorage.getItem(CUSTOS_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.fixos)) {
          if (typeof parsed.rateioBase !== "number") parsed.rateioBase = DEFAULT_CUSTOS_STATE.rateioBase;
          return parsed;
        }
      }
    } catch (e) {}
    return JSON.parse(JSON.stringify(DEFAULT_CUSTOS_STATE));
  }
  function saveCustosState(){
    try { localStorage.setItem(CUSTOS_KEY, JSON.stringify(custosState)); } catch (e) {}
  }
  var custosState = loadCustosState();
  var custoFixoFormMode = "novo";
  var custoFixoFormEditingId = null;

  function findCustoFixo(id){
    for (var i = 0; i < custosState.fixos.length; i++) if (custosState.fixos[i].id === id) return custosState.fixos[i];
    return null;
  }

  function custoFixoTotal(){
    return round2(custosState.fixos.reduce(function(sum, c){ return sum + (c.valor || 0); }, 0));
  }

  // Custo médio de insumo por vela, com base em todos os lotes de produção já registrados —
  // é o mesmo custo debitado do estoque de insumos na hora de registrar cada lote.
  function custoInsumoPorVela(){
    var custoSoma = 0, qtdSoma = 0;
    lotesState.lotes.forEach(function(l){ custoSoma += l.custoTotal; qtdSoma += l.quantidade; });
    return qtdSoma > 0 ? (custoSoma / qtdSoma) : 0;
  }

  function custoFixoPorVela(){
    var base = custosState.rateioBase || 0;
    return base > 0 ? (custoFixoTotal() / base) : 0;
  }

  function custoRealPorVela(){
    return round2(custoInsumoPorVela() + custoFixoPorVela());
  }

  function precoVendaMedio(){
    if (!catalogoState.variacoes.length) return 0;
    var soma = catalogoState.variacoes.reduce(function(s, v){ return s + (v.precoVenda || 0); }, 0);
    return soma / catalogoState.variacoes.length;
  }

  function isThisMonth(iso){
    if (!iso) return false;
    var now = new Date();
    var ym = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
    return iso.indexOf(ym) === 0;
  }

  // Receita real: soma das vendas confirmadas do mês, já com desconto de cupom aplicado —
  // vendas canceladas/estornadas ficam de fora porque mudam de status pra "cancelada".
  function computeReceitaReal(){
    return round2(vendasState.vendas.filter(function(v){ return v.status === "confirmada" && isThisMonth(v.data); })
      .reduce(function(sum, v){ return sum + v.total; }, 0));
  }
  function computeTotalVendasBruto(){
    return round2(vendasState.vendas.filter(function(v){ return v.status === "confirmada" && isThisMonth(v.data); })
      .reduce(function(sum, v){ return sum + (typeof v.subtotal === "number" ? v.subtotal : v.total); }, 0));
  }
  function computeCustoInsumosMes(){
    return round2(lotesState.lotes.filter(function(l){ return isThisMonth(l.data); })
      .reduce(function(sum, l){ return sum + l.custoTotal; }, 0));
  }
  function computeLucroLiquidoReal(){
    return round2(computeReceitaReal() - computeCustoInsumosMes() - custoFixoTotal());
  }

  function custoFixoRowHTML(c, idx, arr){
    var border = idx === arr.length - 1 ? "" : "border-bottom:1px solid var(--line);";
    return '<div class="between" role="button" tabindex="0" aria-label="Editar ' + escapeHtml(c.nome) + '" data-custo-id="' + c.id + '" style="padding:10px 0;cursor:pointer;' + border + '">' +
        '<span style="font-size:13px;color:var(--text-dim);">' + escapeHtml(c.nome) + '</span>' +
        '<span style="font-size:13.5px;font-weight:600;">' + fmtMoney(c.valor) + '</span>' +
      '</div>';
  }

  function renderCustos(){
    var insumoPorVela = custoInsumoPorVela();
    var fixoPorVela = custoFixoPorVela();
    var custoTotal = insumoPorVela + fixoPorVela;
    var precoMedio = precoVendaMedio();
    var margem = precoMedio > 0 ? ((precoMedio - custoTotal) / precoMedio * 100) : 0;

    setText("custosQuote", '"Cada vela custa ' + fmtMoney(custoTotal) + ' pra sair da fôrma até a caixa — o resto é o seu respiro."');
    setText("custosPorVelaValor", fmtMoney(custoTotal));
    setText("custosInsumoValor", fmtMoney(insumoPorVela));
    setText("custosFixoRateadoValor", fmtMoney(fixoPorVela));
    var barInsumo = document.getElementById("custosBarInsumo");
    var barFixo = document.getElementById("custosBarFixo");
    if (barInsumo && barFixo) {
      barInsumo.style.flex = String(Math.max(insumoPorVela, 0.001));
      barFixo.style.flex = String(Math.max(fixoPorVela, 0.001));
    }
    setText("custosCompCusto", numToStr(custoTotal));
    setText("custosCompVenda", numToStr(precoMedio));
    setText("custosCompMargem", numToStr(margem) + "%");

    var rateioInput = document.getElementById("custosRateioInput");
    if (rateioInput && document.activeElement !== rateioInput) rateioInput.value = numToStr(custosState.rateioBase);

    setText("custosFixoTotal", fmtMoney(custoFixoTotal()));
    var listEl = document.getElementById("custosFixosList");
    var emptyEl = document.getElementById("custosFixosEmpty");
    if (listEl) listEl.innerHTML = custosState.fixos.map(custoFixoRowHTML).join("");
    if (emptyEl) emptyEl.hidden = custosState.fixos.length > 0;

    setText("custosLucroValor", fmtMoney(computeLucroLiquidoReal()));
    renderDashboardResumo();
  }

  function openCustoFixoForm(mode, id){
    custoFixoFormMode = mode;
    custoFixoFormEditingId = mode === "editar" ? id : null;
    setText("custoFixoFormTitle", mode === "editar" ? "Editar custo fixo" : "Novo custo fixo");
    var removeWrap = document.getElementById("custoFixoFormRemoveWrap");
    if (removeWrap) removeWrap.hidden = mode !== "editar";
    var c = mode === "editar" ? findCustoFixo(id) : null;
    document.getElementById("custoFixoFormNome").value = c ? c.nome : "";
    document.getElementById("custoFixoFormValor").value = c ? numToStr(c.valor) : "";
    showScreen("custoFixoForm");
  }

  function submitCustoFixoForm(){
    var nome = document.getElementById("custoFixoFormNome").value.trim();
    var valor = strToNum(document.getElementById("custoFixoFormValor").value);
    if (!nome) return;
    if (custoFixoFormMode === "editar" && custoFixoFormEditingId) {
      var c = findCustoFixo(custoFixoFormEditingId);
      if (c) { c.nome = nome; c.valor = round2(valor); }
    } else {
      custosState.fixos.push({ id: uid("cf"), nome: nome, valor: round2(valor) });
    }
    saveCustosState();
    renderCustos();
    showScreen("custos");
  }

  function removeCustoFixo(){
    if (!custoFixoFormEditingId) return;
    if (!window.confirm("Remover este custo fixo?")) return;
    custosState.fixos = custosState.fixos.filter(function(c){ return c.id !== custoFixoFormEditingId; });
    saveCustosState();
    renderCustos();
    showScreen("custos");
  }

  // ---------- Dashboard: resumo (lucro líquido real e receita real vêm de Custos/Cupom) ----------
  function renderDashboardResumo(){
    setText("dashTotalVendas", fmtMoney(computeTotalVendasBruto()));
    setText("dashReceitaReal", fmtMoney(computeReceitaReal()));
    setText("dashLucroLiquido", fmtMoney(computeLucroLiquidoReal()));
  }

  // ---------- Cadastro de cupom — sub-área de Controle de Vendas ----------
  // Cupons vivem no próprio estado, à parte das vendas. "Aplicar cupom" (dentro de Registrar
  // Venda) só lê e valida esta lista — o desconto nunca é digitado à mão na hora da venda.
  var CUPONS_KEY = "pp_cupons_v1";
  var DEFAULT_CUPONS_STATE = { cupons: [] };

  function loadCuponsState(){
    try {
      var raw = localStorage.getItem(CUPONS_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.cupons)) return parsed;
      }
    } catch (e) {}
    return JSON.parse(JSON.stringify(DEFAULT_CUPONS_STATE));
  }
  function saveCuponsState(){
    try { localStorage.setItem(CUPONS_KEY, JSON.stringify(cuponsState)); } catch (e) {}
  }
  var cuponsState = loadCuponsState();
  var cupomFormMode = "novo";
  var cupomFormEditingId = null;
  var cupomFormEscopoVariacaoId = null;
  var cupomFiltroAtual = "ativos";

  function findCupom(id){
    for (var i = 0; i < cuponsState.cupons.length; i++) if (cuponsState.cupons[i].id === id) return cuponsState.cupons[i];
    return null;
  }
  function findCupomByCodigo(codigo){
    var norm = (codigo || "").trim().toUpperCase();
    if (!norm) return null;
    for (var i = 0; i < cuponsState.cupons.length; i++) if (cuponsState.cupons[i].codigo === norm) return cuponsState.cupons[i];
    return null;
  }

  function cupomStatus(c){
    if (!c.ativo) return "desativado";
    var hoje = todayISO();
    if (c.dataValidade && hoje > c.dataValidade) return "expirado";
    if (c.limiteUso > 0 && (c.usosCount || 0) >= c.limiteUso) return "esgotado";
    if (c.dataInicio && hoje < c.dataInicio) return "agendado";
    return "ativo";
  }
  function cupomStatusLabel(status){
    return status === "ativo" ? "ativo" : status === "expirado" ? "expirado" : status === "esgotado" ? "esgotado" : status === "agendado" ? "agendado" : "pausado";
  }
  function cupomStatusBadgeClass(status){
    return status === "ativo" ? "good" : status === "agendado" ? "primary" : "warn";
  }
  function cupomDescricaoDesconto(c){
    return c.tipo === "percentual" ? ("−" + numToStr(c.valor) + "%") : ("−" + fmtMoney(c.valor));
  }

  function renderCupomList(){
    var list = cuponsState.cupons.filter(function(c){
      var status = cupomStatus(c);
      if (cupomFiltroAtual === "ativos") return status === "ativo" || status === "agendado";
      if (cupomFiltroAtual === "expirados") return status === "expirado";
      if (cupomFiltroAtual === "esgotados") return status === "esgotado";
      return true;
    });
    setText("cupomCount", list.length + (list.length === 1 ? " cupom" : " cupons"));
    var listEl = document.getElementById("cupomList");
    var emptyEl = document.getElementById("cupomEmpty");
    if (listEl) listEl.innerHTML = list.map(cupomRowHTML).join("");
    if (emptyEl) emptyEl.hidden = list.length > 0;
  }

  function cupomRowHTML(c){
    var status = cupomStatus(c);
    var escopoTxt = c.escopo === "todas" ? "todas as variações" : variacaoLabel(findVariacao(c.escopo));
    var limiteTxt = c.limiteUso > 0 ? ((c.usosCount || 0) + "/" + c.limiteUso + " usos") : ((c.usosCount || 0) + " usos · sem limite");
    return '<div class="raised-sm" role="button" tabindex="0" data-cupom-id="' + c.id + '" style="padding:15px 16px;margin-bottom:11px;cursor:pointer;">' +
        '<div class="between" style="margin-bottom:6px;">' +
          '<div style="font-size:14px;font-weight:700;">' + escapeHtml(c.codigo) + '</div>' +
          '<div class="badge ' + cupomStatusBadgeClass(status) + '">' + cupomStatusLabel(status) + '</div>' +
        '</div>' +
        '<div style="font-size:13px;color:var(--text-dim);margin-bottom:4px;">' + cupomDescricaoDesconto(c) + ' · ' + escapeHtml(escopoTxt) + '</div>' +
        '<div style="font-size:11.5px;color:var(--text-faint);">' + formatDateBR(c.dataInicio) + ' – ' + formatDateBR(c.dataValidade) + ' · ' + limiteTxt + '</div>' +
      '</div>';
  }

  function setCupomTipoPill(tipo){
    document.querySelectorAll('#cupomTipoPills [data-cupomtipo]').forEach(function(p){ p.classList.toggle("active", p.dataset.cupomtipo === tipo); p.setAttribute("aria-pressed", (p.dataset.cupomtipo === tipo) ? "true" : "false"); });
    var prefix = document.getElementById("cupomFormValorPrefix");
    if (prefix) prefix.textContent = tipo === "percentual" ? "%" : "R$";
  }
  function getCupomTipoPill(){
    var active = document.querySelector('#cupomTipoPills .pill.active');
    return active ? active.dataset.cupomtipo : "percentual";
  }
  function setCupomEscopoPill(escopo){
    document.querySelectorAll('#cupomEscopoPills [data-cupomescopo]').forEach(function(p){ p.classList.toggle("active", p.dataset.cupomescopo === escopo); p.setAttribute("aria-pressed", (p.dataset.cupomescopo === escopo) ? "true" : "false"); });
    var listWrap = document.getElementById("cupomEscopoVariacaoList");
    if (listWrap) {
      listWrap.hidden = escopo !== "especifica";
      if (escopo === "especifica") renderCupomEscopoVariacaoList();
    }
  }
  function getCupomEscopoPill(){
    var active = document.querySelector('#cupomEscopoPills .pill.active');
    return active ? active.dataset.cupomescopo : "todas";
  }
  function renderCupomEscopoVariacaoList(){
    var listEl = document.getElementById("cupomEscopoVariacaoList");
    if (!listEl) return;
    listEl.innerHTML = catalogoState.variacoes.map(function(v){
      var selected = v.id === cupomFormEscopoVariacaoId;
      return '<div class="raised-sm" role="button" tabindex="0" data-pick-cupom-escopo-id="' + v.id + '" style="padding:12px 14px;margin-bottom:9px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;">' +
        '<div style="font-size:13.5px;font-weight:600;">' + escapeHtml(v.cheiro) + ' · ' + escapeHtml(v.cor) + '</div>' +
        (selected ? CHECKMARK_SVG : '') +
      '</div>';
    }).join("");
  }
  function setCupomAtivoPill(v){
    document.querySelectorAll('#cupomAtivoPills [data-cupomativo]').forEach(function(p){ p.classList.toggle("active", p.dataset.cupomativo === v); p.setAttribute("aria-pressed", (p.dataset.cupomativo === v) ? "true" : "false"); });
  }
  function getCupomAtivoPill(){
    var active = document.querySelector('#cupomAtivoPills .pill.active');
    return active ? active.dataset.cupomativo === "1" : true;
  }

  function openCupomForm(mode, id){
    cupomFormMode = mode;
    cupomFormEditingId = mode === "editar" ? id : null;
    setText("cupomFormTitle", mode === "editar" ? "Editar cupom" : "Novo cupom");
    var removeWrap = document.getElementById("cupomFormRemoveWrap");
    if (removeWrap) removeWrap.hidden = mode !== "editar";
    var usoInfo = document.getElementById("cupomFormUsoInfo");
    var c = mode === "editar" ? findCupom(id) : null;

    document.getElementById("cupomFormCodigo").value = c ? c.codigo : "";
    setCupomTipoPill(c ? c.tipo : "percentual");
    document.getElementById("cupomFormValor").value = c ? numToStr(c.valor) : "";
    document.getElementById("cupomFormInicio").value = c ? c.dataInicio : todayISO();
    document.getElementById("cupomFormFim").value = c ? c.dataValidade : todayISO();
    document.getElementById("cupomFormLimite").value = c ? numToStr(c.limiteUso) : "0";
    cupomFormEscopoVariacaoId = (c && c.escopo !== "todas") ? c.escopo : (catalogoState.variacoes[0] ? catalogoState.variacoes[0].id : null);
    setCupomEscopoPill((c && c.escopo !== "todas") ? "especifica" : "todas");
    setCupomAtivoPill(c ? (c.ativo ? "1" : "0") : "1");

    if (usoInfo) {
      if (c) { usoInfo.hidden = false; usoInfo.textContent = "usado " + (c.usosCount || 0) + (c.limiteUso > 0 ? (" de " + c.limiteUso) : "") + " vez(es) até agora."; }
      else usoInfo.hidden = true;
    }
    showScreen("cupomForm");
  }

  function submitCupomForm(){
    var codigo = document.getElementById("cupomFormCodigo").value.trim().toUpperCase();
    if (!codigo) return;
    var tipo = getCupomTipoPill();
    var valor = strToNum(document.getElementById("cupomFormValor").value);
    var dataInicio = document.getElementById("cupomFormInicio").value || todayISO();
    var dataValidade = document.getElementById("cupomFormFim").value || todayISO();
    var limiteUso = Math.max(0, Math.round(strToNum(document.getElementById("cupomFormLimite").value)));
    var escopo = getCupomEscopoPill() === "especifica" ? cupomFormEscopoVariacaoId : "todas";
    var ativo = getCupomAtivoPill();

    var existing = findCupomByCodigo(codigo);
    if (existing && existing.id !== cupomFormEditingId) {
      window.alert("Já existe um cupom com esse código.");
      return;
    }

    if (cupomFormMode === "editar" && cupomFormEditingId) {
      var c = findCupom(cupomFormEditingId);
      if (c) {
        c.codigo = codigo; c.tipo = tipo; c.valor = round2(valor);
        c.dataInicio = dataInicio; c.dataValidade = dataValidade;
        c.limiteUso = limiteUso; c.escopo = escopo; c.ativo = ativo;
      }
    } else {
      cuponsState.cupons.unshift({
        id: uid("cp"), codigo: codigo, tipo: tipo, valor: round2(valor),
        dataInicio: dataInicio, dataValidade: dataValidade,
        limiteUso: limiteUso, usosCount: 0, escopo: escopo, ativo: ativo
      });
    }
    saveCuponsState();
    renderCupomList();
    showScreen("vendas");
    setVendasTab("cupons");
  }

  function removeCupom(){
    if (!cupomFormEditingId) return;
    if (!window.confirm("Remover este cupom?")) return;
    cuponsState.cupons = cuponsState.cupons.filter(function(c){ return c.id !== cupomFormEditingId; });
    saveCuponsState();
    renderCupomList();
    showScreen("vendas");
    setVendasTab("cupons");
  }

  // Validação do cupom digitado em Registrar Venda: confere data, uso disponível e escopo
  // contra o carrinho atual, e devolve o valor de desconto já calculado.
  function validarCupomParaCarrinho(codigo){
    var cupom = findCupomByCodigo(codigo);
    if (!cupom) return { ok: false, motivo: "cupom não encontrado." };
    if (!cupom.ativo) return { ok: false, motivo: "este cupom está pausado." };
    var hoje = todayISO();
    if (cupom.dataInicio && hoje < cupom.dataInicio) return { ok: false, motivo: "este cupom ainda não começou a valer." };
    if (cupom.dataValidade && hoje > cupom.dataValidade) return { ok: false, motivo: "este cupom expirou." };
    if (cupom.limiteUso > 0 && (cupom.usosCount || 0) >= cupom.limiteUso) return { ok: false, motivo: "este cupom esgotou o limite de uso." };

    var baseSubtotal;
    if (cupom.escopo === "todas") {
      baseSubtotal = computeVendaTotal();
    } else {
      baseSubtotal = vendaCarrinho.filter(function(it){ return it.variacaoId === cupom.escopo; })
        .reduce(function(sum, it){ return sum + it.quantidade * it.precoUnit; }, 0);
      if (baseSubtotal <= 0) return { ok: false, motivo: "este cupom só vale pra " + variacaoLabel(findVariacao(cupom.escopo)) + " — adicione essa variação ao carrinho." };
    }
    var desconto = cupom.tipo === "percentual" ? (baseSubtotal * cupom.valor / 100) : cupom.valor;
    desconto = Math.min(round2(desconto), round2(baseSubtotal));
    return { ok: true, cupom: cupom, desconto: desconto };
  }

  // ---------- Controle de vendas — módulo 11 ----------
  // Vendas confirmadas e encomendas em aberto vivem no mesmo estado, separadas em duas listas.
  // Uma encomenda nunca debita o Estoque de Produção sozinha — só quando é marcada como entregue,
  // momento em que vira de fato uma venda (com origemEncomendaId apontando pra ela).
  var VENDAS_KEY = "pp_vendas_v1";
  var DEFAULT_VENDAS_STATE = { vendas: [], encomendas: [] };

  function loadVendasState(){
    try {
      var raw = localStorage.getItem(VENDAS_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.vendas) && Array.isArray(parsed.encomendas)) return parsed;
      }
    } catch (e) {}
    return JSON.parse(JSON.stringify(DEFAULT_VENDAS_STATE));
  }
  function saveVendasState(){
    try { localStorage.setItem(VENDAS_KEY, JSON.stringify(vendasState)); } catch (e) {}
  }
  var vendasState = loadVendasState();

  function findVenda(id){
    for (var i = 0; i < vendasState.vendas.length; i++) if (vendasState.vendas[i].id === id) return vendasState.vendas[i];
    return null;
  }
  function findEncomenda(id){
    for (var i = 0; i < vendasState.encomendas.length; i++) if (vendasState.encomendas[i].id === id) return vendasState.encomendas[i];
    return null;
  }

  // carrinho da "Nova venda" — só em memória, como as calculadoras de Produção
  var vendaCarrinho = [];
  var vendaClienteIdSel = null;
  var vendaItemEditIndex = -1; // -1 = adicionando item novo; >=0 = editando essa linha do carrinho
  var vendaItemPickVariacaoId = null;
  var vendaEncomendaFiltro = "abertas";
  var vendaHistPeriodo = "7";
  var vendaHistVariacaoFiltro = "todas";
  var currentEncomendaLoteTargetId = null;

  var CHECKMARK_SVG = '<span style="color:var(--primary);width:16px;height:16px;flex:none;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-9"/></svg></span>';

  function clienteLabelFor(id){
    if (!id) return "Cliente avulso";
    var c = findCliente(id);
    return c ? c.nome : "Cliente avulso";
  }

  function getVendaPagamentoPill(){
    var active = document.querySelector('#vendaPagamentoPills .pill.active');
    return active ? active.dataset.vendapag : "Pix";
  }
  function setVendaPagamentoPill(v){
    document.querySelectorAll('#vendaPagamentoPills [data-vendapag]').forEach(function(p){ p.classList.toggle("active", p.dataset.vendapag === v); p.setAttribute("aria-pressed", (p.dataset.vendapag === v) ? "true" : "false"); });
  }

  function computeVendaTotal(){
    return round2(vendaCarrinho.reduce(function(sum, it){ return sum + it.quantidade * it.precoUnit; }, 0));
  }

  function vendaItemRowHTML(item, idx){
    var v = findVariacao(item.variacaoId);
    var precoTabela = v ? v.precoVenda : item.precoUnit;
    var editedTxt = Math.abs(item.precoUnit - precoTabela) > 0.005
      ? ' <span style="color:var(--primary);">editado de ' + fmtMoney(precoTabela) + '</span>'
      : '';
    var totalLinha = round2(item.quantidade * item.precoUnit);
    return '<div class="between" style="padding:8px 0;border-bottom:1px solid var(--line);">' +
        '<div><div style="font-size:13.5px;font-weight:600;">' + escapeHtml(variacaoLabel(v)) + '</div>' +
        '<div style="font-size:11.5px;color:var(--text-faint);margin-top:2px;">' + numToStr(item.quantidade) + ' un × ' + fmtMoney(item.precoUnit) + editedTxt + '</div></div>' +
        '<div class="row" style="gap:6px;">' +
          '<div style="font-size:14px;font-weight:700;">' + fmtMoney(totalLinha) + '</div>' +
          '<div class="tapicon" role="button" aria-label="Editar item" data-action="venda-item-edit" data-item-idx="' + idx + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg></div>' +
          '<div class="tapicon" role="button" aria-label="Remover item" data-action="venda-item-remove-row" data-item-idx="' + idx + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></div>' +
        '</div>' +
      '</div>';
  }

  // Lê e valida, ao vivo, o que está digitado no campo de cupom — sem estado próprio de
  // "aplicado": o texto do campo É a fonte da verdade, revalidada a cada render.
  function vendaCupomValidacaoAtual(){
    var el = document.getElementById("vendaCupomInput");
    var codigo = el ? el.value.trim() : "";
    if (!codigo) return null;
    return validarCupomParaCarrinho(codigo);
  }

  function renderVendaNova(){
    setText("vendaClienteLabel", clienteLabelFor(vendaClienteIdSel));
    var listEl = document.getElementById("vendaItensList");
    var emptyEl = document.getElementById("vendaItensEmpty");
    if (listEl) listEl.innerHTML = vendaCarrinho.map(vendaItemRowHTML).join("");
    if (emptyEl) emptyEl.hidden = vendaCarrinho.length > 0;
    setText("vendaDataLabel", formatDateBR(todayISO()));

    var subtotal = computeVendaTotal();
    var validacao = vendaCupomValidacaoAtual();
    var desconto = (validacao && validacao.ok) ? validacao.desconto : 0;
    var totalFinal = round2(Math.max(0, subtotal - desconto));
    setText("vendaTotalLabel", fmtMoney(totalFinal));

    var statusEl = document.getElementById("vendaCupomStatus");
    var hintEl = document.getElementById("vendaCupomHint");
    if (statusEl && hintEl) {
      if (!validacao) {
        statusEl.innerHTML = "";
        hintEl.style.color = "var(--text-faint)";
        hintEl.textContent = "Validado por data e uso disponível — o valor recalcula sozinho.";
      } else if (validacao.ok) {
        statusEl.innerHTML = '<div class="badge good">válido</div>';
        hintEl.style.color = "var(--good)";
        hintEl.textContent = "Cupom " + validacao.cupom.codigo + " aplicado (" + cupomDescricaoDesconto(validacao.cupom) + ").";
      } else {
        statusEl.innerHTML = '<div class="badge warn">inválido</div>';
        hintEl.style.color = "var(--warn)";
        hintEl.textContent = validacao.motivo;
      }
    }

    var subtotalRow = document.getElementById("vendaSubtotalRow");
    var descontoRow = document.getElementById("vendaDescontoRow");
    var totalDivider = document.getElementById("vendaTotalDivider");
    var showBreak = desconto > 0;
    if (subtotalRow) subtotalRow.hidden = !showBreak;
    if (descontoRow) descontoRow.hidden = !showBreak;
    if (totalDivider) totalDivider.hidden = !showBreak;
    if (showBreak) {
      setText("vendaSubtotalLabel", fmtMoney(subtotal));
      setText("vendaDescontoLabel", "Cupom " + validacao.cupom.codigo + " (" + cupomDescricaoDesconto(validacao.cupom) + ")");
      setText("vendaDescontoValor", "− " + fmtMoney(desconto));
    }

    var warnEl = document.getElementById("vendaWarning");
    var confirmBtn = document.getElementById("vendaConfirmarBtn");
    if (!warnEl || !confirmBtn) return;
    var semItens = vendaCarrinho.length === 0;
    var insuficiente = vendaCarrinho.some(function(it){ return it.quantidade > qtdVela(it.variacaoId) + 0.005; });
    if (semItens) {
      warnEl.hidden = true;
      confirmBtn.setAttribute("disabled", "disabled");
    } else if (insuficiente) {
      warnEl.hidden = false;
      warnEl.textContent = "estoque de produção insuficiente pra confirmar esta venda agora — salve como encomenda ou ajuste os itens.";
      confirmBtn.setAttribute("disabled", "disabled");
    } else {
      warnEl.hidden = true;
      confirmBtn.removeAttribute("disabled");
    }
  }

  function openVendaClientePicker(){
    var searchEl = document.getElementById("vendaClienteSearchInput");
    if (searchEl) searchEl.value = "";
    renderVendaClientePickerList();
    showScreen("vendaClientePicker");
  }

  function renderVendaClientePickerList(){
    var searchEl = document.getElementById("vendaClienteSearchInput");
    var q = searchEl ? searchEl.value.trim().toLowerCase() : "";
    var list = clientesState.clientes.filter(function(c){ return !q || c.nome.toLowerCase().indexOf(q) !== -1; });
    var listEl = document.getElementById("vendaClientePickerList");
    if (listEl) listEl.innerHTML = list.map(function(c){
      return '<div class="raised-sm" role="button" tabindex="0" data-pick-cliente-id="' + c.id + '" style="padding:15px 16px;margin-bottom:11px;cursor:pointer;">' +
        '<div style="font-size:14px;font-weight:600;">' + escapeHtml(c.nome) + '</div>' +
        (c.telefone ? '<div style="font-size:11.5px;color:var(--text-faint);margin-top:2px;">' + escapeHtml(c.telefone) + '</div>' : '') +
      '</div>';
    }).join("");
  }

  function openVendaItemPicker(mode, idx){
    var isEdit = mode === "editar";
    vendaItemEditIndex = isEdit ? idx : -1;
    var pickerWrap = document.getElementById("vendaItemVariacaoPicker");
    var lockedWrap = document.getElementById("vendaItemVariacaoLocked");
    var removeWrap = document.getElementById("vendaItemRemoveWrap");
    var submitBtn = document.getElementById("vendaItemSubmitBtn");
    setText("vendaItemTitle", isEdit ? "Editar item" : "Adicionar item");
    if (pickerWrap) pickerWrap.hidden = isEdit;
    if (lockedWrap) lockedWrap.hidden = !isEdit;
    if (removeWrap) removeWrap.hidden = !isEdit;
    if (submitBtn) submitBtn.textContent = isEdit ? "Salvar alteração" : "Adicionar";

    if (isEdit) {
      var item = vendaCarrinho[idx];
      vendaItemPickVariacaoId = item.variacaoId;
      document.getElementById("vendaItemQtd").value = numToStr(item.quantidade);
      document.getElementById("vendaItemPreco").value = numToStr(item.precoUnit);
    } else {
      vendaItemPickVariacaoId = catalogoState.variacoes.length ? catalogoState.variacoes[0].id : null;
      var v0 = findVariacao(vendaItemPickVariacaoId);
      document.getElementById("vendaItemQtd").value = "";
      document.getElementById("vendaItemPreco").value = v0 ? numToStr(v0.precoVenda) : "";
    }
    renderVendaItemPicker();
    showScreen("vendaItemPicker");
  }

  function renderVendaItemPicker(){
    var isEdit = vendaItemEditIndex >= 0;
    var v = findVariacao(vendaItemPickVariacaoId);
    if (!isEdit) {
      var listEl = document.getElementById("vendaItemVariacaoList");
      if (listEl) listEl.innerHTML = catalogoState.variacoes.map(function(vv){
        var selected = vv.id === vendaItemPickVariacaoId;
        return '<div class="raised-sm" role="button" tabindex="0" data-pick-item-variacao-id="' + vv.id + '" style="padding:15px 16px;margin-bottom:11px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;">' +
          '<div style="font-size:14px;font-weight:600;">' + escapeHtml(vv.cheiro) + ' · ' + escapeHtml(vv.cor) + '</div>' +
          (selected ? CHECKMARK_SVG : '') +
        '</div>';
      }).join("");
    } else {
      setText("vendaItemVariacaoLockedLabel", variacaoLabel(v));
    }
    setText("vendaItemEstoqueInfo", numToStr(v ? qtdVela(v.id) : 0) + " un disponíveis no Estoque de Produção agora.");
  }

  function submitVendaItem(){
    var v = findVariacao(vendaItemPickVariacaoId);
    if (!v) return;
    var qtd = strToNum(document.getElementById("vendaItemQtd").value);
    var preco = strToNum(document.getElementById("vendaItemPreco").value);
    if (qtd <= 0) return;
    var existingIdx = -1;
    for (var i = 0; i < vendaCarrinho.length; i++) {
      if (vendaCarrinho[i].variacaoId === v.id && i !== vendaItemEditIndex) { existingIdx = i; break; }
    }
    if (existingIdx >= 0) {
      vendaCarrinho[existingIdx].quantidade = round2(vendaCarrinho[existingIdx].quantidade + qtd);
      vendaCarrinho[existingIdx].precoUnit = round2(preco);
      if (vendaItemEditIndex >= 0) vendaCarrinho.splice(vendaItemEditIndex, 1);
    } else if (vendaItemEditIndex >= 0) {
      vendaCarrinho[vendaItemEditIndex].quantidade = round2(qtd);
      vendaCarrinho[vendaItemEditIndex].precoUnit = round2(preco);
    } else {
      vendaCarrinho.push({ variacaoId: v.id, quantidade: round2(qtd), precoUnit: round2(preco) });
    }
    vendaItemEditIndex = -1;
    renderVendaNova();
    showScreen("vendas");
  }

  function removeVendaItemAtIndex(idx){
    vendaCarrinho.splice(idx, 1);
    renderVendaNova();
  }

  function confirmarVenda(){
    if (!vendaCarrinho.length) return;
    for (var i = 0; i < vendaCarrinho.length; i++) {
      if (vendaCarrinho[i].quantidade > qtdVela(vendaCarrinho[i].variacaoId) + 0.005) return;
    }
    var cliente = vendaClienteIdSel ? findCliente(vendaClienteIdSel) : null;
    var subtotal = computeVendaTotal();
    var validacao = vendaCupomValidacaoAtual();
    var cupomAplicado = (validacao && validacao.ok) ? validacao.cupom : null;
    var desconto = cupomAplicado ? validacao.desconto : 0;
    var total = round2(Math.max(0, subtotal - desconto));
    var venda = {
      id: uid("vd"),
      clienteId: vendaClienteIdSel,
      clienteNome: cliente ? cliente.nome : "Cliente avulso",
      itens: vendaCarrinho.map(function(it){
        var v = findVariacao(it.variacaoId);
        return { variacaoId: it.variacaoId, quantidade: it.quantidade, precoUnit: it.precoUnit, precoTabela: v ? v.precoVenda : it.precoUnit };
      }),
      formaPagamento: getVendaPagamentoPill(),
      data: todayISO(),
      subtotal: subtotal,
      cupomCodigo: cupomAplicado ? cupomAplicado.codigo : null,
      cupomDesconto: desconto,
      total: total,
      status: "confirmada",
      origemEncomendaId: null
    };
    vendaCarrinho.forEach(function(it){
      var entry = findEstoqueVela(it.variacaoId);
      if (entry) entry.quantidade = round2(Math.max(0, entry.quantidade - it.quantidade));
      producaoEstoqueState.movimentacoes.push({ id: uid("pm"), variacaoId: it.variacaoId, tipo: "saida", quantidade: it.quantidade, motivo: "Venda", data: todayISO() });
    });
    saveProducaoEstoqueState();
    if (cliente) {
      cliente.numeroCompras = (cliente.numeroCompras || 0) + 1;
      cliente.totalGasto = round2((cliente.totalGasto || 0) + total);
      saveClientesState();
    }
    if (cupomAplicado) {
      cupomAplicado.usosCount = (cupomAplicado.usosCount || 0) + 1;
      saveCuponsState();
    }
    vendasState.vendas.unshift(venda);
    saveVendasState();

    vendaCarrinho = [];
    vendaClienteIdSel = null;
    var cupomInputEl = document.getElementById("vendaCupomInput");
    if (cupomInputEl) cupomInputEl.value = "";
    renderVendaNova();
    renderVelasList();
    refreshAvisos();
    renderClientesList();
    renderVendaHistorico();
    renderCupomList();
    renderDashboardResumo();
    setVendasTab("historico");
  }

  function salvarComoEncomenda(){
    if (!vendaCarrinho.length) return;
    var cliente = vendaClienteIdSel ? findCliente(vendaClienteIdSel) : null;
    var encomenda = {
      id: uid("en"),
      clienteId: vendaClienteIdSel,
      clienteNome: cliente ? cliente.nome : "Cliente avulso",
      itens: vendaCarrinho.map(function(it){
        var v = findVariacao(it.variacaoId);
        return { variacaoId: it.variacaoId, quantidade: it.quantidade, precoUnit: it.precoUnit, precoTabela: v ? v.precoVenda : it.precoUnit };
      }),
      formaPagamento: getVendaPagamentoPill(),
      dataCriacao: todayISO(),
      dataEntrega: null,
      total: computeVendaTotal(),
      status: "pendente",
      loteId: null,
      vendaId: null
    };
    vendasState.encomendas.unshift(encomenda);
    saveVendasState();

    vendaCarrinho = [];
    vendaClienteIdSel = null;
    var cupomInputEl2 = document.getElementById("vendaCupomInput");
    if (cupomInputEl2) cupomInputEl2.value = "";
    renderVendaNova();
    renderVendaEncomendas();
    setVendasTab("encomendas");
  }

  function encomendaStatusLabel(status){
    return status === "pendente" ? "Pendente" : status === "em_producao" ? "Em produção" : status === "entregue" ? "Entregue" : "Cancelada";
  }
  function encomendaStatusBadgeClass(status){
    return status === "entregue" ? "good" : status === "cancelada" ? "warn" : "primary";
  }
  function encomendaItensTxt(enc){
    return enc.itens.map(function(it){ return numToStr(it.quantidade) + "un " + variacaoLabel(findVariacao(it.variacaoId)); }).join(" · ");
  }

  function encomendaRowHTML(enc){
    var extra = "";
    if (enc.status === "em_producao") {
      var lote = enc.loteId ? findLote(enc.loteId) : null;
      extra = '<div style="font-size:11px;color:var(--text-faint);margin:8px 0;">vinculada ao lote de ' + (lote ? (formatDateBR(lote.data) + " · " + numToStr(lote.quantidade) + " velas") : "—") + '</div>';
    }
    var footer;
    if (enc.status === "pendente") {
      footer = '<div class="row" style="gap:10px;margin-top:10px;">' +
          '<button class="btn btn-ghost" data-action="encomenda-marcar-producao" data-encomenda-id="' + enc.id + '" style="flex:1;">Marcar em produção</button>' +
        '</div>' +
        '<div style="text-align:center;margin-top:6px;"><button class="btn btn-text" data-action="encomenda-cancelar" data-encomenda-id="' + enc.id + '">Cancelar encomenda</button></div>';
    } else if (enc.status === "em_producao") {
      footer = '<div class="row" style="gap:10px;">' +
          '<button class="btn btn-primary" data-action="encomenda-marcar-entregue" data-encomenda-id="' + enc.id + '" style="flex:1;">Marcar como entregue</button>' +
        '</div>' +
        '<div style="text-align:center;margin-top:6px;"><button class="btn btn-text" data-action="encomenda-cancelar" data-encomenda-id="' + enc.id + '">Cancelar encomenda</button></div>';
    } else if (enc.status === "entregue") {
      footer = '<div style="font-size:11px;color:var(--text-faint);margin-top:8px;">entregue em ' + formatDateBR(enc.dataEntrega) + ' · convertida em venda</div>';
    } else {
      footer = '<div style="font-size:11px;color:var(--text-faint);margin-top:8px;">encomenda cancelada</div>';
    }
    return '<div class="raised card">' +
        '<div class="between" style="align-items:flex-start;margin-bottom:6px;">' +
          '<div><div style="font-size:14px;font-weight:600;">' + escapeHtml(enc.clienteNome) + '</div>' +
          '<div style="font-size:11px;color:var(--text-faint);margin-top:2px;">' + formatDateBR(enc.dataCriacao) + '</div></div>' +
          '<div class="badge ' + encomendaStatusBadgeClass(enc.status) + '">' + encomendaStatusLabel(enc.status) + '</div>' +
        '</div>' +
        '<div style="font-size:12.5px;color:var(--text-dim);margin-bottom:4px;">' + escapeHtml(encomendaItensTxt(enc)) + '</div>' +
        '<div style="font-size:15px;font-weight:700;">' + fmtMoney(enc.total) + '</div>' +
        extra + footer +
      '</div>';
  }

  function renderVendaEncomendas(){
    var list = vendasState.encomendas.slice();
    if (vendaEncomendaFiltro === "abertas") list = list.filter(function(e){ return e.status === "pendente" || e.status === "em_producao"; });
    else if (vendaEncomendaFiltro === "entregues") list = list.filter(function(e){ return e.status === "entregue"; });
    var listEl = document.getElementById("vendaEncomendasList");
    if (listEl) listEl.innerHTML = list.length ? list.map(encomendaRowHTML).join("") : '<div style="text-align:center;color:var(--text-faint);font-size:12.5px;padding:24px 0;">nenhuma encomenda aqui</div>';
    var countEl = document.getElementById("vendaEncomendasCount");
    if (countEl) countEl.textContent = list.length + (list.length === 1 ? " encomenda" : " encomendas");
    var badgeEl = document.getElementById("vendaEncomendasBadge");
    if (badgeEl) {
      var abertas = vendasState.encomendas.filter(function(e){ return e.status === "pendente" || e.status === "em_producao"; }).length;
      badgeEl.hidden = abertas === 0;
      badgeEl.textContent = abertas;
    }
  }

  function openVendaLotePicker(encomendaId){
    var enc = findEncomenda(encomendaId);
    if (!enc) return;
    currentEncomendaLoteTargetId = encomendaId;
    renderVendaLotePicker();
    showScreen("vendaLotePicker");
  }

  function renderVendaLotePicker(){
    var listEl = document.getElementById("vendaLotePickerList");
    if (!listEl) return;
    var lotes = lotesState.lotes;
    listEl.innerHTML = lotes.length ? lotes.map(function(l){
      var v = findVariacao(l.variacaoId);
      return '<div class="raised-sm" role="button" tabindex="0" data-pick-lote-id="' + l.id + '" style="padding:15px 16px;margin-bottom:11px;cursor:pointer;">' +
        '<div style="font-size:14px;font-weight:600;">' + escapeHtml(variacaoLabel(v)) + '</div>' +
        '<div style="font-size:11.5px;color:var(--text-faint);margin-top:2px;">' + formatDateBR(l.data) + ' · ' + numToStr(l.quantidade) + ' velas</div>' +
      '</div>';
    }).join("") : '<div style="text-align:center;color:var(--text-faint);font-size:12.5px;padding:24px 0;">nenhum lote registrado ainda — registre um em Produção → Ver lucro → Registrar lote.</div>';
  }

  function linkEncomendaLote(loteId){
    var enc = findEncomenda(currentEncomendaLoteTargetId);
    if (!enc) return;
    enc.status = "em_producao";
    enc.loteId = loteId;
    saveVendasState();
    currentEncomendaLoteTargetId = null;
    renderVendaEncomendas();
    showScreen("vendas");
  }

  function cancelarEncomenda(id){
    var enc = findEncomenda(id);
    if (!enc) return;
    if (!window.confirm("Cancelar esta encomenda?")) return;
    enc.status = "cancelada";
    saveVendasState();
    renderVendaEncomendas();
  }

  // Marcar como entregue é o que converte a encomenda em venda de fato: debita o Estoque de
  // Produção, credita o histórico do cliente e cria o registro em Vendas — a encomenda em si
  // nunca mexeu no estoque até este momento.
  function marcarEncomendaEntregue(id){
    var enc = findEncomenda(id);
    if (!enc) return;
    for (var i = 0; i < enc.itens.length; i++) {
      if (enc.itens[i].quantidade > qtdVela(enc.itens[i].variacaoId) + 0.005) {
        window.alert("Estoque de produção insuficiente pra entregar esta encomenda agora.");
        return;
      }
    }
    enc.itens.forEach(function(it){
      var entry = findEstoqueVela(it.variacaoId);
      if (entry) entry.quantidade = round2(Math.max(0, entry.quantidade - it.quantidade));
      producaoEstoqueState.movimentacoes.push({ id: uid("pm"), variacaoId: it.variacaoId, tipo: "saida", quantidade: it.quantidade, motivo: "Venda", data: todayISO() });
    });
    saveProducaoEstoqueState();

    var cliente = enc.clienteId ? findCliente(enc.clienteId) : null;
    var venda = {
      id: uid("vd"),
      clienteId: enc.clienteId,
      clienteNome: enc.clienteNome,
      itens: enc.itens.map(function(it){ return { variacaoId: it.variacaoId, quantidade: it.quantidade, precoUnit: it.precoUnit, precoTabela: it.precoTabela }; }),
      formaPagamento: enc.formaPagamento,
      data: todayISO(),
      total: enc.total,
      status: "confirmada",
      origemEncomendaId: enc.id
    };
    if (cliente) {
      cliente.numeroCompras = (cliente.numeroCompras || 0) + 1;
      cliente.totalGasto = round2((cliente.totalGasto || 0) + enc.total);
      saveClientesState();
    }
    vendasState.vendas.unshift(venda);
    enc.status = "entregue";
    enc.dataEntrega = todayISO();
    enc.vendaId = venda.id;
    saveVendasState();

    renderVendaEncomendas();
    renderVelasList();
    refreshAvisos();
    renderClientesList();
    renderVendaHistorico();
    renderDashboardResumo();
  }

  function computeVendaHistList(){
    var vendas = vendasState.vendas.slice();
    if (vendaHistPeriodo !== "tudo") {
      var dias = vendaHistPeriodo === "30" ? 30 : 7;
      var limite = new Date();
      limite.setDate(limite.getDate() - dias);
      var limiteISO = limite.getFullYear() + "-" + String(limite.getMonth() + 1).padStart(2, "0") + "-" + String(limite.getDate()).padStart(2, "0");
      vendas = vendas.filter(function(v){ return v.data >= limiteISO; });
    }
    var clienteEl = document.getElementById("vendaHistClienteInput");
    var q = clienteEl ? clienteEl.value.trim().toLowerCase() : "";
    if (q) vendas = vendas.filter(function(v){ return v.clienteNome.toLowerCase().indexOf(q) !== -1; });
    if (vendaHistVariacaoFiltro !== "todas") {
      vendas = vendas.filter(function(v){ return v.itens.some(function(it){ return it.variacaoId === vendaHistVariacaoFiltro; }); });
    }
    vendas.sort(function(a, b){
      if (a.data !== b.data) return a.data < b.data ? 1 : -1;
      return a.id < b.id ? 1 : -1;
    });
    return vendas;
  }

  function vendaHistRowHTML(v){
    var itensTxt = v.itens.map(function(it){ return numToStr(it.quantidade) + "un " + variacaoLabel(findVariacao(it.variacaoId)); }).join(" · ");
    var cancelada = v.status === "cancelada";
    var badge = cancelada ? '<div class="badge warn">Cancelada</div>' : '<div class="badge good">' + escapeHtml(v.formaPagamento) + '</div>';
    var origemTxt = v.origemEncomendaId ? '<div style="font-size:11px;color:var(--text-faint);margin-top:2px;">veio de uma encomenda entregue</div>' : "";
    var cupomTxt = v.cupomCodigo ? '<div style="font-size:11px;color:var(--good);margin-top:2px;">cupom ' + escapeHtml(v.cupomCodigo) + ' · − ' + fmtMoney(v.cupomDesconto || 0) + '</div>' : "";
    var cancelBtn = !cancelada ? '<div style="text-align:right;margin-top:6px;"><button class="btn btn-text" data-action="venda-cancelar" data-venda-id="' + v.id + '">Cancelar / estornar</button></div>' : "";
    return '<div class="raised card" style="' + (cancelada ? "opacity:.6;" : "") + '">' +
        '<div class="between" style="align-items:flex-start;margin-bottom:6px;">' +
          '<div><div style="font-size:14px;font-weight:600;">' + escapeHtml(v.clienteNome) + '</div>' +
          '<div style="font-size:11px;color:var(--text-faint);margin-top:2px;">' + formatDateBR(v.data) + '</div></div>' +
          badge +
        '</div>' +
        '<div style="font-size:12.5px;color:var(--text-dim);margin-bottom:4px;">' + escapeHtml(itensTxt) + '</div>' +
        '<div style="font-size:15px;font-weight:700;">' + fmtMoney(v.total) + '</div>' +
        cupomTxt + origemTxt + cancelBtn +
      '</div>';
  }

  function renderVendaHistorico(){
    var pillsEl = document.getElementById("vendaHistVariacaoPills");
    if (pillsEl) {
      var html = '<div class="pill' + (vendaHistVariacaoFiltro === "todas" ? " active" : "") + '" data-histvariacao="todas" style="flex:none;">Todas variações</div>';
      html += catalogoState.variacoes.map(function(v){
        return '<div class="pill' + (vendaHistVariacaoFiltro === v.id ? " active" : "") + '" data-histvariacao="' + v.id + '" style="flex:none;">' + escapeHtml(variacaoLabel(v)) + '</div>';
      }).join("");
      pillsEl.innerHTML = html;
    }
    var list = computeVendaHistList();
    var listEl = document.getElementById("vendaHistList");
    var emptyEl = document.getElementById("vendaHistEmpty");
    if (listEl) listEl.innerHTML = list.map(vendaHistRowHTML).join("");
    if (emptyEl) emptyEl.hidden = list.length > 0;
    var countEl = document.getElementById("vendaHistCount");
    if (countEl) countEl.textContent = list.length + (list.length === 1 ? " venda" : " vendas");
  }

  // Cancelar/estornar devolve as velas ao Estoque de Produção e desfaz o crédito no histórico
  // do cliente. Se a venda veio de uma encomenda entregue, a encomenda volta pra "em produção"
  // em vez de ficar marcada como entregue sem uma venda válida por trás.
  function cancelarVenda(id){
    var venda = findVenda(id);
    if (!venda || venda.status === "cancelada") return;
    if (!window.confirm("Cancelar e estornar esta venda? Isso devolve os itens ao Estoque de Produção" + (venda.clienteId ? " e ajusta o histórico do cliente." : "."))) return;
    venda.itens.forEach(function(it){
      var entry = findEstoqueVela(it.variacaoId);
      if (!entry) { entry = { variacaoId: it.variacaoId, quantidade: 0, minimo: 0 }; producaoEstoqueState.estoques.push(entry); }
      entry.quantidade = round2(entry.quantidade + it.quantidade);
      producaoEstoqueState.movimentacoes.push({ id: uid("pm"), variacaoId: it.variacaoId, tipo: "entrada", quantidade: it.quantidade, motivo: "Estorno de venda", data: todayISO() });
    });
    saveProducaoEstoqueState();
    if (venda.clienteId) {
      var cliente = findCliente(venda.clienteId);
      if (cliente) {
        cliente.numeroCompras = Math.max(0, (cliente.numeroCompras || 0) - 1);
        cliente.totalGasto = round2(Math.max(0, (cliente.totalGasto || 0) - venda.total));
        saveClientesState();
      }
    }
    venda.status = "cancelada";
    if (venda.origemEncomendaId) {
      var enc = findEncomenda(venda.origemEncomendaId);
      if (enc) { enc.status = "em_producao"; enc.vendaId = null; enc.dataEntrega = null; }
    }
    saveVendasState();
    renderVendaHistorico();
    renderVelasList();
    refreshAvisos();
    renderClientesList();
    renderVendaEncomendas();
    renderDashboardResumo();
  }

  function setVendasTab(tab){
    document.querySelectorAll('.screen[data-screen="vendas"] [data-vendatab]').forEach(function(p){ p.classList.toggle("active", p.dataset.vendatab === tab); p.setAttribute("aria-pressed", (p.dataset.vendatab === tab) ? "true" : "false"); });
    var panelNova = document.getElementById("vendaPanelNova");
    var panelEncomendas = document.getElementById("vendaPanelEncomendas");
    var panelHistorico = document.getElementById("vendaPanelHistorico");
    var panelCupons = document.getElementById("vendaPanelCupons");
    if (panelNova) panelNova.hidden = tab !== "nova";
    if (panelEncomendas) panelEncomendas.hidden = tab !== "encomendas";
    if (panelHistorico) panelHistorico.hidden = tab !== "historico";
    if (panelCupons) panelCupons.hidden = tab !== "cupons";
    if (tab === "nova") renderVendaNova();
    else if (tab === "encomendas") renderVendaEncomendas();
    else if (tab === "historico") renderVendaHistorico();
    else if (tab === "cupons") renderCupomList();
  }

  function insumoRowHTML(insumo){
    var below = insumo.minimo > 0 && insumo.quantidade < insumo.minimo;
    var menuBtn = '<div class="tapicon" role="button" aria-label="Mais ações · ' + escapeHtml(insumo.nome) + '" data-action="estoque-edit"><svg viewBox="0 0 24 24"><circle cx="6" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="18" cy="12" r="1.6" fill="currentColor"/></svg></div>';
    var rightTop = below
      ? '<div class="row" style="gap:6px;"><div class="badge warn">abaixo do mínimo</div>' + menuBtn + '</div>'
      : menuBtn;
    var minTxt = insumo.minimo > 0 ? (" · mín " + numToStr(insumo.minimo) + " " + insumo.unidade) : "";
    return '' +
      '<div class="raised-sm" role="button" tabindex="0" aria-label="Ver histórico · ' + escapeHtml(insumo.nome) + '" data-insumo-id="' + insumo.id + '" style="padding:15px 16px;margin-bottom:11px;cursor:pointer;">' +
        '<div class="between" style="margin-bottom:6px;">' +
          '<div style="font-size:14px;font-weight:600;">' + escapeHtml(insumo.nome) + '</div>' +
          rightTop +
        '</div>' +
        '<div class="between">' +
          '<div style="font-size:18px;font-weight:700;">' + fmtQty(insumo.quantidade, insumo.unidade) + '</div>' +
          '<div style="font-size:11.5px;color:var(--text-faint);">' + fmtMoneyPerUnit(insumo.custoMedio, insumo.unidade) + minTxt + '</div>' +
        '</div>' +
      '</div>';
  }

  function renderEstoqueList(){
    var searchEl = document.getElementById("estoqueSearchInput");
    var q = searchEl ? searchEl.value.trim().toLowerCase() : "";
    var list = estoqueState.insumos.filter(function(i){ return i.nome.toLowerCase().indexOf(q) !== -1; });
    var listEl = document.getElementById("estoqueList");
    if (listEl) {
      if (list.length) {
        listEl.innerHTML = list.map(insumoRowHTML).join("");
      } else if (estoqueState.insumos.length === 0) {
        listEl.innerHTML = emptyStateHTML({
          icon: '<rect x="4" y="4" width="16" height="5" rx="1.2"/><rect x="4" y="11" width="16" height="9" rx="1.2"/><path d="M9 15h6"/>',
          title: "nenhum insumo cadastrado ainda",
          sub: "cadastre cera, pavio, fragrância e tudo que entra na produção pra acompanhar estoque e custo médio.",
          ctaLabel: "cadastrar primeiro insumo",
          ctaAttr: 'data-action="estoque-add"'
        });
      } else {
        listEl.innerHTML = '<div style="text-align:center;color:var(--text-faint);font-size:12.5px;padding:24px 0;">nenhum insumo encontrado para "' + escapeHtml(searchEl ? searchEl.value.trim() : "") + '"</div>';
      }
    }
    var countEl = document.getElementById("estoqueCount");
    if (countEl) {
      var n = estoqueState.insumos.length;
      countEl.textContent = n + (n === 1 ? " insumo" : " insumos");
    }
  }

  function openDetalhe(id){
    currentInsumoId = id;
    renderDetalhe();
    showScreen("estoqueDetalhe");
  }

  function renderDetalhe(){
    var insumo = findInsumo(currentInsumoId);
    if (!insumo) return;
    document.getElementById("detalheNome").textContent = insumo.nome;
    document.getElementById("detalheQtd").textContent = fmtQty(insumo.quantidade, insumo.unidade);
    document.getElementById("detalheCusto").textContent = fmtMoneyPerUnit(insumo.custoMedio, insumo.unidade);
    document.getElementById("detalheMinimo").textContent = insumo.minimo > 0 ? fmtQty(insumo.minimo, insumo.unidade) : "—";
    document.getElementById("detalheBadge").hidden = !(insumo.minimo > 0 && insumo.quantidade < insumo.minimo);

    var movs = estoqueState.movimentacoes.filter(function(m){ return m.insumoId === currentInsumoId; });
    movs.sort(function(a, b){
      if (a.data !== b.data) return a.data < b.data ? 1 : -1;
      return a.id < b.id ? 1 : -1;
    });

    var n = movs.length;
    document.getElementById("detalheHistCount").textContent = n + (n === 1 ? " registro" : " registros");
    var histCard = document.getElementById("detalheHistCard");
    var emptyEl = document.getElementById("detalheHistEmpty");
    if (!n) {
      histCard.hidden = true;
      emptyEl.hidden = false;
    } else {
      histCard.hidden = false;
      emptyEl.hidden = true;
      document.getElementById("detalheHistList").innerHTML = movs.map(function(m, idx){
        var isEntrada = m.tipo === "entrada";
        var label = isEntrada ? "Entrada · compra" : "Saída · " + (m.motivo || "uso");
        var qtdTxt = (isEntrada ? "+" : "–") + numToStr(m.quantidade) + " " + insumo.unidade;
        var qtdColor = isEntrada ? "var(--good)" : "var(--text)";
        var borderStyle = idx === movs.length - 1 ? "" : "border-bottom:1px solid var(--line);";
        return '<div class="between" style="padding:12px 0;' + borderStyle + '">' +
          '<div><div style="font-size:13.5px;font-weight:600;">' + label + '</div><div style="font-size:11px;color:var(--text-faint);margin-top:2px;">' + formatDateBR(m.data) + '</div></div>' +
          '<div style="text-align:right;"><div style="font-size:13.5px;font-weight:700;color:' + qtdColor + ';">' + qtdTxt + '</div><div style="font-size:11px;color:var(--text-faint);margin-top:2px;">' + fmtMoney(m.valor) + '</div></div>' +
        '</div>';
      }).join("");
    }
  }

  function setMovTipo(tipo){
    currentMovTipo = tipo;
    document.querySelectorAll('#estoqueMovimentar [data-tipo]').forEach(function(p){ p.classList.toggle("active", p.dataset.tipo === tipo); p.setAttribute("aria-pressed", (p.dataset.tipo === tipo) ? "true" : "false"); });
    document.getElementById("movEntradaFields").hidden = tipo !== "entrada";
    document.getElementById("movSaidaFields").hidden = tipo !== "saida";
    document.getElementById("movPreviewLabel").textContent = tipo === "entrada" ? "depois desta entrada" : "depois desta saída";
    document.getElementById("movPreviewCustoRow").hidden = tipo !== "entrada";
    document.getElementById("movSubmitBtn").textContent = tipo === "entrada" ? "Registrar entrada" : "Registrar saída";
    updateMovPreview();
  }

  function setMotivoPill(motivo){
    document.querySelectorAll('#movMotivoPills [data-motivo]').forEach(function(p){ p.classList.toggle("active", p.dataset.motivo === motivo); p.setAttribute("aria-pressed", (p.dataset.motivo === motivo) ? "true" : "false"); });
  }
  function getMotivoPill(){
    var active = document.querySelector('#movMotivoPills .pill.active');
    return active ? active.dataset.motivo : "Produção";
  }

  function openMovimentar(id, tipo){
    var insumo = findInsumo(id);
    if (!insumo) return;
    currentInsumoId = id;
    document.getElementById("movCrumb").textContent = insumo.nome;
    document.getElementById("movUnitEntrada").textContent = insumo.unidade;
    document.getElementById("movUnitSaida").textContent = insumo.unidade;
    document.getElementById("movQtdEntrada").value = "";
    document.getElementById("movPreco").value = "";
    document.getElementById("movQtdSaida").value = "";
    document.getElementById("movData").textContent = formatDateBR(todayISO());
    setMotivoPill("Produção");
    setMovTipo(tipo || "entrada");
    showScreen("estoqueMovimentar");
  }

  function updateMovPreview(){
    var insumo = findInsumo(currentInsumoId);
    if (!insumo) return;
    var warnEl = document.getElementById("movWarning");
    var submitBtn = document.getElementById("movSubmitBtn");
    warnEl.hidden = true;
    submitBtn.removeAttribute("disabled");

    if (currentMovTipo === "entrada") {
      var qtd = strToNum(document.getElementById("movQtdEntrada").value);
      var preco = strToNum(document.getElementById("movPreco").value);
      var novaQtd = insumo.quantidade + (qtd > 0 ? qtd : 0);
      var novoCusto = insumo.custoMedio;
      if (qtd > 0 && novaQtd > 0) {
        var custoUnit = preco / qtd;
        novoCusto = ((insumo.quantidade * insumo.custoMedio) + (qtd * custoUnit)) / novaQtd;
      }
      document.getElementById("movPreviewQtd").textContent = fmtQty(insumo.quantidade, insumo.unidade) + " → " + fmtQty(novaQtd, insumo.unidade);
      document.getElementById("movPreviewCusto").textContent = fmtMoney(insumo.custoMedio) + " → " + fmtMoney(novoCusto) + "/" + insumo.unidade;
    } else {
      var qtdS = strToNum(document.getElementById("movQtdSaida").value);
      var novaQtdS = insumo.quantidade - (qtdS > 0 ? qtdS : 0);
      if (qtdS > insumo.quantidade) {
        warnEl.hidden = false;
        warnEl.textContent = "quantidade maior que o estoque disponível (" + fmtQty(insumo.quantidade, insumo.unidade) + ")";
        submitBtn.setAttribute("disabled", "disabled");
      }
      document.getElementById("movPreviewQtd").textContent = fmtQty(insumo.quantidade, insumo.unidade) + " → " + fmtQty(Math.max(novaQtdS, 0), insumo.unidade);
    }
  }

  function submitMovimentacao(){
    var insumo = findInsumo(currentInsumoId);
    if (!insumo) return;
    var today = todayISO();
    if (currentMovTipo === "entrada") {
      var qtd = strToNum(document.getElementById("movQtdEntrada").value);
      var preco = strToNum(document.getElementById("movPreco").value);
      if (qtd <= 0) return;
      var custoUnit = preco / qtd;
      var novaQtd = insumo.quantidade + qtd;
      insumo.custoMedio = ((insumo.quantidade * insumo.custoMedio) + (qtd * custoUnit)) / novaQtd;
      insumo.quantidade = round2(novaQtd);
      estoqueState.movimentacoes.push({ id: uid("m"), insumoId: insumo.id, tipo: "entrada", quantidade: round2(qtd), valor: round2(preco), data: today });
    } else {
      var qtdS = strToNum(document.getElementById("movQtdSaida").value);
      if (qtdS <= 0 || qtdS > insumo.quantidade) return;
      var valor = round2(qtdS * insumo.custoMedio);
      insumo.quantidade = round2(Math.max(0, insumo.quantidade - qtdS));
      estoqueState.movimentacoes.push({ id: uid("m"), insumoId: insumo.id, tipo: "saida", quantidade: round2(qtdS), valor: valor, motivo: getMotivoPill(), data: today });
    }
    saveEstoqueState();
    renderDetalhe();
    renderEstoqueList();
    refreshAvisos();
    showScreen("estoqueDetalhe");
  }

  function setFormUnit(unit){
    document.querySelectorAll('#formUnitPills [data-unit]').forEach(function(p){ p.classList.toggle("active", p.dataset.unit === unit); p.setAttribute("aria-pressed", (p.dataset.unit === unit) ? "true" : "false"); });
    document.getElementById("formQtdUnit").textContent = unit;
    document.getElementById("formMinUnit").textContent = unit;
  }
  function getFormUnit(){
    var active = document.querySelector('#formUnitPills .pill.active');
    return active ? active.dataset.unit : "kg";
  }

  function openForm(mode, id){
    formMode = mode;
    formEditingId = id || null;
    var isEdit = mode === "editar";
    document.getElementById("formTitle").textContent = isEdit ? "Editar insumo" : "Novo insumo";
    document.getElementById("formNewFields").hidden = isEdit;
    document.getElementById("formEditInfo").hidden = !isEdit;
    document.getElementById("formRemoveWrap").hidden = !isEdit;
    document.getElementById("formHint").hidden = isEdit;

    var unit = "kg";
    if (isEdit) {
      var insumo = findInsumo(id);
      if (!insumo) return;
      document.getElementById("formNome").value = insumo.nome;
      unit = insumo.unidade;
      document.getElementById("formMinimo").value = insumo.minimo > 0 ? numToStr(insumo.minimo) : "";
      document.getElementById("formInfoQtd").textContent = fmtQty(insumo.quantidade, insumo.unidade);
      document.getElementById("formInfoCusto").textContent = fmtMoneyPerUnit(insumo.custoMedio, insumo.unidade);
    } else {
      document.getElementById("formNome").value = "";
      document.getElementById("formQtd").value = "";
      document.getElementById("formCusto").value = "";
      document.getElementById("formMinimo").value = "";
    }
    setFormUnit(unit);
    showScreen("estoqueForm");
  }

  function submitForm(){
    var nomeEl = document.getElementById("formNome");
    var nome = nomeEl.value.trim();
    if (!nome) { nomeEl.focus(); return; }
    var unidade = getFormUnit();
    var minimo = strToNum(document.getElementById("formMinimo").value);

    if (formMode === "editar") {
      var insumo = findInsumo(formEditingId);
      if (!insumo) return;
      insumo.nome = nome;
      insumo.unidade = unidade;
      insumo.minimo = round2(minimo);
    } else {
      var qtd = strToNum(document.getElementById("formQtd").value);
      var custo = strToNum(document.getElementById("formCusto").value);
      estoqueState.insumos.push({ id: uid("i"), nome: nome, unidade: unidade, quantidade: round2(qtd), custoMedio: custo, minimo: round2(minimo) });
    }
    saveEstoqueState();
    renderEstoqueList();
    refreshAvisos();
    showScreen("estoque");
  }

  function removeInsumo(){
    if (!formEditingId) return;
    var insumo = findInsumo(formEditingId);
    if (!insumo) return;
    if (!window.confirm('Remover "' + insumo.nome + '" e todo o histórico dele?')) return;
    estoqueState.insumos = estoqueState.insumos.filter(function(i){ return i.id !== formEditingId; });
    estoqueState.movimentacoes = estoqueState.movimentacoes.filter(function(m){ return m.insumoId !== formEditingId; });
    saveEstoqueState();
    renderEstoqueList();
    refreshAvisos();
    showScreen("estoque");
  }

  // role="button"/"switch" divs are focusable (tabindex="0") but browsers only auto-activate
  // real <button>/<a> elements on Enter/Space — this makes the custom controls keyboard-operable
  // by forwarding Enter/Space on a focused one into the same click handling used for taps.
  // iOS Safari only ever renders :active on elements that are also listening for a
  // touch event somewhere on the page — with no touch listener at all, taps skip the
  // :active state and go straight to the end result, so buttons/pills/icons never show
  // the press feedback defined in style.css. This no-op listener is the standard fix.
  document.addEventListener("touchstart", function(){}, { passive: true });

  document.addEventListener("keydown", function(e){
    if (e.key !== "Enter" && e.key !== " " && e.key !== "Spacebar") return;
    var el = e.target.closest('[role="button"], [role="switch"]');
    if (!el) return;
    e.preventDefault();
    el.click();
  });

  document.addEventListener("click", function(e){
    // bottom tab bar
    var nav = e.target.closest(".navitem");
    if (nav) { showScreen(NAV_TARGET[nav.dataset.nav] || "dashboard"); return; }

    // "Mais" menu rows (and other data-goto shortcuts, e.g. the "Lotes" tab in Produção)
    var goto = e.target.closest("[data-goto]");
    if (goto) {
      if (goto.dataset.goto === "producaoLotes") renderLotesList();
      else if (goto.dataset.goto === "clientes") renderClientesList();
      else if (goto.dataset.goto === "custos") renderCustos();
      showScreen(goto.dataset.goto);
      return;
    }

    // back arrows (aria-label="Voltar")
    var back = e.target.closest('[aria-label="Voltar"]');
    if (back) {
      var cur = currentScreen();
      if (cur === "cupomForm") { showScreen("vendas"); setVendasTab("cupons"); return; }
      showScreen(BACK_TARGET[cur] || "mais");
      return;
    }

    // ---- Login / conta ----
    var loginSubmit = e.target.closest('[data-action="login-submit"]');
    if (loginSubmit) { submitLogin(); return; }

    var signupSubmit = e.target.closest('[data-action="signup-submit"]');
    if (signupSubmit) { submitSignup(); return; }

    var logoutBtn = e.target.closest('[data-action="logout"]');
    if (logoutBtn) { logout(); return; }

    // ---- Clientes ----
    var clienteFiltro = e.target.closest('.screen[data-screen="clientes"] [data-clientefiltro]');
    if (clienteFiltro) {
      document.querySelectorAll('.screen[data-screen="clientes"] [data-clientefiltro]').forEach(function(p){ p.classList.toggle("active", p === clienteFiltro); p.setAttribute("aria-pressed", (p === clienteFiltro) ? "true" : "false"); });
      renderClientesList();
      return;
    }

    var clienteAdd = e.target.closest('[data-action="cliente-add"]');
    if (clienteAdd) { openClienteForm("novo"); return; }

    var clienteDetalheBtn = e.target.closest('[data-action="cliente-detalhe"]');
    if (clienteDetalheBtn) { openClienteDetalhe(clienteDetalheBtn.dataset.clienteId); return; }

    var clienteEditarBtn = e.target.closest('[data-action="cliente-editar"]');
    if (clienteEditarBtn) { openClienteForm("editar", clienteEditarBtn.dataset.clienteId || currentClienteId); return; }

    var clienteFormSave = e.target.closest('[data-action="cliente-form-save"]');
    if (clienteFormSave) { submitClienteForm(); return; }

    var clienteFormRemove = e.target.closest('[data-action="cliente-form-remove"]');
    if (clienteFormRemove) { removeCliente(); return; }

    var clienteRow = e.target.closest("[data-cliente-id]");
    if (clienteRow) { openClienteDetalhe(clienteRow.dataset.clienteId); return; }

    // ---- Vendas: abas (Nova venda / Encomendas / Histórico) ----
    var vendaTab = e.target.closest('.screen[data-screen="vendas"] [data-vendatab]');
    if (vendaTab) { setVendasTab(vendaTab.dataset.vendatab); return; }

    // ---- Vendas: nova venda ----
    var vendaClientePickerBtn = e.target.closest('[data-action="venda-cliente-picker"]');
    if (vendaClientePickerBtn) { openVendaClientePicker(); return; }

    var pickVendaCliente = e.target.closest("[data-pick-cliente-id]");
    if (pickVendaCliente) {
      vendaClienteIdSel = pickVendaCliente.dataset.pickClienteId || null;
      renderVendaNova();
      showScreen("vendas");
      return;
    }

    var vendaItemAddBtn = e.target.closest('[data-action="venda-item-add"]');
    if (vendaItemAddBtn) { openVendaItemPicker("novo"); return; }

    var vendaItemEditBtn = e.target.closest('[data-action="venda-item-edit"]');
    if (vendaItemEditBtn) { openVendaItemPicker("editar", parseInt(vendaItemEditBtn.dataset.itemIdx, 10)); return; }

    var vendaItemRemoveRowBtn = e.target.closest('[data-action="venda-item-remove-row"]');
    if (vendaItemRemoveRowBtn) { removeVendaItemAtIndex(parseInt(vendaItemRemoveRowBtn.dataset.itemIdx, 10)); return; }

    var pickItemVariacao = e.target.closest("[data-pick-item-variacao-id]");
    if (pickItemVariacao) {
      vendaItemPickVariacaoId = pickItemVariacao.dataset.pickItemVariacaoId;
      var vv = findVariacao(vendaItemPickVariacaoId);
      if (vv) document.getElementById("vendaItemPreco").value = numToStr(vv.precoVenda);
      renderVendaItemPicker();
      return;
    }

    var vendaItemSubmitBtn = e.target.closest('[data-action="venda-item-submit"]');
    if (vendaItemSubmitBtn) { submitVendaItem(); return; }

    var vendaItemRemoveBtn = e.target.closest('[data-action="venda-item-remove"]');
    if (vendaItemRemoveBtn) {
      if (vendaItemEditIndex >= 0) removeVendaItemAtIndex(vendaItemEditIndex);
      vendaItemEditIndex = -1;
      showScreen("vendas");
      return;
    }

    var vendaPagPill = e.target.closest('#vendaPagamentoPills [data-vendapag]');
    if (vendaPagPill) { setVendaPagamentoPill(vendaPagPill.dataset.vendapag); return; }

    var vendaConfirmarBtn = e.target.closest('[data-action="venda-confirmar"]');
    if (vendaConfirmarBtn) { if (!vendaConfirmarBtn.hasAttribute("disabled")) confirmarVenda(); return; }

    var vendaSalvarEncomendaBtn = e.target.closest('[data-action="venda-salvar-encomenda"]');
    if (vendaSalvarEncomendaBtn) { salvarComoEncomenda(); return; }

    // ---- Vendas: encomendas ----
    var encFiltro = e.target.closest('#vendaPanelEncomendas [data-encfiltro]');
    if (encFiltro) {
      document.querySelectorAll('#vendaPanelEncomendas [data-encfiltro]').forEach(function(p){ p.classList.toggle("active", p === encFiltro); p.setAttribute("aria-pressed", (p === encFiltro) ? "true" : "false"); });
      vendaEncomendaFiltro = encFiltro.dataset.encfiltro;
      renderVendaEncomendas();
      return;
    }

    var encMarcarProducaoBtn = e.target.closest('[data-action="encomenda-marcar-producao"]');
    if (encMarcarProducaoBtn) { openVendaLotePicker(encMarcarProducaoBtn.dataset.encomendaId); return; }

    var pickLoteBtn = e.target.closest("[data-pick-lote-id]");
    if (pickLoteBtn) { linkEncomendaLote(pickLoteBtn.dataset.pickLoteId); return; }

    var encMarcarEntregueBtn = e.target.closest('[data-action="encomenda-marcar-entregue"]');
    if (encMarcarEntregueBtn) { marcarEncomendaEntregue(encMarcarEntregueBtn.dataset.encomendaId); return; }

    var encCancelarBtn = e.target.closest('[data-action="encomenda-cancelar"]');
    if (encCancelarBtn) { cancelarEncomenda(encCancelarBtn.dataset.encomendaId); return; }

    // ---- Vendas: histórico ----
    var histPeriodoPill = e.target.closest('#vendaPanelHistorico [data-histperiodo]');
    if (histPeriodoPill) {
      document.querySelectorAll('#vendaPanelHistorico [data-histperiodo]').forEach(function(p){ p.classList.toggle("active", p === histPeriodoPill); p.setAttribute("aria-pressed", (p === histPeriodoPill) ? "true" : "false"); });
      vendaHistPeriodo = histPeriodoPill.dataset.histperiodo;
      renderVendaHistorico();
      return;
    }

    var histVariacaoPill = e.target.closest('#vendaHistVariacaoPills [data-histvariacao]');
    if (histVariacaoPill) {
      vendaHistVariacaoFiltro = histVariacaoPill.dataset.histvariacao;
      renderVendaHistorico();
      return;
    }

    var vendaCancelarBtn = e.target.closest('[data-action="venda-cancelar"]');
    if (vendaCancelarBtn) { cancelarVenda(vendaCancelarBtn.dataset.vendaId); return; }

    // ---- Vendas: cupons ----
    var cupomFiltroPill = e.target.closest('#vendaPanelCupons [data-cupomfiltro]');
    if (cupomFiltroPill) {
      document.querySelectorAll('#vendaPanelCupons [data-cupomfiltro]').forEach(function(p){ p.classList.toggle("active", p === cupomFiltroPill); p.setAttribute("aria-pressed", (p === cupomFiltroPill) ? "true" : "false"); });
      cupomFiltroAtual = cupomFiltroPill.dataset.cupomfiltro;
      renderCupomList();
      return;
    }

    var cupomAddBtn = e.target.closest('[data-action="cupom-add"]');
    if (cupomAddBtn) { openCupomForm("novo"); return; }

    var cupomRow = e.target.closest("[data-cupom-id]");
    if (cupomRow) { openCupomForm("editar", cupomRow.dataset.cupomId); return; }

    var cupomTipoPill = e.target.closest('#cupomTipoPills [data-cupomtipo]');
    if (cupomTipoPill) { setCupomTipoPill(cupomTipoPill.dataset.cupomtipo); return; }

    var cupomEscopoPill = e.target.closest('#cupomEscopoPills [data-cupomescopo]');
    if (cupomEscopoPill) { setCupomEscopoPill(cupomEscopoPill.dataset.cupomescopo); return; }

    var pickCupomEscopo = e.target.closest("[data-pick-cupom-escopo-id]");
    if (pickCupomEscopo) { cupomFormEscopoVariacaoId = pickCupomEscopo.dataset.pickCupomEscopoId; renderCupomEscopoVariacaoList(); return; }

    var cupomAtivoPill = e.target.closest('#cupomAtivoPills [data-cupomativo]');
    if (cupomAtivoPill) { setCupomAtivoPill(cupomAtivoPill.dataset.cupomativo); return; }

    var cupomFormSave = e.target.closest('[data-action="cupom-form-save"]');
    if (cupomFormSave) { submitCupomForm(); return; }

    var cupomFormRemove = e.target.closest('[data-action="cupom-form-remove"]');
    if (cupomFormRemove) { removeCupom(); return; }

    // ---- Controle de custos ----
    var custoFixoAdd = e.target.closest('[data-action="custo-fixo-add"]');
    if (custoFixoAdd) { openCustoFixoForm("novo"); return; }

    var custoFixoRow = e.target.closest("[data-custo-id]");
    if (custoFixoRow) { openCustoFixoForm("editar", custoFixoRow.dataset.custoId); return; }

    var custoFixoFormSave = e.target.closest('[data-action="custo-fixo-form-save"]');
    if (custoFixoFormSave) { submitCustoFixoForm(); return; }

    var custoFixoFormRemove = e.target.closest('[data-action="custo-fixo-form-remove"]');
    if (custoFixoFormRemove) { removeCustoFixo(); return; }

    // ---- Configurações: receita padrão por vela ----
    var receitaItemAdd = e.target.closest('[data-action="receita-item-add"]');
    if (receitaItemAdd) { openReceitaItemForm("novo"); return; }

    var receitaItemRow = e.target.closest("[data-receita-id]");
    if (receitaItemRow && e.target.tagName !== "INPUT") { openReceitaItemForm("editar", receitaItemRow.dataset.receitaId); return; }

    var pickReceitaInsumo = e.target.closest("[data-pick-receita-insumo-id]");
    if (pickReceitaInsumo) { receitaItemFormInsumoId = pickReceitaInsumo.dataset.pickReceitaInsumoId; renderReceitaItemFormInsumoList(); return; }

    var receitaItemFormSave = e.target.closest('[data-action="receita-item-form-save"]');
    if (receitaItemFormSave) { submitReceitaItemForm(); return; }

    var receitaItemFormRemove = e.target.closest('[data-action="receita-item-form-remove"]');
    if (receitaItemFormRemove) { removeReceitaItem(); return; }

    // ---- Configurações: preço de venda por variação ----
    var variacaoAdd = e.target.closest('[data-action="variacao-add"]');
    if (variacaoAdd) { openVariacaoForm("novo"); return; }

    var variacaoRow = e.target.closest("[data-variacao-row-id]");
    if (variacaoRow && e.target.tagName !== "INPUT") { openVariacaoForm("editar", variacaoRow.dataset.variacaoRowId); return; }

    var pickVariacaoEssencia = e.target.closest("[data-pick-variacao-essencia-id]");
    if (pickVariacaoEssencia) { variacaoFormEssenciaId = pickVariacaoEssencia.dataset.pickVariacaoEssenciaId || null; renderVariacaoFormEssenciaList(); return; }

    var variacaoFormSave = e.target.closest('[data-action="variacao-form-save"]');
    if (variacaoFormSave) { submitVariacaoForm(); return; }

    var variacaoFormRemove = e.target.closest('[data-action="variacao-form-remove"]');
    if (variacaoFormRemove) { removeVariacao(); return; }

    // password show/hide
    var eyeBtn = e.target.closest('[aria-label="Mostrar senha"], [aria-label="Ocultar senha"]');
    if (eyeBtn) {
      var pwd = eyeBtn.closest(".field").querySelector("input");
      if (pwd) {
        var showing = pwd.type === "text";
        pwd.type = showing ? "password" : "text";
        eyeBtn.setAttribute("aria-label", showing ? "Mostrar senha" : "Ocultar senha");
      }
      return;
    }

    // toggle switches (role=switch)
    var sw = e.target.closest('[role="switch"]');
    if (sw) {
      var on = sw.getAttribute("aria-checked") === "true";
      setSwitchVisual(sw, !on);
      if (sw.dataset.canal) {
        configState.avisoCanais = configState.avisoCanais || {};
        configState.avisoCanais[sw.dataset.canal] = !on;
        saveConfigState();
      } else if (sw.hasAttribute("data-tema-toggle")) {
        setTema(!on ? "escuro" : "claro");
      }
      return;
    }

    // ---- Estoque de insumos ----
    var estAdd = e.target.closest('[data-action="estoque-add"]');
    if (estAdd) { openForm("novo"); return; }

    var estEdit = e.target.closest('[data-action="estoque-edit"], [data-action="detalhe-edit"]');
    if (estEdit) {
      var editId = estEdit.dataset.action === "detalhe-edit" ? currentInsumoId : estEdit.closest("[data-insumo-id]").dataset.insumoId;
      openForm("editar", editId);
      return;
    }

    var estRow = e.target.closest("[data-insumo-id]");
    if (estRow) { openDetalhe(estRow.dataset.insumoId); return; }

    var movAdd = e.target.closest('[data-action="mov-add"]');
    if (movAdd) { openMovimentar(currentInsumoId, "entrada"); return; }

    var movEntradaBtn = e.target.closest('[data-action="mov-entrada"]');
    if (movEntradaBtn) { openMovimentar(currentInsumoId, "entrada"); return; }

    var movSaidaBtn = e.target.closest('[data-action="mov-saida"]');
    if (movSaidaBtn) { openMovimentar(currentInsumoId, "saida"); return; }

    var tipoPill = e.target.closest("#estoqueMovimentar [data-tipo]");
    if (tipoPill) { setMovTipo(tipoPill.dataset.tipo); return; }

    var motivoPill = e.target.closest("#movMotivoPills [data-motivo]");
    if (motivoPill) { setMotivoPill(motivoPill.dataset.motivo); return; }

    var unitPill = e.target.closest("#formUnitPills [data-unit]");
    if (unitPill) { setFormUnit(unitPill.dataset.unit); return; }

    var movSubmit = e.target.closest('[data-action="mov-submit"]');
    if (movSubmit) { if (!movSubmit.hasAttribute("disabled")) submitMovimentacao(); return; }

    var formSave = e.target.closest('[data-action="form-save"]');
    if (formSave) { submitForm(); return; }

    var formRemove = e.target.closest('[data-action="form-remove"]');
    if (formRemove) { removeInsumo(); return; }

    // ---- Estoque: alternância de abas (Insumos / Velas / Catálogo / Reposição) ----
    var estTab = e.target.closest('.screen[data-screen="estoque"] [data-esttab]');
    if (estTab) { setEstoqueTab(estTab.dataset.esttab); return; }

    // ---- Estoque de produção (velas prontas) ----
    var velaRow = e.target.closest("[data-vela-id]");
    if (velaRow) { openVelasAjustar(velaRow.dataset.velaId, "entrada"); return; }

    var velaTipoPill = e.target.closest('.screen[data-screen="estoqueVelasAjustar"] [data-velatipo]');
    if (velaTipoPill) { setVelaMovTipo(velaTipoPill.dataset.velatipo); return; }

    var velaMotivoPill = e.target.closest('#velaMotivoPills [data-velamotivo]');
    if (velaMotivoPill) { setVelaMotivoPill(velaMotivoPill.dataset.velamotivo); return; }

    var velaSubmit = e.target.closest('[data-action="vela-submit"]');
    if (velaSubmit) { if (!velaSubmit.hasAttribute("disabled")) submitVelasAjuste(); return; }

    // ---- Calculadora de velas (Produção) ----
    var calcVarField = e.target.closest('[data-action="calc-open-variacao"]');
    if (calcVarField) { renderVariacaoPicker(); showScreen("producaoVariacao"); return; }

    var pickVariacao = e.target.closest("[data-pick-variacao-id]");
    if (pickVariacao) { currentCalcVariacaoId = pickVariacao.dataset.pickVariacaoId; renderCalcInsumos(); showScreen("producao1"); return; }

    var calcAdjustToggle = e.target.closest('[data-action="calc-adjust-toggle"]');
    if (calcAdjustToggle) { calcAdjusting = !calcAdjusting; renderCalcInsumos(); return; }

    var calcSaveDefault = e.target.closest('[data-action="calc-save-default"]');
    if (calcSaveDefault) { saveCalcAsDefault(); return; }

    // ---- Calculadora de lucro + registro de produção ----
    var verLucro = e.target.closest('[data-action="calc-ver-lucro"]');
    if (verLucro) { renderLucro(); showScreen("producao2"); return; }

    var registrar = e.target.closest('[data-action="registrar-lote"]');
    if (registrar) { if (!registrar.hasAttribute("disabled")) registrarLote(); return; }

    var loteDelete = e.target.closest('[data-action="lote-delete"]');
    if (loteDelete) { deleteLote(loteDelete.dataset.loteId); return; }

    var loteExportCsv = e.target.closest('[data-action="lote-export-csv"]');
    if (loteExportCsv) { exportLotesCSV(); return; }

    var loteExportPdf = e.target.closest('[data-action="lote-export-pdf"]');
    if (loteExportPdf) { window.print(); return; }

    // ---- Aviso de reposição ----
    var goRepos = e.target.closest('[data-action="go-reposicao"]');
    if (goRepos) { showScreen("estoque"); setEstoqueTab("reposicao"); return; }

    var notifyBtn = e.target.closest('[data-action="reposicao-notificar"]');
    if (notifyBtn) { sendReposicaoNotification(); return; }

    // segmented pill groups: clicking a pill activates it among its siblings
    var pill = e.target.closest(".pill");
    if (pill && pill.parentElement) {
      var siblings = pill.parentElement.querySelectorAll(".pill");
      siblings.forEach(function(p){ p.classList.remove("active"); });
      pill.classList.add("active");
      return;
    }

    // quantity stepper (Produção · passo 1)
    var stepBtn = e.target.closest('[aria-label="Aumentar quantidade"], [aria-label="Diminuir quantidade"]');
    if (stepBtn) {
      var out = stepBtn.parentElement.children[1];
      var n = parseInt(out.textContent, 10) || 0;
      n += stepBtn.getAttribute("aria-label") === "Aumentar quantidade" ? 1 : (n > 1 ? -1 : 0);
      out.textContent = n;
      currentCalcQty = n;
      renderCalcInsumos();
      return;
    }
  });

  document.addEventListener("input", function(e){
    if (e.target.id === "estoqueSearchInput") { renderEstoqueList(); return; }
    if (e.target.id === "movQtdEntrada" || e.target.id === "movPreco" || e.target.id === "movQtdSaida") { updateMovPreview(); return; }
    if (e.target.id === "velaMovQtd") { updateVelasPreview(); return; }
    if (e.target.id === "vendaClienteSearchInput") { renderVendaClientePickerList(); return; }
    if (e.target.id === "vendaHistClienteInput") { renderVendaHistorico(); return; }
    if (e.target.id === "cfgJarraCap" || e.target.id === "cfgPerda") {
      onConfigInput(e.target.id, e.target.value);
      return;
    }
    if (e.target.classList.contains("cfg-receita-input")) {
      var receitaItem = findReceitaItem(e.target.dataset.receitaItemId);
      if (receitaItem) { receitaItem.qtdPorVela = strToNum(e.target.value); saveConfigState(); renderCalcInsumos(); }
      return;
    }
    if (e.target.classList.contains("calc-adjust-input")) {
      var role = e.target.dataset.insumo;
      calcAdjustPct[role] = strToNum(e.target.value);
      renderCalcInsumos();
      var el = document.querySelector('.calc-adjust-input[data-insumo="' + role + '"]');
      if (el) { el.focus(); var v = el.value; try { el.setSelectionRange(v.length, v.length); } catch (e2) {} }
      return;
    }
    if (e.target.classList.contains("cfg-preco-input")) {
      var v2 = findVariacao(e.target.dataset.variacaoId);
      if (v2) { v2.precoVenda = strToNum(e.target.value); saveCatalogoState(); renderCustos(); }
      return;
    }
    if (e.target.id === "clientesSearchInput") { renderClientesList(); return; }
    if (e.target.id === "vendaCupomInput") { renderVendaNova(); return; }
    if (e.target.id === "custosRateioInput") {
      custosState.rateioBase = Math.max(0, strToNum(e.target.value));
      saveCustosState();
      renderCustos();
      var rEl = document.getElementById("custosRateioInput");
      if (rEl) { rEl.focus(); var rv = rEl.value; try { rEl.setSelectionRange(rv.length, rv.length); } catch (e3) {} }
      return;
    }
    if (e.target.id === "loginEmail" || e.target.id === "loginSenha") {
      var loginErr = document.getElementById("loginError");
      if (loginErr) loginErr.hidden = true;
      return;
    }
    if (e.target.id === "signupEmail" || e.target.id === "signupSenha" || e.target.id === "signupSenhaConfirm") {
      var signupErr = document.getElementById("signupError");
      if (signupErr) signupErr.hidden = true;
      return;
    }
  });

  renderEstoqueList();
  renderConfigForm();
  renderCalcInsumos();
  renderClientesList();
  renderVendaNova();
  renderVendaEncomendas();
  renderVendaHistorico();
  renderCupomList();
  renderCustos();
  refreshAvisos();
  checkAuthAndInit();
})();
