'use strict';
var fs = require('fs');
var path = require('path');
var childProcess = require('child_process');
var argv = require('the-argv');
var readPkgUp = require('read-pkg-up');
var writePkg = require('write-pkg');
var Promise = require('pinkie-promise');
var pify = require('pify');
var arrExclude = require('arr-exclude');
var DEFAULT_TEST_SCRIPT = 'echo "Error: no test specified" && exit 1';

module.exports = function (opts) {
	opts = opts || {};

	var ret = readPkgUp.sync({
		cwd: opts.cwd,
		normalize: false
	});
	var pkg = ret.pkg;
	var pkgPath = ret.path;
	var cli = opts.args || argv();
	var args = arrExclude(cli, ['--init', '--unicorn']);
	var cmd = 'ava' + (args.length > 0 ? ' ' + args.join(' ') : '');
	var s = pkg.scripts = pkg.scripts ? pkg.scripts : {};

	if (s.test && s.test !== DEFAULT_TEST_SCRIPT) {
		s.test = s.test.replace(/\bnode (test\/)?test\.js\b/, cmd);

		if (!/\bava\b/.test(s.test)) {
			s.test += ' && ' + cmd;
		}
	} else {
		s.test = cmd;
	}

	writePkg.sync(pkgPath, pkg);

	return pify(childProcess.execFile, Promise)('npm', ['install', '--save-dev', 'ava'], {
		cwd: path.dirname(pkgPath)
	}).then(function () {
		// for personal use
		if (cli.indexOf('--unicorn') !== -1) {
			var pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
			pkg.devDependencies.ava = '*';
			writePkg.sync(pkgPath, pkg);
		}
	});
};