import { CompositeDisposable } from 'atom'

import { toArrow, toAtomRange, parse } from './utils'
import { config } from './config'

module.exports = {
	config,
	subscriptions: null,
	semicolons: config.semicolons.default,

	activate() {
		atom.config.observe('arrow-to-return.semicolons', (value) => {
			this.semicolons = value
		})
		this.subscriptions = new CompositeDisposable()
		this.subscriptions.add(
			atom.commands.add('atom-workspace', {
				'arrow-to-return:transform': this.transform.bind(this)
			})
		)
	},

	transform() {
		const editor = atom.workspace.getActiveTextEditor()
		const cursor = editor.getCursorBufferPosition()
		const buffer = editor.getBuffer()
		const data = buffer.getText()
		let ast

		try {
			ast = parse(data, {
				sourceType: 'module',
				plugins: [
					'objectRestSpread',
					'asyncGenerators',
					'jsx',
					'classProperties',
					'exportExtensions'
				]
			})
		} catch (e) {
			console.info('Error during parsing probably caused by a not valid syntax tree: ', e)
			return
		}

		let range
		const callback = (loc) => {
			if (!loc) {
				range = null
				return false
			}

			range = toAtomRange(loc)
			const line = cursor.row + 1
			const column = cursor.column

			if (loc.start.line < line && loc.end.line > line) {
				return true
			}

			if (loc.start.line === line && loc.start.column <= column) {
				return true
			}

			if (loc.end.line === line && loc.end.column >= column) {
				return true
			}

			range = null
			return false
		}
		const template = toArrow(ast, buffer, callback, {
			semicolons: this.semicolons
		})

		if (range) {
			const checkpoint = editor.createCheckpoint()
			editor.setTextInBufferRange(range, template)
			const rows = template.split('\n')
			const start = range[0]
			const firstRow = start[0]
			const lastRow = start[0] + rows.length
			editor.autoIndentBufferRows(firstRow, lastRow)
			for (let row = firstRow; row < lastRow; row += 1) {
				if (buffer.isRowBlank(row)) {
					editor.setSelectedBufferRange([[row, 0], [row, buffer.lineLengthForRow(row)]])
					editor.delete()
				}
			}

			editor.groupChangesSinceCheckpoint(checkpoint)
		}
	},

	deactivate() {
		this.subscriptions.dispose()
	}
}
