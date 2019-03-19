import nodeResolve from 'rollup-plugin-node-resolve';

// SEE: https://rollupjs.org/
const defaults = {
	...{context: 'this', root: __dirname, base: './dist'},
	output: {sourcemap: true, preferConst: true},
	// treeshake: {propertyReadSideEffects: false},
	plugins: [
		// SEE: https://github.com/rollup/rollup-plugin-node-resolve
		nodeResolve(),
	],
};

const sources = {
	markout: `./packages/parser/lib/markout.js`,
	markup: `./packages/parser/lib/markup.js`,
	entities: `./packages/parser/lib/entities.js`,
	common: `./packages/parser/lib/common.js`,
};

const bundles = (({markout, markup, entities, common}) => ({
	['parser:es']: {
		input: {markout, markup, entities},
		// external: (specifier, referrer) => specifier === './markup.js' && referrer.endsWith('/markout.js'),
		manualChunks: {
			helpers: [entities],
		},
	},
}))(sources);

const configurations = [esm('parser', '.m.js')];

console.log(configurations);

export default configurations;

function esm(name, naming = '[name].js', bundle = bundles[(name = `${name}:es` in bundles ? `${name}:es` : name)]) {
	return configure(name, 'es', naming, bundle, defaults);
}

function umd(name, naming = '[name].js', bundle = bundles[(name = `${name}:umd` in bundles ? `${name}:umd` : name)]) {
	return configure(name, 'umd', naming, bundle, defaults);
}

function configure() {
	const normalize = location => location && String.prototype.replace.call(location, /(:\/{0,3}|)([/]+)/g, '$1/');
	const dirname = dirname => dirname && normalize(`${dirname}/`);
	const resolve = (specifier, referrer = cwd, asURL = referrer && `${referrer}`.includes('://')) =>
		asURL
			? `${new URL(specifier, referrer)}`
			: /^[.]{1,2}[/]/.test(specifier)
			? new URL(specifier, `file:///${referrer || ''}`).pathname
			: `${specifier}`;

	resolve.node = nodeResolve();

	const cwd =
		typeof process === 'object'
			? dirname(process.cwd())
			: typeof location === 'object' && location && location.pathname;

	return (configure = (
		bundle,
		format = 'umd',
		fileNames = '', // entryFileNames, //
		{input, output: {dir: dir = '', name, ...output} = {}, ...options},
		{root, base, ...defaults} = {},
	) => {
		root = root ? dirname(root) : cwd;
		base = base ? dirname(base).replace(root, './') : './dist/';

		const [packageID, buildID] = bundle.split(/:(.*)$/, 2);
		const [
			,
			pathname = '',
			filename = '[name]',
			extension = '[extname]',
		] = /^(?:(.*\/|)(?:((?:\[name\]|\[hash\]|[^\/.\[]+?|\[(?:(?!ext\])(?!extname\])))+?))?)?(?:(\.\[ext\]|\[extname\]|(?:\.\w+)+))?$/.exec(
			fileNames,
		); // /^(.*\/|)([^\/]*?)(\.[^\/]+|[extname]|)$/.exec(fileNames);

		dir = normalize(
			packageID && (!dir || dir.startsWith('./'))
				? resolve(dir || './', `${root}${base.slice(2)}${packageID}/`)
				: resolve(`./${dir || ''}`, `${root}${base.slice(2)}`),
		);

		if (typeof input === 'string') {
			// input = normalize(resolve(input, root));
			const suffix = buildID && format !== buildID ? `.${buildID.replace(/:.*$/, '')}` : '';
			const name = `${packageID || output.name || root.replace(/.*\/([^/]+)\/$/, '$1') || 'bundle'}${suffix}`;
			input = {[name]: input};
		}

		output = {...defaults.output, ...output, dir, format};

		(name = name || packageID) && (output.name = name);

		const entryFileNames = `${filename}${extension}`;
		output.entryFileNames = entryFileNames;

		!options.manualChunks || output.chunkFileNames || (output.chunkFileNames = entryFileNames);

		return {...defaults, ...options, input, output};
	})(...arguments);
}

// if (Array.isArray(input)) {
// 	for (let i = 0, n = input.length; n--; input[i] = resolve(input[i++], root));
// } else {
// for (const entry of Object.getOwnPropertyNames(input)) {
// 	const source = input[entry];
// 	if (typeof source === 'string') {
// 		input[entry] = normalize(resolve(source, root));
// 	} else if (Array.isArray(source)) {
// 		for (let i = 0, n = source.length; n--; source[i] = normalize(resolve(source[i++], root)));
// 	} else {
// 		throw TypeError(`Invlaid input "${input}"`);
// 	}
// }
// }

// const dist = `./dist`;
