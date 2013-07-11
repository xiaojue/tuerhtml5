define('common/template/main',function(require,exports,module){
    module.exports = '<div class="bd">\
                        <p>授权成功！</p>\
                        <ul>\
                            <li><img src="http://www.tuer.me/user/art/{{=it.pageurl}}" alt="{{=it.nick}}"></li>\
                            <li>{{=it.nick}}</li>\
                            <li>{{=it.created_at}}</li>\
                            <li>{{=it.profile}}</li>\
                        </ul>\
                     </div>';
});
