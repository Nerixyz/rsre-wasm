import {readFile, rmdir, writeFile, access, copyFile, readdir, mkdir} from 'fs/promises';
import path from 'path';
import {exec} from 'child_process';

const execAsync = (cmd) => new Promise((resolve, reject) => exec(cmd, e => e ? reject(e) : resolve()));

// access throws an error if the user doesnt have access
const exists = async path => access(path).then(() => true).catch(() => false);

(async () => {
    await time('init', async () => {
        if (await exists('pkg'))
            await rmdir('pkg', {recursive: true});
        if (await exists('pkg-node'))
            await rmdir('pkg-node', {recursive: true});
    });

    await time('wasm-pack [node]', () => execAsync('wasm-pack build -t nodejs -d pkg-node'));
    await time('wasm-pack [bundler]', () => execAsync('wasm-pack build -t bundler -d pkg'));

    const mainPkg = JSON.parse(await readFile('pkg/package.json', {encoding: 'utf8'}));
    const name = mainPkg.name.replace(/-/g, '_');

    await time('copy', () => Promise.all([
        copyFile(`pkg-node/${name}.js`, `pkg/${name}_node.js`),
        copyFile(`pkg-node/${name}.d.ts`, `pkg/${name}_node.d.ts`),
        copyFile(`pkg-node/${name}_bg.wasm`, `pkg/${name}_node.wasm`),
        copyDirectory('glue', 'pkg/glue')
    ]));

    await time('replace', async () => {
        /** @type string */
        const data = await readFile(`pkg/${name}_node.js`, {encoding: 'utf8'});
        await writeFile(`pkg/${name}_node.js`, data.replace(`${name}_bg.wasm`,`${name}_node.wasm`));
    });

    mainPkg.main = 'glue/node.glue.js';
    mainPkg.types = 'glue/node.glue.d.ts'

    await time('add files', async () => {
        const mainFiles = (await readdir('pkg')).filter(x => /\.(?:js|ts|wasm)$/.test(x));
        const glueFiles = (await readdir('pkg/glue')).filter(x => /\.(?:js|ts|wasm)$/.test(x)).map(x => path.join('glue', x));
        mainPkg.files = [...mainFiles, ...glueFiles];
    });

    await time('final-write', () => writeFile('pkg/package.json', JSON.stringify(mainPkg, null, 2)));
    // await time('final-cleanup', () => rmdir('pkg-node', {recursive: true}));
})();

async function time(label, fn) {
    console.time(label);
    const res = await fn();
    console.timeEnd(label);
    return res;
}

async function copyDirectory(fromDir, toDir) {
    const entries = await readdir(fromDir);
    await mkdir(toDir);
    await Promise.all(entries.map(e => copyFile(path.join(fromDir, e), path.join(toDir, e))));
}