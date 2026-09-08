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

  // ================================================================
  // Mais → Conta: ver/editar nome e e-mail, trocar a senha da conta local. Reaproveita o
  // mesmo contaState acima (só o cadastro inicial escrevia nele até agora); não mexe em
  // sessaoState nem desloga ninguém.
  // ================================================================
  function renderContaForm(){
    var nomeEl = document.getElementById("contaNome");
    if (nomeEl) nomeEl.value = contaState.nome || "";
    var emailEl = document.getElementById("contaEmail");
    if (emailEl) emailEl.value = contaState.email || "";
    ["contaSenhaAtual", "contaSenhaNova", "contaSenhaNovaConfirm"].forEach(function(id){
      var el = document.getElementById(id);
      if (el) { el.value = ""; el.type = "password"; }
    });
  }

  function submitContaDadosForm(){
    var nome = (document.getElementById("contaNome").value || "").trim();
    var email = (document.getElementById("contaEmail").value || "").trim();
    if (!nome) { showToast("preencha seu nome."); return; }
    if (!email || email.indexOf("@") === -1) { showToast("preencha um e-mail válido."); return; }
    contaState.nome = nome;
    contaState.email = email;
    saveContaState();
    renderDashboard();
    showToast("dados salvos.");
  }

  function submitContaSenhaForm(){
    var atual = document.getElementById("contaSenhaAtual").value || "";
    var nova = document.getElementById("contaSenhaNova").value || "";
    var confirma = document.getElementById("contaSenhaNovaConfirm").value || "";
    if (!atual && !nova && !confirma) { showToast("preencha os 3 campos pra trocar a senha."); return; }
    if (atual !== contaState.senha) { showToast("senha atual incorreta."); return; }
    if (nova.length < 6) { showToast("a nova senha precisa ter pelo menos 6 caracteres."); return; }
    if (nova !== confirma) { showToast("as senhas não coincidem."); return; }
    contaState.senha = nova;
    saveContaState();
    renderContaForm();
    showToast("senha atualizada.");
  }

  // ================================================================
  // Alternador computador/celular — força o layout do app-frame independente da largura
  // real da janela (ver html[data-preview="..."] em style.css), pra dar pra comparar os
  // dois formatos sem redimensionar o navegador. Sem preferência salva, detecta uma vez
  // pela largura real da tela; depois disso guarda a escolha da pessoa.
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
  // Editada pela tela de Configurações (módulo 8, mais abaixo), com os mesmos papéis fixos
  // do seed de insumos (i1 cera, i4 jarra, i5 pavio); a essência muda por variação (ver
  // catalogoState[].essenciaInsumoId), então só a quantidade por vela é comum a todas.
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
  // Configurações — módulo 8. Tela única com a receita padrão por vela (os 4 campos que
  // receitaPadraoVariacao() lê acima), a capacidade da jarra e a perda de derretimento
  // (usadas pela Calculadora de Velas) e o preço de venda de cada variação do catálogo
  // (usado pela Calculadora de Velas pro card de custo/margem). Não mexe em qual insumo
  // faz qual papel (cera/jarra/pavio) nem no catálogo em si — só nos valores que os
  // módulos já construídos consomem.
  // ================================================================
  function renderConfiguracoes(){
    var ceraInsumo = findInsumo(configState.ceraInsumoId);
    var jarraInsumo = findInsumo(configState.jarraInsumoId);
    var pavioInsumo = findInsumo(configState.pavioInsumoId);

    setText("cfgCeraLabel", "cera por vela" + (ceraInsumo ? " · " + ceraInsumo.nome : ""));
    setText("cfgJarraLabel", "jarra por vela" + (jarraInsumo ? " · " + jarraInsumo.nome : ""));
    setText("cfgPavioLabel", "pavio por vela" + (pavioInsumo ? " · " + pavioInsumo.nome : ""));
    setText("cfgCeraUnit", ceraInsumo ? ceraInsumo.unidade : "kg");
    setText("cfgJarraUnit", jarraInsumo ? jarraInsumo.unidade : "un");
    setText("cfgPavioUnit", pavioInsumo ? pavioInsumo.unidade : "un");
    var essenciaUnit = "ml";
    if (catalogoState.variacoes.length) {
      var essenciaInsumo = findInsumo(catalogoState.variacoes[0].essenciaInsumoId);
      if (essenciaInsumo) essenciaUnit = essenciaInsumo.unidade;
    }
    setText("cfgEssenciaUnit", essenciaUnit);

    document.getElementById("cfgCeraPorVela").value = numToStr(configState.ceraPorVela);
    document.getElementById("cfgEssenciaPorVela").value = numToStr(configState.essenciaPorVela);
    document.getElementById("cfgJarraPorVela").value = numToStr(configState.jarraPorVela);
    document.getElementById("cfgPavioPorVela").value = numToStr(configState.pavioPorVela);
    document.getElementById("cfgJarraCapacidade").value = numToStr(configState.jarraCapacidadeMl);
    document.getElementById("cfgPerdaDerretimento").value = numToStr(configState.perdaDerretimento);

    var listEl = document.getElementById("cfgPrecosList");
    if (listEl) {
      listEl.innerHTML = catalogoState.variacoes.length ? catalogoState.variacoes.map(function(v, i){
        var last = i === catalogoState.variacoes.length - 1;
        return '' +
          '<div class="between" style="padding:11px 0;' + (last ? "" : "border-bottom:1px solid var(--line);") + '">' +
            '<span style="font-size:13.5px;font-weight:500;">' + escapeHtml(variacaoLabel(v)) + '</span>' +
            '<div class="pressed field" style="padding:7px 12px;margin-bottom:0;flex:none;width:104px;">' +
              '<div class="row" style="gap:4px;">' +
                '<span style="font-size:13px;font-weight:600;color:var(--text-faint);">R$</span>' +
                '<input type="text" class="cfg-preco-input" data-cfg-preco-id="' + v.id + '" style="flex:1;text-align:right;" value="' + numToStr(v.precoVenda) + '" />' +
              '</div>' +
            '</div>' +
          '</div>';
      }).join("") : emptyStateHTML({
        icon: ICON_PRODUCAO, title: "nenhuma variação no catálogo", sub: "cadastre uma variação no Catálogo de Produtos primeiro."
      });
    }
  }

  function submitConfiguracoesForm(){
    var cera = strToNum(document.getElementById("cfgCeraPorVela").value);
    var essencia = strToNum(document.getElementById("cfgEssenciaPorVela").value);
    var jarra = strToNum(document.getElementById("cfgJarraPorVela").value);
    var pavio = strToNum(document.getElementById("cfgPavioPorVela").value);
    var capacidade = strToNum(document.getElementById("cfgJarraCapacidade").value);
    var perda = strToNum(document.getElementById("cfgPerdaDerretimento").value);

    if (cera <= 0 || essencia <= 0 || jarra <= 0 || pavio <= 0 || capacidade <= 0) {
      showToast("preencha a receita padrão e a capacidade da jarra com valores maiores que zero.");
      return;
    }
    if (perda < 0) { showToast("a perda de derretimento não pode ser negativa."); return; }

    configState.ceraPorVela = cera;
    configState.essenciaPorVela = essencia;
    configState.jarraPorVela = jarra;
    configState.pavioPorVela = pavio;
    configState.jarraCapacidadeMl = capacidade;
    configState.perdaDerretimento = perda;
    saveConfigState();

    document.querySelectorAll(".cfg-preco-input").forEach(function(input){
      var v = findVariacao(input.dataset.cfgPrecoId);
      if (!v) return;
      v.precoVenda = round2(Math.max(0, strToNum(input.value)));
    });
    saveCatalogoState();

    renderCalc();
    renderConfiguracoes();
    showToast("configurações salvas.");
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
      encomendas: [
        { id: "enc1", clienteId: null, clienteNome: "Bianca Ferreira",
          itens: [{ variacaoId: "v1", quantidade: 6, precoUnit: 79 }],
          dataPrevista: offsetISO(9), observacoes: "presente de aniversário — embrulhar", status: "pendente",
          loteId: null, dataCriacao: offsetISO(-1), vendaId: null },
        { id: "enc2", clienteId: null, clienteNome: "Marina Duarte",
          itens: [{ variacaoId: "v2", quantidade: 4, precoUnit: 79 }, { variacaoId: "v3", quantidade: 2, precoUnit: 79 }],
          dataPrevista: offsetISO(3), observacoes: "", status: "producao",
          loteId: "l2", dataCriacao: offsetISO(-4), vendaId: null },
        { id: "enc3", clienteId: null, clienteNome: "Cliente avulso",
          itens: [{ variacaoId: "v1", quantidade: 3, precoUnit: 79 }],
          dataPrevista: offsetISO(-2), observacoes: "", status: "entregue",
          loteId: "l1", dataCriacao: offsetISO(-10), vendaId: null }
      ]
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
  // "Lucro líquido real" no Dashboard vem daqui, não da Calculadora de Velas (que só
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
  // Controle de clientes — módulo 13
  // Cadastro simples (nome, telefone, e-mail e endereço opcionais) com ID gerado sozinho
  // (uid("cl"), igual ao resto do app — nunca é a pessoa quem define). Histórico de
  // compras e ranking não duplicam dado nenhum: leem direto de vendasState pelo
  // clienteId de cada venda, então uma venda nova já aparece aqui sem nenhum passo extra.
  // ================================================================
  var CLIENTES_KEY = "pp_clientes_v1";
  function defaultClientesState(){
    return {
      clientes: [
        { id: "cl1", nome: "Marina Duarte", telefone: "(11) 98888-4521", email: "marina.duarte@email.com", endereco: "", criadoEm: offsetISO(-90) },
        { id: "cl2", nome: "Bianca Ferreira", telefone: "(11) 97777-1032", email: "", endereco: "", criadoEm: offsetISO(-55) }
      ]
    };
  }
  function loadClientesState(){
    try {
      var raw = localStorage.getItem(CLIENTES_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.clientes)) return parsed;
      }
    } catch (e) {}
    return defaultClientesState();
  }
  function saveClientesState(){
    try { localStorage.setItem(CLIENTES_KEY, JSON.stringify(clientesState)); } catch (e) {}
  }
  var clientesState = loadClientesState();
  function findCliente(id){
    for (var i = 0; i < clientesState.clientes.length; i++) if (clientesState.clientes[i].id === id) return clientesState.clientes[i];
    return null;
  }

  // Liga as vendas de exemplo (seed de vendasState, ver módulo 11 acima) aos clientes de
  // exemplo por nome — só roda sobre vendas que ainda não têm clienteId, então uma venda
  // real, criada depois, não é mexida por aqui.
  (function linkVendasSeedAosClientes(){
    var mudou = false;
    vendasState.vendas.forEach(function(v){
      if (v.clienteId) return;
      var match = clientesState.clientes.filter(function(c){ return c.nome === v.clienteNome; })[0];
      if (match) { v.clienteId = match.id; mudou = true; }
    });
    if (mudou) saveVendasState();
  })();

  function computeClienteStats(clienteId){
    var vendas = vendasState.vendas.filter(function(v){ return v.clienteId === clienteId && v.status === "confirmada"; });
    return { compras: vendas.length, totalGasto: round2(vendas.reduce(function(s, v){ return s + v.total; }, 0)), vendas: vendas };
  }

  // "quem compra mais" ordena por número de compras; "quem gasta mais" ordena por total
  // gasto. Clientes sem nenhuma compra confirmada ficam de fora do ranking (nada a
  // comparar), mas continuam normalmente na lista/busca de cadastro.
  function computeClientesRanking(criterio){
    var arr = clientesState.clientes.map(function(c){
      var stats = computeClienteStats(c.id);
      return { cliente: c, compras: stats.compras, totalGasto: stats.totalGasto };
    }).filter(function(r){ return r.compras > 0; });
    arr.sort(function(a, b){ return criterio === "compras" ? (b.compras - a.compras) : (b.totalGasto - a.totalGasto); });
    return arr;
  }

  var clientesRankingCriterio = "gasto";
  var currentClienteId = null;
  var clienteFormMode = "novo";
  var clienteFormEditingId = null;

  function clienteRowHTML(c){
    var stats = computeClienteStats(c.id);
    var menuBtn = '<div class="tapicon" role="button" tabindex="0" aria-label="Mais ações · ' + escapeHtml(c.nome) + '" data-action="cliente-edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="18" cy="12" r="1.3" fill="currentColor" stroke="none"/></svg></div>';
    return '' +
      '<div class="raised-sm" role="button" tabindex="0" aria-label="Ver cliente · ' + escapeHtml(c.nome) + '" data-cliente-id="' + c.id + '" style="padding:15px 16px;margin-bottom:11px;">' +
        '<div class="between" style="margin-bottom:6px;">' +
          '<div style="font-size:14px;font-weight:600;">' + escapeHtml(c.nome) + '</div>' +
          menuBtn +
        '</div>' +
        '<div class="between">' +
          '<div style="font-size:13px;color:var(--text-faint);">' + escapeHtml(c.telefone || "sem telefone") + '</div>' +
          '<div style="font-size:11.5px;color:var(--text-faint);">' + stats.compras + (stats.compras === 1 ? " compra" : " compras") + ' · ' + fmtMoney(stats.totalGasto) + '</div>' +
        '</div>' +
      '</div>';
  }

  function renderClientesList(){
    var searchEl = document.getElementById("clientesSearchInput");
    var q = searchEl ? searchEl.value.trim().toLowerCase() : "";
    var list = clientesState.clientes.filter(function(c){
      return c.nome.toLowerCase().indexOf(q) !== -1 || (c.telefone || "").toLowerCase().indexOf(q) !== -1;
    }).sort(function(a, b){ return a.nome.localeCompare(b.nome, "pt-BR"); });
    var listEl = document.getElementById("clientesList");
    if (listEl) {
      listEl.innerHTML = list.length ? list.map(clienteRowHTML).join("") : emptyStateHTML({
        icon: ICON_CLIENTES,
        title: q ? "nenhum cliente encontrado" : "nenhum cliente cadastrado",
        sub: q ? "tenta buscar por outro nome ou telefone." : "toque no + pra cadastrar o primeiro."
      });
    }
    var n = clientesState.clientes.length;
    setText("clientesCount", n + (n === 1 ? " cliente" : " clientes"));
  }

  function setClientesRankingCriterio(criterio){
    clientesRankingCriterio = criterio;
    document.querySelectorAll('#clientesRankingPills [data-criterio]').forEach(function(p){ p.classList.toggle("active", p.dataset.criterio === criterio); });
    renderClientesRanking();
  }

  function renderClientesRanking(){
    var arr = computeClientesRanking(clientesRankingCriterio);
    var listEl = document.getElementById("clientesRankingList");
    if (listEl) {
      listEl.innerHTML = arr.length ? arr.slice(0, 5).map(function(r, idx){
        var metric = clientesRankingCriterio === "compras" ? (r.compras + (r.compras === 1 ? " compra" : " compras")) : fmtMoney(r.totalGasto);
        var borderStyle = idx === Math.min(arr.length, 5) - 1 ? "" : "border-bottom:1px solid var(--line);";
        return '<div class="between" role="button" tabindex="0" aria-label="Ver cliente · ' + escapeHtml(r.cliente.nome) + '" data-cliente-id="' + r.cliente.id + '" style="padding:11px 0;' + borderStyle + '">' +
          '<div class="row" style="gap:10px;"><div style="font-size:13px;font-weight:700;color:var(--text-faint);width:16px;">' + (idx + 1) + '</div><div style="font-size:13.5px;font-weight:600;">' + escapeHtml(r.cliente.nome) + '</div></div>' +
          '<div style="font-size:13.5px;font-weight:700;">' + metric + '</div>' +
        '</div>';
      }).join("") : emptyStateHTML({
        icon: ICON_CLIENTES, title: "sem dados ainda", sub: "o ranking aparece assim que houver vendas confirmadas ligadas a um cliente cadastrado."
      });
    }
  }

  function openClienteDetalhe(id){
    currentClienteId = id;
    renderClienteDetalhe();
    showScreen("clienteDetalhe");
  }

  function renderClienteDetalhe(){
    var c = findCliente(currentClienteId);
    if (!c) return;
    setText("clienteDetalheNome", c.nome);
    setText("clienteDetalheTelefone", c.telefone || "—");
    setText("clienteDetalheEmail", c.email || "—");
    setHidden("clienteDetalheEnderecoRow", !c.endereco);
    setText("clienteDetalheEndereco", c.endereco || "");

    var stats = computeClienteStats(c.id);
    setText("clienteDetalheCompras", String(stats.compras));
    setText("clienteDetalheGasto", fmtMoney(stats.totalGasto));

    var vendas = stats.vendas.slice().sort(function(a, b){
      if (a.data !== b.data) return a.data < b.data ? 1 : -1;
      return a.id < b.id ? 1 : -1;
    });
    var n = vendas.length;
    setText("clienteDetalheHistCount", n + (n === 1 ? " compra" : " compras"));
    var histCard = document.getElementById("clienteDetalheHistCard");
    var emptyEl = document.getElementById("clienteDetalheHistEmpty");
    if (!n) {
      if (histCard) histCard.hidden = true;
      if (emptyEl) emptyEl.hidden = false;
    } else {
      if (histCard) histCard.hidden = false;
      if (emptyEl) emptyEl.hidden = true;
      var listEl = document.getElementById("clienteDetalheHistList");
      if (listEl) listEl.innerHTML = vendas.map(function(v, idx){
        var itensTxt = v.itens.map(function(it){ return it.quantidade + "x " + variacaoLabel(findVariacao(it.variacaoId)); }).join(", ");
        var borderStyle = idx === vendas.length - 1 ? "" : "border-bottom:1px solid var(--line);";
        return '<div class="between" style="padding:12px 0;' + borderStyle + '">' +
          '<div style="flex:1;min-width:0;padding-right:10px;"><div style="font-size:13.5px;font-weight:600;">' + escapeHtml(itensTxt) + '</div><div style="font-size:11px;color:var(--text-faint);margin-top:2px;">' + formatDateBR(v.data) + '</div></div>' +
          '<div style="font-size:13.5px;font-weight:700;flex:none;">' + fmtMoney(v.total) + '</div>' +
        '</div>';
      }).join("");
    }
  }

  function openClienteForm(mode, id){
    clienteFormMode = mode;
    clienteFormEditingId = id || null;
    var isEdit = mode === "editar";
    setText("clienteFormTitle", isEdit ? "Editar cliente" : "Novo cliente");
    setHidden("clienteFormRemoveWrap", !isEdit);
    if (isEdit) {
      var c = findCliente(id);
      if (!c) return;
      document.getElementById("clienteFormNome").value = c.nome;
      document.getElementById("clienteFormTelefone").value = c.telefone || "";
      document.getElementById("clienteFormEmail").value = c.email || "";
      document.getElementById("clienteFormEndereco").value = c.endereco || "";
    } else {
      document.getElementById("clienteFormNome").value = "";
      document.getElementById("clienteFormTelefone").value = "";
      document.getElementById("clienteFormEmail").value = "";
      document.getElementById("clienteFormEndereco").value = "";
    }
    showScreen("clienteForm");
  }

  function submitClienteForm(){
    var nomeEl = document.getElementById("clienteFormNome");
    var nome = nomeEl.value.trim();
    if (!nome) { nomeEl.focus(); return; }
    var telefoneEl = document.getElementById("clienteFormTelefone");
    var telefone = telefoneEl.value.trim();
    if (!telefone) { telefoneEl.focus(); return; }
    var email = document.getElementById("clienteFormEmail").value.trim();
    var endereco = document.getElementById("clienteFormEndereco").value.trim();

    if (clienteFormMode === "editar") {
      var c = findCliente(clienteFormEditingId);
      if (!c) return;
      c.nome = nome; c.telefone = telefone; c.email = email; c.endereco = endereco;
    } else {
      clientesState.clientes.push({ id: uid("cl"), nome: nome, telefone: telefone, email: email, endereco: endereco, criadoEm: todayISO() });
    }
    saveClientesState();
    renderClientesList();
    renderClientesRanking();
    showScreen("clientes");
  }

  function removeCliente(){
    if (!clienteFormEditingId) return;
    var c = findCliente(clienteFormEditingId);
    if (!c) return;
    if (!window.confirm('Remover "' + c.nome + '"? O histórico de vendas dele continua registrado, só deixa de estar ligado a um cadastro de cliente.')) return;
    clientesState.clientes = clientesState.clientes.filter(function(x){ return x.id !== clienteFormEditingId; });
    vendasState.vendas.forEach(function(v){ if (v.clienteId === clienteFormEditingId) v.clienteId = null; });
    saveClientesState();
    saveVendasState();
    renderClientesList();
    renderClientesRanking();
    showScreen("clientes");
  }

  // ================================================================
  // Registrar Venda — módulo 14. Único jeito de gravar uma venda de verdade: escolhe um
  // cliente (ou "cliente avulso"), monta a lista de itens debitando na hora do mesmo
  // producaoEstoqueState que a Produção credita, aplica um cupom já cadastrado (opcional)
  // e grava tudo em vendasState. Dashboard, ranking de clientes e histórico de compras já
  // leem essa lista sozinhos pelo clienteId/data — nenhum passo extra precisa acontecer
  // além de salvar aqui.
  // ================================================================
  var vendaFormState = null;

  function defaultVendaFormState(){
    return {
      clienteId: null, clienteNome: "Cliente avulso",
      itens: [], variacaoId: catalogoState.variacoes.length ? catalogoState.variacoes[0].id : null,
      quantidade: 1, formaPagamento: "pix", cupom: null
    };
  }

  function openRegistrarVendaForm(){
    vendaFormState = defaultVendaFormState();
    setHidden("vendaClientePicker", true);
    var searchEl = document.getElementById("vendaClienteSearchInput");
    if (searchEl) searchEl.value = "";
    var cupomEl = document.getElementById("vendaCupomInput");
    if (cupomEl) cupomEl.value = "";
    document.querySelectorAll('#vendaFormaPills [data-forma]').forEach(function(p){ p.classList.toggle("active", p.dataset.forma === "pix"); });
    renderRegistrarVenda();
  }

  // Estoque "disponível" já desconta o que a própria venda em montagem reservou pra essa
  // variação — senão daria pra empilhar itens além do que existe só olhando o total bruto.
  function vendaEstoqueDisponivel(variacaoId){
    var estoqueVela = findEstoqueVela(variacaoId);
    var disponivel = estoqueVela ? estoqueVela.quantidade : 0;
    vendaFormState.itens.forEach(function(it){ if (it.variacaoId === variacaoId) disponivel -= it.quantidade; });
    return disponivel;
  }

  function vendaVarPillHTML(v){
    var active = v.id === vendaFormState.variacaoId ? " active" : "";
    return '<div class="pill' + active + '" style="flex:none;" data-var-id="' + v.id + '">' + escapeHtml(variacaoLabel(v)) + ' · ' + vendaEstoqueDisponivel(v.id) + '</div>';
  }

  function vendaItemRowHTML(item, idx){
    var v = findVariacao(item.variacaoId);
    return '' +
      '<div class="raised-sm between" style="padding:13px 16px;margin-bottom:10px;">' +
        '<div style="flex:1;min-width:0;">' +
          '<div style="font-size:13.5px;font-weight:600;">' + escapeHtml(variacaoLabel(v)) + '</div>' +
          '<div style="font-size:11.5px;color:var(--text-faint);margin-top:2px;">' + item.quantidade + ' × ' + fmtMoney(item.precoUnit) + '</div>' +
        '</div>' +
        '<div class="row" style="gap:12px;">' +
          '<div style="font-size:13.5px;font-weight:700;">' + fmtMoney(round2(item.quantidade * item.precoUnit)) + '</div>' +
          '<div class="tapicon" role="button" tabindex="0" aria-label="Remover item · ' + escapeHtml(variacaoLabel(v)) + '" data-action="venda-item-remove" data-idx="' + idx + '" style="width:30px;height:30px;">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function computeVendaSubtotal(){
    return round2(vendaFormState.itens.reduce(function(sum, it){ return sum + it.quantidade * it.precoUnit; }, 0));
  }
  function computeVendaDesconto(subtotal){
    var cupom = vendaFormState.cupom;
    if (!cupom) return 0;
    if (cupom.tipo === "percentual") return round2(subtotal * (cupom.valor / 100));
    if (cupom.tipo === "fixo") return round2(Math.min(cupom.valor, subtotal));
    return 0;
  }

  function renderRegistrarVenda(){
    if (!vendaFormState) return;
    setText("vendaClienteLabel", vendaFormState.clienteNome);

    var pillsEl = document.getElementById("vendaVarPills");
    if (pillsEl) {
      pillsEl.innerHTML = catalogoState.variacoes.length ? catalogoState.variacoes.map(vendaVarPillHTML).join("") : emptyStateHTML({
        icon: ICON_VENDAS, title: "nenhuma variação no catálogo", sub: "cadastre uma variação no Catálogo de Produtos primeiro."
      });
    }
    setText("vendaQtdValue", String(vendaFormState.quantidade));

    var itensEl = document.getElementById("vendaItensList");
    if (itensEl) itensEl.innerHTML = vendaFormState.itens.map(vendaItemRowHTML).join("");
    setHidden("vendaItensEmpty", vendaFormState.itens.length > 0);

    var subtotal = computeVendaSubtotal();
    var desconto = computeVendaDesconto(subtotal);
    var total = round2(subtotal - desconto);
    setText("vendaResumoSubtotal", fmtMoney(subtotal));
    setHidden("vendaResumoDescontoRow", desconto <= 0);
    setText("vendaResumoDesconto", "− " + fmtMoney(desconto));
    setText("vendaResumoTotal", fmtMoney(total));

    setHidden("vendaCupomAplicadoRow", !vendaFormState.cupom);
    if (vendaFormState.cupom) setText("vendaCupomCodigoTxt", vendaFormState.cupom.codigo);

    var submitBtn = document.getElementById("vendaSubmitBtn");
    if (submitBtn) submitBtn.disabled = vendaFormState.itens.length === 0;
  }

  function vendaClienteToggle(){
    var picker = document.getElementById("vendaClientePicker");
    if (!picker) return;
    var opening = picker.hidden;
    picker.hidden = !opening;
    if (opening) {
      var searchEl = document.getElementById("vendaClienteSearchInput");
      if (searchEl) { searchEl.value = ""; searchEl.focus(); }
      renderVendaClienteList("");
    }
  }

  function vendaClienteRowHTML(c){
    return '<div class="raised-sm" role="button" tabindex="0" data-venda-cliente-id="' + c.id + '" style="padding:12px 14px;margin-bottom:9px;">' +
        '<div style="font-size:13.5px;font-weight:600;">' + escapeHtml(c.nome) + '</div>' +
        '<div style="font-size:11.5px;color:var(--text-faint);margin-top:2px;">' + escapeHtml(c.telefone || "") + '</div>' +
      '</div>';
  }

  function renderVendaClienteList(filtro){
    var listEl = document.getElementById("vendaClienteList");
    if (!listEl) return;
    var termo = (filtro || "").trim().toLowerCase();
    var avulsoHTML = '<div class="raised-sm" role="button" tabindex="0" data-venda-cliente-id="avulso" style="padding:12px 14px;margin-bottom:9px;"><div style="font-size:13.5px;font-weight:600;">Cliente avulso</div></div>';
    var itens = clientesState.clientes.filter(function(c){
      return !termo || c.nome.toLowerCase().indexOf(termo) !== -1 || (c.telefone || "").indexOf(termo) !== -1;
    });
    listEl.innerHTML = avulsoHTML + itens.map(vendaClienteRowHTML).join("");
  }

  function vendaClienteSelecionar(id){
    if (id === "avulso") {
      vendaFormState.clienteId = null; vendaFormState.clienteNome = "Cliente avulso";
    } else {
      var c = findCliente(id);
      if (!c) return;
      vendaFormState.clienteId = c.id; vendaFormState.clienteNome = c.nome;
    }
    setHidden("vendaClientePicker", true);
    renderRegistrarVenda();
  }

  function vendaVarSelecionar(id){
    vendaFormState.variacaoId = id;
    vendaFormState.quantidade = 1;
    renderRegistrarVenda();
  }

  function vendaQtdAjustar(delta){
    var max = Math.max(1, vendaEstoqueDisponivel(vendaFormState.variacaoId));
    vendaFormState.quantidade = Math.min(max, Math.max(1, vendaFormState.quantidade + delta));
    renderRegistrarVenda();
  }

  function vendaItemAdicionar(){
    var v = findVariacao(vendaFormState.variacaoId);
    if (!v) { showToast("cadastre uma variação no catálogo antes de vender."); return; }
    var qtd = vendaFormState.quantidade;
    var disp = vendaEstoqueDisponivel(v.id);
    if (disp <= 0) { showToast("sem estoque disponível de " + variacaoLabel(v) + " agora."); return; }
    if (qtd > disp) { showToast("estoque insuficiente — só há " + disp + " " + variacaoLabel(v) + " disponíveis."); return; }
    var existente = vendaFormState.itens.filter(function(it){ return it.variacaoId === v.id; })[0];
    if (existente) existente.quantidade += qtd;
    else vendaFormState.itens.push({ variacaoId: v.id, quantidade: qtd, precoUnit: v.precoVenda, precoTabela: v.precoVenda });
    vendaFormState.quantidade = 1;
    renderRegistrarVenda();
  }

  function vendaItemRemover(idx){
    vendaFormState.itens.splice(idx, 1);
    renderRegistrarVenda();
  }

  function vendaFormaSelecionar(forma){
    vendaFormState.formaPagamento = forma;
    document.querySelectorAll('#vendaFormaPills [data-forma]').forEach(function(p){ p.classList.toggle("active", p.dataset.forma === forma); });
  }

  function vendaCupomAplicar(){
    var input = document.getElementById("vendaCupomInput");
    var codigo = (input.value || "").trim().toUpperCase();
    if (!codigo) { showToast("digite um código de cupom."); return; }
    var cupom = cuponsState.cupons.filter(function(c){ return c.codigo.toUpperCase() === codigo; })[0];
    if (!cupom) { showToast("cupom não encontrado."); return; }
    if (!cupom.ativo) { showToast("esse cupom está inativo."); return; }
    var hoje = todayISO();
    if (cupom.dataInicio && hoje < cupom.dataInicio) { showToast("esse cupom ainda não começou a valer."); return; }
    if (cupom.dataValidade && hoje > cupom.dataValidade) { showToast("esse cupom está vencido."); return; }
    if (cupom.limiteUso > 0 && cupom.usosCount >= cupom.limiteUso) { showToast("esse cupom já atingiu o limite de usos."); return; }
    vendaFormState.cupom = cupom;
    input.value = cupom.codigo;
    renderRegistrarVenda();
    showToast("cupom " + cupom.codigo + " aplicado.");
  }

  function vendaCupomRemover(){
    vendaFormState.cupom = null;
    var input = document.getElementById("vendaCupomInput");
    if (input) input.value = "";
    renderRegistrarVenda();
  }

  function submitVenda(){
    if (!vendaFormState.itens.length) return;
    // Revalida o estoque na hora de confirmar — pode ter mudado desde que os itens foram
    // montados (ex.: um ajuste manual de estoque no meio do caminho).
    for (var i = 0; i < vendaFormState.itens.length; i++) {
      var item = vendaFormState.itens[i];
      var estoqueVela = findEstoqueVela(item.variacaoId);
      var disponivel = estoqueVela ? estoqueVela.quantidade : 0;
      if (item.quantidade > disponivel) {
        showToast("estoque de " + variacaoLabel(findVariacao(item.variacaoId)) + " mudou — só há " + disponivel + " disponíveis agora.");
        renderRegistrarVenda();
        return;
      }
    }

    var today = todayISO();
    var subtotal = computeVendaSubtotal();
    var desconto = computeVendaDesconto(subtotal);
    var total = round2(subtotal - desconto);
    var vendaId = uid("vd");

    vendaFormState.itens.forEach(function(item){
      var estoqueVela = findEstoqueVela(item.variacaoId);
      estoqueVela.quantidade = round2(Math.max(0, estoqueVela.quantidade - item.quantidade));
      producaoEstoqueState.movimentacoes.push({ id: uid("pm"), variacaoId: item.variacaoId, tipo: "saida", quantidade: item.quantidade, data: today, motivo: "Venda", vendaId: vendaId });
    });
    saveProducaoEstoqueState();

    vendasState.vendas.push({
      id: vendaId, clienteId: vendaFormState.clienteId, clienteNome: vendaFormState.clienteNome,
      itens: vendaFormState.itens.map(function(it){ return { variacaoId: it.variacaoId, quantidade: it.quantidade, precoUnit: it.precoUnit, precoTabela: it.precoTabela }; }),
      formaPagamento: vendaFormState.formaPagamento, data: today, subtotal: subtotal,
      cupomCodigo: vendaFormState.cupom ? vendaFormState.cupom.codigo : null, cupomDesconto: desconto, total: total,
      status: "confirmada", origemEncomendaId: null
    });
    saveVendasState();

    if (vendaFormState.cupom) {
      vendaFormState.cupom.usosCount = (vendaFormState.cupom.usosCount || 0) + 1;
      saveCuponsState();
    }

    showToast("venda de " + fmtMoney(total) + " registrada.");
    renderEstoqueHub();
    renderProducaoList();
    renderClientesList();
    renderClientesRanking();
    renderDashboard();
    checarNotificacaoAutomatica();
    showScreen("vendas");
  }

  // ================================================================
  // Encomendas — módulo 15. Fluxo pendente → em produção → entregue. Criar uma encomenda
  // não mexe em estoque (é uma promessa de venda futura, não debita nada ainda); avançar
  // pra "em produção" só marca o status (com um lote existente vinculado, opcional);
  // avançar pra "entregue" é que de fato gera uma venda real — debita o estoque de velas
  // prontas (mesma lógica do submitVenda acima) e grava em vendasState.vendas com
  // origemEncomendaId apontando de volta pra esta encomenda, então dashboard/ranking de
  // clientes/histórico já contam a entrega sozinhos, sem tela extra.
  // ================================================================
  var encomendaFormState = null;
  var encomendaFormModo = "novo"; // "novo" | "editar"
  var currentEncomendaId = null;
  var encomendasFiltroStatus = "todas";
  var encomendaEntregaForma = "pix";

  function findEncomenda(id){ return vendasState.encomendas.filter(function(e){ return e.id === id; })[0]; }

  function encomendaStatusLabel(status){
    if (status === "producao") return "em produção";
    if (status === "entregue") return "entregue";
    return "pendente";
  }
  function encomendaStatusBadgeClass(status){
    if (status === "producao") return "primary";
    if (status === "entregue") return "good";
    return "warn";
  }
  function computeEncomendaTotal(itens){
    return round2(itens.reduce(function(sum, it){ return sum + it.quantidade * it.precoUnit; }, 0));
  }
  function encomendaItensResumo(itens){
    return itens.map(function(it){ return it.quantidade + "× " + variacaoLabel(findVariacao(it.variacaoId)); }).join(", ");
  }

  // ---- Lista ----
  function encomendasFiltradas(){
    var arr = vendasState.encomendas.slice().sort(function(a, b){ return a.dataCriacao < b.dataCriacao ? 1 : -1; });
    if (encomendasFiltroStatus === "todas") return arr;
    return arr.filter(function(e){ return e.status === encomendasFiltroStatus; });
  }
  function encomendaRowHTML(enc){
    return '' +
      '<div class="raised-sm" role="button" tabindex="0" aria-label="Ver encomenda de ' + escapeHtml(enc.clienteNome) + '" data-encomenda-id="' + enc.id + '" style="padding:14px 16px;margin-bottom:11px;">' +
        '<div class="between" style="margin-bottom:6px;">' +
          '<div style="font-size:14px;font-weight:600;">' + escapeHtml(enc.clienteNome) + '</div>' +
          '<span class="badge ' + encomendaStatusBadgeClass(enc.status) + '">' + encomendaStatusLabel(enc.status) + '</span>' +
        '</div>' +
        '<div style="font-size:12px;color:var(--text-faint);margin-bottom:4px;">' + escapeHtml(encomendaItensResumo(enc.itens)) + '</div>' +
        '<div class="between">' +
          '<div style="font-size:11px;color:var(--text-faint);">' + (enc.dataPrevista ? "entrega prevista " + formatDateBR(enc.dataPrevista) : "sem data prevista") + '</div>' +
          '<div style="font-size:13px;font-weight:700;">' + fmtMoney(computeEncomendaTotal(enc.itens)) + '</div>' +
        '</div>' +
      '</div>';
  }
  function renderEncomendas(){
    var itens = encomendasFiltradas();
    var listEl = document.getElementById("encomendasList");
    if (listEl) {
      listEl.innerHTML = itens.length ? itens.map(encomendaRowHTML).join("") : emptyStateHTML({
        icon: ICON_VENDAS,
        title: encomendasFiltroStatus === "todas" ? "nenhuma encomenda ainda" : "nenhuma encomenda " + encomendaStatusLabel(encomendasFiltroStatus),
        sub: encomendasFiltroStatus === "todas" ? 'toque no "+" acima pra registrar a primeira.' : "mude o filtro acima pra ver as outras."
      });
    }
    var n = vendasState.encomendas.length;
    setText("encomendasCount", n + (n === 1 ? " encomenda" : " encomendas"));
    document.querySelectorAll('#encomendasFiltroPills [data-status]').forEach(function(p){ p.classList.toggle("active", p.dataset.status === encomendasFiltroStatus); });
  }
  function setEncomendasFiltro(status){ encomendasFiltroStatus = status; renderEncomendas(); }

  // ---- Formulário (novo / editar) ----
  function defaultEncomendaFormState(){
    return {
      clienteId: null, clienteNome: "Cliente avulso", itens: [],
      variacaoId: catalogoState.variacoes.length ? catalogoState.variacoes[0].id : null,
      quantidade: 1, dataPrevista: "", observacoes: ""
    };
  }
  function openEncomendaForm(modo, id){
    encomendaFormModo = modo;
    if (modo === "editar" && id) {
      var enc = findEncomenda(id);
      if (!enc) return;
      currentEncomendaId = id;
      encomendaFormState = {
        clienteId: enc.clienteId, clienteNome: enc.clienteNome,
        itens: enc.itens.map(function(it){ return { variacaoId: it.variacaoId, quantidade: it.quantidade, precoUnit: it.precoUnit }; }),
        variacaoId: catalogoState.variacoes.length ? catalogoState.variacoes[0].id : null,
        quantidade: 1, dataPrevista: enc.dataPrevista || "", observacoes: enc.observacoes || ""
      };
      setText("encomendaFormTitle", "editar encomenda");
      setHidden("encomendaFormRemoveWrap", false);
    } else {
      currentEncomendaId = null;
      encomendaFormState = defaultEncomendaFormState();
      setText("encomendaFormTitle", "nova encomenda");
      setHidden("encomendaFormRemoveWrap", true);
    }
    setHidden("encomendaClientePicker", true);
    var searchEl = document.getElementById("encomendaClienteSearchInput");
    if (searchEl) searchEl.value = "";
    var dataEl = document.getElementById("encomendaFormDataPrevista");
    if (dataEl) dataEl.value = encomendaFormState.dataPrevista || "";
    var obsEl = document.getElementById("encomendaFormObs");
    if (obsEl) obsEl.value = encomendaFormState.observacoes || "";
    renderEncomendaForm();
  }
  function encomendaVarPillHTML(v){
    var active = v.id === encomendaFormState.variacaoId ? " active" : "";
    return '<div class="pill' + active + '" style="flex:none;" data-enc-var-id="' + v.id + '">' + escapeHtml(variacaoLabel(v)) + '</div>';
  }
  function encomendaItemRowHTML(item, idx){
    var v = findVariacao(item.variacaoId);
    return '' +
      '<div class="raised-sm between" style="padding:13px 16px;margin-bottom:10px;">' +
        '<div style="flex:1;min-width:0;">' +
          '<div style="font-size:13.5px;font-weight:600;">' + escapeHtml(variacaoLabel(v)) + '</div>' +
          '<div style="font-size:11.5px;color:var(--text-faint);margin-top:2px;">' + item.quantidade + ' × ' + fmtMoney(item.precoUnit) + '</div>' +
        '</div>' +
        '<div class="row" style="gap:12px;">' +
          '<div style="font-size:13.5px;font-weight:700;">' + fmtMoney(round2(item.quantidade * item.precoUnit)) + '</div>' +
          '<div class="tapicon" role="button" tabindex="0" aria-label="Remover item · ' + escapeHtml(variacaoLabel(v)) + '" data-action="encomenda-item-remove" data-idx="' + idx + '" style="width:30px;height:30px;">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>' +
          '</div>' +
        '</div>' +
      '</div>';
  }
  function renderEncomendaForm(){
    if (!encomendaFormState) return;
    setText("encomendaClienteLabel", encomendaFormState.clienteNome);
    var pillsEl = document.getElementById("encomendaVarPills");
    if (pillsEl) {
      pillsEl.innerHTML = catalogoState.variacoes.length ? catalogoState.variacoes.map(encomendaVarPillHTML).join("") : emptyStateHTML({
        icon: ICON_VENDAS, title: "nenhuma variação no catálogo", sub: "cadastre uma variação no Catálogo de Produtos primeiro."
      });
    }
    setText("encomendaQtdValue", String(encomendaFormState.quantidade));
    var itensEl = document.getElementById("encomendaItensList");
    if (itensEl) itensEl.innerHTML = encomendaFormState.itens.map(encomendaItemRowHTML).join("");
    setHidden("encomendaItensEmpty", encomendaFormState.itens.length > 0);
    setText("encomendaFormTotal", fmtMoney(computeEncomendaTotal(encomendaFormState.itens)));
    var submitBtn = document.getElementById("encomendaFormSaveBtn");
    if (submitBtn) submitBtn.disabled = encomendaFormState.itens.length === 0;
  }
  function encomendaClienteToggle(){
    var picker = document.getElementById("encomendaClientePicker");
    if (!picker) return;
    var opening = picker.hidden;
    picker.hidden = !opening;
    if (opening) {
      var searchEl = document.getElementById("encomendaClienteSearchInput");
      if (searchEl) { searchEl.value = ""; searchEl.focus(); }
      renderEncomendaClienteList("");
    }
  }
  function encomendaClienteRowHTML(c){
    return '<div class="raised-sm" role="button" tabindex="0" data-encomenda-cliente-id="' + c.id + '" style="padding:12px 14px;margin-bottom:9px;">' +
        '<div style="font-size:13.5px;font-weight:600;">' + escapeHtml(c.nome) + '</div>' +
        '<div style="font-size:11.5px;color:var(--text-faint);margin-top:2px;">' + escapeHtml(c.telefone || "") + '</div>' +
      '</div>';
  }
  function renderEncomendaClienteList(filtro){
    var listEl = document.getElementById("encomendaClienteList");
    if (!listEl) return;
    var termo = (filtro || "").trim().toLowerCase();
    var avulsoHTML = '<div class="raised-sm" role="button" tabindex="0" data-encomenda-cliente-id="avulso" style="padding:12px 14px;margin-bottom:9px;"><div style="font-size:13.5px;font-weight:600;">Cliente avulso</div></div>';
    var itens = clientesState.clientes.filter(function(c){
      return !termo || c.nome.toLowerCase().indexOf(termo) !== -1 || (c.telefone || "").indexOf(termo) !== -1;
    });
    listEl.innerHTML = avulsoHTML + itens.map(encomendaClienteRowHTML).join("");
  }
  function encomendaClienteSelecionar(id){
    if (id === "avulso") {
      encomendaFormState.clienteId = null; encomendaFormState.clienteNome = "Cliente avulso";
    } else {
      var c = findCliente(id);
      if (!c) return;
      encomendaFormState.clienteId = c.id; encomendaFormState.clienteNome = c.nome;
    }
    setHidden("encomendaClientePicker", true);
    renderEncomendaForm();
  }
  function encomendaVarSelecionar(id){
    encomendaFormState.variacaoId = id;
    encomendaFormState.quantidade = 1;
    renderEncomendaForm();
  }
  function encomendaQtdAjustar(delta){
    encomendaFormState.quantidade = Math.max(1, encomendaFormState.quantidade + delta);
    renderEncomendaForm();
  }
  function encomendaItemAdicionar(){
    var v = findVariacao(encomendaFormState.variacaoId);
    if (!v) { showToast("cadastre uma variação no catálogo antes de fazer uma encomenda."); return; }
    var qtd = encomendaFormState.quantidade;
    var existente = encomendaFormState.itens.filter(function(it){ return it.variacaoId === v.id; })[0];
    if (existente) existente.quantidade += qtd;
    else encomendaFormState.itens.push({ variacaoId: v.id, quantidade: qtd, precoUnit: v.precoVenda });
    encomendaFormState.quantidade = 1;
    renderEncomendaForm();
  }
  function encomendaItemRemover(idx){
    encomendaFormState.itens.splice(idx, 1);
    renderEncomendaForm();
  }
  function submitEncomendaForm(){
    if (!encomendaFormState.itens.length) return;
    var itensSalvos = encomendaFormState.itens.map(function(it){ return { variacaoId: it.variacaoId, quantidade: it.quantidade, precoUnit: it.precoUnit }; });
    if (encomendaFormModo === "editar" && currentEncomendaId) {
      var enc = findEncomenda(currentEncomendaId);
      if (!enc) return;
      enc.clienteId = encomendaFormState.clienteId;
      enc.clienteNome = encomendaFormState.clienteNome;
      enc.itens = itensSalvos;
      enc.dataPrevista = encomendaFormState.dataPrevista || null;
      enc.observacoes = encomendaFormState.observacoes || "";
    } else {
      vendasState.encomendas.push({
        id: uid("enc"), clienteId: encomendaFormState.clienteId, clienteNome: encomendaFormState.clienteNome,
        itens: itensSalvos, dataPrevista: encomendaFormState.dataPrevista || null,
        observacoes: encomendaFormState.observacoes || "", status: "pendente", loteId: null,
        dataCriacao: todayISO(), vendaId: null
      });
    }
    saveVendasState();
    showToast(encomendaFormModo === "editar" ? "encomenda atualizada." : "encomenda registrada.");
    renderEncomendas();
    showScreen("encomendas");
  }
  // ---- Detalhe / avanço de status ----
  function openEncomendaDetalhe(id){
    currentEncomendaId = id;
    renderEncomendaDetalhe();
    showScreen("encomendaDetalhe");
  }
  function encomendaProximoStatusLabel(status){
    if (status === "pendente") return "iniciar produção";
    if (status === "producao") return "marcar como entregue";
    return null;
  }
  function encomendaLoteRowHTML(lote){
    var v = findVariacao(lote.variacaoId);
    return '<div class="raised-sm" role="button" tabindex="0" data-encomenda-lote-id="' + lote.id + '" style="padding:12px 14px;margin-bottom:9px;">' +
        '<div style="font-size:13.5px;font-weight:600;">' + escapeHtml(variacaoLabel(v)) + '</div>' +
        '<div style="font-size:11.5px;color:var(--text-faint);margin-top:2px;">' + formatDateBR(lote.data) + ' · ' + lote.quantidade + ' velas</div>' +
      '</div>';
  }
  function renderEncomendaLoteList(){
    var listEl = document.getElementById("encomendaLoteList");
    if (!listEl) return;
    var nenhumHTML = '<div class="raised-sm" role="button" tabindex="0" data-encomenda-lote-id="nenhum" style="padding:12px 14px;margin-bottom:9px;"><div style="font-size:13.5px;font-weight:600;">nenhum lote</div></div>';
    listEl.innerHTML = nenhumHTML + lotesOrdenados().map(encomendaLoteRowHTML).join("");
  }
  function encomendaLoteToggle(){
    var picker = document.getElementById("encomendaLotePicker");
    if (!picker) return;
    var opening = picker.hidden;
    picker.hidden = !opening;
    if (opening) renderEncomendaLoteList();
  }
  function encomendaLoteSelecionar(id){
    var enc = findEncomenda(currentEncomendaId);
    if (!enc) return;
    enc.loteId = id === "nenhum" ? null : id;
    saveVendasState();
    setHidden("encomendaLotePicker", true);
    renderEncomendaDetalhe();
  }
  function encomendaFormaEntregaSelecionar(forma){
    encomendaEntregaForma = forma;
    document.querySelectorAll('#encomendaFormaPills [data-forma]').forEach(function(p){ p.classList.toggle("active", p.dataset.forma === forma); });
  }
  function renderEncomendaDetalhe(){
    var enc = findEncomenda(currentEncomendaId);
    if (!enc) return;
    setText("encomendaDetalheCliente", enc.clienteNome);
    setText("encomendaDetalheData", enc.dataPrevista ? formatDateBR(enc.dataPrevista) : "sem data prevista");
    setHidden("encomendaDetalheObsRow", !enc.observacoes);
    setText("encomendaDetalheObs", enc.observacoes || "");

    var badgeEl = document.getElementById("encomendaDetalheStatusBadge");
    if (badgeEl) { badgeEl.className = "badge " + encomendaStatusBadgeClass(enc.status); badgeEl.textContent = encomendaStatusLabel(enc.status); }

    var itensEl = document.getElementById("encomendaDetalheItensList");
    if (itensEl) itensEl.innerHTML = enc.itens.map(function(it){
      var v = findVariacao(it.variacaoId);
      return '<div class="between" style="padding:10px 0;border-bottom:1px solid var(--line);">' +
          '<span style="font-size:13px;color:var(--text-faint);">' + escapeHtml(variacaoLabel(v)) + ' × ' + it.quantidade + '</span>' +
          '<span style="font-size:13.5px;font-weight:700;">' + fmtMoney(round2(it.quantidade * it.precoUnit)) + '</span>' +
        '</div>';
    }).join("");
    setText("encomendaDetalheTotal", fmtMoney(computeEncomendaTotal(enc.itens)));

    var lote = enc.loteId ? lotesState.lotes.filter(function(l){ return l.id === enc.loteId; })[0] : null;
    setText("encomendaDetalheLoteLabel", lote ? (variacaoLabel(findVariacao(lote.variacaoId)) + " · " + formatDateBR(lote.data)) : "nenhum lote vinculado");
    setHidden("encomendaDetalheLoteRow", enc.status === "entregue");
    setHidden("encomendaLotePicker", true);

    var mostrarForma = enc.status === "producao";
    setHidden("encomendaFormaPagamentoWrap", !mostrarForma);
    if (mostrarForma) {
      encomendaEntregaForma = "pix";
      document.querySelectorAll('#encomendaFormaPills [data-forma]').forEach(function(p){ p.classList.toggle("active", p.dataset.forma === "pix"); });
    }

    var proximoLabel = encomendaProximoStatusLabel(enc.status);
    setHidden("encomendaAvancarBtn", !proximoLabel);
    if (proximoLabel) setText("encomendaAvancarBtn", proximoLabel);
    setHidden("encomendaConvertidaNota", enc.status !== "entregue");
  }
  function encomendaAvancarStatus(){
    var enc = findEncomenda(currentEncomendaId);
    if (!enc) return;

    if (enc.status === "pendente") {
      enc.status = "producao";
      saveVendasState();
      showToast("encomenda em produção.");
      renderEncomendaDetalhe();
      renderEncomendas();
      return;
    }

    if (enc.status === "producao") {
      // Revalida o estoque de velas prontas na hora de confirmar a entrega — pode ter
      // mudado desde que a encomenda foi criada.
      for (var i = 0; i < enc.itens.length; i++) {
        var item = enc.itens[i];
        var estoqueVela = findEstoqueVela(item.variacaoId);
        var disponivel = estoqueVela ? estoqueVela.quantidade : 0;
        if (item.quantidade > disponivel) {
          showToast("estoque de " + variacaoLabel(findVariacao(item.variacaoId)) + " insuficiente — só há " + disponivel + " prontas agora.");
          return;
        }
      }
      var total = computeEncomendaTotal(enc.itens);
      if (!window.confirm("Marcar como entregue? Isso registra uma venda de " + fmtMoney(total) + " e debita o estoque de velas prontas.")) return;

      var today = todayISO();
      var vendaId = uid("vd");
      enc.itens.forEach(function(item){
        var estoqueVela = findEstoqueVela(item.variacaoId);
        estoqueVela.quantidade = round2(Math.max(0, estoqueVela.quantidade - item.quantidade));
        producaoEstoqueState.movimentacoes.push({ id: uid("pm"), variacaoId: item.variacaoId, tipo: "saida", quantidade: item.quantidade, data: today, motivo: "Venda", vendaId: vendaId });
      });
      saveProducaoEstoqueState();

      vendasState.vendas.push({
        id: vendaId, clienteId: enc.clienteId, clienteNome: enc.clienteNome,
        itens: enc.itens.map(function(it){ return { variacaoId: it.variacaoId, quantidade: it.quantidade, precoUnit: it.precoUnit, precoTabela: it.precoUnit }; }),
        formaPagamento: encomendaEntregaForma, data: today, subtotal: total, cupomCodigo: null, cupomDesconto: 0, total: total,
        status: "confirmada", origemEncomendaId: enc.id
      });
      enc.status = "entregue";
      enc.vendaId = vendaId;
      saveVendasState();

      showToast("encomenda entregue — venda de " + fmtMoney(total) + " registrada.");
      renderEncomendaDetalhe();
      renderEncomendas();
      renderEstoqueHub();
      renderProducaoList();
      renderClientesList();
      renderClientesRanking();
      renderDashboard();
      checarNotificacaoAutomatica();
    }
  }
  function excluirEncomenda(){
    if (!currentEncomendaId) return;
    if (!window.confirm("Excluir esta encomenda? Essa ação não pode ser desfeita.")) return;
    vendasState.encomendas = vendasState.encomendas.filter(function(e){ return e.id !== currentEncomendaId; });
    saveVendasState();
    showToast("encomenda excluída.");
    renderEncomendas();
    showScreen("encomendas");
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

    var nLotes = lotesState.lotes.length;
    setText("folderLotesSub", nLotes + (nLotes === 1 ? " lote registrado" : " lotes registrados"));
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
    checarNotificacaoAutomatica();
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
          '<div class="raised-sm" role="button" tabindex="0" aria-label="Adicionar uma vela · ' + escapeHtml(nome) + '" data-action="prod-inc" data-var-id="' + v.id + '" style="width:34px;height:34px;border-radius:12px;display:flex;align-items:center;justify-content:center;color:var(--card-text);"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></div>' +
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
    checarNotificacaoAutomatica();
  }

  // ================================================================
  // Calculadora de Velas — planeja um lote, mostra custo/margem e é quem de fato registra
  // a produção (módulo 5+6 fundidos numa tela só). Ajustes por lote (chips +5%/−5%) valem
  // pro cálculo do que será debitado ao registrar; "salvar como novo padrão" é o único
  // jeito de torná-los permanentes em configState pros próximos lotes.
  // ================================================================
  var calcState = { variacaoId: null, quantidade: 24, ajustes: {} };

  function calcVarPillHTML(v){
    var active = v.id === calcState.variacaoId ? " active" : "";
    return '<div class="pill' + active + '" style="flex:none;" data-var-id="' + v.id + '">' + escapeHtml(variacaoLabel(v)) + '</div>';
  }

  function calcInsumoRowHTML(item){
    var falta = item.falta;
    var statusHTML = falta > 0
      ? '<div style="font-size:10.5px;color:var(--warn);">falta ' + numToStr(falta) + '</div>'
      : '<div style="font-size:10.5px;color:var(--text-faint);">tem ' + numToStr(round2(item.precisa - falta)) + '</div>';
    var ajusteTxt = (item.ajustePct > 0 ? "+" : "") + item.ajustePct + "%";
    return '' +
      '<div class="between" style="padding:12px 0;border-bottom:1px solid var(--line);">' +
        '<div style="flex:1;min-width:0;">' +
          '<div style="font-size:13.5px;font-weight:500;">' + escapeHtml(item.nome) + '</div>' +
          '<div class="row" style="gap:4px;margin-top:4px;">' +
            '<div class="pressed" role="button" tabindex="0" aria-label="Diminuir 5% · ' + escapeHtml(item.nome) + '" data-action="calc-adj-dec" data-calc-insumo-id="' + item.insumoId + '" style="width:22px;height:22px;border-radius:8px;display:flex;align-items:center;justify-content:center;color:var(--text-faint);"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14"/></svg></div>' +
            '<div style="font-size:10.5px;color:var(--text-faint);min-width:30px;text-align:center;">' + ajusteTxt + '</div>' +
            '<div class="pressed" role="button" tabindex="0" aria-label="Aumentar 5% · ' + escapeHtml(item.nome) + '" data-action="calc-adj-inc" data-calc-insumo-id="' + item.insumoId + '" style="width:22px;height:22px;border-radius:8px;display:flex;align-items:center;justify-content:center;color:var(--text-faint);"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></div>' +
          '</div>' +
        '</div>' +
        '<div style="text-align:right;">' +
          '<div style="font-size:13.5px;font-weight:700;">' + fmtQty(item.precisa, item.unidade) + '</div>' +
          statusHTML +
        '</div>' +
      '</div>';
  }

  // Insumos necessários + custo pro lote inteiro, já com os ajustes por chip aplicados.
  // Reaproveitada tanto pra renderizar a lista/o card de custo quanto na hora de registrar
  // de verdade — pra garantir que o que a pessoa vê é exatamente o que vai ser debitado.
  function computeInsumosLote(v, quantidade, ajustes){
    ajustes = ajustes || {};
    var receita = receitaPadraoVariacao(v);
    var itens = [], custoTotal = 0, insuficiente = false;
    receita.forEach(function(item){
      var insumo = findInsumo(item.insumoId);
      if (!insumo) return;
      var base = item.qtd * quantidade;
      var comPerda = item.perde ? base * (1 + configState.perdaDerretimento / 100) : base;
      var ajustePct = ajustes[item.insumoId] || 0;
      var precisa = round2(comPerda * (1 + ajustePct / 100));
      var custoItem = round2(precisa * insumo.custoMedio);
      var falta = round2(precisa - insumo.quantidade);
      if (falta > 0) insuficiente = true;
      custoTotal += custoItem;
      itens.push({ insumoId: insumo.id, nome: insumo.nome, unidade: insumo.unidade, precisa: precisa, custoItem: custoItem, falta: falta, ajustePct: ajustePct });
    });
    return { itens: itens, custoTotal: round2(custoTotal), insuficiente: insuficiente };
  }

  function renderCalc(){
    if (!calcState.variacaoId || !findVariacao(calcState.variacaoId)) {
      calcState.variacaoId = catalogoState.variacoes.length ? catalogoState.variacoes[0].id : null;
    }
    var v = findVariacao(calcState.variacaoId);

    var pillsEl = document.getElementById("calcVarPills");
    if (pillsEl) pillsEl.innerHTML = catalogoState.variacoes.map(calcVarPillHTML).join("");

    var warnEl = document.getElementById("calcWarning");
    var btnEl = document.getElementById("calcRegistrarBtn");

    if (!v) {
      ["calcInsumosList"].forEach(function(id){ var el = document.getElementById(id); if (el) el.innerHTML = emptyStateHTML({
        icon: ICON_PRODUCAO, title: "nenhuma variação no catálogo", sub: "cadastre uma variação no Catálogo de Produtos primeiro."
      }); });
      setHidden("calcSaveWrap", true);
      setText("calcCustoOut", "—"); setText("calcReceitaOut", "—"); setText("calcMargemOut", "—");
      if (warnEl) warnEl.hidden = true;
      if (btnEl) btnEl.setAttribute("disabled", "disabled");
      return;
    }

    setText("calcQtdOut", calcState.quantidade);
    setText("calcPerdaNote", "perda " + numToStr(configState.perdaDerretimento) + "% inclusa");

    var calc = computeInsumosLote(v, calcState.quantidade, calcState.ajustes);
    var hasAjuste = calc.itens.some(function(item){ return item.ajustePct; });
    var listEl = document.getElementById("calcInsumosList");
    if (listEl) listEl.innerHTML = calc.itens.map(calcInsumoRowHTML).join("");

    setText("calcJarrasOut", calcState.quantidade + " un");
    setText("calcJarraCap", numToStr(configState.jarraCapacidadeMl) + " ml");
    setHidden("calcSaveWrap", !hasAjuste);

    var receita = round2((v.precoVenda || 0) * calcState.quantidade);
    var margem = round2(receita - calc.custoTotal);
    setText("calcCustoOut", fmtMoney(calc.custoTotal));
    setText("calcReceitaOut", fmtMoney(receita));
    setText("calcMargemOut", fmtMoney(margem));

    if (warnEl && btnEl) {
      if (calc.insuficiente) {
        warnEl.textContent = "estoque de insumo insuficiente pra este lote — reduza a quantidade ou registre uma compra.";
        warnEl.hidden = false;
        btnEl.setAttribute("disabled", "disabled");
      } else {
        warnEl.hidden = true;
        btnEl.removeAttribute("disabled");
      }
    }
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

  // Registrar produção: debita cada insumo (mesma auditoria de saída do Estoque de
  // Insumos, motivo "Produção", incluindo os ajustes por chip desta simulação), credita a
  // vela pronta no Estoque de Produção e cria o lote em lotesState — os três marcados com
  // o mesmo loteId, pra excluirLote() (módulo 6, abaixo) saber exatamente o que reverter.
  // A margem mostrada acima é bruta (preço de venda − custo de insumo, sem custo fixo
  // nenhum) — o lucro líquido real, já rateado, é o card do Dashboard.
  function registrarProducao(){
    var v = findVariacao(calcState.variacaoId);
    if (!v) return;
    var calc = computeInsumosLote(v, calcState.quantidade, calcState.ajustes);
    if (calc.insuficiente) return;
    var today = todayISO();
    var loteId = uid("l");
    var quantidade = calcState.quantidade;

    calc.itens.forEach(function(item){
      var insumo = findInsumo(item.insumoId);
      if (!insumo) return;
      insumo.quantidade = round2(Math.max(0, insumo.quantidade - item.precisa));
      estoqueState.movimentacoes.push({ id: uid("m"), insumoId: insumo.id, tipo: "saida", quantidade: item.precisa, valor: item.custoItem, motivo: "Produção", data: today, loteId: loteId });
    });
    saveEstoqueState();

    var estoqueVela = findEstoqueVela(v.id);
    if (!estoqueVela) { estoqueVela = { variacaoId: v.id, quantidade: 0, minimo: 0 }; producaoEstoqueState.estoques.push(estoqueVela); }
    estoqueVela.quantidade += quantidade;
    producaoEstoqueState.movimentacoes.push({ id: uid("pm"), variacaoId: v.id, tipo: "entrada", quantidade: quantidade, data: today, motivo: "Produção", loteId: loteId });
    saveProducaoEstoqueState();

    var receita = round2((v.precoVenda || 0) * quantidade);
    lotesState.lotes.push({
      id: loteId, data: today, variacaoId: v.id, quantidade: quantidade,
      custoTotal: calc.custoTotal, receitaTotal: receita,
      insumosUsados: calc.itens.map(function(item){ return { insumoId: item.insumoId, nome: item.nome, quantidade: item.precisa, unidade: item.unidade }; })
    });
    saveLotesState();

    showToast(quantidade + " velas de " + variacaoLabel(v) + " registradas na produção.");
    calcState.quantidade = 24;
    calcState.ajustes = {};

    renderEstoqueInsumosList();
    renderEstoqueHub();
    renderProducaoList();
    renderCalc();
    renderRegistroProducao();
    renderDashboard();
    checarNotificacaoAutomatica();
    showScreen("registroProducao");
  }

  // ================================================================
  // Registro de Produção — módulo 6
  // Consulta o histórico de lotes que registrarProducao() (acima) cria — não existe um
  // jeito de lançar um lote direto por aqui, só de consultar, excluir e exportar. Excluir
  // reverte automaticamente o débito de insumos e o crédito de velas prontas daquele lote,
  // usando o loteId gravado nas movimentações na hora do registro, pra não deixar o
  // estoque desalinhado.
  // ================================================================
  var currentLoteId = null;

  function lotesOrdenados(){
    return lotesState.lotes.slice().sort(function(a, b){
      if (a.data !== b.data) return a.data < b.data ? 1 : -1;
      return a.id < b.id ? 1 : -1;
    });
  }

  function loteRowHTML(lote){
    var v = findVariacao(lote.variacaoId);
    return '' +
      '<div class="raised-sm between" role="button" tabindex="0" aria-label="Ver lote · ' + escapeHtml(variacaoLabel(v)) + '" data-lote-id="' + lote.id + '" style="padding:15px 16px;margin-bottom:11px;">' +
        '<div>' +
          '<div style="font-size:14px;font-weight:600;">' + escapeHtml(variacaoLabel(v)) + '</div>' +
          '<div style="font-size:11.5px;color:var(--text-faint);margin-top:2px;">' + formatDateBR(lote.data) + ' · ' + lote.quantidade + ' velas</div>' +
        '</div>' +
        '<div style="text-align:right;">' +
          '<div style="font-size:13.5px;font-weight:700;">' + fmtMoney(lote.custoTotal) + '</div>' +
          '<div style="font-size:11px;color:var(--text-faint);margin-top:2px;">custo do lote</div>' +
        '</div>' +
      '</div>';
  }

  function renderRegistroProducao(){
    var lotes = lotesOrdenados();
    var listEl = document.getElementById("lotesList");
    if (listEl) {
      listEl.innerHTML = lotes.length ? lotes.map(loteRowHTML).join("") : emptyStateHTML({
        icon: ICON_PRODUCAO, title: "nenhum lote registrado", sub: "registre uma produção na Calculadora de Velas pra ver o histórico aqui."
      });
    }
    var n = lotesState.lotes.length;
    setText("lotesCount", n + (n === 1 ? " lote" : " lotes"));
  }

  function openLoteDetalhe(id){
    currentLoteId = id;
    renderLoteDetalhe();
    showScreen("loteDetalhe");
  }

  function renderLoteDetalhe(){
    var lote = lotesState.lotes.filter(function(l){ return l.id === currentLoteId; })[0];
    if (!lote) return;
    var v = findVariacao(lote.variacaoId);
    setText("loteDetalheTitulo", variacaoLabel(v));
    setText("loteDetalheData", formatDateBR(lote.data));
    setText("loteDetalheQtd", lote.quantidade + " velas");
    setText("loteDetalheCusto", fmtMoney(lote.custoTotal));
    setText("loteDetalheReceita", fmtMoney(lote.receitaTotal));
    setText("loteDetalheMargem", fmtMoney(round2(lote.receitaTotal - lote.custoTotal)));

    var listEl = document.getElementById("loteDetalheInsumosList");
    if (listEl) {
      listEl.innerHTML = lote.insumosUsados.map(function(item, idx){
        var borderStyle = idx === lote.insumosUsados.length - 1 ? "" : "border-bottom:1px solid var(--line);";
        return '<div class="between" style="padding:12px 0;' + borderStyle + '">' +
          '<div style="font-size:13.5px;font-weight:500;">' + escapeHtml(item.nome) + '</div>' +
          '<div style="font-size:13.5px;font-weight:700;">' + fmtQty(item.quantidade, item.unidade) + '</div>' +
        '</div>';
      }).join("");
    }
  }

  // Exclui o lote e desfaz exatamente o que registrarProducao() fez: devolve aos insumos a
  // quantidade que tinha sido debitada, tira da vela pronta a quantidade que tinha sido
  // creditada, e some com as movimentações de auditoria daquele loteId (senão elas
  // ficariam "penduradas" apontando pra um lote que não existe mais).
  function excluirLote(){
    var lote = lotesState.lotes.filter(function(l){ return l.id === currentLoteId; })[0];
    if (!lote) return;
    if (!window.confirm('Excluir este lote e reverter o débito de insumos e o crédito de velas prontas?')) return;

    estoqueState.movimentacoes.filter(function(m){ return m.loteId === currentLoteId; }).forEach(function(m){
      var insumo = findInsumo(m.insumoId);
      if (insumo) insumo.quantidade = round2(insumo.quantidade + m.quantidade);
    });
    estoqueState.movimentacoes = estoqueState.movimentacoes.filter(function(m){ return m.loteId !== currentLoteId; });
    saveEstoqueState();

    producaoEstoqueState.movimentacoes.filter(function(m){ return m.loteId === currentLoteId; }).forEach(function(m){
      var estoqueVela = findEstoqueVela(m.variacaoId);
      if (estoqueVela) estoqueVela.quantidade = Math.max(0, estoqueVela.quantidade - m.quantidade);
    });
    producaoEstoqueState.movimentacoes = producaoEstoqueState.movimentacoes.filter(function(m){ return m.loteId !== currentLoteId; });
    saveProducaoEstoqueState();

    lotesState.lotes = lotesState.lotes.filter(function(l){ return l.id !== currentLoteId; });
    saveLotesState();

    showToast("registro excluído — estoque de insumos e de velas prontas revertido.");
    renderEstoqueInsumosList();
    renderEstoqueHub();
    renderProducaoList();
    renderCalc();
    renderRegistroProducao();
    renderDashboard();
    checarNotificacaoAutomatica();
    showScreen("registroProducao");
  }

  // Exportação real, sem backend nem OAuth (a conta deste app já é só local, ver módulo 9
  // acima) — CSV com ; e vírgula decimal (padrão pt-BR de Planilhas/Excel), pronto pra
  // Arquivo > Importar no Google Planilhas. O PDF usa a própria @media print de style.css
  // (já esconde dock/topbar/backrow), então window.print() nesta tela já sai formatado.
  function exportarLotesCSV(){
    var linhas = [["data", "variação", "quantidade", "custo do lote", "receita da venda", "margem bruta", "insumos usados"]];
    lotesOrdenados().slice().reverse().forEach(function(lote){
      var v = findVariacao(lote.variacaoId);
      var insumosTxt = lote.insumosUsados.map(function(i){ return i.nome + " " + fmtQty(i.quantidade, i.unidade); }).join(" · ");
      linhas.push([formatDateBR(lote.data), variacaoLabel(v), lote.quantidade, numToStr(lote.custoTotal), numToStr(lote.receitaTotal), numToStr(round2(lote.receitaTotal - lote.custoTotal)), insumosTxt]);
    });
    var csv = linhas.map(function(linha){
      return linha.map(function(campo){ return '"' + String(campo).replace(/"/g, '""') + '"'; }).join(";");
    }).join("\r\n");
    var blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "registro-de-producao.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("CSV exportado — no Google Planilhas, use Arquivo > Importar.");
  }

  function exportarLotesPDF(){
    window.print();
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
    // Escondido quando zero: o empty state ("tudo certo por aqui") logo abaixo já diz a
    // mesma coisa de um jeito mais acolhedor — "0 itens..." em cima dele só repetia a
    // informação duas vezes seguidas.
    var countEl = document.getElementById("reposicaoCount");
    if (countEl) {
      countEl.hidden = !items.length;
      countEl.textContent = items.length + (items.length === 1 ? " item abaixo do mínimo, em ordem de prioridade" : " itens abaixo do mínimo, em ordem de prioridade");
    }
    renderNotifCanal();
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
  // Notificação do aviso de reposição — canais (push no app / e-mail / WhatsApp, um ou vários
  // ao mesmo tempo), parte do módulo 7. "Push no app" usa a Web Notification API nativa do
  // navegador, sem servidor. E-mail e WhatsApp passam pela Edge Function "enviar-aviso" do
  // projeto Supabase ponto-paragrafo (Resend pro e-mail, Twilio pro WhatsApp) — até esse
  // projeto ter as chaves/credenciais configuradas nos secrets, a função responde
  // { ok:false, pendente:true } e o app mostra "configuração pendente" pro canal.
  // Disparo automático (checarNotificacaoAutomatica) roda só depois de ações que mudam
  // estoque (sempre dentro do clique que gerou a mudança, pra pedir permissão de push com um
  // gesto do usuário por trás, como os navegadores exigem) e evita repetir o mesmo aviso: só
  // manda de novo se o conjunto de itens abaixo do mínimo ou de canais escolhidos mudou desde
  // o último aviso, ou se ainda não tinha avisado hoje. "Testar aviso agora" ignora essa
  // checagem e sempre tenta mandar.
  // ================================================================
  var NOTIF_KEY = "pp_notif_v1";
  var NOTIF_FUNCTION_URL = "https://vmqpvlcckcfixsryvfdn.supabase.co/functions/v1/enviar-aviso";
  var NOTIF_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtcXB2bGNja2NmaXhzcnl2ZmRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwODYyNDQsImV4cCI6MjEwMjY2MjI0NH0.JGpqSGXuEM8Rc1s9oo451UCotu4ub1D9JhCJcLiPplM";
  // Trava opcional (ver pendencias.txt): a Edge Function "enviar-aviso" só exige este
  // header se o secret APP_SHARED_SECRET estiver configurado no projeto Supabase — sem
  // ele, o header abaixo é ignorado e nada quebra. Não é segurança forte (o valor mora no
  // código do cliente, visível a quem inspecionar a página), só filtra chamadas diretas
  // de terceiros que não passam pelo app. Precisa bater exatamente com o secret cadastrado
  // em Supabase → Edge Functions → Secrets → APP_SHARED_SECRET.
  var NOTIF_APP_SECRET = "107874553e13cd887402d09fe415a5641cff9d20fd78bba0";

  function defaultNotifState(){ return { canais: ["push"], email: "", whatsapp: "", ultimoAvisoData: null, ultimoAvisoAssinatura: "" }; }
  function loadNotifState(){
    try {
      var raw = localStorage.getItem(NOTIF_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed) {
          // migra o formato antigo (canal único em string) pro novo (lista de canais)
          if (parsed.canal && !parsed.canais) parsed.canais = [parsed.canal];
          if (!Array.isArray(parsed.canais)) parsed.canais = ["push"];
          if (typeof parsed.email !== "string") parsed.email = "";
          if (typeof parsed.whatsapp !== "string") parsed.whatsapp = "";
          delete parsed.canal;
          return parsed;
        }
      }
    } catch (e) {}
    return defaultNotifState();
  }
  function saveNotifState(){
    try { localStorage.setItem(NOTIF_KEY, JSON.stringify(notifState)); } catch (e) {}
  }
  var notifState = loadNotifState();

  function notifSuportada(){ return typeof Notification !== "undefined"; }

  function renderNotifCanal(){
    document.querySelectorAll('#notifCanalPills [data-canal]').forEach(function(p){
      p.classList.toggle("active", notifState.canais.indexOf(p.dataset.canal) !== -1);
    });

    // e-mail e WhatsApp dividem uma única caixa "pressed" (em vez de uma caixa cada) — reduz
    // o empilhamento de blocos quando os 2 canais de contato estão ativos ao mesmo tempo.
    var temEmail = notifState.canais.indexOf("email") !== -1;
    var temWhatsapp = notifState.canais.indexOf("whatsapp") !== -1;

    var contatoGroup = document.getElementById("notifContatoGroup");
    if (contatoGroup) contatoGroup.hidden = !temEmail && !temWhatsapp;
    var emailField = document.getElementById("notifEmailField");
    if (emailField) emailField.hidden = !temEmail;
    var whatsappField = document.getElementById("notifWhatsappField");
    if (whatsappField) whatsappField.hidden = !temWhatsapp;
    var contatoDivider = document.getElementById("notifContatoDivider");
    if (contatoDivider) contatoDivider.hidden = !(temEmail && temWhatsapp);

    var emailInput = document.getElementById("notifEmailInput");
    if (emailInput && emailInput !== document.activeElement) emailInput.value = notifState.email || "";
    var whatsappInput = document.getElementById("notifWhatsappInput");
    if (whatsappInput && whatsappInput !== document.activeElement) whatsappInput.value = notifState.whatsapp || "";

    var listEl = document.getElementById("notifStatusList");
    if (!listEl) return;
    // Cada linha carrega um "tipo" (good/warn) pra render de uma bolinha antes do texto —
    // dá leitura de relance (verde = ok, terracota = precisa de atenção) sem depender só
    // da frase. A frase continua explicando por extenso, então a cor é reforço, não a
    // única pista (acessível pra quem não distingue as cores).
    var linhas = [];
    if (!notifState.canais.length) linhas.push({tipo:"warn", texto:"nenhum canal selecionado — você não vai receber avisos."});
    if (notifState.canais.indexOf("push") !== -1) {
      if (!notifSuportada()) linhas.push({tipo:"warn", texto:"push: não suportado neste navegador."});
      else if (Notification.permission === "granted") linhas.push({tipo:"good", texto:"push: ativado."});
      else if (Notification.permission === "denied") linhas.push({tipo:"warn", texto:"push: bloqueado nas permissões do navegador."});
      else linhas.push({tipo:"warn", texto:'push: toque em "testar aviso agora" pra autorizar.'});
    }
    if (notifState.canais.indexOf("email") !== -1 && !notifState.email) linhas.push({tipo:"warn", texto:"e-mail: cadastre um endereço acima."});
    if (notifState.canais.indexOf("whatsapp") !== -1 && !notifState.whatsapp) linhas.push({tipo:"warn", texto:"WhatsApp: cadastre um número acima."});
    listEl.innerHTML = linhas.map(function(l){
      return '<div style="display:flex;align-items:center;gap:7px;font-size:11px;color:var(--text-faint);line-height:1.6;">' +
        '<span class="status-dot ' + l.tipo + '" aria-hidden="true"></span>' + escapeHtml(l.texto) + '</div>';
    }).join("");
  }

  function toggleNotifCanal(canal){
    var idx = notifState.canais.indexOf(canal);
    if (idx === -1) notifState.canais.push(canal); else notifState.canais.splice(idx, 1);
    saveNotifState();
    renderNotifCanal();
  }

  function setNotifContato(campo, valor){
    notifState[campo] = valor;
    saveNotifState();
    renderNotifCanal();
  }

  function dispararPush(items, forcar){
    if (!notifSuportada()) { if (forcar) showToast("este navegador não suporta notificações push."); return; }
    if (Notification.permission === "default") {
      Notification.requestPermission().then(function(perm){
        renderNotifCanal();
        if (perm === "granted") enviarPush(items, forcar);
        else if (forcar) showToast("permissão de notificação negada.");
      });
      return;
    }
    if (Notification.permission === "denied") { if (forcar) showToast("notificações bloqueadas nas permissões do navegador."); return; }
    enviarPush(items, forcar);
  }

  function enviarPush(items, forcar){
    var top = items[0];
    var corpo = items.length === 1
      ? (top.nome + " está abaixo do mínimo.")
      : (top.nome + " e mais " + (items.length - 1) + (items.length - 1 === 1 ? " item" : " itens") + " abaixo do mínimo.");
    try { new Notification(".parágrafo · aviso de reposição", { body: corpo }); } catch (e) {}
    if (forcar) showToast("notificação push enviada.");
  }

  // Manda o aviso pra Edge Function "enviar-aviso" (e-mail e/ou WhatsApp, conforme os canais
  // escolhidos). forcar=true mostra um toast com o resultado de cada canal (usado por "testar
  // aviso agora"); sem forcar, o disparo automático não incomoda o usuário com toast — só o
  // push (que já é a própria notificação) e a lista de status do painel refletem o resultado.
  function enviarAvisoServidor(items, canais, forcar){
    fetch(NOTIF_FUNCTION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + NOTIF_ANON_KEY, "apikey": NOTIF_ANON_KEY, "x-app-secret": NOTIF_APP_SECRET },
      body: JSON.stringify({
        canais: canais,
        email: notifState.email,
        whatsapp: notifState.whatsapp,
        items: items.map(function(i){ return { nome: i.nome, atual: i.atual, minimo: i.minimo, unidade: i.unidade }; })
      })
    }).then(function(resp){ return resp.json().then(function(data){ return { status: resp.status, data: data }; }); })
      .then(function(res){
        if (!forcar) return;
        var partes = canais.map(function(c){
          var r = res.data && res.data.resultado && res.data.resultado[c];
          var rotulo = c === "email" ? "e-mail" : "WhatsApp";
          if (!r) return rotulo + ": erro";
          if (r.ok) return rotulo + ": enviado";
          if (r.pendente) return rotulo + ": configuração pendente";
          return rotulo + ": falhou";
        });
        showToast(partes.join(" · "));
      })
      .catch(function(){
        if (forcar) showToast("não consegui falar com o servidor de notificação.");
      });
  }

  // Manda o aviso pelos canais escolhidos. forcar=true ignora a checagem de "já avisei hoje
  // com esses mesmos itens/canais" (usado por "testar aviso agora"); sem forcar, só avisa
  // quando o conjunto de itens abaixo do mínimo (ou de canais escolhidos) é diferente do que
  // já foi avisado hoje.
  function dispararAviso(items, forcar){
    if (!items.length) { if (forcar) showToast("nada abaixo do mínimo agora — nenhum aviso a mandar."); return; }
    var canais = notifState.canais || [];
    if (!canais.length) { if (forcar) showToast("selecione ao menos um canal de notificação."); return; }

    var assinatura = canais.slice().sort().join(",") + "::" + items.map(function(i){ return i.nome; }).join("|");
    var hoje = todayISO();
    if (!forcar && notifState.ultimoAvisoData === hoje && notifState.ultimoAvisoAssinatura === assinatura) return;
    notifState.ultimoAvisoData = hoje;
    notifState.ultimoAvisoAssinatura = assinatura;
    saveNotifState();

    if (canais.indexOf("push") !== -1) dispararPush(items, forcar);
    var canaisServidor = canais.filter(function(c){ return c === "email" || c === "whatsapp"; });
    if (canaisServidor.length) enviarAvisoServidor(items, canaisServidor, forcar);
  }

  function checarNotificacaoAutomatica(){
    dispararAviso(computeReposicaoItems(), false);
  }

  // ================================================================
  // Dashboard — resumo de hoje, período, lucro/receita/vendas, pizza por variação
  // ================================================================
  var ICON_PRODUCAO = '<path d="M12 3c-3 4-5.2 6.4-5.2 9.4A5.2 5.2 0 0 0 12 21a5.2 5.2 0 0 0 5.2-5.2c0-1.2-.4-2.1-1.1-2.8.1 1-.3 2-1.1 2.5.4-2.1-1-3.6-3-6.5z"/>';
  var ICON_INSUMOS = '<rect x="4" y="4" width="16" height="5" rx="1.2"/><rect x="4" y="11" width="16" height="9" rx="1.2"/><path d="M9 15h6"/>';
  var ICON_VENDAS = '<path d="M6 8h12l1 12H5L6 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>';
  var ICON_CLIENTES = '<circle cx="12" cy="8.2" r="3.4"/><path d="M5 19c0-3.9 3.2-6.2 7-6.2s7 2.3 7 6.2"/>';

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

  // ================================================================
  // Calendário do dashboard — aberto tocando a tira de dias do hero (pendência "adicionar
  // calendário no dashboard"). Mês completo, navegação entre meses, toque num dia mostra o
  // recap daquele dia. computeResumoDia() é a mesma conta de renderResumoHoje() acima, só
  // que pra uma data qualquer em vez de travada em "hoje" — por isso a linha de vendas aqui
  // também soma quantas velas (não só quantas vendas) saíram naquele dia.
  // ================================================================
  var calendarioState = { ano: 0, mes: 0, selecionadoISO: null };

  function computeResumoDia(iso){
    var lotesDia = lotesState.lotes.filter(function(l){ return l.data === iso; });
    var qtdVelasProduzidas = lotesDia.reduce(function(s, l){ return s + l.quantidade; }, 0);
    var producaoDetalhe = lotesDia.length
      ? (lotesDia.length + (lotesDia.length === 1 ? " lote · " : " lotes · ") + qtdVelasProduzidas + " velas de " + variacaoLabel(findVariacao(lotesDia[0].variacaoId)))
      : "nenhuma produção registrada";

    var movsDia = estoqueState.movimentacoes.filter(function(m){ return m.data === iso; });
    var insumosDetalhe = "nenhuma movimentação de insumo";
    if (movsDia.length) {
      var m0 = movsDia[0];
      var insumo0 = findInsumo(m0.insumoId);
      insumosDetalhe = (m0.tipo === "entrada" ? "entrada: " : "saída: ") + (insumo0 ? insumo0.nome : "insumo") + " " + (m0.tipo === "entrada" ? "+" : "-") + numToStr(m0.quantidade) + (insumo0 ? (" " + insumo0.unidade) : "");
      if (movsDia.length > 1) insumosDetalhe += " · +" + (movsDia.length - 1);
    }

    var vendasDia = vendasState.vendas.filter(function(v){ return v.status === "confirmada" && v.data === iso; });
    var totalVendasDia = vendasDia.reduce(function(s, v){ return s + v.total; }, 0);
    var qtdVelasVendidas = vendasDia.reduce(function(s, v){
      return s + v.itens.reduce(function(ss, it){ return ss + it.quantidade; }, 0);
    }, 0);
    var vendasDetalhe = vendasDia.length
      ? (vendasDia.length + (vendasDia.length === 1 ? " venda · " : " vendas · ") + qtdVelasVendidas + (qtdVelasVendidas === 1 ? " vela · " : " velas · ") + fmtMoney(totalVendasDia))
      : "nenhuma venda";

    return { producaoDetalhe: producaoDetalhe, insumosDetalhe: insumosDetalhe, vendasDetalhe: vendasDetalhe };
  }

  function mesChaveISO(ano, mes){ return ano + "-" + String(mes + 1).padStart(2, "0"); }

  function renderCalendarioGrid(){
    var gridEl = document.getElementById("calendarioGrid");
    if (!gridEl) return;
    var ano = calendarioState.ano, mes = calendarioState.mes;
    setText("calendarioMesAno", MESES_LONGOS[mes] + " " + ano);

    var chaveMs = mesChaveISO(ano, mes);
    var diasComVenda = {};
    vendasState.vendas.forEach(function(v){
      if (v.status === "confirmada" && v.data && v.data.slice(0, 7) === chaveMs) diasComVenda[v.data] = true;
    });

    var hojeISO = todayISO();
    var primeiroDiaSemana = new Date(ano, mes, 1).getDay();
    var totalDias = new Date(ano, mes + 1, 0).getDate();
    var html = "";
    for (var i = 0; i < primeiroDiaSemana; i++) html += '<div class="cal-day-empty" aria-hidden="true"></div>';
    for (var d = 1; d <= totalDias; d++) {
      var iso = chaveMs + "-" + String(d).padStart(2, "0");
      var cls = "cal-day" + (iso === hojeISO ? " is-today" : "") + (iso === calendarioState.selecionadoISO ? " is-selected" : "");
      html += '<div class="' + cls + '" role="button" tabindex="0" data-dia="' + iso + '" aria-label="' + d + ' de ' + MESES_LONGOS[mes] + ', ' + (diasComVenda[iso] ? "com venda registrada" : "sem venda registrada") + '">' +
          '<span>' + d + '</span>' +
          (diasComVenda[iso] ? '<span class="cal-day-dot" aria-hidden="true"></span>' : '') +
        '</div>';
    }
    gridEl.innerHTML = html;
  }

  function renderCalendarioRecap(){
    var listEl = document.getElementById("calendarioRecapList");
    if (!listEl) return;
    var iso = calendarioState.selecionadoISO;
    if (!iso) {
      setText("calendarioRecapData", "—");
      listEl.innerHTML = emptyStateHTML({
        icon: ICON_VENDAS,
        title: "toque num dia",
        sub: "escolha uma data no calendário acima pra ver o recap dela."
      });
      return;
    }
    var diaSemana = DIAS_SEMANA[new Date(iso + "T00:00:00").getDay()].slice(0, 3);
    setText("calendarioRecapData", diaSemana + ", " + formatDateBR(iso).replace(/ \d{4}$/, ""));
    var r = computeResumoDia(iso);
    listEl.innerHTML = [
      resumoRowHTML(ICON_PRODUCAO, "produção", r.producaoDetalhe, false),
      resumoRowHTML(ICON_INSUMOS, "insumos", r.insumosDetalhe, false),
      resumoRowHTML(ICON_VENDAS, "vendas", r.vendasDetalhe, true)
    ].join("");
  }

  function selecionarDiaCalendario(iso){
    calendarioState.selecionadoISO = iso;
    renderCalendarioGrid();
    renderCalendarioRecap();
  }

  function mudarMesCalendario(delta){
    var d = new Date(calendarioState.ano, calendarioState.mes + delta, 1);
    calendarioState.ano = d.getFullYear();
    calendarioState.mes = d.getMonth();
    // Se o dia selecionado não pertence mais ao mês visível, some com a seleção (e o recap
    // volta ao estado vazio) em vez de mostrar o recap de um dia que não está mais na tela.
    if (calendarioState.selecionadoISO && calendarioState.selecionadoISO.slice(0, 7) !== mesChaveISO(calendarioState.ano, calendarioState.mes)) {
      calendarioState.selecionadoISO = null;
    }
    renderCalendarioGrid();
    renderCalendarioRecap();
  }

  // Abre sempre no mês corrente com hoje pré-selecionado, pra já entrar mostrando o mesmo
  // recap do card "resumo de hoje" do dashboard antes de qualquer toque.
  function abrirCalendario(){
    var hoje = new Date();
    calendarioState.ano = hoje.getFullYear();
    calendarioState.mes = hoje.getMonth();
    calendarioState.selecionadoISO = todayISO();
    renderCalendarioGrid();
    renderCalendarioRecap();
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
  // "Bloom"). Cada item leva sempre uma das 5 cores fixas da marca — só o fundo do dock
  // (--dock-bg) usa o token de tema.
  // ================================================================
  var DOCK_ITEMS = [
    { key: "inicio", big: true, bg: "#442D1C", fg: "#E8D1A7", enabled: true, screen: "dashboard",
      icon: '<path d="M4 11.5 12 4l8 7.5"/><path d="M6 10v9a1 1 0 0 0 1 1h3v-6h4v6h3a1 1 0 0 0 1-1v-9"/>', label: "Início" },
    { key: "estoque", bg: "#84592B", fg: "#F3E6CE", enabled: true, screen: "estoque",
      icon: '<rect x="4" y="4" width="16" height="5" rx="1.2"/><rect x="4" y="11" width="16" height="9" rx="1.2"/><path d="M9 15h6"/>', label: "Estoque" },
    { key: "clientes", bg: "#9D9167", fg: "#2B1B10", enabled: true, screen: "clientes",
      icon: ICON_CLIENTES, label: "Clientes" },
    { key: "vendas", bg: "#743014", fg: "#F3E6CE", enabled: true, screen: "vendas",
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
    insumoMovimentar: true, estoqueProducao: true, estoqueCalculadora: true,
    registroProducao: true, loteDetalhe: true
  };
  // Telas que vivem sob a pasta "Mais" (a página dos três pontinhos) — "configurações"
  // mudou de casa (era uma sub-tela do Estoque, ver ESTOQUE_SCREENS acima) porque faz mais
  // sentido como ajuste geral do app, não só de produção.
  var MAIS_SCREENS = {
    mais: true, configuracoes: true, conta: true, ajuda: true
  };
  // Telas que vivem sob a pasta "Vendas" — histórico, custos e cupons entram aqui conforme
  // forem construídas, no mesmo esquema do ESTOQUE_SCREENS acima.
  var VENDAS_SCREENS = {
    vendas: true, registrarVenda: true, encomendas: true, encomendaForm: true, encomendaDetalhe: true
  };
  // Telas do módulo 13 (Controle de Clientes) — cadastro/lista, formulário e detalhe.
  var CLIENTES_SCREENS = {
    clientes: true, clienteForm: true, clienteDetalhe: true
  };
  var ALL_DOCK_IDS = [
    "dashDock", "reposicaoDock", "calendarioDock", "maisDock",
    "estoqueDock", "estoqueInsumosDock", "insumoFormDock", "insumoDetalheDock",
    "insumoMovimentarDock", "estoqueProducaoDock", "estoqueCalculadoraDock",
    "registroProducaoDock", "loteDetalheDock",
    "configuracoesDock", "vendasDock", "registrarVendaDock",
    "encomendasDock", "encomendaFormDock", "encomendaDetalheDock",
    "clientesDock", "clienteFormDock", "clienteDetalheDock",
    "contaDock", "ajudaDock"
  ];
  function refreshAllDocks(activeScreenName){
    var key = "inicio";
    if (MAIS_SCREENS[activeScreenName]) key = "mais";
    else if (ESTOQUE_SCREENS[activeScreenName]) key = "estoque";
    else if (VENDAS_SCREENS[activeScreenName]) key = "vendas";
    else if (CLIENTES_SCREENS[activeScreenName]) key = "clientes";
    ALL_DOCK_IDS.forEach(function(id){
      var el = document.getElementById(id);
      if (el) el.innerHTML = dockHTML(key);
    });
  }

  // ================================================================
  // Backup / exportação dos dados — tela "mais". Insumos, produção, vendas, clientes e
  // configurações vivem só no localStorage deste navegador (ver pendências do app); isto
  // dá um jeito de tirar uma cópia em .json e de restaurar depois, no mesmo aparelho ou em
  // outro. Conta/senha e sessão ficam de fora de propósito — restaurar um backup não deve
  // mexer em quem está logado neste aparelho, só nos dados do negócio.
  // ================================================================
  var BACKUP_KEYS = {
    estoque: ESTOQUE_KEY, catalogo: CATALOGO_KEY, producaoEstoque: PRODUCAO_ESTOQUE_KEY,
    config: CONFIG_KEY, lotes: LOTES_KEY, cupons: CUPONS_KEY, vendas: VENDAS_KEY,
    custos: CUSTOS_KEY, clientes: CLIENTES_KEY
  };

  function exportarBackup(){
    var dados = {};
    Object.keys(BACKUP_KEYS).forEach(function(nome){
      try {
        var raw = localStorage.getItem(BACKUP_KEYS[nome]);
        if (raw) dados[nome] = JSON.parse(raw);
      } catch (e) {}
    });
    var payload = { app: "ponto-paragrafo", versao: 1, exportadoEm: new Date().toISOString(), dados: dados };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8;" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "backup-ponto-paragrafo-" + todayISO() + ".json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("backup exportado.");
  }

  function importarBackupFile(file){
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(){
      var parsed;
      try { parsed = JSON.parse(String(reader.result)); } catch (e) {
        showToast("esse arquivo não é um backup válido (.json)."); return;
      }
      if (!parsed || typeof parsed.dados !== "object") {
        showToast("esse arquivo não é um backup válido do .parágrafo."); return;
      }
      var nomes = Object.keys(BACKUP_KEYS).filter(function(nome){ return parsed.dados[nome] !== undefined; });
      if (!nomes.length) { showToast("esse backup não tem nenhum dado reconhecido."); return; }
      if (!window.confirm("Restaurar este backup substitui TODOS os dados atuais (insumos, produção, vendas, clientes, configurações) pelos do arquivo. Essa ação não pode ser desfeita. Continuar?")) return;

      nomes.forEach(function(nome){
        try { localStorage.setItem(BACKUP_KEYS[nome], JSON.stringify(parsed.dados[nome])); } catch (e) {}
      });
      showToast("backup restaurado — recarregando…");
      window.setTimeout(function(){ window.location.reload(); }, 900);
    };
    reader.onerror = function(){ showToast("não deu pra ler esse arquivo."); };
    reader.readAsText(file);
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

    var gotoConfig = e.target.closest('[data-goto="configuracoes"]');
    if (gotoConfig) { renderConfiguracoes(); showScreen("configuracoes"); return; }

    var gotoConta = e.target.closest('[data-goto="conta"]');
    if (gotoConta) { renderContaForm(); showScreen("conta"); return; }

    var contaSalvarDados = e.target.closest('[data-action="conta-salvar-dados"]');
    if (contaSalvarDados) { submitContaDadosForm(); return; }

    var contaSalvarSenha = e.target.closest('[data-action="conta-salvar-senha"]');
    if (contaSalvarSenha) { submitContaSenhaForm(); return; }

    var gotoRegistrarVenda = e.target.closest('[data-goto="registrarVenda"]');
    if (gotoRegistrarVenda) { openRegistrarVendaForm(); showScreen("registrarVenda"); return; }

    var gotoEncomendas = e.target.closest('[data-goto="encomendas"]');
    if (gotoEncomendas) { renderEncomendas(); showScreen("encomendas"); return; }

    var gotoEl = e.target.closest("[data-goto]");
    if (gotoEl) { showScreen(gotoEl.dataset.goto); return; }

    var goReposicao = e.target.closest('[data-action="go-reposicao"]');
    if (goReposicao) { renderReposicaoPanel(); showScreen("reposicao"); return; }

    var goCalendario = e.target.closest('[data-action="go-calendario"]');
    if (goCalendario) { abrirCalendario(); showScreen("calendario"); return; }

    var calPrev = e.target.closest('[data-action="calendario-prev"]');
    if (calPrev) { mudarMesCalendario(-1); return; }

    var calNext = e.target.closest('[data-action="calendario-next"]');
    if (calNext) { mudarMesCalendario(1); return; }

    var calDia = e.target.closest('#calendarioGrid [data-dia]');
    if (calDia) { selecionarDiaCalendario(calDia.dataset.dia); return; }

    var notifCanalPill = e.target.closest("#notifCanalPills [data-canal]");
    if (notifCanalPill) { toggleNotifCanal(notifCanalPill.dataset.canal); return; }

    var notifTestar = e.target.closest('[data-action="notif-testar"]');
    if (notifTestar) { dispararAviso(computeReposicaoItems(), true); return; }

    var toastBreve = e.target.closest('[data-action="toast-em-breve"]');
    if (toastBreve) { showToast(toastBreve.dataset.msg || "em breve — o relatório completo ainda está sendo construído."); return; }

    var logoutBtn = e.target.closest('[data-action="logout"]');
    if (logoutBtn) { logout(); return; }

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

    var calcRegistrar = e.target.closest('[data-action="calc-registrar"]');
    if (calcRegistrar) { if (!calcRegistrar.hasAttribute("disabled")) registrarProducao(); return; }

    // ---- Registro de Produção ----
    var loteRow = e.target.closest("[data-lote-id]");
    if (loteRow) { openLoteDetalhe(loteRow.dataset.loteId); return; }

    var loteExcluir = e.target.closest('[data-action="lote-excluir"]');
    if (loteExcluir) { excluirLote(); return; }

    var lotesExportCsv = e.target.closest('[data-action="lotes-export-csv"]');
    if (lotesExportCsv) { exportarLotesCSV(); return; }

    var lotesExportPdf = e.target.closest('[data-action="lotes-export-pdf"]');
    if (lotesExportPdf) { exportarLotesPDF(); return; }

    // ---- Configurações ----
    var configSave = e.target.closest('[data-action="config-save"]');
    if (configSave) { submitConfiguracoesForm(); return; }

    // ---- Controle de Clientes ----
    var clienteRankingPill = e.target.closest("#clientesRankingPills [data-criterio]");
    if (clienteRankingPill) { setClientesRankingCriterio(clienteRankingPill.dataset.criterio); return; }

    var clienteAdd = e.target.closest('[data-action="cliente-add"]');
    if (clienteAdd) { openClienteForm("novo"); return; }

    var clienteEdit = e.target.closest('[data-action="cliente-edit"], [data-action="cliente-detalhe-edit"]');
    if (clienteEdit) {
      var clienteEditId = clienteEdit.dataset.action === "cliente-detalhe-edit" ? currentClienteId : clienteEdit.closest("[data-cliente-id]").dataset.clienteId;
      openClienteForm("editar", clienteEditId);
      return;
    }

    var clienteRow = e.target.closest("[data-cliente-id]");
    if (clienteRow) { openClienteDetalhe(clienteRow.dataset.clienteId); return; }

    var clienteFormSave = e.target.closest('[data-action="cliente-form-save"]');
    if (clienteFormSave) { submitClienteForm(); return; }

    var clienteFormRemove = e.target.closest('[data-action="cliente-form-remove"]');
    if (clienteFormRemove) { removeCliente(); return; }

    // ---- Registrar Venda ----
    var vendaClienteToggleBtn = e.target.closest('[data-action="venda-cliente-toggle"]');
    if (vendaClienteToggleBtn) { vendaClienteToggle(); return; }

    var vendaClienteRow = e.target.closest('[data-venda-cliente-id]');
    if (vendaClienteRow) { vendaClienteSelecionar(vendaClienteRow.dataset.vendaClienteId); return; }

    var vendaVarPill = e.target.closest('#vendaVarPills [data-var-id]');
    if (vendaVarPill) { vendaVarSelecionar(vendaVarPill.dataset.varId); return; }

    var vendaQtdIncBtn = e.target.closest('[data-action="venda-qtd-inc"]');
    if (vendaQtdIncBtn) { vendaQtdAjustar(1); return; }

    var vendaQtdDecBtn = e.target.closest('[data-action="venda-qtd-dec"]');
    if (vendaQtdDecBtn) { vendaQtdAjustar(-1); return; }

    var vendaItemAddBtn = e.target.closest('[data-action="venda-item-add"]');
    if (vendaItemAddBtn) { vendaItemAdicionar(); return; }

    var vendaItemRemoveBtn = e.target.closest('[data-action="venda-item-remove"]');
    if (vendaItemRemoveBtn) { vendaItemRemover(parseInt(vendaItemRemoveBtn.dataset.idx, 10)); return; }

    var vendaFormaPill = e.target.closest('#vendaFormaPills [data-forma]');
    if (vendaFormaPill) { vendaFormaSelecionar(vendaFormaPill.dataset.forma); return; }

    var vendaCupomAplicarBtn = e.target.closest('[data-action="venda-cupom-aplicar"]');
    if (vendaCupomAplicarBtn) { vendaCupomAplicar(); return; }

    var vendaCupomRemoverBtn = e.target.closest('[data-action="venda-cupom-remover"]');
    if (vendaCupomRemoverBtn) { vendaCupomRemover(); return; }

    var vendaSubmitBtn = e.target.closest('[data-action="venda-submit"]');
    if (vendaSubmitBtn) { if (!vendaSubmitBtn.hasAttribute("disabled")) submitVenda(); return; }

    // ---- Encomendas ----
    var encomendaFiltroPill = e.target.closest('#encomendasFiltroPills [data-status]');
    if (encomendaFiltroPill) { setEncomendasFiltro(encomendaFiltroPill.dataset.status); return; }

    var encomendaAddBtn = e.target.closest('[data-action="encomenda-add"]');
    if (encomendaAddBtn) { openEncomendaForm("novo"); showScreen("encomendaForm"); return; }

    var encomendaRow = e.target.closest('[data-encomenda-id]');
    if (encomendaRow) { openEncomendaDetalhe(encomendaRow.dataset.encomendaId); return; }

    var encomendaDetalheEditBtn = e.target.closest('[data-action="encomenda-detalhe-edit"]');
    if (encomendaDetalheEditBtn) { openEncomendaForm("editar", currentEncomendaId); showScreen("encomendaForm"); return; }

    var encomendaClienteToggleBtn = e.target.closest('[data-action="encomenda-cliente-toggle"]');
    if (encomendaClienteToggleBtn) { encomendaClienteToggle(); return; }

    var encomendaClienteRow = e.target.closest('[data-encomenda-cliente-id]');
    if (encomendaClienteRow) { encomendaClienteSelecionar(encomendaClienteRow.dataset.encomendaClienteId); return; }

    var encomendaVarPill = e.target.closest('#encomendaVarPills [data-enc-var-id]');
    if (encomendaVarPill) { encomendaVarSelecionar(encomendaVarPill.dataset.encVarId); return; }

    var encomendaQtdIncBtn = e.target.closest('[data-action="encomenda-qtd-inc"]');
    if (encomendaQtdIncBtn) { encomendaQtdAjustar(1); return; }

    var encomendaQtdDecBtn = e.target.closest('[data-action="encomenda-qtd-dec"]');
    if (encomendaQtdDecBtn) { encomendaQtdAjustar(-1); return; }

    var encomendaItemAddBtn = e.target.closest('[data-action="encomenda-item-add"]');
    if (encomendaItemAddBtn) { encomendaItemAdicionar(); return; }

    var encomendaItemRemoveBtn = e.target.closest('[data-action="encomenda-item-remove"]');
    if (encomendaItemRemoveBtn) { encomendaItemRemover(parseInt(encomendaItemRemoveBtn.dataset.idx, 10)); return; }

    var encomendaFormSaveBtn = e.target.closest('[data-action="encomenda-form-save"]');
    if (encomendaFormSaveBtn) { if (!encomendaFormSaveBtn.hasAttribute("disabled")) submitEncomendaForm(); return; }

    var encomendaFormRemoveBtn = e.target.closest('[data-action="encomenda-form-remove"]');
    if (encomendaFormRemoveBtn) { excluirEncomenda(); return; }

    var encomendaLoteToggleBtn = e.target.closest('[data-action="encomenda-lote-toggle"]');
    if (encomendaLoteToggleBtn) { encomendaLoteToggle(); return; }

    var encomendaLoteRow = e.target.closest('[data-encomenda-lote-id]');
    if (encomendaLoteRow) { encomendaLoteSelecionar(encomendaLoteRow.dataset.encomendaLoteId); return; }

    var encomendaFormaPill = e.target.closest('#encomendaFormaPills [data-forma]');
    if (encomendaFormaPill) { encomendaFormaEntregaSelecionar(encomendaFormaPill.dataset.forma); return; }

    var encomendaAvancarBtn = e.target.closest('[data-action="encomenda-avancar-status"]');
    if (encomendaAvancarBtn) { encomendaAvancarStatus(); return; }

    var encomendaExcluirBtn = e.target.closest('[data-action="encomenda-excluir"]');
    if (encomendaExcluirBtn) { excluirEncomenda(); return; }

    // ---- Backup dos dados ----
    var backupExportarBtn = e.target.closest('[data-action="backup-exportar"]');
    if (backupExportarBtn) { exportarBackup(); return; }

    var backupImportarBtn = e.target.closest('[data-action="backup-importar"]');
    if (backupImportarBtn) { var fileInput = document.getElementById("backupImportInput"); if (fileInput) fileInput.click(); return; }
  });

  document.addEventListener("input", function(e){
    if (e.target.id === "dashPeriodoInicio" || e.target.id === "dashPeriodoFim") {
      setPeriodoModo("custom");
    }
    if (e.target.id === "estoqueSearchInput") { renderEstoqueInsumosList(); return; }
    if (e.target.id === "movQtdEntrada" || e.target.id === "movPreco" || e.target.id === "movQtdSaida") { updateMovPreview(); return; }
    if (e.target.id === "clientesSearchInput") { renderClientesList(); return; }
    if (e.target.id === "notifEmailInput") { setNotifContato("email", e.target.value.trim()); return; }
    if (e.target.id === "notifWhatsappInput") { setNotifContato("whatsapp", e.target.value.trim()); return; }
    if (e.target.id === "vendaClienteSearchInput") { renderVendaClienteList(e.target.value); return; }
    if (e.target.id === "encomendaClienteSearchInput") { renderEncomendaClienteList(e.target.value); return; }
    if (e.target.id === "encomendaFormDataPrevista") { encomendaFormState.dataPrevista = e.target.value || ""; return; }
    if (e.target.id === "encomendaFormObs") { encomendaFormState.observacoes = e.target.value; return; }
  });

  document.addEventListener("change", function(e){
    if (e.target.id === "backupImportInput") { importarBackupFile(e.target.files && e.target.files[0]); e.target.value = ""; return; }
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
  renderRegistroProducao();
  renderNotifCanal();
  renderClientesList();
  renderClientesRanking();
  renderEncomendas();

  // ================================================================
  checkAuthAndInit();
})();
