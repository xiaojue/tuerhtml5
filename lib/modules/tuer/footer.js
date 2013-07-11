define('modules/tuer/footer', function(require, exports, module) {
	var forgotTemplate = require('common/template/forgot');
	module.exports = function(sandbox) {
		var $ = sandbox.sjsapp.core.$;
		var path = sandbox.path;
		var clean = require('common/clean');
        var appkey = '4214a2d24465e6daf7b8ba59a4beca6b',
        callback_url = encodeURIComponent('http://html5.tuer.me/#/auth/callback/'),
        sercet = 'd38a57cdabe31a247199142abcbaf470';
		return {
			init: function(opts) {
				path.map('#/forgot').to(this.forgot).enter(clean.main);
			},
			forgot: function() {
				var html = sandbox.template(forgotTemplate);
				$('[data-module=main]').html(html({appkey:appkey,callback_url:callback_url}));
			},
			afterLoaded: function() {
				path.listen();
			}
		};
	};
});

