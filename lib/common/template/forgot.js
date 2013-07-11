define('common/template/forgot',function(require,exports,module){
    module.exports = '<form class="form-inline bd">\
                        <p>\
                        <label>\
                            <input type="text" class="input-xlarge" value="" placeholder="请输入原来的邮箱"> \
                        </label>\
                        </p>\
                        <p><small>我们会把您的新密码发送到您注册的邮箱</small></p>\
                        <p>\
                            <a class="btn btn-primary" href="http://www.tuer.me/oauth/authorize?client_id={{=it.appkey}}&redirect_uri={{=it.callback_url}}">登陆授权</a>\
                            <a class="btn btn-success" href="#/try">试用</a>\
                        </p>\
                    </form>';
});
