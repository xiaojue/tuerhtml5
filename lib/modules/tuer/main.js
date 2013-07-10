define('modules/tuer/main', function(require, exports, module) {
	var clean = require('common/clean');
	var loginTemplate = require('common/template/login');
	var regTemplate = require('common/template/reg');
    var notFoundTemplate = require('common/template/notfound');
	module.exports = function(sandbox) {
		var core = sandbox.sjsapp.core,
		path = sandbox.path,
		el, $ = core.$;
		return {
			init: function(opts) {
				el = $(opts.el);
				path.map('#/login').to(this.login).enter(clean.main);
				path.map('#/reg').to(this.reg).enter(clean.main);
			},
			login: function() {
				var html = loginTemplate;
				$(el).html(html);
			},
			reg: function() {
				var html = regTemplate;
				$(el).html(html);
			},
            notFound:function(){
                clean.main();
                var html = notFoundTemplate;
                $(el).html(html);
            },
			afterLoaded: function() {
				path.root('#/login');
                path.rescue(this.notFound);
				path.listen();
			}
		};
	};
});

