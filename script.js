/* ==========================================================================
   SOUTHERN T&C — JavaScript
   Vanilla, mínimo, sin dependencias.
   ========================================================================== */

(function () {
  'use strict';

  // ----- Helpers --------------------------------------------------------
  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) {
    return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  };

  // Marca que JS está activo (para CSS fallback)
  document.documentElement.classList.remove('no-js');
  document.documentElement.classList.add('js');

  // ----- Año dinámico en footer -----------------------------------------
  var yearEl = $('#year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  // ----- Header: agregar clase al scrollear + sync altura --------------
  var header = $('#siteHeader');
  if (header) {
    // Sincroniza la variable CSS --header-h con la altura real del header.
    // Esto permite que el mobile nav y el smooth scroll usen el valor correcto
    // incluso si el header cambia de tamaño con zoom o textos largos.
    var syncHeaderHeight = function () {
      var h = header.offsetHeight;
      if (h > 0) {
        document.documentElement.style.setProperty('--header-h', h + 'px');
      }
    };
    syncHeaderHeight();
    window.addEventListener('resize', syncHeaderHeight, { passive: true });
    // Sync una vez más después de que carguen las fuentes (puede cambiar el alto)
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(syncHeaderHeight).catch(function () {});
    }

    var scrollTick = false;
    var updateHeader = function () {
      var y = window.pageYOffset || document.documentElement.scrollTop;
      if (y > 24) {
        header.classList.add('is-scrolled');
      } else {
        header.classList.remove('is-scrolled');
      }
      scrollTick = false;
    };
    window.addEventListener('scroll', function () {
      if (!scrollTick) {
        window.requestAnimationFrame(updateHeader);
        scrollTick = true;
      }
    }, { passive: true });
    updateHeader();
  }

  // ----- Mobile nav toggle ----------------------------------------------
  var navToggle = $('.nav-toggle');
  var primaryNav = $('#primary-nav');

  function closeNav() {
    if (!navToggle || !primaryNav) return;
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.setAttribute('aria-label', 'Abrir menú');
    primaryNav.classList.remove('is-open');
    document.body.classList.remove('nav-open');
  }

  function openNav() {
    if (!navToggle || !primaryNav) return;
    navToggle.setAttribute('aria-expanded', 'true');
    navToggle.setAttribute('aria-label', 'Cerrar menú');
    primaryNav.classList.add('is-open');
    document.body.classList.add('nav-open');
  }

  if (navToggle && primaryNav) {
    navToggle.addEventListener('click', function () {
      var isOpen = navToggle.getAttribute('aria-expanded') === 'true';
      if (isOpen) {
        closeNav();
      } else {
        openNav();
      }
    });

    // Cerrar al hacer click en un link
    $$('a', primaryNav).forEach(function (link) {
      link.addEventListener('click', function () {
        closeNav();
      });
    });

    // Cerrar con Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && navToggle.getAttribute('aria-expanded') === 'true') {
        closeNav();
        navToggle.focus();
      }
    });

    // Si el viewport pasa a desktop, cerrar
    var mq = window.matchMedia('(min-width: 900px)');
    var handleMQ = function (e) {
      if (e.matches) closeNav();
    };
    if (mq.addEventListener) {
      mq.addEventListener('change', handleMQ);
    } else if (mq.addListener) {
      mq.addListener(handleMQ);
    }
  }

  // ----- Counter animations en hero-meta ---------------------------------
  var counters = $$('.meta-num[data-count]');
  if (counters.length && 'IntersectionObserver' in window) {
    var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var animateCount = function (el) {
      var target = parseInt(el.getAttribute('data-count'), 10);
      if (isNaN(target)) return;
      // Si el usuario prefiere reduced motion, saltar al final
      if (prefersReduced) {
        el.firstChild.nodeValue = String(target);
        return;
      }
      var duration = 1400;
      var start = performance.now();
      // Tomamos solo el primer textNode para no romper el <sup>
      var textNode = el.firstChild;
      var step = function (now) {
        var t = Math.min(1, (now - start) / duration);
        // easeOutCubic
        var eased = 1 - Math.pow(1 - t, 3);
        var value = Math.round(eased * target);
        if (textNode && textNode.nodeType === 3) {
          textNode.nodeValue = String(value);
        }
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    var countersIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          countersIO.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    counters.forEach(function (el) { countersIO.observe(el); });
  }

  // ----- Reveal on scroll (IntersectionObserver) ------------------------
  var reveals = $$('.reveal');
  if (reveals.length) {
    // Aplicar delay desde data-delay
    reveals.forEach(function (el) {
      var d = el.getAttribute('data-delay');
      if (d) el.style.setProperty('--reveal-delay', d + 'ms');
    });

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      }, {
        threshold: 0.12,
        rootMargin: '0px 0px -40px 0px'
      });
      reveals.forEach(function (el) { io.observe(el); });
    } else {
      // Fallback antiguo: mostrar todo
      reveals.forEach(function (el) { el.classList.add('is-visible'); });
    }
  }

  // ----- Smooth scroll con offset por header fijo -----------------------
  // (CSS scroll-behavior maneja la mayor parte; esto compensa el header)
  var headerHeight = function () {
    return header ? header.offsetHeight : 0;
  };

  $$('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var href = link.getAttribute('href');
      if (!href || href === '#' || href.length < 2) return;
      var target = document.getElementById(href.slice(1));
      if (!target) return;

      // Si está en una sección hero y el target es el mismo, ignorar
      e.preventDefault();
      var top = target.getBoundingClientRect().top + window.pageYOffset - headerHeight() + 1;
      var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({
        top: top,
        behavior: prefersReduced ? 'auto' : 'smooth'
      });

      // Foco accesible
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
      setTimeout(function () {
        target.removeAttribute('tabindex');
      }, 500);
    });
  });

  // ----- Contact form: validación + fallback mailto ---------------------
  var form = $('#contactForm');
  var formStatus = $('#formStatus');

  function setStatus(msg, type) {
    if (!formStatus) return;
    formStatus.textContent = msg;
    formStatus.classList.remove('success', 'error');
    if (type) formStatus.classList.add(type);
  }

  function markError(field, hasError) {
    var row = field.closest('.form-row, .form-row-2 > div');
    if (!row) return;
    if (hasError) {
      row.classList.add('has-error');
      field.setAttribute('aria-invalid', 'true');
    } else {
      row.classList.remove('has-error');
      field.removeAttribute('aria-invalid');
    }
  }

  function validateEmail(email) {
    // Simple, suficiente para validación client-side
    var re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    return re.test(email);
  }

  if (form) {
    // Limpiar errores al editar
    $$('input, select, textarea', form).forEach(function (field) {
      field.addEventListener('input', function () {
        markError(field, false);
        if (formStatus.classList.contains('error')) {
          setStatus('', null);
        }
      });
      field.addEventListener('change', function () {
        markError(field, false);
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var nameEl = $('#fName');
      var emailEl = $('#fEmail');
      var phoneEl = $('#fPhone');
      var serviceEl = $('#fService');
      var messageEl = $('#fMessage');

      var name = nameEl.value.trim();
      var email = emailEl.value.trim();
      var phone = phoneEl.value.trim();
      var service = serviceEl.value;
      var message = messageEl.value.trim();

      var hasError = false;

      if (!name) { markError(nameEl, true); hasError = true; }
      if (!email || !validateEmail(email)) { markError(emailEl, true); hasError = true; }
      if (!service) { markError(serviceEl, true); hasError = true; }
      if (!message) { markError(messageEl, true); hasError = true; }

      if (hasError) {
        setStatus('Por favor revisá los campos marcados.', 'error');
        // Foco al primer campo con error
        var firstError = form.querySelector('.has-error input, .has-error select, .has-error textarea');
        if (firstError) firstError.focus();
        return;
      }

      // Construir cuerpo del mensaje
      var subject = 'Consulta web — ' + service + ' — ' + name;
      var bodyLines = [
        'Nombre / Empresa: ' + name,
        'Email: ' + email,
        'Teléfono: ' + (phone || '(no provisto)'),
        'Servicio: ' + service,
        '',
        'Mensaje:',
        message,
        '',
        '— Enviado desde southern.uy'
      ];
      var body = bodyLines.join('\n');

      // Construir mailto como fallback robusto (no requiere backend)
      var mailto =
        'mailto:administracion@southern.uy' +
        '?subject=' + encodeURIComponent(subject) +
        '&body=' + encodeURIComponent(body);

      // Construir link de WhatsApp con el mismo contenido (fallback)
      var waText =
        'Hola, soy ' + name + '.\n' +
        'Email: ' + email + '\n' +
        (phone ? 'Tel: ' + phone + '\n' : '') +
        'Servicio: ' + service + '\n\n' +
        message;
      var waLink = 'https://wa.me/5491131091574?text=' + encodeURIComponent(waText);

      setStatus('Abriendo tu cliente de correo…', 'success');

      // Intentar abrir cliente de correo
      window.location.href = mailto;

      // Mostrar alternativa WhatsApp después de un momento
      setTimeout(function () {
        if (!formStatus) return;
        formStatus.classList.remove('error');
        formStatus.classList.add('success');
        formStatus.innerHTML =
          '¿Preferís WhatsApp? <a href="' + waLink + '" target="_blank" rel="noopener" ' +
          'style="text-decoration:underline;font-weight:600;color:inherit;">' +
          'Enviar este mensaje por WhatsApp ↗</a>';
      }, 2000);
    });
  }

})();
