/**
 * Created by mengzhx on 2015-07-14.
 */
'use strict';

require.config({//第一块，配置
    baseUrl: './modules/',
    paths: {
        main: '../main',
        avalon: '../vendor/avalon/avalon.modern.shim',
        msl20n: '../../src',
        ace: '../vendor/ace',
    },
    deps: ['./app']
});
