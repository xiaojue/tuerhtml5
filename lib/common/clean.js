define('common/clean', function(require, exports,module) {
	var $ = sjs;
	function clearEvent(parent) {
		var nodes;
		if (parent) {
			parent.unbind();
			parent.undelegate();
            nodes = $(parent).find('*');
            for(var i=0;i<nodes.length;i++){
                $(nodes[i]).unbind();
                $(nodes[i]).undelegate();
            }
		}

	}
	module.exports = {
		main: function() {
			var el = $('[data-module=main]');
			clearEvent(el);
            el.html('');
		}
	};
});

