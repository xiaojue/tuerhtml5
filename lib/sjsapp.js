(function(global, undef) {

	var isBrowser = !! (typeof window !== undef && global.navigator && global.document);
	if (isBrowser) {
		var NAMESPACE = {};
		var doc = global.document,
		loc = global.location,
		noop = function() {},
		Arr = Array.prototype,
		Obj = Object,
		ALIAS,
		TIMESTAMP,
		CHARSET = 'utf-8',
		toString = Obj.prototype.toString,
		header = doc.head || doc.getElementsByTagName('head')[0] || doc.documentElement,
		UA = navigator.userAgent,
		scripts = doc.getElementsByTagName('script'),
		currentLoadedScript = scripts[scripts.length - 1],
		attr = function(node, ns) {
			return node.getAttribute(ns);
		},
		BASEPATH = attr(currentLoadedScript, 'data-path') || currentLoadedScript.src || attr(currentLoadedScript, 'src'),
		CONFIG = attr(currentLoadedScript, 'data-config'),
		DEBUG = attr(currentLoadedScript, 'data-debug') === 'true',
		mainjs = attr(currentLoadedScript, 'data-main'),
		baseElement = header.getElementsByTagName('base')[0],
		commentRegExp = /(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/mg,
		jsRequireRegExp = /[^.]\s*require\s*\(\s*["']([^'"\s]+)["']\s*\)/g,
		fetching = {},
		callbacks = {},
		fetched = {},
		circularStack = [],
		anonymouse = [],
		currentlyAddingScript,
		interactiveScript,
		_cgs = [],
		stack = {},
		extend = function(source, options) {
			if (arguments.length === 1) return source;
			else {
				for (var i in options) {
					if (options.hasOwnProperty(i)) source[i] = options[i];
				}
				return source;
			}
		};
		var tool = extend({
			isString: function(v) {
				return toString.call(v) === '[object String]';
			},
			isFunction: function(v) {
				return toString.call(v) === '[object Function]';
			},
			isObject: function(v) {
				return v === Obj(v);
			},
			forEach: Arr.forEach ? function(arr, fn) {
				arr.forEach(fn);
			}: function(arr, fn) {
				for (var i = 0; i < arr.length; i++) fn(arr[i], i, arr);
			},
			filter: Arr.filter ? function(arr, fn) {
				return arr.filter(fn);
			}: function(arr, fn) {
				var ret = [];
				tool.forEach(arr, function(item, i, arr) {
					if (fn(item, i, arr)) ret.push(item);
				});
				return ret;
			},
			map: Arr.map ? function(arr, fn) {
				return arr.map(fn);
			}: function(arr, fn) {
				var ret = [];
				tool.forEach(arr, function(item, i, arr) {
					ret.push(fn(item, i, arr));
				});
				return ret;
			},
			keys: Obj.keys ? Obj.keys: function(o) {
				var ret = [];
				for (var p in o) {
					if (o.hasOwnProperty(p)) ret.push(p);
				}
				return ret;
			},
			indexOf: Arr.indexOf ? function(arr, selector) {
				return arr.indexOf(selector);
			}: function(arr, selector) {
				for (var i = 0; i < arr.length; i++) {
					if (arr[i] === selector) return i;
				}
				return - 1;
			},
			unique: function(arr) {
				var o = {};
				tool.forEach(arr, function(item) {
					o[item] = 1;
				});
				return tool.keys(o);
			},
			_createNode: function(tag, charset) {
				var node = doc.createElement(tag);
				if (charset) node.charset = charset;
				return node;
			},
			_insertScript: function(node) {
				baseElement ? header.insertBefore(node, baseElement) : header.appendChild(node);
			},
			getScript: function(url, cb, charset) {
				var node = tool._createNode('script', charset);
				node.onload = node.onerror = node.onreadystatechange = function() {
					if (/loaded|complete|undefined/.test(node.readyState)) {
						node.onload = node.onerror = node.onreadystatechange = null;
						if (node.parentNode && ! DEBUG) node.parentNode.removeChild(node);
						node = undef;
						if (tool.isFunction(cb)) cb();
					}
				};
				node.async = 'async';
				node.src = url;
				currentlyAddingScript = node;
				tool._insertScript(node);
				currentlyAddingScript = null;
			},
			_fetch: function(url, cb) {
				if (fetched[url]) {
					cb();
					return;
				}
				if (fetching[url]) {
					callbacks[url].push(cb);
					return;
				}
				fetching[url] = true;
				callbacks[url] = [cb];
				tool.getScript(url, function() {
					fetched[url] = true;
					delete fetching[url];
					var fns = callbacks[url];
					if (fns) {
						delete callbacks[url];
						tool.forEach(fns, function(fn) {
							fn();
						});
					}
				},
				CHARSET);
			},
			getDependencies: function(code) {
				var deps = [];
				code.replace(commentRegExp, '').replace(jsRequireRegExp, function(match, dep) {
					deps.push(dep);
				});
				return tool.unique(deps);
			},
			fixNameSpace: function(id, deps) {
				var ns = tool.findPathNameSpace(id);
				return tool.map(deps, function(dep) {
					var depNamespace = tool.getNameSpace(dep);
					if (ns != depNamespace && depNamespace == '_main') return ns + ':' + dep;
					return dep;
				});
			},
			findPathNameSpace: function(path) {
				for (var ns in NAMESPACE) {
					if (new RegExp('^' + NAMESPACE[ns].basepath).test(path)) return ns;
				}
				return '_main';
			},
			getPureDependencies: function(mod) {
				var id = mod.id;
				//增加命名空间
				mod.dependencies = tool.fixNameSpace(id, mod.dependencies);
				//console.log(id,mod.dependencies);
				var deps = tool.filter(mod.dependencies, function(dep) {
					circularStack.push(id);
					var isCircular = tool.isCircularWaiting(module.cache[dep]);
					if (isCircular) {
						//the circular is ready
						circularStack.push(id);
					}
					circularStack.pop();
					return ! isCircular;
				});
				return tool.createUrl(deps);
			},
			isCircularWaiting: function(mod) {
				if (!mod || mod.status !== module.status.save) return false;
				circularStack.push(mod.uri);
				var deps = mod.dependencies;
				if (deps.length) {
					if (tool.isOverlap(deps, circularStack)) return true;
					for (var i = 0; i < deps.length; i++) {
						if (tool.isCircularWaiting(module.cache[deps[i]])) return true;
					}
				}
				circularStack.pop();
				return false;
			},
			isOverlap: function(arrA, arrB) {
				var arrC = arrA.concat(arrB);
				return arrC.length > tool.unique(arrC).length;
			},
			runModuleContext: function(fn, mod) {
				var ret;
				try {
					ret = fn(mod.require, mod.exports, mod);
				} catch(e) {
					throw mod.id + ':' + e;
				}
				if (ret !== undef) mod.exports = ret;
			},
			dirname: function(path) {
				var s = path.match(/[^?]*(?=\/.*$)/);
				return (s ? s[0] : '.') + '/';
			},
			realpath: function(path) {
				var multiple_slash_re = /([^:\/])\/\/+/g;
				multiple_slash_re.lastIndex = 0;
				if (multiple_slash_re.test(path)) {
					path = path.replace(multiple_slash_re, '$1\/');
				}
				if (path.indexOf('.') === - 1) {
					return path;
				}
				var original = path.split('/'),
				ret = [],
				part;
				for (var i = 0; i < original.length; i++) {
					part = original[i];
					if (part === '..') {
						if (ret.length === 0) {
							throw new Error('The path is invalid: ' + path);
						}
						ret.pop();
					}
					else if (part !== '.') {
						ret.push(part);
					}
				}
				return ret.join('/');
			},
			normalize: function(url) {
				url = tool.realpath(url);
				var lastChar = url.charAt(url.length - 1);
				if (lastChar === '/') {
					return url;
				}
				if (lastChar === '#') {
					url = url.slice(0, - 1);
				}
				else if (url.indexOf('?') === - 1 && ! (/\.(?:js)$/).test(url)) {
					url += '.js';
				}
				if (url.indexOf(':80/') > 0) {
					url = url.replace(':80/', '/');
				}
				return url;
			},
			resolve: function(id, path) {
				var ret = '';
				if (!id) {
					return ret;
					//isRelativePath
				} else if (id.indexOf('./') === 0 || id.indexOf('../') === 0) {
					if (id.indexOf('./') === 0) {
						id = id.substring(2);
					}
					ret = tool.dirname(path) + id;
				} else if (id.charAt(0) === '/' && id.charAt(1) !== '/') {
					ret = tool.dirname(path) + id.substring(1);
				} else {
					ret = tool.dirname(path) + '/' + id;
				}
				return tool.normalize(ret);
			},
			isAbsolute: function(id) {
				return id.indexOf('://') > 0 || id.indexOf('//') === 0;
			},
			filename: function(path) {
				return path.slice(path.lastIndexOf('/') + 1).replace(/\?.*$/, '');
			},
			getNameSpace: function(id) {
				if (tool.isAbsolute(id)) return '_main';
				else {
					var ns = id.split(':');
					if (ns[1]) return ns[0];
					return '_main';
				}
			},
			replaceDir: function(id, directorys) {
				//只替换一次,且如果路径包含2个dir，也只替换一次,并且只匹配第一个，之后的不匹配
				// UI:../ -> UI/test = ../test
				// UI:../ -> UI/UI/test = ../UI/test
				// UI:../ -> ../a/UI/test = ../a/UI/test [不会替换]
				// UI:../ -> a/UI/test = a/UI/test [不会替换]
				var locks = {};
				for (var k = 0; k < directorys.length; k++) {
					var dir = directorys[k];
					for (var j in dir) {
						var path = dir[j],
						reg = new RegExp("^" + j + "\/");
						if (reg.test(id) && ! locks[id]) {
							id = id.replace(reg, path);
							locks[id] = true;
							break;
						}
					}
					if (locks[id]) break;
				}

				if (tool.isAbsolute(id)) id = tool.normalize(id);
				return id;
			},
			isDir: function(path) {
				return path.lastIndexOf('/') === path.length - 1;
			},
			getAliasDir: function(alias) {
				var dirs = [];
				for (var i in alias) {
					if (tool.isDir(alias[i])) {
						var dir = {};
						dir[i] = alias[i];
						dirs.push(dir);
					}
				}
				return dirs;
			},
			createUrl: function(ids) {
				return tool.map(ids, function(id) {
					//处理namespace
					var namespace = tool.getNameSpace(id);
					if (namespace !== '_main') {
						id = id.split(':')[1];
					}
					//说明此文件为config文件
					if (NAMESPACE.hasOwnProperty(id)) {
						namespace = id;
					}
					var ns = NAMESPACE[namespace];
					if (ns) {
						//alias
						var directorys = tool.getAliasDir(ns.alias);
						if (ns.alias) {
							var aliasPath = ns.alias[id];
							if (aliasPath && ! tool.isDir(aliasPath)) {
								id = aliasPath;
							} else if (directorys.length) {
								id = tool.replaceDir(id, directorys);
							}
						}
						//isAbsolute
						if (!tool.isAbsolute(id)) {
							id = tool.resolve(id, ns.basepath);
						}
						if (ns.timestamp) id = id + '?' + ns.timestamp;
						return id;
					} else {
						throw new Error('the namespace ' + namespace + ' is not found!');
					}
				});
			},
			buildNameSpace: function(cg, cb) {
				tool.addConfigs(cg, function(configs) {
					tool.forEach(configs, function(config) {
						var ns = NAMESPACE[config.name];
						ns.alias = config.alias;
						ns.timestamp = config.timestamp;
					});
					if (cb) cb();
				});
			},
			_hasClear: function(stack, ns) {
				delete stack[ns];
				if (tool.keys(stack).length) return false;
				return true;
			},
			addConfigs: function(cg, cb, len) {
				var oldlen = len || tool.keys(NAMESPACE).length;
				if (tool.keys(NAMESPACE).length === 1) {
					cg.name = '_main';
					cb([cg]);
					return;
				}
				for (var ns in NAMESPACE) {
					var config = NAMESPACE[ns]['config'];
					if (ns === '_main') continue;
					if (stack[ns]) continue;
					(function(config, ns) {
						stack[ns] = true;
						module.use(ns + ':' + config, function(cg) {
							cg.name = ns;
							_cgs.push(cg);
							tool.addNameSpace(cg);
							var newlen = tool.keys(NAMESPACE).length;
							if (newlen > oldlen) tool.addConfigs(cg, cb, newlen);
							var over = tool._hasClear(stack, ns);
							if (over) cb(_cgs);
						});
					})(config, ns);
				}
			},
			addNameSpace: function(cg) {
				if (cg.hasOwnProperty('namespace')) {
					for (var i in cg.namespace) {
						var ns = cg.namespace[i];
						NAMESPACE[i] = {
							basepath: ns.basepath,
							config: ns.config
						};
					}
				}
			},
			getCurrentScript: function() {
				if (currentlyAddingScript) {
					return currentlyAddingScript;
				}
				// For IE6-9 browsers, the script onload event may not fire right
				// after the the script is evaluated. Kris Zyp found that it
				// could query the script nodes and the one that is in "interactive"
				// mode indicates the current script
				// ref: http://goo.gl/JHfFW
				if (interactiveScript && interactiveScript.readyState === "interactive") {
					return interactiveScript;
				}

				var scripts = header.getElementsByTagName("script");

				for (var i = scripts.length - 1; i >= 0; i--) {
					var script = scripts[i];
					if (script.readyState === "interactive") {
						interactiveScript = script;
						return interactiveScript;
					}
				}
				return interactiveScript;

			},
			pathToid: function(path, name) {
				var ns = tool.findPathNameSpace(path);
				name = name || tool.filename(path);
				var url = ns === '_main' ? name: ns + ':' + name;
				return tool.createUrl([url])[0];
			},
			_save: function(url) {
				if (anonymouse.length) {
					tool.forEach(anonymouse, function(meta) {
						meta.id = tool.pathToid(url, meta.id);
						module._save(meta.id, meta);
					});
				}
			}
		});

		function module(id) {
			this.id = id;
			this.status = 0;
			this.dependencies = [];
			this.exports = null;
			this.parent = [];
			this.factory = noop;
		}

		extend(module, {
			cache: {},
			status: {
				'created': 0,
				'save': 1,
				'ready': 2,
				'compiling': 3,
				'compiled': 4
			},
			_get: function(url) {
				return module.cache[url] || (module.cache[url] = new module(url));
			},
			_save: function(url, meta) {
				var mod = this._get(url);
				if (mod.status < module.status.save) {
					mod.id = url || meta.id;
					mod.dependencies = meta.deps;
					mod.factory = meta.factory;
					mod.status = module.status.save;
				}
			},
			define: function(id, factory) {
				if (!tool.isString(id) || ! tool.isFunction(factory)) {
					throw 'define failed';
				}
				var deps = tool.getDependencies(factory.toString());
				var meta = {
					deps: deps,
					factory: factory
				};
				if (tool.isAbsolute(id)) meta.id = id;
				if (!meta.id && doc.attachEvent) {
					var script = tool.getCurrentScript();
					if (script) {
						meta.id = tool.pathToid(script.src);
					} else {
						throw new Error('failed to derive:" ' + factory);
					}
				}
				if (meta.id) {
					module._save(meta.id, meta);
				} else {
					meta.id = id;
					anonymouse.push(meta);
				}
			},
			_createUrls: function(ids) {
				tool.isString(ids) && (ids = [ids]);
				var urls = tool.createUrl(ids);
				return urls;
			},
			use: function(ids, cb) {
				var urls = module._createUrls(ids);
				module._fetch(urls, function() {
					var args = tool.map(urls, function(url) {
						return url ? module.cache[url]._compile() : null;
					});
					if (tool.isFunction(cb)) cb.apply(null, args);
				});
			},
			_preload: function(id, cb) {
				var url = module._createUrls(id)[0];
				tool._fetch(url, function() {
					var len = anonymouse.length;
					if (len) {
						if (len > 1) {
							tool._save(url);
						} else {
							module._save(url, anonymouse[0]);
						}
						anonymouse = [];
					}
					cb();
				});
			},
			_fetch: function(urls, cb) {
				var STATUS = module.status,
				loadUris = tool.filter(urls, function(url) {
					return url && (!module.cache[url] || module.cache[url].status < STATUS.ready);
				}),
				restart = function(mod) { (mod || {}).status < STATUS.ready && (mod.status = STATUS.ready); --queue;
					(queue === 0) && cb();
				},
				len = loadUris.length;
				if (len === 0) {
					cb();
					return;
				}
				var queue = len;
				for (var i = 0; i < len; i++) { (function(url) {
						//此处远程模块名和本地cache模块名不匹配，需要处理
						var mod = module._get(url);
						mod.status < module.status.save ? tool._fetch(url, success) : success();
						function success() {
							//before success the define method all ready changed mod and created new dependencies
							//如果define初始化不成功，这里根据顺序，修改为成功的mod
							var len = anonymouse.length;
							if (len) {
								if (len > 1) {
									tool._save(url);
								} else {
									module._save(url, anonymouse[0]);
								}
								anonymouse = [];
							}
							mod = module._get(url);
							if (mod.status >= STATUS.save) {
								var deps = tool.getPureDependencies(mod);
								if (deps.length) {
									module._fetch(deps, function() {
										restart(mod);
									});
								} else {
									restart(mod);
								}
							} else {
								//404 or no module
								restart();
							}
						}
					})(loadUris[i]);
				}
			}
		});

		extend(module.prototype, {
			_compile: function() {
				var mod = this,
				STATUS = module.status;
				if (mod.status === STATUS.compiled) return mod.exports;
				if (mod.status < STATUS.save) return null;
				mod.status = STATUS.compiling;
				function require(id) {
					//需要处理一下，根据mod增加namespace
					for (var i in mod.dependencies) {
						var dep = mod.dependencies[i],
						ns = tool.getNameSpace(dep);
						if (ns != '_main' && id == dep.split(':')[1]) id = ns + ':' + id;
					}
					id = tool.createUrl([id]);
					var child = module.cache[id];
					if (!child) return null;
					if (child.status === STATUS.compiled) return child.exports;
					child.parent = mod;
					return child._compile();
				}
				require.cache = module.cache;
				mod.require = require;
				mod.exports = {};
				var fun = mod.factory;
				if (tool.isFunction(fun)) {
					tool.runModuleContext(fun, mod);
				}
				mod.status = STATUS.compiled;
				return mod.exports;
			}
		});

		//browser api
		global.define = module.define;

		NAMESPACE['_main'] = {
			basepath: tool.dirname(BASEPATH),
			config: CONFIG
		};

		global.lithe = extend({
			use: module.use,
			cache: module.cache,
			NAMESPACE: NAMESPACE,
			_start: function(mainjs, callback) {
				module.use(CONFIG, function(cg) {
					tool.addNameSpace(cg);
					tool.buildNameSpace(cg, function() {
						var _main = NAMESPACE['_main'];
						_main.alias = cg.alias;
						_main.timestamp = cg.timestamp;
						if (cg.basepath) _main.basepath = cg.basepath;
						if (DEBUG && tool.isFunction(cg.debugswitch)) mainjs = cg.debugswitch(mainjs) || mainjs;
						module.use(mainjs, callback);
					});
				});
			},
			start: function(mainjs, callback) {
				//use by prev config loaded
				if (CONFIG) {
					if (DEBUG) {
						lithe._start(mainjs, callback);
					} else {
						module._preload(mainjs, function() {
							lithe._start(mainjs, callback);
						});
					}
				} else {
					module.use(mainjs, callback);
				}
			}
		});

		if (mainjs) global.lithe.start(mainjs);
	} else {
		//node api 
		exports.tool = require('./lib/lithe-tool.js');
		exports.hfs = require('./lib/lithe-hfs.js');
	}
})(this);

define('platform',function(){
	if(!Object.create){
		Object.create = function(o){
			if(arguments.length > 1){
				throw new Error('Only accepts the first parameter.');
			}
			function F(){};
			F.prototype = o;
			return new F();
		};
	}
	if(!Object.keys){
		Object.keys = (function(){
			var ownProp = Object.prototype.hasOwnProperty,
				hasDontEnumBug = !({toString:null}).propertyIsEnumerable('toString'),
				dontEnums = [
					'toString',
					'toLocalString',
					'valueOf',
					'hasOwnProperty',
					'isPrototypeOf',
					'propertyIsEnumerable',
					'constructor'
				],
				dontEnumsLength = dontEnums.length;

			return function(obj){
				if(typeof obj !== 'object' && typeof obj !== 'function' || obj == null){
					throw new TypeError('non-object');	
				}

				var result = [];

				for(var prop in obj){
					if(ownProp.call(obj,prop)){
						result.push(prop);
					}
				}

				if(hasDontEnumBug){
					for(var i=0;i<dontEnumsLength;i++){
						if(ownProp.call(obj,dontEnums[i])){
							result.push(dontEnums[i]);
						}
					}
				}
				return result;
			};
		})();
	}
});
(function(){

if(window.sjs){
	define('sjs',function(require,exports,module){
		module.exports = window.sjs;
	});
}

define('base',function(require,exports,module){
	require('platform');
	var $ = require('sjs'),
		base = {},
		toString = {}.toString,
		hasOwn = {}.hasOwnProperty,
		slice = [].slice,
		funcProp = Function.prototype;
	
	base.$ = $;

	base.util = {
		/**
		将新的上下文关系绑定到指定方法
		@method bind
		@param {function} method 要绑定上下文的方法
		@param {object} context 上下文
		*/
		bind:function(method,context){
			if(method.bind === funcProp.bind && funcProp.bind){
				return funcProp.bind.apply(method,slice.call(arguments,1));
			}
			var args = slice.call(arguments,2);
			return function(){
				return method.apply(context,args.concat(slice.call(arguments)));
			}
		},
		/**
		获取唯一的key
		@method getUniqueKey
		@param {string} name key的名字
		@return {string} 唯一key的字符串
		*/
		getUniqueKey:function(name){
			var key = +new Date() + '-' + Math.floor(Math.random() * (99999 - 1 + 1));
			return ((name) ? name+'-' : '') + key;
		},
		/**
		判断两个值是否相等
		@method isEqual
		@param {anything} a 要判断的第一个值
		@param {anything} b 要判断的第二个值
		@return {bollean} true/false
		*/
		isEqual:function(a,b,aStack,bStack){
			var aStack = aStack || [],
				bStack = bStack || [];

			if(a === b){return a !== 0 || 1 / a === 1 / b;}
			if(a == null || b == null){return a === b;}
			var className = toString.call(a);
			if(className != toString.call(b)){return false;}
			switch(className){
				case '[object string]':
					return a == String(b);
				case '[object Number]':
					return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
				case '[object Date]':
				case '[object Boolean]':
					return +a == +b;
				case '[object RegExp]':
					return a.source == b.source &&
						a.global == b.global &&
						a.multiline == b.multiline &&
						a.ignoreCase == b.ignoreCase;
			}
			if(typeof a != 'object' || typeof b != 'object'){return false;}
			var length = aStack.length;
			while(length--){
				if(aStack[length] == a){return bStack[length] == b;}
			}
			aStack.push(a);
			bStack.push(b);
			var size = 0,result = true;
			if(className == '[object Array]'){
				size = a.length;
				result = size == b.length;
				if(result){
					while(size--){
						if(!(result = this.isEqual(a[size],b[size],aStack,bStack))){break;}
					}
				}
			}else{
				var aCtor = a.constructor,bCtor = b.constructor;
				if(aCtor !== bCtor && !($.isFunction(aCtor) && (aCtor instanceof aCtor) && $.isFunction(bCtor) && (bCtor instanceof bCtor))){
					return false;
				}
				for(var key in a){
					if(hasOwn.call(a,key)){
						size++;
						if(!(result = hasOwn.call(b,key) && this.isEqual(a[key],b[key],aStack,bStack))){break;}
					}
				}
				if(result){
					for(key in b){
						if(hasOwn.call(b,key) && !(size--)){break;}
					}
					result = !size;
				}
			}
			aStack.pop();
			bStack.pop();
			return result;
		},
		/**
		对象继承方法
		@method extend
		@param {object} protoProps 要添加到prototype上的对象
		@param {object} staticProps 要添加到function上的对象
		@return {object} 含有继承方法的新对象
		*/
		extend:function(protoProps,staticProps){
			var parent = this,
				child;

			if(protoProps && hasOwn.call(protoProps,'constructor')){
				child = protoProps.constructor;
			}else{
				child = function(){return parent.apply(this,arguments)}
			}
			$.extend(child,parent,staticProps);

			var Surrogate = function(){this.constructor = child}
			Surrogate.prototype = parent.prototype;
			child.prototype = new Surrogate;

			if(protoProps){
				$.extend(child.prototype,protoProps);
			}
			child.__super__ = parent.prototype;
			return child;
		}
	}
	
	//return base;
	module.exports = base;
});

})();
define('logger',function(require,exports,module){
	var noop = function(){},
		console = window.console || {};

	var Logger = function(name){
		this.name = name;
		this._log = noop;
		this._warn = noop;
		this._error = noop;
		return this;
	};

	Logger.prototype = {
		setName:function(name){
			this.name = name;
		},
		enable:function(){
			this._log = (console.log || noop);
			this._warn = (console.warn || this._log);
			this._error = (console.error || this._log);
			return this;
		},
		write:function(output,args){
			var params = [].slice.call(args);
			params.unshift(this.name + ':');
			try{
				output.apply(console,params);
			}catch(e){
				output(params);
			}
		},
		log:function(){
			this.write(this._log,arguments);
		},
		warn:function(){
			this.write(this._warn,arguments);
		},
		error:function(){
			this.write(this._error,arguments);
		}
	}

	module.exports = Logger;
});
define('mediator',function(require,exports,module){
	module.exports = function(sjsapp,channel){
		//var _events = {};

		var triggerEvents = function(events,args){
			var ev,
				i = -1,
				l = events.length;
			while(++i < l){
				(ev = events[i]).callback.fireWith(ev.ctx,args);
			}
		};
		
		return {
		/**
		事件订阅方法
		@method subscribe
		@param {string} name 订阅事件名称
		@param {function} callback 订阅事件方法
		@param {object} context 上下文
		@param {boolean} once 内部参数，供once方法使用
		*/
		on:function(name,callback,context,once){
			var cb = sjsapp.core.$.Callbacks(once ? 'once' : '');
			//var channel = _events[this.channelName] || (_events[this.channelName] = {});
			var chnl = channel || (this._events || (this._events = {}));
			var events = chnl[name] || (chnl[name] = []);
			cb.add(callback);
			events.push({callback:cb,context:context,ctx:context || this});
		},
		/**
		只执行一次的事件订阅方法
		@method once
		@param {string} name 订阅事件名称
		@param {function} callback 订阅事件方法
		@param {object} context 上下文
		*/
		once:function(name,callback,context){
			this.on(name,callback,context,true);
		},
		/**
		对某对象事件进行监听并触发自身事件
		@method listenTo
		@param {object} obj 要监听的对象
		@param {string} name 要监听的事件名称
		@param {function} callback 回调
		*/
		listenTo:function(obj,name,callback,once,unique){
			if(typeof name === 'object'){
				callback = this;
			}
			obj['on'](name,callback,this,once,unique);
		},
		/**
		发布已经订阅的事件
		@method publish
		@param {string} name 订阅事件的名称
		*/
		trigger:function(name){
			var args = [].slice.call(arguments,1);
			var chnl = channel || this._events;
			if(!chnl){return;}
			var events = chnl[name];
			if(events){
				triggerEvents(events,args);
			}
			var allEvents = chnl.all;
			if(allEvents){
				triggerEvents(allEvents,arguments);
			}
		},
		/**
		删除已经订阅的事件
		@method unsubscribe
		@param {string} name 订阅事件的名称
		@param {function} callback 订阅事件的方法
		@param {object} context 上下文
		*/
		off:function(name,callback,context){
			var retain,
				events,
				ev,
				chnl;
			if(!name && !callback && !context){
				chnl = channel || this._events;
				chnl[name] = {};
				return this;
			}
			chnl = channel || this._events;
			if(!chnl){return;}
			var names = name ? [name] : Object.keys(chnl);
			for(var i=0;i<names.length;i++){
				name = names[i];
				if(events = chnl[name]){
					chnl[name] = retain = [];
					if(callback || context){
						for(var j=0;j<events.length;j++){
							ev = events[j];
							if((callback && !ev.callback.has(callback)) || (context && context !== ev.context)){
								retain.push(ev);
							}
						}
					}
					if(!retain.length){
						delete chnl[name];
					}
				}
			}
		}
	}
	return Mediator;
	}
})
define('extensions',function(require,exports,module){
	var base = require('base'),
		Logger = require('logger'),
		deferred = base.$.Deferred,
		when = base.$.when,
		logger = new Logger('Extension').enable();
	
	var requireExtension = function(ext,context){
		var dfd = deferred();

		var resolve = function(ext){
			dfd.resolve(ext);
		};

		if(typeof ext === 'string'){
			lithe.use('extensions/'+ext,resolve);
		}else{
			resolve(ext);
		}

		return dfd.promise();
	};

	var initExtension = function(extDef){
		var dfd = deferred(),
			ref = extDef.ref,
			context = extDef.context;

		var req = requireExtension(ref,context);
		req.done(function(ext){
			if(!ext){return dfd.resolve();}
			try{
				var _fn = ext(context.core,context.extensions._extensionsMap);
			}catch(e){
				logger.error(e);
			}
			var init = when(_fn);
			init.done(function(ext){dfd.resolve({ext:ext,ref:ref});});
		});

		return dfd.promise();
	};
	//扩展方法构造函数
	var Extensions = function(){
		this._extensions = [];
		this._extensionsMap = {};
		this.initStatus = deferred();
	};

	Extensions.prototype = {
		add:function(ext){
			if(this._extensionsMap[ext.ref]){
				this.logger.error(ext.ref + ' was already registered.');
			}

			if(this.initStarted){
				this.logger.error('Init extensions already called.');
			}
			this._extensions.push(ext);
		},
		onReady:function(fn){
			this.initStatus.then(fn);
		},
		onFail:function(fn){
			this.initStatus.fail(fn);
		},
		init:function(){
			if(this.initStarted){
				return;
			}
			this.initStarted = true;

			var extensions = this._extensions,
				inited = [],
				initStatus = this.initStatus;

			(function _init(extDef){
				if(extDef){
					logger.log('Start loading extension '+extDef.ref);
					var ext = initExtension(extDef);
					inited.push(ext);
					ext.done(function(ext){_init(extensions.shift());});
					ext.fail(function(err){initStatus.reject(err);});
				}else if(extensions.length === 0){
					when.apply(undefined,inited)
					.done(function(){
						initStatus.resolve([].slice.call(arguments));
					})
				}
			})(extensions.shift());

			return initStatus.promise();
		}
	};

	//return Extensions;
	module.exports = Extensions;
});
define('sandbox',function(require,exports,module){
	//Sandbox构造函数
	var Sandbox = function(sjsapp,moduleId,opts){
		this.sjsapp = sjsapp;
		this.core = sjsapp.core;
		this.moduleId = moduleId;
		this.opts = opts || {};
	};
	module.exports = Sandbox;
});
define('sjsapp',function(require,exports,module){
	var Base = require('base'),
		Logger = require('logger'),
		Sandbox = require('sandbox'),
		Mediator = require('mediator'),
		Extensions = require('extensions'),
		channel = {},
		exts = [
			'mvc/model',
			'mvc/collection',
			'mvc/view',
			'template',
			'cookie'
		];

	var Core = function(opts){
		if(!(this instanceof Core)){
			return new Core(opts);
		}

		this.ref = Base.util.getUniqueKey('sjsapp');
		this.opts = opts || {};
		this.core = Object.create(Base);
		this.moduleData = {};
		this.extensions = new Extensions();
		//this.mediator = Mediator(this,channel);
		this.logger = new Logger(this.ref);
		this.started = false;
		this.beforeLoad = opts.beforeLoad || function(){return true;};

		for(var i=0,len=exts.length;i<len;i++){
			this.use(exts[i],true);
		}

		if(opts.extensions && opts.extensions.length){
			for(var i=0,len=opts.extensions.length;i<len;i++){
				this.use(opts.extensions[i]);
			}
		}

		if(opts.debug){
			this.logger.enable();
		}
		
	//	opts.modulesSources = opts.modulesSources || {'default':'modules'};

		return this;
	};
	Core.prototype = {
		/**
		载入一个扩展
		@method use
		@param {string} ref 扩展名称
		@param {boolean} internal 该扩展是否为内部默认加载扩展
		*/
		use:function(ref,internal){
			internal = internal || false;
			this.extensions.add({ref:ref,context:this,internal:internal});
		},
		/**
		注册一个模块
		@method register
		@param {string} 模块名称
		@param {function} 模块方法
		@param {object} 模块传入参数
		*/
		register:function(moduleId,creator,opts){
			opts = opts || {};
			try{
				if(typeof moduleId !== 'string'){
					this.logger.error('Module id must be a string');
					return;
				}
				if(typeof creator !== 'function'){
					this.logger.error('Creator must be a constructor function');
					return;
				}
				if(this.moduleData[moduleId] != null){
					this.logger.error(moduleId + ' was already registed');
					return;
				}
				this.moduleData[moduleId] = {
					creator:creator,
					opts:opts
				};
				return true;
			}catch(e){
				this.logger.error('Could not register '+moduleId+':',e);
			}
		},
		/**
		删除已经注册的模块
		@method register
		@param {string} moduleId 模块名称 
		*/
		unregister:function(moduleId){
			if(this.moduleData[moduleId] != null){
				delete this.moduleData[moduleId];
			}
		},
		/**
		停止模块
		@method stop
		@param {string} moduleId 模块名称
		*/
		stop:function(moduleId){
			var module = this.moduleData[moduleId];
			if(module.instance){
				//调用模块的destroy方法，销毁注册的事件
				if(this.core.$.isFunction(module.instance.destroy)){
					module.instance.destroy();
				}
				module.instance.started = false;
				module.instance = null;
				return true;
			}
		},
		/**
		停止所有模块
		@method stopAll
		*/
		stopAll:function(){
			for(var moduleId in this.moduleData){
				if(this.moduleData.hasOwnProperty(moduleId)){
					this.stop(moduleId);
				}
			}
		},
		/**
		重启模块
		@method restart
		@param {string} moduleId 模块名称
		*/
		restart:function(moduleId){
			if(this.stop(moduleId)){
				this.start(moduleId);
			}
		},
		/**
		解析模块参数
		@method _parseOpts
		@param {Element} 模块所在的dom元素
		@return {object} 参数对象
		*/
		_parseOpts:function(el){
			var opts = {el:el},
				data = this.core.$(el).data(),
				moduleId;

			this.core.$.each(data,function(k,v){
				if(k !== 'module'){
					opts[k] = v;
				}else{
					moduleId = v;
				}
			});

			opts.moduleId = moduleId;
			return opts;
		},
		/**
		创建一个模块实例
		@method _createInstance
		@param {string} moduleId 模块名称
		@param {object} opts 模块参数
		@param {function} 模块实例
		*/
		_createInstance:function(moduleId,opts){
			var module = this.moduleData[moduleId];
			if(module.instance != null){
				return module.instance;
			}
			//创建Sandbox
			//Sandbox.prototype = this.mediator;
			this.core.$.extend(Sandbox.prototype,Mediator(this,channel));
			var sandbox = new Sandbox(this,moduleId,opts);
			//this.mediator.installTo(sandbox);
			//创建模块实例
			var instance = new module.creator(sandbox);
			for(var name in instance){
				var method = instance[name];
				if(typeof instance[name] === 'function'){
					instance[name] = function(name,method){
						return function(){
							return method.apply(this,arguments);
						}
					}(name,method);
				}
			}
			return instance;
		},
		/**
		开始载入并初始化模块
		@method start
		@param {string} moduleId 模块名称
		@param {object} opts 模块参数
		*/
		start:function(moduleId,opts){
			try{
				this.logger.log('Starting App...');
				opts = opts || {};
				var list = [],
					that = this,
					modules = [];
				if(typeof moduleId === 'string'){
					opts.el = document.getElementById(moduleId);
					list.push({moduleId:moduleId,opts:opts});
				}else{
					list = moduleId;
				}
				this.extensions.onReady(function(exts){
					//开始装载extensions,把所有的扩展添加到sandbox
					if(!that.started){
					for(var i=0;i<exts.length;i++){
						var ref = exts[i].ref,
							ext = exts[i].ext,
							namespaces = ref.split('/'),
							tmpObj = {};
						(function _mkext(ns,sb,extMap,ext){
							if(ns && namespaces.length !== 0){
								if(!sb[ns]){
									//sandbox扩展
									sb[ns] = {};
									//扩展列表
									extMap[ns] = {};
								}
								_mkext(namespaces.shift(),sb[ns],extMap[ns],ext)
							}else{
								if(!that.core.$.isPlainObject(ext)){
									that.core.$.extend(ext.prototype,Mediator(that));
								}
								sb[ns] = ext;
								extMap[ns] = ext;
							}
						})(namespaces.shift(),Sandbox.prototype,that.extensions._extensionsMap,ext);
						that.logger.log('Extension '+ref+' loaded ok.');
					}
					that.logger.log('All extensions loaded ok.');
					}
					
					var sb = new Sandbox(that,'sjsapp');
					if(that.beforeLoad && !that.beforeLoad(sb)){
						return;
					}

					//开始装载模块
					that.core.$.each(list,function(i,module){
					//读取模块
						modules.push(that._load(module.moduleId,module.opts));
					});
					//所有模块载入完成后运行每个模块的afterLoaded方法
					that.core.$.when.apply(undefined,modules).then(function(){
						var args = [].slice.call(arguments);
						for(var i=0,len=args.length;i<len;i++){
							if(typeof args[i].afterLoaded === 'function'){
								args[i].afterLoaded.call(args[i]);
							}
						}
						//执行ready方法
						if(!that.started){
							if(that.opts.ready && typeof that.opts.ready === 'function'){
								that.opts.ready.call(that,sb);
							}
						}

						that.started = true;
					});
				});
				this.extensions.init();
			}catch(e){
				this.logger.error(moduleId + ' inited error:',e);
			}
		},
		/**
		开始执行所有模块
		@method startAll
		*/
		startAll:function(){
			var list = [];
			var that = this;
			var selector = '[data-module]';
			this.core.$('body').find(selector).each(function(){
				//获取模块参数
				var opts = that._parseOpts(this);
				list.push({moduleId:opts.moduleId,opts:opts});
			});
			this.start(list);
		},
		/**
		读取模块
		@method _load
		@param {string} moduleId 模块名称 
		@param {object} opts 模块参数
		@return {object} deferred.promise对象
		*/
		_load:function(moduleId,opts){
			this.logger.log('Starting load module:'+moduleId);
			var dfd = this.core.$.Deferred();
			var that = this;
			//设置模块所在目录
			//require.config('modules',this.opts.modulesSources['default']);
			//var file = '../modules/'+this.opts.pageName + '/' + moduleId;
			lithe.use('modules/' + this.opts.pageName+'/' + moduleId,function(moduleDef){
				//注册模块
				that.register(moduleId,moduleDef,opts);

				var start = that.core.$.now();
				//创建模块实例
				var instance = that._createInstance(moduleId,opts);
				if(instance.started){
					that.logger.error('Module '+moduleId+' was already started');
				}
				if(typeof instance.init === 'function'){
					//调用模块初始化方法
					instance.init(opts);
				}
				instance.started = true;
				that.moduleData[moduleId].instance = instance;
				that.logger.log(moduleId + ' init finished,cost:',that.core.$.now() - start,'ms');

				var inited = that.core.$.when(instance);
				inited.done(function(ret){dfd.resolve(ret);});
				//return inited;
			});
			return dfd.promise();
		}
	}
	module.exports = Core;
});
define('extensions/mvc/sync',function(require,exports,module){
	module.exports = function(core){
		var methodMap = {
			'create':'POST',
			'update':'PUT',
			'patch':'PATCH',
			'delete':'DELETE',
			'read':'GET'
			},
			emulateHTTP = false,
			emulateJSON = false,
			sync = function(method,model,opts){
				var type = methodMap[method],
					opts = opts || {},
					params = {type:type,dataType:'json'};

				opts.emulateHTTP = opts.emulateHTTP || emulateHTTP;
				opts.emulateJSON = opts.emulateJSON || emulateJSON;
				//确定url存在
				if(!opts.url){
					if(!model.url){throw new Error('sync method need a url.');}
					params.url = model.url;
				}
				//确定需要发出的数据存在
				if(opts.data == null && model && (method === 'create' || method === 'update' || method === 'patch')){
					params.contentType = 'application/json';
					params.data = opts.attrs || model.toJSON();
				}
				//为低版本server,把request转换为html form表单来模拟JSON
				if(opts.emulateJSON){
					params.contentType = 'application/x-www-form-urlencoded';
					params.data = params.data ? {model:params.data} : {};
				}
				//为低版本server,使用一个_method的参数来模拟HTTP
				if(opts.emulateHTTP && (type === 'PUT' || type === 'DELETE' || type === 'PATCH')){
					params.type = 'POST';
					if(opts.emulateJSON){
						params.data._method = type;
					}
					var beforeSend = opts.beforeSend;
					opts.beforeSend = function(xhr){
						xhr.setRequestHeader('X-HTTP-Method-Override',type);
						if(beforeSend) return beforeSend.apply(this,arguments);
					}
				}
				if(params.type !== 'GET' && !opts.emulateJSON){
					params.processData = false;
				}
				var xhr = opts.xhr = core.$.ajax(core.$.extend(params,opts));
				model.publish('request',model,xhr,opts);
				return xhr;
			};

		return sync;
	}
});
define('extensions/mvc/model',function(require,exports,module){
	var Sync = require('extensions/mvc/sync');

	module.exports = function(core){
		var sync = Sync(core);
		/**
		mvc model层构造函数
		*/
		var model = function(attrs,opts){
			var defaults,
				attrs = attrs || {},
				opts = opts || {};

			this.mid = core.util.getUniqueKey('Model');
			this.attrs = {};
			if(this.defaults){
				for(var i in this.defaults){
					if(!attrs[i]){
						attrs[i] = this.defaults[i];
					}
				}
			}
			this.set(attrs,opts);
			this.changed = {};
			this.init.apply(this,arguments);
		};
		model.prototype = {
			changed:null,
			idAttribute:'id',
			init:function(){},
			set:function(key,value,opts){
				var attr,
					attrs,
					unset,
					changes,
					silent,
					changing,
					prev,
					current;

				if(key == null){return this;}

				//处理"key","value"和{key:value}的形式
				if(typeof key === 'object'){
					attrs = key;
					opts = value;
				}else{
					(attrs = {})[key] = value;
				}

				opts = opts || {};

				unset = opts.unset;
				silent = opts.silent;
				changes = [];
				changing = this._changing;
				this._changing = true;

				if(!changing){
					this._previousAttrs = core.$.extend({},this.attrs);
					this.changed = {};
				}
				current = this.attrs,
				prev = this._previousAttrs;
				//设置id
				if(this.idAttribute in attrs){
					this.id = attrs[this.idAttribute];
				}
				//遍历属性，查看那个是变更后的
				for(attr in attrs){
					value = attrs[attr];
					if(!core.util.isEqual(current[attr],value)){
						changes.push(attr);
					}
					if(!core.util.isEqual(prev[attr],value)){
						this.changed[attr] = value;
					}else{
						delete this.changed[attr];
					}
					unset ? delete current[attr] : current[attr] = value;
				}
				if(!silent){
					if(changes.length){
						this._pending = true;
						for(var i=0,len=changes.length;i<len;i++){
							this.publish('change:'+changes[i],this,current[changes[i]],opts);
						}
					}
				}
				if(changing){return this;}
				if(!silent){
					while(this._pending){
						this._pending = false;
						this.publish('change',this,opts);
					}
				}
				this._pending = false;
				this._changing = false;
				return this;
			},
			get:function(key){
				return this.attrs[key];
			},
			toJSON:function(){
				return core.$.extend({},this.attrs);
			},
			has:function(key){
				return this.get(key) != null;
			},
			unset:function(key,opts){
				return this.set(key,void 0,core.$.extend({},opts,{unset:true}));
			},
			clear:function(opts){
				var attrs = {};
				for(var key in this.attrs){
					attrs[key] = void 0;
				}
				return this.set(attrs,core.$.extend({},opts,{unset:true}));
			},
			hasChanged:function(key){
				if(key == null){
					return !!this.changed.length;
				}
				return {}.hasOwnProperty.call(this.changed,key);
			},
			previous:function(key){
				if(key == null || !this._previousAttrs){return null;}

				return this._previousAttrs[key];
			},
			previousAttrs:function(){
				return core.$.extend({},this._previousAttrs);
			},
			parse:function(resp,opts){
				return resp;
			},
			isNew:function(){
				return this.id == null;
			},
			fetch:function(opts){
				opts = opts || {};
				if(opts.parse === void 0){opts.parse = true;}
				var model = this;
				var success = opts.success;
				opts.success = function(resp){
					if(!model.set(model.parse(resp,opts),opts)){
						return false;
					}
					if(success){
						success(model,resp,opts);
					}
					model.publish('sync',model,resp,opts);
				};
				sync('read',this,opts);
			},
			save:function(key,val,opts){
				var attrs,
					method,
					xhr,
					attributes = this.attrs;

				if(key == null || typeof key === 'object'){
					attrs = key;
					opts = val;
				}else{
					(attrs = {})[key] = val;
				}

				opts = core.$.extend({validate:true},opts);

				if(attrs && !opts.wait){
					if(!this.set(attrs,opts)){return false;}
				}

				if(attrs && opts.wait){
					this.attrs = core.$.extend({},attributes,attrs);
				}

				if(opts.parse === void 0){opts.parse = true;}
				var model = this;
				var success = opts.success;
				opts.success = function(resp){
					model.attrs = attributes;
					var serverAttrs = model.parse(resp,opts);
					if(opts.wait){
						serverAttrs = core.$.extend(attrs || {},serverAttrs);
					}
					if(!core.$.isPlainObject(serverAttrs) && !model.set(serverAttrs,opts)){
						return false;
					}
					if(success){success(model,resp,opts);}
					model.publish('sync',model,resp,opts);
				};
				method = this.isNew() ? 'create' : (opts.patch ? 'patch' : 'update');
				if(method === 'patch'){opts.attrs = attrs;}
				xhr = sync(method,this,opts);

				if(attrs && opts.wait){this.attrs = attributes;}
				return xhr;
			},
			destroy:function(opts){
				this.publish('destroy',this,this.collection,opts);
			}
		};
		//添加extend方法
		model.extend = core.util.extend;

		return model;
	}
});
define('extensions/mvc/collection',function(require,exports,module){
	var Sync = require('extensions/mvc/sync');
	module.exports =  function(core,extMap){
		var sync = Sync(core),
			addOpts = {add:true,remove:false},
			setOpts = {add:true,remove:true,merge:true};

		var collection = function(models,opts){
			opts = opts || {};
			if(opts.model){this.model = opts.model;}
			this._reset();
			this.init(this,arguments);
			if(models){
				this.reset(models,core.$.extend({silent:true},opts));
			}
		};

		collection.prototype = {
			//这里的model需要初始化时手动传入
			model:null,
			init:function(){},
			add:function(models,opts){
				this.set(models,core.$.extend({merge:false},opts,addOpts));
			},
			set:function(models,opts){
				if(!opts.add && opts.remove){
					opts = core.$.extend({},opts,setOpts);
				}
				if(opts.parse){models = this.parse(models,opts);}
				if(!core.$.isArray(models)){models = models ? [models] : [];}
				var model,
					attrs,
					existing,
					sort,
					at = opts.at,
					toAdd = [],
					toRemove = [],
					modelMap = {},
					add = opts.add,
					remove = opts.remove,
					merge = opts.merge;
				
				for(var i=0,len=models.length;i<len;i++){
					if(!(model = this._prepareModel((attrs = models[i]),opts))){continue;}
					if(existing = this.get(model)){
						if(remove){modelMap[existing.mid] = true;}
						if(merge){
							attrs = attrs === model ? model.attrs : opts._attrs;
							existing.set(attrs,opts);
						}
					}else if(add){
						toAdd.push(model);
						model.subscribe('all',this._onModelEvent,this);
						this._byId[model.mid] = model;
						if(model.id != null){this._byId[model.id] = model;}
						delete opts._attrs;
					}
				}
				if(remove){
					for(var i=0,len=this.length;i<len;i++){
						if(!modelMap[(model = this.models[i]).mid]){
							toRemove.push(model);
						}
					}
					if(toRemove.length){
						this.remove(toRemove,opts);
					}
				}

				if(toAdd.length){
					this.length += toAdd.length;
					if(at != null){
						[].splice.apply(this.models,[at,0].concat(toAdd));
					}else{
						[].push.apply(this.models,toAdd);
					}
				}

				if(opts.silent){
					return;
				}

				for(var i=0,len=toAdd.length;i<len;i++){
					(model = toAdd[i]).publish('add',model,this,opts);
				}
			},
			remove:function(models,opts){
				models = core.$.isArray(models) ? models.slice() : [models];
				opts = opts || {};
				for(var i=0,len=models.length;i<len;i++){
					var model = this.get(models[i]);
					if(!model){continue;}
					delete this._byId[model.id];
					delete this._byId[model.mid];
					var index = core.$.inArray(model,this.models);
					this.models.splice(index,1);
					this.length--;
					if(!opts.silent){
						opts.index = index;
						model.publish('remove',model,this,opts);
					}
					this._removeReference(model);
				}
			},
			get:function(obj){
				if(obj == null){return void 0;}
				return this._byId[obj.id != null ? obj.id : obj.mid || obj];
			},
			at:function(index){
				return this.models[index];
			},
			reset:function(models,opts){
				opts = opts || {};
				for(var i=0,len=models.length;i<len;i++){
					this._removeReference(models[i]);
				}
				opts.previousModel = this.model;
				this._reset();
				this.add(models,core.$.extend({silent:true},opts));
				if(!opts.silent){
					this.publish('reset',this,opts);
				}
			},
			push:function(model,opts){
				model = this._prepareModel(model,opts);
				this.add(model,core.$.extend({at:this.length},opts));
			},
			pop:function(opts){
				var model = this.at(this.length - 1);
				this.remove(model,opts);
			},
			unshift:function(model,opts){
				model =  this._prepareModel(model,opts);
				this.add(model,core.$.extend({at:0},opts));
			},
			shift:function(opts){
				var model = this.at(0);
				this.remove(model,opts);
			},
			slice:function(){
				return [].slice.apply(this.models,arguments);
			},
			clone:function(){
				return new this.constructor(this.models);
			},
			parse:function(resp,opts){
				return resp;
			},
			pluck:function(attr){
				return core.$.map(this.models,function(value){
					return value['get'].call(value,attr);
				});
			},
			sortBy:function(value,context){
				var obj = this.models;
				var iterator = core.$.isFunction(value) ? value : function(obj){return obj[value];};
				var sortObj = core.$.map(obj,function(value,index){
					return {
						value:value,
						index:index,
						method:iterator.call(context,value,index)
					};
				}).sort(function(left,right){
					var a = left.method;
					var b = right.method;
					if(a !== b){
						if(a > b || a === void 0){return 1;}
						if(a < b || b === void 0){return -1;}
					}
					return left.index < right.index ? -1 : 1;
				});
				this.models = core.$.map(sortObj,function(obj){
					return obj['value'];
				});
			},
			_removeReference:function(model){
				if(this === model.collection){delete model.collection;}
				model.unsubscribe('all',this._onModelEvent,this);
			},
			_reset:function(){
				this.length = 0;
				this.models = [];
				this._byId = {};
			},
			_prepareModel:function(attrs,opts){
				if(attrs instanceof extMap.mvc.model){
					if(!attrs.collection){attrs.collection = this;}
					return attrs;
				}
				opts = opts || {};
				opts.collection = this;
				var model = new this.model(attrs,opts);
				return model;
			},
			_onModelEvent:function(event,model,collection,opts){
				if((event === 'add' || event === 'remove') && collection !== this){return;}
				if(event === 'destroy'){this.remove(model,opts);}
				if(model && event === 'change:'+model.idAttribute){
					delete this._byId[model.previous(model.idAttribute)];
					if(model.id != null){this._byId[model.id] = model;}
				}
				this.publish.apply(this,arguments);
			}
		};
		
		//添加继承方法
		collection.extend = core.util.extend;
		return collection;
	}
});
define('extensions/mvc/view',function(require,exports,module){
	module.exports = function(core){
			viewOpts = ['model', 'collection', 'el', 'id', 'attributes', 'className', 'tagName', 'events'];
		/**
		mvc view层构造函数
		*/
		var view = function(opts){
			this.vid = core.util.getUniqueKey('View');
			this.opts = opts;
			for(var i in opts){
				if(core.$.inArray(i,viewOpts) !== -1){
					this[i] = opts[i];
				}
			}
			this._ensureElement();
			this.init.apply(this,arguments);
			this.delegateEvents();
		};

		view.prototype = {
			/**
			当前view的标签名称
			@attribute {string} tagName
			*/
			tagName:'div',
			/**
			初始化方法,需要在实例中去实现
			@method init
			*/
			init:function(){},
			/**
			设置元素及自动事件代理
			@method setElement
			@param {Element} el view层默认根元素
			@param {Boolean} delegate 是否开启自动事件代理
			*/
			setElement:function(el,delegate){
				if(this.$el){this.undelegateEvents();}
				this.$el = el instanceof core.$ ? el : core.$(el);
				this.el = this.$el[0];
				if(delegate !== false){
					this.delegateEvents();
				}
			},
			/**
			绑定代理事件
			@method delegateEvents
			@param {object} 事件类型及绑定方法对象
			*/
			delegateEvents:function(events){
				var that = this;
				if(!(events || (events = this.events))){return;}
				this.undelegateEvents();
				for(var key in events){
					var method = events[key];
					if(!core.$.isFunction(method)){
						method = this[events[key]];
					}
					if(!method){continue;}

					var match = key.match(/^(\S+)\s*(.*)$/),
						eventName = match[1],
						selector = match[2],
						_fn = core.util.bind(method,that);
					
					eventName += '.delegateEvents' + this.vid;
					if(selector === ''){
						this.$el.on(eventName,_fn);
					}else{
						this.$el.on(eventName,selector,_fn);
					}
				}
			},
			/**
			删除事件代理绑定
			@method undelegateEvents
			*/
			undelegateEvents:function(){
				this.$el.off('.delegateEvents' + this.vid);
			},
			/**
			模板渲染方法，需要在view实例中实现
			@method render
			*/
			render:function(){},
			/**
			删除元素
			@method remove
			*/
			remove:function(){
				this.$el.remove();
			},
			/**
			初始化元素
			@method _ensureElement
			*/
			_ensureElement:function(){
				if(!this.el){
					var attrs = core.$.extend({},this.attributes);
					if(this.id){attrs.id = this.id;}
					if(this.className){attrs['class'] = this.className};
					var $el = core.$('<'+this.tagName+'>').attr(attrs);
					this.setElement($el,false);
				}else{
					this.setElement(this.el,false);
				}	
			}
		};
		//添加extend方法
		view.extend = core.util.extend;

		return view;
	}
});
define('extensions/template',function(require,exports,module){
	module.exports = function(core){
		var config = {
				evaluate:/\{\{([\s\S]+?\}?)\}\}/g,
				interpolate:/\{\{=([\s\S]+?)\}\}/g,
				encode:/\{\{!([\s\S]+?)\}\}/g,
				conditional:/\{\{\?(\?)?\s*([\s\S]*?)\s*\}\}/g,
				iterate:/\{\{~\s*(?:\}\}|([\s\S]+?)\s*\:\s*([\w$]+)\s*(?:\:\s*([\w$]+))?\s*\}\})/g,
				varname:'it',
				strip:true,
				append:true,
				selfcontained:false
			},
			template,
			compile,
			startend = {
				append:{
					start:'\'+(',
					end:')+\'',
					//endencode:'||\'\').toString().encodeHTML()+\''
					endencode:'||\'\').toString()+\''
				},
				split:{
					start:'\';out+=(',
					end:');out+=\'',
					//endencode:'||\'\'.toString().encodeHTML();out+=\''
					endencode:'||\'\'.toString();out+=\''
				}
			},
			skip = /$^/;

		return function(tmpl,def){
			var cse = config.append ? startend.append : startend.split,
				needhtmlencode,
				sid = 0,
				indv,
				str = tmpl;

			str = ('var out=\'' + (config.strip ? str.replace(/(^|\r|\n)\t* +| +\t*(\r|\n|$)/g,' ').replace(/\r|\n|\t|\/\*[\s\S]*?\*\//g,'') : str)
				.replace(/'|\\/g,'\\$&')
				//转换为赋值
				.replace(config.interpolate || skip,function(m,code){
					return cse.start + unescape(code) + cse.end;
				})
				//是否encode代码
				.replace(config.encode || skip,function(m,code){
					return cse.start + unescape(code) + cse.endencode;
				})
				//条件语句
				.replace(config.conditional || skip,function(m,elsecase,code){
					return elsecase ?
						(code ? "';}else if(" + unescape(code) + "){out+='" : "';}else{out+='") :
						(code ? "';if(" + unescape(code) + "){out+='" : "';}out+='");
				})
				//循环语句
				.replace(config.iterate || skip,function(m,iterate,vname,iname){
					if(!iterate){return "';}}out+='";}
					sid += 1;
					indv = iname || 'i' + sid;
					iterate = unescape(iterate);
					return "';var arr"+sid+"="+iterate+";if(arr"+sid+"){var "+vname+","+indv+"=-1,l"+sid+"=arr"+sid+".length-1;while("+indv+"<l"+sid+"){"+vname+"=arr"+sid+"["+indv+"+=1];out+='";
				})
				.replace(config.evaluate || skip,function(m,code){
					return "';" + unescape(code) + "out+='";
				}) + '\';return out;')
				.replace(/\n/g,'\\n')
				.replace(/\t/g,'\\t')
				.replace(/\r/g,'\\r')
				.replace(/(\s|;|\}|^|\{)out\+='';/g,'$1').replace(/\+''/g,'')
				.replace(/(\s|;|\}|^|\{)out\+=''\+/g,'$1out+=');
			try{
				return new Function(config.varname,str);
			}catch(e){
				throw new Error(e);
			}
		}
	};
});
define('extensions/cookie',function(require,exports,module){
	module.exports = function(core){
		var $ = core.$,
			all = function(){
				if(document.cookie === ''){return {};}
				var cookies = document.cookie.split(';'),
					result = {};

				for(var i=0,len=cookies.length;i<len;i++){
					var item = cookies[i].split('=');
					result[decodeURIComponent(item[0])] = decodeURIComponent(item[1]);
				}
				return result;
			},
			retrieve = function(value,fallback){
				return value == null ? fallback : value;
			},
			escape = function (value) {
				return String(value).replace(/[,;"\\=\s%]/g, function (character) {
					return encodeURIComponent(character);
				});
			};

		return{
			set:function(key,value,opts){
				if($.isPlainObject(key)){
					for(var k in key){
						if(key.hasOwnProperty(k)){
							this.set(k,key[k],value);
						}
					}
				}else{
					opts = $.isPlainObject(opts) ? opts : {expires:opts};
					//opts = opts || {};
					var expires = opts.expires || '';
					if(typeof expires === 'number'){
						expires = new Date(+new Date + 1000 * 60 * 60 * 24 * expires);
					}
					if(expires !== '' && 'toGMTString' in expires){
						expires = ';expires='+expires.toGMTString();
					}
					
					var path = opts.path || '';
					path = path ? ';path=' + path : '';

					var domain = opts.domain || '';
					domain = domain ? ';domain=' + domain : '';

					var secure = opts.secure || '';
					secure = secure ? ';secure' : '';

					document.cookie = escape(key) + '=' + escape(value) + expires + path + domain + secure;
				}
			},
			get:function(keys,fallback){
				fallback = fallback || undefined;
				var cookies = all();
				if($.isArray(keys)){
					var result = {};
					for(var i=0,len=keys.length;i<len;i++){
						var value = keys[i];
						result[value] = retrieve(cookies[value],fallback);
					}
					return result;
				}else{
					return retrieve(cookies[keys],fallback);
				}
			},
			remove:function(keys){
				keys = $.isArray(keys) ? keys : [keys];
				for(var i=0,len=keys.length;i<len;i++){
					this.set(keys[i],'',-1);
				}
			},
			empty:function(){
				this.remove(Object.keys(all()));
			}
		}
	};
});
