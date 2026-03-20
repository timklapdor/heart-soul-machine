/**
 * glitch.js — Reusable stripe-glitch animation utility
 * Based on the technique by Michael Villar (michaelvillar.com)
 *
 * Requires: dynamics.js, tinycolor.js
 *
 * Usage:
 *   // Hover glitch on a single element
 *   Glitch.onHover('#header-logo');
 *
 *   // Idle glitch that fires every 4–12s
 *   Glitch.idle('#header-logo');
 *
 *   // Hover glitch on all matching elements (e.g. nav links)
 *   Glitch.onHover('nav a');
 *
 *   // Glitch on scroll into view (fires once per element)
 *   Glitch.onScroll('h2');
 *
 *   // Fire manually at any time
 *   Glitch.fire(someElement);
 *   Glitch.fire(someElement, { stripes: 4, spread: 20 }); // subtle
 *
 *   // Chainable — set up everything at once
 *   Glitch.onHover('#header-logo').idle('#header-logo');
 *
 * Options (all optional):
 *   stripes  {number}  how many stripe-clones to create (default: random 8–16, or 3–5 for links)
 *   spread   {number}  max horizontal jitter in px (default: 50)
 *   idleMin  {number}  minimum ms between idle glitches (default: 4000)
 *   idleMax  {number}  maximum ms between idle glitches (default: 12000)
 *   stutter  {number}  0–1 probability of a double-burst (default: 0.35)
 */

