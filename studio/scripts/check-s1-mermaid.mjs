import mermaid from 'mermaid';
import { S1_DEMO_DIAGRAMS } from '../src/data/s1DemoSeed.js';

mermaid.initialize({ startOnLoad: false, securityLevel: 'loose', theme: 'default' });

let failed = 0;
for (const [key, d] of Object.entries(S1_DEMO_DIAGRAMS)) {
  if (d.diagramType === 'ears') {
    console.log('SKIP', key, '(ears)');
    continue;
  }
  try {
    await mermaid.parse(d.source);
    console.log('OK  ', key);
  } catch (e) {
    const msg = String(e.message || e.str || e);
    // Node has no DOMPurify; those diagrams still render in the browser.
    if (/DOMPurify|document is not defined/i.test(msg)) {
      console.log('ENV ', key, '(needs browser; syntax not rejected)');
      continue;
    }
    failed += 1;
    console.log('FAIL', key, msg.slice(0, 200));
  }
}
process.exit(failed ? 1 : 0);
