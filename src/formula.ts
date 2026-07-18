type Token =
  | { type: 'number'; value: number }
  | { type: 'identifier'; value: string }
  | { type: 'operator'; value: string }
  | { type: 'leftParen' | 'rightParen' | 'comma' };

const functions: Record<string, (...args: number[]) => number> = {
  abs: Math.abs,
  ceil: Math.ceil,
  floor: Math.floor,
  max: Math.max,
  min: Math.min,
  pow: Math.pow,
  round: Math.round,
  sqrt: Math.sqrt,
};

function tokenize(expression: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;

  while (index < expression.length) {
    const character = expression[index];
    if (/\s/.test(character)) {
      index += 1;
      continue;
    }

    if (/[0-9.]/.test(character)) {
      const match = expression.slice(index).match(/^(?:\d+\.?\d*|\.\d+)/);
      if (!match) throw new Error(`Invalid number at position ${index + 1}`);
      const value = Number(match[0]);
      if (!Number.isFinite(value)) throw new Error('Invalid number');
      tokens.push({ type: 'number', value });
      index += match[0].length;
      continue;
    }

    if (/[A-Za-z_]/.test(character)) {
      const match = expression.slice(index).match(/^[A-Za-z_][A-Za-z0-9_]*/)!;
      tokens.push({ type: 'identifier', value: match[0].toLowerCase() });
      index += match[0].length;
      continue;
    }

    if ('+-*/%^'.includes(character)) {
      tokens.push({ type: 'operator', value: character });
      index += 1;
      continue;
    }

    const punctuation: Record<string, Token['type']> = {
      '(': 'leftParen',
      ')': 'rightParen',
      ',': 'comma',
    };
    const type = punctuation[character];
    if (type) {
      tokens.push({ type } as Token);
      index += 1;
      continue;
    }

    throw new Error(`Unexpected “${character}” at position ${index + 1}`);
  }

  return tokens;
}

export function evaluateFormula(expression: string, scope: Record<string, number>): number {
  const tokens = tokenize(expression);
  let cursor = 0;

  const peek = () => tokens[cursor];
  const consume = () => tokens[cursor++];

  const parsePrimary = (): number => {
    const token = consume();
    if (!token) throw new Error('Formula ends unexpectedly');

    if (token.type === 'number') return token.value;

    if (token.type === 'identifier') {
      if (peek()?.type === 'leftParen') {
        consume();
        const args: number[] = [];
        if (peek()?.type !== 'rightParen') {
          do {
            args.push(parseAdditive());
            if (peek()?.type !== 'comma') break;
            consume();
          } while (true);
        }
        if (consume()?.type !== 'rightParen') throw new Error('Missing closing parenthesis');
        const fn = functions[token.value];
        if (!fn) throw new Error(`Unknown function “${token.value}”`);
        return fn(...args);
      }

      if (!(token.value in scope)) throw new Error(`Unknown value “${token.value}”`);
      return scope[token.value];
    }

    if (token.type === 'leftParen') {
      const value = parseAdditive();
      if (consume()?.type !== 'rightParen') throw new Error('Missing closing parenthesis');
      return value;
    }

    throw new Error('Expected a number, value, or parenthesis');
  };

  const parseUnary = (): number => {
    const token = peek();
    if (token?.type === 'operator' && (token.value === '+' || token.value === '-')) {
      consume();
      const value = parseUnary();
      return token.value === '-' ? -value : value;
    }
    return parsePrimary();
  };

  const parsePower = (): number => {
    const left = parseUnary();
    const token = peek();
    if (token?.type === 'operator' && token.value === '^') {
      consume();
      return left ** parsePower();
    }
    return left;
  };

  const parseMultiplicative = (): number => {
    let value = parsePower();
    while (peek()?.type === 'operator' && ['*', '/', '%'].includes((peek() as Extract<Token, { type: 'operator' }>).value)) {
      const operator = (consume() as Extract<Token, { type: 'operator' }>).value;
      const right = parsePower();
      if ((operator === '/' || operator === '%') && right === 0) throw new Error('Cannot divide by zero');
      value = operator === '*' ? value * right : operator === '/' ? value / right : value % right;
    }
    return value;
  };

  const parseAdditive = (): number => {
    let value = parseMultiplicative();
    while (peek()?.type === 'operator' && ['+', '-'].includes((peek() as Extract<Token, { type: 'operator' }>).value)) {
      const operator = (consume() as Extract<Token, { type: 'operator' }>).value;
      const right = parseMultiplicative();
      value = operator === '+' ? value + right : value - right;
    }
    return value;
  };

  if (!tokens.length) throw new Error('Enter a formula');
  const result = parseAdditive();
  if (cursor < tokens.length) throw new Error('Unexpected value in formula');
  if (!Number.isFinite(result)) throw new Error('Result is not a finite number');
  return result;
}

export function keyFromName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/^(\d)/, 'value_$1');
}

export function formatResult(value: number, format: 'number' | 'currency' | 'percent', decimals: number): string {
  if (format === 'currency') {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  }

  const formatted = new Intl.NumberFormat('en-AU', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
  return format === 'percent' ? `${formatted}%` : formatted;
}
