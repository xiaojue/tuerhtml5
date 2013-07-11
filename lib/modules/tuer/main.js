define('modules/tuer/main', function(require, exports, module) {
	var clean = require('common/clean');
	var loginTemplate = require('common/template/login');
	var notFoundTemplate = require('common/template/notfound');
	var mainTemplate = require('common/template/main');

	module.exports = function(sandbox) {
		var core = sandbox.sjsapp.core,
		path = sandbox.path,
		store = sandbox.store,
		el, $ = core.$;

		var appkey = '4214a2d24465e6daf7b8ba59a4beca6b',
		callback_url = encodeURIComponent('http://html5.tuer.me/#/auth/callback/'),
		sercet = 'd38a57cdabe31a247199142abcbaf470';

		var error = function(xhr) {
			var error = xhr.responseText;
			var html = sandbox.template(notFoundTemplate);
			$(el).html(html({
				msg: error
			}));
            store.remove('userinfo');
		};

		return {
			init: function(opts) {
				el = $(opts.el);
				path.map('#/').to(this.login).enter(clean.main);
				path.map('#/auth/callback/?error=access_denied').to(this.denied).enter(clean.main);
				path.map('#/auth/callback/:code').to(this.success).enter(clean.main);
			},
			success: function() {
				var params = this.params['code'].slice(1).split('=');
				var code = params[1];
				$.ajax({
					url: 'http://www.tuer.me/oauth/access_token',
					type: 'POST',
					dataType: 'json',
					success: function(data) {
						var access_token = data.access_token,
						tuer_uid = data.tuer_uid;
						$.ajax({
							url: 'http://api.tuer.me/user/info/' + tuer_uid + '?access_token=' + access_token,
							type: 'GET',
							dataType: 'json',
							success: function(data) {
								$.extend(data, {
									token: access_token
								});
								store.set('userinfo', data);
								var html = sandbox.template(mainTemplate);
								$(el).html(html(data));
                                window.location.href = '/#/';
							},
							error: error
						});
					},
					error: error,
					data: {
						client_id: appkey,
						client_secret: sercet,
						redirect_url: callback_url,
						grant_type: 'authorization_code',
						code: code
					}
				});
			},
			denied: function() {
				var html = sandbox.template(notFoundTemplate);
				$(el).html(html({
					msg: 'denied page!'
				}));
			},
			login: function() {
				var userinfo = store.get('userinfo');
				var html;
				if (!userinfo) {
					html = sandbox.template(loginTemplate);
					$(el).html(html({
						appkey: appkey,
						callback_url: callback_url
					}));
				} else {
					html = sandbox.template(mainTemplate);
					$(el).html(html(userinfo));
				}
			},
			notFound: function() {
				clean.main();
				var html = sandbox.template(notFoundTemplate);
				$(el).html(html({
					msg: '404 page!'
				}));
			},
			afterLoaded: function() {
				path.root('#/');
				path.rescue(this.notFound);
				path.listen();
			}
		};
	};
});

