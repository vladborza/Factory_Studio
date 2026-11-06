import {cp, mkdir, readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root = new URL('../', import.meta.url);
const out = new URL('_site/', root);
await mkdir(out, {recursive:true});
await cp(new URL('dist/', root), out, {recursive:true});
await cp(new URL('ad/', root), new URL('ad/', out), {recursive:true});
// Use the Pages app beside the ad rather than sending visitors to Sites hosting.
const ad = new URL('ad/index.html', out);
await writeFile(ad, (await readFile(ad,'utf8')).replace('https://factory-studio-orastie.vladborza1920.chatgpt.site/','../'));
await writeFile(new URL('.nojekyll', out), '');
console.log(`GitHub Pages bundle: ${fileURLToPath(out)}`);
