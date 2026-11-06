/*!
 * Sites Incríveis — motor de rolagem
 * © 2026 Enzo Barbatto — Sparo Automações. Uso conforme LICENCA.md.
 *
 * A página declara efeitos com atributos data-fx-*; o motor observa a
 * rolagem e anima. Nada aqui conhece o conteúdo da página: comportamento
 * sob medida deve viver em <script> da própria página, nunca neste arquivo.
 */
(function () {
  "use strict";

  var doc = document;
  var raiz = doc.documentElement;
  var reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduzido) raiz.classList.add("fx-reduzido");

  /* ---------- utilidades ---------- */

  function limitar(v, min, max) { return v < min ? min : v > max ? max : v; }

  function interpolar(a, b, t) { return a + (b - a) * t; }

  // "0,-200" -> [0, -200]; "0.4" -> [0.4, 0.4]
  function lerPar(texto, padraoA, padraoB) {
    if (!texto) return [padraoA, padraoB];
    var partes = String(texto).split(",");
    var a = parseFloat(partes[0]);
    var b = partes.length > 1 ? parseFloat(partes[1]) : a;
    if (isNaN(a)) a = padraoA;
    if (isNaN(b)) b = padraoB;
    return [a, b];
  }

  function formatarNumero(valor, decimais) {
    return valor.toLocaleString("pt-BR", {
      minimumFractionDigits: decimais,
      maximumFractionDigits: decimais
    });
  }

  /* ---------- 1. Revelações ao entrar na tela ---------- */
  // data-fx="surgir | subir | esquerda | direita | crescer | palavras | digitar | contar"
  // extras: data-fx-atraso="200" (ms)  data-fx-duracao="900" (ms)

  var REVELACOES = ["surgir", "subir", "esquerda", "direita", "crescer", "palavras", "digitar", "contar"];

  function prepararPalavras(el) {
    var texto = el.textContent;
    el.textContent = "";
    el.setAttribute("aria-label", texto);
    texto.split(/(\s+)/).forEach(function (pedaco) {
      if (/^\s+$/.test(pedaco)) {
        el.appendChild(doc.createTextNode(pedaco));
      } else if (pedaco) {
        var s = doc.createElement("span");
        s.className = "fx-palavra";
        s.setAttribute("aria-hidden", "true");
        s.textContent = pedaco;
        el.appendChild(s);
      }
    });
  }

  function animarPalavras(el) {
    var palavras = el.querySelectorAll(".fx-palavra");
    var passo = parseFloat(el.dataset.fxDuracao || 700) / Math.max(palavras.length, 1);
    palavras.forEach(function (p, i) {
      p.style.transitionDelay = Math.round(i * passo) + "ms";
    });
  }

  function animarDigitar(el) {
    var texto = el.dataset.fxTexto;
    var duracao = parseFloat(el.dataset.fxDuracao || 1400);
    var inicio = null;
    el.classList.add("fx-digitando");
    function quadro(t) {
      if (inicio === null) inicio = t;
      var prog = limitar((t - inicio) / duracao, 0, 1);
      el.textContent = texto.slice(0, Math.round(texto.length * prog));
      if (prog < 1) requestAnimationFrame(quadro);
      else el.classList.remove("fx-digitando");
    }
    requestAnimationFrame(quadro);
  }

  function animarContar(el) {
    var fim = parseFloat(el.dataset.fxFim || el.dataset.fxValor || "0");
    var comeco = parseFloat(el.dataset.fxInicio || "0");
    var decimais = parseInt(el.dataset.fxDecimais || "0", 10);
    var prefixo = el.dataset.fxPrefixo || "";
    var sufixo = el.dataset.fxSufixo || "";
    var duracao = parseFloat(el.dataset.fxDuracao || 1600);
    var inicio = null;
    function quadro(t) {
      if (inicio === null) inicio = t;
      var prog = limitar((t - inicio) / duracao, 0, 1);
      var suave = 1 - Math.pow(1 - prog, 3); // desacelera no final
      el.textContent = prefixo + formatarNumero(interpolar(comeco, fim, suave), decimais) + sufixo;
      if (prog < 1) requestAnimationFrame(quadro);
    }
    requestAnimationFrame(quadro);
  }

  function armarRevelacoes() {
    var alvos = [];
    REVELACOES.forEach(function (nome) {
      doc.querySelectorAll('[data-fx="' + nome + '"]').forEach(function (el) {
        alvos.push(el);
      });
    });

    alvos.forEach(function (el) {
      var tipo = el.dataset.fx;
      if (tipo === "palavras") prepararPalavras(el);
      if (tipo === "digitar" && el.dataset.fxTexto === undefined) {
        el.dataset.fxTexto = el.textContent;
        el.textContent = "";
        el.style.minHeight = "1em";
      }
      if (el.dataset.fxAtraso) el.style.transitionDelay = el.dataset.fxAtraso + "ms";
      if (el.dataset.fxDuracao && tipo !== "palavras" && tipo !== "digitar" && tipo !== "contar") {
        el.style.transitionDuration = el.dataset.fxDuracao + "ms";
      }
    });

    if (reduzido) {
      alvos.forEach(function (el) {
        el.classList.add("fx-em-cena");
        var tipo = el.dataset.fx;
        if (tipo === "digitar") el.textContent = el.dataset.fxTexto;
        if (tipo === "contar") {
          el.textContent = (el.dataset.fxPrefixo || "") +
            formatarNumero(parseFloat(el.dataset.fxFim || el.dataset.fxValor || "0"),
              parseInt(el.dataset.fxDecimais || "0", 10)) +
            (el.dataset.fxSufixo || "");
        }
      });
      return;
    }

    var observador = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (entrada) {
        if (!entrada.isIntersecting) return;
        var el = entrada.target;
        observador.unobserve(el);
        var tipo = el.dataset.fx;
        if (tipo === "palavras") animarPalavras(el);
        el.classList.add("fx-em-cena");
        if (tipo === "digitar") animarDigitar(el);
        if (tipo === "contar") animarContar(el);
      });
    }, { threshold: 0.25, rootMargin: "0px 0px -8% 0px" });

    alvos.forEach(function (el) { observador.observe(el); });
  }

  /* ---------- 2. Cenas fixas com progresso ---------- */
  // <section data-fx-fixa data-fx-altura="3">
  //   <div class="fx-palco"> ...conteúdo que fica preso na tela... </div>
  // </section>
  //
  // Enquanto a cena está presa, o motor publica --progresso (0 a 1) na seção.
  // Filhos reagem com:
  //   data-fx-x="inicio,fim"          translateX em px
  //   data-fx-y="inicio,fim"          translateY em px
  //   data-fx-escala="inicio,fim"     scale
  //   data-fx-giro="inicio,fim"       rotate em graus
  //   data-fx-opacidade="inicio,fim"
  //   data-fx-faixa="0.2,0.7"         só anima dentro desse trecho do progresso
  //   data-fx="rolar-video"           <video> avança com a rolagem
  //   data-fx="trilho"                fileira horizontal desliza inteira
  //   data-fx-etapas="4"              seção ganha data-etapa="1..4" (CSS decide o resto)

  var cenas = [];

  function armarCenas() {
    doc.querySelectorAll("[data-fx-fixa]").forEach(function (secao) {
      var altura = parseFloat(secao.dataset.fxAltura || "3");
      secao.style.height = (altura * 100) + "vh";

      var atores = [];
      secao.querySelectorAll("[data-fx-x],[data-fx-y],[data-fx-escala],[data-fx-giro],[data-fx-opacidade]").forEach(function (el) {
        atores.push({
          el: el,
          x: el.dataset.fxX !== undefined ? lerPar(el.dataset.fxX, 0, 0) : null,
          y: el.dataset.fxY !== undefined ? lerPar(el.dataset.fxY, 0, 0) : null,
          escala: el.dataset.fxEscala !== undefined ? lerPar(el.dataset.fxEscala, 1, 1) : null,
          giro: el.dataset.fxGiro !== undefined ? lerPar(el.dataset.fxGiro, 0, 0) : null,
          opacidade: el.dataset.fxOpacidade !== undefined ? lerPar(el.dataset.fxOpacidade, 1, 1) : null,
          faixa: lerPar(el.dataset.fxFaixa, 0, 1)
        });
      });

      var video = secao.querySelector('[data-fx="rolar-video"]');
      if (video) {
        video.muted = true;
        video.playsInline = true;
        video.preload = "auto";
        video.pause();
      }

      var trilho = secao.querySelector('[data-fx="trilho"]');
      var etapas = parseInt(secao.dataset.fxEtapas || "0", 10);

      cenas.push({
        secao: secao,
        atores: atores,
        video: video,
        videoAlvo: 0,
        trilho: trilho,
        etapas: etapas
      });

      if (reduzido) {
        secao.style.height = "auto";
        if (etapas) secao.setAttribute("data-etapa", String(etapas));
      }
    });
  }

  function progressoNaFaixa(prog, faixa) {
    if (prog <= faixa[0]) return 0;
    if (prog >= faixa[1]) return 1;
    return (prog - faixa[0]) / (faixa[1] - faixa[0]);
  }

  function atualizarCena(cena) {
    var ret = cena.secao.getBoundingClientRect();
    var percurso = cena.secao.offsetHeight - window.innerHeight;
    if (percurso <= 0) return;
    var prog = limitar(-ret.top / percurso, 0, 1);
    cena.secao.style.setProperty("--progresso", prog.toFixed(4));

    cena.atores.forEach(function (ator) {
      var p = progressoNaFaixa(prog, ator.faixa);
      var transformar = "";
      if (ator.x) transformar += "translateX(" + interpolar(ator.x[0], ator.x[1], p).toFixed(2) + "px) ";
      if (ator.y) transformar += "translateY(" + interpolar(ator.y[0], ator.y[1], p).toFixed(2) + "px) ";
      if (ator.escala) transformar += "scale(" + interpolar(ator.escala[0], ator.escala[1], p).toFixed(4) + ") ";
      if (ator.giro) transformar += "rotate(" + interpolar(ator.giro[0], ator.giro[1], p).toFixed(2) + "deg) ";
      if (transformar) ator.el.style.transform = transformar.trim();
      if (ator.opacidade) ator.el.style.opacity = interpolar(ator.opacidade[0], ator.opacidade[1], p).toFixed(3);
    });

    if (cena.video && cena.video.duration) {
      cena.videoAlvo = prog * cena.video.duration;
    }

    if (cena.trilho) {
      var alcance = cena.trilho.scrollWidth - cena.trilho.clientWidth;
      if (alcance > 0) {
        cena.trilho.style.transform = "translateX(" + (-prog * alcance).toFixed(1) + "px)";
      }
    }

    if (cena.etapas) {
      var etapa = limitar(Math.floor(prog * cena.etapas) + 1, 1, cena.etapas);
      if (cena.secao.getAttribute("data-etapa") !== String(etapa)) {
        cena.secao.setAttribute("data-etapa", String(etapa));
      }
    }
  }

  // vídeo: aproxima suavemente do alvo pra rolagem não "pular" quadros
  function atualizarVideos() {
    cenas.forEach(function (cena) {
      if (!cena.video || !cena.video.duration) return;
      var atual = cena.video.currentTime;
      var delta = cena.videoAlvo - atual;
      if (Math.abs(delta) > 0.01) {
        cena.video.currentTime = atual + delta * 0.35;
      }
    });
  }

  /* ---------- 3. Fundo que viaja ---------- */
  // Qualquer seção com data-fx-fundo="#111" (e opcional data-fx-tinta="#eee"):
  // quando ela domina a tela, o fundo da página faz a transição para essa cor.

  function armarFundos() {
    var secoes = doc.querySelectorAll("[data-fx-fundo]");
    if (!secoes.length) return;
    raiz.classList.add("fx-fundo-ativo");
    var observador = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (entrada) {
        if (!entrada.isIntersecting) return;
        raiz.style.setProperty("--fx-fundo", entrada.target.dataset.fxFundo);
        if (entrada.target.dataset.fxTinta) {
          raiz.style.setProperty("--fx-tinta", entrada.target.dataset.fxTinta);
        }
      });
    }, { rootMargin: "-45% 0px -45% 0px" });
    secoes.forEach(function (s) { observador.observe(s); });
  }

  /* ---------- 4. Paralaxe leve (fora das cenas fixas) ---------- */
  // data-fx-paralaxe="0.2"  → desloca contra a rolagem (0.1 sutil, 0.4 forte)

  var paralaxes = [];

  function armarParalaxes() {
    doc.querySelectorAll("[data-fx-paralaxe]").forEach(function (el) {
      if (el.closest("[data-fx-fixa]")) return; // dentro de cena fixa use data-fx-y
      paralaxes.push({ el: el, forca: parseFloat(el.dataset.fxParalaxe) || 0.2 });
    });
  }

  function atualizarParalaxes() {
    var centroTela = window.innerHeight / 2;
    paralaxes.forEach(function (p) {
      var ret = p.el.getBoundingClientRect();
      var desvio = (ret.top + ret.height / 2 - centroTela) * -p.forca;
      p.el.style.transform = "translateY(" + desvio.toFixed(1) + "px)";
    });
  }

  /* ---------- 5. Reação ao ponteiro ---------- */
  // data-fx-mouse="12" → o elemento acompanha de leve o ponteiro (px máximos)

  function armarMouse() {
    var alvos = doc.querySelectorAll("[data-fx-mouse]");
    if (!alvos.length || reduzido || !window.matchMedia("(pointer: fine)").matches) return;
    window.addEventListener("pointermove", function (e) {
      var nx = (e.clientX / window.innerWidth) * 2 - 1;
      var ny = (e.clientY / window.innerHeight) * 2 - 1;
      alvos.forEach(function (el) {
        var forca = parseFloat(el.dataset.fxMouse) || 10;
        el.style.transform = "translate(" + (nx * forca).toFixed(1) + "px," + (ny * forca).toFixed(1) + "px)";
      });
    }, { passive: true });
  }

  /* ---------- ciclo principal ---------- */

  var agendado = false;

  function atualizar() {
    agendado = false;
    cenas.forEach(atualizarCena);
    atualizarParalaxes();
  }

  function aoRolar() {
    if (!agendado) {
      agendado = true;
      requestAnimationFrame(atualizar);
    }
  }

  function iniciar() {
    armarRevelacoes();
    armarCenas();
    armarFundos();
    armarParalaxes();
    armarMouse();

    if (!reduzido) {
      window.addEventListener("scroll", aoRolar, { passive: true });
      window.addEventListener("resize", aoRolar);
      aoRolar();
      // laço só para suavizar vídeo (barato; dorme se não há vídeo)
      if (cenas.some(function (c) { return c.video; })) {
        (function laco() {
          atualizarVideos();
          requestAnimationFrame(laco);
        })();
      }
    }
    raiz.classList.add("fx-pronto");
  }

  if (doc.readyState === "loading") {
    doc.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }
})();

