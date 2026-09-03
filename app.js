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
    var folderStackEl = target.querySelector(".folder-stack");
    if (folderStackEl) playStackReveal(folderStackEl, ".folder-card");

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
  // Configurações de produção — receita padrão por vela, jarra e perda de derretimento.
  // Ainda não tem tela própria (módulo 8, não construído) — os valores abaixo são a
  // estimativa inicial que a Calculadora de Velas usa, com os mesmos papéis fixos do seed
  // de insumos (i1 cera, i4 jarra, i5 pavio); a essência muda por variação (ver
  // catalogoState[].essenciaInsumoId). Quando o módulo 8 existir, ele edita este estado.
  // ================================================================
  var CONFIG_KEY = "pp_config_v1";
  var DEFAULT_CONFIG_STATE = {
    ceraInsumoId: "i1", jarraInsumoId: "i4", pavioInsumoId: "i5",
    ceraPorVela: 0.15, essenciaPorVela: 7, jarraPorVela: 1, pavioPorVela: 1,
    jarraCapacidadeMl: 180, perdaDerretimento: 4
  };
  function loadConfigState(){
    try {
      var raw = localStorage.getItem(CONFIG_KEY);
      if (raw) { var parsed = JSON.parse(raw); if (parsed) return parsed; }
    } catch (e) {}
    return JSON.parse(JSON.stringify(DEFAULT_CONFIG_STATE));
  }
  function saveConfigState(){
    try { localStorage.setItem(CONFIG_KEY, JSON.stringify(configState)); } catch (e) {}
  }
  var configState = loadConfigState();
  // Receita padrão de uma variação: 3 papéis fixos (cera/jarra/pavio) + a essência dela.
  function receitaPadraoVariacao(v){
    return [
      { insumoId: configState.ceraInsumoId, qtd: configState.ceraPorVela, perde: true },
      { insumoId: v.essenciaInsumoId, qtd: configState.essenciaPorVela, perde: true },
      { insumoId: configState.jarraInsumoId, qtd: configState.jarraPorVela, perde: false },
      { insumoId: configState.pavioInsumoId, qtd: configState.pavioPorVela, perde: false }
    ];
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
  // Estoque — hub das 3 pastas (insumos / produção / calculadora)
  // A tela "estoque" é só o hub — cada pasta abre uma tela própria por baixo dela. A
  // transição "descer" já vem de graça do showScreen() genérico (screen-enter/exit em
  // style.css), então nenhuma pasta precisa de animação própria.
  // ================================================================
  function renderEstoqueHub(){
    var totalInsumos = estoqueState.insumos.length;
    var abaixoInsumos = estoqueState.insumos.filter(function(i){ return i.minimo > 0 && i.quantidade < i.minimo; }).length;
    setText("folderInsumosSub", totalInsumos + (totalInsumos === 1 ? " insumo" : " insumos") + (abaixoInsumos ? " · " + abaixoInsumos + " abaixo do mínimo" : ""));

    var totalVelas = 0;
    producaoEstoqueState.estoques.forEach(function(e){ totalVelas += e.quantidade; });
    var nVariacoes = catalogoState.variacoes.length;
    setText("folderProducaoSub", totalVelas + (totalVelas === 1 ? " vela pronta" : " velas prontas") + " · " + nVariacoes + (nVariacoes === 1 ? " variação" : " variações"));
  }

  // ================================================================
  // Estoque de Insumos — módulo 1
  // Custo do insumo = custo médio ponderado das compras registradas, recalculado a cada
  // entrada — a mesma conta de custoInsumoPorVela() acima, só que por insumo em vez de
  // por lote. O valor cadastrado na hora de criar o insumo é só a estimativa inicial,
  // até a primeira entrada de compra chegar.
  // ================================================================
  var currentInsumoId = null;
  var currentMovTipo = "entrada";
  var insumoFormMode = "novo";
  var insumoFormEditingId = null;

  function insumoRowHTML(insumo){
    var abaixo = insumo.minimo > 0 && insumo.quantidade < insumo.minimo;
    var menuBtn = '<div class="tapicon" role="button" tabindex="0" aria-label="Mais ações · ' + escapeHtml(insumo.nome) + '" data-action="insumo-edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="18" cy="12" r="1.3" fill="currentColor" stroke="none"/></svg></div>';
    var rightTop = abaixo
      ? '<div class="row" style="gap:6px;"><div class="badge warn">abaixo do mínimo</div>' + menuBtn + '</div>'
      : menuBtn;
    var minTxt = insumo.minimo > 0 ? (" · mín " + fmtQty(insumo.minimo, insumo.unidade)) : "";
    return '' +
      '<div class="raised-sm" role="button" tabindex="0" aria-label="Ver histórico · ' + escapeHtml(insumo.nome) + '" data-insumo-id="' + insumo.id + '" style="padding:15px 16px;margin-bottom:11px;">' +
        '<div class="between" style="margin-bottom:6px;">' +
          '<div style="font-size:14px;font-weight:600;">' + escapeHtml(insumo.nome) + '</div>' +
          rightTop +
        '</div>' +
        '<div class="between">' +
          '<div style="font-size:18px;font-weight:700;">' + fmtQty(insumo.quantidade, insumo.unidade) + '</div>' +
          '<div style="font-size:11.5px;color:var(--text-faint);">' + fmtMoney(insumo.custoMedio) + '/' + insumo.unidade + minTxt + '</div>' +
        '</div>' +
      '</div>';
  }

  function renderEstoqueInsumosList(){
    var searchEl = document.getElementById("estoqueSearchInput");
    var q = searchEl ? searchEl.value.trim().toLowerCase() : "";
    var list = estoqueState.insumos.filter(function(i){ return i.nome.toLowerCase().indexOf(q) !== -1; });
    var listEl = document.getElementById("estoqueInsumosList");
    if (listEl) {
      listEl.innerHTML = list.length ? list.map(insumoRowHTML).join("") : emptyStateHTML({
        icon: ICON_INSUMOS,
        title: q ? "nenhum insumo encontrado" : "nenhum insumo cadastrado",
        sub: q ? "tenta buscar por outro nome." : "toque no + pra cadastrar o primeiro."
      });
    }
    var n = estoqueState.insumos.length;
    setText("estoqueInsumosCount", n + (n === 1 ? " insumo" : " insumos"));
  }

  function openInsumoDetalhe(id){
    currentInsumoId = id;
    renderInsumoDetalhe();
    showScreen("insumoDetalhe");
  }

  function renderInsumoDetalhe(){
    var insumo = findInsumo(currentInsumoId);
    if (!insumo) return;
    setText("insumoDetalheNome", insumo.nome);
    setText("insumoDetalheQtd", fmtQty(insumo.quantidade, insumo.unidade));
    setText("insumoDetalheCusto", fmtMoney(insumo.custoMedio) + "/" + insumo.unidade);
    setText("insumoDetalheMinimo", insumo.minimo > 0 ? fmtQty(insumo.minimo, insumo.unidade) : "—");
    var badgeEl = document.getElementById("insumoDetalheBadge");
    if (badgeEl) badgeEl.hidden = !(insumo.minimo > 0 && insumo.quantidade < insumo.minimo);

    var movs = estoqueState.movimentacoes.filter(function(m){ return m.insumoId === currentInsumoId; });
    movs.sort(function(a, b){
      if (a.data !== b.data) return a.data < b.data ? 1 : -1;
      return a.id < b.id ? 1 : -1;
    });

    var n = movs.length;
    setText("insumoDetalheHistCount", n + (n === 1 ? " registro" : " registros"));
    var histCard = document.getElementById("insumoDetalheHistCard");
    var emptyEl = document.getElementById("insumoDetalheHistEmpty");
    if (!n) {
      if (histCard) histCard.hidden = true;
      if (emptyEl) emptyEl.hidden = false;
    } else {
      if (histCard) histCard.hidden = false;
      if (emptyEl) emptyEl.hidden = true;
      var listEl = document.getElementById("insumoDetalheHistList");
      if (listEl) listEl.innerHTML = movs.map(function(m, idx){
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
    document.querySelectorAll('#insumoMovimentar [data-tipo]').forEach(function(p){ p.classList.toggle("active", p.dataset.tipo === tipo); });
    setHidden("movEntradaFields", tipo !== "entrada");
    setHidden("movSaidaFields", tipo !== "saida");
    setText("movPreviewLabel", tipo === "entrada" ? "depois desta entrada" : "depois desta saída");
    setHidden("movPreviewCustoRow", tipo !== "entrada");
    setText("movSubmitBtn", tipo === "entrada" ? "Registrar entrada" : "Registrar saída");
    updateMovPreview();
  }
  function setHidden(id, hidden){ var el = document.getElementById(id); if (el) el.hidden = hidden; }

  function setMotivoPill(motivo){
    document.querySelectorAll('#movMotivoPills [data-motivo]').forEach(function(p){ p.classList.toggle("active", p.dataset.motivo === motivo); });
  }
  function getMotivoPill(){
    var active = document.querySelector('#movMotivoPills .pill.active');
    return active ? active.dataset.motivo : "Produção";
  }

  function openMovimentar(id, tipo){
    var insumo = findInsumo(id);
    if (!insumo) return;
    currentInsumoId = id;
    setText("movCrumb", insumo.nome);
    setText("movUnitEntrada", insumo.unidade);
    setText("movUnitSaida", insumo.unidade);
    document.getElementById("movQtdEntrada").value = "";
    document.getElementById("movPreco").value = "";
    document.getElementById("movQtdSaida").value = "";
    setText("movData", formatDateBR(todayISO()));
    setMotivoPill("Produção");
    setMovTipo(tipo || "entrada");
    showScreen("insumoMovimentar");
  }

  function updateMovPreview(){
    var insumo = findInsumo(currentInsumoId);
    if (!insumo) return;
    var warnEl = document.getElementById("movWarning");
    var submitBtn = document.getElementById("movSubmitBtn");
    if (!warnEl || !submitBtn) return;
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
      setText("movPreviewQtd", fmtQty(insumo.quantidade, insumo.unidade) + " → " + fmtQty(novaQtd, insumo.unidade));
      setText("movPreviewCusto", fmtMoney(insumo.custoMedio) + " → " + fmtMoney(novoCusto) + "/" + insumo.unidade);
    } else {
      var qtdS = strToNum(document.getElementById("movQtdSaida").value);
      var novaQtdS = insumo.quantidade - (qtdS > 0 ? qtdS : 0);
      if (qtdS > insumo.quantidade) {
        warnEl.textContent = "quantidade maior que o estoque disponível (" + fmtQty(insumo.quantidade, insumo.unidade) + ")";
        warnEl.hidden = false;
        submitBtn.setAttribute("disabled", "disabled");
      }
      setText("movPreviewQtd", fmtQty(insumo.quantidade, insumo.unidade) + " → " + fmtQty(Math.max(novaQtdS, 0), insumo.unidade));
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
    renderInsumoDetalhe();
    renderEstoqueInsumosList();
    renderEstoqueHub();
    renderCalc();
    showScreen("insumoDetalhe");
  }

  function setInsumoFormUnit(unit){
    document.querySelectorAll('#insumoFormUnitPills [data-unit]').forEach(function(p){ p.classList.toggle("active", p.dataset.unit === unit); });
    setText("insumoFormQtdUnit", unit);
    setText("insumoFormMinUnit", unit);
  }
  function getInsumoFormUnit(){
    var active = document.querySelector('#insumoFormUnitPills .pill.active');
    return active ? active.dataset.unit : "kg";
  }

  function openInsumoForm(mode, id){
    insumoFormMode = mode;
    insumoFormEditingId = id || null;
    var isEdit = mode === "editar";
    setText("insumoFormTitle", isEdit ? "Editar insumo" : "Novo insumo");
    setHidden("insumoFormNewFields", isEdit);
    setHidden("insumoFormEditInfo", !isEdit);
    setHidden("insumoFormRemoveWrap", !isEdit);
    setHidden("insumoFormHint", isEdit);

    var unit = "kg";
    if (isEdit) {
      var insumo = findInsumo(id);
      if (!insumo) return;
      document.getElementById("insumoFormNome").value = insumo.nome;
      unit = insumo.unidade;
      document.getElementById("insumoFormMinimo").value = insumo.minimo > 0 ? numToStr(insumo.minimo) : "";
      setText("insumoFormInfoQtd", fmtQty(insumo.quantidade, insumo.unidade));
      setText("insumoFormInfoCusto", fmtMoney(insumo.custoMedio) + "/" + insumo.unidade);
    } else {
      document.getElementById("insumoFormNome").value = "";
      document.getElementById("insumoFormQtd").value = "";
      document.getElementById("insumoFormCusto").value = "";
      document.getElementById("insumoFormMinimo").value = "";
    }
    setInsumoFormUnit(unit);
    showScreen("insumoForm");
  }

  function submitInsumoForm(){
    var nomeEl = document.getElementById("insumoFormNome");
    var nome = nomeEl.value.trim();
    if (!nome) { nomeEl.focus(); return; }
    var unidade = getInsumoFormUnit();
    var minimo = strToNum(document.getElementById("insumoFormMinimo").value);

    if (insumoFormMode === "editar") {
      var insumo = findInsumo(insumoFormEditingId);
      if (!insumo) return;
      insumo.nome = nome;
      insumo.unidade = unidade;
      insumo.minimo = round2(minimo);
    } else {
      var qtd = strToNum(document.getElementById("insumoFormQtd").value);
      var custo = strToNum(document.getElementById("insumoFormCusto").value);
      estoqueState.insumos.push({ id: uid("i"), nome: nome, unidade: unidade, quantidade: round2(qtd), custoMedio: custo, minimo: round2(minimo) });
    }
    saveEstoqueState();
    renderEstoqueInsumosList();
    renderEstoqueHub();
    showScreen("estoqueInsumos");
  }

  function removeInsumo(){
    if (!insumoFormEditingId) return;
    var insumo = findInsumo(insumoFormEditingId);
    if (!insumo) return;
    if (!window.confirm('Remover "' + insumo.nome + '" e todo o histórico dele?')) return;
    estoqueState.insumos = estoqueState.insumos.filter(function(i){ return i.id !== insumoFormEditingId; });
    estoqueState.movimentacoes = estoqueState.movimentacoes.filter(function(m){ return m.insumoId !== insumoFormEditingId; });
    saveEstoqueState();
    renderEstoqueInsumosList();
    renderEstoqueHub();
    showScreen("estoqueInsumos");
  }

  // ================================================================
  // Estoque de Produção (velas prontas, por variação) — módulo 2/3
  // Reaproveita producaoEstoqueState (já existia, usado hoje só pelo aviso de reposição) —
  // ajustar aqui grava uma movimentação nele, igual ao padrão de auditoria do Estoque de
  // Insumos. Renomear uma variação é lá no Catálogo de Produtos, não aqui.
  // ================================================================
  function producaoRowHTML(v){
    var estoqueVela = findEstoqueVela(v.id) || { quantidade: 0 };
    var nome = variacaoLabel(v);
    var qtd = estoqueVela.quantidade;
    return '' +
      '<div class="raised-sm between" style="padding:15px 16px;margin-bottom:11px;">' +
        '<div><div style="font-size:14px;font-weight:600;">' + escapeHtml(nome) + '</div><div style="font-size:11.5px;color:var(--text-faint);margin-top:2px;">velas prontas</div></div>' +
        '<div class="row" style="gap:10px;">' +
          '<div class="pressed" role="button" tabindex="0" aria-label="Remover uma vela · ' + escapeHtml(nome) + '" data-action="prod-dec" data-var-id="' + v.id + '" style="width:34px;height:34px;border-radius:12px;display:flex;align-items:center;justify-content:center;color:var(--text);"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M5 12h14"/></svg></div>' +
          '<div style="font-size:18px;font-weight:700;min-width:30px;text-align:center;">' + qtd + '</div>' +
          '<div class="raised-sm" role="button" tabindex="0" aria-label="Adicionar uma vela · ' + escapeHtml(nome) + '" data-action="prod-inc" data-var-id="' + v.id + '" style="width:34px;height:34px;border-radius:12px;display:flex;align-items:center;justify-content:center;color:var(--primary);"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></div>' +
        '</div>' +
      '</div>';
  }

  function renderProducaoList(){
    var listEl = document.getElementById("producaoList");
    if (listEl) {
      listEl.innerHTML = catalogoState.variacoes.length ? catalogoState.variacoes.map(producaoRowHTML).join("") : emptyStateHTML({
        icon: ICON_PRODUCAO,
        title: "nenhuma variação no catálogo",
        sub: "cadastre uma variação no Catálogo de Produtos primeiro."
      });
    }
    var n = catalogoState.variacoes.length;
    setText("producaoCount", n + (n === 1 ? " variação" : " variações"));
  }

  function adjustProducaoVela(variacaoId, delta){
    var estoqueVela = findEstoqueVela(variacaoId);
    if (!estoqueVela) {
      estoqueVela = { variacaoId: variacaoId, quantidade: 0, minimo: 0 };
      producaoEstoqueState.estoques.push(estoqueVela);
    }
    estoqueVela.quantidade = Math.max(0, estoqueVela.quantidade + delta);
    producaoEstoqueState.movimentacoes.push({ id: uid("pm"), variacaoId: variacaoId, tipo: delta > 0 ? "entrada" : "saida", quantidade: 1, data: todayISO(), motivo: "Ajuste manual" });
    saveProducaoEstoqueState();
    renderProducaoList();
    renderEstoqueHub();
  }

  // ================================================================
  // Calculadora de Velas — planeja um lote antes de registrá-lo (o registro em si, que
  // debita insumo e credita vela pronta, é o módulo 6/"Produção", ainda não construído).
  // Ajustes por lote (chips +5%/−5%) valem só pra esta simulação; "salvar como novo
  // padrão" é o único jeito de torná-los permanentes em configState.
  // ================================================================
  var calcState = { variacaoId: null, quantidade: 24, ajustes: {} };

  function calcVarPillHTML(v){
    var active = v.id === calcState.variacaoId ? " active" : "";
    return '<div class="pill' + active + '" style="flex:none;" data-var-id="' + v.id + '">' + escapeHtml(variacaoLabel(v)) + '</div>';
  }

  function computeCalcQtd(item){
    var base = item.qtd * calcState.quantidade;
    var comPerda = item.perde ? base * (1 + configState.perdaDerretimento / 100) : base;
    var ajustePct = calcState.ajustes[item.insumoId] || 0;
    return comPerda * (1 + ajustePct / 100);
  }

  function calcInsumoRowHTML(insumo, precisa, ajustePct){
    var falta = round2(precisa - insumo.quantidade);
    var statusHTML = falta > 0
      ? '<div style="font-size:10.5px;color:var(--warn);">falta ' + numToStr(falta) + '</div>'
      : '<div style="font-size:10.5px;color:var(--text-faint);">tem ' + numToStr(insumo.quantidade) + '</div>';
    var ajusteTxt = (ajustePct > 0 ? "+" : "") + ajustePct + "%";
    return '' +
      '<div class="between" style="padding:12px 0;border-bottom:1px solid var(--line);">' +
        '<div style="flex:1;min-width:0;">' +
          '<div style="font-size:13.5px;font-weight:500;">' + escapeHtml(insumo.nome) + '</div>' +
          '<div class="row" style="gap:4px;margin-top:4px;">' +
            '<div class="pressed" role="button" tabindex="0" aria-label="Diminuir 5% · ' + escapeHtml(insumo.nome) + '" data-action="calc-adj-dec" data-calc-insumo-id="' + insumo.id + '" style="width:22px;height:22px;border-radius:8px;display:flex;align-items:center;justify-content:center;color:var(--text-faint);"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14"/></svg></div>' +
            '<div style="font-size:10.5px;color:var(--text-faint);min-width:30px;text-align:center;">' + ajusteTxt + '</div>' +
            '<div class="pressed" role="button" tabindex="0" aria-label="Aumentar 5% · ' + escapeHtml(insumo.nome) + '" data-action="calc-adj-inc" data-calc-insumo-id="' + insumo.id + '" style="width:22px;height:22px;border-radius:8px;display:flex;align-items:center;justify-content:center;color:var(--text-faint);"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></div>' +
          '</div>' +
        '</div>' +
        '<div style="text-align:right;">' +
          '<div style="font-size:13.5px;font-weight:700;">' + fmtQty(precisa, insumo.unidade) + '</div>' +
          statusHTML +
        '</div>' +
      '</div>';
  }

  function renderCalc(){
    if (!calcState.variacaoId || !findVariacao(calcState.variacaoId)) {
      calcState.variacaoId = catalogoState.variacoes.length ? catalogoState.variacoes[0].id : null;
    }
    var v = findVariacao(calcState.variacaoId);

    var pillsEl = document.getElementById("calcVarPills");
    if (pillsEl) pillsEl.innerHTML = catalogoState.variacoes.map(calcVarPillHTML).join("");

    if (!v) {
      ["calcInsumosList"].forEach(function(id){ var el = document.getElementById(id); if (el) el.innerHTML = emptyStateHTML({
        icon: ICON_PRODUCAO, title: "nenhuma variação no catálogo", sub: "cadastre uma variação no Catálogo de Produtos primeiro."
      }); });
      setHidden("calcSaveWrap", true);
      return;
    }

    setText("calcQtdOut", calcState.quantidade);
    setText("calcPerdaNote", "perda " + numToStr(configState.perdaDerretimento) + "% inclusa");

    var receita = receitaPadraoVariacao(v);
    var hasAjuste = false;
    var listEl = document.getElementById("calcInsumosList");
    if (listEl) {
      listEl.innerHTML = receita.map(function(item){
        var insumo = findInsumo(item.insumoId);
        if (!insumo) return "";
        var precisa = round2(computeCalcQtd(item));
        var ajustePct = calcState.ajustes[item.insumoId] || 0;
        if (ajustePct) hasAjuste = true;
        return calcInsumoRowHTML(insumo, precisa, ajustePct);
      }).join("");
    }

    setText("calcJarrasOut", calcState.quantidade + " un");
    setText("calcJarraCap", numToStr(configState.jarraCapacidadeMl) + " ml");
    setHidden("calcSaveWrap", !hasAjuste);
  }

  function bumpCalcAjuste(insumoId, delta){
    var cur = calcState.ajustes[insumoId] || 0;
    var next = cur + delta;
    if (next === 0) delete calcState.ajustes[insumoId];
    else calcState.ajustes[insumoId] = next;
    renderCalc();
  }

  // Torna os ajustes deste lote permanentes em configState — só mexe nas quantidades cujo
  // papel (cera/jarra/pavio) ou essência da variação atual receberam ajuste.
  function saveCalcAjustesComoPadrao(){
    var v = findVariacao(calcState.variacaoId);
    if (!v) return;
    if (!window.confirm('Tornar estes ajustes a receita padrão de todas as variações?')) return;
    var receita = receitaPadraoVariacao(v);
    receita.forEach(function(item){
      var ajustePct = calcState.ajustes[item.insumoId] || 0;
      if (!ajustePct) return;
      if (item.insumoId === configState.ceraInsumoId) configState.ceraPorVela *= (1 + ajustePct / 100);
      else if (item.insumoId === configState.jarraInsumoId) configState.jarraPorVela *= (1 + ajustePct / 100);
      else if (item.insumoId === configState.pavioInsumoId) configState.pavioPorVela *= (1 + ajustePct / 100);
      else configState.essenciaPorVela *= (1 + ajustePct / 100); // essência (varia por variação, quantidade é comum)
    });
    calcState.ajustes = {};
    saveConfigState();
    renderCalc();
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

  // Animação de "baralho que se abre em cascata" — referência: componente
  // <ListNotificationsStack> do motion.dev/ui/lists. Os itens entram empilhados uns sob os
  // outros (escala e opacidade menores por profundidade, mesmos passos do preview original:
  // scaleStep .10, dimStep .40) e se abrem em cascata até a posição real da lista/grade.
  // Reaproveitada em dois lugares: avisos de reposição (ao clicar no sino) e as 3 pastas do
  // Estoque (toda vez que a tela "estoque" é mostrada, ver showScreen()). A classe
  // "stack-revealing" troca a transição de transform pra essa curva mais lenta/elástica só
  // durante o efeito — sem ela, o :active de toque em itens tocáveis (as pastas) ficaria
  // "mole" o tempo todo. Puro efeito de entrada, sem dado novo — pula com prefers-reduced-motion.
  function playStackReveal(containerEl, itemSelector){
    if (prefersReducedMotion) return;
    var rows = containerEl.querySelectorAll(itemSelector);
    if (rows.length < 2) return;
    var topOffset = rows[0].offsetTop;
    // O salto pro estado "empilhado" tem que ser instantâneo — `transition:none` inline
    // vence qualquer transição de transform já ativa no item (a de :active de toque, p.ex.,
    // que ao contrário dos avisos — que nascem prontos via innerHTML, sem nenhuma transição
    // rodando ainda — as pastas já têm desde antes de aparecer na tela). Sem isso o
    // navegador tentava animar o próprio salto inicial (identidade → empilhado) ao mesmo
    // tempo que a "chegada" (empilhado → identidade), e as duas praticamente se cancelavam.
    rows.forEach(function(row, i){
      row.style.transition = "none";
      row.style.transform = "translateY(" + (topOffset - row.offsetTop) + "px) scale(" + Math.max(1 - i * 0.10, 0.6) + ")";
      row.style.opacity = String(Math.max(1 - i * 0.40, 0.15));
    });
    void containerEl.offsetWidth; // commita o salto instantâneo antes de religar a transição
    rows.forEach(function(row, i){
      row.style.transition = "";
      row.style.transitionDelay = (i * 45) + "ms";
      row.classList.add("stack-revealing");
    });
    requestAnimationFrame(function(){
      rows.forEach(function(row){
        row.style.transform = "";
        row.style.opacity = "";
      });
    });
    window.setTimeout(function(){
      rows.forEach(function(row){
        row.style.transitionDelay = "";
        row.classList.remove("stack-revealing");
      });
    }, (rows.length - 1) * 45 + 600);
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
      playStackReveal(listEl, ".avisos-row");
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
    return '<div class="resumo-row dash-tap' + (isLast ? " resumo-row-last" : "") + '">' +
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
    { key: "estoque", bg: "#84592B", fg: "#F3E6CE", enabled: true, screen: "estoque",
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
  // Telas que vivem sob a pasta "Estoque" — refreshAllDocks acende o item certo do dock
  // em qualquer uma delas, não só na tela-hub.
  var ESTOQUE_SCREENS = {
    estoque: true, estoqueInsumos: true, insumoForm: true, insumoDetalhe: true,
    insumoMovimentar: true, estoqueProducao: true, estoqueCalculadora: true
  };
  var ALL_DOCK_IDS = [
    "dashDock", "reposicaoDock", "maisDock",
    "estoqueDock", "estoqueInsumosDock", "insumoFormDock", "insumoDetalheDock",
    "insumoMovimentarDock", "estoqueProducaoDock", "estoqueCalculadoraDock"
  ];
  function refreshAllDocks(activeScreenName){
    var key = "inicio";
    if (activeScreenName === "mais") key = "mais";
    else if (ESTOQUE_SCREENS[activeScreenName]) key = "estoque";
    ALL_DOCK_IDS.forEach(function(id){
      var el = document.getElementById(id);
      if (el) el.innerHTML = dockHTML(key);
    });
  }

  // ================================================================
  // Delegação de eventos
  // ================================================================
  document.addEventListener("touchstart", function(){}, { passive: true });

  // Limpa a classe do bounce de toque assim que o keyframe termina, senão ela fica presa
  // no elemento (inofensivo, mas suja o DOM e evita reiniciar limpo numa próxima interação
  // via teclado/foco).
  document.addEventListener("animationend", function(e){
    if (e.animationName === "dashTapBounce") e.target.classList.remove("tap-bounce");
  });

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
    // Bounce de toque do Dashboard (.dash-tap, ver style.css) — roda antes/independente de
    // qualquer ação real do elemento, pra dar retorno visual mesmo nos cartões que ainda não
    // levam a lugar nenhum. Reinicia a animação a cada clique (remove → força reflow → põe
    // de volta), senão cliques rápidos em sequência não reiniciariam o keyframe.
    var tapEl = e.target.closest(".dash-tap");
    if (tapEl) {
      tapEl.classList.remove("tap-bounce");
      void tapEl.offsetWidth;
      tapEl.classList.add("tap-bounce");
    }

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

    // ---- Estoque de Insumos ----
    var insumoAdd = e.target.closest('[data-action="insumo-add"]');
    if (insumoAdd) { openInsumoForm("novo"); return; }

    var insumoEdit = e.target.closest('[data-action="insumo-edit"], [data-action="insumo-detalhe-edit"]');
    if (insumoEdit) {
      var editId = insumoEdit.dataset.action === "insumo-detalhe-edit" ? currentInsumoId : insumoEdit.closest("[data-insumo-id]").dataset.insumoId;
      openInsumoForm("editar", editId);
      return;
    }

    var insumoRow = e.target.closest("[data-insumo-id]");
    if (insumoRow) { openInsumoDetalhe(insumoRow.dataset.insumoId); return; }

    var movAdd = e.target.closest('[data-action="mov-add"]');
    if (movAdd) { openMovimentar(currentInsumoId, "entrada"); return; }

    var movEntradaBtn = e.target.closest('[data-action="mov-entrada"]');
    if (movEntradaBtn) { openMovimentar(currentInsumoId, "entrada"); return; }

    var movSaidaBtn = e.target.closest('[data-action="mov-saida"]');
    if (movSaidaBtn) { openMovimentar(currentInsumoId, "saida"); return; }

    var tipoPill = e.target.closest("#insumoMovimentar [data-tipo]");
    if (tipoPill) { setMovTipo(tipoPill.dataset.tipo); return; }

    var motivoPill = e.target.closest("#movMotivoPills [data-motivo]");
    if (motivoPill) { setMotivoPill(motivoPill.dataset.motivo); return; }

    var insumoUnitPill = e.target.closest("#insumoFormUnitPills [data-unit]");
    if (insumoUnitPill) { setInsumoFormUnit(insumoUnitPill.dataset.unit); return; }

    var movSubmit = e.target.closest('[data-action="mov-submit"]');
    if (movSubmit) { if (!movSubmit.hasAttribute("disabled")) submitMovimentacao(); return; }

    var insumoFormSave = e.target.closest('[data-action="insumo-form-save"]');
    if (insumoFormSave) { submitInsumoForm(); return; }

    var insumoFormRemove = e.target.closest('[data-action="insumo-form-remove"]');
    if (insumoFormRemove) { removeInsumo(); return; }

    // ---- Estoque de Produção ----
    var prodInc = e.target.closest('[data-action="prod-inc"]');
    if (prodInc) { adjustProducaoVela(prodInc.dataset.varId, 1); return; }

    var prodDec = e.target.closest('[data-action="prod-dec"]');
    if (prodDec) { adjustProducaoVela(prodDec.dataset.varId, -1); return; }

    // ---- Calculadora de Velas ----
    var calcVarPill = e.target.closest("#calcVarPills [data-var-id]");
    if (calcVarPill) { calcState.variacaoId = calcVarPill.dataset.varId; calcState.ajustes = {}; renderCalc(); return; }

    var calcQtdInc = e.target.closest('[data-action="calc-qtd-inc"]');
    if (calcQtdInc) { calcState.quantidade += 1; renderCalc(); return; }

    var calcQtdDec = e.target.closest('[data-action="calc-qtd-dec"]');
    if (calcQtdDec) { calcState.quantidade = Math.max(1, calcState.quantidade - 1); renderCalc(); return; }

    var calcAdjInc = e.target.closest('[data-action="calc-adj-inc"]');
    if (calcAdjInc) { bumpCalcAjuste(calcAdjInc.dataset.calcInsumoId, 5); return; }

    var calcAdjDec = e.target.closest('[data-action="calc-adj-dec"]');
    if (calcAdjDec) { bumpCalcAjuste(calcAdjDec.dataset.calcInsumoId, -5); return; }

    var calcSavePadrao = e.target.closest('[data-action="calc-save-padrao"]');
    if (calcSavePadrao) { saveCalcAjustesComoPadrao(); return; }
  });

  document.addEventListener("input", function(e){
    if (e.target.id === "dashPeriodoInicio" || e.target.id === "dashPeriodoFim") {
      setPeriodoModo("custom");
    }
    if (e.target.id === "estoqueSearchInput") { renderEstoqueInsumosList(); return; }
    if (e.target.id === "movQtdEntrada" || e.target.id === "movPreco" || e.target.id === "movQtdSaida") { updateMovPreview(); return; }
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

  renderEstoqueHub();
  renderEstoqueInsumosList();
  renderProducaoList();
  renderCalc();

  // ================================================================
  checkAuthAndInit();
})();
