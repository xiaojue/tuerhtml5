/**
 * @file sjs JavaScript library v0.1.0 2013-6-25
 * @Copyright 2013 sina.com.cn
 * @author changchuan@staff.sina.com.cn | yihui1@staff.sina.com.cn
 * @version v0.1.0
 */
(function(window,undefined){
	var alert = window.alert;
	var console = window.console;
/*
* @file sina JavaScript核心模块
* @author yihui1@staff.sina.com.cn
*/
/**
 * @module core
 * @main core
**/
/**
sjs核心入口，返回一个可以通过DOM作为参数获取或通过HTML字符串创建的匹配元素列表

当css选择器字符串作为参数的时候

	$('div.foo')

在上下文范围内查找元素

	$('div.foo',document);

创建一个新的元素
	
	$('<p id="test">it is a test.</p>').appendTo('body');

绑定一个function在dom ready后执行

	$(function(){
		//your codes here.
	})
	
@class sjs
@constructor
@global
@param {html|object|element|function|array} selector css选择器或DOM元素或HTML代码
@param {object|element} context 上下文
@return {object} 返回一个sjs的实例
*/

//rootsjs为sjs的核心引用
var rootsjs,
//DOM ready事件执行列表
readyList, _sjs = window.sjs,
_$ = window.$,
//[[class]] -> type pairs
class2type = {},
//被删除的数据缓存列表
core_deletedIds = [],
core_version = '0.1.0',

core_concat = core_deletedIds.concat,
core_push = core_deletedIds.push,
core_slice = core_deletedIds.slice,
core_indexOf = core_deletedIds.indexOf,
core_toString = class2type.toString,
core_hasOwn = class2type.hasOwnProperty,
core_trim = core_version.trim,

core_rnotwhite = /\S+/g,
//一个简单检查HTML字符串的方法
rquickExpr = /^(?:(<[\w\W]+>)[^>]*|#([\w-]*))$/,
rsingleTag = /^<(\w+)\s*\/?>(?:<\/\1>|)$/,

//JSON expr
rvalidchars = /^[\],:{}\s]*$/,
rvalidbraces = /(?:^|:|,)(?:\s*\[)+/g,
rvalidescape = /\\(?:["\\\/bfnrt]|u[\da-fA-F]{4})/g,
rvalidtokens = /"[^"\\\r\n]*"|true|false|null|-?(?:\d+\.|)\d+(?:[eE][+-]?\d+|)/g;

var isArraylike = function(obj) {
	var length = obj.length,
	type = sjs.type(obj);

	if (sjs.isWindow(obj) || type === 'string') {
		return false;
	}

	if (obj.nodeType === 1 && length) {
		return true;
	}
	//用对象表示数组的情况和nodelist的情况
	//{length:3,'0':0,'1':1,'2':2}
	return type === 'array' || type !== 'function' && (length === 0 || typeof length === 'number' && length > 0 && (length - 1) in obj);
};

var detach = function() {
	if (document.addEventListener) {
		document.removeEventListener("DOMContentLoaded", completed, false);
		window.removeEventListener("load", completed, false);
	} else {
		document.detachEvent("onreadystatechange", completed);
		window.detachEvent("onload", completed);
	}
};

var completed = function(event) {
	if (document.addEventListener || event.type === 'load' || document.readState === 'complete') {
		detach();
		sjs.ready();
	}
};

var sjs = function(selector, context) {
	return new sjs.fn.init(selector, context, rootsjs);
};

sjs.fn = sjs.prototype = {
	_sjs: core_version,
	constructor: sjs,
	/*
	* init方法是sjs的入口，生成selector实例的构造函数。
	* @description 使用方法：
		- sjs()
		- sjs(selector [,context])
		- sjs(element)
		- sjs(elementArray)
		- sjs(object)
		- sjs(sjs object)
		- sjs(html [,ownerDocument])
		- sjs(callback)
	* @param {object|string|function} selector 选择器字符串或DOM元素
	* @param {object} context 上下文
	* @param {object} rootsjs sjs的引用，init方法中需调用sjs的一些方法
	*/
	init: function(selector, context, rootsjs) {
		var match, elem;

		//$(''),$(null),$(undefined),$(false)
		if (!selector) {
			return this;
		}

		if (typeof selector === 'string') {
			if (selector.charAt(0) === '<' && selector.charAt(selector.length - 1) === '>' && selector.length > 3) {
				//如果string开头和结尾是<>的话就跳过regex检查
				match = [null, selector, null];
			} else {
				match = rquickExpr.exec(selector);
			}

			//匹配html或确定#id没有明确的上下文
			if (match && (match[1] || ! context)) {
				if (match[1]) {
					context = context instanceof sjs ? context[0] : context;
					/**
					sjs.merge(this,sjs.parseHTML(
						match[1],
						context && context.nodeType ? context.ownerDocument || context : document
					));
					return this;
**/
					var doc = context && context.nodeType ? context.ownerDocument || context: document;
					// scripts is true for back-compat
					selector = sjs.parseHTML(match[1], doc, true);
					if (rsingleTag.test(match[1]) && sjs.isPlainObject(context)) {
						this.attr.call(selector, context, true);
					}

					return sjs.merge(this, selector);

					/**
					//注意这里不提供$(html,prop)这样的调用方式
					if ( rsingleTag.test( match[1] ) && sjs.isPlainObject( context ) ) {
						this.attr.call( selector, context, true );
					}
					return sjs.merge( this, selector );					
					**/

				} else {
					//#id的情况
					elem = document.getElementById(match[2]);
					//检查parentNode是由于在blackberry 4.6返回的node不是document
					if (elem && elem.parentNode) {
						//处理IE和Opera用name代替id返回items的情况
						if (elem.id !== match[2]) {
							return rootsjs.find(selector);
						}

						//我们把得到的元素插入到sjs object中去
						this.length = 1;
						this[0] = elem;
					}

					this.context = document;
					this.selector = selector;

					return this;
				}
			} else if (!context || context.sjs) {
				//处理$(expr,$(...))的情况
				return (context || rootsjs).find(selector);
			} else {
				//处理$(expr,context)的情况
				//等同于$(context).find(expr);
				return this.constructor(context).find(selector);
			}
		} else if (selector.nodeType) {
			this.context = this[0] = selector;
			this.length = 1;
			return this;
		} else if (sjs.isFunction(selector)) {
			return rootsjs.ready(selector);
		}

		if (selector.selector !== undefined) {
			this.selector = selector.selector;
			this.context = selector.context;
		}

		return sjs.makeArray(selector, this);
	},
	//初始化一个空的selector
	selector: '',
	//初始化sjs对象长度为0
	length: 0,
	/*
	* 匹配到元素的数量
	* @return {number} 元素的数量
	*/
	size: function() {
		return this.length;
	},
	toArray: function() {
		return core_slice.call(this);
	},
	/*
	* 从匹配到的元素中获取指定位置的元素或所有元素
	* @param {number} num 要获取元素的位置
	* @return {object} 匹配到的元素
	*/
	get: function(num) {
		if (num == null) {
			return this.toArray();
		} else {
			return (num < 0 ? this[this.length + num] : this[num]);
		}
	},
	/*
	* 把一个元素列表放到stack中去
	* @param {object} elems 元素列表
	* @return {array} 返回新匹配的元素集合
	*/
	pushStack: function(elems) {
		//创建一个有新元素的sjs集合
		var ret = sjs.merge(this.constructor(), elems);

		//添加原来的对象到stack中
		ret.prevObject = this;
		ret.context = this.context;

		//返回新格式的元素集合
		return ret;
	},
	/*
	* 遍历集合并执行一个回调
	* @param {function} callback 回调
	* @args {object} args 参数(只内部使用)
	*/
	each: function(callback, args) {
		return sjs.each(this, callback, args);
	},
	ready: function(fn) {
		sjs.ready.promise().done(fn);
		return this;
	},
	slice: function() {
		return this.pushStack(core_slice.apply(this, arguments));
	},
	/**
	获取当前sjs对象中的第一个元素
	@method first
	@return sjs对象
	@example
		<html>
		<head>
		<style>.highlight{background-color: yellow}</style>
		<script src="sjs.js"></script>
		</head>
		<body>
			<p><span>Look:</span> <span>This is some text in a paragraph.</span> <span>This is a note about it.</span></p>
			<script>$("p span").first().addClass('highlight');</script>
		</body>
		</html>
	*/
	first: function() {
		return this.eq(0);
	},
	/**
	获取当前sjs对象中的最后一个元素
	@method last
	@return sjs对象
	@example
		<html>
		<head>
		<style>.highlight{background-color: yellow}</style>
		<script src="sjs.js"></script>
		</head>
		<body>
			<p><span>Look:</span> <span>This is some text in a paragraph.</span> <span>This is a note about it.</span></p>
			<script>$("p span").last().addClass('highlight');</script>
		</body>
		</html>
	*/
	last: function() {
		return this.eq( - 1);
	},
	/**
	* 获取对应索引的匹配元素对象
	* @param {number} i 索引
	* @return {object} 新的匹配元素对象
	@example
		<html>
		<head>
		<style>
			div { width:60px; height:60px; margin:10px; float:left;
			border:2px solid blue; }
			.blue { background:blue; }
		</style>
		<script src="sjs.js"></script>
		</head>
		<body>
			<div></div>
			<div></div>
			<div></div>
			
			<div></div>
			<div></div>
			<div></div>
			<script>$("body").find("div").eq(2).addClass("blue");</script>
		</body>
		</html>
	*/
	eq: function(i) {
		var len = this.length;
		var j = + i + (i < 0 ? len: 0);

		return this.pushStack(j >= 0 && j < len ? [this[j]] : []);
	},
	/**
	获取以回调返回值为元素的sjs对象
	@param {function} callback 回调
	@return {object} 新的sjs对象
	@example
		<html>
		<head>
		<style>
			p { color:red; }
		</style>
		<script src="sjs.js"></script>
		</head>
		<body>
			<p><b>Values: </b></p>
			<form>
				<input type="text" name="name" value="John"/>
				<input type="text" name="password" value="password"/>
				<input type="text" name="url" value="http://ejohn.org/"/>
			</form>
		<script>
			$("p").append( $("input").map(function(){
				return $(this).val();
			}).get().join(", ") );
		</script>
		</body>
		</html>
	*/
	map: function(callback) {
		return this.pushStack(sjs.map(this, function(elem, i) {
			return callback.call(elem, i, elem);
		}));
	},
	/**
	获取当前sjs对象中的父级sjs对象
	@return {object} 父级sjs对象
	@example
		<html>
		<head>
		<style>p { margin:10px; padding:10px; }</style>
		<script src="sjs.js"></script>
		</head>
		<body>
			<p><span>Hello</span>, how are you?</p>
			<script>$("p").find("span").end().css("border", "2px red solid");</script>
		</body>
		</html>
	*/
	end: function() {
		return this.prevObject || this.constructor(null);
	},
	push: core_push,
	sort: [].sort,
	splice: [].splice
};

sjs.fn.init.prototype = sjs.fn;

/**
 * 继承方法，所有sjs以及sjs.fn扩展都基于该方法实现
 * @method extends
 * @static
 * @param {boolean|object} arg1 第一个参数为boolean时表示是否进行深度复制
 * @param {object} arg2 新添加的扩展对象
 * @return {object} 返回已经添加扩展的新对象
	@example
		var obj1 = {
			apple:0,
			banana:{weight:54,price:12},
			cherry:99
		};
		var obj2 = {
			banana:{price:20},
			durian:100
		}
		$.extend(true,obj1,obj2);

		console.log(JSON.stringify(obj1));
*/
sjs.extend = sjs.fn.extend = function() {
	var options, name, src, copy, copyIsArray, clone, target = arguments[0] || {},
	i = 1,
	len = arguments.length,
	deep = false;

	//处理深度拷贝
	if (typeof target === 'boolean') {
		deep = target;
		target = arguments[1] || {};
		//跳过前两个参数
		i = 2;
	}

	//当target是string或其他时
	if (typeof target !== 'object' && ! sjs.isFunction(target)) {
		target = {};
	}

	//当只有1个参数时继承sjs本身
	if (i === len) {
		target = this;
		i--;
	}

	for (; i < len; i++) {
		//只处理值不为null和undefined的值
		if ((options = arguments[i]) != null) {
			//继承基类
			for (name in options) {
				src = target[name]; //基类属性
				copy = options[name]; //子类属性
				//防止死循环
				if (target === copy) {
					continue;
				}

				//深度复制array类型和object类型
				if (deep && copy && (sjs.isPlainObject(copy) || (copyIsArray = sjs.isArray(copy)))) {
					//如果是array类型
					if (copyIsArray) {
						copyIsArray = false;
						clone = src && sjs.isArray(src) ? src: [];
					} else {
						clone = src && sjs.isPlainObject(src) ? src: {};
					}
					target[name] = sjs.extend(deep, clone, copy);
				} else if (copy !== undefined) {
					target[name] = copy;
				}
			}
		}
	}
	return target;
};

sjs.extend({
	//页面上每个sjs copy的唯一id
	expando: 'sjs' + (core_version + Math.random()).replace(/\D/g, ''),
	/**
 * 防止版本冲突，不再添加到变量$上
 * @method noConflict
 * @static
 * @param {boolean} deep 是否从全局作用域删除所有的sjs变量
 * @returns {object} sjs
 * @example
       $.noConflict();
*/
	noConflict: function(deep) {
		if (window.$ === sjs) {
			window.$ = _$;
		}

		if (deep && window.sjs === sjs) {
			window.sjs = _sjs;
		}

		return sjs;
	},
	//DOM是否准备好？可用后置为true
	isReady: false,
	//记录在ready事件触发之前等待元素的数量
	readyWait: 1,
	/*
	* 等待（或触发）ready事件
	* @param {boolean} hold 是否等待
	*/
	holdReady: function(hold) {
		if (hold) {
			sjs.readWait++;
		} else {
			sjs.ready(true);
		}
	},
	/*
	* 触发ready事件
	* @param {boolean} wait 判断是否还是等待状态
	*/
	ready: function(wait) {
		//当阻止或已经触发ready事件
		if (wait === true ? --sjs.readyWait: sjs.isReady) {
			return;
		}

		sjs.isReady = true;

		//当一个ready事件触发，--readyWait并继续等待
		if (wait !== true && --sjs.readyWait > 0) {
			return;
		}

		//执行绑定的方法
		readyList.resolveWith(document, [sjs]);

		//触发所有的绑定事件
		if (sjs.fn.trigger) {
			sjs(document).trigger('ready').off('ready');
		}
	},
	/** 
	* 判断对象是否为function
	*
	* @method isFunction
	* @param {object} obj 要判断的对象
	* @return {boolean} 该对象是否为function
	@example
		$.isFunction(function(){});//true
	*/
	isFunction: function(obj) {
		return sjs.type(obj) === 'function';
	},
	/**
	* 判断对象是否为array
	*
	* @method isArray
	* @param {object} obj 要判断的对象
	* @return {boolean} 是否是一个数组
	@example
		$.isArray([])//true
	*/
	isArray: (Array.isArray) ? Array.isArray: function(arr) {
		return sjs.type(arr) === 'array';
	},
	/**
	* 判断对象是否为window
	*
	* @method isWindow
	* @param {object} obj 要判断的对象
	* @return {boolean} 该对象是否为window
	@example
		$.isWindow(window);//true
	*/
	isWindow: function(obj) {
		return obj != null && obj == obj.window;
	},
	/**
	* 判断对象是否为Number
	*
	* @method isNumeric
	* @param {object} obj 要判断的对象
	* @return {boolean} 该对象是否为number
	@example
		$.isNumeric(1);//true
	*/
	isNumeric: function(obj) {
		return ! isNaN(parseFloat(obj)) && isFinite(obj);
	},
	/** 
	* 判断对象类型
	*
	* @method type
	* @param {object} obj 要判断的对象
	* @return {string} 对象类型的字符串
	@example
		sjs.type(/test/);//regexp
	*/
	type: function(obj) {
		if (obj === null) {
			return String(obj);
		}
		if (typeof obj === 'object' || typeof obj === 'function') {
			return class2type[core_toString.call(obj)] || 'object';
		} else {
			return typeof obj;
		}
	},
	/**
	* 遍历方法，能够遍历数组和对象，通过索引可以遍历数组和对象模拟数组类型，其他对象类型通过name属性进行遍历
	*
	* @method each
	* @param {object} obj 要遍历的对象
	* @param {function} callback 回调方法
	@example
		$.each( ['a','b','c'], function(i, l){
			alert( "Index #" + i + ": " + l );
		});
		$.each( { name: "John", lang: "JS" }, function(k, v){
			alert( "Key: " + k + ", Value: " + v );
		});
	*/
	each: function(obj, callback, args) {
		var value, i = 0,
		len = obj.length,
		isArray = isArraylike(obj);

		if (args) {
			if (isArray) {
				for (; i < len; i++) {
					value = callback.apply(obj[i], args);

					if (value === false) {
						break;
					}
				}
			} else {
				for (i in obj) {
					value = callback.apply(obj[i], args);

					if (value === false) {
						break;
					}
				}
			}
		} else {
			if (isArray) {
				for (; i < len; i++) {
					value = callback.call(obj[i], i, obj[i]);

					if (value === false) {
						break;
					}
				}
			} else {
				for (i in obj) {
					value = callback.call(obj[i], i, obj[i]);

					if (value === false) {
						break;
					}
				}
			}
		}
		return obj;
	},
	/**
	* 判断是否为一个原始的object

		不是原始object的类型：
			- 任何内部[[class]]属性不是[object object]类型的对象或值
			- DOM节点
			- window
	
	* @method isPlainObject
	* @param {object} obj 要判断的对象
	* @return {boolean} 该对象是否为原始对象
	@example
		sjs.isPlainObject({}) // true
		sjs.isPlainObject("test") // false
	*/
	isPlainObject: function(obj) {
		if (sjs.type(obj) !== 'object' || obj.nodeType || sjs.isWindow(obj)) {
			return false;
		}

		// 支持：Firefox > 16
		// try/catch会捕获试图访问权限的异常
		// 处理某些宿主对象的constructor属性,例如：window.location
		try {
			if (obj.constructor && ! core_hasOwn.call(obj.constructor.prototype, 'isPrototypeOf')) {
				return false;
			}
		} catch(e) {
			return false;
		}

		return true;
	},
	/**
	* 判断对象是否为空对象
	*
	* @method isEmptyObject
	* @param {object} obj 要判断的对象
	* @return {boolean} 该对象是否为空
	@example
		sjs.isEmptyObject({}) // true
		sjs.isEmptyObject({ foo: "bar" }) // false
	*/
	isEmptyObject: function(obj) {
		var name;
		for (name in obj) {
			return false;
		}
		return true;
	},
	isString: function(val) {
		return core_toString.call(val) === '[object String]';
	},
	isEqual: function(a, b, aStack, bStack) {
		aStack = aStack || [];
		bStack = bStack || [];

		if (a === b) {
			return a !== 0 || 1 / a === 1 / b;
		}
		if (a == null || b == null) {
			return a === b;
		}
		var className = core_toString.call(a);
		if (className != core_toString.call(b)) {
			return false;
		}
		switch (className) {
		case '[object string]':
			return a == String(b);
		case '[object Number]':
			return a != + a ? b != + b: (a === 0 ? 1 / a === 1 / b: a == + b);
		case '[object Date]':
		case '[object Boolean]':
			return + a == + b;
		case '[object RegExp]':
			return a.source == b.source && a.global == b.global && a.multiline == b.multiline && a.ignoreCase == b.ignoreCase;
		}
		if (typeof a != 'object' || typeof b != 'object') {
			return false;
		}
		var length = aStack.length;
		while (length--) {
			if (aStack[length] == a) {
				return bStack[length] == b;
			}
		}
		aStack.push(a);
		bStack.push(b);
		var size = 0,
		result = true;
		if (className == '[object Array]') {
			size = a.length;
			result = size == b.length;
			if (result) {
				while (size--) {
					if (! (result = sjs.isEqual(a[size], b[size], aStack, bStack))) {
						break;
					}
				}
			}
		} else {
			var aCtor = a.constructor,
			bCtor = b.constructor;
			if (aCtor !== bCtor && ! (sjs.isFunction(aCtor) && (aCtor instanceof aCtor) && sjs.isFunction(bCtor) && (bCtor instanceof bCtor))) {
				return false;
			}
			for (var key in a) {
				if (core_hasOwn.call(a, key)) {
					size++;
					if (! (result = core_hasOwn.call(b, key) && sjs.isEqual(a[key], b[key], aStack, bStack))) {
						break;
					}
				}
			}
			if (result) {
				for (key in b) {
					if (core_hasOwn.call(b, key) && ! (size--)) {
						break;
					}
				}
				result = ! size;
			}
		}
		aStack.pop();
		bStack.pop();
		return result;
	},
	/*
	* 抛出异常
	* @param {string} msg 抛出的异常信息
	*/
	error: function(msg) {
		throw new Error(msg);
	},
	//解析XML
	parseXML: function(data) {
		var xml, tmp;
		if (!data || typeof data !== "string") {
			return null;
		}
		try {
			if (window.DOMParser) { // Standard
				tmp = new DOMParser();
				xml = tmp.parseFromString(data, "text/xml");
			} else { // IE
				xml = new ActiveXObject("Microsoft.XMLDOM");
				xml.async = "false";
				xml.loadXML(data);
			}
		} catch(e) {
			xml = undefined;
		}
		if (!xml || ! xml.documentElement || xml.getElementsByTagName("parsererror").length) {
			sjs.error("Invalid XML: " + data);
		}
		return xml;
	},
	/**
	* 空的function
	*
	* @method noop
	* @return {undefined}
	*/
	noop: function() {},
	/**
	* 在顶级上下文执行脚本
	*
	* @method globalEval
	* @param {string} data 要执行的脚本内容
	@example
		function test(){
			sjs.globalEval("var newVar = true;")
		}
		test();
		// newVar === true
	*/
	globalEval: function(data) {
		if (sjs.trim(data)) { (window.execScript || function(data) {
				window['eval'].call(window, data);
			})(data + ';');
		}
	},
	/*
	* 把字符串转换为驼峰命名
	* @param {string} string 目标字符串
	* @return {string} 转换后的字符串
	*/
	camelCase: function(string) {
		return string.replace(/^-ms-/, 'ms-').replace(/-([\da-z])/gi, function(all, letter) {
			return letter.toUpperCase();
		});
	},
	/*
	* 验证元素名称
	* @param {node} elem 目标元素
	* @param {string} name 待验证元素名称
	* @return {boolean} true/false
	*/
	nodeName: function(elem, name) {
		return elem.nodeName && elem.nodeName.toLowerCase() === name.toLowerCase();
	},
	/**
	* 去除字符串前后空格
	*
	* @method trim
	* @param {string} text 目标字符串
	* @return {string} 处理后的字符串
	@example
		$.trim("    hello, how are you?    ");//hello, how are you?
	*/
	trim: function(text) {
		if (text == null) {
			return '';
		} else {
			return (core_trim) ? core_trim.call(text) : text.toString().replace(/^[\s\xA0\uFEFF]+|[\s\xA0\uFEFF]+$/g, '');
		}
	},
	/**
	* 判断数组中是否存在特定值并返回它的index
	*
	* @method inArray
	* @param {anything} elem 要判断的对象
	* @param {array} arr 目标数组 
	* @param {number} i 开始查找的位置
	* @return {number} 对象在目标数组中的位置
	@example
		<div>"John" found at <span></span></div>
		<div>4 found at <span></span></div>
		<div>"Karl" not found, so <span></span></div>
		<div>"Pete" is in the array, but not at or after index 2, so <span></span></div>
		<script>var arr = [ 4, "Pete", 8, "John" ];
		var $spans = $("span");
		$spans.eq(0).text(sjs.inArray("John", arr));
		$spans.eq(1).text(sjs.inArray(4, arr));
		$spans.eq(2).text(sjs.inArray("Karl", arr));
		$spans.eq(3).text(sjs.inArray("Pete", arr, 2));
		</script>
	*/
	inArray: function(elem, arr, i) {
		if (arr == null) {
			return - 1;
		}
		//对i进行处理
		if (i != i || i === undefined || i === null) {
			i = 0;
		} else if (i !== 0 && i != Infinity && i != - Infinity) {
			i = (i > 0 || - 1) * Math.floor(Math.abs(i));
		}
		//如果支持indexOf方法
		if (core_indexOf) {
			return core_indexOf.call(arr, elem, i);
		} else {
			var len = arr.length >>> 0;
			if (len === 0 || i >= len) {
				return - 1;
			}

			var key = i >= 0 ? i: Math.max(len - Math.abs(i), 0);

			for (; key < len; key++) {
				if (key in arr && arr[key] === elem) {
					return key;
				}
			}
			return - 1;
		}
	},
	/**
	* 合并数组
	* 
	* @method merge
	* @param {object} source 源数组
	* @param {object} obj 要添加的数组
	* @return {object} 合并后的新数组
	@example
		$.merge( [0,1,2], [2,3,4] );//[0,1,2,2,3,4]
		$.merge( [3,2,1], [4,3,2] );//[3,2,1,4,3,2]
		var first = ['a','b','c'];
		var second = ['d','e','f'];
		$.merge( $.merge([],first), second);
		//["a","b","c","d","e","f"]
	*/
	merge: function(source, obj) {
		var sourceLen = source.length,
		objLen = obj.length,
		i = 0;

		if (typeof objLen === 'number') {
			for (; i < objLen; i++) {
				source[sourceLen++] = obj[i];
			}
		} else {
			while (obj[i] !== undefined) {
				source[sourceLen++] = obj[i++];
			}
		}
		source.length = sourceLen;
		return source;
	},
	/**
	* 将不同的数据类型转换为数组类型
	*
	* @method makeArray
	* @param {object} arr 要转换的数据类型
	* @param {object} result 原始数组（该参数只在内部方法中使用）
	* @return {object} 返回数组类型
	@example
		var obj = $('li');
		var arr = $.makeArray(obj);
		(typeof obj === 'object' && obj.jquery) === true;
		sjs.isArray(arr) === true;
	*/
	makeArray: function(arr, result) {
		var ret = result || [];
		if (arr != null) {
			if (isArraylike(Object(arr))) {
				sjs.merge(ret, arr);
			} else {
				core_push.call(ret, arr);
			}
		}
		return ret;
	},
	/**
	* 过滤不符合条件的元素，原始的元素列表不受影响
	*
	* @method grep
	* @param {array} elems 目标对象列表
	* @param {function} callback 过滤方法
	* @param {boolean} inv 转换开关 默认为过滤掉callback返回为false的元素
	* @return {array} 返回满足条件的新列表
	@example
		$.grep( [0,1,2], function(n,i){
			return n > 0;
		});
		//[1,2]
		$.grep( [0,1,2], function(n,i){
			return n > 0;
		},true);
		//[0]
	*/
	grep: function(elems, callback, inv) {
		var retVal, ret = [],
		i = 0,
		len = elems.length;
		inv = !! inv;

		for (; i < len; i++) {
			retVal = !! callback(elems[i], i);
			if (inv !== retVal) {
				ret.push(elems[i]);
			}
		}
		return ret;
	},
	/**
	* 遍历elems，生成以callback返回值为item的数组映射 
	*
	* @method map
	* @param {object} elems 目标对象集合
	* @param {function} callback 回调函数
	* @param {object} arg 额外的参数
	* @return {array} 返回以callback返回值为item的数组
	@example
		$.map( [0,1,2], function(n){
			return n + 4;
		});
		//[4,5,6]
		$.map( [0,1,2], function(n){
			return n > 0 ? n + 1 : null;
		});
		//[2,3]
		$.map( [0,1,2], function(n){
			return [ n, n + 1 ];
		});
		//[0,1,1,2,2,3]
	*/
	map: function(elems, callback, arg) {
		var value, i = 0,
		len = elems.length,
		isArray = isArraylike(elems),
		ret = [];

		//遍历数组
		if (isArray) {
			for (; i < len; i++) {
				value = callback(elems[i], i, arg);
				if (value != null) {
					ret[ret.length] = value;
				}
			}
		} else {
			//遍历对象
			for (i in elems) {
				value = callback(elems[i], i, arg);
				if (value != null) {
					ret[ret.length] = value;
				}
			}
		}
		return core_concat.apply([], ret);
	},
	//全局的GUID计数器
	guid: 1,
	/**
	* 绑定一个function到上下文
	*
	* @method proxy
	* @param {function} fn 要绑定的方法
	* @param {object} context 上下文对象
	* @return {function} 返回新的function
	@example
		var obj = {
			name: "John",
			test: function() {
				$("#log").append( this.name );
				$("#test").off("click", obj.test);
			}
		};
		$("#test").on( "click", sjs.proxy( obj.test, obj ) );
	*/
	proxy: function(fn, context) {
		var args, proxy, tmp;

		if (typeof context === 'string') {
			tmp = fn[context];
			context = fn;
			fn = tmp;
		}

		if (!sjs.isFunction(fn)) {
			return undefined;
		}
		//bind
		args = core_slice.call(arguments, 2);
		proxy = function() {
			return fn.apply(context || this, args.concat(core_slice.call(arguments)));
		};
		proxy.guid = fn.guid = fn.guid || sjs.guid++;
		return proxy;
	},
	/**
	 * 当前时间
	 *
	 * @method now
	 * @return {number} 数字表示的当前时间
	*/
	now: Date.now || function() {
		return (new Date()).getTime();
	},
	/**
	* 解析HTML字符串并返回对应的元素列表
	*
	* @method parseHTML
	* @param {string} data HTML字符串
	* @param {node} context 上下文
	* @return {array} 返回与HTML字符串对应关系的元素列表
	@example
		<div id="log">
			<h3>Content:</h3>
		</div>
		
		<script>
			var $log = $( "#log" ),
			str = "hello, <b>my name is</b> sjs.",
			html = $.parseHTML( str ),
			nodeNames = [];
			
			// Append the parsed HTML
			$log.append( html );
			
			// Gather the parsed HTML's node names
			$.each( html, function( i, el ) {
				nodeNames[i] = "<li>" + el.nodeName + "</li>";
			});

			// Insert the node names
			$log.append( "<h3>Node Names:</h3>" );
			$( "<ol></ol>" ).append( nodeNames.join( "" ) )
			.appendTo( $log );
		</script>
	*/
	parseHTML: function(data, context) {
		if (!data || typeof data !== 'string') {
			return null;
		}

		context = context || document;

		var parsed = rsingleTag.exec(data);

		//单标签例如：<br/>
		if (parsed) {
			return [context.createElement(parsed[1])];
		}

		parsed = sjs.buildFragment([data], context);

		return sjs.merge([], parsed.childNodes);
	},
	// 设置/读取一组对象属性的多高功能函数
	// 如果参数vlaue是可执行的，将被执行
	access: function(elems, fn, key, value, chainable, emptyGet, raw) {
		var i = 0,
		length = elems.length,
		bulk = key == null;

		// 遍历设置属性
		if (sjs.type(key) === "object") {
			chainable = true;
			for (i in key) {
				sjs.access(elems, fn, i, key[i], true, emptyGet, raw);
			}

			// 设置一个属性值
		} else if (value !== undefined) {
			chainable = true;

			if (!sjs.isFunction(value)) {
				raw = true;
			}

			if (bulk) {
				// Bulk operations run against the entire set
				if (raw) {
					fn.call(elems, value);
					fn = null;

					// ...except when executing function values
				} else {
					bulk = fn;
					fn = function(elem, key, value) {
						return bulk.call(sjs(elem), value);
					};
				}
			}

			if (fn) {
				for (; i < length; i++) {
					fn(elems[i], key, raw ? value: value.call(elems[i], i, fn(elems[i], key)));
				}
			}
		}

		return chainable ? elems: bulk ? fn.call(elems) : length ? fn(elems[0], key) : emptyGet;
	},
	parseJSON: function(data) {
		if (window.JSON && window.JSON.parse) {
			return window.JSON.parse(data);
		}

		if (data === null) {
			return data;
		}

		if (typeof data === 'string') {
			data = sjs.trim(data);

			if (data) {
				if (rvalidchars.test(data.replace(rvalidescape, '@').replace(rvalidtokens, ']').replace(rvalidbraces, ''))) {
					return (new Function('return ' + data))();
				}
			}
		}

		sjs.error('Invalid JSON:' + data);
	}
});

sjs.ready.promise = function(obj) {
	if (!readyList) {
		readyList = sjs.Deferred();
		//针对$(document).ready()会在浏览器事件触发之前触发的问题
		//解释：http://bugs.jquery.com/ticket/12282#comment:15
		if (document.readyState === 'complete') {
			setTimeout(sjs.ready);
			//处理标准浏览器
		} else if (document.addEventListener) {
			document.addEventListener('DOMContentLoaded', completed, false);
			window.addEventListener('load', completed, false);
			//处理IE
		} else {
			//确保在onload之前触发
			document.attachEvent('onreadystatechange', completed);

			//window.onload的回调
			window.attachEvent('onload', completed);

			//如果是IE而且不是frame
			//继续检查document是否载入完毕
			var top = false;
			try {
				top = window.frameElement == null && document.documentElement;
			} catch(e) {}

			if (top && top.doScroll) { (function doScrollCheck() {
					if (!sjs.isReady) {
						try {
							top.doScroll('left');
						} catch(e) {
							return setTimeout(doScrollCheck, 50);
						}

						detach();

						sjs.ready();
					}
				})();
			}
		}
	}
	return readyList.promise(obj);
};

sjs.each('Boolean Number String Function Array Date RegExp Object Error'.split(' '), function(i, name) {
	class2type['[object ' + name + ']'] = name.toLowerCase();
});

//所有的sjs对象需要指回rootsjs
rootsjs = sjs(document);

/**
 * @module callbacks
 * @main callbacks
 */
/**
 这是一个多用途的callbacks列表对象，用来提供强大的callback列表管理方式

 sjs.Callbacks()方法主要在$.ajax()和$.Deferred()方法内部使用，同时也可以在其他组件中做为基础的方法使用

 sjs.Callbacks()主要提供下面的一些方法

 callbacks.add()
 callbacks.remove()
 callbacks.fire()
 callbacks.disable()

 下面是一些用法的介绍

 我们先创建两个方法

 function fn1(value){
		console.log(value);
	}
 function fn2(value){
		console.log('fn2 says:'+value);
		return false;
	}

 然后我们使用Callbacks来调用上面两个方法

 var callbacks = $.Callbacks();
 callbacks.add(fn1);
 //outputs:foo!
 callbacks.fire('foo!');
 callbacks.add(fn2);
 //outputs:bar!,fn2 says:bar!
 callbacks.fire('bar!');

 flags参数是一个可选的参数，共有四种，通过空格分隔字符串的方式来控制callback列表的各种行为。例如：$.Callbacks('unique stopOnFalse');

 once：确认callback列表仅执行一次

 var callbacks = $.Callbacks('once');
 callbacks.add(fn1);
 callbacks.fire('foo');
 callbacks.add(fn2);
 callbacks.fire('bar');
 callbacks.remove('fn2');
 callbacks.fire('foobar');
 //output:
 //foo

 memory：当列表通过参数被触发之后会跟踪上一次的参数并调用所有添加的callback

 var callbacks = $.Callbacks('memory');
 callbacks.add(fn1);
 callbacks.fire('foo');
 callbacks.add(fn2);
 callbacks.fire('bar');
 callbacks.remove('fn2');
 callbacks.fire('foobar');
 //output:
 //foo
 //fn2 says:foo
 //bar
 //fn2 says:bar
 //foobar

 unique：确保一个callback只能添加一次

 var callbacks = $.Callbacks( "unique" );
 callbacks.add( fn1 );
 callbacks.fire( "foo" );
 callbacks.add( fn1 ); // repeat addition
 callbacks.add( fn2 );
 callbacks.fire( "bar" );
 callbacks.remove( fn2 );
 callbacks.fire( "foobar" );
 //output:
 //foo
 //bar
 //fn2 says:bar
 //foobar

 stopOnFalse：当callback返回false时中断调用

 functon fn1(value){
		console.log(value);
		return false;
	}
 function fn2(value){
		fn1('fn2 says:'+value);
		return false;
	}
 var callbacks = $.Callbacks( "stopOnFalse" );
 callbacks.add( fn1 );
 callbacks.fire( "foo" );
 callbacks.add( fn2 );
 callbacks.fire( "bar" );
 callbacks.remove( fn2 );
 callbacks.fire( "foobar" );
 //output:
 //foo
 //bar
 //foobar

 @class callbacks
 @constructor
 @global
 @param {string} flags 用来控制callback列表行为的参数
 @return {object} callbacks 返回列表对象
 */
//对象参数缓存
var optionsCache = {};

//转换字符串格式的参数为对象格式
var createOptions = function(options){
    var object = optionsCache[options] = {};
    sjs.each(options.match(core_rnotwhite) || [],function(_,flag){
        object[flag] = true;
    });
    return object;
};

/*
 创建一个callback列表
 options:一个有多种参数选项的列表,可以通过参数改变callback列表的行为
 一个默认的callback列表跟事件callback列表一样，能够被触发多次
 可能的options

 once:callback列表只能被触发一次
 memory:当列表通过参数被触发之后会保留上一次的参数并调用所有添加的callback
 unique:一个callback只能添加一次
 stopOnFalse:当一个callback返回false时会终止调用
 */
sjs.Callbacks = function(options){
    //把options从字符串类型转换成为对象类型
    options = typeof options === 'string' ?
        (optionsCache[options] || createOptions(options)) :
        sjs.extend({},options);

    var //标记列表是否正在被执行
        firing,
    //最后一次执行的值(为需要缓存的列表)
        memory,
    //标记列表是否已经被执行
        fired,
    //执行时循环的结束标记
        firingLength,
    //当前执行的callback索引
        firingIndex,
    //第一次执行callback
        firingStart,
    //callback列表
        list = [],
    //可重复调用的列表栈
        stack = !options.once && [],
    //触发callback
        fire = function(data){
            memory = options.memory && data;
            fired = true,
                firingIndex = firingStart || 0;
            firingStart = 0;
            firingLength = list.length;
            firing = true;
            for(;list && firingIndex < firingLength;firingIndex++){
                if(list[firingIndex].apply(data[0],data[1]) === false && options.stopOnFalse){
                    memory = false;//阻止进一步的调用
                    break;
                }
            }
            firing = false;
            if(list){
                if(stack){
                    if(stack.length){
                        fire(stack.shift());
                    }
                }else if(memory){
                    list = [];
                }else{
                    self.disable();
                }
            }
        },
    //Callbacks对象
        self = {
            /**
             添加一个或一组callback到列表中
             @method add
             @param {function|array} callbacks 回调方法或回调方法列表
             @example
             // a sample logging function to be added to a callbacks list
             var foo = function( value ) {
					console.log( "foo: " + value );
				};

             // another function to also be added to the list
             var bar = function( value ){
					console.log( "bar: " + value );
				};

             var callbacks = $.Callbacks();

             // add the function "foo" to the list
             callbacks.add( foo );

             // fire the items on the list
             callbacks.fire( "hello" );
             // outputs: "foo: hello"

             // add the function "bar" to the list
             callbacks.add( bar );

             // fire the items on the list again
             callbacks.fire( "world" );

             // outputs:
             // "foo: world"
             // "bar: world"
             */
            add:function(){
                if(list){
                    var start = list.length;
                    (function add(args){
                        sjs.each(args,function(_,arg){
                            var type = sjs.type(arg);
                            if(type === 'function'){
                                if(!options.unique || !self.has(arg)){
                                    list.push(arg);
                                }
                            }else if(arg && arg.length && type !== 'string'){
                                add(arg);
                            }
                        });
                    })(arguments);
                    if(firing){
                        firingLength = list.length;
                    }else if(memory){
                        firingStart = start;
                        fire(memory);
                    }
                }
                return this;
            },
            /**
             从callback列表中删除callback
             @method remove
             @param {function|array} callbacks 回调方法
             @example
             // a sample logging function to be added to a callbacks list
             var foo = function( value ) {
					console.log( "foo: " + value );
				};

             var callbacks = $.Callbacks();

             // add the function "foo" to the list
             callbacks.add( foo );

             // fire the items on the list
             callbacks.fire( "hello" );
             // outputs: "foo: hello"

             // remove "foo" from the callback list
             callbacks.remove( foo );

             // fire the items on the list again
             callbacks.fire( "world" );

             // nothing output as "foo" is no longer in the list
             */
            remove:function(){
                if(list){
                    sjs.each(arguments,function(_,arg){
                        var index;
                        while((index = sjs.inArray(arg,list,index)) > -1){
                            list.splice(index,1);
                            //处理正在触发的callback
                            if(firing){
                                if(index <= firingLength){
                                    firingLength--;
                                }
                                if(index <= firingIndex){
                                    firingIndex--;
                                }
                            }
                        }
                    });
                }
                return this;
            },
            /**
             检查传入的function是否在list中，如果没有参数会返回列表中是否含有callback
             @method has
             @param {function} fn 要检查的callback
             @example
             // a sample logging function to be added to a callbacks list
             var foo = function( value1, value2 ) {
					console.log( "Received: " + value1 + "," + value2 );
				};

             // a second function which will not be added to the list
             var bar = function( value1, value2 ) {
					console.log( "foobar" );
				}

             var callbacks = $.Callbacks();

             // add the log method to the callbacks list
             callbacks.add( foo );

             // determine which callbacks are in the list

             console.log( callbacks.has( foo ) );
             // true
             console.log( callbacks.has( bar ) );
             // false
             */
            has:function(fn){
                return fn ? sjs.inArray(fn,list) > -1 : !!(list && list.length);
            },
            /**
             清空列表
             @method empty
             @example
             // a sample logging function to be added to a callbacks list
             var foo = function( value1, value2 ) {
					console.log( "foo: " + value1 + "," + value2 );
				}

             // another function to also be added to the list
             var bar = function( value1, value2 ){
					console.log( "bar: " + value1 + "," + value2 );
				}

             var callbacks = $.Callbacks();

             // add the two functions
             callbacks.add( foo );
             callbacks.add( bar );

             // empty the callbacks list
             callbacks.empty();

             // check to ensure all callbacks have been removed
             console.log( callbacks.has( foo ) );
             // false
             console.log( callbacks.has( bar ) );
             // false
             */
            empty:function(){
                list = [];
                firingLength = 0;
                return this;
            },
            /**
             禁止list做任何事情
             @method disable
             @example
             // a sample logging function to be added to a callbacks list
             var foo = function( value ) {
					console.log( value );
				};

             var callbacks = $.Callbacks();

             // add the above function to the list
             callbacks.add( foo );

             // fire the items on the list
             callbacks.fire( "foo" );
             // outputs: foo

             // disable further calls being possible
             callbacks.disable();

             // attempt to fire with "foobar" as an argument
             callbacks.fire( "foobar" );
             // foobar isn't output
             */
            disable:function(){
                list = stack = memory = undefined;
                return this;
            },
            /**
             确认是否处于禁止状态
             @method disabled
             @example
             // a sample logging function to be added to a callbacks list
             var foo = function( value ) {
					console.log( "foo:" + value );
				};

             var callbacks = $.Callbacks();

             // add the logging function to the callback list
             callbacks.add( foo );

             // fire the items on the list, passing an argument
             callbacks.fire( "hello" );
             // outputs "foo: hello"

             // disable the callbacks list
             callbacks.disable();

             // test the disabled state of the list
             console.log ( callbacks.disabled() );
             // outputs: true
             */
            disabled:function(){
                return !list;
            },
            /**
             在当前状态下锁定列表
             @method lock
             @example
             // a sample logging function to be added to a callbacks list
             var foo = function( value ) {
					console.log( "foo:" + value );
				};

             var callbacks = $.Callbacks();

             // add the logging function to the callback list
             callbacks.add( foo );

             // fire the items on the list, passing an argument
             callbacks.fire( "hello" );
             // outputs "foo: hello"

             // lock the callbacks list
             callbacks.lock();

             // try firing the items again
             callbacks.fire( "world" );

             // as the list was locked, no items
             // were called, so "world" isn"t logged
             */
            lock:function(){
                stack = undefined;
                if(!memory){
                    self.disable();
                }
                return this;
            },
            /**
             确定锁定状态
             @method locked
             @example
             // a sample logging function to be added to a callbacks list
             var foo = function( value ) {
					console.log( "foo: " + value);
				};

             var callbacks = $.Callbacks();

             // add the logging function to the callback list
             callbacks.add( foo );

             // fire the items on the list, passing an argument
             callbacks.fire( "hello" );
             // outputs "foo: hello"

             // lock the callbacks list
             callbacks.lock();

             // test the lock-state of the list
             console.log ( callbacks.locked() );
             // true
             */
            locked:function(){
                return !stack;
            },
            /**
             使用context和args调用所有的callbacks
             @method fireWith
             @param {object} context 上下文
             @param {anything} args callback需要用到的参数
             @example
             // a sample logging function to be added to a callbacks list
             var log = function( value1, value2 ) {
					console.log( "Received: " + value1 + "," + value2 );
				};

             var callbacks = $.Callbacks();

             // add the log method to the callbacks list
             callbacks.add( log );

             // fire the callbacks on the list using the context "window"
             // and an arguments array

             callbacks.fireWith( window, ["foo","bar"]);

             // outputs: "Received: foo, bar"
             */
            fireWith:function(context,args){
                args = args || [];
                args = [context,args.slice ? args.slice() : args];
                if(list && (!fired || stack)){
                    if(firing){
                        stack.push(args);
                    }else{
                        fire(args);
                    }
                }
                return this;
            },
            /**
             调用所有的callbacks
             @method fire
             @param {anything} args callback要用到的参数
             @example
             // a sample logging function to be added to a callbacks list
             var foo = function( value ) {
					console.log( "foo:" + value );
				}

             var callbacks = $.Callbacks();

             // add the function "foo" to the list
             callbacks.add( foo );

             // fire the items on the list
             callbacks.fire( "hello" ); // outputs: "foo: hello"
             callbacks.fire( "world" ); // outputs: "foo: world"

             // add another function to the list
             var bar = function( value ){
					console.log( "bar:" + value );
				}

             // add this function to the list
             callbacks.add( bar );

             // fire the items on the list again
             callbacks.fire( "hello again" );
             // outputs:
             // "foo: hello again"
             // "bar: hello again"
             */
            fire:function(){
                self.fireWith(this,arguments);
                return this;
            },
            //确认callbacks是否已经被调用至少一次
            fired:function(){
                return !!fired;
            }
        };
    return self;
};
sjs.extend({
	Deferred:function(func){
		var tuples = [
			//动作，回调，回调列表，最终状态
			['resolve','done',sjs.Callbacks('once memory'),'resolved'],
			['reject','fail',sjs.Callbacks('once memory'),'rejected'],
			['notify','progress',sjs.Callbacks('memory')]
		],
		state = 'pending',
		deferred = {},
		promise = {
			state:function(){
				return state;
			},
			always:function(){
				deferred.done(arguments).fail(arguments);
				return this;
			},
			then:function(/*fnDone,fnFail,fnProgress*/){
				var fns = arguments;
				return sjs.Deferred(function(newDeferred){
					sjs.each(tuples,function(i,tuple){
						var action = tuple[0],
							fn = sjs.isFunction(fns[i]) && fns[i];

						//deferred[done|fail|progress]添加到新的defer上
						deferred[tuple[1]](function(){
							var returned = fn && fn.apply(this,arguments);
							if(returned && sjs.isFunction(returned.promise)){
								returned.promise()
									.done(newDeferred.resolve)
									.fail(newDeferred.reject)
									.progress(newDeferred.notify);
							}else{
								newDeferred[action + 'With'](this === promise ? newDeferred.promise() : this,fn ? [returned] : arguments);
							}
						});
					});
					fns = null;
				}).promise();
			},
			promise:function(obj){
				return obj != null ? sjs.extend(obj,promise) : promise;
			}
		};
		//添加特定的方法
		sjs.each(tuples,function(i,tuple){
			var callback = tuple[2],
				stateString = tuple[3];
			//promise[done|fail|progress] = callback.add
			promise[tuple[1]] = callback.add;

			if(stateString){
				callback.add(function(){
					state = stateString;
				},tuples[1 ^ i][2].disable,tuples[2][2].lock);
			}

			deferred[tuple[0]] = function(){
				deferred[tuple[0] + 'With'](this === deferred ? promise : this,arguments);
				return this;
			};
			deferred[tuple[0] + 'With'] = callback.fireWith;
		});
		promise.pipe = promise.then;

		promise.promise(deferred);

		if(func){
			func.call(deferred,deferred);
		}

		return deferred;
	},
	when:function(subordinate){
		var i = 0,
			resolveValues = core_slice.call(arguments),
			length = resolveValues.length,
			//未结束的子任务数量
			remaining = length !== 1 || (subordinate && sjs.isFunction(subordinate.promise)) ? length : 0,
			//主deferred
			deferred = remaining === 1 ? subordinate : sjs.Deferred(),
			//更新reslove和progress
			updateFunc = function(i,contexts,values){
				return function(value){
					contexts[i] = this;
					values[i] = arguments.length > 1 ? core_slice.call(arguments) : value;
					if(values === progressValues){
						deferred.notifyWith(contexts,values);
					}else if(!(--remaining)){
						deferred.resolveWith(contexts,values);
					}
				};
			},
			progressValues,
			progressContexts,
			resolveContexts;
		
		//给子deferred添加监听，触发resolve
		if(length > 1){
			progressValues = new Array(length);
			progressContexts = new Array(length);
			resolveContexts = new Array(length);
			for(;i<length;i++){
				if(resolveValues[i] && sjs.isFunction(resolveValues[i].promise)){
					resolveValues[i].promise()
						.done(updateFunc(i,resolveContexts,resolveValues))
						.fail(deferred.reject)
						.progress(updateFunc(i,progressContexts,progressValues));
				}else{
					--remaining;
				}
			}
		}
		//如果不需要等待，就执行主deferred
		if(!remaining){
			deferred.resolveWith(resolveContexts,resolveValues);
		}

		return deferred.promise();
	}
});
sjs.support = (function(support){
	var all,a,input,select,fragment,opt,eventName,isSupported,i,
		div = document.createElement('div');

	//设置div
	div.setAttribute('className','t');
	div.innerHTML = '  <link/><table></table><a href="/a">a</a><input type="checkbox"/>';

	//检查受限(非browser)环境
	all = div.getElementsByTagName('*');
	a = div.getElementsByTagName('a')[0];
	if(!all || !a || !all.length){
		return support;
	}

	select = document.createElement('select');
	opt = select.appendChild(document.createElement('option'));
	input = div.getElementsByTagName('input')[0];

	a.style.cssText = 'top:1px;float:left;opacity:.5';

	//测试setAttribute参数使用驼峰命名法，如果返回false，我们需要处理get/setAttribute(ie6/7)
	support.getSetAttribute = div.className !== 't';

	//当innerHTML时IE不会保留空格
	support.leadingWhitespace = div.firstChild.nodeType === 3;

	//测试tbody元素不会被自动添加
	//IE会添加到一个空的table中
	support.tbody = !div.getElementsByTagName('tbody').length;

	//测试link元素在innerHTML的时候序列化正确
	//在IE中会需要一个包装过的元素
	support.htmlSerialize = !!div.getElementsByTagName('link').length;

	//从getAttribute中获取style信息
	//(IE使用.cssText)
	support.style = /top/.test(a.getAttribute('style'));

	//测试urls不受影响
	//(IE默认正常)
	support.hrefNormalized = a.getAttribute('href') === '/a';

	//测试元素透明度可用
	//(IE使用filter)
	support.opacity = /^0.5/.test(a.style.opacity);

	//测试float可用
	//(IE使用styleFloat)
	support.cssFloat = !!a.style.cssFloat;

	//测试默认的checkbox/radio值(webkit为'',其他为'on')
	support.checkOn = !!input.value;

	//测试一个有默认option的select有selected属性
	//(webkit默认用true代替false,当IE是一个optgroup时，同上。)
	support.optSelected = opt.selected;

	//测试表单上的enctype属性
	support.enctype = !!document.createElement('form').enctype;

	//测试克隆一个html5元素不会发生错误
	//当outerHTML是undefined时，它仍会工作
	support.html5Clone = document.createElement('nav').cloneNode(true).outerHTML !== '<:nav></:nav>';

	//测试盒模型
	support.boxModel = document.compatMode === 'CSS1Compat';

	support.inlineBlockNeedsLayout = false;
	support.shrinkWrapBlocks = false;
	support.pixelPosition = false;
	support.deleteExpando = true;
	support.noCloneEvent = true;
	support.reliableMarginRight = true;
	support.boxSizingReliable = true;

	//测试checked状态被clone
	input.checked = true;
	support.noCloneChecked = input.cloneNode(true).checked;

	//测试options在一个disabled的select里不会被标记为disabled
	select.disabled = true;
	support.optDisabled = !opt.disabled;

	//支持: IE<9
	try{
		delete div.test;
	}catch(e){
		support.deleteExpando = false;
	}

	//测试getAttribute('value')是否正确
	input = document.createElement('input');
	input.setAttribute('value','');
	support.input = input.getAttribute('value') === '';

	//测试一个input在变成radio之后会继续拥有它原来的值
	input.value = 't';
	input.setAttribute('type','radio');
	support.radioValue = input.value === 't';

	//当name属性在check属性之后webkit会丢失check
	input.setAttribute('checked','t');
	input.setAttribute('name','t');

	fragment = document.createDocumentFragment();
	fragment.appendChild(input);

	//检查没有添加到dom的checkbox会返回它的checked属性
	//在添加到dom之后value为true(IE6/7)
	support.appendChecked = input.checked;

	//在fragment中webkit不会正确复制checked状态
	support.checkClone = fragment.cloneNode(true).cloneNode(true).lastChild.checked;

	//支持: IE<9
	//Opera不支持clone events
	//IE9-10 clone events，但不支持click触发
	if(div.attachEvent){
		div.attachEvent('onclick',function(){
			support.noCloneEvent = false;
		});
		div.cloneNode(true).click();
	}

	//支持：IE<9 (缺少submit/change冒泡) firefox17+(缺少focusin事件)
	//注意CSP约束
	for(i in {submit:true,change:true,focusin:true}){
		div.setAttribute(eventName = 'on' + i,'t');
		support[i+'Bubbles'] = eventName in window || div.attributes[eventName].expando === false;
	}

	div.style.backgroundClip = 'content-box';
	div.cloneNode(true).style.backgroundClip = '';
	support.clearCloneStyle = div.style.backgroundClip === 'content-box';
	
	//需要在body ready之后的检测类型
	sjs(function(){
		var container,
			marginDiv,
			tds,
			divReset = 'padding:0;margin:0;border:0;display:block;box-sizing:content-box;-moz-box-sizing:content-box;-webkit-box-sizing:content-box;',
			body = document.getElementsByTagName('body')[0];

		if(!body){
			return;
		}

		container = document.createElement('div');
		container.style.cssText = 'border:0;width:0;height:0;position:absolute;top:0;left:-9999px;margin-top:1px';

		body.appendChild(container).appendChild(div);
		//支持:IE8
		//检测table cells是否拥有offsetWidth/Height当设置为display:none时
		div.innerHTML = '<table><tr><td></td><td>t</td></tr></table>';
		tds = div.getElementsByTagName('td');
		tds[0].style.cssText = 'padding:0;margin:0;border:0;display:none';
		isSupported = (tds[0].offsetHeight === 0);

		tds[0].style.display = '';
		tds[1].style.display = 'none';
		//检测一个空table cells时候拥有offsetHeight
		support.reliableHiddenOffsets = isSupported && (tds[0].offsetHeight === 0);

		//检测box-sizing和margin行为
		div.innerHTML = '';
		div.style.cssText = 'box-sizing:border-box;-moz-box-sizing:border-box;-webkit-box-sizing:border-box;padding:1px;border:1px;display:block;width:4px;margin-top:1%;position:absolute;top:1%;';
		support.boxSizing = (div.offsetWidth === 4);
		support.doesNotIncludeMarginInBodyOffset = (body.offsetTop !== 1);

		if(window.getComputedStyle){
			support.pixelPosition = (window.getComputedStyle(div,null) || {}).top != '1%';
			support.boxSizingReliable = (window.getComputedStyle(div,null) || {width:'4px'}).width === '4px';
			
			marginDiv = div.appendChild(document.createElement('div'));
			marginDiv.style.cssText = div.style.cssText = divReset;
			marginDiv.style.marginRight = marginDiv.style.width = '0';
			div.style.width = '1px';

			support.reliableMarginRight = !parseFloat((window.getComputedStyle(marginDiv,null) || {}).marginRight);
		}

		if(typeof div.style.zoom !== typeof undefined){
			//支持：IE<8
			//检测当一些原生的块级元素当设置为显示inline的时候被当做是一个inline-block的元素
			div.innerHTML = '';
			div.style.cssText = divReset + 'width:1px;padding:1px;display:inline;zoom:1;';
			support.inlineBlockNeedsLayout = (div.offsetWidth === 3);

			div.style.display = 'block';
			div.innerHTML = '<div></div>';
			div.firstChild.style.width = '5px';
			support.shrinkWrapBlocks = (div.offsetWidth !== 3);
			if(support.inlineBlockNeedsLayout){
				body.style.zoom = 1;
			}
		}
		body.removeChild(container);

		container = div = tds = marginDiv = null;
	});
	//避免ie内存泄露
	all = select = fragment = opt = a = input = null;
	return support;
})({});
/**
 * @module data
 * @main data
*/
/**
sjs数据缓存方法，添加指定值的数据到元素或对象上

设置缓存值

	var div = $('<div/>');
	$.data(div,'foo','bar');

读取缓存值

	var div = $('<div/>');
	$.data(div,'foo');

@class data
@global
*/
var rbrace = /(?:\{[\s\S]*\}|\[[\s\S]*\])$/,
	rmultiDash = /([A-Z])/g;

function internalData( elem, name, data, pvt /* Internal Use Only */ ){
	if ( !sjs.acceptData( elem ) ) {
		return;
	}

	var ret, thisCache,
		internalKey = sjs.expando,

		// We have to handle DOM nodes and JS objects differently because IE6-7
		// can't GC object references properly across the DOM-JS boundary
		isNode = elem.nodeType,

		// Only DOM nodes need the global sjs cache; JS object data is
		// attached directly to the object so GC can occur automatically
		cache = isNode ? sjs.cache : elem,

		// Only defining an ID for JS objects if its cache already exists allows
		// the code to shortcut on the same path as a DOM node with no cache
		id = isNode ? elem[ internalKey ] : elem[ internalKey ] && internalKey;

	// Avoid doing any more work than we need to when trying to get data on an
	// object that has no data at all
	if ( (!id || !cache[id] || (!pvt && !cache[id].data)) && data === undefined && typeof name === "string" ) {
		return;
	}

	if ( !id ) {
		// Only DOM nodes need a new unique ID for each element since their data
		// ends up in the global cache
		if ( isNode ) {
			id = elem[ internalKey ] = core_deletedIds.pop() || sjs.guid++;
		} else {
			id = internalKey;
		}
	}

	if ( !cache[ id ] ) {
		// Avoid exposing sjs metadata on plain JS objects when the object
		// is serialized using JSON.stringify
		cache[ id ] = isNode ? {} : { toJSON: sjs.noop };
	}

	// An object can be passed to sjs.data instead of a key/value pair; this gets
	// shallow copied over onto the existing cache
	if ( typeof name === "object" || typeof name === "function" ) {
		if ( pvt ) {
			cache[ id ] = sjs.extend( cache[ id ], name );
		} else {
			cache[ id ].data = sjs.extend( cache[ id ].data, name );
		}
	}

	thisCache = cache[ id ];

	// sjs data() is stored in a separate object inside the object's internal data
	// cache in order to avoid key collisions between internal data and user-defined
	// data.
	if ( !pvt ) {
		if ( !thisCache.data ) {
			thisCache.data = {};
		}

		thisCache = thisCache.data;
	}

	if ( data !== undefined ) {
		thisCache[ sjs.camelCase( name ) ] = data;
	}

	// Check for both converted-to-camel and non-converted data property names
	// If a data property was specified
	if ( typeof name === "string" ) {

		// First Try to find as-is property data
		ret = thisCache[ name ];

		// Test for null|undefined property data
		if ( ret == null ) {

			// Try to find the camelCased property
			ret = thisCache[ sjs.camelCase( name ) ];
		}
	} else {
		ret = thisCache;
	}

	return ret;
}

function internalRemoveData( elem, name, pvt ) {
	if ( !sjs.acceptData( elem ) ) {
		return;
	}

	var thisCache, i,
		isNode = elem.nodeType,

		// See sjs.data for more information
		cache = isNode ? sjs.cache : elem,
		id = isNode ? elem[ sjs.expando ] : sjs.expando;

	// If there is already no cache entry for this object, there is no
	// purpose in continuing
	if ( !cache[ id ] ) {
		return;
	}

	if ( name ) {

		thisCache = pvt ? cache[ id ] : cache[ id ].data;

		if ( thisCache ) {

			// Support array or space separated string names for data keys
			if ( !sjs.isArray( name ) ) {

				// try the string as a key before any manipulation
				if ( name in thisCache ) {
					name = [ name ];
				} else {

					// split the camel cased version by spaces unless a key with the spaces exists
					name = sjs.camelCase( name );
					if ( name in thisCache ) {
						name = [ name ];
					} else {
						name = name.split(" ");
					}
				}
			} else {
				// If "name" is an array of keys...
				// When data is initially created, via ("key", "val") signature,
				// keys will be converted to camelCase.
				// Since there is no way to tell _how_ a key was added, remove
				// both plain key and camelCase key. #12786
				// This will only penalize the array argument path.
				name = name.concat( sjs.map( name, sjs.camelCase ) );
			}

			i = name.length;
			while ( i-- ) {
				delete thisCache[ name[i] ];
			}

			// If there is no data left in the cache, we want to continue
			// and let the cache object itself get destroyed
			if ( pvt ? !isEmptyDataObject(thisCache) : !sjs.isEmptyObject(thisCache) ) {
				return;
			}
		}
	}

	// See sjs.data for more information
	if ( !pvt ) {
		delete cache[ id ].data;

		// Don't destroy the parent cache unless the internal data object
		// had been the only thing left in it
		if ( !isEmptyDataObject( cache[ id ] ) ) {
			return;
		}
	}

	// Destroy the cache
	if ( isNode ) {
		sjs.cleanData( [ elem ], true );

	// Use delete when supported for expandos or `cache` is not a window per isWindow (#10080)
	} else if ( sjs.support.deleteExpando || cache != cache.window ) {
		delete cache[ id ];

	// When all else fails, null
	} else {
		cache[ id ] = null;
	}
}

sjs.extend({
	cache: {},

	// The following elements throw uncatchable exceptions if you
	// attempt to add expando properties to them.
	noData: {
		"applet": true,
		"embed": true,
		// Ban all objects except for Flash (which handle expandos)
		"object": "clsid:D27CDB6E-AE6D-11cf-96B8-444553540000"
	},
/**
 * 判断某元素是否含有缓存数据
 * @method hasData
 * @static
 * @param {element|object} elem 目标元素
 * @return {boolean} 是否含有缓存数据
	@example
		var div = $('<div/>');
		$.data(div,'foo','bar');
		$.hasData(div);//true
*/
	hasData: function( elem ) {
		elem = elem.nodeType ? sjs.cache[ elem[sjs.expando] ] : elem[ sjs.expando ];
		return !!elem && !isEmptyDataObject( elem );
	},
/**
 * 设置或读取缓存数据
 * @method data
 * @param {element|object} elem 要添加缓存的元素
 * @param {string} name 缓存名称
 * @param {anthing} data 缓存值
 * @return {object} 返回当前缓存值
	@example
		var div = $('<div/>');
		$.data(div,'foo','bar');
		$.hasData(div);//true

		div.data('foo','baz');
		console.log(div.data('foo'));//baz
*/
	data: function( elem, name, data ) {
		return internalData( elem, name, data );
	},
/**
 * 删除缓存数据
 * @method removeData
 * @static
 * @param {element|object} elem 要删除缓存的元素
 * @param {string} name 缓存名称
	@example
		var div = $('<div/>');
		$.data(div,'foo','bar');
		$.removeData(div,'foo');
		$.hasData(div);//false
*/
	removeData: function( elem, name ) {
		return internalRemoveData( elem, name );
	},

	// For internal use only.
	_data: function( elem, name, data ) {
		return internalData( elem, name, data, true );
	},

	_removeData: function( elem, name ) {
		return internalRemoveData( elem, name, true );
	},
/**
判断某元素是否可以进行数据存取
@method acceptData
@param {element} elem 要判断的元素
@return {boolean} true/false
@example
	var node = $('body');
	console.log(sjs.acceptData(node));//true;
*/
	// A method for determining if a DOM node can handle the data expando
	acceptData: function( elem ) {
		// Do not set data on non-element because it will not be cleared (#8335).
		if ( elem.nodeType && elem.nodeType !== 1 && elem.nodeType !== 9 ) {
			return false;
		}

		var noData = elem.nodeName && sjs.noData[ elem.nodeName.toLowerCase() ];

		// nodes accept data unless otherwise specified; rejection can be conditional
		return !noData || noData !== true && elem.getAttribute("classid") === noData;
	}
});

sjs.fn.extend({
	data: function( key, value ) {
		var attrs, name,
			data = null,
			i = 0,
			elem = this[0];

		// Special expections of .data basically thwart sjs.access,
		// so implement the relevant behavior ourselves

		// Gets all values
		if ( key === undefined ) {
			if ( this.length ) {
				data = sjs.data( elem );

				if ( elem.nodeType === 1 && !sjs._data( elem, "parsedAttrs" ) ) {
					attrs = elem.attributes;
					for ( ; i < attrs.length; i++ ) {
						name = attrs[i].name;

						if ( name.indexOf("data-") === 0 ) {
							name = sjs.camelCase( name.slice(5) );

							dataAttr( elem, name, data[ name ] );
						}
					}
					sjs._data( elem, "parsedAttrs", true );
				}
			}

			return data;
		}

		// Sets multiple values
		if ( typeof key === "object" ) {
			return this.each(function() {
				sjs.data( this, key );
			});
		}

		return arguments.length > 1 ?

			// Sets one value
			this.each(function() {
				sjs.data( this, key, value );
			}) :

			// Gets one value
			// Try to fetch any internally stored data first
			elem ? dataAttr( elem, key, sjs.data( elem, key ) ) : null;
	},

	removeData: function( key ) {
		return this.each(function() {
			sjs.removeData( this, key );
		});
	}
});

function dataAttr( elem, key, data ) {
	// If nothing was found internally, try to fetch any
	// data from the HTML5 data-* attribute
	if ( data === undefined && elem.nodeType === 1 ) {

		var name = "data-" + key.replace( rmultiDash, "-$1" ).toLowerCase();

		data = elem.getAttribute( name );

		if ( typeof data === "string" ) {
			try {
				data = data === "true" ? true :
					data === "false" ? false :
					data === "null" ? null :
					// Only convert to a number if it doesn't change the string
					+data + "" === data ? +data :
					rbrace.test( data ) ? sjs.parseJSON( data ) :
						data;
			} catch( e ) {}

			// Make sure we set the data so it isn't changed later
			sjs.data( elem, key, data );

		} else {
			data = undefined;
		}
	}

	return data;
}

// checks a cache object for emptiness
function isEmptyDataObject( obj ) {
	var name;
	for ( name in obj ) {

		// if the public data object is empty, the private is still empty
		if ( name === "data" && sjs.isEmptyObject( obj[name] ) ) {
			continue;
		}
		if ( name !== "toJSON" ) {
			return false;
		}
	}

	return true;
}
sjs.extend({
	queue: function( elem, type, data ) {
		var queue;

		if ( elem ) {
			type = ( type || "fx" ) + "queue";
			queue = sjs._data( elem, type );

			// Speed up dequeue by getting out quickly if this is just a lookup
			if ( data ) {
				if ( !queue || sjs.isArray(data) ) {
					queue = sjs._data( elem, type, sjs.makeArray(data) );
				} else {
					queue.push( data );
				}
			}
			return queue || [];
		}
	},

	dequeue: function( elem, type ) {
		type = type || "fx";

		var queue = sjs.queue( elem, type ),
			startLength = queue.length,
			fn = queue.shift(),
			hooks = sjs._queueHooks( elem, type ),
			next = function() {
				sjs.dequeue( elem, type );
			};

		// If the fx queue is dequeued, always remove the progress sentinel
		if ( fn === "inprogress" ) {
			fn = queue.shift();
			startLength--;
		}

		hooks.cur = fn;
		if ( fn ) {

			// Add a progress sentinel to prevent the fx queue from being
			// automatically dequeued
			if ( type === "fx" ) {
				queue.unshift( "inprogress" );
			}

			// clear up the last queue stop function
			delete hooks.stop;
			fn.call( elem, next, hooks );
		}

		if ( !startLength && hooks ) {
			hooks.empty.fire();
		}
	},

	// not intended for public consumption - generates a queueHooks object, or returns the current one
	_queueHooks: function( elem, type ) {
		var key = type + "queueHooks";
		return sjs._data( elem, key ) || sjs._data( elem, key, {
			empty: sjs.Callbacks("once memory").add(function() {
				sjs._removeData( elem, type + "queue" );
				sjs._removeData( elem, key );
			})
		});
	}
});

sjs.fn.extend({
	queue: function( type, data ) {
		var setter = 2;

		if ( typeof type !== "string" ) {
			data = type;
			type = "fx";
			setter--;
		}

		if ( arguments.length < setter ) {
			return sjs.queue( this[0], type );
		}

		return data === undefined ?
			this :
			this.each(function() {
				var queue = sjs.queue( this, type, data );

				// ensure a hooks for this queue
				sjs._queueHooks( this, type );

				if ( type === "fx" && queue[0] !== "inprogress" ) {
					sjs.dequeue( this, type );
				}
			});
	},
	dequeue: function( type ) {
		return this.each(function() {
			sjs.dequeue( this, type );
		});
	},
	// Based off of the plugin by Clint Helfers, with permission.
	// http://blindsignals.com/index.php/2009/07/jquery-delay/
	delay: function( time, type ) {
		time = sjs.fx ? sjs.fx.speeds[ time ] || time : time;
		type = type || "fx";

		return this.queue( type, function( next, hooks ) {
			var timeout = setTimeout( next, time );
			hooks.stop = function() {
				clearTimeout( timeout );
			};
		});
	},
	clearQueue: function( type ) {
		return this.queue( type || "fx", [] );
	},
	// Get a promise resolved when queues of a certain type
	// are emptied (fx is the type by default)
	promise: function( type, obj ) {
		var tmp,
			count = 1,
			defer = sjs.Deferred(),
			elements = this,
			i = this.length,
			resolve = function() {
				if ( !( --count ) ) {
					defer.resolveWith( elements, [ elements ] );
				}
			};

		if ( typeof type !== "string" ) {
			obj = type;
			type = undefined;
		}
		type = type || "fx";

		while( i-- ) {
			tmp = sjs._data( elements[ i ], type + "queueHooks" );
			if ( tmp && tmp.empty ) {
				count++;
				tmp.empty.add( resolve );
			}
		}
		resolve();
		return defer.promise( obj );
	}
});
var nodeHook, boolHook,
  rclass = /[\t\r\n]/g,
  rreturn = /\r/g,
  rfocusable = /^(?:input|select|textarea|button|object)$/i,
  rclickable = /^(?:a|area)$/i,
  rboolean = /^(?:checked|selected|autofocus|autoplay|async|controls|defer|disabled|hidden|loop|multiple|open|readonly|required|scoped)$/i,
  ruseDefault = /^(?:checked|selected)$/i,
  getSetAttribute = sjs.support.getSetAttribute,
  getSetInput = sjs.support.input;

sjs.fn.extend({
	
  /**
   *设置获取元素属性
   *@method 
   *@param {String} name
   *@param {String} value
   *@return {sjs}
   */
  attr: function( name, value ) {
    return sjs.access( this, sjs.attr, name, value, arguments.length > 1 );
  },

  /**
   *删除设置的属性
   *@method 
   *@param {String} name
   *@returns {sjs}
   */
  removeAttr: function( name ) {
    return this.each(function() {
      sjs.removeAttr( this, name );
    });
  },

  /**
   *对于某些Boolean型的属性prop方法获取属性则统一返回true和false，其他的同attr，如果你对attr的返回结果不满意，可以试试prop
   *@method 
   *@param {String} name
   *@param {String} value
   *@return {sjs}
   */
  prop: function( name, value ) {
    return sjs.access( this, sjs.prop, name, value, arguments.length > 1 );
  },

  /**
   *删除设置的属性
   *@method 
   *@param {String} name
   *@returns {sjs}
   */
  removeProp: function( name ) {
    name = sjs.propFix[ name ] || name;
    return this.each(function() {
      // 防止一些内置属性被删除导致的异常
      try {
        this[ name ] = undefined;
        delete this[ name ];
      } catch( e ) {}
    });
  },

  /**
   * 为元素增加样式类名
   *@method 
   *@param {String} value
   *@returns {sjs}
   */
  addClass: function( value ) {
    var classes, elem, cur, clazz, j,
      i = 0,
      len = this.length,
      proceed = typeof value === "string" && value;

    if ( sjs.isFunction( value ) ) {
      return this.each(function( j ) {
        sjs( this ).addClass( value.call( this, j, this.className ) );
      });
    }

    if ( proceed ) {
      // 为优化压缩考虑
      classes = ( value || "" ).match( core_rnotwhite ) || [];

      for ( ; i < len; i++ ) {
        elem = this[ i ];
        cur = elem.nodeType === 1 && ( elem.className ?
          ( " " + elem.className + " " ).replace( rclass, " " ) :
          " "
        );

        if ( cur ) {
          j = 0;
          while ( (clazz = classes[j++]) ) {
            if ( cur.indexOf( " " + clazz + " " ) < 0 ) {
              cur += clazz + " ";
            }
          }
          elem.className = sjs.trim( cur );

        }
      }
    }

    return this;
  },

  /**
   * 删除元素增加样式类名（如果类名存在）\
   *@method 
   *@param {String} value
   *@return {sjs}
   */
  removeClass: function( value ) {
    var classes, elem, cur, clazz, j,
      i = 0,
      len = this.length,
      proceed = arguments.length === 0 || typeof value === "string" && value;

    if ( sjs.isFunction( value ) ) {
      return this.each(function( j ) {
        sjs( this ).removeClass( value.call( this, j, this.className ) );
      });
    }
    if ( proceed ) {
      classes = ( value || "" ).match( core_rnotwhite ) || [];

      for ( ; i < len; i++ ) {
        elem = this[ i ];
        cur = elem.nodeType === 1 && ( elem.className ?
          ( " " + elem.className + " " ).replace( rclass, " " ) :
          ""
        );

        if ( cur ) {
          j = 0;
          while ( (clazz = classes[j++]) ) {
            // Remove *all* instances
            while ( cur.indexOf( " " + clazz + " " ) >= 0 ) {
              cur = cur.replace( " " + clazz + " ", " " );
            }
          }
          elem.className = value ? sjs.trim( cur ) : "";
        }
      }
    }

    return this;
  },

  /**
   * 如果元素的样式类名存在则，删除元素增加样式类名（如果类名存在），否则添加该样式类名。如果指定第二个参数，则表示true只做添加操作，false只做删除操作
   *@method 
   *@param {String} value
   *@param {Boolean} stateVal true只做添加操作，false只做删除操作
   *@return {sjs}
   */
  toggleClass: function( value, stateVal ) {
    var type = typeof value,
      isBool = typeof stateVal === "boolean";

    if ( sjs.isFunction( value ) ) {
      return this.each(function( i ) {
        sjs( this ).toggleClass( value.call(this, i, this.className, stateVal), stateVal );
      });
    }

    return this.each(function() {
      if ( type === "string" ) {
        //去换单独的类名
        var className,
          i = 0,
          self = sjs( this ),
          state = stateVal,
          classNames = value.match( core_rnotwhite ) || [];

        while ( (className = classNames[ i++ ]) ) {
          // 检查空格分隔的class名
          state = isBool ? state : !self.hasClass( className );
          self[ state ? "addClass" : "removeClass" ]( className );
        }

      // 切换整个class名
      } else if ( type ===typeof undefined || type === "boolean" ) {
        if ( this.className ) {
          // store className if set
          sjs._data( this, "__className__", this.className );
        }

        // 如果元素本身有class名，或我们传递了false
        // 清空class属性。
        // 如果传递了空字符串，则把之前存起来的class，再赋给它
        // 如果之前没有存任何class，则赋空字符串给他
        this.className = this.className || value === false ? "" : sjs._data( this, "__className__" ) || "";
      }
    });
  },

  /**
   *  样式类名是否存在
   * @method
   * @param {String} selector 类名
   * @return {Boolean}
   **/
  hasClass: function( selector ) {
    var className = " " + selector + " ",
      i = 0,
      l = this.length;
    for ( ; i < l; i++ ) {
      if ( this[i].nodeType === 1 && (" " + this[i].className + " ").replace(rclass, " ").indexOf( className ) >= 0 ) {
        return true;
      }
    }
    return false;
  },

  /**
   * 获取、设置input，textarea，select等元素的value值
   * @method
   * @param {String|null} value null表示获取value，Stirng则表示设置value值 
   * @return {String} 
   */
  val: function( value ) {
    var ret, hooks, isFunction,
      elem = this[0];
    //获取value值
    if ( !arguments.length ) {
      if ( elem ) {
        //修正select，option的vlaue值的set和get函数
        hooks = sjs.valHooks[ elem.type ] || sjs.valHooks[ elem.nodeName.toLowerCase() ];
        //修正成功则直接返回修正后的方式获取的结果
        if ( hooks && "get" in hooks && (ret = hooks.get( elem, "value" )) !== undefined ) {
          return ret;
        }
        //直接取value值
        ret = elem.value;

        return typeof ret === "string" ?
          // handle most common string cases
          ret.replace(rreturn, "") :
          // 返回空字符串或原来的number
          ret == null ? "" : ret;
      }

      return;
    }
    
    isFunction = sjs.isFunction( value );
    
    //设置value值
    return this.each(function( i ) {
      var val,
        self = sjs(this);

      if ( this.nodeType !== 1 ) {
        return;
      }

      if ( isFunction ) {
        val = value.call( this, i, self.val() );
      } else {
        val = value;
      }

      // 把null/nudefined变为“”，number变为String
      if ( val == null ) {
        val = "";
      } else if ( typeof val === "number" ) {
        val += "";
      } else if ( sjs.isArray( val ) ) {
        val = sjs.map(val, function ( value ) {
          return value == null ? "" : value + "";
        });
      }

      hooks = sjs.valHooks[ this.type ] || sjs.valHooks[ this.nodeName.toLowerCase() ];

      // 如果代理seting失败则使用原生的 value=value方式
      if ( !hooks || !("set" in hooks) || hooks.set( this, val, "value" ) === undefined ) {
        this.value = val;
      }
    });
  }
});

sjs.extend({
  /**
   *修正部分元素的getter、setter方法
   *
   */
  valHooks: {
    option: {
      get: function( elem ) {
        // attributes.value 在 Blackberry 4.7 中是undefined，但可以用.value 来获取
        var val = elem.attributes.value;
        return !val || val.specified ? elem.value : elem.text;
      }
    },
    select: {
      get: function( elem ) {
        var value, option,
          options = elem.options,
          index = elem.selectedIndex,
          one = elem.type === "select-one" || index < 0,
          values = one ? null : [],
          max = one ? index + 1 : options.length,
          i = index < 0 ?
            max :
            one ? index : 0;

        // 循环所有选中的option
        for ( ; i < max; i++ ) {
          option = options[ i ];

          // 老版本的ie在form 重置后不会修正select的值
          if ( ( option.selected || i === index ) &&
              // 当option为disable或所在group为disable时，该option无法被选中
              ( sjs.support.optDisabled ? !option.disabled : option.getAttribute("disabled") === null ) &&
              ( !option.parentNode.disabled || !sjs.nodeName( option.parentNode, "optgroup" ) ) ) {

            // 返回option的值
            value = sjs( option ).val();

            // 单选select返回单个值
            if ( one ) {
              return value;
            }

            // 多选的selecte 返回数组
            values.push( value );
          }
        }

        return values;
      },

      set: function( elem, value ) {
        var optionSet, option,
          options = elem.options,
          values = sjs.makeArray( value ),
          i = options.length;
        
        while ( i-- ) {
          option = options[ i ];
          if ( (option.selected = sjs.inArray( sjs(option).val(), values ) >= 0) ) {
            optionSet = true;
          }
        }
        
        // 当value不存在于selected option中时，强制select为非选中状态
        if ( !optionSet ) {
          elem.selectedIndex = -1;
        }
        return values;
      }
    }
  },

  /**
   *设置获取元素属性
   *@method dom元素
   *@param {nodeElemnt} elem
   *@param {String} name
   *@param {String} value
   *@return {sjs}
   */
  attr: function( elem, name, value ) {

    var hooks, notxml, ret,
      nType = elem.nodeType;
    // 不能在文本节点，注释，attribute节点上获取/设置属性
    if ( !elem || nType === 3 || nType === 8 || nType === 2 ) {
      return;
    }

    // 如果元素不支持getAttribute方法，则用prop方法试试
    if ( typeof elem.getAttribute ===typeof undefined ) {
      return sjs.prop( elem, name, value );
    }

    notxml =true;//= nType !== 1 || !sjs.isXMLDoc( elem );

    // 所有属性都是小写的（是吗？不会有bug吧！）
    if ( notxml ) {
      name = name.toLowerCase();
      
      //要设置的属性是否需要修正
    
      hooks = sjs.attrHooks[ name ]|| ( rboolean.test( name ) ? boolHook : nodeHook );
          //是不是这些boolean型的：checked|selected|autofocus|autoplay|async|controls|defer|disabled|hidden|loop|multiple|open|readonly|required|scoped
    }

    if ( value !== undefined ) {

      if ( value === null ) {
        sjs.removeAttr( elem, name );

      } else if ( hooks && notxml && "set" in hooks && (ret = hooks.set( elem, value, name )) !== undefined ) {

        return ret;

      } else {
        elem.setAttribute( name, value + "" );
        return value;
      }

    } else if ( hooks && notxml && "get" in hooks && (ret = hooks.get( elem, name )) !== null ) {
      return ret;

    } else {

      // IE9以上，flash 对象没有getAttribute方法
      if ( typeof elem.getAttribute !==typeof undefined ) {
        ret =  elem.getAttribute( name );
      }

      // 不存在的属性返回undfined
      return ret == null ?
        undefined :
        ret;
    }
  },

  /**
   *删除设置的属性
   *@method 
   *@param {nodeElemnt} elem
   *@param {String} value 属性名
   *@returns {sjs}
   */
  removeAttr: function( elem, value ) {
    var name, propName,
      i = 0,
      attrNames = value && value.match( core_rnotwhite );

    if ( attrNames && elem.nodeType === 1 ) {
      while ( (name = attrNames[i++]) ) {
        propName = sjs.propFix[ name ] || name;

        // boolean型的属性需要单独处理
        if ( rboolean.test( name ) ) {
          // 对boolean型的属性设置对应的 property 名字，比如checked，selected
          // 对老版本ie  清除错误的默认值
          if ( !getSetAttribute && ruseDefault.test( name ) ) {
            elem[ sjs.camelCase( "default-" + name ) ] =
              elem[ propName ] = false;
          } else {
            elem[ propName ] = false;
          }

        // See #9699 for explanation of this approach (setting first, then removal)
        } else {
          sjs.attr( elem, name, "" );
        }

        elem.removeAttribute( getSetAttribute ? name : propName );
      }
    }
  },

  /**
   * 对部分元素的attribute的getter、setter方法进行修正
   */
  attrHooks: {
    type: {
      set: function( elem, value ) {
        if ( !sjs.support.radioValue && value === "radio" && sjs.nodeName(elem, "input") ) {
          // ie6-9 在input的type被改变后，原有的value值无法保留而变成系统默认的，这就需要先存一起来，在设置type后再把value给它设置回去          
          var val = elem.value;
          elem.setAttribute( "type", value );
          if ( val ) {
            elem.value = val;
          }
          return value;
        }
      }
      // Use the value property for back compat
    // Use the nodeHook for button elements in IE6/7 (#1954)
    },
    value: {
      get: function( elem, name ) {
        if ( nodeHook && sjs.nodeName( elem, "button" ) ) {
          return nodeHook.get( elem, name );
        }
        return name in elem ?
          elem.value :
          null;
      },
      set: function( elem, value, name ) {
        if ( nodeHook && sjs.nodeName( elem, "button" ) ) {
          return nodeHook.set( elem, value, name );
        }
        // Does not return so that setAttribute is also used
        elem.value = value;
      }
    }
  },

  /**
   * 对元素的属性名与访问api进行 映射
   */
  propFix: {
    tabindex: "tabIndex",
    readonly: "readOnly",
    "for": "htmlFor",
    "class": "className",
    maxlength: "maxLength",
    cellspacing: "cellSpacing",
    cellpadding: "cellPadding",
    rowspan: "rowSpan",
    colspan: "colSpan",
    usemap: "useMap",
    frameborder: "frameBorder",
    contenteditable: "contentEditable"
  },

  /**
   *对于某些Boolean型的属性prop方法获取属性则统一返回true和false，其他的同attr，如果你对attr的返回结果不满意，可以试试prop
   *@method 
   *@param {nodeElemnt} elem
   *@param {String} name
   *@param {String} value
   *@return {sjs}
   */
  prop: function( elem, name, value ) {
    var ret, hooks, notxml,
      nType = elem.nodeType;

    // 文本节点，注释节点，属性节点无法get/set属性
    if ( !elem || nType === 3 || nType === 8 || nType === 2 ) {
      return;
    }

    notxml=true;

    if ( notxml ) {
      // 修正属性名
      name = sjs.propFix[ name ] || name;
      //使用修正后的代理来处理元素属性的get/set
      hooks = sjs.propHooks[ name ];
    }

    if ( value !== undefined ) {
      if ( hooks && "set" in hooks && (ret = hooks.set( elem, value, name )) !== undefined ) {
        return ret;

      } else {
        elem[ name ] = value;
        return value;
      }

    } else {
      if ( hooks && "get" in hooks && (ret = hooks.get( elem, name )) !== null ) {
        return ret;

      } else {
        return elem[ name ];
      }
    }
  },


  /**
   * 对部分元素的attribute的getter、setter方法进行修正
   */
  propHooks: {
    tabIndex: {
      get: function( elem ) {
        // tabIndex如果没有被明确设置，那么各个浏览器返回的可能完全不一样，下面链接有说明
        // http://fluidproject.org/blog/2008/01/09/getting-setting-and-removing-tabindex-values-with-javascript/
        var attributeNode = elem.getAttributeNode("tabindex");

        return attributeNode && attributeNode.specified ?
          parseInt( attributeNode.value, 10 ) :
          rfocusable.test( elem.nodeName ) || rclickable.test( elem.nodeName ) && elem.href ?
            0 :
            undefined;
      }
    }
  }
});

//修正布尔型属性的getter、setter方法
boolHook = {
  get: function( elem, name ) {   
  var attrNode,
      property = sjs.prop( elem, name );
    return property === true || typeof property !== "boolean" && ( attrNode = elem.getAttributeNode(name) ) && attrNode.nodeValue !== false ?
      name.toLowerCase() :
      undefined;
  },
  set: function( elem, value, name ) {
    var propName;
    if ( value === false ) {
      // Remove boolean attributes when set to false
      sjs.removeAttr( elem, name );
    } else {
      // value is true since we know at this point it's type boolean and not false
      // Set boolean attributes to the same name and set the DOM property
      propName = sjs.propFix[ name ] || name;
      if ( propName in elem ) {
        // Only set the IDL specifically if it already exists on the element
        elem[ propName ] = true;
      }

      elem.setAttribute( name, name.toLowerCase() );
    }
    return name;
  }
};

// 修正ie的 value attroperty
if ( !getSetInput || !getSetAttribute ) {
  sjs.attrHooks.value = {
    get: function( elem, name ) {
      var ret = elem.getAttributeNode( name );
      return (sjs.nodeName( elem, "input" )||sjs.nodeName( elem, "textarea" )) ?

        // 使用 defaultValue 代替value
        elem.defaultValue :

        ret && ret.specified ? ret.value : undefined;
    },
    set: function( elem, value, name ) {
      if ( sjs.nodeName( elem, "input" ) ) {
        // 直接设置input的value
        elem.defaultValue = value;
      } else {
        // 如果代理存在则使用代理进行设置
        return nodeHook && nodeHook.set( elem, value, name );
      }
    }
  };
}

// IE6/7 不支持某些attribute属性的set和get
if ( !getSetAttribute ) {

  // IE6/7中获取attribute节点的值，比如form的action
  nodeHook = sjs.valHooks.button = {
    get: function( elem, name ) {
      var ret = elem.getAttributeNode( name );
      return ret && ( name === "id" || name === "name" || name === "coords" ? ret.value !== "" : ret.specified ) ?
        ret.value :
        undefined;
    },
    set: function( elem, value, name ) {
      // 如果attribute节点不存在则创造一个
      var ret = elem.getAttributeNode( name );
      if ( !ret ) {
        elem.setAttributeNode(
          (ret = elem.ownerDocument.createAttribute( name ))
        );
      }

      ret.value = value += "";

      // 打破因为setAttribute产生的与克隆元素的引用关系
      return name === "value" || value === elem.getAttribute( name ) ?
        value :
        undefined;
    }
  };

  // 设置value为空字符串会抛出异常，设置为false
  sjs.attrHooks.contenteditable = {
    get: nodeHook.get,
    set: function( elem, value, name ) {
      nodeHook.set( elem, value === "" ? false : value, name );
    }
  };

  // 设置width/height时如果传入空字符串，则设置为auto
  sjs.each([ "width", "height" ], function( i, name ) {
    sjs.attrHooks[ name ] = sjs.extend( sjs.attrHooks[ name ], {
      set: function( elem, value ) {
        if ( value === "" ) {
          elem.setAttribute( name, "auto" );
          return value;
        }
      }
    });
  });
}


// IE中的一些属性名会跟正常的属性名有所不同，需要修正
// http://msdn.microsoft.com/en-us/library/ms536429%28VS.85%29.aspx
if ( !sjs.support.hrefNormalized ) {
  sjs.each([ "href", "src", "width", "height" ], function( i, name ) {
    sjs.attrHooks[ name ] = sjs.extend( sjs.attrHooks[ name ], {
      get: function( elem ) {
        var ret = elem.getAttribute( name, 2 );
        return ret == null ? undefined : ret;
      }
    });
  });

  // href/src应该返回路径全名
  sjs.each([ "href", "src" ], function( i, name ) {
    sjs.propHooks[ name ] = {
      get: function( elem ) {
        return elem.getAttribute( name, 4 );
      }
    };
  });
}

if ( !sjs.support.style ) {
  sjs.attrHooks.style = {
    get: function( elem ) {
      // 如果是空字符串返回undefined
      // 注意: IE 大写的css属性名,如果转成小写将破坏background中的url的大小写敏感
      return elem.style.cssText.toLowerCase() || undefined;
    },
    set: function( elem, value ) {
      elem.style.cssText = value + "";
      return  value + "";
    }
  };
}

//修正 Safari中 不能正常防护selectedIndex的问题
if ( !sjs.support.optSelected ) {
  sjs.propHooks.selected = sjs.extend( sjs.propHooks.selected, {
    get: function( elem ) {
      var parent = elem.parentNode;

      if ( parent ) {
        parent.selectedIndex;

        // 确定 optgroups存在时也能正常返回
        if ( parent.parentNode ) {
          parent.parentNode.selectedIndex;
        }
      }
      return null;
    }
  });
}

// IE6/7中定义 enctype encoding
if ( !sjs.support.enctype ) {
  sjs.propFix.enctype = "encoding";
}

// 重新定义Radio和 checkboxe的 getter/setter
if ( !sjs.support.checkOn ) {
  sjs.each([ "radio", "checkbox" ], function() {
    sjs.valHooks[ this ] = {
      get: function( elem ) {
        // 处理webkit中没有明确设置值返回“”的情况，应该返回on
        return elem.getAttribute("value") === null ? "on" : elem.value;
      }
    };
  });
}
sjs.each([ "radio", "checkbox" ], function() {
  sjs.valHooks[ this ] = sjs.extend( sjs.valHooks[ this ], {
    set: function( elem, value ) {
      if ( sjs.isArray( value ) ) {
        elem.checked = sjs.inArray( sjs(elem).val(), value ) >= 0;
        return elem.checked;
      }
    }
  });
});
/*
 * @file sina JavaScript事件模块
 * @author yihui1@staff.sina.com.cn
*/
/**
 * @module event
 * @main event
*/
/**
该事件对象遵循W3C标准实现，新对象的大部分属性都从原始的事件对象中取得。
我们可以在调用trigger方法时使用sjs.Event的构造函数

	//创建一个新的sjs.Event对象
	var e = sjs.Event('click');
	//触发事件
	sjs('body').trigger(e);


@class event
@constructor
@global
@param {string} types 事件名称
@param {object} obj 参数
@return {event} e 事件对象
*/
var rformElems = /^(?:input|select|textarea)$/i,
	rtypenamespace = /^([^.]*)(?:\.(.+)|)$/,
	rmouseEvent = /^(?:mouse|contextmenu)|click/,
	rkeyEvent = /^key/,
	rfocusMorph = /^(?:focusinfocus|focusoutblur)$/;

var returnFalse = function(){
	return false;
};
var returnTrue = function(){
	return true;
};
sjs.event = {
	global:{},
	add:function(elem,types,handler,data,selector){
		var type,
			origType,
			namespaces,
			special,
			elemData = sjs._data(elem),
			events,
			eventHandler,
			handlerObj,
			handlerObjIn,
			handlers;
		
		//不要添加事件到文本/注释节点上
		if(!elemData){
			return;
		}
		
		if(handler.handler){
			handlerObjIn = handler;
			handler = handlerObjIn.handler;
			selector = handlerObjIn.selector;
		}
		//确保每一个handler都有一个唯一的id
		if(!handler.guid){
			handler.guid = sjs.guid++;
		}

		//初始化元素事件列表
		if(!(events = elemData.events)){
			events = elemData.events = {};
		}
		
		//创建事件触发时的处理方法
		if(!(eventHandler = elemData.handler)){
			eventHandler = elemData.handler = function(e){
				return typeof sjs !== undefined && (!e || sjs.event.triggered !== e.type) ? sjs.event.dispatch.apply(eventHandler.elem,arguments) : undefined;
			};
			eventHandler.elem = elem;
		}

		//把多事件类型分成独立的事件类型
		//sjs(...).bind('mouseover mouseout',fn);
		types = (types || '').match(core_rnotwhite) || [''];
		var t = types.length;
		while(t--){
			//这里处理type为'click.alertTips'这样的情况
			var tmp = rtypenamespace.exec(types[t]) || [];
			type = origType = tmp[1];
			namespaces = (tmp[2] || '').split('.').sort();

			if(!type){
				continue;
			}
			
			//如果事件类型为特殊类型，使用特殊的事件处理方法
			special = sjs.event.special[type] || {};

			//如果定义selector，确定特殊事件api类型，否则用原始类型
			type = (selector ? special.delegateType : special.bindType) || type;

			//根据新类型重新定义特殊事件类型
			special = sjs.event.special[type] || {};

			//handlerObj会传递给所有的event handler
			handlerObj = sjs.extend({
				type:type,
				origType:origType,
				data:data,
				handler:handler,
				guid:handler.guid,
				selector:selector,
				needsContext:selector && sjs.expr.match.needsContext.test(selector),
				namespace:namespaces.join('.')
			},handlerObjIn);
			
			//初始化事件hanlder队列
			if(!(handlers = events[type])){
				handlers = events[type] = [];
				handlers.delegateCount = 0;

				//如果特殊的事件处理方法返回false仅使用addEventListener/attachEvent
				if(!special.setup || special.setup.call(elem,data,namespaces,eventHandler) === false){
					if(elem.addEventListener){
						elem.addEventListener(type,eventHandler,false);
					}else if(elem.attachEvent){
						elem.attachEvent('on' + type,eventHandler);
					}
				}
			}
			if(special.add){
				special.add.call(elem,handlerObj);
				if(!handlerObj.handler.guid){
					handlerObj.handler.guid = handler.guid;
				}
			}
			if(selector){
				//添加handlerObj到delegateCount的前面
				handlers.splice(handlers.delegateCount++,0,handlerObj);
			}else{
				handlers.push(handlerObj);
			}
			//持续跟踪那个事件被使用过
			sjs.event.global[type] = true;
		}
		elem = null;
	},
	remove:function(elem,types,handler,selector,mappedTypes){
		var j,
			type,
			origType,
			origCount,
			tmp,
			namespaces,
			special,
			handlers,
			handlerObj,
			events,
			elemData = sjs.hasData(elem) && sjs._data(elem);

		if(!elemData || !(events = elemData.events)){
			return;
		}

		types = (types || '').match(core_rnotwhite) || [''];
		var t = types.length;
		while(t--){
			tmp = rtypenamespace.exec(types[t]) || [];
			type = origType = tmp[1];
			namespaces = (tmp[2] || '').split('.').sort();

			//如果没有类型传入就默认删除所有绑定的事件
			if(!type){
				for(type in events){
					sjs.event.remove(elem,type+types[t],handler,selector,true);
				}
				continue;
			}

			special = sjs.event.special[type] || {};
			type = (selector ? special.delegateType : special.bindType) || type;
			handlers = events[type] || [];
			tmp = tmp[2] && new RegExp( "(^|\\.)" + namespaces.join("\\.(?:.*\\.|)") + "(\\.|$)" );

			//删除匹配到的事件
			origCount = j = handlers.length;
			while(j--){
				handlerObj = handlers[j];
				if((mappedTypes || origType === handlerObj.origType) && 
					(!handler || handler.guid === handlerObj.guid) && 
					(!tmp || tmp.test(handlerObj.namespace)) && 
					(!selector || selector === handlerObj.selector || selector === '**' && handlerObj.selector)){
						handlers.splice(j,1);
						if(handlerObj.selector){
							handlers.delegateCount--;
						}
						if(special.remove){
							special.remove.call(elem,handlerObj);
						}
				}
			}
			if(origCount && !handlers.length){
				if(!special.teardown || special.teardown.call(elem,namespaces,elemData.handler) === false){
					sjs.removeEvent(elem,type,elemData.handler);
				}
				delete events[type];
			}
		}

		if(sjs.isEmptyObject(events)){
			delete elemData.handler;
			sjs._removeData(elem,'events');
		}
	},
	fix:function(event){
		if(event[sjs.expando]){
			return event;
		}

		var copy,
			type = event.type,
			originalEvent = event,
			fixHook = this.fixHooks[type];
		//处理鼠标和键盘的兼容性问题
		if(!fixHook){
			fixHook = this.fixHooks[type] = 
				rmouseEvent.test(type) ? this.mouseHooks : 
				rkeyEvent.test(type) ? this.keyHooks :
				{};
		}
		copy = fixHook.props ? this.props.concat(fixHook.props) : this.props;
		event = new sjs.Event(originalEvent);

		var i = copy.length;
		while(i--){
			var prop = copy[i];
			event[prop] = originalEvent[prop];
		}
		
		//支持：IE<9
		//修正IE下target属性
		if(!event.target){
			event.target = originalEvent.srcElement || document;
		}

		//支持：chrome 23+, safari?
		//target不能是文本节点
		if(event.target.nodeType === 3){
			event.target = event.target.parentNode;
		}

		//支持：IE<9
		//mouse/key事件,metaKey == false如果它是undefined
		event.metaKey = !!event.metaKey;

		return fixHook.filter ? fixHook.filter(event,originalEvent) : event;
	},
	fixHooks:{},
	//需要暴漏给创建的event使用的一些属性
	props:'altKey bubbles cancelable ctrlKey currentTarget eventPhase metaKey relatedTarget shiftKey target timeStamp view which'.split(' '),
	//针对鼠标事件的一些兼容性处理
	mouseHooks:{
		props:'button buttons clientX clientY fromElement offsetX offsetY pageX pageY screenX screenY toElement'.split(' '),
		filter:function(event,original){
			var body,
				eventDoc,
				doc,
				button = original.button,
				fromElement = original.fromElement;
			
			//计算缺少pageX/Y，但clientX/Y有效的时候
			if(event.pageX == null && original.clientX != null){
				eventDoc = event.target.ownerDocument || document;
				doc = eventDoc.documentElement;
				body = eventDoc.body;

				event.pageX = original.clientX + 
					(doc && doc.scrollLeft || body && body.scrollLeft || 0) -
					(doc && doc.clientLeft || body && body.clientLeft || 0);
				event.pageY = original.clientY +
					(doc && doc.scrollTop || body && body.scrollTop || 0) - 
					(doc && doc.clientTop || body && body.clientTop || 0);
			}

			//添加relatedTarget
			if(!event.relatedTarget){
				event.relatedTarget = fromElement === event.target ? original.toElement : fromElement;
			}

			//鼠标按键：1 === left; 2 === middle; 3 === right
			if(!event.which && button !== undefined){
				event.which = (button & 1 ? 1 : (button & 2 ? 3 : (button & 4 ? 2 : 0)));
			}
			return event;
		}
	},
	//针对键盘事件的兼容性处理
	keyHooks:{
		props:'char charCode key keyCode'.split(' '),
		filter:function(event,original){
			if(event.which == null){
				event.which = original.charCode != null ? original.charCode : original.keyCode;
			}
			return event;
		}
	},
	dispatch:function(event){
		//创建一个可写的sjs.Event替换原生event
		event = sjs.event.fix(event);

		var args = core_slice.call(arguments),
			matched,
			handlerObj,
			handlerQueue = [],
			handlers = (sjs._data(this,'events') || {})[event.type] || [],
			special = sjs.event.special[event.type] || {};
		
		//使用修复后的sjs.Event替换原生event
		args[0] = event;
		event.delegateTarget = this;
		
		if(special.preDispatch && special.preDispatch.call(this,event) === false){
			return;
		}
		//这里创建执行队列
		handlerQueue = sjs.event.handlers.call(this,event,handlers);
		
		//执行代理
		var i = 0;
		while((matched = handlerQueue[i++]) && !event.isPropagationStopped()){
			event.currentTarget = matched.elem;

			var j = 0;
			while((handlerObj = matched.handlers[j++]) && !event.isImmediatePropagationStopped()){
				if(!event.namespace_re || event.namespace_re.test(handlerObj.namespace)){
					event.handlerObj = handlerObj;
					event.data = handlerObj.data;
					//这里执行具体的回调
					var ret = ((sjs.event.special[handlerObj.origType] || {}).handler || handlerObj.handler).apply(matched.elem,args);

					if(ret !== undefined){
						//这里阻止默认事件
						if((event.result = ret) === false){
							event.preventDefault();
							event.stopPropagation();
						}
					}
				}
			}
		}

		if(special.postDispatch){
			special.postDispatch.call(this,event);
		}
		return event.result;
	},
	handlers:function(event,handlers){
		var selector,
			matches,
			handlerObj,
			handlerQueue = [],
			delegateCount = handlers.delegateCount,
			target = event.target;
		
		//找到代理handlers
		if(delegateCount && target.nodeType && (!event.button || event.type !== 'click')){
			//模拟不断向上冒泡的过程
			for(;target != this;target = target.parentNode || this){
				if(target.nodeType === 1 && (target.disabled !== true || event.type !== 'click')){
					matches = [];

					for(var i=0;i<delegateCount;i++){
						handlerObj = handlers[i];

						selector = handlerObj.selector + ' ';

						if(matches[selector] === undefined){
							matches[selector] = handlerObj.needsContext ?
								sjs(selector,this).index(target) >= 0 :
								sjs.find(selector,this,null,[target]).length;
						}

						if(matches[selector]){
							matches.push(handlerObj);
						}
					}
					if(matches.length){
						handlerQueue.push({elem:target,handlers:matches});
					}
				}
			}
		}

		if(delegateCount < handlers.length){
			handlerQueue.push({elem:this,handlers:handlers.slice(delegateCount)});
		}
		return handlerQueue;
	},
	trigger:function(event,data,elem,onlyHandlers){
		var handler,
			cur,
			special,
			tmp,
			bubbleType,
			eventPath = [elem || document],
			type = core_hasOwn.call(event,'type') ? event.type : event,
			namespaces = core_hasOwn.call(event,'namespace') ? event.namespace.split('.') : [];

		cur = tmp = elem = elem || document;

		//不要在文本和注释节点上触发事件
		if(elem.nodeType === 3 || elem.nodeType === 8){
			return;
		}

		//focus/blur转换为focusin/out;确保我们现在不触发它们
		if(rfocusMorph.test(type + sjs.event.triggered)){
			return;
		}

		if(type.indexOf('.') >= 0){
			//触发namespace
			namespaces = type.split('.');
			type = namespaces.shift();
			namespaces.sort();
		}

		var ontype = type.indexOf(':') < 0 && 'on' + type;
		
		event = event[sjs.expando] ? 
				event:
				new sjs.Event(type,typeof event === 'object' && event);
		
		event.isTrigger = true;
		event.namespace = namespaces.join('.');
		event.namespace_re = event.namespace ? 
			new RegExp( "(^|\\.)" + namespaces.join("\\.(?:.*\\.|)") + "(\\.|$)" ) :
			null;

		//如果使用过就清理event
		event.result = undefined;
		if(!event.target){
			event.target = elem;
		}

		//克隆所有进来的数据和事件，创建参数列表
		data = data == null ? 
			[event] :
			sjs.makeArray(data,[event]);

		//special事件单独执行
		special = sjs.event.special[type] || {};
		if(!onlyHandlers && special.trigger && special.trigger.apply(elem,data) === false){
			return;
		}

		//创建事件冒泡路径
		//先冒泡到document，然后到window
		if(!onlyHandlers && !special.noBubble && !sjs.isWindow(elem)){
			bubbleType = special.delegateType || type;

			if(!rfocusMorph.test(bubbleType + type)){
				cur = cur.parentNode;
			}
			for(;cur;cur = cur.parentNode){
				eventPath.push(cur);
				tmp = cur;
			}

			if(tmp === (elem.ownerDocument || document)){
				eventPath.push(tmp.defaultView || tmp.parentWindow || window);
			}
		}
		
		//在event路径上触发事件
		var i = 0;
		while((cur = eventPath[i++]) && !event.isPropagationStopped()){
			event.type = i > 1 ?
				bubbleType :
				special.bindType || type;

			handler = (sjs._data(cur,'events') || {})[event.type] && sjs._data(cur,'handler');
			
			//sjs handler
			if(handler){
				handler.apply(cur,data);
			}

			//原生handler
			handler = ontype && cur[ontype];
			if(handler && sjs.acceptData(cur) && handler.apply && handler.apply(cur,data) === false){
				event.preventDefault();
			}
		}

		event.type = type;

		//如果没有阻止默认事件就执行默认事件
		if(!onlyHandlers && !event.isDefaultPrevented()){
			if((!special._default || special._default.apply(elem.ownerDocument,data) === false) && !(type === 'click' && sjs.nodeName(elem,'a')) && sjs.acceptData(elem)){
				if(ontype && elem[type] && !sjs.isWindow(elem)){
					tmp = elem[ontype];
					if(tmp){
						elem[ontype] = null;
					}
					sjs.event.triggered = type;
					try{
						elem[type]();
					}catch(e){}
					sjs.event.triggered = undefined;

					if(tmp){
						elem[ontype] = tmp;
					}
				}
			}
		}
		return event.result;
	},
	special:{
		load:{
			//阻止image.load方法冒泡到window.load
			noBubble:true
		},
		click:{
			//处理checkbox,触发原生事件来保证checked状态正确
			trigger:function(){
				if(sjs.nodeName(this,'input') && (this.type === 'checkbox' || this.type === 'radio') && this.click){
					this.click();
					return false;
				}
			}
		},
		focus:{
			trigger:function(){
				//触发原生focus事件
				if(this !== document.activeElement && this.focus){
					try{
						this.focus();
						return false;
					}catch(e){}
				}
			},
			delegateType:'focusin'
		},
		blur:{
			trigger:function(){
				//触发原生blur事件
				if(this !== document.activeElement && this.blur){
					try{
						this.blur();
						return false;
					}catch(e){}
				}
			},
			delegateType:'focusout'
		},
		beforeunload:{
			postDispatch:function(event){
				//即使returnValue === undefined firefox仍然显示alert
				if(event.result !== undefined){
					event.originalEvent.returnValue = event.result;
				}
			}
		}
	},
	//这里用做模拟事件
	simulate:function(type,elem,event,bubble){
		var e = sjs.extend(
			new sjs.Event(),
			event,
			{
				type:type,
				isSimulate:true,
				originalEvent:{}
			}
		);

		if(bubble){
			sjs.event.trigger(e,null,elem);
		}else{
			sjs.event.dispatch.call(elem,e);
		}
		if(e.isDefaultPrevented()){
			event.preventDefault();
		}
	}
};
sjs.removeEvent = document.addEventListener ? 
	function(elem,type,handler){
		if(elem.removeEventListener){
			elem.removeEventListener(type,handler,false);
		}
	}:
	function(elem,type,handler){
		var name = 'on' + type;
		if(elem.detachEvent){
			if(typeof elem[name] === typeof undefined){
				elem[name] = null;
			}
			elem.detachEvent(name,handler);
		}
	};
//使用mouseover/mouseout事件来模拟mouseenter/leave
sjs.each({
	mouseenter:'mouseover',
	mouseleave:'mouseout'
},function(orig,fix){
	sjs.event.special[orig] = {
		delegateType:fix,
		bindType:fix,
		handler:function(event){
			var ret,
				target = this,
				related = event.relatedTarget,
				handlerObj = event.handlerObj;
			
			//当related元素不存在并且与target不存在包含关系时执行handler
			//模拟第一次进入时的情况
			if(!related || (related !== target && !sjs.contains(target,related))){
				event.type = handlerObj.origType;
				ret = handlerObj.handler.apply(this,arguments);
				event.type = fix;
			}
			return ret;
		}
	};
});

//IE6-8 submit冒泡模拟
if(!sjs.support.submitBubbles){
	sjs.event.special.submit = {
		setup:function(){
			//只有使用事件代理时才触发冒泡
			if(sjs.nodeName(this,'form')){
				return false;
			}
			
			//添加一个submit回调，因为子节点的form可能会触发submit事件
			sjs.event.add(this,'click._submit keypress._submit',function(e){
				var elem = e.target,
					form = sjs.nodeName(elem,'input') || sjs.nodeName(elem,'button') ? elem.form : undefined;

				if(form && !sjs._data(form,'submitBubbles')){
					sjs.event.add(form,'submit._submit',function(event){
						event._submit_bubble = true;
					});
					sjs._data(form,'submitBubbles',true);
				}
			});
		},
		postDispatch:function(event){
			//手动触发form的submit事件,向上冒泡
			if(event._submit_bubble){
				delete event._submit_bubble;
				if(this.parentNode && !event.isTrigger){
					sjs.event.simulate('submit',this.parentNode,event,true);
				}
			}
		},
		teardown:function(){
			if(sjs.nodeName(this,'form')){
				return false;
			}
			sjs.event.remove(this,'._submit');
		}
	};
}

//focus/blur冒泡模拟
if(!sjs.support.focusinBubbles){
	sjs.each({
		focus:'focusin',
		blur:'focusout'
	},function(orig,fix){
		var attaches = 0;
		var handler = function(event){
			sjs.event.simulate(fix,event.target,sjs.event.fix(event),true);
		};

		sjs.event.special[fix] = {
			setup:function(){
				if(attaches++ === 0){
					document.addEventListener(orig,handler,true);
				}
			},
			teardown:function(){
				if(--attaches === 0){
					document.removeEventListener(orig,handler,true);
				}
			}
		};
	});
}

//IE checkbox/radio change事件冒泡模拟
if(!sjs.support.changeBubbles){
	sjs.event.special.change = {
		setup:function(){
			if(rformElems.test(this.nodeName)){
				//直到blur之前IE不会触发check/radio的change事件
				//这里在触发prototypechange之后用click触发
				//在special.change.handler里处理blur-change的影响
				//在check/radio的blur事件触发之后仍然会触发onchange事件
				if(this.type === 'checkbox' || this.type === 'radio'){
					sjs.event.add(this,'propertychange._change',function(event){
						if(event.originalEvent.propertyName === 'checked'){
							this._just_changed = true;
						}
					});
					sjs.event.add(this,'click._change',function(event){
						if(this._just_changed && !event.isTrigger){
							this._just_changed = false;
						}
						//允许triggered,模拟change事件
						sjs.event.simulate('change',this,event,true);
					});
				}
				return false;
			}
			//处理事件代理部分
			sjs.event.add(this,'beforeactivate._change',function(e){
				var elem = e.target;
				if(rformElems.test(elem.nodeName) && !sjs._data(elem,'changeBubbles')){
					sjs.event.add(elem,'change._change',function(event){
						if(this.parentNode && !event.isSimulated && !event.isTrigger){
							sjs.event.simulate('change',this.parentNode,event,true);
						}
					});
					sjs._data(elem,'changeBubbles',true);
				}
			});
		},
		handler:function(event){
			var elem = event.target;
			//过滤掉checkbox/radio的change事件，因为前面已经触发过了
			if(this !== elem || event.isSimulated || event.isTrigger || (elem.type !== 'radio' && elem.type !== 'checkbox')){
				return event.handlerObj.handler.apply(this,arguments);
			}
		},
		teardown:function(){
			sjs.event.remove(this,'._change');
			return !rformElems.test(this.nodeName);
		}
	};
}
/**
在事件冒泡阶段的当前DOM元素
@attribute currentTarget
@static
@example
	$('p').click(function(e){
		console.log(e.currentTarget === this);//true
	});
*/

/**
当事件回调执行时作为参数传递的数据对象
@attribute data
@static
@example
	for(var i=0;i<3;i++){
		$('button').eq(i).on('click',{value:i},function(e){
			console.log(e.data.value);//0,1,2
		});
	}
*/

/**
当前事件代理的元素
@attribute delegateTarget
@static
@example
	$('.box').on('click','button',function(e){
		$(e.delegateTarget).css('background-color','red');
	});
*/

/**
确认当事件触发时metaKey是否被按下
@attribute metaKey
@static
@example
	$('#checkMetaKey').click(function(e){
		console.log(e.metaKey);
	});
*/

/**
已经触发事件的名称
@attribute namespace
@static
@example
	$('p').on('test.something',function(e){
		console.log(e.namespace);//something
	});
	$('p').trigger('test.something');
*/

/**
鼠标距离文档左边的距离
@attribute pageX
@static
@example
	$(document).on('mousemove',function(e){
		console.log('e.pageX: ' + e.pageX);
	});
*/

/**
鼠标距离文档上边的距离
@attribute pageY
@static
@example
	$(document).on('mousemove',function(e){
		console.log('e.pageY: ' + e.pageY);
	});
*/

/**
与当前事件有关的其他DOM元素
例如当mouseout的时候，该元素为即将进入的元素，当mouseover的时候，该元素为即将离开的元素
@attribute relatedTarget
@static
@example
	$('a').mouseout(function(e){
		console.log(e.relatedTarget.nodeName);//div
	});
*/

/**
当事件触发后除undefined之外最后的返回值
@attribute result
@static
@example
	$('button').click(function(){
		return 'ok';
	});
	$('button').click(function(e){
		console.log(e.result);//ok
	});
*/

/**
触发绑定事件的DOM元素
@attribute target
@static
@example
	$('body').click(function(e){
		console.log(e.target.nodeName);
	});
*/

/**
描述事件的类型
@attribute type
@static
@example
	$('a').click(function(e){
		console.log(e.type);//click
	});
*/

/**
专为按键或鼠标事件
按键或鼠标按下时候的值
@attribute which
@static
@example
	$('#whichkey').on('keydown',function(e){
		console.log(e.which);//keyCode
	});
	$('#whichkey').on('mousedown',function(e){
		console.log(e.which);//mousebutton
	});
*/
sjs.Event = function(src,props){
	//允许不使用来new实例化
	if(!(this instanceof sjs.Event)){
		return new sjs.Event(src,props);
	}

	//事件对象
	if(src && src.type){
		this.originalEvent = src;
		this.type = src.type;

		//事件冒泡有可能会被阻止，这里需要返回正确的值
		this.isDefaultPrevented = (src.defaultPrevented || src.returnValue === false) ? returnTrue : returnFalse;
	}else{
		this.type = src;
	}

	//把其余的参数放到event对象上
	if(props){
		sjs.extend(this,props);
	}
	
	//创建时间戳
	this.timeStamp = src && src.timeStamp || sjs.now;

	//标记为fixed
	this[sjs.expando] = true;
};
//基于DOM3 Event
//http://www.w3.org/TR/2003/WD-DOM-Level-3-Events-20030331/ecma-script-binding.html
sjs.Event.prototype = {
	/**
	确认event.preventDefault()方法是否已经被调用
	@method isDefaultPrevented
	@return {boolean} true/false
	@example
		$('a').click(function(e){
			console.log(e.isDefaultPrevented());//false
			e.preventDefault();
			console.log(e.isDefaultPrevented());//true
		})
	*/
	isDefaultPrevented:returnFalse,
	/**
	确认event.isPropagationStopped()方法是否被调用
	@method isPropagationStopped
	@return {boolean} true/false
	@example
		$('a').click(function(e){
			console.log(e.isPropagationStopped());//false
			e.stopPropagation();
			console.log(e.isPropagationStopped());//true
		})
	*/
	isPropagationStopped:returnFalse,
	/**
	确认event.isImmediatePropagationStopped()方法是否被调用
	@method isImmediatePropagationStopped
	@return {boolean} true/false
	@example
		$('a').click(function(e){
			console.log(e.isImmediatePropagationStopped());//false
			e.stopImmediatePropagation();
			console.log(e.isImmediatePropagationStopped());//true
		})
	*/
	isImmediatePropagationStopped:returnFalse,
	/**
	阻止默认事件
	@method preventDefault
	@example
		$('a').click(function(e){
			e.preventDefault();
		});
	*/
	preventDefault:function(){
		var e = this.originalEvent;

		this.isDefaultPrevented = returnTrue;
		if(!e){
			return;
		}

		if(e.preventDefault){
			e.preventDefault();
		}else{
			e.returnValue = false;
		}
	},
	/**
	阻止冒泡
	@method stopPropagation
	@example
		$('p').click(function(e){
			e.stopPropagation();
		});
	*/
	stopPropagation:function(){
		var e = this.originalEvent;

		this.isPropagationStopped = returnTrue;
		if(!e){
			return;
		}

		if(e.stopPropagation){
			e.stopPropagation();
		}else{
			e.cancelBubble = true;
		}
	},
	/**
	让剩余的事件回调变为已执行并阻止冒泡
	@method stopImmediatePropagation
	@example
		<body>
			<p>paragraph</p>
			<div>division</div>
		</body>
		<script>
			$('p').click(function(e){
				e.stopImmediatePropagation();
			});
			$('p').click(function(e){
				//这个function不会执行
			});
			$('div').click(function(){
				//这个方法会执行
			});
		</script>
	*/
	stopImmediatePropagation:function(){
		this.isImmediatePropagationStopped = returnTrue;
		this.stopPropagation();
	}
};

sjs.fn.extend({
	on:function(types,selector,data,fn,/*内部使用*/one){
		var type,origFn;
		
		//处理types类型是类似{'click':fn}这样的
		if(typeof types === 'object'){
			if(typeof selector !== 'string'){
				data = data || selector;
				selector = undefined;
			}
			for(type in types){
				this.on(type,selector,data,types[type],one);
			}
			return this;
		}

		//node.on('click',function(){})
		if(data == null && fn == null){
			fn = selector;
			data = selector = undefined;
		}else if(fn == null){
			//node.on('click','div > p',function(){})
			if(typeof selector === 'string'){
				fn = data;
				data = undefined;
			}else{
			//node.on('click',{foo:'bar'},function(){})
				fn = data;
				data = selector;
				selector = undefined;
			}
		}

		if(fn === false){
			fn = returnFalse;
		}else if(!fn){
			return this;
		}

		if(one === 1){
			origFn = fn;
			fn = function(event){
				sjs().off(event);
				return origFn.apply(this,arguments);
			};
			fn.guid = origFn.guid || (origFn.guid = sjs.guid++);
		}

		return this.each(function(){
			sjs.event.add(this,types,fn,data,selector);
		});
	},
	off:function(types,selector,fn){
		var handlerObj,type;
		if(types && types.preventDefault && types.handlerObj){
			handlerObj = types.handlerObj;
			sjs(types.delegateTarget).off(
				handlerObj.namespace ? handlerObj.origType + '.' + handlerObj.namespace : handlerObj.origType,handlerObj.selector,handlerObj.handler
			);
			return this;
		}
		if(typeof types === 'object'){
			for(type in types){
				this.off(type,selector,types[type]);
			}
			return this;
		}
		if(selector === false || typeof selector === 'function'){
			fn = selector;
			selector = undefined;
		}
		if(fn === false){
			fn = returnFalse;
		}
		return this.each(function(){
			sjs.event.remove(this,types,fn,selector);
		});
	},
	one:function(types,selector,data,fn){
		return this.on(types,selector,data,fn,1);
	},
	bind:function(types,data,fn){
		return this.on(types,null,data,fn);
	},
	unbind:function(types,fn){
		return this.off(types,null,fn);
	},
	delegate:function(selector,types,data,fn){
		return this.on(types,selector,data,fn);
	},
	undelegate:function(selector,types,fn){
		return arguments.length === 1 ? this.off(selector,'**') : this.off(types,selector || '**',fn);
	},
	trigger:function(type,data){
		return this.each(function(){
			sjs.event.trigger(type,data,this);
		});
	},
	triggerHandler:function(type,data){
		var elem = this[0];
		if(elem){
			return sjs.event.trigger(type,data,elem,true);
		}
	}
});
/*!
 * Sizzle CSS Selector Engine
 * Copyright 2013 sjs Foundation and other contributors
 * Released under the MIT license
 * http://sizzlejs.com/
 */
(function( window, undefined ) {

var i,
	cachedruns,
	Expr,
	getText,
	isXML,
	compile,
	outermostContext,
	recompare,
	sortInput,

	// Local document vars
	setDocument,
	document,
	docElem,
	documentIsHTML,
	rbuggyQSA,
	rbuggyMatches,
	matches,
	contains,

	// Instance-specific data
	expando = "sizzle" + -(new Date()),
	preferredDoc = window.document,
	support = {},
	dirruns = 0,
	done = 0,
	classCache = createCache(),
	tokenCache = createCache(),
	compilerCache = createCache(),
	hasDuplicate = false,
	sortOrder = function() { return 0; },

	// General-purpose constants
	strundefined = typeof undefined,
	MAX_NEGATIVE = 1 << 31,

	// Array methods
	arr = [],
	pop = arr.pop,
	push_native = arr.push,
	push = arr.push,
	slice = arr.slice,
	// Use a stripped-down indexOf if we can't use a native one
	indexOf = arr.indexOf || function( elem ) {
		var i = 0,
			len = this.length;
		for ( ; i < len; i++ ) {
			if ( this[i] === elem ) {
				return i;
			}
		}
		return -1;
	},


	// Regular expressions

	// Whitespace characters http://www.w3.org/TR/css3-selectors/#whitespace
	whitespace = "[\\x20\\t\\r\\n\\f]",
	// http://www.w3.org/TR/css3-syntax/#characters
	characterEncoding = "(?:\\\\.|[\\w-]|[^\\x00-\\xa0])+",

	// Loosely modeled on CSS identifier characters
	// An unquoted value should be a CSS identifier http://www.w3.org/TR/css3-selectors/#attribute-selectors
	// Proper syntax: http://www.w3.org/TR/CSS21/syndata.html#value-def-identifier
	identifier = characterEncoding.replace( "w", "w#" ),

	// Acceptable operators http://www.w3.org/TR/selectors/#attribute-selectors
	operators = "([*^$|!~]?=)",
	attributes = "\\[" + whitespace + "*(" + characterEncoding + ")" + whitespace +
		"*(?:" + operators + whitespace + "*(?:(['\"])((?:\\\\.|[^\\\\])*?)\\3|(" + identifier + ")|)|)" + whitespace + "*\\]",

	// Prefer arguments quoted,
	//   then not containing pseudos/brackets,
	//   then attribute selectors/non-parenthetical expressions,
	//   then anything else
	// These preferences are here to reduce the number of selectors
	//   needing tokenize in the PSEUDO preFilter
	pseudos = ":(" + characterEncoding + ")(?:\\(((['\"])((?:\\\\.|[^\\\\])*?)\\3|((?:\\\\.|[^\\\\()[\\]]|" + attributes.replace( 3, 8 ) + ")*)|.*)\\)|)",

	// Leading and non-escaped trailing whitespace, capturing some non-whitespace characters preceding the latter
	rtrim = new RegExp( "^" + whitespace + "+|((?:^|[^\\\\])(?:\\\\.)*)" + whitespace + "+$", "g" ),

	rcomma = new RegExp( "^" + whitespace + "*," + whitespace + "*" ),
	rcombinators = new RegExp( "^" + whitespace + "*([\\x20\\t\\r\\n\\f>+~])" + whitespace + "*" ),
	rpseudo = new RegExp( pseudos ),
	ridentifier = new RegExp( "^" + identifier + "$" ),

	matchExpr = {
		"ID": new RegExp( "^#(" + characterEncoding + ")" ),
		"CLASS": new RegExp( "^\\.(" + characterEncoding + ")" ),
		"NAME": new RegExp( "^\\[name=['\"]?(" + characterEncoding + ")['\"]?\\]" ),
		"TAG": new RegExp( "^(" + characterEncoding.replace( "w", "w*" ) + ")" ),
		"ATTR": new RegExp( "^" + attributes ),
		"PSEUDO": new RegExp( "^" + pseudos ),
		"CHILD": new RegExp( "^:(only|first|last|nth|nth-last)-(child|of-type)(?:\\(" + whitespace +
			"*(even|odd|(([+-]|)(\\d*)n|)" + whitespace + "*(?:([+-]|)" + whitespace +
			"*(\\d+)|))" + whitespace + "*\\)|)", "i" ),
		// For use in libraries implementing .is()
		// We use this for POS matching in `select`
		"needsContext": new RegExp( "^" + whitespace + "*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\\(" +
			whitespace + "*((?:-\\d)?\\d*)" + whitespace + "*\\)|)(?=[^-]|$)", "i" )
	},

	rsibling = /[\x20\t\r\n\f]*[+~]/,

	rnative = /^[^{]+\{\s*\[native code/,

	// Easily-parseable/retrievable ID or TAG or CLASS selectors
	rquickExpr = /^(?:#([\w-]+)|(\w+)|\.([\w-]+))$/,

	rinputs = /^(?:input|select|textarea|button)$/i,
	rheader = /^h\d$/i,

	rescape = /'|\\/g,
	rattributeQuotes = /\=[\x20\t\r\n\f]*([^'"\]]*)[\x20\t\r\n\f]*\]/g,

	// CSS escapes http://www.w3.org/TR/CSS21/syndata.html#escaped-characters
	runescape = /\\([\da-fA-F]{1,6}[\x20\t\r\n\f]?|.)/g,
	funescape = function( _, escaped ) {
		var high = "0x" + escaped - 0x10000;
		// NaN means non-codepoint
		return high !== high ?
			escaped :
			// BMP codepoint
			high < 0 ?
				String.fromCharCode( high + 0x10000 ) :
				// Supplemental Plane codepoint (surrogate pair)
				String.fromCharCode( high >> 10 | 0xD800, high & 0x3FF | 0xDC00 );
	};

// Optimize for push.apply( _, NodeList )
try {
	push.apply(
		(arr = slice.call( preferredDoc.childNodes )),
		preferredDoc.childNodes
	);
	// Support: Android<4.0
	// Detect silently failing push.apply
	arr[ preferredDoc.childNodes.length ].nodeType;
} catch ( e ) {
	push = { apply: arr.length ?

		// Leverage slice if possible
		function( target, els ) {
			push_native.apply( target, slice.call(els) );
		} :

		// Support: IE<9
		// Otherwise append directly
		function( target, els ) {
			var j = target.length,
				i = 0;
			// Can't trust NodeList.length
			while ( (target[j++] = els[i++]) ) {}
			target.length = j - 1;
		}
	};
}

/**
 * For feature detection
 * @param {Function} fn The function to test for native support
 */
function isNative( fn ) {
	return rnative.test( fn + "" );
}

/**
 * Create key-value caches of limited size
 * @returns {Function(string, Object)} Returns the Object data after storing it on itself with
 *	property name the (space-suffixed) string and (if the cache is larger than Expr.cacheLength)
 *	deleting the oldest entry
 */
function createCache() {
	var keys = [];
	var cache = function(key,value){
		if(keys.push(key += " ") > Expr.cacheLength){
			delete (cache[keys.shift()]);
		}
		cache[key] = value;
		return cache[key];
	};
	return cache;
	/*var cache,
		keys = [];

	return (cache = function( key, value ) {
		// Use (key + " ") to avoid collision with native prototype properties (see Issue #157)
		if ( keys.push( key += " " ) > Expr.cacheLength ) {
			// Only keep the most recent entries
			delete cache[ keys.shift() ];
		}
		return (cache[ key ] = value);
	});*/
}

/**
 * Mark a function for special use by Sizzle
 * @param {Function} fn The function to mark
 */
function markFunction( fn ) {
	fn[ expando ] = true;
	return fn;
}

/**
 * Support testing using an element
 * @param {Function} fn Passed the created div and expects a boolean result
 */
function assert( fn ) {
	var div = document.createElement("div");

	try {
		return !!fn( div );
	} catch (e) {
		return false;
	} finally {
		// release memory in IE
		div = null;
	}
}

function Sizzle( selector, context, results, seed ) {
	var match, elem, m, nodeType,
		// QSA vars
		i, groups, old, nid, newContext, newSelector;

	if ( ( context ? context.ownerDocument || context : preferredDoc ) !== document ) {
		setDocument( context );
	}

	context = context || document;
	results = results || [];

	if ( !selector || typeof selector !== "string" ) {
		return results;
	}

	if ( (nodeType = context.nodeType) !== 1 && nodeType !== 9 ) {
		return [];
	}

	if ( documentIsHTML && !seed ) {

		// Shortcuts
		if ( (match = rquickExpr.exec( selector )) ) {
			// Speed-up: Sizzle("#ID")
			if ( (m = match[1]) ) {
				if ( nodeType === 9 ) {
					elem = context.getElementById( m );
					// Check parentNode to catch when Blackberry 4.6 returns
					// nodes that are no longer in the document #6963
					if ( elem && elem.parentNode ) {
						// Handle the case where IE, Opera, and Webkit return items
						// by name instead of ID
						if ( elem.id === m ) {
							results.push( elem );
							return results;
						}
					} else {
						return results;
					}
				} else {
					// Context is not a document
					if ( context.ownerDocument && (elem = context.ownerDocument.getElementById( m )) &&
						contains( context, elem ) && elem.id === m ) {
						results.push( elem );
						return results;
					}
				}

			// Speed-up: Sizzle("TAG")
			} else if ( match[2] ) {
				push.apply( results, context.getElementsByTagName( selector ) );
				return results;

			// Speed-up: Sizzle(".CLASS")
			} else if ( (m = match[3]) && support.getElementsByClassName && context.getElementsByClassName ) {
				push.apply( results, context.getElementsByClassName( m ) );
				return results;
			}
		}

		// QSA path
		if ( support.qsa && !rbuggyQSA.test(selector) ) {
			old = true;
			nid = expando;
			newContext = context;
			newSelector = nodeType === 9 && selector;

			// qSA works strangely on Element-rooted queries
			// We can work around this by specifying an extra ID on the root
			// and working up from there (Thanks to Andrew Dupont for the technique)
			// IE 8 doesn't work on object elements
			if ( nodeType === 1 && context.nodeName.toLowerCase() !== "object" ) {
				groups = tokenize( selector );

				if ( (old = context.getAttribute("id")) ) {
					nid = old.replace( rescape, "\\$&" );
				} else {
					context.setAttribute( "id", nid );
				}
				nid = "[id='" + nid + "'] ";

				i = groups.length;
				while ( i-- ) {
					groups[i] = nid + toSelector( groups[i] );
				}
				newContext = rsibling.test( selector ) && context.parentNode || context;
				newSelector = groups.join(",");
			}

			if ( newSelector ) {
				try {
					push.apply( results,
						newContext.querySelectorAll( newSelector )
					);
					return results;
				} catch(qsaError) {
				} finally {
					if ( !old ) {
						context.removeAttribute("id");
					}
				}
			}
		}
	}

	// All others
	return select( selector.replace( rtrim, "$1" ), context, results, seed );
}

/**
 * Detect xml
 * @param {Element|Object} elem An element or a document
 */
isXML = Sizzle.isXML = function( elem ) {
	// documentElement is verified for cases where it doesn't yet exist
	// (such as loading iframes in IE - #4833)
	var documentElement = elem && (elem.ownerDocument || elem).documentElement;
	return documentElement ? documentElement.nodeName !== "HTML" : false;
};

/**
 * Sets document-related variables once based on the current document
 * @param {Element|Object} [doc] An element or document object to use to set the document
 * @returns {Object} Returns the current document
 */
setDocument = Sizzle.setDocument = function( node ) {
	var doc = node ? node.ownerDocument || node : preferredDoc;

	// If no document and documentElement is available, return
	if ( doc === document || doc.nodeType !== 9 || !doc.documentElement ) {
		return document;
	}

	// Set our document
	document = doc;
	docElem = doc.documentElement;

	// Support tests
	documentIsHTML = !isXML( doc );

	// Check if getElementsByTagName("*") returns only elements
	support.getElementsByTagName = assert(function( div ) {
		div.appendChild( doc.createComment("") );
		return !div.getElementsByTagName("*").length;
	});

	// Check if attributes should be retrieved by attribute nodes
	support.attributes = assert(function( div ) {
		div.innerHTML = "<select></select>";
		var type = typeof div.lastChild.getAttribute("multiple");
		// IE8 returns a string for some attributes even when not present
		return type !== "boolean" && type !== "string";
	});

	// Check if getElementsByClassName can be trusted
	support.getElementsByClassName = assert(function( div ) {
		// Opera can't find a second classname (in 9.6)
		div.innerHTML = "<div class='hidden e'></div><div class='hidden'></div>";
		if ( !div.getElementsByClassName || !div.getElementsByClassName("e").length ) {
			return false;
		}

		// Safari 3.2 caches class attributes and doesn't catch changes
		div.lastChild.className = "e";
		return div.getElementsByClassName("e").length === 2;
	});

	// Check if getElementsByName privileges form controls or returns elements by ID
	// If so, assume (for broader support) that getElementById returns elements by name
	support.getByName = assert(function( div ) {
		// Inject content
		div.id = expando + 0;
		// Support: Windows 8 Native Apps
		// Assigning innerHTML with "name" attributes throws uncatchable exceptions
		// http://msdn.microsoft.com/en-us/library/ie/hh465388.aspx
		div.appendChild( document.createElement("a") ).setAttribute( "name", expando );
		div.appendChild( document.createElement("i") ).setAttribute( "name", expando );
		docElem.appendChild( div );

		// Test
		var pass = doc.getElementsByName &&
			// buggy browsers will return fewer than the correct 2
			doc.getElementsByName( expando ).length === 2 +
			// buggy browsers will return more than the correct 0
			doc.getElementsByName( expando + 0 ).length;

		// Cleanup
		docElem.removeChild( div );

		return pass;
	});

	// Support: Webkit<537.32
	// Detached nodes confoundingly follow *each other*
	support.sortDetached = assert(function( div1 ) {
		return div1.compareDocumentPosition &&
			// Should return 1, but Webkit returns 4 (following)
			(div1.compareDocumentPosition( document.createElement("div") ) & 1);
	});

	// IE6/7 return modified attributes
	Expr.attrHandle = assert(function( div ) {
		div.innerHTML = "<a href='#'></a>";
		return div.firstChild && typeof div.firstChild.getAttribute !== strundefined &&
			div.firstChild.getAttribute("href") === "#";
	}) ?
		{} :
		{
			"href": function( elem ) {
				return elem.getAttribute( "href", 2 );
			},
			"type": function( elem ) {
				return elem.getAttribute("type");
			}
		};

	// ID find and filter
	if ( support.getByName ) {
		Expr.find["ID"] = function( id, context ) {
			if ( typeof context.getElementById !== strundefined && documentIsHTML ) {
				var m = context.getElementById( id );
				// Check parentNode to catch when Blackberry 4.6 returns
				// nodes that are no longer in the document #6963
				return m && m.parentNode ? [m] : [];
			}
		};
		Expr.filter["ID"] = function( id ) {
			var attrId = id.replace( runescape, funescape );
			return function( elem ) {
				return elem.getAttribute("id") === attrId;
			};
		};
	} else {
		Expr.find["ID"] = function( id, context ) {
			if ( typeof context.getElementById !== strundefined && documentIsHTML ) {
				var m = context.getElementById( id );

				return m ?
					m.id === id || typeof m.getAttributeNode !== strundefined && m.getAttributeNode("id").value === id ?
						[m] :
						undefined :
					[];
			}
		};
		Expr.filter["ID"] =  function( id ) {
			var attrId = id.replace( runescape, funescape );
			return function( elem ) {
				var node = typeof elem.getAttributeNode !== strundefined && elem.getAttributeNode("id");
				return node && node.value === attrId;
			};
		};
	}

	// Tag
	Expr.find["TAG"] = support.getElementsByTagName ?
		function( tag, context ) {
			if ( typeof context.getElementsByTagName !== strundefined ) {
				return context.getElementsByTagName( tag );
			}
		} :
		function( tag, context ) {
			var elem,
				tmp = [],
				i = 0,
				results = context.getElementsByTagName( tag );

			// Filter out possible comments
			if ( tag === "*" ) {
				while ( (elem = results[i++]) ) {
					if ( elem.nodeType === 1 ) {
						tmp.push( elem );
					}
				}

				return tmp;
			}
			return results;
		};

	// Name
	Expr.find["NAME"] = support.getByName && function( tag, context ) {
		if ( typeof context.getElementsByName !== strundefined ) {
			return context.getElementsByName( name );
		}
	};

	// Class
	Expr.find["CLASS"] = support.getElementsByClassName && function( className, context ) {
		if ( typeof context.getElementsByClassName !== strundefined && documentIsHTML ) {
			return context.getElementsByClassName( className );
		}
	};

	// QSA and matchesSelector support

	// matchesSelector(:active) reports false when true (IE9/Opera 11.5)
	rbuggyMatches = [];

	// qSa(:focus) reports false when true (Chrome 21),
	// no need to also add to buggyMatches since matches checks buggyQSA
	// A support test would require too much code (would include document ready)
	rbuggyQSA = [ ":focus" ];

	if ( (support.qsa = isNative(doc.querySelectorAll)) ) {
		// Build QSA regex
		// Regex strategy adopted from Diego Perini
		assert(function( div ) {
			// Select is set to empty string on purpose
			// This is to test IE's treatment of not explicitly
			// setting a boolean content attribute,
			// since its presence should be enough
			// http://bugs.jquery.com/ticket/12359
			div.innerHTML = "<select><option selected=''></option></select>";

			// IE8 - Some boolean attributes are not treated correctly
			if ( !div.querySelectorAll("[selected]").length ) {
				rbuggyQSA.push( "\\[" + whitespace + "*(?:checked|disabled|ismap|multiple|readonly|selected|value)" );
			}

			// Webkit/Opera - :checked should return selected option elements
			// http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
			// IE8 throws error here and will not see later tests
			if ( !div.querySelectorAll(":checked").length ) {
				rbuggyQSA.push(":checked");
			}
		});

		assert(function( div ) {

			// Opera 10-12/IE8 - ^= $= *= and empty values
			// Should not select anything
			div.innerHTML = "<input type='hidden' i=''/>";
			if ( div.querySelectorAll("[i^='']").length ) {
				rbuggyQSA.push( "[*^$]=" + whitespace + "*(?:\"\"|'')" );
			}

			// FF 3.5 - :enabled/:disabled and hidden elements (hidden elements are still enabled)
			// IE8 throws error here and will not see later tests
			if ( !div.querySelectorAll(":enabled").length ) {
				rbuggyQSA.push( ":enabled", ":disabled" );
			}

			// Opera 10-11 does not throw on post-comma invalid pseudos
			div.querySelectorAll("*,:x");
			rbuggyQSA.push(",.*:");
		});
	}

	if ( (support.matchesSelector = isNative( (matches = docElem.matchesSelector ||
		docElem.mozMatchesSelector ||
		docElem.webkitMatchesSelector ||
		docElem.oMatchesSelector ||
		docElem.msMatchesSelector) )) ) {

		assert(function( div ) {
			// Check to see if it's possible to do matchesSelector
			// on a disconnected node (IE 9)
			support.disconnectedMatch = matches.call( div, "div" );

			// This should fail with an exception
			// Gecko does not error, returns false instead
			matches.call( div, "[s!='']:x" );
			rbuggyMatches.push( "!=", pseudos );
		});
	}

	rbuggyQSA = new RegExp( rbuggyQSA.join("|") );
	rbuggyMatches = rbuggyMatches.length && new RegExp( rbuggyMatches.join("|") );

	// Element contains another
	// Purposefully does not implement inclusive descendent
	// As in, an element does not contain itself
	contains = isNative(docElem.contains) || docElem.compareDocumentPosition ?
		function( a, b ) {
			var adown = a.nodeType === 9 ? a.documentElement : a,
				bup = b && b.parentNode;
			return a === bup || !!( bup && bup.nodeType === 1 && (
				adown.contains ?
					adown.contains( bup ) :
					a.compareDocumentPosition && a.compareDocumentPosition( bup ) & 16
			));
		} :
		function( a, b ) {
			if ( b ) {
				while ( (b = b.parentNode) ) {
					if ( b === a ) {
						return true;
					}
				}
			}
			return false;
		};

	// Document order sorting
	sortOrder = docElem.compareDocumentPosition ?
	function( a, b ) {

		// Flag for duplicate removal
		if ( a === b ) {
			hasDuplicate = true;
			return 0;
		}

		var compare = b.compareDocumentPosition && a.compareDocumentPosition && a.compareDocumentPosition( b );

		if ( compare ) {
			// Disconnected nodes
			if ( compare & 1 ||
				(recompare && b.compareDocumentPosition( a ) === compare) ) {

				// Choose the first element that is related to our preferred document
				if ( a === doc || contains(preferredDoc, a) ) {
					return -1;
				}
				if ( b === doc || contains(preferredDoc, b) ) {
					return 1;
				}

				// Maintain original order
				return sortInput ?
					( indexOf.call( sortInput, a ) - indexOf.call( sortInput, b ) ) :
					0;
			}

			return compare & 4 ? -1 : 1;
		}

		// Not directly comparable, sort on existence of method
		return a.compareDocumentPosition ? -1 : 1;
	} :
	function( a, b ) {
		var cur,
			i = 0,
			aup = a.parentNode,
			bup = b.parentNode,
			ap = [ a ],
			bp = [ b ];

		// Exit early if the nodes are identical
		if ( a === b ) {
			hasDuplicate = true;
			return 0;

		// Parentless nodes are either documents or disconnected
		} else if ( !aup || !bup ) {
			return a === doc ? -1 :
				b === doc ? 1 :
				aup ? -1 :
				bup ? 1 :
				0;

		// If the nodes are siblings, we can do a quick check
		} else if ( aup === bup ) {
			return siblingCheck( a, b );
		}

		// Otherwise we need full lists of their ancestors for comparison
		cur = a;
		while ( (cur = cur.parentNode) ) {
			ap.unshift( cur );
		}
		cur = b;
		while ( (cur = cur.parentNode) ) {
			bp.unshift( cur );
		}

		// Walk down the tree looking for a discrepancy
		while ( ap[i] === bp[i] ) {
			i++;
		}

		return i ?
			// Do a sibling check if the nodes have a common ancestor
			siblingCheck( ap[i], bp[i] ) :

			// Otherwise nodes in our document sort first
			ap[i] === preferredDoc ? -1 :
			bp[i] === preferredDoc ? 1 :
			0;
	};

	return document;
};

Sizzle.matches = function( expr, elements ) {
	return Sizzle( expr, null, null, elements );
};

Sizzle.matchesSelector = function( elem, expr ) {
	// Set document vars if needed
	if ( ( elem.ownerDocument || elem ) !== document ) {
		setDocument( elem );
	}

	// Make sure that attribute selectors are quoted
	expr = expr.replace( rattributeQuotes, "='$1']" );

	// rbuggyQSA always contains :focus, so no need for an existence check
	if ( support.matchesSelector && documentIsHTML && (!rbuggyMatches || !rbuggyMatches.test(expr)) && !rbuggyQSA.test(expr) ) {
		try {
			var ret = matches.call( elem, expr );

			// IE 9's matchesSelector returns false on disconnected nodes
			if ( ret || support.disconnectedMatch ||
					// As well, disconnected nodes are said to be in a document
					// fragment in IE 9
					elem.document && elem.document.nodeType !== 11 ) {
				return ret;
			}
		} catch(e) {}
	}

	return Sizzle( expr, document, null, [elem] ).length > 0;
};

Sizzle.contains = function( context, elem ) {
	// Set document vars if needed
	if ( ( context.ownerDocument || context ) !== document ) {
		setDocument( context );
	}
	return contains( context, elem );
};

Sizzle.attr = function( elem, name ) {
	var val;

	// Set document vars if needed
	if ( ( elem.ownerDocument || elem ) !== document ) {
		setDocument( elem );
	}

	if ( documentIsHTML ) {
		name = name.toLowerCase();
	}
	if ( (val = Expr.attrHandle[ name ]) ) {
		return val( elem );
	}
	if ( !documentIsHTML || support.attributes ) {
		return elem.getAttribute( name );
	}
	return ( (val = elem.getAttributeNode( name )) || elem.getAttribute( name ) ) && elem[ name ] === true ?
		name :
		val && val.specified ? val.value : null;
};

Sizzle.error = function( msg ) {
	throw new Error( "Syntax error, unrecognized expression: " + msg );
};

// Document sorting and removing duplicates
Sizzle.uniqueSort = function( results ) {
	var elem,
		duplicates = [],
		j = 0,
		i = 0;

	// Unless we *know* we can detect duplicates, assume their presence
	hasDuplicate = !support.detectDuplicates;
	// Compensate for sort limitations
	recompare = !support.sortDetached;
	sortInput = !support.sortStable && results.slice( 0 );
	results.sort( sortOrder );

	if ( hasDuplicate ) {
		while ( (elem = results[i++]) ) {
			if ( elem === results[ i ] ) {
				j = duplicates.push( i );
			}
		}
		while ( j-- ) {
			results.splice( duplicates[ j ], 1 );
		}
	}

	return results;
};

/**
 * Checks document order of two siblings
 * @param {Element} a
 * @param {Element} b
 * @returns Returns -1 if a precedes b, 1 if a follows b
 */
function siblingCheck( a, b ) {
	var cur = b && a,
		diff = cur && ( ~b.sourceIndex || MAX_NEGATIVE ) - ( ~a.sourceIndex || MAX_NEGATIVE );

	// Use IE sourceIndex if available on both nodes
	if ( diff ) {
		return diff;
	}

	// Check if b follows a
	if ( cur ) {
		while ( (cur = cur.nextSibling) ) {
			if ( cur === b ) {
				return -1;
			}
		}
	}

	return a ? 1 : -1;
}

// Returns a function to use in pseudos for input types
function createInputPseudo( type ) {
	return function( elem ) {
		var name = elem.nodeName.toLowerCase();
		return name === "input" && elem.type === type;
	};
}

// Returns a function to use in pseudos for buttons
function createButtonPseudo( type ) {
	return function( elem ) {
		var name = elem.nodeName.toLowerCase();
		return (name === "input" || name === "button") && elem.type === type;
	};
}

// Returns a function to use in pseudos for positionals
function createPositionalPseudo( fn ) {
	return markFunction(function( argument ) {
		argument = +argument;
		return markFunction(function( seed, matches ) {
			var j,
				matchIndexes = fn( [], seed.length, argument ),
				i = matchIndexes.length;

			// Match elements found at the specified indexes
			while ( i-- ) {
				if ( seed[ (j = matchIndexes[i]) ] ) {
					seed[j] = !(matches[j] = seed[j]);
				}
			}
		});
	});
}

/**
 * Utility function for retrieving the text value of an array of DOM nodes
 * @param {Array|Element} elem
 */
getText = Sizzle.getText = function( elem ) {
	var node,
		ret = "",
		i = 0,
		nodeType = elem.nodeType;

	if ( !nodeType ) {
		// If no nodeType, this is expected to be an array
		for ( ; (node = elem[i]); i++ ) {
			// Do not traverse comment nodes
			ret += getText( node );
		}
	} else if ( nodeType === 1 || nodeType === 9 || nodeType === 11 ) {
		// Use textContent for elements
		// innerText usage removed for consistency of new lines (see #11153)
		if ( typeof elem.textContent === "string" ) {
			return elem.textContent;
		} else {
			// Traverse its children
			for ( elem = elem.firstChild; elem; elem = elem.nextSibling ) {
				ret += getText( elem );
			}
		}
	} else if ( nodeType === 3 || nodeType === 4 ) {
		return elem.nodeValue;
	}
	// Do not include comment or processing instruction nodes

	return ret;
};

Expr = Sizzle.selectors = {

	// Can be adjusted by the user
	cacheLength: 50,

	createPseudo: markFunction,

	match: matchExpr,

	find: {},

	relative: {
		">": { dir: "parentNode", first: true },
		" ": { dir: "parentNode" },
		"+": { dir: "previousSibling", first: true },
		"~": { dir: "previousSibling" }
	},

	preFilter: {
		"ATTR": function( match ) {
			match[1] = match[1].replace( runescape, funescape );

			// Move the given value to match[3] whether quoted or unquoted
			match[3] = ( match[4] || match[5] || "" ).replace( runescape, funescape );

			if ( match[2] === "~=" ) {
				match[3] = " " + match[3] + " ";
			}

			return match.slice( 0, 4 );
		},

		"CHILD": function( match ) {
			/* matches from matchExpr["CHILD"]
				1 type (only|nth|...)
				2 what (child|of-type)
				3 argument (even|odd|\d*|\d*n([+-]\d+)?|...)
				4 xn-component of xn+y argument ([+-]?\d*n|)
				5 sign of xn-component
				6 x of xn-component
				7 sign of y-component
				8 y of y-component
			*/
			match[1] = match[1].toLowerCase();

			if ( match[1].slice( 0, 3 ) === "nth" ) {
				// nth-* requires argument
				if ( !match[3] ) {
					Sizzle.error( match[0] );
				}

				// numeric x and y parameters for Expr.filter.CHILD
				// remember that false/true cast respectively to 0/1
				match[4] = +( match[4] ? match[5] + (match[6] || 1) : 2 * ( match[3] === "even" || match[3] === "odd" ) );
				match[5] = +( ( match[7] + match[8] ) || match[3] === "odd" );

			// other types prohibit arguments
			} else if ( match[3] ) {
				Sizzle.error( match[0] );
			}

			return match;
		},

		"PSEUDO": function( match ) {
			var excess,
				unquoted = !match[5] && match[2];

			if ( matchExpr["CHILD"].test( match[0] ) ) {
				return null;
			}

			// Accept quoted arguments as-is
			if ( match[4] ) {
				match[2] = match[4];

			// Strip excess characters from unquoted arguments
			} else if ( unquoted && rpseudo.test( unquoted ) &&
				// Get excess from tokenize (recursively)
				(excess = tokenize( unquoted, true )) &&
				// advance to the next closing parenthesis
				(excess = unquoted.indexOf( ")", unquoted.length - excess ) - unquoted.length) ) {

				// excess is a negative index
				match[0] = match[0].slice( 0, excess );
				match[2] = unquoted.slice( 0, excess );
			}

			// Return only captures needed by the pseudo filter method (type and argument)
			return match.slice( 0, 3 );
		}
	},

	filter: {

		"TAG": function( nodeName ) {
			if ( nodeName === "*" ) {
				return function() { return true; };
			}

			nodeName = nodeName.replace( runescape, funescape ).toLowerCase();
			return function( elem ) {
				return elem.nodeName && elem.nodeName.toLowerCase() === nodeName;
			};
		},

		"CLASS": function( className ) {
			var pattern = classCache[ className + " " ];

			return pattern ||
				(pattern = new RegExp( "(^|" + whitespace + ")" + className + "(" + whitespace + "|$)" )) &&
				classCache( className, function( elem ) {
					return pattern.test( elem.className || (typeof elem.getAttribute !== strundefined && elem.getAttribute("class")) || "" );
				});
		},

		"ATTR": function( name, operator, check ) {
			return function( elem ) {
				var result = Sizzle.attr( elem, name );

				if ( result == null ) {
					return operator === "!=";
				}
				if ( !operator ) {
					return true;
				}

				result += "";

				return operator === "=" ? result === check :
					operator === "!=" ? result !== check :
					operator === "^=" ? check && result.indexOf( check ) === 0 :
					operator === "*=" ? check && result.indexOf( check ) > -1 :
					operator === "$=" ? check && result.slice( -check.length ) === check :
					operator === "~=" ? ( " " + result + " " ).indexOf( check ) > -1 :
					operator === "|=" ? result === check || result.slice( 0, check.length + 1 ) === check + "-" :
					false;
			};
		},

		"CHILD": function( type, what, argument, first, last ) {
			var simple = type.slice( 0, 3 ) !== "nth",
				forward = type.slice( -4 ) !== "last",
				ofType = what === "of-type";

			return first === 1 && last === 0 ?

				// Shortcut for :nth-*(n)
				function( elem ) {
					return !!elem.parentNode;
				} :

				function( elem, context, xml ) {
					var cache, outerCache, node, diff, nodeIndex, start,
						dir = simple !== forward ? "nextSibling" : "previousSibling",
						parent = elem.parentNode,
						name = ofType && elem.nodeName.toLowerCase(),
						useCache = !xml && !ofType;

					if ( parent ) {

						// :(first|last|only)-(child|of-type)
						if ( simple ) {
							while ( dir ) {
								node = elem;
								while ( (node = node[ dir ]) ) {
									if ( ofType ? node.nodeName.toLowerCase() === name : node.nodeType === 1 ) {
										return false;
									}
								}
								// Reverse direction for :only-* (if we haven't yet done so)
								start = dir = type === "only" && !start && "nextSibling";
							}
							return true;
						}

						start = [ forward ? parent.firstChild : parent.lastChild ];

						// non-xml :nth-child(...) stores cache data on `parent`
						if ( forward && useCache ) {
							// Seek `elem` from a previously-cached index
							outerCache = parent[ expando ] || (parent[ expando ] = {});
							cache = outerCache[ type ] || [];
							nodeIndex = cache[0] === dirruns && cache[1];
							diff = cache[0] === dirruns && cache[2];
							node = nodeIndex && parent.childNodes[ nodeIndex ];

							while ( (node = ++nodeIndex && node && node[ dir ] ||

								// Fallback to seeking `elem` from the start
								(diff = nodeIndex = 0) || start.pop()) ) {

								// When found, cache indexes on `parent` and break
								if ( node.nodeType === 1 && ++diff && node === elem ) {
									outerCache[ type ] = [ dirruns, nodeIndex, diff ];
									break;
								}
							}

						// Use previously-cached element index if available
						} else if ( useCache && (cache = (elem[ expando ] || (elem[ expando ] = {}))[ type ]) && cache[0] === dirruns ) {
							diff = cache[1];

						// xml :nth-child(...) or :nth-last-child(...) or :nth(-last)?-of-type(...)
						} else {
							// Use the same loop as above to seek `elem` from the start
							while ( (node = ++nodeIndex && node && node[ dir ] ||
								(diff = nodeIndex = 0) || start.pop()) ) {

								if ( ( ofType ? node.nodeName.toLowerCase() === name : node.nodeType === 1 ) && ++diff ) {
									// Cache the index of each encountered element
									if ( useCache ) {
										(node[ expando ] || (node[ expando ] = {}))[ type ] = [ dirruns, diff ];
									}

									if ( node === elem ) {
										break;
									}
								}
							}
						}

						// Incorporate the offset, then check against cycle size
						diff -= last;
						return diff === first || ( diff % first === 0 && diff / first >= 0 );
					}
				};
		},

		"PSEUDO": function( pseudo, argument ) {
			// pseudo-class names are case-insensitive
			// http://www.w3.org/TR/selectors/#pseudo-classes
			// Prioritize by case sensitivity in case custom pseudos are added with uppercase letters
			// Remember that setFilters inherits from pseudos
			var args,
				fn = Expr.pseudos[ pseudo ] || Expr.setFilters[ pseudo.toLowerCase() ] ||
					Sizzle.error( "unsupported pseudo: " + pseudo );

			// The user may use createPseudo to indicate that
			// arguments are needed to create the filter function
			// just as Sizzle does
			if ( fn[ expando ] ) {
				return fn( argument );
			}

			// But maintain support for old signatures
			if ( fn.length > 1 ) {
				args = [ pseudo, pseudo, "", argument ];
				return Expr.setFilters.hasOwnProperty( pseudo.toLowerCase() ) ?
					markFunction(function( seed, matches ) {
						var idx,
							matched = fn( seed, argument ),
							i = matched.length;
						while ( i-- ) {
							idx = indexOf.call( seed, matched[i] );
							seed[ idx ] = !( matches[ idx ] = matched[i] );
						}
					}) :
					function( elem ) {
						return fn( elem, 0, args );
					};
			}

			return fn;
		}
	},

	pseudos: {
		// Potentially complex pseudos
		"not": markFunction(function( selector ) {
			// Trim the selector passed to compile
			// to avoid treating leading and trailing
			// spaces as combinators
			var input = [],
				results = [],
				matcher = compile( selector.replace( rtrim, "$1" ) );

			return matcher[ expando ] ?
				markFunction(function( seed, matches, context, xml ) {
					var elem,
						unmatched = matcher( seed, null, xml, [] ),
						i = seed.length;

					// Match elements unmatched by `matcher`
					while ( i-- ) {
						if ( (elem = unmatched[i]) ) {
							seed[i] = !(matches[i] = elem);
						}
					}
				}) :
				function( elem, context, xml ) {
					input[0] = elem;
					matcher( input, null, xml, results );
					return !results.pop();
				};
		}),

		"has": markFunction(function( selector ) {
			return function( elem ) {
				return Sizzle( selector, elem ).length > 0;
			};
		}),

		"contains": markFunction(function( text ) {
			return function( elem ) {
				return ( elem.textContent || elem.innerText || getText( elem ) ).indexOf( text ) > -1;
			};
		}),

		// "Whether an element is represented by a :lang() selector
		// is based solely on the element's language value
		// being equal to the identifier C,
		// or beginning with the identifier C immediately followed by "-".
		// The matching of C against the element's language value is performed case-insensitively.
		// The identifier C does not have to be a valid language name."
		// http://www.w3.org/TR/selectors/#lang-pseudo
		"lang": markFunction( function( lang ) {
			// lang value must be a valid identifier
			if ( !ridentifier.test(lang || "") ) {
				Sizzle.error( "unsupported lang: " + lang );
			}
			lang = lang.replace( runescape, funescape ).toLowerCase();
			return function( elem ) {
				var elemLang;
				do {
					if ( (elemLang = documentIsHTML ?
						elem.lang :
						elem.getAttribute("xml:lang") || elem.getAttribute("lang")) ) {

						elemLang = elemLang.toLowerCase();
						return elemLang === lang || elemLang.indexOf( lang + "-" ) === 0;
					}
				} while ( (elem = elem.parentNode) && elem.nodeType === 1 );
				return false;
			};
		}),

		// Miscellaneous
		"target": function( elem ) {
			var hash = window.location && window.location.hash;
			return hash && hash.slice( 1 ) === elem.id;
		},

		"root": function( elem ) {
			return elem === docElem;
		},

		"focus": function( elem ) {
			return elem === document.activeElement && (!document.hasFocus || document.hasFocus()) && !!(elem.type || elem.href || ~elem.tabIndex);
		},

		// Boolean properties
		"enabled": function( elem ) {
			return elem.disabled === false;
		},

		"disabled": function( elem ) {
			return elem.disabled === true;
		},

		"checked": function( elem ) {
			// In CSS3, :checked should return both checked and selected elements
			// http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
			var nodeName = elem.nodeName.toLowerCase();
			return (nodeName === "input" && !!elem.checked) || (nodeName === "option" && !!elem.selected);
		},

		"selected": function( elem ) {
			// Accessing this property makes selected-by-default
			// options in Safari work properly
			if ( elem.parentNode ) {
				elem.parentNode.selectedIndex;
			}

			return elem.selected === true;
		},

		// Contents
		"empty": function( elem ) {
			// http://www.w3.org/TR/selectors/#empty-pseudo
			// :empty is only affected by element nodes and content nodes(including text(3), cdata(4)),
			//   not comment, processing instructions, or others
			// Thanks to Diego Perini for the nodeName shortcut
			//   Greater than "@" means alpha characters (specifically not starting with "#" or "?")
			for ( elem = elem.firstChild; elem; elem = elem.nextSibling ) {
				if ( elem.nodeName > "@" || elem.nodeType === 3 || elem.nodeType === 4 ) {
					return false;
				}
			}
			return true;
		},

		"parent": function( elem ) {
			return !Expr.pseudos["empty"]( elem );
		},

		// Element/input types
		"header": function( elem ) {
			return rheader.test( elem.nodeName );
		},

		"input": function( elem ) {
			return rinputs.test( elem.nodeName );
		},

		"button": function( elem ) {
			var name = elem.nodeName.toLowerCase();
			return name === "input" && elem.type === "button" || name === "button";
		},

		"text": function( elem ) {
			var attr;
			// IE6 and 7 will map elem.type to 'text' for new HTML5 types (search, etc)
			// use getAttribute instead to test this case
			return elem.nodeName.toLowerCase() === "input" &&
				elem.type === "text" &&
				( (attr = elem.getAttribute("type")) == null || attr.toLowerCase() === elem.type );
		},

		// Position-in-collection
		"first": createPositionalPseudo(function() {
			return [ 0 ];
		}),

		"last": createPositionalPseudo(function( matchIndexes, length ) {
			return [ length - 1 ];
		}),

		"eq": createPositionalPseudo(function( matchIndexes, length, argument ) {
			return [ argument < 0 ? argument + length : argument ];
		}),

		"even": createPositionalPseudo(function( matchIndexes, length ) {
			var i = 0;
			for ( ; i < length; i += 2 ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		}),

		"odd": createPositionalPseudo(function( matchIndexes, length ) {
			var i = 1;
			for ( ; i < length; i += 2 ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		}),

		"lt": createPositionalPseudo(function( matchIndexes, length, argument ) {
			var i = argument < 0 ? argument + length : argument;
			for ( ; --i >= 0; ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		}),

		"gt": createPositionalPseudo(function( matchIndexes, length, argument ) {
			var i = argument < 0 ? argument + length : argument;
			for ( ; ++i < length; ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		})
	}
};

// Add button/input type pseudos
for ( i in { radio: true, checkbox: true, file: true, password: true, image: true } ) {
	Expr.pseudos[ i ] = createInputPseudo( i );
}
for ( i in { submit: true, reset: true } ) {
	Expr.pseudos[ i ] = createButtonPseudo( i );
}

function tokenize( selector, parseOnly ) {
	var matched, match, tokens, type,
		soFar, groups, preFilters,
		cached = tokenCache[ selector + " " ];

	if ( cached ) {
		return parseOnly ? 0 : cached.slice( 0 );
	}

	soFar = selector;
	groups = [];
	preFilters = Expr.preFilter;

	while ( soFar ) {

		// Comma and first run
		if ( !matched || (match = rcomma.exec( soFar )) ) {
			if ( match ) {
				// Don't consume trailing commas as valid
				soFar = soFar.slice( match[0].length ) || soFar;
			}
			groups.push( tokens = [] );
		}

		matched = false;

		// Combinators
		if ( (match = rcombinators.exec( soFar )) ) {
			matched = match.shift();
			tokens.push( {
				value: matched,
				// Cast descendant combinators to space
				type: match[0].replace( rtrim, " " )
			} );
			soFar = soFar.slice( matched.length );
		}

		// Filters
		for ( type in Expr.filter ) {
			if ( (match = matchExpr[ type ].exec( soFar )) && (!preFilters[ type ] ||
				(match = preFilters[ type ]( match ))) ) {
				matched = match.shift();
				tokens.push( {
					value: matched,
					type: type,
					matches: match
				} );
				soFar = soFar.slice( matched.length );
			}
		}

		if ( !matched ) {
			break;
		}
	}

	// Return the length of the invalid excess
	// if we're just parsing
	// Otherwise, throw an error or return tokens
	return parseOnly ?
		soFar.length :
		soFar ?
			Sizzle.error( selector ) :
			// Cache the tokens
			tokenCache( selector, groups ).slice( 0 );
}

function toSelector( tokens ) {
	var i = 0,
		len = tokens.length,
		selector = "";
	for ( ; i < len; i++ ) {
		selector += tokens[i].value;
	}
	return selector;
}

function addCombinator( matcher, combinator, base ) {
	var dir = combinator.dir,
		checkNonElements = base && dir === "parentNode",
		doneName = done++;

	return combinator.first ?
		// Check against closest ancestor/preceding element
		function( elem, context, xml ) {
			while ( (elem = elem[ dir ]) ) {
				if ( elem.nodeType === 1 || checkNonElements ) {
					return matcher( elem, context, xml );
				}
			}
		} :

		// Check against all ancestor/preceding elements
		function( elem, context, xml ) {
			var data, cache, outerCache,
				dirkey = dirruns + " " + doneName;

			// We can't set arbitrary data on XML nodes, so they don't benefit from dir caching
			if ( xml ) {
				while ( (elem = elem[ dir ]) ) {
					if ( elem.nodeType === 1 || checkNonElements ) {
						if ( matcher( elem, context, xml ) ) {
							return true;
						}
					}
				}
			} else {
				while ( (elem = elem[ dir ]) ) {
					if ( elem.nodeType === 1 || checkNonElements ) {
						outerCache = elem[ expando ] || (elem[ expando ] = {});
						if ( (cache = outerCache[ dir ]) && cache[0] === dirkey ) {
							if ( (data = cache[1]) === true || data === cachedruns ) {
								return data === true;
							}
						} else {
							cache = outerCache[ dir ] = [ dirkey ];
							cache[1] = matcher( elem, context, xml ) || cachedruns;
							if ( cache[1] === true ) {
								return true;
							}
						}
					}
				}
			}
		};
}

function elementMatcher( matchers ) {
	return matchers.length > 1 ?
		function( elem, context, xml ) {
			var i = matchers.length;
			while ( i-- ) {
				if ( !matchers[i]( elem, context, xml ) ) {
					return false;
				}
			}
			return true;
		} :
		matchers[0];
}

function condense( unmatched, map, filter, context, xml ) {
	var elem,
		newUnmatched = [],
		i = 0,
		len = unmatched.length,
		mapped = map != null;

	for ( ; i < len; i++ ) {
		if ( (elem = unmatched[i]) ) {
			if ( !filter || filter( elem, context, xml ) ) {
				newUnmatched.push( elem );
				if ( mapped ) {
					map.push( i );
				}
			}
		}
	}

	return newUnmatched;
}

function setMatcher( preFilter, selector, matcher, postFilter, postFinder, postSelector ) {
	if ( postFilter && !postFilter[ expando ] ) {
		postFilter = setMatcher( postFilter );
	}
	if ( postFinder && !postFinder[ expando ] ) {
		postFinder = setMatcher( postFinder, postSelector );
	}
	return markFunction(function( seed, results, context, xml ) {
		var temp, i, elem,
			preMap = [],
			postMap = [],
			preexisting = results.length,

			// Get initial elements from seed or context
			elems = seed || multipleContexts( selector || "*", context.nodeType ? [ context ] : context, [] ),

			// Prefilter to get matcher input, preserving a map for seed-results synchronization
			matcherIn = preFilter && ( seed || !selector ) ?
				condense( elems, preMap, preFilter, context, xml ) :
				elems,

			matcherOut = matcher ?
				// If we have a postFinder, or filtered seed, or non-seed postFilter or preexisting results,
				postFinder || ( seed ? preFilter : preexisting || postFilter ) ?

					// ...intermediate processing is necessary
					[] :

					// ...otherwise use results directly
					results :
				matcherIn;

		// Find primary matches
		if ( matcher ) {
			matcher( matcherIn, matcherOut, context, xml );
		}

		// Apply postFilter
		if ( postFilter ) {
			temp = condense( matcherOut, postMap );
			postFilter( temp, [], context, xml );

			// Un-match failing elements by moving them back to matcherIn
			i = temp.length;
			while ( i-- ) {
				if ( (elem = temp[i]) ) {
					matcherOut[ postMap[i] ] = !(matcherIn[ postMap[i] ] = elem);
				}
			}
		}

		if ( seed ) {
			if ( postFinder || preFilter ) {
				if ( postFinder ) {
					// Get the final matcherOut by condensing this intermediate into postFinder contexts
					temp = [];
					i = matcherOut.length;
					while ( i-- ) {
						if ( (elem = matcherOut[i]) ) {
							// Restore matcherIn since elem is not yet a final match
							temp.push( (matcherIn[i] = elem) );
						}
					}
					postFinder( null, (matcherOut = []), temp, xml );
				}

				// Move matched elements from seed to results to keep them synchronized
				i = matcherOut.length;
				while ( i-- ) {
					if ( (elem = matcherOut[i]) &&
						(temp = postFinder ? indexOf.call( seed, elem ) : preMap[i]) > -1 ) {

						seed[temp] = !(results[temp] = elem);
					}
				}
			}

		// Add elements to results, through postFinder if defined
		} else {
			matcherOut = condense(
				matcherOut === results ?
					matcherOut.splice( preexisting, matcherOut.length ) :
					matcherOut
			);
			if ( postFinder ) {
				postFinder( null, results, matcherOut, xml );
			} else {
				push.apply( results, matcherOut );
			}
		}
	});
}

function matcherFromTokens( tokens ) {
	var checkContext, matcher, j,
		len = tokens.length,
		leadingRelative = Expr.relative[ tokens[0].type ],
		implicitRelative = leadingRelative || Expr.relative[" "],
		i = leadingRelative ? 1 : 0,

		// The foundational matcher ensures that elements are reachable from top-level context(s)
		matchContext = addCombinator( function( elem ) {
			return elem === checkContext;
		}, implicitRelative, true ),
		matchAnyContext = addCombinator( function( elem ) {
			return indexOf.call( checkContext, elem ) > -1;
		}, implicitRelative, true ),
		matchers = [ function( elem, context, xml ) {
			return ( !leadingRelative && ( xml || context !== outermostContext ) ) || (
				(checkContext = context).nodeType ?
					matchContext( elem, context, xml ) :
					matchAnyContext( elem, context, xml ) );
		} ];

	for ( ; i < len; i++ ) {
		if ( (matcher = Expr.relative[ tokens[i].type ]) ) {
			matchers = [ addCombinator(elementMatcher( matchers ), matcher) ];
		} else {
			matcher = Expr.filter[ tokens[i].type ].apply( null, tokens[i].matches );

			// Return special upon seeing a positional matcher
			if ( matcher[ expando ] ) {
				// Find the next relative operator (if any) for proper handling
				j = ++i;
				for ( ; j < len; j++ ) {
					if ( Expr.relative[ tokens[j].type ] ) {
						break;
					}
				}
				return setMatcher(
					i > 1 && elementMatcher( matchers ),
					i > 1 && toSelector( tokens.slice( 0, i - 1 ) ).replace( rtrim, "$1" ),
					matcher,
					i < j && matcherFromTokens( tokens.slice( i, j ) ),
					j < len && matcherFromTokens( (tokens = tokens.slice( j )) ),
					j < len && toSelector( tokens )
				);
			}
			matchers.push( matcher );
		}
	}

	return elementMatcher( matchers );
}

function matcherFromGroupMatchers( elementMatchers, setMatchers ) {
	// A counter to specify which element is currently being matched
	var matcherCachedRuns = 0,
		bySet = setMatchers.length > 0,
		byElement = elementMatchers.length > 0,
		superMatcher = function( seed, context, xml, results, expandContext ) {
			var elem, j, matcher,
				setMatched = [],
				matchedCount = 0,
				i = "0",
				unmatched = seed && [],
				outermost = expandContext != null,
				contextBackup = outermostContext,
				// We must always have either seed elements or context
				elems = seed || byElement && Expr.find["TAG"]( "*", expandContext && context.parentNode || context ),
				// Use integer dirruns iff this is the outermost matcher
				dirrunsUnique = (dirruns += contextBackup == null ? 1 : Math.random() || 0.1);

			if ( outermost ) {
				outermostContext = context !== document && context;
				cachedruns = matcherCachedRuns;
			}

			// Add elements passing elementMatchers directly to results
			// Keep `i` a string if there are no elements so `matchedCount` will be "00" below
			for ( ; (elem = elems[i]) != null; i++ ) {
				if ( byElement && elem ) {
					j = 0;
					while ( (matcher = elementMatchers[j++]) ) {
						if ( matcher( elem, context, xml ) ) {
							results.push( elem );
							break;
						}
					}
					if ( outermost ) {
						dirruns = dirrunsUnique;
						cachedruns = ++matcherCachedRuns;
					}
				}

				// Track unmatched elements for set filters
				if ( bySet ) {
					// They will have gone through all possible matchers
					if ( (elem = !matcher && elem) ) {
						matchedCount--;
					}

					// Lengthen the array for every element, matched or not
					if ( seed ) {
						unmatched.push( elem );
					}
				}
			}

			// Apply set filters to unmatched elements
			matchedCount += i;
			if ( bySet && i !== matchedCount ) {
				j = 0;
				while ( (matcher = setMatchers[j++]) ) {
					matcher( unmatched, setMatched, context, xml );
				}

				if ( seed ) {
					// Reintegrate element matches to eliminate the need for sorting
					if ( matchedCount > 0 ) {
						while ( i-- ) {
							if ( !(unmatched[i] || setMatched[i]) ) {
								setMatched[i] = pop.call( results );
							}
						}
					}

					// Discard index placeholder values to get only actual matches
					setMatched = condense( setMatched );
				}

				// Add matches to results
				push.apply( results, setMatched );

				// Seedless set matches succeeding multiple successful matchers stipulate sorting
				if ( outermost && !seed && setMatched.length > 0 &&
					( matchedCount + setMatchers.length ) > 1 ) {

					Sizzle.uniqueSort( results );
				}
			}

			// Override manipulation of globals by nested matchers
			if ( outermost ) {
				dirruns = dirrunsUnique;
				outermostContext = contextBackup;
			}

			return unmatched;
		};

	return bySet ?
		markFunction( superMatcher ) :
		superMatcher;
}

compile = Sizzle.compile = function( selector, group /* Internal Use Only */ ) {
	var i,
		setMatchers = [],
		elementMatchers = [],
		cached = compilerCache[ selector + " " ];

	if ( !cached ) {
		// Generate a function of recursive functions that can be used to check each element
		if ( !group ) {
			group = tokenize( selector );
		}
		i = group.length;
		while ( i-- ) {
			cached = matcherFromTokens( group[i] );
			if ( cached[ expando ] ) {
				setMatchers.push( cached );
			} else {
				elementMatchers.push( cached );
			}
		}

		// Cache the compiled function
		cached = compilerCache( selector, matcherFromGroupMatchers( elementMatchers, setMatchers ) );
	}
	return cached;
};

function multipleContexts( selector, contexts, results ) {
	var i = 0,
		len = contexts.length;
	for ( ; i < len; i++ ) {
		Sizzle( selector, contexts[i], results );
	}
	return results;
}

function select( selector, context, results, seed ) {
	var i, tokens, token, type, find,
		match = tokenize( selector );

	if ( !seed ) {
		// Try to minimize operations if there is only one group
		if ( match.length === 1 ) {

			// Take a shortcut and set the context if the root selector is an ID
			tokens = match[0] = match[0].slice( 0 );
			if ( tokens.length > 2 && (token = tokens[0]).type === "ID" &&
					context.nodeType === 9 && documentIsHTML &&
					Expr.relative[ tokens[1].type ] ) {

				context = ( Expr.find["ID"]( token.matches[0].replace(runescape, funescape), context ) || [] )[0];
				if ( !context ) {
					return results;
				}

				selector = selector.slice( tokens.shift().value.length );
			}

			// Fetch a seed set for right-to-left matching
			i = matchExpr["needsContext"].test( selector ) ? 0 : tokens.length;
			while ( i-- ) {
				token = tokens[i];

				// Abort if we hit a combinator
				if ( Expr.relative[ (type = token.type) ] ) {
					break;
				}
				if ( (find = Expr.find[ type ]) ) {
					// Search, expanding context for leading sibling combinators
					if ( (seed = find(
						token.matches[0].replace( runescape, funescape ),
						rsibling.test( tokens[0].type ) && context.parentNode || context
					)) ) {

						// If seed is empty or no tokens remain, we can return early
						tokens.splice( i, 1 );
						selector = seed.length && toSelector( tokens );
						if ( !selector ) {
							push.apply( results, seed );
							return results;
						}

						break;
					}
				}
			}
		}
	}

	// Compile and execute a filtering function
	// Provide `match` to avoid retokenization if we modified the selector above
	compile( selector, match )(
		seed,
		context,
		!documentIsHTML,
		results,
		rsibling.test( selector )
	);
	return results;
}

// Deprecated
Expr.pseudos["nth"] = Expr.pseudos["eq"];

// Easy API for creating new setFilters
function setFilters() {}
setFilters.prototype = Expr.filters = Expr.pseudos;
Expr.setFilters = new setFilters();

// Check sort stability
support.sortStable = expando.split("").sort( sortOrder ).join("") === expando;

// Initialize with the default document
setDocument();

// Always assume the presence of duplicates if sort doesn't
// pass them to our comparison function (as in Google Chrome).
[0, 0].sort( sortOrder );
support.detectDuplicates = hasDuplicate;

// Override sizzle attribute retrieval
Sizzle.attr = sjs.attr;
sjs.find = Sizzle;
sjs.expr = Sizzle.selectors;
sjs.expr[":"] = sjs.expr.pseudos;
sjs.unique = Sizzle.uniqueSort;
sjs.text = Sizzle.getText;
sjs.isXMLDoc = Sizzle.isXML;
/**
 * 判断一个DOM元素是另外一个元素的祖先
 * @method contains
 * @static
 * @param {element} container 可能包含其他DOM元素的DOM元素
 * @param {element} contained 可能被其他DOM元素包含的DOM元素
 * @return {boolean} 是否存在包含关系
	@example
		$.contains( document.documentElement, document.body ); // true
		$.contains( document.body, document.documentElement ); // false
 **/
sjs.contains = Sizzle.contains;


})( window );
/*
@file sina JavaScript库DOM遍历模块
@author yihui1@staff.sina.com.cn
*/
/**
@module traversing
@main traversing
*/
/**
sjs DOM遍历方法，主要用于DOM元素的查找

@class traversing
@global
*/
var runtil = /Until$/,
	rparentsprev = /^(?:parents|prev(?:Until|All))/,
	isSimple = /^.[^:#\[\.,]*$/,
	rneedsContext = sjs.expr.match.needsContext,
	// methods guaranteed to produce a unique set when starting from a unique set
	guaranteedUnique = {
		children: true,
		contents: true,
		next: true,
		prev: true
	};

sjs.fn.extend({
	/**
	获取匹配selector的元素
	@method find
	@param {object|string} selector 选择符/HTML/DOM元素/sjs对象
	@return {object} 满足条件的sjs对象
	@example
		<html>
		<head>
		<style>
			span { color: blue; }
		</style>
		<script src="sjs.js"></script>
		</head>
		<body>
			<p><span>Hello</span>, how are you?</p>
			<p>Me? I'm <span>good</span>.</p>
			<div>Did you <span>eat</span> yet?</div>
			<script>
				var $spans = $('span');
				$("p").find( $spans ).css('color','red');
			</script>
		</body>
		</html>
	*/
	find: function(selector) {
		var i,
			ret,
			that,
			len = this.length;

		if(typeof selector !== 'string'){
			that = this;
			return this.pushStack(sjs(selector).filter(function(){
				for(i=0;i<len;i++){
					if(sjs.contains(that[i],this)){
						return true;
					}
				}
			}));
		}

		ret = [];
		for (i = 0; i < len; i++) {
			sjs.find(selector, this[i], ret);
		}

		ret = this.pushStack(len > 1 ? sjs.unique(ret) : ret);
		ret.selector = (this.selector ? this.selector + ' ' : '') + selector;
		return ret;
	},
	/**
	获取当前sjs对象中含有目标元素的sjs对象
	@method has
	@param {object|string} selector 选择符/HTML/DOM元素/sjs对象
	@return {object} sjs对象
	@example
		<html>
		<head>
		<style>.full { border: 1px solid red; }</style>
		<script src="sjs.js"></script>
		</head>
		<body>
			<ul><li>Does the UL contain an LI?</li></ul>
			<script>
				$("ul").append("<li>" + ($("ul").has("li").length ? "Yes" : "No") + "</li>");
				$("ul").has("li").addClass("full");
			</script>
		</body>
		</html>
	*/
	has:function(target){
		var i,
			targets = sjs(target,this),
			len = targets.length;

		return this.filter(function(){
			for(i=0;i<len;i++){
				if(sjs.contains(this,targets[i])){
					return true;
				}
			}
		});
	},
	/**
	删除当前sjs对象中满足selector条件的元素
	@method not 
	@param {object|string} selector 选择符/HTML/DOM元素/sjs对象
	@return {object} sjs对象
	@example
		<html>
		<head>
		<style>
			div { width:50px; height:50px; margin:10px; float:left;
			background:yellow; border:2px solid white; }
			.green { background:#8f8; }
			.gray { background:#ccc; }
			#blueone { background:#99f; }
		</style>
		<script src="sjs.js"></script>
		</head>
		<body>
			<div></div>
			<div id="blueone"></div>
			<div></div>
			<div class="green"></div>
	
			<div class="green"></div>
			<div class="gray"></div>
			<div></div>
			
			<script>
				$("div").not(".green, #blueone").css("border-color", "red");
			</script>
		</body>
		</html>
	*/
	not: function(selector) {
		return this.pushStack(winnow(this, selector, false));
	},
	/**
	在当前sjs对象中获取满足条件的元素
	@method filter
	@param {object|string} selector 选择符/HTML/DOM元素/sjs对象
	@return {object} sjs对象
	@example
		<html>
		<head>
		<style>
			div { width:60px; height:60px; margin:5px; float:left;border:2px white solid;}
		</style>
		<script src="sjs.js"></script>
		</head>
		<body>
			<div></div>

			<div class="middle"></div>
			<div class="middle"></div>
			<div class="middle"></div>
			<div class="middle"></div>

			<div></div>
			<script>$("div").css("background", "#c8ebcc").filter(".middle").css("border-color", "red");</script>
		</body>
		</html>
	*/
	filter: function(selector) {
		return this.pushStack(winnow(this, selector, true));
	},
	/**
	判断当前sjs对象是否是指定的selector
	@method is
	@param {object|string} selector 选择符/HTML/DOM元素/sjs对象
	@return {boolean} true/false
	@example
		<html>
		<head>
		<style>div { color:red; }</style>
		<script src="sjs.js"></script>
		</head>
		<body>
			<form><p><input type="checkbox" /></p></form>
			<div></div>
			<script>
				var isFormParent = $("input[type='checkbox']").parent().is("form");
				$("div").text("isFormParent = " + isFormParent);
			</script>
		</body>
		</html>
	*/
	is: function(selector) {
		return !!selector && (
		typeof selector === "string" ?
		// If this is a positional/relative selector, check membership in the returned set
		// so $("p:first").is("p:last") won't return true for a doc with two "p".
		rneedsContext.test(selector) ? sjs(selector, this.context).index(this[0]) >= 0 : sjs.filter(selector, this).length > 0 : this.filter(selector).length > 0);
	},
	/**
	获取从当前元素开始到该元素祖先为止符合查询条件的第一个元素
	@method closest
	@param {object|string} selector 选择符/HTML/DOM元素/sjs对象
	@param {object} context 父节点
	@return {object} 满足条件的sjs对象
	@example
		<html>
		<head>
		<style>
			li { margin: 3px; padding: 3px; background: #EEEEEE; }
			li.hilight { background: yellow; }
		</style>
		<script src="sjs.js"></script>
		</head>
		<body>
			<ul>
				<li><b>Click me!</b></li>
				<li>You can also <b>Click me!</b></li>
			</ul>
			<script>
				$( document ).on("click", function( e ) {
					$( e.target ).closest("li").toggleClass("hilight");
				});
			</script>
		</body>
		</html>
	*/
	closest:function(selectors,context){
		var cur,
			i = 0,
			len = this.length,
			ret = [],
			pos = rneedsContext.test(selectors) || typeof selectors !== 'string' ? sjs(selectors,context || this.context) : 0;

		for(;i<len;i++){
			for(cur = this[i];cur && cur !== context;cur = cur.parentNode){
				if(cur.nodeType < 11 && (pos ? pos.index(cur) > -1 : cur.nodeType === 1 && sjs.find.matchesSelector(cur,selectors))){
					cur = ret.push(cur);
					break;
				}
			}
		}
		return this.pushStack(ret.length > 1 ? sjs.unique(ret) : ret);
	},
	/**
	获取当前sjs对象的位置索引值或满足selector条件的sjs对象位置索引值
	@method index 
	@param {object|string} elem 选择符/HTML/DOM元素/sjs对象
	@return {number} sjs对象位置索引值 
	@example
		<html>
		<head>
		<style>div { font-weight: bold; color: #090; }</style>
			<script src="sjs.js"></script>
		</head>
		<body>
			<ul>
				<li id="foo">foo</li>
				<li id="bar">bar</li>
				<li id="baz">baz</li>
			</ul>
			<div></div>
			<script>$('div').html('Index: ' +  $('#bar').index('li') );</script>
		</body>
		</html>
	*/
	index:function(elem){
		//如果没有参数，就返回在当前parentNode中的index
		if(!elem){
			return (this[0] && this[0].parentNode) ? this.first().prevAll().length : -1;
		}
		//selector的index
		if(typeof elem === 'string'){
			return sjs.inArray(this[0],sjs(elem));
		}
		return sjs.inArray(elem._sjs ? elem[0] : elem,this);
	},
	/**
	添加新的元素到sjs对象中
	@method add
	@param {object|string} selector 选择符/HTML/DOM元素/sjs对象
	@param {element} context selector所在上下文
	@return {object} 新添加的元素
	@example
		<!DOCTYPE html>
		<html>
		<head>
			<script src="sjs.js"></script>
		</head>
		<body>
			<p>Hello</p><span>Hello Again</span>
			<script>$("p").add("span").css("background", "yellow");</script>
		</body>
		</html>
	*/
	add: function( selector, context ) {
		var set = typeof selector === "string" ?
				sjs( selector, context ) :
				sjs.makeArray( selector && selector.nodeType ? [ selector ] : selector ),
			all = sjs.merge( this.get(), set );

		return this.pushStack( sjs.unique(all) );
	},
	/**
	添加新的元素到当前sjs对象的父对象上
	@method addBack
	@param {object|string} selector 选择符/HTML/DOM元素/sjs对象
	@return {object} 新添加的sjs对象
	@example
		<!DOCTYPE html>
		<html>
		<head>
			<script src="sjs.js"></script>
		</head>
		<body>
			<ul>
				<li>list item 1</li>
				<li>list item 2</li>
				<li class="third-item">list item 3</li>
				<li>list item 4</li>
				<li>list item 5</li>
			</ul>
			<script>
				$('li.third-item').nextAll().addBack()
				.css('background-color','red');
				//item 3,4,5 background-color will be red
				//sjs object that points to all three items in document order:{[<li.third-item>,<li>,<li>]}
			</script>
		</body>
		</html>
	*/
	addBack:function(selector){
		return this.add(selector == null ? 
			this.prevObject : this.prevObject.filter(selector)
		);
	}
});
sjs.fn.andSelf = sjs.fn.addBack;
// Implement the identical functionality for filter and not
function winnow(elements, qualifier, keep) {
	// Can't pass null or undefined to indexOf in Firefox 4
	// Set to 0 to skip string check
	qualifier = qualifier || 0;

	if (sjs.isFunction(qualifier)) {
		return sjs.grep(elements, function(elem, i) {
			var retVal = !! qualifier.call(elem, i, elem);
			return retVal === keep;
		});

	} else if (qualifier.nodeType) {
		return sjs.grep(elements, function(elem) {
			return (elem === qualifier) === keep;
		});

	} else if (typeof qualifier === "string") {
		var filtered = sjs.grep(elements, function(elem) {
			return elem.nodeType === 1;
		});

		if (isSimple.test(qualifier)) {
			return sjs.filter(qualifier, filtered, !keep);
		} else {
			qualifier = sjs.filter(qualifier, filtered);
		}
	}

	return sjs.grep(elements, function(elem) {
		return (sjs.inArray(elem, qualifier) >= 0) === keep;
	});
}

function sibling(cur, dir) {
	do {
		cur = cur[dir];
	} while (cur && cur.nodeType !== 1);

	return cur;
}
sjs.extend({
	filter: function(expr, elems, not) {
		if (not) {
			expr = ":not(" + expr + ")";
		}

		return elems.length === 1 ? sjs.find.matchesSelector(elems[0], expr) ? [elems[0]] : [] : sjs.find.matches(expr, elems);
	},
	sibling: function( n, elem ) {
		var r = [];

		for ( ; n; n = n.nextSibling ) {
			if ( n.nodeType === 1 && n !== elem ) {
				r.push( n );
			}
		}

		return r;
	},
	dir:function(elem,dir,until){
		var matched = [],
			cur = elem[dir];

		while(cur && cur.nodeType !== 9 && (until === undefined || cur.nodeType !== 1 || !sjs(cur).is(until))){
			if(cur.nodeType === 1){
				matched.push(cur);
			}
			cur = cur[dir];
		}
		return matched;
	}
});

sjs.each({
	/**
	获取当前sjs对象的父节点或满足selector条件的父节点
	@method parent
	@param {object|string} elem 选择符/HTML/DOM元素/sjs对象
	@return {object} sjs对象
	@example
		<html>
		<head>
		<script src="sjs.js"></script>
		</head>
		<body>
			<div><p>Hello</p></div>
			<div class="selected"><p>Hello Again</p></div>
			<script>$("p").parent(".selected").css("background", "yellow");</script>
		</body>
		</html>
	*/
	parent: function(elem) {
		var parent = elem.parentNode;
		return parent && parent.nodeType !== 11 ? parent : null;
	},
	/**
	获取当前sjs对象所有父节点或满足selector条件的所有父节点
	@method parents
	@param {object|string} elem 选择符/HTML/DOM元素/sjs对象
	@return {object} sjs对象
	@example
		<html>
		<head>
		<style>
			b, span, p, html body {padding: .5em;border: 1px solid;	}
			b { color:blue; }
			strong { color:red; }
		</style>
		<script src="sjs.js"></script>
		</head>
		<body>
			<div>
				<p>
					<span><b>My parents are: </b></span>
				</p>
			</div>
			<script>
				var parentEls = $("b").parents().map(function () {
					return this.tagName;
				}).get().join(", ");
				$("b").append("<strong>" + parentEls + "</strong>");
			</script>
		</body>
		</html>
	*/
	parents: function(elem) {
		return sjs.dir(elem, "parentNode");
	},
	/**
	获取当前sjs对象的父节点直到满足selector条件
	@method parentsUntil
	@param {object|string} elem 选择符/HTML/DOM元素/sjs对象
	@param {object|string} until 选择符/HTML/DOM元素/sjs对象
	@return {object} sjs对象
	@example
		<html>
		<head>
			<script src="sjs.js"></script>
		</head>
		<body>

			<ul class="level-1 yes">
				<li class="item-i">I</li>
				<li class="item-ii">II
					<ul class="level-2 yes">
						<li class="item-a">A</li>
						<li class="item-b">B
							<ul class="level-3">
								<li class="item-1">1</li>
								<li class="item-2">2</li>
								<li class="item-3">3</li>
							</ul>
						</li>
						<li class="item-c">C</li>
					</ul>
				</li>
				<li class="item-iii">III</li>
			</ul>
			<script>
				$("li.item-a").parentsUntil(".level-1")
				.css("background-color", "red");

				$("li.item-2").parentsUntil( $("ul.level-1"), ".yes" )
				.css("border", "3px solid green");
			</script>

		</body>
		</html>
	*/
	parentsUntil: function(elem, i, until) {
		return sjs.dir(elem, "parentNode", until);
	},
	/**
	获取当前sjs对象的下一个兄弟节点或与之selector相匹配的下一个兄弟节点
	@method next
	@param {object|string} elem 选择符/HTML/DOM元素/sjs对象
	@return {object} sjs对象
	@example
		<html>
		<head>
		<script src="http://code.jquery.com/jquery-1.9.1.js"></script>
		</head>
		<body>
			<p>Hello</p>

			<p class="selected">Hello Again</p>
			<div><span>And Again</span></div>
			<script>$("p").next(".selected").css("background", "yellow");</script>
		</body>
		</html>
	*/
	next: function(elem) {
		return sibling(elem, "nextSibling");
	},
	/**
	获取当前sjs对象的上一个兄弟节点或与之selector相匹配的上一个兄弟节点
	@method prev
	@param {object|string} elem 选择符/HTML/DOM元素/sjs对象
	@return {object} sjs对象
	@example
		<html>
		<head>
			<script src="sjs.js"></script>
		</head>
		<body>
			<div><span>Hello</span></div>

			<p class="selected">Hello Again</p>
			<p>And Again</p>
			<script>$("p").prev(".selected").css("background", "yellow");</script>
		</body>
		</html>
	*/
	prev: function(elem) {
		return sibling(elem, "previousSibling");
	},
	/**
	获取当前sjs对象的所有下一个兄弟节点或满足selector条件的所有下一个兄弟节点
	@method nextAll
	@param {object|string} elem 选择符/HTML/DOM元素/sjs对象
	@return {object} sjs对象
	@example
		<html>
		<head>
		<style>
			div { width: 80px; height: 80px; background: #abc;
			border: 2px solid black; margin: 10px; float: left; }
			div.after { border-color: red; }
		</style>
		<script src="sjs.js"></script>
		</head>
		<body>
			<div>first</div>
			<div>sibling<div>child</div></div>
			<div>sibling</div>

			<div>sibling</div>
			<script>$("div:first").nextAll().addClass("after");</script>
		</body>
		</html>
	*/
	nextAll: function(elem) {
		return sjs.dir(elem, "nextSibling");
	},
	/**
	获取当前sjs对象的所有上一个兄弟节点或满足selector条件的所有上一个兄弟节点
	@method prevAll
	@param {object|string} elem 选择符/HTML/DOM元素/sjs对象
	@return {object} sjs对象
	@example
		<html>
		<head>
		<style>
			div { width: 80px; height: 80px; background: #abc;
			border: 2px solid black; margin: 10px; float: left; }
			div.after { border-color: red; }
		</style>
		<script src="sjs.js"></script>
		</head>
		<body>
			<div>first</div>
			<div>sibling<div>child</div></div>
			<div>sibling</div>

			<div>sibling</div>
			<script>$("div:last").prevAll().addClass("after");</script>
		</body>
		</html>
	*/
	prevAll: function(elem) {
		return sjs.dir(elem, "previousSibling");
	},
	/**
	获取当前sjs对象下一个兄弟节点直到满足selector条件
	@method nextUntil
	@param {object|string} elem 选择符/HTML/DOM元素/sjs对象
	@param {object|string} until 选择符/HTML/DOM元素/sjs对象
	@return {object} sjs对象
	@example
		<html>
		<head>
		<script src="sjs.js"></script>
		</head>
		<body>
			<dl>
				<dt id="term-1">term 1</dt>
				<dd>definition 1-a</dd>
				<dd>definition 1-b</dd>
				<dd>definition 1-c</dd>
				<dd>definition 1-d</dd>

				<dt id="term-2">term 2</dt>
				<dd>definition 2-a</dd>
				<dd>definition 2-b</dd>
				<dd>definition 2-c</dd>
	
				<dt id="term-3">term 3</dt>
				<dd>definition 3-a</dd>
				<dd>definition 3-b</dd>
			</dl>
		<script>
			$("#term-2").nextUntil("dt").css("background-color", "red");
			var term3 = document.getElementById("term-3");
			$("#term-1").nextUntil(term3, "dd").css("color", "green");
		</script>
		</body>
		</html>
	*/
	nextUntil: function(elem, i, until) {
		return sjs.dir(elem, "nextSibling", until);
	},
	/**
	获取当前sjs对象上一个兄弟节点直到满足selector条件
	@method prevUntil
	@param {object|string} elem 选择符/HTML/DOM元素/sjs对象
	@param {object|string} until 选择符/HTML/DOM元素/sjs对象
	@return {object} sjs对象
	@example
		<html>
		<head>
			<script src="sjs.js"></script>
		</head>
		<body>
			<dl>
				<dt id="term-1">term 1</dt>
					<dd>definition 1-a</dd>
					<dd>definition 1-b</dd>
					<dd>definition 1-c</dd>
					<dd>definition 1-d</dd>

				<dt id="term-2">term 2</dt>
					<dd>definition 2-a</dd>
					<dd>definition 2-b</dd>
					<dd>definition 2-c</dd>

				<dt id="term-3">term 3</dt>
					<dd>definition 3-a</dd>
					<dd>definition 3-b</dd>
			</dl>
			<script>
				$("#term-2").prevUntil("dt")
				.css("background-color", "red");

				var term1 = document.getElementById('term-1');
				$("#term-3").prevUntil(term1, "dd")
				.css("color", "green");
			</script>

		</body>
		</html>
	*/
	prevUntil: function(elem, i, until) {
		return sjs.dir(elem, "previousSibling", until);
	},
	/**
	获取当前sjs对象所有兄弟节点或满足条件的所有兄弟节点
	@method siblings 
	@param {object|string} elem 选择符/HTML/DOM元素/sjs对象
	@return {object} sjs对象
	@example
		<html>
		<head>
		<style>
			ul { float:left; margin:5px; font-size:16px; font-weight:bold; }
			p { color:blue; margin:10px 20px; font-size:16px; padding:5px;font-weight:bolder; }
			.hilite { background:yellow; }
		</style>
		<script src="sjs.js"></script>
		</head>
		<body>
			<ul>
				<li>One</li>
				<li>Two</li>
				<li class="hilite">Three</li>
				<li>Four</li>
			</ul>

			<ul>
				<li>Five</li>
				<li>Six</li>
				<li>Seven</li>
			</ul>
			<ul>
				<li>Eight</li>
				<li class="hilite">Nine</li>
				<li>Ten</li>
				<li class="hilite">Eleven</li>
			</ul>
			<p>Unique siblings: <b></b></p>
			<script>
				var len = $(".hilite").siblings()
				.css("color", "red")
				.length;
				$("b").text(len);
			</script>

		</body>
		</html>
	*/
	siblings: function(elem) {
		return sjs.sibling((elem.parentNode || {}).firstChild, elem);
	},
	/**
	获取当前sjs对象中所有元素的子节点
	@method children
	@param {object|string} elem 选择符/HTML/DOM元素/sjs对象
	@return {object} sjs对象
	@example
		<html>
		<head>
		<script src="sjs.js"></script>
		</head>
		<body>
			<div>
				<span>Hello</span>
				<p class="selected">Hello Again</p>
				<div class="selected">And Again</div>
				<p>And One Last Time</p>
			</div>
			<script>$("div").children(".selected").css("color", "blue");</script>
		</body>
		</html>
	*/
	children: function(elem) {
		return sjs.sibling(elem.firstChild);
	},
	/**
	获取当前sjs对象中所有元素的子节点，包括文本节点和注释节点
	@method contents
	@param {object|string} elem 选择符/HTML/DOM元素/sjs对象
	@return {object} sjs对象
	@example
		<html>
		<head>
		<script src="sjs.js"></script>
		</head>
		<body>
			<p>Hello <a href="http://ejohn.org/">John</a>, how are you doing?</p>
			<script>$("p").contents().filter(function(){ return this.nodeType != 1; }).wrap("<b/>");</script>
		</body>
		</html>
	*/
	contents: function(elem) {
		return sjs.nodeName(elem, "iframe") ? elem.contentDocument || elem.contentWindow.document : sjs.merge([], elem.childNodes);
	}
}, function(name, fn) {

	sjs.fn[name] = function(until, selector) {
		var ret = sjs.map(this, fn, until);

		if (!runtil.test(name)) {
			selector = until;
		}

		if (selector && typeof selector === "string") {
			ret = sjs.filter(selector, ret);
		}

		ret = this.length > 1 && !guaranteedUnique[name] ? sjs.unique(ret) : ret;

		if (this.length > 1 && rparentsprev.test(name)) {
			ret = ret.reverse();
		}

		return this.pushStack(ret);
	};

});

/*
 * 创建一个安全的fragment列表
 */
function createSafeFragment(document) {
	var list = nodeNames.split('|'), 
	safeFragment = document.createDocumentFragment();

	if (safeFragment.createElement) {
		while (list.length) {
			safeFragment.createElement(
			list.pop()
			);
		}
	}
	return safeFragment;
}
var nodeNames = "abbr|article|aside|audio|bdi|canvas|data|datalist|details|figcaption|figure|footer|" +
		"header|hgroup|mark|meter|nav|output|progress|section|summary|time|video",
rinlineSjs = / sjs\d+="(?:null|\d+)"/g, 
rnoshimcache = new RegExp("<(?:" + nodeNames + ')[\\s/>]', 'i'),
 rxhtmlTag = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/gi,
  rtagName = /<([\w:]+)/, 
  rleadingWhitespace = /^\s+/, 
  rtbody = /<tbody/i, 
  
  
  rhtml = /<|&#?\w+;/, 
  rnoInnerhtml = /<(?:script|style|link)/i, 
rcheckableType = /^(?:checkbox|radio)$/i, 
  rchecked = /checked\s*(?:[^=]|=\s*.checked.)/i, 
  rscriptType = /^$|\/(?:java|ecma)script/i, 
	rscriptTypeMasked = /^true\/(.*)/,
	rcleanScript = /^\s*<!(?:\[CDATA\[|--)|(?:\]\]|--)>\s*$/g,

//我们需要手动关闭这些标签来支持xhtml
wrapMap = {
	option : [1, '<select multiple="multiple">', '</select>'],
	legend : [1, '<fieldset>', '</fieldset>'],
	area : [1, '<map>', '</map>'],
	param : [1, '<object>', '</object>'],
	thead : [1, '<table>', '</table>'],
	tr : [2, '<table><tbody>', '</tbody></table>'],
	col : [2, "<table><tbody></tbody><colgroup>", "</colgroup></table>"],
	td : [3, '<table><tbody><tr>', '</tr></tbody></table>'],
	//IE6-8不能正常序列化link,script,style或者html5标签
	//除非在用一个前方有非空字符的div包起来
	_default : sjs.support.htmlSerialize ? [0, '', ''] : [1, 'X<div>', '</div>']
}, 
safeFragment = createSafeFragment(document), 
fragmentDiv = safeFragment.appendChild(document.createElement("div"));
wrapMap.optgroup = wrapMap.option;
wrapMap.tbody = wrapMap.tfoot = wrapMap.colgroup = wrapMap.caption = wrapMap.thead;
wrapMap.th = wrapMap.td;

sjs.fn.extend({
	
	/**
	 * set/get 元素的 textContent
	 * @param {String} value 文本
	 * @return {String}
	 */
	text : function(value) {
		return sjs.access(this, function(value) {
			return value === undefined ? sjs.text(this) : this.empty().append((this[0] && this[0].ownerDocument || document).createTextNode(value));
		}, null, value, arguments.length);
	},
	/**
	 * 在指定的 HTML 内容或元素中放置所有被选的元素
	 * @method
	 * @param		{String} html    必需。规定包裹被选元素的内容。可能的值:HTML 代码 - 比如 ("<div></div>")。新的 DOM 元素 - 比如 (document.createElement("div"))。已存在的元素 - 比如 ($(".div1"))已存在的元素不会被移动，只会被复制，并包裹被选元素。
	 * @return		{Sjs}  当前sjs对象
	 */
	wrapAll : function(html) {
		if (sjs.isFunction(html)) {
			return this.each(function(i) {
				sjs(this).wrapAll(html.call(this, i));
			});
		}
		if (this[0]) {
			var wrap = sjs(html, this[0].ownerDocument).eq(0).clone(true);
			if (this[0].parentNode) {
				wrap.insertBefore(this[0]);
			}

			wrap.map(function() {
				var elem = this;
				while (elem.firstChild && elem.firstChild.nodeType === 1) {
					elem = elem.firstChild;
				}
				return elem;
			}).append(this);
		}
		return this;
	},
	
	/**
	 * 使用指定的 HTML 内容或元素，来包裹每个被选元素中的所有内容 (inner HTML)
	 * @method
	 * @param		{String}html    必需。规定包裹被选元素的内容。可能的值:HTML 代码 - 比如 ("<div></div>")。新的 DOM 元素 - 比如 (document.createElement("div"))。已存在的元素 - 比如 ($(".div1"))已存在的元素不会被移动，只会被复制，并包裹被选元素。
	 * @return		{Sjs}  当前sjs对象
	 */
	wrapInner : function(html) {
		if (sjs.isFunction(html)) {
			return this.each(function(i) {
				sjs(this).wrapInner(html.call(this, i));
			});
		}

		return this.each(function() {
			var self = sjs(this);
			var contents = self.contents();

			if (contents.length) {
				contents.wrapAll(html);
			} else {
				self.append(html);
			}
		});
	},
	
	/**
	 * 在指定的 HTML 内容或元素中放置所有被选的元素
	 * @method
	 * @param		{String}html    必需。规定包裹被选元素的内容。可能的值:HTML 代码 - 比如 ("<div></div>")。新的 DOM 元素 - 比如 (document.createElement("div"))。已存在的元素 - 比如 ($(".div1"))已存在的元素不会被移动，只会被复制，并包裹被选元素。
	 * @return		{Sjs}  当前sjs对象
	 */
	wrap : function(html) {
		var isFunction = sjs.isFunction(html);
		return this.each(function(i) {
			sjs(this).wrapAll( isFunction ? html.call(this, i) : html);
		});
	},
		
	/**
	 * 删除被选元素的父元素
	 * @method
	 */
	unwrap : function() {
		return this.parent().each(function() {
			if (!sjs.nodeName(this, 'body')) {
				sjs(this).replaceWith(this.childNodes);
			}
		}).end();
	},
	
	/**
	 * 在被选元素的结尾（仍然在内部）插入指定内容
	 * @method
	 * @param		{Sjs|element|html}	html 必需。规定要插入的内容（可包含 HTML 标签）。
	 * @return		{Sjs}	当前sjs对象
	 */
	append : function( html ) {
		return this.domManip(arguments, true, function(elem) {
			if (this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9) {
				this.appendChild(elem);
			}
		});
	},
	
	/**
	 * 在被选元素的开头（仍位于内部）插入指定内容
	 * @method
	 * @param		{Sjs|element|html}	html 必需。规定要插入的内容（可包含 HTML 标签）。
	 * @return		{Sjs}	当前sjs对象
	 */
	prepend : function(  html ) {
		return this.domManip(arguments, true, function(elem) {
			if (this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9) {
				this.insertBefore(elem, this.firstChild);
			}
		});
	},
	
	/**
	 * 在被选元素之前（外部）插入指定内容
	 * @method
	 * @param		{Sjs|element|html}	html 必需。规定要插入的内容（可包含 HTML 标签）。
	 * @return		{Sjs}	当前sjs对象
	 */
	before : function( html ) {
		return this.domManip(arguments, false, function(elem) {
			if (this.parentNode) {
				this.parentNode.insertBefore(elem, this);
			}
		});
	},
	
	/**
	 * 在被选元素之后（外部）插入指定内容
	 * @method
	 * @param		{Sjs|element|html}	html 必需。规定要插入的内容（可包含 HTML 标签）。
	 * @return		{Sjs}	当前sjs对象
	 */
	after : function( html ) {
		return this.domManip(arguments, false, function(elem) {
			if (this.parentNode) {
				this.parentNode.insertBefore(elem, this.nextSibling);
			}
		});
	},
	
	/**
	 * 移除所有匹配元素
	 * @method
	 * @param		{Sjs|element|selector}	selector 要删除的内容，如果为空则删除当前对象
	 * @param		{Boolean}	keepData		是否保留数据，默认不保留
	 * @return		{Sjs}	当前sjs对象
	 */
	remove : function(selector, keepData) {
		var elem;
		var i = 0;
		for (; ( elem = this[i]) != null; i++) {
			if (!selector || sjs.filter(selector, [elem]).length > 0) {
				if (!keepData && elem.nodeType === 1) {
					sjs.cleanData(getAll(elem));
				}

				if (elem.parentNode) {
					if (keepData && sjs.contains(elem.ownerDocument, elem)) {
						setGlobalEval(getAll(elem, 'script'));
					}
					elem.parentNode.removeChild(elem);
				}
			}
		}
		return this;
	},

	/**
	 * 从被选元素移除所有内容,包括所有文本和子节点。
	 * @method
	 * @return		{Sjs}	当前sjs对象
	 */
	empty : function() {
		var elem;
		var i = 0;
		for (; ( elem = this[i]) != null; i++) {
			if (elem.nodeType === 1) {
				sjs.cleanData(getAll(elem, false));
			}
			while (elem.firstChild) {
				elem.removeChild(elem.firstChild);
			}
			if (elem.options && sjs.nodeName(elem, "select")) {
				elem.options.length = 0;
			}
		}
		return this;
	},
	
	/**
	 * 生成被选元素的副本，包含子节点、文本和属性
	 * @method
	 * @param		{Boolean}		dataAndEvents		是否复制数据和事件
	 * @param		{Boolean}		deepDataAndEvents	是否进行数据和事件的深度复制
	 * @return		{Sjs}	复制得到的sjs对象
	 * 
	 */
	clone : function(dataAndEvents, deepDataAndEvents) {
		dataAndEvents = dataAndEvents == null ? false : dataAndEvents;
		deepDataAndEvents = deepDataAndEvents == null ? dataAndEvents : deepDataAndEvents;
		return this.map(function() {
			return sjs.clone(this, dataAndEvents, deepDataAndEvents);
		});
	},
	
	/**
	 * 返回或设置被选元素的内容 (inner HTML)
	 * @method
	 * @param		{String }  html文本
	 * @return		{Sjs}	当前sjs对象
	 */
	html: function(value) {
		return sjs.access(this, function(value) {
			var elem = this[0] || {};
			var i = 0;
			var l = this.length;
			if (value === undefined) {
				return elem.nodeType === 1 ? 
				elem.innerHTML.replace(rinlineSjs, '') : 
				undefined;
			}

			// See if we can take a shortcut and just use innerHTML
			if ( typeof value === "string" && !rnoInnerhtml.test(value) && 
			(sjs.support.htmlSerialize || !rnoshimcache.test(value)  ) && 
			(sjs.support.leadingWhitespace || !rleadingWhitespace.test(value) ) && 
			!wrapMap[ ( rtagName.exec( value ) || ["", ""] )[1].toLowerCase()]) {

				value = value.replace(rxhtmlTag, "<$1></$2>");

				try {
					for (; i < l; i++) {
						elem = this[i] || {};
						if (elem.nodeType === 1) {
							sjs.cleanData(getAll(elem, false));
							elem.innerHTML = value;
						}
					}
					elem = 0;
				} catch (e) {				}
			}
			if (elem) {
				this.empty().append(value);
			}
		}, null, value, arguments.length);
	},
	
	/**
	 * 用新内容替换匹配的元素
	 * @method
	 * @param		{Sjs | html | element } value		规定替换被选元素的内容
	 * @return		{Sjs}	当前sjs对象
	 */
	replaceWith : function(value) {
		var isFunction = sjs.isFunction(value);
		if (!isFunction && typeof value !== 'string') {
			value = sjs(value).not(this).detach();
		}
		return value !== '' ? 
		this.domManip([value], true, function(elem) {
			var next = this.nextSibling, 
			parent = this.parentNode;
			if (parent) {
				sjs(this).remove();
				parent.insertBefore(elem, next);
			}
		}) : 
		this.remove();
	},
	
	/**
	 * 移除所有匹配元素，但在sjs对象中保存原有的数据和事件
	 * @method
	 * @param		{Sjs|element|selector}	selector 要删除的内容，如果为空则删除当前对象
	 * @return		{Sjs}	当前sjs对象
	 */
	detach : function(selector) {
		return this.remove(selector, true);
	},
	domManip : function(args, table, callback) {
		args = [].concat.apply([], args);

		var first, node, hasScripts, 
		scripts, doc, fragment, 
		i = 0, 
		l = this.length, 
		set = this, 
		iNoClone = l - 1, 
		value = args[0], 
		isFunction = sjs.isFunction(value);

		if (isFunction || !(l <= 1 || typeof value !== "string" || sjs.support.checkClone || !rchecked.test(value))) {
			return this.each(function(index) {
				var self = set.eq(index);
				if (isFunction) {
					args[0] = value.call(this, index, table ? self.html() : undefined);
				}
				self.domManip(args, table, callback);
			});
		}
		if (l) {
			fragment = sjs.buildFragment(args, this[0].ownerDocument, false, this);
			first = fragment.firstChild;
			if (fragment.childNodes.length === 1) {
				fragment = first;
			}
			if (first) {
				table = table && sjs.nodeName(first, 'tr');
				scripts = sjs.map(getAll(fragment, 'script'), disableScript);
				hasScripts = scripts.length;

				for (; i < l; i++) {
					node = fragment;
					if (i !== iNoClone) {
						node = sjs.clone(node, true, true);
						if (hasScripts) {
							sjs.merge(scripts, getAll(node, 'script'));
						}
					}

					callback.call(
						table && sjs.nodeName( this[i], "table" ) ?
							findOrAppend( this[i], "tbody" ) :
							this[i],
						node,
						i
					);
				}

				if (hasScripts) {
					doc = scripts[scripts.length - 1].ownerDocument;
					sjs.map(scripts, restoreScript);
					for ( i = 0; i < hasScripts; i++) {
						node = scripts[i];
						if (rscriptType.test(node.type || "") &&
							!sjs._data(node, 'globalEval') && sjs.contains(doc, node)) {
							if (node.src) {
								sjs.ajax({
									url : node.src,
									type : "GET",
									dataType : 'script',
									async : false,
									global : false,
									"throws" : true
								});
							} else {
								sjs.globalEval((node.text || node.textContent || node.innerHTML || "").replace(rcleanScript, ''));
							}
						}
					}
				}
				fragment = first = null;
			}
		}
		return this;
	}
});

function findOrAppend(elem, tag) {
	return elem.getElementsByTagName(tag)[0] || elem.appendChild(elem.ownerDocument.createElement(tag));
}

function disableScript(elem) {
	var attr = elem.getAttributeNode('type');
	elem.type = (attr && attr.specified ) + '/' + elem.type;
	return elem;
}

function restoreScript(elem) {
	var match = rscriptTypeMasked.exec(elem.type);
	if (match) {
		elem.type = match[1];
	} else {
		elem.removeAttribute("type");
	}
	return elem;

}

function setGlobalEval(elems, refElements) {
	var elem, i = 0;
	for (; ( elem = elems[i]) != null; i++) {
		sjs._data(elem, "globalEval", !refElements || sjs._data(refElements[i], 'globalEval'));
	}
}

function cloneCopyEvent(src, dest) {
	if (dest.nodeType !== 1 || !sjs.hasData(src)) {
		return;
	}
	var type, i, l, 
	oldData = sjs._data(src), 
	curData = sjs._data(dest, oldData), 
	events = oldData.events;

	if (events) {
		delete curData.handler;
		curData.events = {};

		for (type in events) {
			for ( i = 0, l = events[type].length; i < l; i++) {
				sjs.event.add(dest, type, events[type][i]);
			}
		}
	}
	//modify
	if (curData.data) {
		curData.data = sjs.extend({}, curData.data);
	}
}

function fixCloneNodeIssues(src, dest) {
	var nodeName, e, data;
	if (dest.nodeType !== 1) {
		return;
	}
	nodeName = dest.nodeName.toLowerCase();
	//var expando = sjs._expando();
	//if (!sjs.support.noCloneEvent && dest[expando]) {
	if (!sjs.support.noCloneEvent && dest[sjs.expando]) {
		data = sjs._data(dest);
		for (e in data.events) {
			//alert(dest);
			sjs.removeEvent(dest, e, data.handler);
		}
		//dest.removeAttribute(expando);
		dest.removeAttribute(sjs.expando);
	}
	if (nodeName === "script" && dest.text !== src.text) {
		disableScript(dest).text = src.text;
		restoreScript(dest);
	} else if (nodeName === 'object') {
		if (dest.parentNode) {
			dest.outerHTML = src.outerHTML;
		}

		if (sjs.support.html5Clone && (src.innerHTML && !sjs.trim(dest.innerHTML))) {
			dest.innerHTML = src.innerHTML;
		}

	} else if (nodeName === 'input' && rcheckableType.test(src.type)) {
		dest.defaultChecked = dest.checked = src.checked;
		if (dest.value !== src.value) {
			dest.value = src.value;
		}
	} else if (nodeName == 'option') {
		dest.defaultSelected = dest.selected = src.defaultSelected;
	} else if (nodeName == 'input' || nodeName === 'textarea') {
		dest.defaultValue = src.defaultValue;
	}
}

sjs.each({
	appendTo : "append",
	prependTo : "prepend",
	insertBefore : "before",
	insertAfter : "after",
	replaceAll : "replaceWith"
}, function(name, original) {
	sjs.fn[name] = function(selector) {
		var elems, 
		i = 0, 
		ret = [], 
		insert = sjs(selector), 
		last = insert.length - 1;

		for (; i <= last; i++) {
			elems = i === last ? this : this.clone(true);
			sjs( insert[i] )[ original ](elems);

			// Modern browsers can apply sjs collections as arrays, but oldIE needs a .get()
			core_push.apply(ret, elems.get());
		}

		return this.pushStack(ret);
	};
});

/*
 * 获取context下的node元素
 * @param {node} context 根元素
 * @param {string} tag 指定要获取的元素标签名称
 * @param {array} 返回所有的元素列表
 */
function getAll(context, tag) {

	var elems, elem, 
	i = 0, 
	found = typeof context.getElementsByTagName !== (typeof undefined) ? context.getElementsByTagName(tag || '*') : 
	typeof context.querySelectorAll !== (typeof undefined) ? context.querySelectorAll(tag || '*') : 
	undefined;

	if (!found) {
		for ( found = [], elems = context.childNodes || context; ( elem = elems[i]) != null; i++) {
			if (!tag || sjs.nodeName(elem, tag)) {
				found.push(elem);
			} else {
				sjs.merge(found, getAll(elem, tag));
			}
		}
	}

	return tag === undefined || tag && sjs.nodeName(context, tag) ? sjs.merge([context], found) : found;
}

// Used in buildFragment, fixes the defaultChecked property
function fixDefaultChecked(elem) {
	if (rcheckableType.test(elem.type)) {
		elem.defaultChecked = elem.checked;
	}
}

sjs.extend({
	clone : function(elem, dataAndEvents, deepDataAndEvents) {
		var destElements, node, clone, i, srcElements, inPage = sjs.contains(elem.ownerDocument, elem);

		if (sjs.support.html5Clone || sjs.isXMLDoc(elem) || !rnoshimcache.test("<" + elem.nodeName + ">")) {
			clone = elem.cloneNode(true);

			// IE<=8 does not properly clone detached, unknown element nodes
		} else {
			fragmentDiv.innerHTML = elem.outerHTML;
			fragmentDiv.removeChild( clone = fragmentDiv.firstChild);
		}

		if ((!sjs.support.noCloneEvent || !sjs.support.noCloneChecked) && 
		(elem.nodeType === 1 || elem.nodeType === 11) && !sjs.isXMLDoc(elem)) {

			// We eschew Sizzle here for performance reasons: http://jsperf.com/getall-vs-sizzle/2
			destElements = getAll(clone);
			srcElements = getAll(elem);

			// Fix all IE cloning issues
			for ( i = 0; ( node = srcElements[i]) != null; ++i) {
				// Ensure that the destination node is not null; Fixes #9587
				if (destElements[i]) {
					fixCloneNodeIssues(node, destElements[i]);
				}
			}
		}

		// Copy the events from the original to the clone
		if (dataAndEvents) {
			if (deepDataAndEvents) {
				srcElements = srcElements || getAll(elem);
				destElements = destElements || getAll(clone);

				for ( i = 0; ( node = srcElements[i]) != null; i++) {
					cloneCopyEvent(node, destElements[i]);
				}
			} else {
				cloneCopyEvent(elem, clone);
			}
		}

		// Preserve script evaluation history
		destElements = getAll(clone, "script");
		if (destElements.length > 0) {
			setGlobalEval(destElements, !inPage && getAll(elem, "script"));
		}

		destElements = srcElements = node = null;

		// Return the cloned set
		return clone;
	},
	/*
	 * 创建fragment
	 * @param {array} elems 要创建的元素列表
	 * @param {object} context 上下文
	 */
	buildFragment : function(elems, context, scripts, selection) {
		var j,elem, contains,
		tmp, tag,  tbody,wrap,  
		len = elems.length, 
		safe = createSafeFragment(context), 
		nodes = [],
		i = 0;

		for (; i < len; i++) {
			elem = elems[i];

			if (elem || elem === 0) {
				//判断如果是node
				if (sjs.type(elem) === 'object') {
					sjs.merge(nodes, elem.nodeType ? [elem] : elem);
				} else if (!rhtml.test(elem)) {
					//判断如果是文本
					nodes.push(context.createTextNode(elem));
				} else {
					//根据html生成node
					tmp = tmp || safe.appendChild(context.createElement('div'));
					//反序列化html字符串
					tag = (rtagName.exec(elem) || ['', ''])[1].toLowerCase();
					wrap = wrapMap[tag] || wrapMap._default;

					tmp.innerHTML = wrap[1] + elem.replace(rxhtmlTag, '<$1></$2>') + wrap[2];

					//获取wrap包装内部的内容，也就是我们真正想要的html内容
					j = wrap[0];
					while (j--) {
						tmp = tmp.lastChild;
					}

					//手动修复被IE删掉的空格
					if (!sjs.support.leadingWhitespace && rleadingWhitespace.test(elem)) {
						nodes.push(context.createTextNode(rleadingWhitespace.exec(elem)[0]));
					}
					//删除自动添加的tbody
					if (!sjs.support.tbody) {
						if (tag === 'table' && !rtbody.test(elem)) {
							elem = tmp.firstChild;
						} else {
							elem = wrap[1] === '<table>' && !rtbody.test(elem) ? tmp : 0;
						}

						j = elem && elem.childNodes.length;
						while (j--) {
							if (sjs.nodeName((tbody = elem.childNodes[j]), 'tbody') && !tbody.childNodes.length) {
								elem.removeChild(tbody);
							}
						}
					}
					sjs.merge(nodes, tmp.childNodes);

					//将tmp指回fragment的最后一个节点
					tmp.textContent = "";

					// Fix #12392 for oldIE
					while (tmp.firstChild) {
						tmp.removeChild(tmp.firstChild);
					}

					// Remember the top-level container for proper cleanup
					tmp = safe.lastChild;
				}
			}
		}
		if (tmp) {
			safe.removeChild(tmp);
		}

		//重置input radio/checkbox默认值
		if (!sjs.support.appendChecked) {
			sjs.grep(getAll(nodes, 'input'), fixDefaultChecked);
		}

		i = 0;
		while (( elem = nodes[i++])) {
			//这里处理$('#x').insertAfter('#x')这种情况
			if (selection && sjs.inArray(elem, selection) !== -1) {
				continue;
			}

			contains = sjs.contains(elem.ownerDocument, elem);

			// Append to fragment
			tmp = getAll(safe.appendChild(elem), "script");

			// Preserve script evaluation history
			if (contains) {
				setGlobalEval(tmp);
			}

			// Capture executables
			if (scripts) {
				j = 0;
				while (( elem = tmp[j++])) {
					if (rscriptType.test(elem.type || "")) {
						scripts.push(elem);
					}
				}
			}
		}
		tmp = null;

		return safe;
	},
	cleanData : function(elems, acceptData) {
		var data;
		var elem;
		var type;
		var l = elems.length;
		var i = 0;
		
		var id;
		var cache = sjs.cache;
		var deleteExpando = sjs.support.deleteExpando;
		var special = sjs.event.special;

		for (; ( elem = elems[i]) != null; i++) {
			if (acceptData || sjs.acceptData(elem)) {
				//data = sjs._data(elem);
				id = elem[sjs.expando];
				data = id && cache[id];
				if (data) {
					if (data.events) {
						for (type in data.events) {
							if (special[type]) {
								sjs.event.remove(elem, type);
							} else {
								sjs.removeEvent(elem, type, data.handler);
							}
						}
					}
					if (cache[id]) {
						delete cache[id];

						if (deleteExpando) {
							delete elem[sjs.expando];
						} else if ( typeof elem.removeAttribute != typeof undefined) {
							elem.removeAttribute(sjs.expando);
						} else {
							elem[sjs.expando] = null;
						}

						core_deletedIds.push(id);
					}
				}
			}
		}
	}
});

var core_pnum = /[+-]?(?:\d*\.|)\d+(?:[eE][+-]?\d+|)/.source;
var iframe;
var getStyles;
var curCSS;
var ralpha = /alpha\([^)]*\)/i;
var ropacity = /opacity\s*=\s*([^)]*)/;
var rposition = /^(top|right|bottom|left)$/;
var rdisplayswap = /^(none|table(?!-c[ea]).+)/;
var rmargin = /^margin/;
var rnumsplit = new RegExp( "^(" + core_pnum + ")(.*)$", "i" );
var rnumnonpx = new RegExp( "^(" + core_pnum + ")(?!px)[a-z%]+$", "i" );
var rrelNum = new RegExp( "^([+-])=(" + core_pnum + ")", "i" );
var elemdisplay = { BODY: "block" };
var cssPrefixes = ['Webkit', 'O', 'Moz', 'ms'];
var cssExpand = [ "Top", "Right", "Bottom", "Left" ];
var cssShow = { position: "absolute", visibility: "hidden", display: "block" };


var cssNormalTransform = {
  letterSpacing : 0,
  fontWeight : 400
};
/**
 *增加属性前缀
 *在不同的浏览器中，某些属性（主要是css3新属性），会增加不同的前缀
 *类似transform 在不同浏览器中识别为MozTransform或WebkitTransform或OTransform
 */
function vendorPropName(style,name)
{
  if( name in style)
  {
    return name;
  }

  var capName = name.charAt(0).toUpperCase() + name.slice(1);
  var origName = name;
  var i = cssPrefixes.length;

  while( i--)
  {
    name = cssPrefixes[i] + capName;
    if( name in style)
    {
      return name;
    }
  }
	return origName;
}

/**
 * 元素是否是隐藏的。
 * 有两种情况，1，display为none，2.没有被追加到Dom树中
 **/
function isHidden( elem, el)
{
  elem = el || elem;
  return sjs.css(elem,'display') ==='none' || !sjs.contains(elem.ownerDocument,elem);
}

function showHide( elements, show)
{
  var display;
  var elem;
  var hidden;
  var values =[];
  var index = 0;
  var length = elements.length;

  for(;index<length;index++)
  {
    elem = elements[index];
    if( !elem.style)
    {
      continue;
    }

    values[index] = sjs._data(elem,'olddisplay');
    display = elem.style.display;
    if( show )
    {
      if(!values[index] && display ==='none')
      {
        elem.style.display = "";
      }
      if( elem.style.display ==="" && isHidden(elem))
      {
        values[index] = sjs._data(elem, 'olddisplay',css_defaultDisplay(elem.nodeName));
      }
    } else 
    {
      if(!values[index])
      {
        hidden = isHidden( elem );
        if( display && display !='none' || !hidden)
        {
          sjs._data(elem, 'olddisplay', hidden? display : sjs.css(elem,'display'));
        }
      }
    }

    if( !show || elem.style.display ==='none' || elem.style.display ==='')
    {
      elem.style.display = show ? values[ index ] || "" : "none";
    }
  }
  return elements;
}

sjs.fn.extend({
  /**
   * set/get 元素的样式属性
   *@method
   *@param {String|Array<String>} name 样式名 
   *@param {String} value 属性值
   **/
  css: function(name,value)
  {
    return sjs.access( this, function( elem, name, value){
      var len;
      var styles;
      var map = {};
      var i = 0;
      if( sjs.isArray(name))
      {
        styles = getStyles( elem);
        len = name.length;

        for(;i<len;i++)
        {
          map [ name [ i ] ] = sjs.css(elem, name[i], false, styles );
        }
        return map;
      }

      return value !== undefined ? sjs.style( elem, name, value) : sjs.css(elem, name );

    }, name, value, arguments.length>1);
  },
  /**
   *显示元素
   *@method
   **/
  show: function()
  {
    return showHide(this,true);
  },
  /**
   *隐藏元素
   *@method
   **/
  hide: function()
  {
    return showHide(this, false);
  },
   /**
   *显示/隐藏元素
   *@method
   *@param {Boolean} state 强制显示或隐藏
   **/
  toggle: function( state )
  {
    var bool = typeof state === 'boolean';
		return this.each(function() {
			if ( bool ? state : isHidden( this ) ) {
				sjs( this ).show();
			} else {
				sjs( this ).hide();
			}
		});
  }
});

sjs.extend({
    //修正Css属性set。get方法
    cssHooks:{
        opacity: {
            get: function( elem, computed)
            {
                if(computed){
                    var ret = curCSS( elem, 'opacity');
                    return ret ==="" ? "1" : ret;
                }
            }
        }
    },
    cssNumber:{
        //列宽固定，根据容器宽度液态分布列数:整数
        'columnCount':true,
        //代表填充透明度0-1之间
        'fillOpacity': true,
        //设置显示元素的文本中所用的字体加粗。数字值 400 相当于 关键字 normal，700 等价于 bold
        'fontWeight' : true,
        //它定义了该元素中基线之间的最小距离而
        'lineHeight' : true,
        //透明度
        'opacity'   : true,
        //打印属性，设置当元素内部发生分页时必须在页面底部保留的最少行数
        'orphans':  true,
        //打印属性，设置当元素内部发生分页时必须在页面顶部保留的最少行数
        'widows': true,
        //设置元素的堆叠顺序。拥有更高堆叠顺序的元素总是会处于堆叠顺序较低的元素的前面
        'zIndex': true,
        //ie私有属性，设置或获取对象的缩放比例，设置它会触发haslayout
        'zoom'  : true
    },
    cssProps:{
        //因float 与浮点数的英文相同，故在api中做变形，ie为styleFloat,其他为cssFloat
        'float': sjs.support.cssFloat ? 'cssFloat' : 'styleFloat'
    },
    /**
     *set,get 元素的样式属性
     *@method
     *@param {elementNode} elem Dom元素
     *@param {String} name 属性名
     *@param {String} value 属性值
     *@param {String} extra 内部使用
     */
    style: function ( elem, name,value,extra)
    {
        //文本节点和注释节点不能设置样式
        if( !elem || elem.nodeType === 3 || elem.nodeType === 8 || !elem.style )
        {
            return;
        }

        var ret;
        var type;
        var hooks;
        var origName = sjs.camelCase( name );
        var style = elem.style;
        // 现对变量名进行修正
        name = sjs.cssProps[ origName] || ( sjs.cssProps[origName] = vendorPropName(style,origName));

        hooks = sjs.cssHooks[ name ] || sjs.cssHooks[origName];

        if(value !== undefined ){
          type = typeof value;
          //修正类似+= -=这种参数
          if( type === 'string' && ( ret = rrelNum.exec(value)))
          {
            value = (ret[1] + 1 ) * ret[2] + parseFloat( sjs.css( elem, name));
            type = 'number';
          }
			// Make sure that NaN and null values aren't set. See: #7116
			if ( value == null || type === "number" && isNaN( value ) ) {
				return;
			}
          if( type === 'number' && !sjs.cssNumber[origName])
          {
            value += 'px';
          }
          //处理backgound ,在需要清空样式的时候
          if( !sjs.support.clearCloneStyle && value ==='' && name.indexOf('backgournd') === 0 )
          {
            style[ name ] = 'inherit';
          }
          if(!hooks || !('set' in hooks) || (value = hooks.set( elem,value,extra)) !== undefined )
          {
            try{
              style[ name ] = value;
            }catch( e ){}
          }
        }else{
          if( hooks && 'get' in hooks && (ret = hooks.get(elem, false,extra))!== undefined)
          {
            return ret;
          }
          return style[name];
        } 
    },
   /**
    *获取元素样式 
     *@method
     *@param {elementNode} elem Dom元素
     *@param {String} name 属性名
     *@param {String} styles 内部使用
     *@param {String} extra 内部使用
    */
    css: function ( elem, name, extra, styles)
    {
      var num;
      var val;
      var hooks;
      var origName = sjs.camelCase( name);

      name = sjs.cssProps[ origName ] || (sjs.cssProps[origName] = vendorPropName( elem.style, origName));

      hooks = sjs.cssHooks[ name] || sjs.cssHooks[origName];

      if( hooks && 'get' in hooks)
      {
        val = hooks.get(elem, true, extra);
      }
      if (val === undefined ) {
        val = curCSS( elem, name, styles);
      }

      if( val === 'normal' && name in cssNormalTransform)
      {
        val = cssNormalTransform[ name ];
      }

      if( extra === '' || extra)
      {
        num = parseFloat( val );
        return extra === true || sjs.isNumeric( num )? num || 0 :val;
      }
      return val;
    },
    /**
     * 把一堆样式付给元素，由callback进行相关计算，然后再让元素恢复之前的样式，好绕口。
     */
    swap: function( elem, options, callback, args )
    {
      var ret;
      var name;
      var old = {};

      for(name in options)
      {
        old[name] = elem.style[name];
        elem.style[name] = options[ name];
      }
      ret = callback.apply(elem,args||[]);
      for(name in options)
      {
        elem.style[name] = old[name];
      }
      return ret;
    }
});

//声明 curCSS和getStyles
if(window.getComputedStyle)
{
  getStyles = function( elem)
  {
    return window.getComputedStyle(elem, null);
  };

  curCSS = function ( elem, name, _computed)
  {
    var width;
    var minWidth;
    var maxWidth;
    var computed = _computed || getStyles(elem);


    var ret = computed ? computed.getPropertyValue( name ) || computed[ name ] : undefined;
    
 
    var style = elem.style;

    if( computed )
    {
      if (ret === '' && !sjs.contains(elem.ownerDocument))
      {
        ret = sjs.style( elem, name);
      }
      if( rnumnonpx.test(ret) && rmargin.test(name))
      {
        width = style.width;
        minWidth = style.minWidth;
        maxWidth = style.maxWidth;

        style.minWidth = style.maxWidth = style.width = ret;
        ret = computed.width;

        style.width = width;
        style.minWidth = minWidth;
        style.maxWidth = maxWidth;
      }
    }
    return ret;
  };
  //ie 获取当前样式的方法
}else if ( document.documentElement.currentStyle)
{
    getStyles = function( elem )
    {
      return elem.currentStyle;
    };

    curCSS = function ( elem, name, _computed)
    {
      var left;
      var rs;
      var rsLeft;
      var computed = _computed || getStyles( elem);
      var ret = computed ? computed[ name ] : undefined;
      var style = elem.style;
      // 不要auto
      if( ret == null && style && style[name])
      {
        ret = style[name];
      }

      if( rnumnonpx.test( ret ) && !rposition.test(name))
      {
        left = style.left;
        //ie 下面runtimeStyle设置的属性会及时生效，但它不会同步到style上，你妹啊！
        rs = elem.runtimeStyle;
        rsLeft = rs && rs.left;

        if(rsLeft)
        {
          rs.left = elem.currentStyle.left;
        }

        style.left = name ==='fontSize'?'1em' : ret;
        //pixelLeft 返回不带px的left，是个整形
        ret = style.pixelLeft + 'px';

        style.left = left;
        if(rsLeft)
        {
          rs.left = rsLeft;
        }
      }
      return ret ==='' ? 'auto' : ret;
    };
}

function setPositiveNumber( elem, value, subtract)
{
    var matches = rnumsplit.exec(value);
    return matches ? Math.max(0, matches[1] -(subtract||0)) + (matches[2]||'px'):value;
}

/**
box-sizing

content-box 
这是由 CSS2.1 规定的宽度高度行为。
宽度和高度分别应用到元素的内容框。
在宽度和高度之外绘制元素的内边距和边框。
border-box  
为元素设定的宽度和高度决定了元素的边框盒。
就是说，为元素指定的任何内边距和边框都将在已设定的宽度和高度内进行绘制。
通过从已设定的宽度和高度分别减去边框和内边距才能得到内容的宽度和高度。
**/
function augmentWidthOrHeight( elem, name, extra, isBorderBox, styles ) {
  var i = extra === ( isBorderBox ? "border" : "content" ) ?   
    4 :   
    name === "width" ? 1 : 0,
    val = 0;

  for ( ; i < 4; i += 2 ) {
    // 两种盒模型都不包括margin，需要自己加上
    if ( extra === "margin" ) {
      val += sjs.css( elem, extra + cssExpand[ i ], true, styles );
    }

    if ( isBorderBox ) {
      // border-box模型包括了padding，如果我们只想要content，就要减掉padding
      if ( extra === "content" ) {
        val -= sjs.css( elem, "padding" + cssExpand[ i ], true, styles );
      }

      // 如果要获取的不是margin，也不是border，就需要减掉border值
      if ( extra !== "margin" ) {
        val -= sjs.css( elem, "border" + cssExpand[ i ] + "Width", true, styles );
      }
    } else {
      // 我们要获取的不是content，就需要加上padding
      val += sjs.css( elem, "padding" + cssExpand[ i ], true, styles );

      // 要获取的不是content也不是padding，就加上border
      if ( extra !== "padding" ) {
        val += sjs.css( elem, "border" + cssExpand[ i ] + "Width", true, styles );
      }
    }
  }

  return val;
}

function getWidthOrHeight( elem, name, extra ) {

  // Start with offset property, which is equivalent to the border-box value
  var valueIsBorderBox = true,
    val = name === "width" ? elem.offsetWidth : elem.offsetHeight,
    styles = getStyles( elem ),
    isBorderBox = sjs.support.boxSizing && sjs.css( elem, "boxSizing", false, styles ) === "border-box";

  // some non-html elements return undefined for offsetWidth, so check for null/undefined
  // svg - https://bugzilla.mozilla.org/show_bug.cgi?id=649285
  // MathML - https://bugzilla.mozilla.org/show_bug.cgi?id=491668
  if ( val <= 0 || val == null ) {
    // Fall back to computed then uncomputed css if necessary
    val = curCSS( elem, name, styles );
    if ( val < 0 || val == null ) {
      val = elem.style[ name ];
    }

    // Computed unit is not pixels. Stop here and return.
    if ( rnumnonpx.test(val) ) {
      return val;
    }

    // we need the check for style in case a browser which returns unreliable values
    // for getComputedStyle silently falls back to the reliable elem.style
    valueIsBorderBox = isBorderBox && ( sjs.support.boxSizingReliable || val === elem.style[ name ] );

    // Normalize "", auto, and prepare for extra
    val = parseFloat( val ) || 0;
  }

  // use the active box-sizing model to add/subtract irrelevant styles
  return ( val +
    augmentWidthOrHeight(
      elem,
      name,
      extra || ( isBorderBox ? "border" : "content" ),
      valueIsBorderBox,
      styles
    )
  ) + "px";
}

function css_defaultDisplay( nodeName)
{
  var doc = document;
  var display = elemdisplay[nodeName];

  if( !display )
  {
    display = actualDisplay( nodeName, doc);

    if(display ==='none' || !display)
    {
      iframe = ( iframe || sjs('<iframe frameborder="0" width="0" height="0"/>').css('cssText','display:block !important')).appendTo(doc.documentElement);
    

        doc = ( iframe[0].contentWindow || iframe[0].contentDocument).document;
        doc.write("<!doctype html><html><body>");
        doc.close();

        display = actualDisplay( nodeName, doc );
        iframe.detach();
    }
    elemdisplay[nodeName] = display;
  }
  return display;
}

// Called ONLY from within css_defaultDisplay
function actualDisplay( name, doc ) {
  var elem = sjs( doc.createElement( name ) ).appendTo( doc.body ),
    display = sjs.css( elem[0], "display" );
  elem.remove();
  return display;
}


sjs.each([ "height", "width" ], function( i, name ) {
  sjs.cssHooks[ name ] = {
    get: function( elem, computed, extra ) {
      if ( computed ) {
        // certain elements can have dimension info if we invisibly show them
        // however, it must have a current display style that would benefit from this
        return elem.offsetWidth === 0 && rdisplayswap.test( sjs.css( elem, "display" ) ) ?
          sjs.swap( elem, cssShow, function() {
            return getWidthOrHeight( elem, name, extra );
          }) :
          getWidthOrHeight( elem, name, extra );
      }
    },

    set: function( elem, value, extra ) {
      var styles = extra && getStyles( elem );
      return setPositiveNumber( elem, value, extra ?
        augmentWidthOrHeight(
          elem,
          name,
          extra,
          sjs.support.boxSizing && sjs.css( elem, "boxSizing", false, styles ) === "border-box",
          styles
        ) : 0
      );
    }
  };
});

if ( !sjs.support.opacity ) {
  sjs.cssHooks.opacity = {
    get: function( elem, computed ) {
      // IE uses filters for opacity
      return ropacity.test( (computed && elem.currentStyle ? elem.currentStyle.filter : elem.style.filter) || "" ) ?
        ( 0.01 * parseFloat( RegExp.$1 ) ) + "" :
        computed ? "1" : "";
    },

    set: function( elem, value ) {
      var style = elem.style,
        currentStyle = elem.currentStyle,
        opacity = sjs.isNumeric( value ) ? "alpha(opacity=" + value * 100 + ")" : "",
        filter = currentStyle && currentStyle.filter || style.filter || "";

      // IE has trouble with opacity if it does not have layout
      // Force it by setting the zoom level
      style.zoom = 1;

      // if setting opacity to 1, and no other filters exist - attempt to remove filter attribute #6652
      // if value === "", then remove inline opacity #12685
      if ( ( value >= 1 || value === "" ) &&
          sjs.trim( filter.replace( ralpha, "" ) ) === "" &&
          style.removeAttribute ) {

        // Setting style.filter to null, "" & " " still leave "filter:" in the cssText
        // if "filter:" is present at all, clearType is disabled, we want to avoid this
        // style.removeAttribute is IE Only, but so apparently is this code path...
        style.removeAttribute( "filter" );

        // if there is no filter style applied in a css rule or unset inline opacity, we are done
        if ( value === "" || currentStyle && !currentStyle.filter ) {
          return;
        }
      }

      // otherwise, set new filter values
      style.filter = ralpha.test( filter ) ?
        filter.replace( ralpha, opacity ) :
        filter + " " + opacity;
    }
  };
}

// These hooks cannot be added until DOM ready because the support test
// for it is not run until after DOM ready
sjs(function() {
  if ( !sjs.support.reliableMarginRight ) {
    sjs.cssHooks.marginRight = {
      get: function( elem, computed ) {
        if ( computed ) {
          // WebKit Bug 13343 - getComputedStyle returns wrong value for margin-right
          // Work around by temporarily setting element display to inline-block
          return sjs.swap( elem, { "display": "inline-block" },
            curCSS, [ elem, "marginRight" ] );
        }
      }
    };
  }

  // Webkit bug: https://bugs.webkit.org/show_bug.cgi?id=29084
  // getComputedStyle returns percent when specified for top/left/bottom/right
  // rather than make the css module depend on the offset module, we just check for it here
  if ( !sjs.support.pixelPosition && sjs.fn.position ) {
    sjs.each( [ "top", "left" ], function( i, prop ) {
      sjs.cssHooks[ prop ] = {
        get: function( elem, computed ) {
          if ( computed ) {
            computed = curCSS( elem, prop );
            // if curCSS returns percentage, fallback to offset
            return rnumnonpx.test( computed ) ?
              sjs( elem ).position()[ prop ] + "px" :
              computed;
          }
        }
      };
    });
  }

});

if ( sjs.expr && sjs.expr.filters ) {
  sjs.expr.filters.hidden = function( elem ) {
    // Support: Opera <= 12.12
    // Opera reports offsetWidths and offsetHeights less than zero on some elements
    return elem.offsetWidth <= 0 && elem.offsetHeight <= 0 ||
      (!sjs.support.reliableHiddenOffsets && ((elem.style && elem.style.display) || sjs.css( elem, "display" )) === "none");
  };

  sjs.expr.filters.visible = function( elem ) {
    return !sjs.expr.filters.hidden( elem );
  };
}

// These hooks are used by animate to expand properties
sjs.each({
  margin: "",
  padding: "",
  border: "Width"
}, function( prefix, suffix ) {
  sjs.cssHooks[ prefix + suffix ] = {
    expand: function( value ) {
      var i = 0,
        expanded = {},

        // assumes a single number if not a string
        parts = typeof value === "string" ? value.split(" ") : [ value ];

      for ( ; i < 4; i++ ) {
        expanded[ prefix + cssExpand[ i ] + suffix ] =
          parts[ i ] || parts[ i - 2 ] || parts[ 0 ];
      }

      return expanded;
    }
  };

  if ( !rmargin.test( prefix ) ) {
    sjs.cssHooks[ prefix + suffix ].set = setPositiveNumber;
  }
});


var r20 = /%20/g,
	rbracket = /\[\]$/,
	rCRLF = /\r?\n/g,
	rsubmitterTypes = /^(?:submit|button|image|reset|file)$/i,
	rsubmittable = /^(?:input|select|textarea|keygen)/i;

var buildParams = function(prefix,obj,traditional,add){
	var name;

	if(sjs.isArray(obj)){
		sjs.each(obj,function(i,v){
			//当traditional存在或foo[]的情况时，直接添加
			if(traditional || rbracket.test(prefix)){
				add(prefix,v);
			}else{
				//构造foo[]的情况
				buildParams(prefix + '[' + (typeof v === 'object' ? i : '') + ']',v,traditional,add);
			}
		});
	}else if(!traditional && sjs.type(obj) === 'object'){
		//构造foo[name]的情况
		for(name in obj){
			buildParams(prefix + '[' + name + ']',obj[name],traditional,add);
		}
	}else{
		add(prefix,obj);
	}
};

sjs.fn.extend({
	serialize:function(){
		return sjs.param(this.serializeArray());
	},
	serializeArray:function(){
		//获取当前sjs对象下面的所有元素 
		return this.map(function(){
			var elements = sjs.prop(this,'elements');
			return elements ? sjs.makeArray(elements) : this;
		//过滤不符合条件的元素
		}).filter(function(){
			var type = this.type;
			return this.name && !sjs(this).is(':disabled') && rsubmittable.test(this.nodeName) && !rsubmitterTypes.test(type) && (this.checked || !rcheckableType.test(type));
		//获取表单元素中的值
		}).map(function(i,elem){
			var val = sjs(this).val();

			return val == null ?
				null :
				sjs.isArray(val) ? 
					sjs.map(val,function(val){
						return {name:elem.name,value:val.replace(rCRLF,'\r\n')};
					}) :
					{name:elem.name,value:val.replace(rCRLF,'\r\n')};
		}).get();
	}
});

//将元素数组序列化为查询字符串
sjs.param = function(a,traditional){
	var prefix,
		s = [],
		add = function(key,value){
			value = sjs.isFunction(value) ? value() : (value == null ? '' : value);
			s[s.length] = encodeURIComponent(key) + '=' + encodeURIComponent(value);
		};

	if(traditional === undefined){
		traditional = sjs.ajaxSettings && sjs.ajaxSettings.traditional;
	}

	if(sjs.isArray(a) || (a._sjs && !sjs.isPlainObject(a))){
		sjs.each(a,function(){
			add(this.name,this.value);
		});
	}else{
		for(prefix in a){
			buildParams(prefix,a[prefix],traditional,add);
		}
	}

	return s.join('&').replace(r20,'+');
};
sjs.each( ("blur focus focusin focusout load resize scroll unload click dblclick mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave change select submit keydown keypress keyup error contextmenu").split(" "),function( i, name ) {
	//处理事件绑定
	sjs.fn[ name ] = function( data, fn ) {
		return arguments.length > 0 ?
		this.on( name, null, data, fn ) :
		this.trigger( name );
	};
});

sjs.fn.hover = function( fnOver, fnOut ) {
		return this.mouseenter( fnOver ).mouseleave( fnOut || fnOver );
};
var
    // Document location
    ajaxLocParts,
    ajaxLocation,
    ajax_nonce = sjs.now(),

    ajax_rquery = /\?/,
    rhash = /#.*$/,
    rts = /([?&])_=[^&]*/,
    rheaders = /^(.*?):[ \t]*([^\r\n]*)\r?$/mg, // IE leaves an \r character at EOL
    // #7653, #8125, #8152: local protocol detection
    rlocalProtocol = /^(?:about|app|app-storage|.+-extension|file|res|widget):$/,
    rnoContent = /^(?:GET|HEAD)$/,
    rprotocol = /^\/\//,
    rurl = /^([\w.+-]+:)(?:\/\/([^\/?#:]*)(?::(\d+)|)|)/,

    // Keep a copy of the old load method
    _load = sjs.fn.load,

    /* Prefilters
     * 1) They are useful to introduce custom dataTypes (see ajax/jsonp.js for an example)
     * 2) These are called:
     *    - BEFORE asking for a transport
     *    - AFTER param serialization (s.data is a string if s.processData is true)
     * 3) key is the dataType
     * 4) the catchall symbol "*" can be used
     * 5) execution will start with transport dataType and THEN continue down to "*" if needed
     */
    prefilters = {},

    /* Transports bindings
     * 1) key is the dataType
     * 2) the catchall symbol "*" can be used
     * 3) selection will start with transport dataType and THEN go to "*" if needed
     */
    transports = {},

    // Avoid comment-prolog char sequence (#10098); must appease lint and evade compression
    allTypes = "*/".concat("*");

// #8138, IE may throw an exception when accessing
// a field from window.location if document.domain has been set
try {
    ajaxLocation = location.href;
} catch( e ) {
    // Use the href attribute of an A element
    // since IE will modify it given document.location
    ajaxLocation = document.createElement( "a" );
    ajaxLocation.href = "";
    ajaxLocation = ajaxLocation.href;
}

// Segment location into parts
ajaxLocParts = rurl.exec( ajaxLocation.toLowerCase() ) || [];

// Base "constructor" for sjs.ajaxPrefilter and sjs.ajaxTransport
/**
    sjs.ajaxPrefilter and sjs.ajaxTransport 的构造函数
 */
function addToPrefiltersOrTransports( structure ) {

    // dataTypeExpression is optional and defaults to "*"
    /**
        前置过滤器，或内容分发器，视structure而定
     */
    return function( dataTypeExpression, func ) {

        if ( typeof dataTypeExpression !== "string" ) {
            func = dataTypeExpression;
            dataTypeExpression = "*";
        }

        var dataType,
            i = 0,
            dataTypes = dataTypeExpression.toLowerCase().match( core_rnotwhite ) || [];

        if ( sjs.isFunction( func ) ) {
            // For each dataType in the dataTypeExpression
            while ( (dataType = dataTypes[i++]) ) {
                // Prepend if requested
                if ( dataType[0] === "+" ) {
                    dataType = dataType.slice( 1 ) || "*";
                    (structure[ dataType ] = structure[ dataType ] || []).unshift( func );

                // Otherwise append
                } else {
                    (structure[ dataType ] = structure[ dataType ] || []).push( func );
                }
            }
        }
    };
}

// Base inspection function for prefilters and transports
function inspectPrefiltersOrTransports( structure, options, originalOptions, jqXHR ) {

    var inspected = {},
        seekingTransport = ( structure === transports );

    function inspect( dataType ) {
        var selected;
        inspected[ dataType ] = true;
        sjs.each( structure[ dataType ] || [], function( _, prefilterOrFactory ) {
            var dataTypeOrTransport = prefilterOrFactory( options, originalOptions, jqXHR );
            if( typeof dataTypeOrTransport === "string" && !seekingTransport && !inspected[ dataTypeOrTransport ] ) {
                options.dataTypes.unshift( dataTypeOrTransport );
                inspect( dataTypeOrTransport );
                return false;
            } else if ( seekingTransport ) {
                return !( selected = dataTypeOrTransport );
            }
        });
        return selected;
    }

    return inspect( options.dataTypes[ 0 ] ) || !inspected[ "*" ] && inspect( "*" );
}

// A special extend for ajax options
// that takes "flat" options (not to be deep extended)
// Fixes #9887
function ajaxExtend( target, src ) {
    var deep, key,
        flatOptions = sjs.ajaxSettings.flatOptions || {};

    for ( key in src ) {
        if ( src[ key ] !== undefined ) {
            ( flatOptions[ key ] ? target : ( deep || (deep = {}) ) )[ key ] = src[ key ];
        }
    }
    if ( deep ) {
        sjs.extend( true, target, deep );
    }

    return target;
}

sjs.fn.load = function( url, params, callback ) {
    if ( typeof url !== "string" && _load ) {
        return _load.apply( this, arguments );
    }

    var selector, response, type,
        self = this,
        off = url.indexOf(" ");

    if ( off >= 0 ) {
        selector = url.slice( off, url.length );
        url = url.slice( 0, off );
    }

    // If it's a function
    if ( sjs.isFunction( params ) ) {

        // We assume that it's the callback
        callback = params;
        params = undefined;

    // Otherwise, build a param string
    } else if ( params && typeof params === "object" ) {
        type = "POST";
    }

    // If we have elements to modify, make the request
    if ( self.length > 0 ) {
        sjs.ajax({
            url: url,

            // if "type" variable is undefined, then "GET" method will be used
            type: type,
            dataType: "html",
            data: params
        }).done(function( responseText ) {

            // Save response for use in complete callback
            response = arguments;

            self.html( selector ?

                // If a selector was specified, locate the right elements in a dummy div
                // Exclude scripts to avoid IE 'Permission Denied' errors
                sjs("<div>").append( sjs.parseHTML( responseText ) ).find( selector ) :

                // Otherwise use the full result
                responseText );

        }).complete( callback && function( jqXHR, status ) {
            self.each( callback, response || [ jqXHR.responseText, status, jqXHR ] );
        });
    }

    return this;
};

// Attach a bunch of functions for handling common AJAX events
sjs.each( [ "ajaxStart", "ajaxStop", "ajaxComplete", "ajaxError", "ajaxSuccess", "ajaxSend" ], function( i, type ){
    sjs.fn[ type ] = function( fn ){
        return this.on( type, fn );
    };
});

sjs.each( [ "get", "post" ], function( i, method ) {
    sjs[ method ] = function( url, data, callback, type ) {
        // shift arguments if data argument was omitted
        if ( sjs.isFunction( data ) ) {
            type = type || callback;
            callback = data;
            data = undefined;
        }

        return sjs.ajax({
            url: url,
            type: method,
            dataType: type,
            data: data,
            success: callback
        });
    };
});

sjs.extend({

    // Counter for holding the number of active queries
    active: 0,

    // Last-Modified header cache for next request
    lastModified: {},
    etag: {},

    ajaxSettings: {
        url: ajaxLocation,
        type: "GET",
        isLocal: rlocalProtocol.test( ajaxLocParts[ 1 ] ),
        global: true,
        processData: true,
        async: true,
        contentType: "application/x-www-form-urlencoded; charset=UTF-8",
        /*
        timeout: 0,
        data: null,
        dataType: null,
        username: null,
        password: null,
        cache: null,
        throws: false,
        traditional: false,
        headers: {},
        */

        accepts: {
            "*": allTypes,
            text: "text/plain",
            html: "text/html",
            xml: "application/xml, text/xml",
            json: "application/json, text/javascript"
        },

        contents: {
            xml: /xml/,
            html: /html/,
            json: /json/
        },

        responseFields: {
            xml: "responseXML",
            text: "responseText",
            json: "responseJSON"
        },

        // Data converters
        // Keys separate source (or catchall "*") and destination types with a single space
        converters: {

            // Convert anything to text
            "* text": String,

            // Text to html (true = no transformation)
            "text html": true,

            // Evaluate text as a json expression
            "text json": sjs.parseJSON,

            // Parse text as xml
            "text xml": sjs.parseXML
        },

        // For options that shouldn't be deep extended:
        // you can add your own custom options here if
        // and when you create one that shouldn't be
        // deep extended (see ajaxExtend)
        flatOptions: {
            url: true,
            context: true
        }
    },

    // Creates a full fledged settings object into target
    // with both ajaxSettings and settings fields.
    // If target is omitted, writes into ajaxSettings.
    ajaxSetup: function( target, settings ) {
        return settings ?

            // Building a settings object
            ajaxExtend( ajaxExtend( target, sjs.ajaxSettings ), settings ) :

            // Extending ajaxSettings
            ajaxExtend( sjs.ajaxSettings, target );
    },

    ajaxPrefilter: addToPrefiltersOrTransports( prefilters ),
    ajaxTransport: addToPrefiltersOrTransports( transports ),

    // Main method
    ajax: function( url, options ) {

        // If url is an object, simulate pre-1.5 signature
        if ( typeof url === "object" ) {
            options = url;
            url = undefined;
        }

        // Force options to be an object
        options = options || {};

        var // Cross-domain detection vars
            parts,
            // Loop variable
            i,
            // URL without anti-cache param
            cacheURL,
            // Response headers as string
            responseHeadersString,
            // timeout handle
            timeoutTimer,

            // To know if global events are to be dispatched
            fireGlobals,

            transport,
            // Response headers
            responseHeaders,
            // Create the final options object
            s = sjs.ajaxSetup( {}, options ),
            // Callbacks context
            callbackContext = s.context || s,
            // Context for global events is callbackContext if it is a DOM node or sjs collection
            globalEventContext = s.context && ( callbackContext.nodeType || callbackContext.sjs ) ?
                sjs( callbackContext ) :
                sjs.event,
            // Deferreds
            deferred = sjs.Deferred(),
            completeDeferred = sjs.Callbacks("once memory"),
            // Status-dependent callbacks
            statusCode = s.statusCode || {},
            // Headers (they are sent all at once)
            requestHeaders = {},
            requestHeadersNames = {},
            // The jqXHR state
            state = 0,
            // Default abort message
            strAbort = "canceled",
            // Fake xhr
            jqXHR = {
                readyState: 0,

                // Builds headers hashtable if needed
                getResponseHeader: function( key ) {
                    var match;
                    if ( state === 2 ) {
                        if ( !responseHeaders ) {
                            responseHeaders = {};
                            while ( (match = rheaders.exec( responseHeadersString )) ) {
                                responseHeaders[ match[1].toLowerCase() ] = match[ 2 ];
                            }
                        }
                        match = responseHeaders[ key.toLowerCase() ];
                    }
                    return match == null ? null : match;
                },

                // Raw string
                getAllResponseHeaders: function() {
                    return state === 2 ? responseHeadersString : null;
                },

                // Caches the header
                setRequestHeader: function( name, value ) {
                    var lname = name.toLowerCase();
                    if ( !state ) {
                        name = requestHeadersNames[ lname ] = requestHeadersNames[ lname ] || name;
                        requestHeaders[ name ] = value;
                    }
                    return this;
                },

                // Overrides response content-type header
                overrideMimeType: function( type ) {
                    if ( !state ) {
                        s.mimeType = type;
                    }
                    return this;
                },

                // Status-dependent callbacks
                statusCode: function( map ) {
                    var code;
                    if ( map ) {
                        if ( state < 2 ) {
                            for ( code in map ) {
                                // Lazy-add the new callback in a way that preserves old ones
                                statusCode[ code ] = [ statusCode[ code ], map[ code ] ];
                            }
                        } else {
                            // Execute the appropriate callbacks
                            jqXHR.always( map[ jqXHR.status ] );
                        }
                    }
                    return this;
                },

                // Cancel the request
                abort: function( statusText ) {
                    var finalText = statusText || strAbort;
                    if ( transport ) {
                        transport.abort( finalText );
                    }
                    done( 0, finalText );
                    return this;
                }
            };

        // Attach deferreds
        deferred.promise( jqXHR ).complete = completeDeferred.add;
        jqXHR.success = jqXHR.done;
        jqXHR.error = jqXHR.fail;

        // Remove hash character (#7531: and string promotion)
        // Add protocol if not provided (#5866: IE7 issue with protocol-less urls)
        // Handle falsy url in the settings object (#10093: consistency with old signature)
        // We also use the url parameter if available
        s.url = ( ( url || s.url || ajaxLocation ) + "" ).replace( rhash, "" ).replace( rprotocol, ajaxLocParts[ 1 ] + "//" );

        // Alias method option to type as per ticket #12004
        s.type = options.method || options.type || s.method || s.type;

        // Extract dataTypes list
        s.dataTypes = sjs.trim( s.dataType || "*" ).toLowerCase().match( core_rnotwhite ) || [""];

        // A cross-domain request is in order when we have a protocol:host:port mismatch
        if ( s.crossDomain == null ) {
            parts = rurl.exec( s.url.toLowerCase() );
            s.crossDomain = !!( parts &&
                ( parts[ 1 ] !== ajaxLocParts[ 1 ] || parts[ 2 ] !== ajaxLocParts[ 2 ] ||
                    ( parts[ 3 ] || ( parts[ 1 ] === "http:" ? 80 : 443 ) ) !=
                        ( ajaxLocParts[ 3 ] || ( ajaxLocParts[ 1 ] === "http:" ? 80 : 443 ) ) )
            );
        }

        // Convert data if not already a string
        if ( s.data && s.processData && typeof s.data !== "string" ) {
            s.data = sjs.param( s.data, s.traditional );
        }

        // Apply prefilters
        inspectPrefiltersOrTransports( prefilters, s, options, jqXHR );

        // If request was aborted inside a prefilter, stop there
        if ( state === 2 ) {
            return jqXHR;
        }

        // We can fire global events as of now if asked to
        fireGlobals = s.global;

        // Watch for a new set of requests
        if ( fireGlobals && sjs.active++ === 0 ) {
            sjs.event.trigger("ajaxStart");
        }

        // Uppercase the type
        s.type = s.type.toUpperCase();

        // Determine if request has content
        s.hasContent = !rnoContent.test( s.type );

        // Save the URL in case we're toying with the If-Modified-Since
        // and/or If-None-Match header later on
        cacheURL = s.url;

        // More options handling for requests with no content
        if ( !s.hasContent ) {

            // If data is available, append data to url
            if ( s.data ) {
                cacheURL = ( s.url += ( ajax_rquery.test( cacheURL ) ? "&" : "?" ) + s.data );
                // #9682: remove data so that it's not used in an eventual retry
                delete s.data;
            }

            // Add anti-cache in url if needed
            if ( s.cache === false ) {
                s.url = rts.test( cacheURL ) ?

                    // If there is already a '_' parameter, set its value
                    cacheURL.replace( rts, "$1_=" + ajax_nonce++ ) :

                    // Otherwise add one to the end
                    cacheURL + ( ajax_rquery.test( cacheURL ) ? "&" : "?" ) + "_=" + ajax_nonce++;
            }
        }

        // Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.
        if ( s.ifModified ) {
            if ( sjs.lastModified[ cacheURL ] ) {
                jqXHR.setRequestHeader( "If-Modified-Since", sjs.lastModified[ cacheURL ] );
            }
            if ( sjs.etag[ cacheURL ] ) {
                jqXHR.setRequestHeader( "If-None-Match", sjs.etag[ cacheURL ] );
            }
        }

        // Set the correct header, if data is being sent
        if ( s.data && s.hasContent && s.contentType !== false || options.contentType ) {
            jqXHR.setRequestHeader( "Content-Type", s.contentType );
        }

        // Set the Accepts header for the server, depending on the dataType
        jqXHR.setRequestHeader(
            "Accept",
            s.dataTypes[ 0 ] && s.accepts[ s.dataTypes[0] ] ?
                s.accepts[ s.dataTypes[0] ] + ( s.dataTypes[ 0 ] !== "*" ? ", " + allTypes + "; q=0.01" : "" ) :
                s.accepts[ "*" ]
        );

        // Check for headers option
        for ( i in s.headers ) {
            jqXHR.setRequestHeader( i, s.headers[ i ] );
        }

        // Allow custom headers/mimetypes and early abort
        if ( s.beforeSend && ( s.beforeSend.call( callbackContext, jqXHR, s ) === false || state === 2 ) ) {
            // Abort if not done already and return
            return jqXHR.abort();
        }

        // aborting is no longer a cancellation
        strAbort = "abort";

        // Install callbacks on deferreds
        for ( i in { success: 1, error: 1, complete: 1 } ) {
            jqXHR[ i ]( s[ i ] );
        }

        // Get transport
        transport = inspectPrefiltersOrTransports( transports, s, options, jqXHR );

        // If no transport, we auto-abort
        if ( !transport ) {
            done( -1, "No Transport" );
        } else {
            jqXHR.readyState = 1;

            // Send global event
            if ( fireGlobals ) {
                globalEventContext.trigger( "ajaxSend", [ jqXHR, s ] );
            }
            // Timeout
            if ( s.async && s.timeout > 0 ) {
                timeoutTimer = setTimeout(function() {
                    jqXHR.abort("timeout");
                }, s.timeout );
            }

            try {
                state = 1;
                transport.send( requestHeaders, done );
            } catch ( e ) {
                // Propagate exception as error if not done
                if ( state < 2 ) {
                    done( -1, e );
                // Simply rethrow otherwise
                } else {
                    throw e;
                }
            }
        }

        // Callback for when everything is done
        function done( status, nativeStatusText, responses, headers ) {
            var isSuccess, success, error, response, modified,
                statusText = nativeStatusText;

            // Called once
            if ( state === 2 ) {
                return;
            }

            // State is "done" now
            state = 2;

            // Clear timeout if it exists
            if ( timeoutTimer ) {
                clearTimeout( timeoutTimer );
            }

            // Dereference transport for early garbage collection
            // (no matter how long the jqXHR object will be used)
            transport = undefined;

            // Cache response headers
            responseHeadersString = headers || "";

            // Set readyState
            jqXHR.readyState = status > 0 ? 4 : 0;

            // Determine if successful
            isSuccess = status >= 200 && status < 300 || status === 304;

            // Get response data
            if ( responses ) {
                response = ajaxHandleResponses( s, jqXHR, responses );
            }

            // Convert no matter what (that way responseXXX fields are always set)
            response = ajaxConvert( s, response, jqXHR, isSuccess );

            // If successful, handle type chaining
            if ( isSuccess ) {

                // Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.
                if ( s.ifModified ) {
                    modified = jqXHR.getResponseHeader("Last-Modified");
                    if ( modified ) {
                        sjs.lastModified[ cacheURL ] = modified;
                    }
                    modified = jqXHR.getResponseHeader("etag");
                    if ( modified ) {
                        sjs.etag[ cacheURL ] = modified;
                    }
                }

                // if no content
                if ( status === 204 ) {
                    statusText = "nocontent";

                // if not modified
                } else if ( status === 304 ) {
                    statusText = "notmodified";

                // If we have data, let's convert it
                } else {
                    statusText = response.state;
                    success = response.data;
                    error = response.error;
                    isSuccess = !error;
                }
            } else {
                // We extract error from statusText
                // then normalize statusText and status for non-aborts
                error = statusText;
                if ( status || !statusText ) {
                    statusText = "error";
                    if ( status < 0 ) {
                        status = 0;
                    }
                }
            }

            // Set data for the fake xhr object
            jqXHR.status = status;
            jqXHR.statusText = ( nativeStatusText || statusText ) + "";

            // Success/Error
            if ( isSuccess ) {
                deferred.resolveWith( callbackContext, [ success, statusText, jqXHR ] );
            } else {
                deferred.rejectWith( callbackContext, [ jqXHR, statusText, error ] );
            }

            // Status-dependent callbacks
            jqXHR.statusCode( statusCode );
            statusCode = undefined;

            if ( fireGlobals ) {
                globalEventContext.trigger( isSuccess ? "ajaxSuccess" : "ajaxError",
                    [ jqXHR, s, isSuccess ? success : error ] );
            }

            // Complete
            completeDeferred.fireWith( callbackContext, [ jqXHR, statusText ] );

            if ( fireGlobals ) {
                globalEventContext.trigger( "ajaxComplete", [ jqXHR, s ] );
                // Handle the global AJAX counter
                if ( !( --sjs.active ) ) {
                    sjs.event.trigger("ajaxStop");
                }
            }
        }

        return jqXHR;
    },

    getScript: function( url, callback ) {
        return sjs.get( url, undefined, callback, "script" );
    },

    getJSON: function( url, data, callback ) {
        return sjs.get( url, data, callback, "json" );
    }
});

/* Handles responses to an ajax request:
 * - finds the right dataType (mediates between content-type and expected dataType)
 * - returns the corresponding response
 */
function ajaxHandleResponses( s, jqXHR, responses ) {
    var firstDataType, ct, finalDataType, type,
        contents = s.contents,
        dataTypes = s.dataTypes;

    // Remove auto dataType and get content-type in the process
    while( dataTypes[ 0 ] === "*" ) {
        dataTypes.shift();
        if ( ct === undefined ) {
            ct = s.mimeType || jqXHR.getResponseHeader("Content-Type");
        }
    }

    // Check if we're dealing with a known content-type
    if ( ct ) {
        for ( type in contents ) {
            if ( contents[ type ] && contents[ type ].test( ct ) ) {
                dataTypes.unshift( type );
                break;
            }
        }
    }

    // Check to see if we have a response for the expected dataType
    if ( dataTypes[ 0 ] in responses ) {
        finalDataType = dataTypes[ 0 ];
    } else {
        // Try convertible dataTypes
        for ( type in responses ) {
            if ( !dataTypes[ 0 ] || s.converters[ type + " " + dataTypes[0] ] ) {
                finalDataType = type;
                break;
            }
            if ( !firstDataType ) {
                firstDataType = type;
            }
        }
        // Or just use first one
        finalDataType = finalDataType || firstDataType;
    }

    // If we found a dataType
    // We add the dataType to the list if needed
    // and return the corresponding response
    if ( finalDataType ) {
        if ( finalDataType !== dataTypes[ 0 ] ) {
            dataTypes.unshift( finalDataType );
        }
        return responses[ finalDataType ];
    }
}

/* Chain conversions given the request and the original response
 * Also sets the responseXXX fields on the jqXHR instance
 */
function ajaxConvert( s, response, jqXHR, isSuccess ) {
    var conv2, current, conv, tmp, prev,
        converters = {},
        // Work with a copy of dataTypes in case we need to modify it for conversion
        dataTypes = s.dataTypes.slice();

    // Create converters map with lowercased keys
    if ( dataTypes[ 1 ] ) {
        for ( conv in s.converters ) {
            converters[ conv.toLowerCase() ] = s.converters[ conv ];
        }
    }

    current = dataTypes.shift();

    // Convert to each sequential dataType
    while ( current ) {

        if ( s.responseFields[ current ] ) {
            jqXHR[ s.responseFields[ current ] ] = response;
        }

        // Apply the dataFilter if provided
        if ( !prev && isSuccess && s.dataFilter ) {
            response = s.dataFilter( response, s.dataType );
        }

        prev = current;
        current = dataTypes.shift();

        if ( current ) {

            // There's only work to do if current dataType is non-auto
            if ( current === "*" ) {

                current = prev;

            // Convert response if prev dataType is non-auto and differs from current
            } else if ( prev !== "*" && prev !== current ) {

                // Seek a direct converter
                conv = converters[ prev + " " + current ] || converters[ "* " + current ];

                // If none found, seek a pair
                if ( !conv ) {
                    for ( conv2 in converters ) {

                        // If conv2 outputs current
                        tmp = conv2.split( " " );
                        if ( tmp[ 1 ] === current ) {

                            // If prev can be converted to accepted input
                            conv = converters[ prev + " " + tmp[ 0 ] ] ||
                                converters[ "* " + tmp[ 0 ] ];
                            if ( conv ) {
                                // Condense equivalence converters
                                if ( conv === true ) {
                                    conv = converters[ conv2 ];

                                // Otherwise, insert the intermediate dataType
                                } else if ( converters[ conv2 ] !== true ) {
                                    current = tmp[ 0 ];
                                    dataTypes.unshift( tmp[ 1 ] );
                                }
                                break;
                            }
                        }
                    }
                }

                // Apply converter (if not an equivalence)
                if ( conv !== true ) {

                    // Unless errors are allowed to bubble, catch and return them
                    if ( conv && s[ "throws" ] ) {
                        response = conv( response );
                    } else {
                        try {
                            response = conv( response );
                        } catch ( e ) {
                            return { state: "parsererror", error: conv ? e : "No conversion from " + prev + " to " + current };
                        }
                    }
                }
            }
        }
    }

    return { state: "success", data: response };
}
// Install script dataType
sjs.ajaxSetup({
	accepts: {
		script: "text/javascript, application/javascript, application/ecmascript, application/x-ecmascript"
	},
	contents: {
		script: /(?:java|ecma)script/
	},
	converters: {
		"text script": function( text ) {
			sjs.globalEval( text );
			return text;
		}
	}
});

// Handle cache's special case and global
sjs.ajaxPrefilter( "script", function( s ) {
	if ( s.cache === undefined ) {
		s.cache = false;
	}
	if ( s.crossDomain ) {
		s.type = "GET";
		s.global = false;
	}
});

// Bind script tag hack transport
sjs.ajaxTransport( "script", function(s) {

	// This transport only deals with cross domain requests
	if ( s.crossDomain ) {

		var script,
			head = document.head || sjs("head")[0] || document.documentElement;

		return {

			send: function( _, callback ) {

				script = document.createElement("script");

				script.async = true;

				if ( s.scriptCharset ) {
					script.charset = s.scriptCharset;
				}

				script.src = s.url;

				// Attach handlers for all browsers
				script.onload = script.onreadystatechange = function( _, isAbort ) {

					if ( isAbort || !script.readyState || /loaded|complete/.test( script.readyState ) ) {

						// Handle memory leak in IE
						script.onload = script.onreadystatechange = null;

						// Remove the script
						if ( script.parentNode ) {
							script.parentNode.removeChild( script );
						}

						// Dereference the script
						script = null;

						// Callback if not abort
						if ( !isAbort ) {
							callback( 200, "success" );
						}
					}
				};

				// Circumvent IE6 bugs with base elements (#2709 and #4378) by prepending
				// Use native DOM manipulation to avoid our domManip AJAX trickery
				head.insertBefore( script, head.firstChild );
			},

			abort: function() {
				if ( script ) {
					script.onload( undefined, true );
				}
			}
		};
	}
});
var oldCallbacks = [],
	rjsonp = /(=)\?(?=&|$)|\?\?/;

// Default jsonp settings
sjs.ajaxSetup({
	jsonp: "callback",
	jsonpCallback: function() {
		var callback = oldCallbacks.pop() || ( sjs.expando + "_" + ( ajax_nonce++ ) );
		this[ callback ] = true;
		return callback;
	}
});

// Detect, normalize options and install callbacks for jsonp requests
sjs.ajaxPrefilter( "json jsonp", function( s, originalSettings, jqXHR ) {

	var callbackName, overwritten, responseContainer,
		jsonProp = s.jsonp !== false && ( rjsonp.test( s.url ) ?
			"url" :
			typeof s.data === "string" && !( s.contentType || "" ).indexOf("application/x-www-form-urlencoded") && rjsonp.test( s.data ) && "data"
		);

	// Handle iff the expected data type is "jsonp" or we have a parameter to set
	if ( jsonProp || s.dataTypes[ 0 ] === "jsonp" ) {

		// Get callback name, remembering preexisting value associated with it
		callbackName = s.jsonpCallback = sjs.isFunction( s.jsonpCallback ) ?
			s.jsonpCallback() :
			s.jsonpCallback;

		// Insert callback into url or form data
		if ( jsonProp ) {
			s[ jsonProp ] = s[ jsonProp ].replace( rjsonp, "$1" + callbackName );
		} else if ( s.jsonp !== false ) {
			s.url += ( ajax_rquery.test( s.url ) ? "&" : "?" ) + s.jsonp + "=" + callbackName;
		}

		// Use data converter to retrieve json after script execution
		s.converters["script json"] = function() {
			if ( !responseContainer ) {
				sjs.error( callbackName + " was not called" );
			}
			return responseContainer[ 0 ];
		};

		// force json dataType
		s.dataTypes[ 0 ] = "json";

		// Install callback
		overwritten = window[ callbackName ];
		window[ callbackName ] = function() {
			responseContainer = arguments;
		};

		// Clean-up function (fires after converters)
		jqXHR.always(function() {
			// Restore preexisting value
			window[ callbackName ] = overwritten;

			// Save back as free
			if ( s[ callbackName ] ) {
				// make sure that re-using the options doesn't screw things around
				s.jsonpCallback = originalSettings.jsonpCallback;

				// save the callback name for future use
				oldCallbacks.push( callbackName );
			}

			// Call if it was a function and we have a response
			if ( responseContainer && sjs.isFunction( overwritten ) ) {
				overwritten( responseContainer[ 0 ] );
			}

			responseContainer = overwritten = undefined;
		});

		// Delegate to script
		return "script";
	}
});
var xhrCallbacks, xhrSupported,
	xhrId = 0,
	// #5280: Internet Explorer will keep connections alive if we don't abort on unload
	xhrOnUnloadAbort = window.ActiveXObject && function() {
		// Abort all pending requests
		var key;
		for ( key in xhrCallbacks ) {
			xhrCallbacks[ key ]( undefined, true );
		}
	};

// Functions to create xhrs
function createStandardXHR() {
	try {
		return new window.XMLHttpRequest();
	} catch( e ) {}
}

function createActiveXHR() {
	try {
		return new window.ActiveXObject("Microsoft.XMLHTTP");
	} catch( e ) {}
}

// Create the request object
// (This is still attached to ajaxSettings for backward compatibility)
sjs.ajaxSettings.xhr = window.ActiveXObject ?
	/* Microsoft failed to properly
	 * implement the XMLHttpRequest in IE7 (can't request local files),
	 * so we use the ActiveXObject when it is available
	 * Additionally XMLHttpRequest can be disabled in IE7/IE8 so
	 * we need a fallback.
	 */
	function() {
		return !this.isLocal && createStandardXHR() || createActiveXHR();
	} :
	// For all other browsers, use the standard XMLHttpRequest object
	createStandardXHR;

// Determine support properties
xhrSupported = sjs.ajaxSettings.xhr();
sjs.support.cors = !!xhrSupported && ( "withCredentials" in xhrSupported );
xhrSupported = sjs.support.ajax = !!xhrSupported;

// Create transport if the browser can provide an xhr
if ( xhrSupported ) {

	sjs.ajaxTransport(function( s ) {
		// Cross domain only allowed if supported through XMLHttpRequest
		if ( !s.crossDomain || sjs.support.cors ) {

			var callback;

			return {
				send: function( headers, complete ) {

					// Get a new xhr
					var handle, i,
						xhr = s.xhr();

					// Open the socket
					// Passing null username, generates a login popup on Opera (#2865)
					if ( s.username ) {
						xhr.open( s.type, s.url, s.async, s.username, s.password );
					} else {
						xhr.open( s.type, s.url, s.async );
					}

					// Apply custom fields if provided
					if ( s.xhrFields ) {
						for ( i in s.xhrFields ) {
							xhr[ i ] = s.xhrFields[ i ];
						}
					}

					// Override mime type if needed
					if ( s.mimeType && xhr.overrideMimeType ) {
						xhr.overrideMimeType( s.mimeType );
					}

					// X-Requested-With header
					// For cross-domain requests, seeing as conditions for a preflight are
					// akin to a jigsaw puzzle, we simply never set it to be sure.
					// (it can always be set on a per-request basis or even using ajaxSetup)
					// For same-domain requests, won't change header if already provided.
					if ( !s.crossDomain && !headers["X-Requested-With"] ) {
						headers["X-Requested-With"] = "XMLHttpRequest";
					}

					// Need an extra try/catch for cross domain requests in Firefox 3
					try {
						for ( i in headers ) {
							xhr.setRequestHeader( i, headers[ i ] );
						}
					} catch( err ) {}

					// Do send the request
					// This may raise an exception which is actually
					// handled in sjs.ajax (so no try/catch here)
					xhr.send( ( s.hasContent && s.data ) || null );

					// Listener
					callback = function( _, isAbort ) {
						var status, responseHeaders, statusText, responses;

						// Firefox throws exceptions when accessing properties
						// of an xhr when a network error occurred
						// http://helpful.knobs-dials.com/index.php/Component_returned_failure_code:_0x80040111_(NS_ERROR_NOT_AVAILABLE)
						try {

							// Was never called and is aborted or complete
							if ( callback && ( isAbort || xhr.readyState === 4 ) ) {

								// Only called once
								callback = undefined;

								// Do not keep as active anymore
								if ( handle ) {
									xhr.onreadystatechange = sjs.noop;
									if ( xhrOnUnloadAbort ) {
										delete xhrCallbacks[ handle ];
									}
								}

								// If it's an abort
								if ( isAbort ) {
									// Abort it manually if needed
									if ( xhr.readyState !== 4 ) {
										xhr.abort();
									}
								} else {
									responses = {};
									status = xhr.status;
									responseHeaders = xhr.getAllResponseHeaders();

									// When requesting binary data, IE6-9 will throw an exception
									// on any attempt to access responseText (#11426)
									if ( typeof xhr.responseText === "string" ) {
										responses.text = xhr.responseText;
									}

									// Firefox throws an exception when accessing
									// statusText for faulty cross-domain requests
									try {
										statusText = xhr.statusText;
									} catch( e ) {
										// We normalize with Webkit giving an empty statusText
										statusText = "";
									}

									// Filter status for non standard behaviors

									// If the request is local and we have data: assume a success
									// (success with no data won't get notified, that's the best we
									// can do given current implementations)
									if ( !status && s.isLocal && !s.crossDomain ) {
										status = responses.text ? 200 : 404;
									// IE - #1450: sometimes returns 1223 when it should be 204
									} else if ( status === 1223 ) {
										status = 204;
									}
								}
							}
						} catch( firefoxAccessException ) {
							if ( !isAbort ) {
								complete( -1, firefoxAccessException );
							}
						}

						// Call complete if needed
						if ( responses ) {
							complete( status, statusText, responses, responseHeaders );
						}
					};

					if ( !s.async ) {
						// if we're in sync mode we fire the callback
						callback();
					} else if ( xhr.readyState === 4 ) {
						// (IE6 & IE7) if it's in cache and has been
						// retrieved directly we need to fire the callback
						setTimeout( callback );
					} else {
						handle = ++xhrId;
						if ( xhrOnUnloadAbort ) {
							// Create the active xhrs callbacks list if needed
							// and attach the unload handler
							if ( !xhrCallbacks ) {
								xhrCallbacks = {};
								sjs( window ).unload( xhrOnUnloadAbort );
							}
							// Add to list of active xhrs callbacks
							xhrCallbacks[ handle ] = callback;
						}
						xhr.onreadystatechange = callback;
					}
				},

				abort: function() {
					if ( callback ) {
						callback( undefined, true );
					}
				}
			};
		}
	});
}
var fxNow, timerId,
	rfxtypes = /^(?:toggle|show|hide)$/,
	rfxnum = new RegExp( "^(?:([+-])=|)(" + core_pnum + ")([a-z%]*)$", "i" ),
	rrun = /queueHooks$/,
	animationPrefilters = [ defaultPrefilter ],
	tweeners = {
		"*": [function( prop, value ) {
			var end, unit,
				tween = this.createTween( prop, value ),
				parts = rfxnum.exec( value ),
				target = tween.cur(),
				start = +target || 0,
				scale = 1,
				maxIterations = 20;

			if ( parts ) {
				end = +parts[2];
				unit = parts[3] || ( sjs.cssNumber[ prop ] ? "" : "px" );

				// We need to compute starting value
				if ( unit !== "px" && start ) {
					// Iteratively approximate from a nonzero starting point
					// Prefer the current property, because this process will be trivial if it uses the same units
					// Fallback to end or a simple constant
					start = sjs.css( tween.elem, prop, true ) || end || 1;

					do {
						// If previous iteration zeroed out, double until we get *something*
						// Use a string for doubling factor so we don't accidentally see scale as unchanged below
						scale = scale || ".5";

						// Adjust and apply
						start = start / scale;
						sjs.style( tween.elem, prop, start + unit );

					// Update scale, tolerating zero or NaN from tween.cur()
					// And breaking the loop if scale is unchanged or perfect, or if we've just had enough
					} while ( scale !== (scale = tween.cur() / target) && scale !== 1 && --maxIterations );
				}

				tween.unit = unit;
				tween.start = start;
				// If a +=/-= token was provided, we're doing a relative animation
				tween.end = parts[1] ? start + ( parts[1] + 1 ) * end : end;
			}
			return tween;
		}]
	};

// Animations created synchronously will run synchronously
function createFxNow() {
	setTimeout(function() {
		fxNow = undefined;
	});
	fxNow = sjs.now();
	return fxNow;
}

function createTweens( animation, props ) {
	sjs.each( props, function( prop, value ) {
		var collection = ( tweeners[ prop ] || [] ).concat( tweeners[ "*" ] ),
			index = 0,
			length = collection.length;
		for ( ; index < length; index++ ) {
			if ( collection[ index ].call( animation, prop, value ) ) {

				// we're done with this property
				return;
			}
		}
	});
}

function Animation( elem, properties, options ) {
	var result,
		stopped,
		index = 0,
		length = animationPrefilters.length,
		deferred = sjs.Deferred().always( function() {
			// don't match elem in the :animated selector
			delete tick.elem;
		}),
		tick = function() {
			if ( stopped ) {
				return false;
			}
			var currentTime = fxNow || createFxNow(),
				remaining = Math.max( 0, animation.startTime + animation.duration - currentTime ),
				// archaic crash bug won't allow us to use 1 - ( 0.5 || 0 ) (#12497)
				temp = remaining / animation.duration || 0,
				percent = 1 - temp,
				index = 0,
				length = animation.tweens.length;

			for ( ; index < length ; index++ ) {
				animation.tweens[ index ].run( percent );
			}

			deferred.notifyWith( elem, [ animation, percent, remaining ]);

			if ( percent < 1 && length ) {
				return remaining;
			} else {
				deferred.resolveWith( elem, [ animation ] );
				return false;
			}
		},
		animation = deferred.promise({
			elem: elem,
			props: sjs.extend( {}, properties ),
			opts: sjs.extend( true, { specialEasing: {} }, options ),
			originalProperties: properties,
			originalOptions: options,
			startTime: fxNow || createFxNow(),
			duration: options.duration,
			tweens: [],
			createTween: function( prop, end ) {
				var tween = sjs.Tween( elem, animation.opts, prop, end,
						animation.opts.specialEasing[ prop ] || animation.opts.easing );
				animation.tweens.push( tween );
				return tween;
			},
			stop: function( gotoEnd ) {
				var index = 0,
					// if we are going to the end, we want to run all the tweens
					// otherwise we skip this part
					length = gotoEnd ? animation.tweens.length : 0;
				if ( stopped ) {
					return this;
				}
				stopped = true;
				for ( ; index < length ; index++ ) {
					animation.tweens[ index ].run( 1 );
				}

				// resolve when we played the last frame
				// otherwise, reject
				if ( gotoEnd ) {
					deferred.resolveWith( elem, [ animation, gotoEnd ] );
				} else {
					deferred.rejectWith( elem, [ animation, gotoEnd ] );
				}
				return this;
			}
		}),
		props = animation.props;

	propFilter( props, animation.opts.specialEasing );

	for ( ; index < length ; index++ ) {
		result = animationPrefilters[ index ].call( animation, elem, props, animation.opts );
		if ( result ) {
			return result;
		}
	}

	createTweens( animation, props );

	if ( sjs.isFunction( animation.opts.start ) ) {
		animation.opts.start.call( elem, animation );
	}

	sjs.fx.timer(
		sjs.extend( tick, {
			elem: elem,
			anim: animation,
			queue: animation.opts.queue
		})
	);

	// attach callbacks from options
	return animation.progress( animation.opts.progress )
		.done( animation.opts.done, animation.opts.complete )
		.fail( animation.opts.fail )
		.always( animation.opts.always );
}

function propFilter( props, specialEasing ) {
	var value, name, index, easing, hooks;

	// camelCase, specialEasing and expand cssHook pass
	for ( index in props ) {
		name = sjs.camelCase( index );
		easing = specialEasing[ name ];
		value = props[ index ];
		if ( sjs.isArray( value ) ) {
			easing = value[ 1 ];
			value = props[ index ] = value[ 0 ];
		}

		if ( index !== name ) {
			props[ name ] = value;
			delete props[ index ];
		}

		hooks = sjs.cssHooks[ name ];
		if ( hooks && "expand" in hooks ) {
			value = hooks.expand( value );
			delete props[ name ];

			// not quite $.extend, this wont overwrite keys already present.
			// also - reusing 'index' from above because we have the correct "name"
			for ( index in value ) {
				if ( !( index in props ) ) {
					props[ index ] = value[ index ];
					specialEasing[ index ] = easing;
				}
			}
		} else {
			specialEasing[ name ] = easing;
		}
	}
}

sjs.Animation = sjs.extend( Animation, {

	tweener: function( props, callback ) {
		if ( sjs.isFunction( props ) ) {
			callback = props;
			props = [ "*" ];
		} else {
			props = props.split(" ");
		}

		var prop,
			index = 0,
			length = props.length;

		for ( ; index < length ; index++ ) {
			prop = props[ index ];
			tweeners[ prop ] = tweeners[ prop ] || [];
			tweeners[ prop ].unshift( callback );
		}
	},

	prefilter: function( callback, prepend ) {
		if ( prepend ) {
			animationPrefilters.unshift( callback );
		} else {
			animationPrefilters.push( callback );
		}
	}
});

function defaultPrefilter( elem, props, opts ) {
	/*jshint validthis:true */
	var prop, index, length,
		value, dataShow, toggle,
		tween, hooks, oldfire,
		anim = this,
		style = elem.style,
		orig = {},
		handled = [],
		hidden = elem.nodeType && isHidden( elem );

	// handle queue: false promises
	if ( !opts.queue ) {
		hooks = sjs._queueHooks( elem, "fx" );
		if ( hooks.unqueued == null ) {
			hooks.unqueued = 0;
			oldfire = hooks.empty.fire;
			hooks.empty.fire = function() {
				if ( !hooks.unqueued ) {
					oldfire();
				}
			};
		}
		hooks.unqueued++;

		anim.always(function() {
			// doing this makes sure that the complete handler will be called
			// before this completes
			anim.always(function() {
				hooks.unqueued--;
				if ( !sjs.queue( elem, "fx" ).length ) {
					hooks.empty.fire();
				}
			});
		});
	}

	// height/width overflow pass
	if ( elem.nodeType === 1 && ( "height" in props || "width" in props ) ) {
		// Make sure that nothing sneaks out
		// Record all 3 overflow attributes because IE does not
		// change the overflow attribute when overflowX and
		// overflowY are set to the same value
		opts.overflow = [ style.overflow, style.overflowX, style.overflowY ];

		// Set display property to inline-block for height/width
		// animations on inline elements that are having width/height animated
		if ( sjs.css( elem, "display" ) === "inline" &&
				sjs.css( elem, "float" ) === "none" ) {

			// inline-level elements accept inline-block;
			// block-level elements need to be inline with layout
			if ( !sjs.support.inlineBlockNeedsLayout || css_defaultDisplay( elem.nodeName ) === "inline" ) {
				style.display = "inline-block";

			} else {
				style.zoom = 1;
			}
		}
	}

	if ( opts.overflow ) {
		style.overflow = "hidden";
		if ( !sjs.support.shrinkWrapBlocks ) {
			anim.always(function() {
				style.overflow = opts.overflow[ 0 ];
				style.overflowX = opts.overflow[ 1 ];
				style.overflowY = opts.overflow[ 2 ];
			});
		}
	}


	// show/hide pass
	for ( index in props ) {
		value = props[ index ];
		if ( rfxtypes.exec( value ) ) {
			delete props[ index ];
			toggle = toggle || value === "toggle";
			if ( value === ( hidden ? "hide" : "show" ) ) {
				continue;
			}
			handled.push( index );
		}
	}

	length = handled.length;
	if ( length ) {
		dataShow = sjs._data( elem, "fxshow" ) || sjs._data( elem, "fxshow", {} );
		if ( "hidden" in dataShow ) {
			hidden = dataShow.hidden;
		}

		// store state if its toggle - enables .stop().toggle() to "reverse"
		if ( toggle ) {
			dataShow.hidden = !hidden;
		}
		if ( hidden ) {
			sjs( elem ).show();
		} else {
			anim.done(function() {
				sjs( elem ).hide();
			});
		}
		anim.done(function() {
			var prop;
			sjs._removeData( elem, "fxshow" );
			for ( prop in orig ) {
				sjs.style( elem, prop, orig[ prop ] );
			}
		});
		for ( index = 0 ; index < length ; index++ ) {
			prop = handled[ index ];
			tween = anim.createTween( prop, hidden ? dataShow[ prop ] : 0 );
			orig[ prop ] = dataShow[ prop ] || sjs.style( elem, prop );

			if ( !( prop in dataShow ) ) {
				dataShow[ prop ] = tween.start;
				if ( hidden ) {
					tween.end = tween.start;
					tween.start = prop === "width" || prop === "height" ? 1 : 0;
				}
			}
		}
	}
}

function Tween( elem, options, prop, end, easing ) {
	return new Tween.prototype.init( elem, options, prop, end, easing );
}
sjs.Tween = Tween;

Tween.prototype = {
	constructor: Tween,
	init: function( elem, options, prop, end, easing, unit ) {
		this.elem = elem;
		this.prop = prop;
		this.easing = easing || "swing";
		this.options = options;
		this.start = this.now = this.cur();
		this.end = end;
		this.unit = unit || ( sjs.cssNumber[ prop ] ? "" : "px" );
	},
	cur: function() {
		var hooks = Tween.propHooks[ this.prop ];

		return hooks && hooks.get ?
			hooks.get( this ) :
			Tween.propHooks._default.get( this );
	},
	run: function( percent ) {
		var eased,
			hooks = Tween.propHooks[ this.prop ];

		if ( this.options.duration ) {
			this.pos = eased = sjs.easing[ this.easing ](
				percent, this.options.duration * percent, 0, 1, this.options.duration
			);
		} else {
			this.pos = eased = percent;
		}
		this.now = ( this.end - this.start ) * eased + this.start;

		if ( this.options.step ) {
			this.options.step.call( this.elem, this.now, this );
		}

		if ( hooks && hooks.set ) {
			hooks.set( this );
		} else {
			Tween.propHooks._default.set( this );
		}
		return this;
	}
};

Tween.prototype.init.prototype = Tween.prototype;

Tween.propHooks = {
	_default: {
		get: function( tween ) {
			var result;

			if ( tween.elem[ tween.prop ] != null &&
				(!tween.elem.style || tween.elem.style[ tween.prop ] == null) ) {
				return tween.elem[ tween.prop ];
			}

			// passing an empty string as a 3rd parameter to .css will automatically
			// attempt a parseFloat and fallback to a string if the parse fails
			// so, simple values such as "10px" are parsed to Float.
			// complex values such as "rotate(1rad)" are returned as is.
			result = sjs.css( tween.elem, tween.prop, "" );
			// Empty strings, null, undefined and "auto" are converted to 0.
			return !result || result === "auto" ? 0 : result;
		},
		set: function( tween ) {
			// use step hook for back compat - use cssHook if its there - use .style if its
			// available and use plain properties where available
			if ( sjs.fx.step[ tween.prop ] ) {
				sjs.fx.step[ tween.prop ]( tween );
			} else if ( tween.elem.style && ( tween.elem.style[ sjs.cssProps[ tween.prop ] ] != null || sjs.cssHooks[ tween.prop ] ) ) {
				sjs.style( tween.elem, tween.prop, tween.now + tween.unit );
			} else {
				tween.elem[ tween.prop ] = tween.now;
			}
		}
	}
};

// Remove in 2.0 - this supports IE8's panic based approach
// to setting things on disconnected nodes

Tween.propHooks.scrollTop = Tween.propHooks.scrollLeft = {
	set: function( tween ) {
		if ( tween.elem.nodeType && tween.elem.parentNode ) {
			tween.elem[ tween.prop ] = tween.now;
		}
	}
};

sjs.each([ "toggle", "show", "hide" ], function( i, name ) {
	var cssFn = sjs.fn[ name ];
	sjs.fn[ name ] = function( speed, easing, callback ) {
		return speed == null || typeof speed === "boolean" ?
			cssFn.apply( this, arguments ) :
			this.animate( genFx( name, true ), speed, easing, callback );
	};
});

sjs.fn.extend({
	fadeTo: function( speed, to, easing, callback ) {

		// show any hidden elements after setting opacity to 0
		return this.filter( isHidden ).css( "opacity", 0 ).show()

			// animate to the value specified
			.end().animate({ opacity: to }, speed, easing, callback );
	},
	animate: function( prop, speed, easing, callback ) {
		var empty = sjs.isEmptyObject( prop ),
			optall = sjs.speed( speed, easing, callback ),
			doAnimation = function() {
				// Operate on a copy of prop so per-property easing won't be lost
				var anim = Animation( this, sjs.extend( {}, prop ), optall );
				doAnimation.finish = function() {
					anim.stop( true );
				};
				// Empty animations, or finishing resolves immediately
				if ( empty || sjs._data( this, "finish" ) ) {
					anim.stop( true );
				}
			};
			doAnimation.finish = doAnimation;

		return empty || optall.queue === false ?
			this.each( doAnimation ) :
			this.queue( optall.queue, doAnimation );
	},
	stop: function( type, clearQueue, gotoEnd ) {
		var stopQueue = function( hooks ) {
			var stop = hooks.stop;
			delete hooks.stop;
			stop( gotoEnd );
		};

		if ( typeof type !== "string" ) {
			gotoEnd = clearQueue;
			clearQueue = type;
			type = undefined;
		}
		if ( clearQueue && type !== false ) {
			this.queue( type || "fx", [] );
		}

		return this.each(function() {
			var dequeue = true,
				index = type != null && type + "queueHooks",
				timers = sjs.timers,
				data = sjs._data( this );

			if ( index ) {
				if ( data[ index ] && data[ index ].stop ) {
					stopQueue( data[ index ] );
				}
			} else {
				for ( index in data ) {
					if ( data[ index ] && data[ index ].stop && rrun.test( index ) ) {
						stopQueue( data[ index ] );
					}
				}
			}

			for ( index = timers.length; index--; ) {
				if ( timers[ index ].elem === this && (type == null || timers[ index ].queue === type) ) {
					timers[ index ].anim.stop( gotoEnd );
					dequeue = false;
					timers.splice( index, 1 );
				}
			}

			// start the next in the queue if the last step wasn't forced
			// timers currently will call their complete callbacks, which will dequeue
			// but only if they were gotoEnd
			if ( dequeue || !gotoEnd ) {
				sjs.dequeue( this, type );
			}
		});
	},
	finish: function( type ) {
		if ( type !== false ) {
			type = type || "fx";
		}
		return this.each(function() {
			var index,
				data = sjs._data( this ),
				queue = data[ type + "queue" ],
				hooks = data[ type + "queueHooks" ],
				timers = sjs.timers,
				length = queue ? queue.length : 0;

			// enable finishing flag on private data
			data.finish = true;

			// empty the queue first
			sjs.queue( this, type, [] );

			if ( hooks && hooks.cur && hooks.cur.finish ) {
				hooks.cur.finish.call( this );
			}

			// look for any active animations, and finish them
			for ( index = timers.length; index--; ) {
				if ( timers[ index ].elem === this && timers[ index ].queue === type ) {
					timers[ index ].anim.stop( true );
					timers.splice( index, 1 );
				}
			}

			// look for any animations in the old queue and finish them
			for ( index = 0; index < length; index++ ) {
				if ( queue[ index ] && queue[ index ].finish ) {
					queue[ index ].finish.call( this );
				}
			}

			// turn off finishing flag
			delete data.finish;
		});
	}
});

// Generate parameters to create a standard animation
function genFx( type, includeWidth ) {
	var which,
		attrs = { height: type },
		i = 0;

	// if we include width, step value is 1 to do all cssExpand values,
	// if we don't include width, step value is 2 to skip over Left and Right
	includeWidth = includeWidth? 1 : 0;
	for( ; i < 4 ; i += 2 - includeWidth ) {
		which = cssExpand[ i ];
		attrs[ "margin" + which ] = attrs[ "padding" + which ] = type;
	}

	if ( includeWidth ) {
		attrs.opacity = attrs.width = type;
	}

	return attrs;
}

// Generate shortcuts for custom animations
sjs.each({
	slideDown: genFx("show"),
	slideUp: genFx("hide"),
	slideToggle: genFx("toggle"),
	fadeIn: { opacity: "show" },
	fadeOut: { opacity: "hide" },
	fadeToggle: { opacity: "toggle" }
}, function( name, props ) {
	sjs.fn[ name ] = function( speed, easing, callback ) {
		return this.animate( props, speed, easing, callback );
	};
});

sjs.speed = function( speed, easing, fn ) {
	var opt = speed && typeof speed === "object" ? sjs.extend( {}, speed ) : {
		complete: fn || !fn && easing ||
			sjs.isFunction( speed ) && speed,
		duration: speed,
		easing: fn && easing || easing && !sjs.isFunction( easing ) && easing
	};

	opt.duration = sjs.fx.off ? 0 : typeof opt.duration === "number" ? opt.duration :
		opt.duration in sjs.fx.speeds ? sjs.fx.speeds[ opt.duration ] : sjs.fx.speeds._default;

	// normalize opt.queue - true/undefined/null -> "fx"
	if ( opt.queue == null || opt.queue === true ) {
		opt.queue = "fx";
	}

	// Queueing
	opt.old = opt.complete;

	opt.complete = function() {
		if ( sjs.isFunction( opt.old ) ) {
			opt.old.call( this );
		}

		if ( opt.queue ) {
			sjs.dequeue( this, opt.queue );
		}
	};

	return opt;
};

sjs.easing = {
	linear: function( p ) {
		return p;
	},
	swing: function( p ) {
		return 0.5 - Math.cos( p*Math.PI ) / 2;
	}
};

sjs.timers = [];
sjs.fx = Tween.prototype.init;
sjs.fx.tick = function() {
	var timer,
		timers = sjs.timers,
		i = 0;

	fxNow = sjs.now();

	for ( ; i < timers.length; i++ ) {
		timer = timers[ i ];
		// Checks the timer has not already been removed
		if ( !timer() && timers[ i ] === timer ) {
			timers.splice( i--, 1 );
		}
	}

	if ( !timers.length ) {
		sjs.fx.stop();
	}
	fxNow = undefined;
};

sjs.fx.timer = function( timer ) {
	if ( timer() && sjs.timers.push( timer ) ) {
		sjs.fx.start();
	}
};

sjs.fx.interval = 13;

sjs.fx.start = function() {
	if ( !timerId ) {
		timerId = setInterval( sjs.fx.tick, sjs.fx.interval );
	}
};

sjs.fx.stop = function() {
	clearInterval( timerId );
	timerId = null;
};

sjs.fx.speeds = {
	slow: 600,
	fast: 200,
	// Default speed
	_default: 400
};

// Back Compat <1.8 extension point
sjs.fx.step = {};

if ( sjs.expr && sjs.expr.filters ) {
	sjs.expr.filters.animated = function( elem ) {
		return sjs.grep(sjs.timers, function( fn ) {
			return elem === fn.elem;
		}).length;
	};
}
var docElem = document.documentElement;

/**
 *  get/set 一个元素相对于文档（document）的当前位置
 * @param {Object<{ top: 170, left: 54}>} options 要设置的集合
 * @return {Object<{ top: 170, left: 54}>} 
 */
sjs.fn.offset = function( options ) {
	if ( arguments.length ) {
		return options === undefined ?
			this :
			this.each(function( i ) {
				sjs.offset.setOffset( this, options, i );
			});
	}

	var docElem, win,
		box = { top: 0, left: 0 },
		elem = this[ 0 ],
		doc = elem && elem.ownerDocument;

	if ( !doc ) {
		return;
	}

	docElem = doc.documentElement;

	// 确保节点在dom树上
	if ( !sjs.contains( docElem, elem ) ) {
		return box;
	}

	// 如果没有getBoundClientRect方法，返回0，0，BlackBerry 5, iOS 3 (original iPhone)
	if ( typeof elem.getBoundingClientRect !== typeof undefined ) {
		box = elem.getBoundingClientRect();
	}
	win = getWindow( doc );
	return {
		top: box.top  + ( win.pageYOffset || docElem.scrollTop )  - ( docElem.clientTop  || 0 ),
		left: box.left + ( win.pageXOffset || docElem.scrollLeft ) - ( docElem.clientLeft || 0 )
	};
};

sjs.offset = {

	setOffset: function( elem, options, i ) {
		var position = sjs.css( elem, "position" );

		// .offset()作为setter时，如果没有元素的position（此时值为static），那么.offset()方法会将其设置为“relative”以相对于视口进行重新定位
		if ( position === "static" ) {
			elem.style.position = "relative";
		}

		var curElem = sjs( elem ),
			curOffset = curElem.offset(),
			curCSSTop = sjs.css( elem, "top" ),
			curCSSLeft = sjs.css( elem, "left" ),
			calculatePosition = ( position === "absolute" || position === "fixed" ) && sjs.inArray("auto", [curCSSTop, curCSSLeft]) > -1,
			props = {}, curPosition = {}, curTop, curLeft;

		// top，left属性为auto并且positon为absolute货fixed时，需要重新计算其值
		if ( calculatePosition ) {
			curPosition = curElem.position();
			curTop = curPosition.top;
			curLeft = curPosition.left;
		} else {
			curTop = parseFloat( curCSSTop ) || 0;
			curLeft = parseFloat( curCSSLeft ) || 0;
		}

		if ( sjs.isFunction( options ) ) {
			options = options.call( elem, i, curOffset );
		}

		if ( options.top != null ) {
			props.top = ( options.top - curOffset.top ) + curTop;
		}
		if ( options.left != null ) {
			props.left = ( options.left - curOffset.left ) + curLeft;
		}

		if ( "using" in options ) {
			options.using.call( elem, props );
		} else {
			curElem.css( props );
		}
	}
};


sjs.fn.extend({
	
/**
 *  get/set 元素的相对于父节点的位置 { top: 170, left: 54}
 * @return {Object<{ top: 170, left: 54}>} 
 */
	position: function() {
		if ( !this[ 0 ] ) {
			return;
		}

		var offsetParent, offset,
			parentOffset = { top: 0, left: 0 },
			elem = this[ 0 ];

		// postition为fixed时，其相对位置父节点为window
		if ( sjs.css( elem, "position" ) === "fixed" ) {
			// 我们猜测getBoundingClientRect是可用的
			offset = elem.getBoundingClientRect();
		} else {
			// 获取offsetParent
			offsetParent = this.offsetParent();

			// 获取修正后的offset
			offset = this.offset();
			if ( !sjs.nodeName( offsetParent[ 0 ], "html" ) ) {
				parentOffset = offsetParent.offset();
			}

			// 加上offsetparent的border宽度
			parentOffset.top  += sjs.css( offsetParent[ 0 ], "borderTopWidth", true );
			parentOffset.left += sjs.css( offsetParent[ 0 ], "borderLeftWidth", true );
		}

		// 减去offsetparent的 offsets 和元素本身的margin
		// 注意: safari中当元素的margin为auto时offset.left 会获取错误的值（0）
		return {
			top:  offset.top  - parentOffset.top - sjs.css( elem, "marginTop", true ),
			left: offset.left - parentOffset.left - sjs.css( elem, "marginLeft", true)
		};
	},
	/**
	 * 返回该元素的offsetParent
	 */
	offsetParent: function() {
		return this.map(function() {
			var offsetParent = this.offsetParent || docElem;
			while ( offsetParent && ( !sjs.nodeName( offsetParent, "html" ) && sjs.css( offsetParent, "position") === "static" ) ) {
				offsetParent = offsetParent.offsetParent;
			}
			return offsetParent || docElem;
		});
	}
});

/**
 * 获取该元素滚动条的水平位置
 * @method scrollLeft 
 * @return {Int} 
 */

/**
 * 获取该元素滚动条的垂直位置
 * @method scrollTop
 * @return {Int} 
 */
// 生成 scrollLeft 、 scrollTop方法
sjs.each( {scrollLeft: "pageXOffset", scrollTop: "pageYOffset"}, function( method, prop ) {
	var top = /Y/.test( prop );

	sjs.fn[ method ] = function( val ) {
		return sjs.access( this, function( elem, method, val ) {
			var win = getWindow( elem );

			if ( val === undefined ) {
				return win ? (prop in win) ? win[ prop ] :
					win.document.documentElement[ method ] :
					elem[ method ];
			}

			if ( win ) {
				win.scrollTo(
					!top ? val : sjs( win ).scrollLeft(),
					top ? val : sjs( win ).scrollTop()
				);

			} else {
				elem[ method ] = val;
			}
		}, method, val, arguments.length, null );
	};
});

function getWindow( elem ) {
	return sjs.isWindow( elem ) ?
		elem :
		elem.nodeType === 9 ?
			elem.defaultView || elem.parentWindow :
			false;
}
// Create innerHeight, innerWidth, height, width, outerHeight and outerWidth methods
sjs.each( { Height: "height", Width: "width" }, function( name, type ) {
	sjs.each( { padding: "inner" + name, content: type, "": "outer" + name }, function( defaultExtra, funcName ) {
		// margin is only for outerHeight, outerWidth
		sjs.fn[ funcName ] = function( margin, value ) {
			var chainable = arguments.length && ( defaultExtra || typeof margin !== "boolean" ),
				extra = defaultExtra || ( margin === true || value === true ? "margin" : "border" );

			return sjs.access( this, function( elem, type, value ) {
				var doc;

				if ( sjs.isWindow( elem ) ) {
					// As of 5/8/2012 this will yield incorrect results for Mobile Safari, but there
					// isn't a whole lot we can do. See pull request at this URL for discussion:
					// https://github.com/jquery/jquery/pull/764
					return elem.document.documentElement[ "client" + name ];
				}

				// Get document width or height
				if ( elem.nodeType === 9 ) {
					doc = elem.documentElement;

					// Either scroll[Width/Height] or offset[Width/Height] or client[Width/Height], whichever is greatest
					// unfortunately, this causes bug #3838 in IE6/8 only, but there is currently no good, small way to fix it.
					return Math.max(
						elem.body[ "scroll" + name ], doc[ "scroll" + name ],
						elem.body[ "offset" + name ], doc[ "offset" + name ],
						doc[ "client" + name ]
					);
				}

				return value === undefined ?
					// Get width or height on the element, requesting but not forcing parseFloat
					sjs.css( elem, type, extra ) :

					// Set width or height on the element
					sjs.style( elem, type, value, extra );
			}, type, chainable ? margin : undefined, chainable, null );
		};
	});
});
/*
 * @UI class
 * @author fuqiang3@staff.sina.com.cn
 **/
(function() {

	//class类，所有UI组件均基于class创建实例.
	function Class(o) {
		//把一个普通类，转换为符合Class的格式的类
		if (! (this instanceof Class) && sjs.isFunction(o)) {
			return classify(o);
		}
	}

	Class.create = function(parent, properties) {
		//properties的参数修正
		if (!sjs.isFunction(parent)) {
			properties = parent;
			parent = null;
		}
		//parent修正，如果properites没有执行Extends于哪个类，那么父类都继承于Class
		properties || (properties = {});
		parent || (parent = properties.Extends || Class);
		properties.Extends = parent;
		//一个干净的新构造器，并继承到parent上，并每次被实例的时候都自动执行initialize方法
		function SubClass() {
			var arg = sjs.makeArray(arguments);
			parent.apply(this, arg);
			if (this.constructor === SubClass && this.initialize) {
				this.initialize.apply(this, arg);
			}
		}
		//如果父类不是Class，那么手动把父类的静态方法属性混入SubClass
		//不复制prototype，并可以设置一份静态方法属性的白名单
		if (parent !== Class) {
			mix(SubClass, parent, parent.StaticsWhiteList);
		}
		//处理prototype，用抄写的方法混入prototype
		implement.call(SubClass, properties);
		//返回包装了extend和implement方法的统一类.增加extend和implement方法
		return classify(SubClass);
	};
	//在create和extend中的properties如果包含了如下的关键字属性
	//则会做特殊处理
	//Extends 会进行一次继承操作。
	Class.Mutators = {
		'Extends': function(parent) {
			var existed = this.prototype,
			//拿到一个只带着父类prototype的object
			proto = createProto(parent.prototype);
			//抄写实现prototype继承
			mix(proto, existed);
			//重新修正constructor到Class上
			proto.constructor = this;
			this.prototype = proto;
			//约定一个可以访问父级方法的superclass
			this.superclass = parent.prototype;
		},
		//Implements 会进行prototype混入,支持数组形式多个混入
		'Implements': function(items) {
			items = sjs.isArray(items) ? items: [items];
			var proto = this.prototype,
			item;
			while (items.length) {
				item = items.shift();
				mix(proto, item.prototype || item);
			}
		},
		//Statics会混入静态方法
		'Statics': function(staticProperties) {
			mix(this, staticProperties);
		}
	};

	//创建一个基于class的超级类
	Class.extend = function(properties) {
		properties || (properties = {});
		properties.Extends = this;
		return Class.create(properties);
	};

	function implement(properties) {
		var self = this;
		sjs.each(properties, function(key, value) {
			//如果是关键字属性，则调用关键字处理方法
			if (Class.Mutators.hasOwnProperty(key)) {
				Class.Mutators[key].call(self, value);
			} else {
				//不是关键字的直接抄写
				self.prototype[key] = value;
			}
		});
	}

	//转换普通类
	function classify(cls) {
		cls.extend = Class.extend;
		cls.implement = implement;
		return cls;
	}

	function Ctor() {}

	var createProto = Object['__proto__'] ? function(proto) {
		return {
			'__proto__': proto
		};
	}: function(proto) {
		Ctor.prototype = proto;
		return new Ctor();
	};

	function mix(r, s, wl) {
		for (var p in s) {
			if (s.hasOwnProperty(p)) {
				if (wl && sjs.inArray(p, wl) === - 1) {
					continue;
				}
				// 在 iPhone 1 代等设备的 Safari 中，prototype 也会被枚举出来，需排除
				if (p !== 'prototype') {
					r[p] = s[p];
				}
			}
		}
	}

	function getMethod(host, methodName) {
		var method = host[methodName];
		if (!method) {
			throw new Error('Invalid method name:' + methodName);
		}
		return method;
	}

	function wrap(methodName) {
		var old = this[methodName];

		this[methodName] = function() {
			var args = sjs.makeArray(arguments);
			var beforeArgs = ['before:' + methodName].concat(args);
			this.trigger.apply(this, beforeArgs);
			var beforeCallback = this.proxy_events['before:' + methodName];
			if (beforeCallback && beforeCallback.callbacks.locked()) {
				return;
			}
			var ret = old.apply(this, args);
			var afterArgs = ['after:' + methodName, ret].concat(args);
			this.trigger.apply(this, afterArgs);
		};

		this[methodName].__isAspected = true;
	}

	var proxy_event = {
		once: function(events, callback, context) {
			this.on(events, callback, context, true);
		},
		on: function(events, callback, context, once) {
			var proxy_events = this.proxy_events || (this.proxy_events = {});
			if (!proxy_events.hasOwnProperty(events)) {
				var callbacks = once ? sjs.Callbacks('once stopOnFalse') : sjs.Callbacks('stopOnFalse');
				proxy_events[events] = {
					callbacks: callbacks,
					context: context
				};
			}
			proxy_events[events].callbacks.add(callback);
		},
		off: function(events, callback) {
			var proxy_events = this.proxy_events;
			if (proxy_events) {
				var event = proxy_events[events];
				if (events && event) {
					var callbacks = event.callbacks;
					if (callback) {
						callbacks.remove(callback);
					} else {
						callbacks.empty();
					}
				} else {
					for (var i in proxy_events) {
						proxy_events[i].callbacks.empty();
					}
				}
			}
		},
		trigger: function() { //[name,args]
			if (this.proxy_events) {
				var args = sjs.makeArray(arguments),
				name = args.shift();
				proxy_event = this.proxy_events[name];
				if (proxy_event) {
					var callbacks = proxy_event.callbacks,
					context = proxy_event.context;
					callbacks.fire.apply((context ? sjs.extend(context, callbacks) : false) || callbacks, args);
				}
			}
		},
		before: function(methodName, callback,context) {
			var method = getMethod(this, methodName);
			if (!method.__isAspected) {
				wrap.call(this, methodName);
			}
			this.on('before:' + methodName, callback, context || this);
			return this;
		},
		after: function(methodName, callback,context) {
			var method = getMethod(this, methodName);
			if (!method.__isAspected) {
				wrap.call(this, methodName);
			}
			this.on('after:' + methodName, callback, context || this);
			return this;
		}
	};

	var proxy_attribute = {
		initAttrs: function(config) {
			// initAttrs 是在初始化时调用的，默认情况下实例上肯定没有 attrs，不存在覆盖问题
			var attrs = this.attrs = {};

			// Get all inherited attributes.
			var specialProps = this.propsInAttrs || [];
			mergeInheritedAttrs(attrs, this, specialProps);

			// Merge user-specific attributes from config.
			if (config) {
				mergeUserValue(attrs, config);
			}

			// 对于有 setter 的属性，要用初始值 set 一下，以保证关联属性也一同初始化
			setSetterAttrs(this, attrs, config);

			// Convert `on/before/afterXxx` config to event handler.
			parseEventsFromAttrs(this, attrs);

			// 将 this.attrs 上的 special properties 放回 this 上
			copySpecialProps(specialProps, this, attrs, true);
		},
		get: function(key) {
			var attr = this.attrs[key] || {};
			var val = attr.value;
			return attr.getter ? attr.getter.call(this, val, key) : val;
		},
		set: function(key, val, options) {
			var attrs = {};

			// set("key", val, options)
			if (sjs.isString(key)) {
				attrs[key] = val;
			}
			// set({ "key": val, "key2": val2 }, options)
			else {
				attrs = key;
				options = val;
			}

			options || (options = {});
			var silent = options.silent;
			var override = options.override;

			var now = this.attrs;
			var changed = this.__changedAttrs || (this.__changedAttrs = {});

			for (key in attrs) {
				if (!attrs.hasOwnProperty(key)) {
					continue;
				}

				var attr = now[key] || (now[key] = {});
				val = attrs[key];

				if (attr.readOnly) {
					throw new Error('This attribute is readOnly: ' + key);
				}

				// invoke setter
				if (attr.setter) {
					val = attr.setter.call(this, val, key);
				}

				// 获取设置前的 prev 值
				var prev = this.get(key);

				// 获取需要设置的 val 值
				// 如果设置了 override 为 true，表示要强制覆盖，就不去 merge 了
				// 都为对象时，做 merge 操作，以保留 prev 上没有覆盖的值
				if (!override && sjs.isPlainObject(prev) && sjs.isPlainObject(val)) {
					val = merge(merge({},
					prev), val);
				}

				// set finally
				now[key].value = val;

				// invoke change event
				// 初始化时对 set 的调用，不触发任何事件
				if (!this.__initializingAttrs && ! sjs.isEqual(prev, val)) {
					if (silent) {
						changed[key] = [val, prev];
					}
					else {
						this.trigger('change:' + key, val, prev, key);
					}
				}
			}

			return this;
		},
		change: function() {
			var changed = this.__changedAttrs;

			if (changed) {
				for (var key in changed) {
					if (changed.hasOwnProperty(key)) {
						var args = changed[key];
						this.trigger('change:' + key, args[0], args[1], key);
					}
				}
				delete this.__changedAttrs;
			}

			return this;
		}
	};

	//attributes help
	function merge(receiver, supplier) {
		var key, value;
		for (key in supplier) {
			if (supplier.hasOwnProperty(key)) {
				value = supplier[key];

				// 只 clone 数组和 plain object，其他的保持不变
				if (sjs.isArray(value)) {
					value = value.slice();
				}
				else if (sjs.isPlainObject(value)) {
					var prev = receiver[key];
					sjs.isPlainObject(prev) || (prev = {});

					value = merge(prev, value);
				}

				receiver[key] = value;
			}
		}
		return receiver;
	}

	function mergeInheritedAttrs(attrs, instance, specialProps) {
		var inherited = [];
		var proto = instance.constructor.prototype;

		while (proto) {
			// 不要拿到 prototype 上的
			if (!proto.hasOwnProperty('attrs')) {
				proto.attrs = {};
			}

			// 将 proto 上的特殊 properties 放到 proto.attrs 上，以便合并
			copySpecialProps(specialProps, proto.attrs, proto);

			// 为空时不添加
			if (!sjs.isEmptyObject(proto.attrs)) {
				inherited.unshift(proto.attrs);
			}

			// 向上回溯一级
			proto = proto.constructor.superclass;
		}

		// Merge and clone default values to instance.
		for (var i = 0, len = inherited.length; i < len; i++) {
			merge(attrs, normalize(inherited[i]));
		}
	}

	function copySpecialProps(specialProps, receiver, supplier, isAttr2Prop) {
		for (var i = 0, len = specialProps.length; i < len; i++) {
			var key = specialProps[i];

			if (supplier.hasOwnProperty(key)) {
				receiver[key] = isAttr2Prop ? receiver.get(key) : supplier[key];
			}
		}
	}

	function mergeUserValue(attrs, config) {
		merge(attrs, normalize(config, true));
	}

	function setSetterAttrs(host, attrs, config) {
		var options = {
			silent: true
		};
		host.__initializingAttrs = true;
		for (var key in config) {
			if (config.hasOwnProperty(key)) {
				if (attrs[key].setter) {
					host.set(key, config[key], options);
				}
			}
		}
		delete host.__initializingAttrs;
	}
	var EVENT_PATTERN = /^(on|before|after)([A-Z].*)$/;
	var EVENT_NAME_PATTERN = /^(Change)?([A-Z])(.*)/;
	function parseEventsFromAttrs(host, attrs) {
		for (var key in attrs) {
			if (attrs.hasOwnProperty(key)) {
				var value = attrs[key].value,
				m;
				if (sjs.isFunction(value) && (m = key.match(EVENT_PATTERN))) {
					host[m[1]](getEventName(m[2]), value);
					delete attrs[key];
				}
			}
		}
	}

	// Converts `Show` to `show` and `ChangeTitle` to `change:title`
	function getEventName(name) {
		var m = name.match(EVENT_NAME_PATTERN);
		var ret = m[1] ? 'change:': '';
		ret += m[2].toLowerCase() + m[3];
		return ret;
	}

	var ATTR_SPECIAL_KEYS = ['value', 'getter', 'setter', 'readOnly'];

	// normalize `attrs` to
	//
	// {
	// value: 'xx',
	// getter: fn,
	// setter: fn,
	// readOnly: boolean
	// }
	//
	function normalize(attrs, isUserValue) {
		var newAttrs = {};

		for (var key in attrs) {
			var attr = attrs[key];

			if (!isUserValue && sjs.isPlainObject(attr) && hasOwnProperties(attr, ATTR_SPECIAL_KEYS)) {
				newAttrs[key] = attr;
				continue;
			}

			newAttrs[key] = {
				value: attr
			};
		}

		return newAttrs;
	}

	function hasOwnProperties(object, properties) {
		for (var i = 0, len = properties.length; i < len; i++) {
			if (object.hasOwnProperty(properties[i])) {
				return true;
			}
		}
		return false;
	}

	// 对于 attrs 的 value 来说，以下值都认为是空值： null, undefined, '', [], {}
	function isEmptyAttrValue(o) {
		return o === null || o === undefined;
	}

	function parseEventsFromInstance(host, attrs) {
		for (var attr in attrs) {
			if (attrs.hasOwnProperty(attr)) {
				var m = '_onChange' + ucfirst(attr);
				if (host[m]) {
					host.on('change:' + attr, host[m]);
				}
			}
		}
	}

	function ucfirst(str) {
		return str.charAt(0).toUpperCase() + str.substring(1);
	}

	var Base = Class.create({
		Implements: [proxy_event, proxy_attribute],
		initialize: function(config) {
			//初始化Attribute方法和参数
			this.initAttrs(config);

			// Automatically register `this._onChangeAttr` method as
			// a `change:attr` event handler.
			parseEventsFromInstance(this, this.attrs);
		},
		destroy: function() {
			this.off();
			for (var p in this) {
				if (this.hasOwnProperty(p)) {
					delete this[p];
				}
			}
		}
	});

	//UI helper
	var cidCounter = 0;
	var cachedInstances = [];
	var DATA_UI_CID = 'data-ui-cid';
	var EVENT_KEY_SPLITTER = /^(\S+)\s*(.*)$/;
	var ON_RENDER = '_onRender';
	var DELEGATE_EVENT_NS = '.delegate-events-';

	function uniqueCid() {
		cidCounter++;
		return 'ui-' + cidCounter;
	}
	function getEvents(ui) {
		if (sjs.isFunction(ui.events)) {
			ui.events = ui.events();
		}
		return ui.events;
	}
	function parseEventKey(eventKey, ui) {
		var match = eventKey.match(EVENT_KEY_SPLITTER);
		var eventType = match[1] + DELEGATE_EVENT_NS + ui.cid;
		var selector = match[2] || undefined;
		return {
			type: eventType,
			selector: selector
		};
	}
	function isInDocument(element) {
		return sjs.contains(document.documentElement, element);
	}
	var UI = Base.extend({
		propsInAttrs: ['element', 'events'],
		element: null,
		events: null,
		attrs: {
			id: null,
			className: null,
			style: null,
			template: '<div></div>',
			model: null,
			parentNode:'body' 
		},
		initialize: function(config) {
			//生成唯一id
			this.cid = uniqueCid();
			//初始化attrs
			UI.superclass.initialize.call(this,config || {});
			//初始化props
			this.parseElement();
			this.initProps();
			//初始化events
			this.delegateEvents();
			//子类自定义初始化
			this.setup();
			//保存实例信息
			this._stamp();
			//是否由template初始化
			this._isTemplate = ! (config && config.element);
		},
		//构建this.element
		parseElement: function() {
			var element = this.element;
			if (element) {
				this.element = sjs(element);
			} else if (this.get('template')) {
				this.parseElementFromTemplate();
			}

			if (!this.element || ! this.element[0]) {
				throw new Error('element is invalid');
			}
		},
		parseElementFromTemplate: function() {
			this.element = sjs(this.get('template'));
		},
		initProps: function() {

		},
		delegateEvents: function(element, events, handler) {
			//UI.delegateEvents();
			if (arguments.length === 0) {
				events = getEvents(this);
				element = this.element;
			}

			//UI.delegateEvents({
			//  'click p':'fn1',
			//  'click li':'fn2'
			//});
			else if (arguments.length === 1) {
				events = element;
				element = this.element;
			}
			// UI.delegateEvents('click p',function(ev){ ... });
			else if (arguments.length === 2) {
				handler = events;
				events = element;
				element = this.element;
			}
			// UI.delegateEvents(element,'click p',function(ev){...});
			else {
				element || (element = this.element);
				this._delegateElements || (this._delegateElements = []);
				this._delegateElements.push(sjs(element));
			}

			//'click p' -> {'click p':handler}
			if (sjs.isString(events) && sjs.isFunction(handler)) {
				var o = {};
				o[events] = handler;
				events = o;
			}

			function inner(handler, ui, eventType, selector) {
				var callback = function(ev) {
					if (sjs.isFunction(handler)) {
						handler.call(ui, ev);
					} else {
						ui[handler](ev);
					}
				};

				// delegate
				if (selector) {
					sjs(element).on(eventType, selector, callback);
				} else {
					sjs(element).on(eventType, callback);
				}
			}

			//key 为 event selector
			for (var key in events) {
				if (!events.hasOwnProperty(key)) {
					continue;
				}
				var args = parseEventKey(key, this);
				var eventType = args.type;
				var selector = args.selector;
				inner(events[key], this, eventType, selector);
			}
			return this;
		},
		undelegateEvents: function(element, eventKey) {
			if (!eventKey) {
				eventKey = element;
				element = null;
			}
			//卸载所有
			//.undelegateEvents();
			if (arguments.length === 0) {
				var type = DELEGATE_EVENT_NS + this.cid;
				this.element && this.element.off(type);
				//卸载外部element
				if (this._delegateElements) {
					for (var de in this._delegateElements) {
						if (!this._delegateElements.hasOwnProperty(de)) {
							continue;
						}
						this._delegateElements[de].off(type);
					}
				}
			} else {
				var args = parseEventKey(eventKey, this);
				//卸载this.element
				// .undelegateEvents(events);
				if (!element) {
					this.element && this.element.off(args.type, args.selector);
				}
				//卸载外部element
				// .undelegateEvents(element,events)
				else {
					sjs(element).off(args.type, args.selector);
				}
			}
			return this;
		},
		setup: function() {

		},
		//子类覆盖时也要 return this;
		render: function() {
			if (!this.rendered) {
				//初始化，并把相关属性帮顶到change
				this._renderAttrBindAttrs();
				this.rendered = true;
			}
			//插入节点
			var parentNode = this.get('parentNode');
			if (parentNode && ! isInDocument(this.element[0])) {
				// 隔离样式，添加统一的命名空间
				// 只处理 template 的情况，不处理传入的 element
				var outerBoxClass = this.constructor.outerBoxClass;
				if (outerBoxClass) {
					var outerBox = this._outerBox = sjs('<div></div>').addClass(outerBoxClass);
					outerBox.append(this.element).appendTo(parentNode);
				} else {
					this.element.appendTo(parentNode);
				}
			}
			return this;
		},
		_renderAttrBindAttrs: function() {
			var ui = this;
			var attrs = ui.attrs;

			function inner(m, ui, attr) {
				ui.on('change:' + attr, function(val, prev, key) {
					ui[m](val, prev, key);
				});
			}

			for (var attr in attrs) {
				if (!attrs.hasOwnProperty(attr)) {
					continue;
				}
				var m = ON_RENDER + ucfirst(attr);

				if (this[m]) {
					var val = this.get(attr);

					// 让属性的初始值生效。注：默认空值不触发
					if (!isEmptyAttrValue(val)) {
						this[m](val, undefined, attr);
					}

					// 将 _onRenderXx 自动绑定到 change:xx 事件上
					inner(m, ui, attr);

				}
			}
		},
		_onRenderId: function(val) {
			this.element.attr('id', val);
		},
		_onRenderClassName: function(val) {
			this.element.addClass(val);
		},
		_onRenderStyle: function(val) {
			this.element.css(val);
		},
		_stamp: function() {
			var cid = this.cid;
			this.element.attr(DATA_UI_CID, cid);
			cachedInstances[cid] = this;
		},
		$: function(selector) {
			return this.element.find(selector);
		},
		destroy: function() {
			this.undelegateEvents();
			delete cachedInstances[this.cid];
			//防止内存泄露
			if (this.element) {
				this.element.off();
				// 如果是 ui 生成的 element 则去除
				this._isTemplate && (this._outerBox || this.element).remove();
				this.element = null;
			}
			UI.superclass.destroy.call(this);
		}
	});
	//防止内存泄露
	sjs(window).unload(function() {
		for (var cid in cachedInstances) {
			cachedInstances[cid].destroy();
		}
	});

	UI.query = function(selector) {
		var element = sjs(selector).eq(0);
		var cid;
		element && (cid = element.attr(DATA_UI_CID));
		return cachedInstances[cid];
	};

	sjs.UI = UI;
	//测试用
	sjs.UI.Class = Class;
	sjs.UI.Base = Base;

})();

if(typeof module === 'object' && module.exports === 'object'){
	//把sjs作为node的模块来调用
	module.exports = sjs;
}else{
	//把sjs添加给全局变量
	window.sjs = window.$ = sjs;

	//注册成为一个具名的AMD模块
	if(typeof define === 'function' && define.amd){
		define('sjs',[],function(){return sjs;});
	}
}

})(this);
//@ sourceMappingURL=/dist/sjs.min.js.map
