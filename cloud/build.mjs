import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
const here=fileURLToPath(new URL('.',import.meta.url));
for(const [source,output] of [['page','cloud-account'],['worker','cloud-worker']]){
  await build({absWorkingDir:here,entryPoints:[source+'.js'],outfile:'../'+output+'.js',bundle:true,
    platform:'browser',format:'iife',target:['safari16','es2020'],minify:true,legalComments:'eof'});
}
