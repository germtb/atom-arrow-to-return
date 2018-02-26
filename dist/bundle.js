'use strict';

var atom$1 = require('atom');

function parse(text) {
	var babylon = require('babylon');

	return babylon.parse(text, {
		sourceType: 'module',
		plugins: ['objectRestSpread', 'asyncGenerators', 'jsx', 'classProperties', 'exportExtensions']
	});
}

var toAtomRange = function toAtomRange(_ref) {
	var start = _ref.start,
	    end = _ref.end;
	return [[start.line - 1, start.column], [end.line - 1, end.column]];
};

var toArrowVisitor = function toArrowVisitor(append, buffer, callback, _ref2) {
	var semicolons = _ref2.semicolons;

	var found = false;
	return {
		ArrowFunctionExpression: function ArrowFunctionExpression(path) {
			if (found) {
				return;
			}

			if (!callback(path.node.loc)) {
				return;
			}

			found = true;

			var body = path.node.body;
			callback(body.loc);

			var semicolon = semicolons ? ';' : '';

			if (body.type === 'BlockStatement') {
				if (body.body.length > 1 || body.directives.length > 0) {
					callback(null);
					return;
				}
				var firstLine = body.body[0];

				if (firstLine.type === 'ReturnStatement') {
					var bodySource = buffer.getTextInRange(toAtomRange(firstLine.argument.loc));
					append('' + bodySource);
				} else {
					var _bodySource = buffer.getTextInRange(toAtomRange(firstLine.loc));
					append('' + _bodySource);
				}
			} else {
				var _bodySource2 = buffer.getTextInRange(toAtomRange(body.loc));
				append('{');
				append('\nreturn ' + _bodySource2 + semicolon);
				append('\n}');
			}
		}
	};
};

var toArrow = function toArrow(ast, buffer, callback) {
	var options = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};

	var template = '';
	var append = function append(str) {
		template += str;
	};

	var traverse = require('@babel/traverse').default;

	traverse(ast, toArrowVisitor(append, buffer, callback, options));

	return template;
};

var config = {
	semicolons: {
		title: 'semicolons',
		description: 'should append semicolons to end of lines',
		type: 'boolean',
		default: true
	}
};

module.exports = {
	config: config,
	subscriptions: null,
	semicolons: config.semicolons.default,

	activate: function activate() {
		var _this = this;

		atom.config.observe('arrow-to-return.semicolons', function (value) {
			_this.semicolons = value;
		});
		this.subscriptions = new atom$1.CompositeDisposable();
		this.subscriptions.add(atom.commands.add('atom-workspace', {
			'arrow-to-return:transform': this.transform.bind(this)
		}));
	},
	transform: function transform() {
		var editor = atom.workspace.getActiveTextEditor();
		var cursor = editor.getCursorBufferPosition();
		var buffer = editor.getBuffer();
		var data = buffer.getText();
		var ast = void 0;

		try {
			ast = parse(data, {
				sourceType: 'module',
				plugins: ['objectRestSpread', 'asyncGenerators', 'jsx', 'classProperties', 'exportExtensions']
			});
		} catch (e) {
			console.info('Error during parsing probably caused by a not valid syntax tree: ', e);
			return;
		}

		var range = void 0;
		var callback = function callback(loc) {
			if (!loc) {
				range = null;
				return false;
			}

			range = toAtomRange(loc);
			var line = cursor.row + 1;
			var column = cursor.column;

			if (loc.start.line < line && loc.end.line > line) {
				return true;
			}

			if (loc.start.line === line && loc.start.column <= column) {
				return true;
			}

			if (loc.end.line === line && loc.end.column >= column) {
				return true;
			}

			range = null;
			return false;
		};
		var template = toArrow(ast, buffer, callback, {
			semicolons: this.semicolons
		});

		if (range) {
			var checkpoint = editor.createCheckpoint();
			editor.setTextInBufferRange(range, template);
			var rows = template.split('\n');
			var start = range[0];
			var firstRow = start[0];
			var lastRow = start[0] + rows.length;
			editor.autoIndentBufferRows(firstRow, lastRow);
			for (var row = firstRow; row < lastRow; row += 1) {
				if (buffer.isRowBlank(row)) {
					editor.setSelectedBufferRange([[row, 0], [row, buffer.lineLengthForRow(row)]]);
					editor.delete();
				}
			}

			editor.groupChangesSinceCheckpoint(checkpoint);
		}
	},
	deactivate: function deactivate() {
		this.subscriptions.dispose();
	}
};
