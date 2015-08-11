/**
 * Created by pinghe on 2015-07-14.
 */


/**
 * @cnName avalon 封装 l20n 的国际化插件
 * @enName avalon l20n
 * @introduce
 *    <p></p>
 *  @updatetime 2015-07-12
 */
define(["msl20n/l20n/l20n", "msl20n/l20n/l20n/intl", "msl20n/l20n/l20n/platform/io", "avalon", "msl20n/meld"], function(mzl20n, Intl, io, avalon, meld) {
    'use strict';

    var rproxy = /(\$proxy\$[a-z]+)\d+$/
    var rstringLiteral = /(['"])(\\\1|.)+?\1/g
    var r11a = /\|\|/g

    mzl20n.shims = {};

    var whitelist = {
        elements: [
            'a', 'em', 'strong', 'small', 's', 'cite', 'q', 'dfn', 'abbr', 'data',
            'time', 'code', 'var', 'samp', 'kbd', 'sub', 'sup', 'i', 'b', 'u',
            'mark', 'ruby', 'rt', 'rp', 'bdi', 'bdo', 'span', 'br', 'wbr'
        ],
        attributes: {
            global: ['title', 'aria-label'],
            a: ['download'],
            area: ['download', 'alt'],
            // value is special-cased in isAttrAllowed
            input: ['alt', 'placeholder'],
            menuitem: ['label'],
            menu: ['label'],
            optgroup: ['label'],
            option: ['label'],
            track: ['label'],
            img: ['alt'],
            textarea: ['placeholder'],
            th: ['abbr']
        }
    };

    var templateSupported = 'content' in document.createElement('template');


    var singletonCtxs = (function() {
        // {id1: {ctx: ctx1, currentLocale: <currentLocale>, previousLocale: <previousLocale>, manifestResource: <manifestResource>}, id2: {ctx: ctx2, currentLocale: <currentLocale>, , previousLocale: <previousLocale>, manifestResource: <manifestResource>}}
        var ctxArray = {};

        function init(ctxid, options) {
            var initLocale, manifestResource, mzl20nctx
            if (options !== undefined) {
                initLocale = options.initLocale
                manifestResource = options.manifestResource
            }
            ctxArray[ctxid] = {};
            mzl20nctx = mzl20n.getContext(ctxid)
            ctxArray[ctxid].ctx = mzl20nctx;
            mzl20nctx.localizeNode = function(l20nid, node) {
                mzl20nctx.localize([l20nid], function localizeHandler(l10n) {
                    translateNode(node, l20nid, l10n.entities[l20nid]);
                });
            };
            initparam(ctxid, initLocale, manifestResource);
            return ctxArray[ctxid];
        }



        function initparam(ctxid, initLocale, manifestResource) {
            ctxArray[ctxid].currentLocale = initLocale || navigator.language || navigator.browserLanguage
            ctxArray[ctxid].manifestResource = manifestResource || 'locales/l20n.json'
            loadManifest(ctxArray[ctxid])
        }

        function camelCaseToDashed(string) {
            return string
                .replace(/[A-Z]/g, function(match) {
                    return '-' + match.toLowerCase();
                })
                .replace(/^-/, '');
        }

        // The goal of overlayElement is to move the children of `translationElement` 
        // into `sourceElement` such that `sourceElement`'s own children are not 
        // replaced, but onle have their text nodes and their attributes modified.
        //
        // We want to make it possible for localizers to apply text-level semantics to
        // the translations and make use of HTML entities.  At the same time, we 
        // don't trust translations so we need to filter unsafe elements and 
        // attribtues out and we don't want to break the Web by replacing elements to 
        // which third-party code might have created references (e.g. two-way 
        // bindings in MVC frameworks).
        function overlayElement(sourceElement, translationElement) {
            var result = document.createDocumentFragment();

            // take one node from translationElement at a time and check it against the 
            // whitelist or try to match it with a corresponding element in the source
            var childElement;
            while (childElement = translationElement.childNodes[0]) {
                translationElement.removeChild(childElement);

                if (childElement.nodeType === Node.TEXT_NODE) {
                    result.appendChild(childElement);
                    continue;
                }

                var sourceChild = getElementOfType(sourceElement, childElement);
                if (sourceChild) {
                    // there is a corresponding element in the source, let's use it
                    overlayElement(sourceChild, childElement);
                    result.appendChild(sourceChild);
                    continue;
                }

                if (isElementAllowed(childElement)) {
                    for (var k = 0, attr; attr = childElement.attributes[k]; k++) {
                        if (!isAttrAllowed(attr, childElement)) {
                            childElement.removeAttribute(attr.name);
                        }
                    }
                    result.appendChild(childElement);
                    continue;
                }

                // otherwise just take this child's textContent
                var text = document.createTextNode(childElement.textContent);
                result.appendChild(text);
            }

            // clear `sourceElement` and append `result` which by this time contains 
            // `sourceElement`'s original children, overlayed with translation
            sourceElement.textContent = '';
            sourceElement.appendChild(result);

            // if we're overlaying a nested element, translate the whitelisted 
            // attributes; top-level attributes are handled in `translateNode`
            // XXX attributes previously set here for another language should be 
            // cleared if a new language doesn't use them; https://bugzil.la/922577
            if (translationElement.attributes) {
                for (var k = 0, attr; attr = translationElement.attributes[k]; k++) {
                    if (isAttrAllowed(attr, sourceElement)) {
                        sourceElement.setAttribute(attr.name, attr.value);
                    }
                }
            }
        }

        // ideally, we'd use querySelector(':scope > ELEMENT:nth-of-type(index)'),
        // but 1) :scope is not widely supported yet and 2) it doesn't work with 
        // DocumentFragments.  :scope is needed to query only immediate children
        // https://developer.mozilla.org/en-US/docs/Web/CSS/:scope
        function getElementOfType(context, element) {
            var index = getIndexOfType(element);
            var nthOfType = 0;
            for (var i = 0, child; child = context.children[i]; i++) {
                if (child.nodeType === Node.ELEMENT_NODE &&
                    child.tagName === element.tagName) {
                    if (nthOfType === index) {
                        return child;
                    }
                    nthOfType++;
                }
            }
            return null;
        }

        function getIndexOfType(element) {
            var index = 0;
            var child;
            while (child = element.previousElementSibling) {
                if (child.tagName === element.tagName) {
                    index++;
                }
            }
            return index;
        }

        // // XXX the whitelist should be amendable; https://bugzil.la/922573
        function isElementAllowed(element) {
            return whitelist.elements.indexOf(element.tagName.toLowerCase()) !== -1
        }

        function isAttrAllowed(attr, element) {
            var attrName = attr.name.toLowerCase();
            var tagName = element.tagName.toLowerCase();
            // is it a globally safe attribute?
            if (whitelist.attributes.global.indexOf(attrName) !== -1) {
                return true;
            }
            // are there no whitelisted attributes for this element?
            if (!whitelist.attributes[tagName]) {
                return false;
            }
            // is it allowed on this element?
            // XXX the whitelist should be amendable; https://bugzil.la/922573
            if (whitelist.attributes[tagName].indexOf(attrName) !== -1) {
                return true;
            }
            // special case for value on inputs with type button, reset, submit
            if (tagName === 'input' && attrName === 'value') {
                var type = element.type.toLowerCase();
                if (type === 'submit' || type === 'button' || type === 'reset') {
                    return true;
                }
            }
            return false;
        }

        function translateNode(node, id, entity) {
            if (!entity) {
                return;
            }
            if (entity.value) {
                // if there is no HTML in the translation nor no HTML entities are used
                // or if the template element is not supported and no fallback was
                // provided, just replace the textContent
                if (entity.value.indexOf('<') === -1 &&
                    entity.value.indexOf('&') === -1 ||
                    !templateSupported && typeof mzl20n.shims.getTemplate !== 'function') {
                    node.textContent = entity.value;
                } else {
                    // otherwise, start with an inert template element and move its 
                    // children into `node` but such that `node`'s own children are not 
                    // replaced
                    var translation = templateSupported ?
                        document.createElement('template') :
                        // If <template> is not supported, fallback to an implementation
                        // provided from outside.
                        L20n.shims.getTemplate();

                    translation.innerHTML = entity.value;
                    // overlay the node with the DocumentFragment
                    overlayElement(node, translation.content);
                }
            }
            Object.keys(entity.attributes).forEach(function(key) {
                var attrName = camelCaseToDashed(key);
                if (isAttrAllowed({
                        name: attrName
                    }, node)) {
                    node.setAttribute(attrName, entity.attributes[key]);
                }
            });
        }

        return {
            ctxArray: ctxArray,
            getInstance: function(ctxid, options) {
                return ctxArray[ctxid] || init(ctxid, options);
            }
        }
    })();

    var reAbsolute = /^\/|:/;
    var rtlLocales = ['ar', 'fa', 'he', 'ps', 'ur'];

    function loadManifest(ctxObj) {
        io.load(ctxObj.manifestResource, function(err, text) {
            var manifest = parseManifest(text, ctxObj.manifestResource);
            setupCtxFromManifest(ctxObj, manifest);
        });
    }

    function parseManifest(text, url) {
        var manifest = JSON.parse(text);
        manifest.resources = manifest.resources.map(
            relativeToManifest.bind(this, url));
        return manifest;
    }

    function setDocumentLanguage(loc) {
        document.documentElement.lang = loc;
        document.documentElement.dir =
            rtlLocales.indexOf(loc) === -1 ? 'ltr' : 'rtl';
    }

    function setupCtxFromManifest(ctxObj, manifest) {
        // register available locales
        ctxObj.ctx.registerLocales(manifest.default_locale, manifest.locales);
        ctxObj.ctx.registerLocaleNegotiator(function(available, requested, defLoc) {
            // lazy-require Intl
            var fallbackChain = Intl.Intl.prioritizeLocales(available, requested, defLoc);
            setDocumentLanguage(fallbackChain[0]);
            return fallbackChain;
        });

        // add resources
        var re = /{{\s*locale\s*}}/;
        manifest.resources.forEach(function(uri) {
            if (re.test(uri)) {
                ctxObj.ctx.linkResource(uri.replace.bind(uri, re));
            } else {
                ctxObj.ctx.linkResource(uri);
            }
        });

        // For now we just take navigator.language, but we'd prefer to get a list 
        // of locales that the user can read sorted by user's preference, see:
        //   https://bugzilla.mozilla.org/show_bug.cgi?id=889335
        // For IE we use navigator.browserLanguage, see:
        //   http://msdn.microsoft.com/en-us/library/ie/ms533542%28v=vs.85%29.aspx
        // ctx.requestLocales(navigator.language || navigator.browserLanguage);
        ctxObj.ctx.requestLocales(ctxObj.currentLocale);

        return manifest;
    }

    function relativeToManifest(manifestUrl, url) {
        if (reAbsolute.test(url)) {
            return url;
        }
        var dirs = manifestUrl.split('/')
            .slice(0, -1)
            .concat(url.split('/'))
            .filter(function(elem) {
                return elem !== '.';
            });
        return dirs.join('/');
    }

    function getToken(value) {
        if (value.indexOf("|") > 0) {
            var scapegoat = value.replace(rstringLiteral, function(_) {
                return Array(_.length + 1).join("1") // jshint ignore:line
            })
            var index = scapegoat.replace(r11a, "\u1122\u3344").indexOf("|") //干掉所有短路或
            if (index > -1) {
                return {
                    filters: value.slice(index),
                    value: value.slice(0, index),
                    expr: true
                }
            }
        }
        return {
            value: value,
            filters: "",
            expr: true
        }
    }

    function scanExpr(str) {
        var tokens = [],
            openTag = avalon.config.openTag,
            closeTag = avalon.config.closeTag,
            value, start = 0,
            stop
        do {
            stop = str.indexOf(openTag, start)
            if (stop === -1) {
                break
            }
            value = str.slice(start, stop)
            if (value) { // {{ 左边的文本
                tokens.push({
                    value: value,
                    filters: "",
                    expr: false
                })
            }
            start = stop + openTag.length
            stop = str.indexOf(closeTag, start)
            if (stop === -1) {
                break
            }
            value = str.slice(start, stop)
            if (value) { //处理{{ }}插值表达式
                tokens.push(getToken(value, start))
            }
            start = stop + closeTag.length
        } while (1)
        value = str.slice(start)
        if (value) { //}} 右边的文本
            tokens.push({
                value: value,
                expr: false,
                filters: ""
            })
        }
        return tokens
    }

    function scanObj(str) {
        var objparam = {
                key: ""
            },
            openTag = '(',
            closeTag = ')',
            value, start = 0,
            stop
        stop = str.indexOf(openTag, start)
        if (stop === -1) {
            objparam.key = str
            return objparam
        }
        value = str.slice(start, stop) // ( 左边的文本, l20n key
        objparam.key = value
        if (value) {
            start = stop + openTag.length
            stop = str.lastIndexOf(closeTag)
            if (stop !== -1) {
                value = str.slice(start, stop).replace(/\'/g, "\"")
                objparam.param = JSON.parse(value);
            }
        }


        return objparam
    }

    avalon.bindingHandlers.l20n = function(data, vmodels) {
        var el = data.element,
            msl20n, options, ctxid;
        vmodels.forEach(function(el) { //由里到外一层覆盖
            if (el.$model.l20n && options === undefined) {
                options = el.$model.l20n
            }
            if (options && ctxid === undefined && options.ctxid === undefined) {
                ctxid = String(el.$id).replace(rproxy, "$1")
            } else if (options && ctxid === undefined && options.ctxid != undefined) {
                ctxid = options.ctxid
            }
            // return el.$id
        })
        if (options === undefined) { //如果都没有定义l20配置项，则使用最外层vm.$id 作为 ctxid
            ctxid = vmodels[vmodels.length - 1].$id
        }

        if (ctxid) {
            msl20n = singletonCtxs.getInstance(ctxid, options);
            data.msl20n = msl20n;
            var l20nid = data.value;
            if (l20nid) {
                //debugger;

                var code = "", tokens = scanExpr(l20nid);
                if (Array.isArray(tokens)) {
                    code = tokens.map(function(el) {
                        return el.expr ? "(" + el.value + ")" : JSON.stringify(el.value)
                    }).join(" + ")
                }
                avalon.parseExprProxy(code, vmodels, data);

                return;
            }


        }
    };

    avalon.bindingExecutors.l20n = function(val, elem, data, vmodel) {
        // console.debug(data)
        if (data.oldVal === val) {
            return
        } else {
            data.oldVal = val
            var objparam = scanObj(val)

            if (objparam.param && typeof objparam.param === 'object') {
                data.msl20n.ctx.updateData(objparam.param)
            }

            data.msl20n.ctx.localizeNode(objparam.key, elem)
        }
    };


    avalon.l20nversion = '1.0.4' // 对应 l20n 版本号

    avalon.changeLocale = function(newLocale, ctxidparm) {
        if (avalon.type(newLocale) === 'string' && ctxidparm === undefined) {
            avalon.each(singletonCtxs.ctxArray, function(ctxid, msl20n) {
                setLocale(ctxid, msl20n, newLocale)
            })
        } else if (avalon.type(newLocale) === 'string' && avalon.type(ctxidparm) === 'string') {
            var msl20n = singletonCtxs.getInstance(ctxidparm)
            if (msl20n) {
                setLocale(ctxidparm, msl20n, newLocale)
            }
        }

        function setLocale(ctxid, msl20n, newLocale) {
            if (newLocale !== undefined) {
                msl20n.previousLocale = msl20n.currentLocale;

                if (newLocale !== msl20n.previousLocale) {
                    msl20n.ctx.requestLocales(newLocale);
                    msl20n.currentLocale = newLocale;
                    if (avalon.vmodels[ctxid].currentLocale !== undefined) {
                        avalon.vmodels[ctxid].currentLocale = newLocale;
                    }
                }
            }
        }
    }

    avalon.localize = function(ctxid) {
        if (ctxid === undefined) {
            avalon.each(avalon.vmodels, function(index, vmodel) {
                localizeLocal(vmodel.$id)
            })

        } else {
            localizeLocal(ctxid)
        }

        function localizeLocal(ctxid) {
            var l20nkeys = [],
                mzl20nctx,
                stopIndex,
                key
            avalon.each(avalon.vmodels[ctxid], function(propname, propvalue) {
                stopIndex = propname.lastIndexOf('L20nAuto')

                if (avalon.type(propname) === 'string' && stopIndex !== -1) {
                    key = propname.slice(0, stopIndex)
                    l20nkeys.push(key)
                }
            })

            if (l20nkeys.length !== 0) {
                mzl20nctx = singletonCtxs.getInstance(ctxid).ctx

                var localizeHandler = mzl20nctx.localize(l20nkeys, function(l10n) {
                    var l20nvmmodel = avalon.vmodels[ctxid] //.$model
                    avalon.each(l20nkeys, function(index, l20nid) {
                        l20nvmmodel[l20nid + "L20nAuto"] = l10n.entities[l20nid].value
                    })
                });
            }
        }
    }


    avalon.currentLocale = function(ctxid) {
        var ctx = singletonCtxs.getInstance(ctxid)
        return ctx.currentLocale;
    }


    // vm.availableLocales = []
    /**
     *   avalon.requestLocales(vm.$id) // 继续使用当前locale
     *   avalon.requestLocales(vm.$id, 'en-US') // 在当前vm中使用新locale更新国际化内容
     *   avalon.requestLocales('en-US') // 在所有vm中使用新locale更新国际化内容

     */
    avalon.requestLocales = function(ctxid, l20nOpt) {
        if (avalon.type(ctxid) === 'string' && l20nOpt === undefined) {
            var msl20n = singletonCtxs.getInstance(ctxid)
            setLocale(msl20n, l20nOpt)

        } else if (avalon.type(l20nOpt) === 'string') {
            avalon.each(singletonCtxs.ctxArray, function(ctxid, msl20n) {
                setLocale(msl20n, {
                    initLocale: l20nOpt
                })
            })
        } else if (l20nOpt.ctxid === undefined) {
            avalon.each(singletonCtxs.ctxArray, function(ctxid, msl20n) {
                setLocale(msl20n, l20nOpt)
            })
        } else {
            var msl20n = singletonCtxs.getInstance(l20nOpt.ctxid, l20nOpt.initLocale, l20nOpt.manifestResource)
            setLocale(msl20n, l20nOpt)
        }

        function setLocale(msl20n, l20nOpt) {
            if (l20nOpt.initLocale === undefined) {
                msl20n.ctx.requestLocales()
            } else {
                msl20n.previousLocale = msl20n.currentLocale;

                if (l20nOpt.initLocale !== msl20n.previousLocale) {
                    msl20n.ctx.requestLocales(l20nOpt.initLocale);
                    msl20n.currentLocale = l20nOpt.initLocale;
                }
            }
        }
    };

    var remover = meld.after(avalon, 'define', function(result) {
        // console.log('avalon.define returned: ' + result.$id);
        avalon.localize(result.$id);
    });

    return avalon
})