/* ===== Página: comportamento da landing (rastreio, oferta, fachadas, assinatura) ===== */
(function () {
  "use strict";
  var doc = document, raiz = doc.documentElement;
  var D = JSON.parse(doc.getElementById("dados-pagina").textContent);
  var reduz = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.dataLayer = window.dataLayer || [];

  /* ---------- dataLayer (padrão de e-commerce do GA4) ---------- */
  function track(evento, params) {
    params = params || {};
    if (params.ecommerce) window.dataLayer.push({ ecommerce: null });
    if (D.variante && params.page_variant === undefined) params.page_variant = D.variante;
    var o = { event: evento };
    for (var k in params) o[k] = params[k];
    window.dataLayer.push(o);
    if (window.__ga4Direto && typeof window.gtag === "function") {
      var p = {};
      for (var j in params) if (j !== "ecommerce") p[j] = params[j];
      if (params.ecommerce) for (var e in params.ecommerce) p[e] = params.ecommerce[e];
      window.gtag("event", evento, p);
    }
  }
  var ecomCombo = function () {
    return { currency: D.moeda, value: D.preco, items: [D.item] };
  };
  track("view_item", { ecommerce: ecomCombo() });

  /* ---------- estado da oferta (data checada no navegador) ---------- */
  var ini = D.inicio ? Date.parse(D.inicio) : null;
  var fim = D.fim ? Date.parse(D.fim) : null;
  var estadoAtual = null;
  function aplicarEstado() {
    var agora = Date.now();
    var estado = ini && agora < ini ? "futura" : fim && agora > fim ? "encerrada" : "ativa";
    if (estado === estadoAtual) return;
    raiz.classList.remove("oferta-futura", "oferta-encerrada", "oferta-ativa");
    raiz.classList.add("oferta-" + estado);
    estadoAtual = estado;
    if (estado !== "ativa") {
      // o botão de compra sai; o formulário de aviso sobe para o topo
      var caixa = doc.getElementById("aviso-caixa");
      var destino = doc.getElementById("acoes-topo");
      if (caixa && destino) destino.parentNode.insertBefore(caixa, destino.nextSibling);
      var secaoAviso = doc.getElementById("aviso");
      if (secaoAviso && !secaoAviso.querySelector(".aviso-caixa")) secaoAviso.hidden = true;
      // fora do prazo, nenhum preço de Black Friday fica anunciado
      var h1 = doc.getElementById("h1");
      if (h1) { h1.removeAttribute("aria-label"); h1.textContent = D.itens.length + " cursos de percussão brasileira"; }
      ["preco", "final"].forEach(function (id) { var s = doc.getElementById(id); if (s) s.hidden = true; });
      doc.querySelectorAll(".preco-topo").forEach(function (el) { el.hidden = true; });
    }
    agendar();
  }
  function agendar() {
    var agora = Date.now(), prox = null;
    if (ini && agora < ini) prox = ini; else if (fim && agora <= fim) prox = fim;
    if (prox && prox - agora < 2147483000) setTimeout(aplicarEstado, prox - agora + 500);
  }
  aplicarEstado();

  /* ---------- Carnaval: dias reais até a data de config.carnaval; some depois que começa ---------- */
  var carnSec = doc.querySelector("[data-carnaval]");
  if (carnSec) {
    var iniC = Date.parse(carnSec.getAttribute("data-carnaval"));
    var faltam = Math.ceil((iniC - Date.now()) / 86400000);
    if (faltam <= 0) carnSec.hidden = true;
    else {
      var bd = carnSec.querySelector('[data-carn="dias"]'), bs = carnSec.querySelector('[data-carn="semanas"]');
      if (bd) bd.textContent = faltam;
      if (bs) bs.textContent = Math.floor(faltam / 7);
    }
  }

  /* ---------- contagem até o fim REAL da oferta (data fixa de config.json; não reinicia) ---------- */
  var contas = doc.querySelectorAll("[data-contagem]");
  if (contas.length && fim) {
    var dois = function (n) { return (n < 10 ? "0" : "") + n; };
    var passo = function () {
      var r = fim - Date.now();
      if (r <= 0) { contas.forEach(function (c) { c.hidden = true; }); aplicarEstado(); return; }
      var s = Math.floor(r / 1000), v = { d: Math.floor(s / 86400), h: dois(Math.floor(s / 3600) % 24), m: dois(Math.floor(s / 60) % 60), s: dois(s % 60) };
      contas.forEach(function (c) {
        c.hidden = false;
        c.querySelectorAll("[data-u]").forEach(function (b) { b.textContent = v[b.dataset.u]; });
      });
      setTimeout(passo, 1000 - (Date.now() % 1000) + 5);
    };
    passo();
  }

  /* ---------- parâmetros de origem → checkout Hotmart ---------- */
  var R = D.rastreio || {};
  var busca = new URLSearchParams(window.location.search);
  var origem = {};
  (R.repassar || []).forEach(function (k) {
    var v = busca.get(k);
    if (!v) return;
    v = v.trim();
    if (/^utm_/.test(k)) v = v.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9_.|-]+/g, "-").replace(/^-+|-+$/g, "");
    if (k === "sck" || k === "src") v = v.slice(0, 30);
    if (v) origem[k] = v;
  });
  function hrefCheckout(local) {
    var u = new URL(D.checkout);
    Object.keys(origem).forEach(function (k) { u.searchParams.set(k, origem[k]); });
    var pad = R.padrao || {};
    Object.keys(pad).forEach(function (k) { if (pad[k] && !u.searchParams.has(k)) u.searchParams.set(k, pad[k]); });
    if (R.utm_content_padrao_e_local_do_botao && !u.searchParams.has("utm_content")) u.searchParams.set("utm_content", local);
    if (R.sck_padrao_prefixo && !u.searchParams.has("sck")) u.searchParams.set("sck", (R.sck_padrao_prefixo + "-" + local).slice(0, 30));
    return u.href;
  }
  if (D.checkout) {
    doc.querySelectorAll(".btn-comprar[data-local]").forEach(function (a) {
      a.href = hrefCheckout(a.dataset.local);
    });
  }
  // WhatsApp: código de origem inclui a fonte da visita, se houver
  doc.querySelectorAll("a[data-whats]").forEach(function (a) {
    if (!origem.utm_source) return;
    try {
      var u = new URL(a.href);
      var t = u.searchParams.get("text") || "";
      u.searchParams.set("text", t.replace(/\(código: ([^)]+)\)/, "(código: $1-" + origem.utm_source + ")"));
      a.href = u.href;
    } catch (e) { /* mantém link original */ }
  });

  /* ---------- cliques ---------- */
  var cartoesVistos = {};
  doc.addEventListener("click", function (ev) {
    var alvo = ev.target;
    var comprar = alvo.closest(".btn-comprar[data-local]");
    if (comprar) {
      if (comprar.hasAttribute("data-checkout-pendente")) {
        ev.preventDefault();
        if (window.console) console.warn("Checkout Hotmart ainda não configurado (hotmart_checkout_url_combo vazio).");
        return;
      }
      var e = ecomCombo();
      track("begin_checkout", { local_botao: comprar.dataset.local, ecommerce: e });
      return;
    }
    var whats = alvo.closest("a[data-whats]");
    if (whats) { track("click_whatsapp", { local: whats.dataset.whats }); return; }
    var fachada = alvo.closest(".video-fachada");
    if (fachada) { abrirVideo(fachada); }
    var curso = alvo.closest(".curso[data-slug]");
    if (curso && !cartoesVistos[curso.dataset.slug]) {
      cartoesVistos[curso.dataset.slug] = true;
      var item = D.itens.filter(function (i) { return i.item_id === curso.dataset.slug; })[0];
      if (item) track("select_item", { ecommerce: { item_list_id: item.item_list_id, item_list_name: item.item_list_name, items: [item] } });
    }
  });

  /* ---------- vídeo em fachada: o player só carrega após o clique ---------- */
  function abrirVideo(btn) {
    var caixa = btn.parentNode, el;
    if (btn.dataset.tipo === "iframe") {
      el = doc.createElement("iframe");
      el.src = btn.dataset.embed;
      el.title = btn.dataset.titulo || "Vídeo";
      el.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
      el.allowFullscreen = true;
    } else {
      el = doc.createElement("video");
      el.src = btn.dataset.embed;
      el.controls = true; el.autoplay = true; el.playsInline = true;
      el.setAttribute("aria-label", btn.dataset.titulo || "Vídeo");
    }
    track("video_play", { video_tipo: btn.dataset.video, curso: btn.dataset.curso || undefined });
    caixa.replaceChild(el, btn);
    el.setAttribute("tabindex", "-1");
    el.focus();
  }

  /* ---------- FAQ ---------- */
  doc.querySelectorAll(".faq details").forEach(function (d) {
    d.addEventListener("toggle", function () {
      if (d.open) track("faq_abrir", { pergunta: d.querySelector("summary").textContent.trim() });
    });
  });

  /* ---------- rolagem: scroll_50 / scroll_90 + linha de pulsação ---------- */
  var marcou50 = false, marcou90 = false;
  var tempos = Array.prototype.map.call(doc.querySelectorAll(".pulsacao span"), function (s) {
    return { tick: s, secao: doc.getElementById(s.dataset.para) };
  }).filter(function (t) { return t.secao; });
  var atual = -1, agendado = false;
  function aoRolar() {
    agendado = false;
    var alt = doc.documentElement.scrollHeight - window.innerHeight;
    var p = alt > 0 ? window.scrollY / alt : 1;
    if (!marcou50 && p >= 0.5) { marcou50 = true; track("scroll_50", { percent_scrolled: 50 }); }
    if (!marcou90 && p >= 0.9) { marcou90 = true; track("scroll_90", { percent_scrolled: 90 }); }
    var meio = window.innerHeight * 0.5, idx = -1;
    tempos.forEach(function (t, i) { if (t.secao.getBoundingClientRect().top < meio) idx = i; });
    if (idx !== atual) {
      tempos.forEach(function (t, i) { t.tick.classList.toggle("aceso", i <= idx); });
      if (idx > atual && idx >= 0 && !reduz) {
        var tk = tempos[idx].tick;
        tk.classList.remove("bate"); void tk.offsetWidth; tk.classList.add("bate");
      }
      atual = idx;
    }
  }
  window.addEventListener("scroll", function () { if (!agendado) { agendado = true; requestAnimationFrame(aoRolar); } }, { passive: true });
  aoRolar();

  /* ---------- barra fixa no celular ---------- */
  var barra = doc.getElementById("barra-fixa");
  var cookies = doc.getElementById("cookies");
  if (barra && "IntersectionObserver" in window) {
    var visiveis = new Set();
    var atualizarBarra = function () {
      var esconder = visiveis.size > 0 || (cookies && !cookies.hidden);
      barra.classList.toggle("escondida", esconder);
      barra.setAttribute("aria-hidden", esconder ? "true" : "false");
      barra.querySelector("a").tabIndex = esconder ? -1 : 0;
    };
    var obs = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (en) { if (en.isIntersecting) visiveis.add(en.target); else visiveis.delete(en.target); });
      atualizarBarra();
    });
    doc.querySelectorAll(".btn-comprar[data-local]").forEach(function (b) { if (!barra.contains(b)) obs.observe(b); });
    var topo = doc.getElementById("acoes-topo");
    if (topo) obs.observe(topo);
    barra.hidden = false;
    doc.body.classList.add("tem-barra");
    atualizarBarra();
    window.__atualizarBarra = atualizarBarra;
  }

  /* ---------- consentimento de cookies (Consent Mode) ---------- */
  if (cookies) {
    var escolha = null;
    try { escolha = localStorage.getItem("bf_consent"); } catch (e) {}
    if (!escolha) { cookies.hidden = false; if (window.__atualizarBarra) window.__atualizarBarra(); }
    cookies.addEventListener("click", function (ev) {
      var b = ev.target.closest("[data-consent]");
      if (!b) return;
      var v = b.dataset.consent;
      try { localStorage.setItem("bf_consent", v); } catch (e) {}
      if (typeof window.gtag === "function") window.gtag("consent", "update", { analytics_storage: v });
      window.dataLayer.push({ event: "consent_update", analytics_storage: v });
      cookies.hidden = true;
      if (window.__atualizarBarra) window.__atualizarBarra();
    });
  }

  /* ---------- formulário de aviso (generate_lead) ---------- */
  var form = doc.querySelector(".form-aviso");
  if (form) {
    var status = form.querySelector(".form-status");
    var msg = function (t, erro) { status.textContent = t; status.classList.toggle("erro", !!erro); };
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var email = form.querySelector("#email"), ok = form.querySelector("#consent");
      if (!email.value || !email.checkValidity()) { msg("Confira o e-mail digitado.", true); email.focus(); return; }
      if (!ok.checked) { msg("Para enviar, marque a autorização de uso do e-mail.", true); ok.focus(); return; }
      if (form.querySelector("#site_web").value) { msg("Pronto! Você será avisado."); return; }
      var botao = form.querySelector("button[type=submit]");
      botao.disabled = true; msg("Enviando…");
      var dados = new FormData(form);
      Object.keys(origem).forEach(function (k) { dados.append(k, origem[k]); });
      fetch(form.action, { method: "POST", body: dados, headers: { Accept: "application/json" } })
        .then(function (r) {
          if (!r.ok) throw new Error("http " + r.status);
          track("generate_lead", { form_id: "aviso-proxima-condicao", estado_oferta: estadoAtual });
          msg("Pronto! Você será avisado da próxima condição.");
          form.reset();
          botao.disabled = false;
        })
        .catch(function (err) {
          botao.disabled = false;
          if (err instanceof TypeError) {
            // provável bloqueio de CORS: envia do jeito tradicional
            track("generate_lead", { form_id: "aviso-proxima-condicao", estado_oferta: estadoAtual, envio: "nativo" });
            HTMLFormElement.prototype.submit.call(form);
          } else {
            msg("Não deu para enviar agora. Tente de novo em instantes.", true);
          }
        });
    });
  }
})();
