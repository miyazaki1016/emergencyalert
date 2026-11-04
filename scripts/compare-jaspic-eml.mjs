import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
// Deliberately strict: only explicitly volatile transport headers may be excluded.
// Everything else, including folding, charset, CTE and encoded body bytes, must match.
const volatile = new Set(['date','message-id','received','return-path','dkim-signature','authentication-results','received-spf','x-google-smtp-source','x-received','x-gm-message-state']);
export function comparable(buffer) {
  const raw=buffer.toString('latin1');
  if (raw.replaceAll('\r\n','').match(/[\r\n]/)) throw new Error('Non-CRLF message');
  const split=raw.indexOf('\r\n\r\n');
  if(split<0) throw new Error('Missing MIME header separator');
  const headers=raw.slice(0,split).split(/\r\n(?![ \t])/);
  const names=headers.map(h=>h.slice(0,h.indexOf(':')).toLowerCase());
  for(const name of ['from','to','cc','subject','mime-version','content-type','content-transfer-encoding']) {
    if(names.filter(n=>n===name).length!==1) throw new Error('Missing or duplicate required header');
  }
  return Buffer.from(headers.filter(h=>!volatile.has(h.slice(0,h.indexOf(':')).toLowerCase())).join('\r\n')+'\r\n\r\n'+raw.slice(split+4),'latin1');
}
export function compareEml(left,right) { return comparable(left).equals(comparable(right)); }
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  if(process.argv.length!==4) throw new Error('Usage: node scripts/compare-jaspic-eml.mjs old.eml new.eml');
  const same=compareEml(readFileSync(process.argv[2]),readFileSync(process.argv[3]));
  console.log(same?'MATCH (volatile transport headers excluded)':'MISMATCH (no message contents printed)');
  process.exitCode=same?0:1;
}
