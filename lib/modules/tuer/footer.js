define('modules/tuer/footer', function(require, exports, module) {
	var forgotTemplate = require('common/template/forgot');
	module.exports = function(sandbox) {
		var $ = sandbox.sjsapp.core.$;
		var path = sandbox.path;
		var clean = require('common/clean');
		return {
			init: function(opts) {
				path.map('#/forgot').to(this.forgot).enter(clean.main);
			},
			forgot: function() {
				var html = forgotTemplate;
				$('[data-module=main]').html(html);
			},
			afterLoaded: function() {
				path.listen();
			}
		};
	};
});

