'use babel';

import traverse from 'babel-traverse';

export const toAtomRange = ({ start, end }) => [
	[start.line - 1, start.column],
	[end.line - 1, end.column]
];

const toArrowVisitor = (
	append,
	buffer,
	callback,
	{ semicolons }) => {
	let found = false;
	return {
		ArrowFunctionExpression(path) {
			if (found) {
				return;
			}

			if (!callback(path.node.loc)) {
				return;
			}

			found = true;

			const body = path.node.body;
			callback(body.loc);

			const semicolon = semicolons ? ';' : '';

			if (body.type === 'BlockStatement') {
				if (body.body.length > 1 || body.directives.length > 0) {
					callback(null);
					return;
				}
				const firstLine = body.body[0];

				if (firstLine.type === 'ReturnStatement') {
					const bodySource = buffer.getTextInRange(toAtomRange(firstLine.argument.loc));
					append(`${bodySource}`);
				} else {
					const bodySource = buffer.getTextInRange(toAtomRange(firstLine.loc));
					append(`${bodySource}`);
				}
			} else {
				const bodySource = buffer.getTextInRange(toAtomRange(body.loc));
				append('{');
				append(`\nreturn ${bodySource}${semicolon}`);
				append('\n}');
			}
		}
	};
};

export const toArrow = (
	ast,
	buffer,
	callback,
	options = {}) => {
	let template = '';
	const append = (str) => { template += str; };
	traverse(ast, toArrowVisitor(
		append,
		buffer,
		callback,
		options
	));

	return template;
};
