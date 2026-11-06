// Small, safe calculator for the launcher: + - * / ^ %, parentheses, functions and
// constants, Brazilian decimal commas. No eval.
(function () {
  const FUNCS = {
    sqrt: Math.sqrt, raiz: Math.sqrt, abs: Math.abs, round: Math.round, floor: Math.floor, ceil: Math.ceil,
    sin: Math.sin, cos: Math.cos, tan: Math.tan, sen: Math.sin, log: Math.log10, ln: Math.log, exp: Math.exp,
  };
  const CONSTS = { pi: Math.PI, e: Math.E };
  const PREC = { '+': 1, '-': 1, '*': 2, '/': 2, '%': 2, '^': 3 };

  function tokenize(src) {
    // Both "2,5" and "2.5" are two and a half (no thousands separators).
    src = src.replace(/(\d),(\d)/g, '$1.$2');
    src = src.replace(/[x×]/g, '*').replace(/÷/g, '/').replace(/\*\*/g, '^');
    const tokens = [];
    const re = /\s*(\d+(?:\.\d+)?|\.\d+|[a-z]+|[-+*/^%()])/giy;
    let m;
    let pos = 0;
    while (pos < src.length) {
      re.lastIndex = pos;
      m = re.exec(src);
      if (!m) {
        if (/^\s*$/.test(src.slice(pos))) break;
        return null;
      }
      tokens.push(m[1].toLowerCase());
      pos = re.lastIndex;
    }
    return tokens;
  }

  function toRpn(tokens) {
    const out = [];
    const ops = [];
    let prev = null; // to spot unary minus
    for (const t of tokens) {
      if (/^[\d.]/.test(t)) out.push(Number(t));
      else if (t in CONSTS) out.push(CONSTS[t]);
      else if (t in FUNCS) ops.push(t);
      else if (t === '(') ops.push(t);
      else if (t === ')') {
        while (ops.length && ops[ops.length - 1] !== '(') out.push(ops.pop());
        if (!ops.length) return null;
        ops.pop();
        if (ops.length && ops[ops.length - 1] in FUNCS) out.push(ops.pop());
      } else if (t in PREC) {
        const unary = prev === null || prev in PREC || prev === '(';
        if (unary && (t === '-' || t === '+')) {
          if (t === '-') ops.push('neg');
        } else {
          while (ops.length) {
            const top = ops[ops.length - 1];
            const higher = top === 'neg' || (top in PREC && (PREC[top] > PREC[t] || (PREC[top] === PREC[t] && t !== '^')));
            if (!higher) break;
            out.push(ops.pop());
          }
          ops.push(t);
        }
      } else return null;
      prev = t;
    }
    while (ops.length) {
      const op = ops.pop();
      if (op === '(') return null;
      out.push(op);
    }
    return out;
  }

  function run(rpn) {
    const st = [];
    for (const t of rpn) {
      if (typeof t === 'number') st.push(t);
      else if (t === 'neg') st.push(-st.pop());
      else if (t in FUNCS) st.push(FUNCS[t](st.pop()));
      else {
        const b = st.pop();
        const a = st.pop();
        if (a === undefined || b === undefined) return NaN;
        switch (t) {
          case '+': st.push(a + b); break;
          case '-': st.push(a - b); break;
          case '*': st.push(a * b); break;
          case '/': st.push(a / b); break;
          case '%': st.push(a % b); break;
          case '^': st.push(a ** b); break;
        }
      }
    }
    return st.length === 1 ? st[0] : NaN;
  }

  // Only answer things that look like maths, so typing an app name stays quiet.
  function evaluate(input) {
    const q = input.trim();
    if (!q || !/\d/.test(q)) return null;
    if (!/[-+*/^%()x×÷]|\b(sqrt|raiz|sin|sen|cos|tan|log|ln|abs|pi)\b/i.test(q.replace(/^-/, ''))) return null;
    const tokens = tokenize(q);
    if (!tokens) return null;
    const rpn = toRpn(tokens);
    if (!rpn) return null;
    const value = run(rpn);
    if (!Number.isFinite(value)) return null;
    return value;
  }

  const fmt = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 10 });
  window.Calc = {
    evaluate,
    format: (v) => fmt.format(Math.abs(v) < 1e-12 ? 0 : v),
    plain: (v) => String(Math.round(v * 1e10) / 1e10),
  };
})();
