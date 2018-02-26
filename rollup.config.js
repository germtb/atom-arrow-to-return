import json from 'rollup-plugin-json'
import babel from 'rollup-plugin-babel'
import resolve from 'rollup-plugin-node-resolve'
import commonJS from 'rollup-plugin-commonjs'
import builtins from 'rollup-plugin-node-builtins'
import sizes from 'rollup-plugin-sizes'

module.exports = {
	input: './lib/arrow-to-return.js',
	output: {
		format: 'cjs',
		file: './dist/bundle.js'
	},
	external: ['fs', 'path', 'child_process', 'atom', 'os'],
	plugins: [
		json(),
		babel({
			babelrc: false,
			presets: ['es2015-rollup'],
			exclude: ['node_modules/**', '**/*.json'],
			plugins: ['transform-object-rest-spread']
		}),
		resolve({
			jsnext: true
		}),
		commonJS({
			include: 'node_modules/**'
		}),
		builtins(),
		sizes()
	]
}
