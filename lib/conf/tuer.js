define('conf/tuer',function(require,exports,module){
    var sjsapp = require('sjsapp');
    var tuer = new sjsapp({
        pageName:'tuer',
        beforeLoad:function(sandbox){
            var store = sandbox.store;
            if(store.enabled){
                return true;
            }else{
                alert('您的浏览器不支持store');
                return false;
            }
        },
        extensions:['store','path']
    });
    tuer.startAll();
});
