'use strict';

/**
 * CommonJS mirror of the AMD EarsAst for Node tooling/tests.
 * Keep behavior aligned with src/EarsAst.js.
 */

const PATTERN_ALIASES = {
  ubiquitous: 'ubiquitous',
  ubi: 'ubiquitous',
  state: 'state',
  'state-driven': 'state',
  while: 'state',
  event: 'event',
  'event-driven': 'event',
  when: 'event',
  optional: 'optional',
  feature: 'optional',
  where: 'optional',
  unwanted: 'unwanted',
  if: 'unwanted',
  complex: 'complex'
};

function normalizePattern(raw) {
  if (!raw) return 'ubiquitous';
  const key = String(raw).trim().toLowerCase();
  return PATTERN_ALIASES[key] || key;
}

function extractClauses(body, pattern) {
  const out = {
    precondition: '',
    trigger: '',
    feature: '',
    unwantedCondition: '',
    system: '',
    response: ''
  };
  if (!body) return out;

  let rest = body.replace(/\.$/, '').trim();

  const whileMatch = rest.match(/^While\s+(.+?),\s*(?:when\s+(.+?),\s*)?the\s+(.+?)\s+shall\s+(.+)$/i);
  if (whileMatch) {
    out.precondition = whileMatch[1].trim();
    if (whileMatch[2]) out.trigger = whileMatch[2].trim();
    out.system = whileMatch[3].trim();
    out.response = whileMatch[4].trim();
    return out;
  }

  const whenMatch = rest.match(/^When\s+(.+?),\s*the\s+(.+?)\s+shall\s+(.+)$/i);
  if (whenMatch) {
    out.trigger = whenMatch[1].trim();
    out.system = whenMatch[2].trim();
    out.response = whenMatch[3].trim();
    return out;
  }

  const whereMatch = rest.match(/^Where\s+(.+?),\s*the\s+(.+?)\s+shall\s+(.+)$/i);
  if (whereMatch) {
    out.feature = whereMatch[1].trim();
    out.system = whereMatch[2].trim();
    out.response = whereMatch[3].trim();
    return out;
  }

  const ifMatch = rest.match(/^If\s+(.+?),\s*then\s+the\s+(.+?)\s+shall\s+(.+)$/i);
  if (ifMatch) {
    out.unwantedCondition = ifMatch[1].trim();
    out.system = ifMatch[2].trim();
    out.response = ifMatch[3].trim();
    return out;
  }

  const ubiMatch = rest.match(/^The\s+(.+?)\s+shall\s+(.+)$/i);
  if (ubiMatch) {
    out.system = ubiMatch[1].trim();
    out.response = ubiMatch[2].trim();
    return out;
  }

  if (pattern === 'ubiquitous') {
    out.response = rest;
  }
  return out;
}

function parse(source) {
  const text = String(source || '').replace(/\r\n/g, '\n');
  const lines = text.split('\n');
  const requirements = [];
  let i = 0;
  let title = '';

  while (i < lines.length) {
    const line = lines[i].trim();
    i += 1;
    if (!line || line.startsWith('#')) {
      if (line.startsWith('#') && !title) {
        title = line.replace(/^#+\s*/, '').trim();
      }
      continue;
    }

    const header = line.match(/^(REQ[\w.-]+)\s*(?:\[([^\]]+)\])?\s*(.*)$/i);
    if (!header) continue;

    const reqId = header[1];
    const pattern = normalizePattern(header[2] || 'ubiquitous');
    const meta = {};
    (header[3] || '').replace(/(\w+)\s*=\s*([^\s]+)/g, function (_, k, v) {
      meta[k.toLowerCase()] = v;
      return '';
    });

    const bodyLines = [];
    while (i < lines.length) {
      const next = lines[i];
      const trimmed = next.trim();
      if (!trimmed) {
        i += 1;
        if (bodyLines.length) break;
        continue;
      }
      if (/^REQ[\w.-]+/i.test(trimmed) || trimmed.startsWith('#')) break;
      bodyLines.push(trimmed);
      i += 1;
    }

    const body = bodyLines.join(' ');
    const clauses = extractClauses(body, pattern);
    requirements.push({
      reqId: reqId,
      name: reqId,
      pattern: pattern,
      risk: meta.risk || '',
      verifymethod: meta.verifymethod || meta.verify || '',
      text: body,
      precondition: clauses.precondition,
      trigger: clauses.trigger,
      feature: clauses.feature,
      unwantedCondition: clauses.unwantedCondition,
      system: clauses.system,
      response: clauses.response
    });
  }

  return {
    kind: 'ears',
    title: title,
    name: title || 'EARS Specification',
    requirements: requirements
  };
}

function renderProse(r) {
  const system = r.system || 'system';
  const response = r.response || '…';
  switch (r.pattern) {
    case 'state':
      return 'While ' + (r.precondition || '…') + ', the ' + system + ' shall ' + response;
    case 'event':
      return 'When ' + (r.trigger || '…') + ', the ' + system + ' shall ' + response;
    case 'optional':
      return 'Where ' + (r.feature || '…') + ', the ' + system + ' shall ' + response;
    case 'unwanted':
      return 'If ' + (r.unwantedCondition || '…') + ', then the ' + system + ' shall ' + response;
    case 'complex':
      return (
        'While ' +
        (r.precondition || '…') +
        ', when ' +
        (r.trigger || '…') +
        ', the ' +
        system +
        ' shall ' +
        response
      );
    default:
      return 'The ' + system + ' shall ' + response;
  }
}

function serializeRequirement(r) {
  const bits = [r.reqId || r.name || 'REQ'];
  if (r.pattern) bits.push('[' + r.pattern + ']');
  const meta = [];
  if (r.risk) meta.push('risk=' + r.risk);
  if (r.verifymethod) meta.push('verifymethod=' + r.verifymethod);
  if (meta.length) bits.push(meta.join(' '));

  let prose = r.text || renderProse(r);
  return bits.join(' ') + '\n' + prose + (/\.$/.test(prose) ? '' : '.') + '\n';
}

function serialize(ast) {
  const parts = [];
  if (ast.title) parts.push('# ' + ast.title);
  (ast.requirements || []).forEach(function (r) {
    parts.push(serializeRequirement(r));
  });
  return parts.join('\n').trim() + '\n';
}

function wellFormed(r) {
  if (!r.reqId || !r.system || !r.response) return false;
  switch (r.pattern) {
    case 'state':
      return !!r.precondition;
    case 'event':
      return !!r.trigger;
    case 'optional':
      return !!r.feature;
    case 'unwanted':
      return !!r.unwantedCondition;
    case 'complex':
      return !!(r.precondition && r.trigger);
    default:
      return true;
  }
}

module.exports = {
  parse: parse,
  serialize: serialize,
  serializeRequirement: serializeRequirement,
  renderProse: renderProse,
  wellFormed: wellFormed,
  normalizePattern: normalizePattern
};