// Glitch.onHover('#header-logo').idle('#header-logo');

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.Glitch = factory();
  }
}(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  var clipIdx = 0;

  // ─── Core engine ────────────────────────────────────────────────────────────

  function createStripeMasks(count, box, avgH) {
    avgH = avgH || 10;
    var masks = [], ids = [];
    for (var i = 0; i < count; i++) {
      masks.push([]);
      ids.push('glitchClip' + clipIdx++);
    }

    var mi = 0, x = 0, y = 0, sh = avgH;
    while (true) {
      var w = Math.max(sh * 10, Math.round(Math.random() * box.width));
      masks[mi].push(
        'M' + x + ',' + y +
        ' L' + (x + w) + ',' + y +
        ' L' + (x + w) + ',' + (y + sh) +
        ' L' + x + ',' + (y + sh) + ' Z'
      );
      mi = (mi + 1) % count;
      x += w;
      if (x > box.width) {
        x = 0;
        y += sh;
        sh = Math.round(Math.random() * avgH + avgH / 2);
      }
      if (y >= box.height) break;
    }

    var g = document.querySelector('#clip-paths defs g');
    if (!g) {
      console.warn('glitch.js: #clip-paths SVG container not found in DOM. Add it to your layout.');
      return [];
    }
    masks.forEach(function (rects, i) {
      var cp = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
      cp.setAttribute('id', ids[i]);
      var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('d', rects.join(' '));
      p.setAttribute('fill', 'white');
      cp.appendChild(p);
      g.appendChild(cp);
    });

    return ids;
  }

  function recolourClone(clone) {
    // Recolour SVG shapes
    clone.querySelectorAll('path, polygon, rect, circle, ellipse').forEach(function (child) {
      var hue = Math.round(Math.random() * 360);
      child.style.fill = tinycolor('hsl(' + hue + ', 80%, 65%)').toRgbString();
    });
    // Recolour text nodes
    clone.querySelectorAll('p, h1, h2, h3, h4, h5, h6, a, span, li').forEach(function (child) {
      var hue = Math.round(Math.random() * 360);
      child.style.color = tinycolor('hsl(' + hue + ', 80%, 65%)').toRgbString();
    });
    // If the clone itself is a text element, recolour it directly
    var tag = clone.tagName.toLowerCase();
    if (['p','h1','h2','h3','h4','h5','h6','a','span','li'].indexOf(tag) !== -1) {
      var hue = Math.round(Math.random() * 360);
      clone.style.color = tinycolor('hsl(' + hue + ', 80%, 65%)').toRgbString();
    }
  }

  function cloneWithMask(el, clipId) {
    var box = el.getBoundingClientRect();
    var clone = el.cloneNode(true);
    Object.assign(clone.style, {
      position:      'fixed',
      margin:        '0',
      pointerEvents: 'none',
      left:          box.left + 'px',
      top:           box.top  + 'px',
      width:         box.width  + 'px',
      height:        box.height + 'px',
      zIndex:        '9999',
    });
    clone.style.clipPath        = 'url(#' + clipId + ')';
    clone.style.webkitClipPath  = 'url(#' + clipId + ')';
    recolourClone(clone);
    document.body.appendChild(clone);
    return clone;
  }

  /**
   * Fire a single glitch burst on an element.
   * @param {Element} el
   * @param {Object}  opts  { stripes, spread }
   */
  function fire(el, opts) {
    if (!el) return;
    opts = opts || {};

    var box    = el.getBoundingClientRect();
    var n      = opts.stripes || Math.round(8 + Math.random() * 8);
    var spread = opts.spread  !== undefined ? opts.spread : 50;
    var avgH   = Math.round(box.height / n);
    var ids    = createStripeMasks(n, box, avgH);
    if (!ids.length) return;

    var clones = ids.map(function (id) { return cloneWithMask(el, id); });

    clones.forEach(function (clone) {
      var d  = Math.random() * 100;
      var tx = Math.random() * spread * 2 - spread;

      dynamics.setTimeout(function () {
        dynamics.css(clone, { translateX: tx });
      }, d);
      dynamics.setTimeout(function () {
        dynamics.css(clone, { translateX: tx / -5 });
      }, d + 50);
      dynamics.setTimeout(function () {
        dynamics.css(clone, { translateX: tx / -10 });
      }, d + 100);
      dynamics.setTimeout(function () {
        if (clone.parentNode) clone.parentNode.removeChild(clone);
        ids.forEach(function (id) {
          var node = document.getElementById(id);
          if (node && node.parentNode) node.parentNode.removeChild(node);
        });
      }, d + 160);
    });
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  var Glitch = {

    /**
     * Fire a glitch burst on element(s) immediately.
     * @param {string|Element} target  CSS selector or DOM element
     * @param {Object}         opts
     */
    fire: function (target, opts) {
      var els = resolve(target);
      els.forEach(function (el) { fire(el, opts); });
      return Glitch;
    },

    /**
     * Attach a hover (mouseenter) glitch to element(s).
     * @param {string|Element} target
     * @param {Object}         opts
     */
    onHover: function (target, opts) {
      var els = resolve(target);
      els.forEach(function (el) {
        el.addEventListener('mouseenter', function () {
          fire(el, opts);
        });
      });
      return Glitch;
    },

    /**
     * Start an idle glitch loop on an element — fires unprompted at random intervals.
     * @param {string|Element} target
     * @param {Object}         opts   Extra: idleMin, idleMax, stutter (0–1 probability of double-burst)
     */
    idle: function (target, opts) {
      opts = opts || {};
      var min     = opts.idleMin  !== undefined ? opts.idleMin  : 4000;
      var max     = opts.idleMax  !== undefined ? opts.idleMax  : 12000;
      var stutter = opts.stutter  !== undefined ? opts.stutter  : 0.35;

      var els = resolve(target);
      els.forEach(function (el) {
        function loop() {
          var delay = min + Math.random() * (max - min);
          dynamics.setTimeout(function () {
            fire(el, opts);
            if (Math.random() < stutter) {
              dynamics.setTimeout(function () { fire(el, opts); }, 300 + Math.random() * 300);
            }
            loop();
          }, delay);
        }
        // Stagger start so multiple elements don't all fire simultaneously
        dynamics.setTimeout(loop, Math.random() * 2000);
      });
      return Glitch;
    },

    /**
     * Glitch element(s) once when they scroll into view.
     * Uses IntersectionObserver — falls back gracefully if unsupported.
     * @param {string|Element} target
     * @param {Object}         opts   Extra: threshold (0–1, default 0.2)
     */
    onScroll: function (target, opts) {
      opts = opts || {};
      var threshold = opts.threshold !== undefined ? opts.threshold : 0.2;

      if (!('IntersectionObserver' in window)) {
        // Fallback: just fire immediately
        resolve(target).forEach(function (el) { fire(el, opts); });
        return Glitch;
      }

      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            fire(entry.target, opts);
            observer.unobserve(entry.target); // fire once only
          }
        });
      }, { threshold: threshold });

      resolve(target).forEach(function (el) { observer.observe(el); });
      return Glitch;
    },

  };

  // ─── Helpers ────────────────────────────────────────────────────────────────

  function resolve(target) {
    if (!target) return [];
    if (typeof target === 'string') {
      return Array.from(document.querySelectorAll(target));
    }
    if (target instanceof Element) return [target];
    return [];
  }

  return Glitch;
}));
