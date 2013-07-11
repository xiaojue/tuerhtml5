define('common/template/login',function(require,exports,module){
    module.exports = '<form class="form-inline bd">\
                        <p>试用所写日记只会保留在本地</p>\
                        <p>\
                            <a class="btn btn-primary" href="http://www.tuer.me/oauth/authorize?client_id={{=it.appkey}}&redirect_uri={{=it.callback_url}}">登陆授权</a>\
                            <a class="btn btn-success" href="#/try">试用</a>\
                        </p>\
                    </form>';
});
