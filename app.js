(function(){
  "use strict";

  // ================================================================
  // Navegação entre telas do .app-frame (dashboard / reposição / mais)
  // ================================================================
  function resetScroll(el){
    el.scrollTop = 0;
    var contentEl = el.querySelector(".content");
    if (contentEl) contentEl.scrollTop = 0;
  }

  var prefersReducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Skeleton de carregamento ao entrar numa tela pelo dock — referência: exemplo "loaders"
  // do motion.dev (skeleton pulsante → revelação do conteúdo real). O conteúdo do app é
  // sempre local/instantâneo, então isto é puro efeito de polimento, não uma espera real —
  // por isso pula inteiro com prefers-reduced-motion. Cada .skel-overlay já existe pronto
  // no HTML (ver index.html); telas sem um simplesmente não fazem nada aqui.
  function playScreenSkeleton(target){
    var overlay = target.querySelector(".skel-overlay");
    if (!overlay || prefersReducedMotion) return;
    overlay.classList.remove("skel-out");
    overlay.hidden = false;
    window.setTimeout(function(){
      overlay.classList.add("skel-out");
      window.setTimeout(function(){
        overlay.hidden = true;
        overlay.classList.remove("skel-out");
      }, 340);
    }, 480);
  }

  function currentScreen(){
    var visible = document.querySelector(".screen:not([hidden]):not(.screen-exit)") || document.querySelector(".screen:not([hidden])");
    return visible ? visible.dataset.screen : null;
  }

  function showScreen(name){
    // O dock existe em 3 telas — recalculado aqui (a partir do nome-alvo, não do estado do
    // DOM) toda vez que a tela muda, então nunca fica com o item ativo desatualizado.
    refreshAllDocks(name);

    var target = document.querySelector('.screen[data-screen="' + name + '"]');
    if (!target) return;
    var current = document.querySelector(".screen:not([hidden])");
    if (current === target) { resetScroll(target); return; }

    try { history.replaceState(null, "", "#" + name); } catch (e) {}

    if (prefersReducedMotion) {
      document.querySelectorAll(".screen").forEach(function(el){ el.hidden = el !== target; });
      resetScroll(target);
      return;
    }

    resetScroll(target);
    target.hidden = false;
    target.style.zIndex = "2";
    if (current) current.style.zIndex = "1";
    playScreenSkeleton(target);

    target.classList.add("screen-enter");
    void target.offsetWidth;
    requestAnimationFrame(function(){
      target.classList.remove("screen-enter");
      if (current) current.classList.add("screen-exit");
    });

    window.setTimeout(function(){
      document.querySelectorAll(".screen").forEach(function(el){
        if (el !== target) el.hidden = true;
        el.classList.remove("screen-exit");
        el.style.zIndex = "";
      });
    }, 220);
  }

  function showAuthScreen(name){
    document.querySelectorAll(".auth-screen").forEach(function(s){ s.hidden = s.dataset.authscreen !== name; });
  }

  // ================================================================
  // Utilitários gerais (mesma convenção do histórico do app)
  // ================================================================
  var MESES = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
  var MESES_LONGOS = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
  var DIAS_SEMANA = ["domingo","segunda","terça","quarta","quinta","sexta","sábado"];

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
  function todayISO(){
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  // Data relativa a hoje — usada pro seed de dados de exemplo, pra ele nunca ficar com
  // datas paradas no passado (ou no futuro) conforme os dias forem passando de verdade.
  function offsetISO(dias){
    var d = new Date();
    d.setDate(d.getDate() + dias);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function formatDateBR(iso){
    var p = iso.split("-");
    return parseInt(p[2], 10) + " " + MESES[parseInt(p[1], 10) - 1] + " " + p[0];
  }
  function formatDataCompleta(iso){
    var d = new Date(iso + "T00:00:00");
    return DIAS_SEMANA[d.getDay()] + ", " + d.getDate() + " de " + MESES_LONGOS[d.getMonth()];
  }
  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, function(c){
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function setText(id, text){
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }
  function greetingForNow(){
    var h = new Date().getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  }
  function firstName(nome){
    return (nome || "").trim().split(/\s+/)[0] || "";
  }
  // Estado vazio compartilhado ("você ainda não tem nada aqui") — icon circle, título,
  // uma linha de contexto. Ver .emptystate* em style.css.
  function emptyStateHTML(opts){
    return "" +
      '<div class="emptystate">' +
        '<div class="emptystate-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + opts.icon + '</svg></div>' +
        '<div class="emptystate-title">' + opts.title + '</div>' +
        '<div class="emptystate-sub">' + opts.sub + '</div>' +
      '</div>';
  }
  // Toast leve pros itens do dock que ainda não têm uma tela de verdade por trás.
  var toastTimer = null;
  function showToast(msg){
    var el = document.getElementById("toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("show");
    if (toastTimer) window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function(){ el.classList.remove("show"); }, 2200);
  }

  // ================================================================
  // Conta / sessão / tema — módulo 9
  // Conta local: e-mail, nome e senha ficam salvos só neste navegador (sem backend/sync
  // entre aparelhos — escolha explícita, não limitação escondida). "Manter conectado neste
  // dispositivo" desmarcado guarda a sessão só em sessionStorage (some ao fechar a aba) em
  // vez de localStorage — é o que a caixinha promete, não só um enfeite visual.
  // ================================================================
  var CONTA_KEY = "pp_conta_v1";
  var SESSAO_KEY = "pp_sessao_v1";
  var TEMA_KEY = "pp_tema_v1";

  function loadContaState(){
    try {
      var raw = localStorage.getItem(CONTA_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed.criada === "boolean") return parsed;
      }
    } catch (e) {}
    return { criada: false, email: "", senha: "", nome: "" };
  }
  function saveContaState(){
    try { localStorage.setItem(CONTA_KEY, JSON.stringify(contaState)); } catch (e) {}
  }
  function loadSessaoState(){
    try {
      var raw = localStorage.getItem(SESSAO_KEY) || sessionStorage.getItem(SESSAO_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed.logado === "boolean") return parsed;
      }
    } catch (e) {}
    return { logado: false, lembrar: true };
  }
  function saveSessaoState(){
    try {
      if (sessaoState.lembrar) {
        localStorage.setItem(SESSAO_KEY, JSON.stringify(sessaoState));
        sessionStorage.removeItem(SESSAO_KEY);
      } else {
        sessionStorage.setItem(SESSAO_KEY, JSON.stringify(sessaoState));
        localStorage.removeItem(SESSAO_KEY);
      }
    } catch (e) {}
  }
  var contaState = loadContaState();
  var sessaoState = loadSessaoState();

  function loadTema(){
    try { return localStorage.getItem(TEMA_KEY) === "claro" ? "claro" : "escuro"; } catch (e) { return "escuro"; }
  }
  function applyTema(tema){
    document.documentElement.setAttribute("data-theme", tema === "claro" ? "light" : "dark");
    var dot = document.getElementById("temaSwitchDot");
    if (dot) dot.style.transform = tema === "claro" ? "translateX(19px)" : "translateX(0)";
  }
  var temaState = loadTema();
  applyTema(temaState);
  function setTema(tema){
    temaState = tema === "claro" ? "claro" : "escuro";
    applyTema(temaState);
    try { localStorage.setItem(TEMA_KEY, temaState); } catch (e) {}
  }

  // ================================================================
  // Alternador computador/celular — força o layout do app-frame independente da largura
  // real da janela (ver html[data-preview="..."] em style.css), pra dar pra comparar os
  // dois formatos sem redimensionar o navegador. Sem preferência salva, detecta uma vez
  // pela largura real da tela; depois disso guarda a escolha da pessoa, igual ao tema.
  // ================================================================
  var PREVIEW_KEY = "pp_preview_v1";
  function loadPreview(){
    try {
      var saved = localStorage.getItem(PREVIEW_KEY);
      if (saved === "desktop" || saved === "mobile") return saved;
    } catch (e) {}
    var telaLarga = window.matchMedia && window.matchMedia("(min-width:900px)").matches;
    return telaLarga ? "desktop" : "mobile";
  }
  function applyPreview(modo){
    document.documentElement.setAttribute("data-preview", modo);
    document.querySelectorAll("[data-preview-set]").forEach(function(btn){
      btn.setAttribute("aria-pressed", btn.dataset.previewSet === modo ? "true" : "false");
    });
  }
  var previewState = loadPreview();
  applyPreview(previewState);
  function setPreview(modo){
    previewState = modo === "desktop" ? "desktop" : "mobile";
    applyPreview(previewState);
    try { localStorage.setItem(PREVIEW_KEY, previewState); } catch (e) {}
  }

  function submitSignup(){
    var nome = document.getElementById("signupNome").value.trim();
    var email = document.getElementById("signupEmail").value.trim();
    var senha = document.getElementById("signupSenha").value;
    var senha2 = document.getElementById("signupSenhaConfirm").value;
    var aceiteRow = document.getElementById("signupAceiteRow");
    var aceite = aceiteRow && aceiteRow.getAttribute("aria-pressed") === "true";
    var errEl = document.getElementById("signupError");
    function fail(msg){ if (errEl) { errEl.hidden = false; errEl.textContent = msg; } }
    if (!nome) { fail("diz seu nome, pra gente saber como te chamar."); return; }
    if (!email || email.indexOf("@") === -1) { fail("digite um e-mail válido."); return; }
    if (senha.length < 6) { fail("a senha precisa ter pelo menos 6 caracteres."); return; }
    if (senha !== senha2) { fail("as senhas não coincidem."); return; }
    if (!aceite) { fail("você precisa aceitar as regras internas de uso pra continuar."); return; }
    if (errEl) errEl.hidden = true;
    contaState = { criada: true, email: email, senha: senha, nome: nome };
    saveContaState();
    sessaoState = { logado: true, lembrar: true };
    saveSessaoState();
    enterAppWithWelcome();
  }

  function submitLogin(){
    var email = document.getElementById("loginEmail").value.trim();
    var senha = document.getElementById("loginSenha").value;
    var lembrarRow = document.getElementById("loginLembrarRow");
    var lembrar = lembrarRow ? lembrarRow.getAttribute("aria-pressed") === "true" : true;
    var errEl = document.getElementById("loginError");
    function fail(msg){ if (errEl) { errEl.hidden = false; errEl.textContent = msg; } }
    if (!contaState.criada) { fail("nenhuma conta encontrada neste aparelho — crie a conta da loja."); return; }
    if (email.toLowerCase() !== contaState.email.toLowerCase() || senha !== contaState.senha) { fail("e-mail ou senha incorretos."); return; }
    if (errEl) errEl.hidden = true;
    sessaoState = { logado: true, lembrar: lembrar };
    saveSessaoState();
    enterAppWithWelcome();
  }

  function logout(){
    sessaoState = { logado: false, lembrar: true };
    try { localStorage.removeItem(SESSAO_KEY); } catch (e) {}
    try { sessionStorage.removeItem(SESSAO_KEY); } catch (e) {}
    var authEl = document.getElementById("authView");
    var frame = document.querySelector(".app-frame");
    showAuthScreen("login");
    if (authEl) authEl.hidden = false;
    if (frame) frame.hidden = true;
  }

  function enterApp(){
    var authEl = document.getElementById("authView");
    var frame = document.querySelector(".app-frame");
    if (authEl) authEl.hidden = true;
    if (frame) frame.hidden = false;
    showScreen("dashboard");
    renderDashboard();
  }

  // Gradiente de boas-vindas (mesh de blobs, ver #welcomeGradient em index.html/style.css) —
  // cobre a tela cheia (mobile e computador, é o mesmo overlay pros dois) enquanto a troca
  // #authView → .app-frame acontece por baixo, pra ela nunca aparecer "crua". Só entra na
  // conta recém-logada/criada (submitLogin/submitSignup) — a restauração silenciosa de
  // sessão em checkAuthAndInit continua chamando enterApp() direto, sem o efeito, pra não
  // repetir a animação a cada recarregamento de página.
  function enterAppWithWelcome(){
    var el = document.getElementById("welcomeGradient");
    if (!el || prefersReducedMotion) { enterApp(); return; }
    el.classList.add("show");
    window.setTimeout(function(){
      enterApp();
      window.setTimeout(function(){ el.classList.remove("show"); }, 750);
    }, 550);
  }

  function checkAuthAndInit(){
    if (contaState.criada && sessaoState.logado) {
      enterApp();
    } else {
      showAuthScreen("login");
    }
  }

  // ================================================================
  // Estoque de insumos — módulo 1
  // ================================================================
  var ESTOQUE_KEY = "pp_estoque_v1";
  function defaultEstoqueState(){
    return {
      insumos: [
        { id: "i1", nome: "Cera de soja", unidade: "kg", quantidade: 2.4, custoMedio: 28.10, minimo: 5 },
        { id: "i2", nome: "Essência Pera e Fresia", unidade: "ml", quantidade: 480, custoMedio: 0.19, minimo: 200 },
        { id: "i3", nome: "Essência Lavanda", unidade: "ml", quantidade: 310, custoMedio: 0.21, minimo: 200 },
        { id: "i4", nome: "Jarra 180 ml", unidade: "un", quantidade: 96, custoMedio: 4.80, minimo: 40 },
        { id: "i5", nome: "Pavio algodão", unidade: "un", quantidade: 210, custoMedio: 0.42, minimo: 200 }
      ],
      movimentacoes: [
        { id: "m1", insumoId: "i1", tipo: "entrada", quantidade: 10, valor: 281.00, data: offsetISO(-9) },
        { id: "m2", insumoId: "i1", tipo: "saida", quantidade: 2.2, valor: 61.82, motivo: "Produção", data: offsetISO(-16) },
        { id: "m3", insumoId: "i1", tipo: "entrada", quantidade: 5, valor: 142.50, data: offsetISO(-27) },
        { id: "m4", insumoId: "i2", tipo: "entrada", quantidade: 200, valor: 38.00, data: todayISO() }
      ]
    };
  }
  function loadEstoqueState(){
    try {
      var raw = localStorage.getItem(ESTOQUE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.insumos) && Array.isArray(parsed.movimentacoes)) return parsed;
      }
    } catch (e) {}
    return defaultEstoqueState();
  }
  function saveEstoqueState(){
    try { localStorage.setItem(ESTOQUE_KEY, JSON.stringify(estoqueState)); } catch (e) {}
  }
  var estoqueState = loadEstoqueState();
  function findInsumo(id){
    for (var i = 0; i < estoqueState.insumos.length; i++) if (estoqueState.insumos[i].id === id) return estoqueState.insumos[i];
    return null;
  }

  // ================================================================
  // Catálogo de produtos (variações: cheiro + cor) — módulo 0
  // ================================================================
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

  // ================================================================
  // Estoque de produção (velas prontas, por variação) — módulo 2/3
  // ================================================================
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
  function findEstoqueVela(variacaoId){
    for (var i = 0; i < producaoEstoqueState.estoques.length; i++) if (producaoEstoqueState.estoques[i].variacaoId === variacaoId) return producaoEstoqueState.estoques[i];
    return null;
  }

  // ================================================================
  // Registro de produção (lotes) — módulo 6
  // ================================================================
  var LOTES_KEY = "pp_lotes_v1";
  function defaultLotesState(){
    return {
      lotes: [
        { id: "l1", data: todayISO(), variacaoId: "v1", quantidade: 24, custoTotal: 180.00, receitaTotal: 1896.00,
          insumosUsados: [{ insumoId: "i1", nome: "Cera de soja", quantidade: 2.4, unidade: "kg" }, { insumoId: "i2", nome: "Essência Pera e Fresia", quantidade: 96, unidade: "ml" }] },
        { id: "l2", data: offsetISO(-6), variacaoId: "v2", quantidade: 12, custoTotal: 95.00, receitaTotal: 948.00,
          insumosUsados: [{ insumoId: "i1", nome: "Cera de soja", quantidade: 1.2, unidade: "kg" }, { insumoId: "i3", nome: "Essência Lavanda", quantidade: 48, unidade: "ml" }] },
        { id: "l3", data: offsetISO(-13), variacaoId: "v1", quantidade: 16, custoTotal: 120.00, receitaTotal: 1264.00,
          insumosUsados: [{ insumoId: "i1", nome: "Cera de soja", quantidade: 1.6, unidade: "kg" }, { insumoId: "i2", nome: "Essência Pera e Fresia", quantidade: 64, unidade: "ml" }] }
      ]
    };
  }
  function loadLotesState(){
    try {
      var raw = localStorage.getItem(LOTES_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.lotes)) return parsed;
      }
    } catch (e) {}
    return defaultLotesState();
  }
  function saveLotesState(){
    try { localStorage.setItem(LOTES_KEY, JSON.stringify(lotesState)); } catch (e) {}
  }
  var lotesState = loadLotesState();

  // ================================================================
  // Cadastro de cupom — sub-área de Vendas
  // ================================================================
  var CUPONS_KEY = "pp_cupons_v1";
  function defaultCuponsState(){
    return { cupons: [
      { id: "c1", codigo: "PAUSA10", tipo: "percentual", valor: 10, escopo: "todas", dataInicio: offsetISO(-30), dataValidade: offsetISO(60), limiteUso: 0, usosCount: 1, ativo: true }
    ] };
  }
  function loadCuponsState(){
    try {
      var raw = localStorage.getItem(CUPONS_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.cupons)) return parsed;
      }
    } catch (e) {}
    return defaultCuponsState();
  }
  function saveCuponsState(){
    try { localStorage.setItem(CUPONS_KEY, JSON.stringify(cuponsState)); } catch (e) {}
  }
  var cuponsState = loadCuponsState();

  // ================================================================
  // Controle de vendas — módulo 11
  // ================================================================
  var VENDAS_KEY = "pp_vendas_v1";
  function defaultVendasState(){
    return {
      vendas: [
        { id: "vd1", clienteId: null, clienteNome: "Marina Duarte",
          itens: [{ variacaoId: "v1", quantidade: 3, precoUnit: 79, precoTabela: 79 }],
          formaPagamento: "pix", data: todayISO(), subtotal: 237, cupomCodigo: null, cupomDesconto: 0, total: 237,
          status: "confirmada", origemEncomendaId: null },
        { id: "vd2", clienteId: null, clienteNome: "Cliente avulso",
          itens: [{ variacaoId: "v2", quantidade: 2, precoUnit: 79, precoTabela: 79 }, { variacaoId: "v3", quantidade: 1, precoUnit: 79, precoTabela: 79 }],
          formaPagamento: "cartao", data: offsetISO(-1), subtotal: 237, cupomCodigo: "PAUSA10", cupomDesconto: 23.7, total: 213.3,
          status: "confirmada", origemEncomendaId: null },
        { id: "vd3", clienteId: null, clienteNome: "Bianca Ferreira",
          itens: [{ variacaoId: "v1", quantidade: 4, precoUnit: 79, precoTabela: 79 }],
          formaPagamento: "pix", data: offsetISO(-2), subtotal: 316, cupomCodigo: null, cupomDesconto: 0, total: 316,
          status: "confirmada", origemEncomendaId: null },
        { id: "vd4", clienteId: null, clienteNome: "Cliente avulso",
          itens: [{ variacaoId: "v3", quantidade: 1, precoUnit: 79, precoTabela: 79 }],
          formaPagamento: "dinheiro", data: offsetISO(-3), subtotal: 79, cupomCodigo: null, cupomDesconto: 0, total: 79,
          status: "cancelada", origemEncomendaId: null },
        { id: "vd5", clienteId: null, clienteNome: "Cliente avulso",
          itens: [{ variacaoId: "v4", quantidade: 3, precoUnit: 79, precoTabela: 79 }],
          formaPagamento: "pix", data: offsetISO(-4), subtotal: 237, cupomCodigo: null, cupomDesconto: 0, total: 237,
          status: "confirmada", origemEncomendaId: null },
        { id: "vd6", clienteId: null, clienteNome: "Marina Duarte",
          itens: [{ variacaoId: "v2", quantidade: 2, precoUnit: 79, precoTabela: 79 }],
          formaPagamento: "pix", data: offsetISO(-6), subtotal: 158, cupomCodigo: null, cupomDesconto: 0, total: 158,
          status: "confirmada", origemEncomendaId: null },
        { id: "vd7", clienteId: null, clienteNome: "Cliente avulso",
          itens: [{ variacaoId: "v1", quantidade: 2, precoUnit: 79, precoTabela: 79 }],
          formaPagamento: "cartao", data: offsetISO(-20), subtotal: 158, cupomCodigo: null, cupomDesconto: 0, total: 158,
          status: "confirmada", origemEncomendaId: null }
      ],
      encomendas: []
    };
  }
  function loadVendasState(){
    try {
      var raw = localStorage.getItem(VENDAS_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.vendas) && Array.isArray(parsed.encomendas)) return parsed;
      }
    } catch (e) {}
    return defaultVendasState();
  }
  function saveVendasState(){
    try { localStorage.setItem(VENDAS_KEY, JSON.stringify(vendasState)); } catch (e) {}
  }
  var vendasState = loadVendasState();

  // ================================================================
  // Controle de custos — módulo 12
  // Custo real por vela soma o custo médio de insumo (dos lotes já registrados) com a
  // fatia rateada dos custos fixos, dividida pela produção mensal estimada (rateioBase).
  // "Lucro líquido real" no Dashboard vem daqui, não da Calculadora de Lucro (que só
  // calcula a margem de UM lote na hora, sem custo fixo nenhum).
  // ================================================================
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
  function custoFixoTotal(){
    return round2(custosState.fixos.reduce(function(sum, c){ return sum + (c.valor || 0); }, 0));
  }
  function custoInsumoPorVela(){
    var custoSoma = 0, qtdSoma = 0;
    lotesState.lotes.forEach(function(l){ custoSoma += l.custoTotal; qtdSoma += l.quantidade; });
    return qtdSoma > 0 ? (custoSoma / qtdSoma) : 0;
  }
  function custoFixoPorVela(){
    var base = custosState.rateioBase || 0;
    return base > 0 ? (custoFixoTotal() / base) : 0;
  }

  // ================================================================
  // Seletor único de período — 7 dias / 30 dias / personalizado
  // Alimenta ao mesmo tempo total de vendas, receita real e lucro líquido real (sem
  // telas duplicadas por métrica). Datas app inteiro são strings "YYYY-MM-DD", então dá
  // pra comparar período por ordem alfabética direto, sem lidar com fuso de Date.
  // ================================================================
  var periodoState = { modo: "7", inicioISO: null, fimISO: null };

  function computePeriodoRange(){
    if (periodoState.modo === "custom" && periodoState.inicioISO && periodoState.fimISO) {
      return { inicio: periodoState.inicioISO, fim: periodoState.fimISO };
    }
    var dias = periodoState.modo === "30" ? 30 : 7;
    return { inicio: offsetISO(-(dias - 1)), fim: todayISO() };
  }
  function isInPeriodo(iso){
    if (!iso) return false;
    var r = computePeriodoRange();
    return iso >= r.inicio && iso <= r.fim;
  }
  function diasEntre(iso1, iso2){
    return Math.round((new Date(iso2 + "T00:00:00") - new Date(iso1 + "T00:00:00")) / 86400000) + 1;
  }
  // Custo fixo é uma cifra mensal — pra um período de 7 dias não fazer sentido debitar o
  // mês inteiro, ele é rateado pela fração de 30 dias que o período cobre.
  function computeCustoFixoPeriodo(){
    var r = computePeriodoRange();
    return round2(custoFixoTotal() * (diasEntre(r.inicio, r.fim) / 30));
  }
  function periodoLabelText(){
    if (periodoState.modo === "7") return "últimos 7 dias";
    if (periodoState.modo === "30") return "últimos 30 dias";
    var r = computePeriodoRange();
    return formatDateBR(r.inicio) + " até " + formatDateBR(r.fim);
  }

  // Total de vendas − cupons aplicados − vendas canceladas/estornadas: v.total já é
  // (subtotal − cupomDesconto), e o filtro por status="confirmada" já tira as canceladas.
  function computeReceitaReal(){
    return round2(vendasState.vendas.filter(function(v){ return v.status === "confirmada" && isInPeriodo(v.data); })
      .reduce(function(sum, v){ return sum + v.total; }, 0));
  }
  function computeTotalVendasBruto(){
    return round2(vendasState.vendas.filter(function(v){ return v.status === "confirmada" && isInPeriodo(v.data); })
      .reduce(function(sum, v){ return sum + (typeof v.subtotal === "number" ? v.subtotal : v.total); }, 0));
  }
  function computeCustoInsumosPeriodo(){
    return round2(lotesState.lotes.filter(function(l){ return isInPeriodo(l.data); })
      .reduce(function(sum, l){ return sum + l.custoTotal; }, 0));
  }
  function computeLucroLiquidoReal(){
    return round2(computeReceitaReal() - computeCustoInsumosPeriodo() - computeCustoFixoPeriodo());
  }
  function computeVendasPorVariacao(){
    var map = {};
    vendasState.vendas.forEach(function(v){
      if (v.status !== "confirmada" || !isInPeriodo(v.data)) return;
      v.itens.forEach(function(it){ map[it.variacaoId] = (map[it.variacaoId] || 0) + it.quantidade; });
    });
    var arr = Object.keys(map).map(function(id){ return { variacaoId: id, label: variacaoLabel(findVariacao(id)), qty: map[id] }; });
    arr.sort(function(a, b){ return b.qty - a.qty; });
    return arr;
  }

  // ================================================================
  // Aviso de reposição (insumos + velas prontas abaixo do mínimo) — módulo 7
  // ================================================================
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
    return '<div class="raised-sm avisos-row" style="padding:15px 16px;margin-bottom:11px;">' +
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

  // Animação de entrada da lista de avisos ao clicar no sino (dashAvisosBtn → go-reposicao):
  // referência: componente <ListNotificationsStack> do motion.dev/ui/lists — os cards entram
  // empilhados uns sob os outros (escala e opacidade menores por profundidade, mesmos passos
  // do preview original: scaleStep .10, dimStep .40) e se abrem em cascata até a posição real
  // da lista. Puro efeito de entrada, sem dado novo — por isso pula com prefers-reduced-motion.
  function playAvisosStackReveal(listEl){
    if (prefersReducedMotion) return;
    var rows = listEl.querySelectorAll(".avisos-row");
    if (rows.length < 2) return;
    var topOffset = rows[0].offsetTop;
    rows.forEach(function(row, i){
      row.style.transitionDelay = (i * 45) + "ms";
      row.style.transform = "translateY(" + (topOffset - row.offsetTop) + "px) scale(" + Math.max(1 - i * 0.10, 0.6) + ")";
      row.style.opacity = String(Math.max(1 - i * 0.40, 0.15));
    });
    void listEl.offsetWidth;
    requestAnimationFrame(function(){
      rows.forEach(function(row){
        row.style.transform = "";
        row.style.opacity = "";
      });
    });
  }

  function renderReposicaoPanel(){
    var items = computeReposicaoItems();
    var listEl = document.getElementById("reposicaoList");
    if (listEl) {
      listEl.innerHTML = items.length ? items.map(reposicaoRowHTML).join("") : emptyStateHTML({
        icon: '<path d="m5 12 5 5 9-9"/>',
        title: "tudo certo por aqui",
        sub: "nenhum insumo ou vela pronta abaixo do mínimo cadastrado."
      });
      playAvisosStackReveal(listEl);
    }
    var countEl = document.getElementById("reposicaoCount");
    if (countEl) countEl.textContent = items.length + (items.length === 1 ? " item abaixo do mínimo, em ordem de prioridade" : " itens abaixo do mínimo, em ordem de prioridade");
  }

  function renderDashboardAvisos(){
    var items = computeReposicaoItems();
    var badgeEl = document.getElementById("dashAvisosBadge");
    var btnEl = document.getElementById("dashAvisosBtn");
    var bannerEl = document.getElementById("dashUrgentBanner");
    var bannerTextEl = document.getElementById("dashUrgentText");
    var bannerMoreEl = document.getElementById("dashUrgentMore");
    if (badgeEl) { badgeEl.hidden = items.length === 0; badgeEl.textContent = items.length; }
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

  // ================================================================
  // Dashboard — resumo de hoje, período, lucro/receita/vendas, pizza por variação
  // ================================================================
  var ICON_PRODUCAO = '<path d="M12 3c-3 4-5.2 6.4-5.2 9.4A5.2 5.2 0 0 0 12 21a5.2 5.2 0 0 0 5.2-5.2c0-1.2-.4-2.1-1.1-2.8.1 1-.3 2-1.1 2.5.4-2.1-1-3.6-3-6.5z"/>';
  var ICON_INSUMOS = '<rect x="4" y="4" width="16" height="5" rx="1.2"/><rect x="4" y="11" width="16" height="9" rx="1.2"/><path d="M9 15h6"/>';
  var ICON_VENDAS = '<path d="M6 8h12l1 12H5L6 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>';

  function resumoRowHTML(iconPath, titulo, detalhe, isLast){
    return '<div class="resumo-row' + (isLast ? " resumo-row-last" : "") + '">' +
        '<div class="raised-sm resumo-row-icon">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + iconPath + '</svg>' +
        '</div>' +
        '<div style="flex:1;">' +
          '<div class="resumo-row-title">' + escapeHtml(titulo) + '</div>' +
          '<div class="resumo-row-detail">' + escapeHtml(detalhe) + '</div>' +
        '</div>' +
      '</div>';
  }

  function renderResumoHoje(){
    var hoje = todayISO();
    setText("dashResumoData", DIAS_SEMANA[new Date(hoje + "T00:00:00").getDay()].slice(0, 3) + ", " + formatDateBR(hoje).replace(/ \d{4}$/, ""));

    var lotesHoje = lotesState.lotes.filter(function(l){ return l.data === hoje; });
    var qtdVelasHoje = lotesHoje.reduce(function(s, l){ return s + l.quantidade; }, 0);
    var producaoDetalhe = lotesHoje.length
      ? (lotesHoje.length + (lotesHoje.length === 1 ? " lote · " : " lotes · ") + qtdVelasHoje + " velas de " + variacaoLabel(findVariacao(lotesHoje[0].variacaoId)))
      : "nenhuma produção registrada hoje";

    var movsHoje = estoqueState.movimentacoes.filter(function(m){ return m.data === hoje; });
    var insumosDetalhe = "nenhuma movimentação de insumo hoje";
    if (movsHoje.length) {
      var m0 = movsHoje[0];
      var insumo0 = findInsumo(m0.insumoId);
      insumosDetalhe = (m0.tipo === "entrada" ? "entrada: " : "saída: ") + (insumo0 ? insumo0.nome : "insumo") + " " + (m0.tipo === "entrada" ? "+" : "-") + numToStr(m0.quantidade) + (insumo0 ? (" " + insumo0.unidade) : "");
      if (movsHoje.length > 1) insumosDetalhe += " · +" + (movsHoje.length - 1);
    }

    var vendasHoje = vendasState.vendas.filter(function(v){ return v.status === "confirmada" && v.data === hoje; });
    var totalVendasHoje = vendasHoje.reduce(function(s, v){ return s + v.total; }, 0);
    var vendasDetalhe = vendasHoje.length
      ? (vendasHoje.length + (vendasHoje.length === 1 ? " venda · " : " vendas · ") + fmtMoney(totalVendasHoje))
      : "nenhuma venda hoje";

    var listEl = document.getElementById("dashResumoList");
    if (listEl) {
      listEl.innerHTML = [
        resumoRowHTML(ICON_PRODUCAO, "produção", producaoDetalhe, false),
        resumoRowHTML(ICON_INSUMOS, "insumos", insumosDetalhe, false),
        resumoRowHTML(ICON_VENDAS, "vendas", vendasDetalhe, true)
      ].join("");
    }
  }

  function renderPeriodoResumo(){
    setText("dashTotalVendas", fmtMoney(computeTotalVendasBruto()));
    setText("dashReceitaReal", fmtMoney(computeReceitaReal()));
    setText("dashLucroLiquido", fmtMoney(computeLucroLiquidoReal()));
    setText("dashLucroSub", "vem de Custos, já rateado · " + periodoLabelText());

    var lotesPeriodo = lotesState.lotes.filter(function(l){ return isInPeriodo(l.data); });
    var qtdTotal = lotesPeriodo.reduce(function(s, l){ return s + l.quantidade; }, 0);
    var variacoesSet = {};
    lotesPeriodo.forEach(function(l){ variacoesSet[l.variacaoId] = true; });
    var nVariacoes = Object.keys(variacoesSet).length;
    setText("dashProduzidoQtd", qtdTotal + " velas");
    setText("dashProduzidoSub", lotesPeriodo.length + (lotesPeriodo.length === 1 ? " lote · " : " lotes · ") + nVariacoes + (nVariacoes === 1 ? " variação" : " variações"));
  }

  function renderPizzaVariacao(){
    var dist = computeVendasPorVariacao();
    var total = dist.reduce(function(s, d){ return s + d.qty; }, 0);
    setText("dashPizzaTotal", total + " un");
    var wrap = document.getElementById("dashPizzaWrap");
    if (!wrap) return;
    if (!total) {
      wrap.innerHTML = emptyStateHTML({
        icon: ICON_PRODUCAO,
        title: "nenhuma venda no período",
        sub: "venda alguma vela nesse intervalo pra ver a distribuição por variação aqui."
      });
      return;
    }
    var colors = ["var(--primary)", "var(--chart-2)", "var(--chart-3)"];
    var slices = dist.slice(0, 2).map(function(d, i){ return { label: d.label, qty: d.qty, color: colors[i] }; });
    var restQty = dist.slice(2).reduce(function(s, d){ return s + d.qty; }, 0);
    if (restQty > 0) slices.push({ label: "Outras", qty: restQty, color: colors[2] });

    var deg = 0;
    var stops = slices.map(function(s){
      var next = deg + (s.qty / total * 360);
      var stop = s.color + " " + deg.toFixed(1) + "deg " + next.toFixed(1) + "deg";
      deg = next;
      return stop;
    });
    var legend = slices.map(function(s){
      return '<div class="between"><span style="display:flex;align-items:center;gap:8px;font-size:13px;">' +
        '<span style="width:8px;height:8px;border-radius:50%;background:' + s.color + ';"></span>' + escapeHtml(s.label) + '</span>' +
        '<span style="font-size:13px;font-weight:600;">' + s.qty + ' un</span></div>';
    }).join("");
    wrap.innerHTML =
      '<div style="display:flex;align-items:center;gap:20px;">' +
        '<div style="width:100px;height:100px;flex:none;border-radius:50%;background:conic-gradient(' + stops.join(",") + ');box-shadow:var(--shadow-raised-xs);"></div>' +
        '<div style="display:flex;flex-direction:column;gap:9px;flex:1;">' + legend + '</div>' +
      '</div>';
  }

  // Tira de 7 dias no hero (visual — mostra a semana corrente com hoje em destaque, no
  // estilo do calendário de referência; não filtra nada, é só contexto de data).
  var DIAS_SEMANA_LETRA = ["D", "S", "T", "Q", "Q", "S", "S"];
  function renderDashSemana(){
    var wrap = document.getElementById("dashSemanaStrip");
    if (!wrap) return;
    var hoje = new Date();
    var iHoje = hoje.getDay();
    var html = "";
    for (var i = 0; i < 7; i++) {
      var d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - iHoje + i);
      var ehHoje = i === iHoje;
      html += '<div class="dash-hero-day' + (ehHoje ? " is-today" : "") + '">' +
          '<span class="dash-hero-day-label">' + DIAS_SEMANA_LETRA[i] + '</span>' +
          '<span class="dash-hero-day-num">' + d.getDate() + '</span>' +
        '</div>';
    }
    wrap.innerHTML = html;
  }

  function renderDashboard(){
    setText("dashSaudacao", greetingForNow() + (contaState.nome ? (", " + firstName(contaState.nome)) : ""));
    setText("dashDataHoje", formatDataCompleta(todayISO()));
    var avatar = document.getElementById("dashAvatar");
    if (avatar) avatar.textContent = ((contaState.nome || contaState.email || "A").trim().charAt(0) || "A").toUpperCase();
    renderDashSemana();
    renderResumoHoje();
    renderDashboardAvisos();
    renderPeriodoResumo();
    renderPizzaVariacao();
  }

  function setPeriodoModo(modo){
    periodoState.modo = modo;
    document.querySelectorAll('#dashPeriodoPills [data-periodo]').forEach(function(p){
      var active = p.dataset.periodo === modo;
      p.classList.toggle("active", active);
      p.setAttribute("aria-pressed", active ? "true" : "false");
    });
    var customWrap = document.getElementById("dashPeriodoCustomWrap");
    if (customWrap) customWrap.hidden = modo !== "custom";
    if (modo !== "custom") {
      renderPeriodoResumo();
      renderPizzaVariacao();
      return;
    }
    var ini = document.getElementById("dashPeriodoInicio");
    var fim = document.getElementById("dashPeriodoFim");
    if (ini && fim && ini.value && fim.value && ini.value <= fim.value) {
      periodoState.inicioISO = ini.value;
      periodoState.fimISO = fim.value;
      renderPeriodoResumo();
      renderPizzaVariacao();
    }
  }

  // ================================================================
  // Dock inferior — cluster de botões circulares coloridos (referência: dock do app
  // "Bloom"). Cada item leva sempre uma das 5 cores da marca, independente do tema
  // claro/escuro do resto do app — só o fundo do dock (--dock-bg) segue o tema.
  // ================================================================
  var DOCK_ITEMS = [
    { key: "inicio", big: true, bg: "#442D1C", fg: "#E8D1A7", enabled: true, screen: "dashboard",
      icon: '<path d="M4 11.5 12 4l8 7.5"/><path d="M6 10v9a1 1 0 0 0 1 1h3v-6h4v6h3a1 1 0 0 0 1-1v-9"/>', label: "Início" },
    { key: "estoque", bg: "#84592B", fg: "#F3E6CE", enabled: false,
      icon: '<rect x="4" y="4" width="16" height="5" rx="1.2"/><rect x="4" y="11" width="16" height="9" rx="1.2"/><path d="M9 15h6"/>', label: "Estoque" },
    { key: "producao", bg: "#9D9167", fg: "#2B1B10", enabled: false,
      icon: ICON_PRODUCAO, label: "Produção" },
    { key: "vendas", bg: "#743014", fg: "#F3E6CE", enabled: false,
      icon: ICON_VENDAS, label: "Vendas" },
    { key: "mais", bg: "#E8D1A7", fg: "#442D1C", enabled: true, screen: "mais",
      icon: '<circle cx="6" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="18" cy="12" r="1.6" fill="currentColor" stroke="none"/>', label: "Mais" }
  ];
  function dockItemHTML(item, activeKey){
    var active = item.key === activeKey;
    var cls = "dockitem" + (item.big ? " dockitem-lg" : "") + (active ? " active" : "");
    return '<button type="button" class="' + cls + '" style="background:' + item.bg + ';color:' + item.fg + ';" ' +
      'data-dock="' + item.key + '" aria-label="' + item.label + '"' + (item.enabled ? "" : ' aria-disabled="true"') + '>' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + item.icon + '</svg>' +
    '</button>';
  }
  function dockHTML(activeKey){
    return DOCK_ITEMS.map(function(it){ return dockItemHTML(it, activeKey); }).join("");
  }
  function refreshAllDocks(activeScreenName){
    var key = activeScreenName === "mais" ? "mais" : "inicio";
    ["dashDock", "reposicaoDock", "maisDock"].forEach(function(id){
      var el = document.getElementById(id);
      if (el) el.innerHTML = dockHTML(key);
    });
  }

  // ================================================================
  // Delegação de eventos
  // ================================================================
  document.addEventListener("touchstart", function(){}, { passive: true });

  document.addEventListener("keydown", function(e){
    if (e.key !== "Enter" && e.key !== " " && e.key !== "Spacebar") return;
    var el = e.target.closest('[role="button"], [role="switch"]');
    if (!el) return;
    e.preventDefault();
    el.click();
  });

  document.addEventListener("submit", function(e){
    if (e.target.matches('[data-action="login-submit"]')) { e.preventDefault(); submitLogin(); return; }
    if (e.target.matches('[data-action="signup-submit"]')) { e.preventDefault(); submitSignup(); return; }
  });

  document.addEventListener("click", function(e){
    var previewBtn = e.target.closest("[data-preview-set]");
    if (previewBtn) { setPreview(previewBtn.dataset.previewSet); return; }

    var dock = e.target.closest("[data-dock]");
    if (dock) {
      if (dock.getAttribute("aria-disabled") === "true") { showToast("em breve — esse módulo ainda está sendo construído."); return; }
      var key = dock.dataset.dock;
      var item = DOCK_ITEMS.filter(function(d){ return d.key === key; })[0];
      if (item && item.screen) showScreen(item.screen);
      return;
    }

    var gotoAuth = e.target.closest("[data-goto-auth]");
    if (gotoAuth) {
      showAuthScreen(gotoAuth.dataset.gotoAuth);
      var errL = document.getElementById("loginError"), errS = document.getElementById("signupError");
      if (errL) errL.hidden = true;
      if (errS) errS.hidden = true;
      return;
    }

    var forgot = e.target.closest('[data-action="auth-forgot"]');
    if (forgot) {
      var errEl = document.getElementById("loginError");
      if (errEl) { errEl.hidden = false; errEl.textContent = "os dados ficam só neste aparelho, sem recuperação por e-mail — se esqueceu a senha, crie uma nova conta (isso substitui o acesso salvo aqui)."; }
      return;
    }

    var eyeBtn = e.target.closest("[data-toggle-senha]");
    if (eyeBtn) {
      var pwd = document.getElementById(eyeBtn.dataset.toggleSenha);
      if (pwd) {
        var showing = pwd.type === "text";
        pwd.type = showing ? "password" : "text";
        eyeBtn.setAttribute("aria-label", showing ? "Mostrar senha" : "Ocultar senha");
      }
      return;
    }

    var toggleLembrar = e.target.closest('[data-action="toggle-lembrar"]');
    if (toggleLembrar) {
      var pressedL = toggleLembrar.getAttribute("aria-pressed") === "true";
      toggleLembrar.setAttribute("aria-pressed", pressedL ? "false" : "true");
      setText("loginLembrarCheck", pressedL ? "" : "✓");
      return;
    }

    var toggleAceite = e.target.closest('[data-action="toggle-aceite"]');
    if (toggleAceite) {
      var pressedA = toggleAceite.getAttribute("aria-pressed") === "true";
      toggleAceite.setAttribute("aria-pressed", pressedA ? "false" : "true");
      setText("signupAceiteCheck", pressedA ? "" : "✓");
      return;
    }

    var gotoEl = e.target.closest("[data-goto]");
    if (gotoEl) { showScreen(gotoEl.dataset.goto); return; }

    var goReposicao = e.target.closest('[data-action="go-reposicao"]');
    if (goReposicao) { renderReposicaoPanel(); showScreen("reposicao"); return; }

    var toastBreve = e.target.closest('[data-action="toast-em-breve"]');
    if (toastBreve) { showToast("em breve — o relatório completo ainda está sendo construído."); return; }

    var logoutBtn = e.target.closest('[data-action="logout"]');
    if (logoutBtn) { logout(); return; }

    var toggleTemaBtn = e.target.closest('[data-action="toggle-tema"]');
    if (toggleTemaBtn) { setTema(temaState === "escuro" ? "claro" : "escuro"); return; }

    var periodoPill = e.target.closest("[data-periodo]");
    if (periodoPill) { setPeriodoModo(periodoPill.dataset.periodo); return; }
  });

  document.addEventListener("input", function(e){
    if (e.target.id === "dashPeriodoInicio" || e.target.id === "dashPeriodoFim") {
      setPeriodoModo("custom");
    }
  });

  // ================================================================
  // Rodapé de marca (.reveal-footer, ver style.css) — entra com fade + leve subida assim
  // que cruza a viewport de rolagem de cada tela, em vez de já nascer visível. Um único
  // IntersectionObserver cuida dos três (dashboard/reposição/mais); "root" precisa ser o
  // próprio .screen (não a janela) porque é ELE que rola, não o documento. Sem IO no
  // navegador ou com prefers-reduced-motion, cada rodapé já nasce com .reveal-footer-in
  // direto no HTML-equivalente — aqui simplesmente não anima, mas nunca fica invisível.
  function initRevealFooters(){
    var footers = document.querySelectorAll(".reveal-footer");
    if (!footers.length) return;
    if (prefersReducedMotion || typeof IntersectionObserver !== "function") {
      footers.forEach(function(el){ el.classList.add("reveal-footer-in"); });
      return;
    }
    footers.forEach(function(el){
      var screenEl = el.closest(".screen");
      var io = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if (entry.isIntersecting) {
            entry.target.classList.add("reveal-footer-in");
            io.unobserve(entry.target);
          }
        });
      }, { root: screenEl || null, threshold: 0.2 });
      io.observe(el);
    });
  }
  initRevealFooters();

  // ================================================================
  checkAuthAndInit();
})();
