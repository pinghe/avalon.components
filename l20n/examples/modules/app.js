define(['msl20n/avalon.l20n'], function(avalon, ace) {
    'use strict';

    avalon.define({
        $id: "samples1"
    })

    var vmsamples2 = avalon.define({
        $id: "samples2",
        data: {
            objectsNum: 3,
        },
        changeLocale: function(newLocale) {
            avalon.changeLocale(newLocale, vmsamples2.$id);
        },
    })

    var vmsamples3 = avalon.define({
        $id: "samples3",
        l20nI18nId: "setObjectsNumber",
        changeLocale: function(newLocale) {
            avalon.changeLocale(newLocale, vmsamples3.$id);
        },
    })

    var vmsamples4 = avalon.define({
        $id: "samples4",
        data: {
            testNumber: 4,
        },

        changeLocale: function(newLocale) {
            avalon.changeLocale(newLocale, vmsamples4.$id);
        },
    })

    var vmsamples5 = avalon.define({
        $id: "samples5",
        AttributeL20nAuto: 'Attribute',

        changeLocale: function(newLocale) {
            avalon.changeLocale(newLocale, vmsamples5.$id);
        },
    })

    var vmsamples6 = avalon.define({
        $id: "samples6",

        changeLocale: function(newLocale) {
            avalon.changeLocale(newLocale, vmsamples6.$id);
        },
    })

    var vmsamples7 = avalon.define({
        $id: "samples7",

        changeLocale: function(newLocale) {
            avalon.changeLocale(newLocale, vmsamples7.$id);
        },
        changeLocaleGlobal: function(newLocale) {
            avalon.changeLocale(newLocale);
        },
    })

    var vmsamples71 = avalon.define({
        $id: "samples71",
        $skipArray: ["l20n"],
        l20n: {},


        changeLocale: function(newLocale) {
            avalon.changeLocale(newLocale, vmsamples71.$id);
        },
    })

    var vmsamples72 = avalon.define({
        $id: "samples72",
        $skipArray: ["l20n"],
        l20n: {},

        changeLocale: function(newLocale) {
            avalon.changeLocale(newLocale, vmsamples72.$id);
        },
    })

    var vmsamples8 = avalon.define({
        $id: "samples8",
        currentLocale: 'en-US',
        $skipArray: ["l20n"],
        l20n: {
            initLocale: 'en-US', //页面初始打开时默认语言，未设置则为浏览器当前语言
            manifestResource: "locales/l20n.json", //这里是相对页面路径
        },

        changeLocale: function(newLocale) {
            avalon.changeLocale(newLocale, vmsamples8.$id);
        },
        changeLocaleGlobal: function(newLocale) {
            avalon.changeLocale(newLocale);
        },
    })

    var vmsamples81 = avalon.define({
        $id: "samples81",
        $skipArray: ["l20n"],
        l20n: {
            initLocale: 'pl', //页面初始打开时默认语言，未设置则为浏览器当前语言
            manifestResource: "locales/l20n.json", //这里是绝对路径
        },


        changeLocale: function(newLocale) {
            avalon.changeLocale(newLocale, vmsamples81.$id);
        },
    })

    var vmsamples82 = avalon.define({
        $id: "samples82",
        $skipArray: ["l20n"],
        l20n: {},

        changeLocale: function(newLocale) {
            avalon.changeLocale(newLocale, vmsamples82.$id);
        },
    })

    var vmsamples83 = avalon.define({
        $id: "samples83",
        $skipArray: ["l20n"],

        changeLocale: function(newLocale) {
            avalon.changeLocale(newLocale, vmsamples83.$id);
        },

    })

    avalon.scan()
    avalon.localize(vmsamples5.$id)

    var vmmodel = avalon.define({
        $id: "mainctrl",
        $skipArray: ["l20n"],
        data: {
            testNumber: 4,
            objectsNum: 3,
        },
        currentLocale: 'en-US',
        AttributeL20nAuto: 'Attribute',
        changeLocale: function(newLocale) {
            // vmmodel.currentLocale = newLocale;
            avalon.changeLocale(newLocale, vmmodel.$id);
        },
        l20nI18nId: "objectsWithCount",
        l20n: {
            initLocale: 'en-US', //页面初始打开时默认语言，未设置则为浏览器当前语言
            manifestResource: "modules/locales/l20n.json", //加载国际化资源文件，必须设置
        },
    })

    // avalon.localize(vmmodel.$id)

    avalon.log("加载avalon完毕，开始构建根VM与加载其他模块");



});
