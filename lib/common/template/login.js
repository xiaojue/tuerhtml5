define('common/template/login',function(require,exports,module){
    module.exports = '<form class="form-inline bd">\
                        <p>\
                        <label>\
                            <input type="text" class="input-xlarge" value="" placeholder="请输入用户名"> \
                        </label>\
                        </p>\
                        <p>\
                        <label>\
                            <input type="text" class="input-xlarge" value="" placeholder="请输入密码"> \
                        </label>\
                        </p>\
                        <p>\
                            <a class="btn btn-primary" href="#/login">登陆</a>\
                            <a class="btn btn-success" href="#/try">试用</a>\
                            <a class="btn" href="#/reg">注册</a>\
                        </p>\
                    </form>';
});
