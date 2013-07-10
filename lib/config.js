define('config',function(require,exports,module){

    var alias = function(widgets){
        var ret = {};
        for(var i=0;i<widgets.length;i++){
            var widget = widgets[i];
            ret[widget] = 'ui/'+widget+'/dest/'+widget+'.js';
        }
        ret['switchable'] = 'ui/switchable/dest/';
        return ret;
    }([
        'position',
        'popup',
        'dialog',
        'atip',
        'tip',
        'iframe-shim',
        'mask',
        'overlay',
        'carousel',
        'easing',
        'placeholder',
        'accordion'
    ]);

    module.exports = {
        alias:alias
    };

});
