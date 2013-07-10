define('common/template/forgot',function(require,exports,module){
    module.exports = '<form class="form-inline bd">\
                        <p>\
                        <label>\
                            <input type="text" class="input-xlarge" value="" placeholder="请输入原来的邮箱"> \
                        </label>\
                        </p>\
                        <p><small>我们会把您的新密码发送到您注册的邮箱</small></p>\
                        <p>\
                            <a class="btn btn-primary" href="#/login">登陆</a>\
                            <a class="btn btn-success" href="#/try">试用</a>\
                            <a class="btn" href="#/reg">注册</a>\
                        </p>\
                    </form>';
});
