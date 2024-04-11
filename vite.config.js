import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import fs from 'fs'

import laravel from 'laravel-vite-plugin'
import vue from '@vitejs/plugin-vue2'
import viteCompression from 'vite-plugin-compression'
import { VitePWA } from 'vite-plugin-pwa'

// import resolve from '@rollup/plugin-node-resolve'
import replace from '@rollup/plugin-replace'

import pwaConfig from './vite/pwa.config'
import getStrategy from './vite/build-strategy'
import { detectServerConfig } from './vite/common.config'

import pkg from './package.json' assert { type: 'json' }

const npmPackages = Object.keys(pkg.dependencies)

export default defineConfig(({ command, mode }) => {
    Object.assign(process.env, loadEnv(mode, process.cwd()))

    const appEnv = process.env.VITE_APP_ENV
    const hostUrl = process.env.VITE_APP_URL

    if (! (appEnv && hostUrl)) {
        console.log('')
        console.log('\x1b[0m', '=============================================')
        console.log('\x1b[31m', 'ERROR: Environment File (.env) is missing!')
        console.log('\x1b[0m', '=============================================')
        console.log('')
        return
    }

    const host = hostUrl.replace(/^https?:\/\//, '').replace(/^http?:\/\//, '')

    let server = {}

    const replaceOptions = {
        __DATE__: new Date().toISOString(),
        __STORAGE_KEY__: process.env.VITE_STORAGE_KEY,
    }

    const buildStrategy = getStrategy(process, npmPackages)

    // If you are not using Valet or if you are facing any issue, then this needs to be configured (Only during development) as per your dev environment.
    // server = detectServerConfig(host)

    let minify = 'esbuild'
    let sourcemap = false
    let reportCompressedSize = true
    let manifest = 'app-manifest.json'

    let plugins = [
        // resolve({
        //     // pass custom options to the resolve plugin
        //     moduleDirectories: ['node_modules'],
        // }),

        laravel({
            valetTls: host,
            input: ['resources/js/app.js', 'resources/sass/vendor.scss', 'resources/sass/style.scss', 'resources/sass/print.scss'],
            buildDirectory: '.',
            refresh: true,
        }),

        replace(replaceOptions),
    ]

    plugins.push(
        viteCompression({
            filter: /\.(js|css|scss)$/i,
        })
    )

    plugins.push(
        vue({
            isProduction: !sourcemap,
            template: {
                transformAssetUrls: {
                    base: null,
                    includeAbsolute: false,
                },
            },
        })
    )

    plugins.push(
        VitePWA({
            ...pwaConfig,
            mode,
            registerType: 'prompt', // autoUpdate or prompt
            srcDir: 'resources/sw',
            filename: 'app-sw.js',

            devOptions: {
                enabled: sourcemap,
            },
        })
    )

    console.log('\n===========BUILDING APP ===========')
    console.log('Tags Replaced: ', replaceOptions)
    console.log('Manifest: ', manifest)
    console.log('Minification: ', minify)
    console.log('Sourcemap: ', sourcemap)
    console.log('Vite Compression: ', mode === 'production' && appEnv === 'production')
    console.log('Compression Report: ', reportCompressedSize)
    console.log('=====================================\n')

    // console.log(npmPackages)

    return {
        server,

        clearScreen: false,

        plugins,

        css: {
            devSourcemap: sourcemap,
        },

        resolve: {
            alias: {
                vue: 'vue/dist/vue.esm.js',
                'jquery$': 'jquery',
                'path': 'path-browserify',

                '@resources': path.resolve(__dirname, 'resources'),
                '@js': path.resolve(__dirname, 'resources', 'js'),

                '@api': path.resolve(__dirname, 'resources', 'js', 'api'),
                '@components': path.resolve(__dirname, 'resources', 'js', 'components'),
                '@core': path.resolve(__dirname, 'resources', 'js', 'core'),
                '@helpers': path.resolve(__dirname, 'resources', 'js', 'helpers'),
                '@mixins': path.resolve(__dirname, 'resources', 'js', 'mixins'),
                '@repositories': path.resolve(__dirname, 'resources', 'js', 'repositories'),
                '@router': path.resolve(__dirname, 'resources', 'js', 'router'),
                '@store': path.resolve(__dirname, 'resources', 'js', 'store'),
                '@filters': path.resolve(__dirname, 'resources', 'js', 'filters'),
                '@plugins': path.resolve(__dirname, 'resources', 'js', 'plugins'),
                '@utils': path.resolve(__dirname, 'resources', 'js', 'utils'),
                '@views': path.resolve(__dirname, 'resources', 'js', 'views'),

                '@images': path.resolve(__dirname, 'resources', 'images'),
                '@sass': path.resolve(__dirname, 'resources', 'sass'),
                '@var': path.resolve(__dirname, 'resources', 'var'),
            },
            dedupe: npmPackages,
        },

        dedupe: npmPackages,

        build: {
            emptyOutDir: false,
            copyPublicDir: false,
            reportCompressedSize,
            manifest,
            minify,
            sourcemap,

            rollupOptions: {
                // external: npmPackages, // no idea what the heck this is

                output: {
                    // Provide global variables to use in the UMD build
                    // for externalized deps
                    globals: {
                        jQuery: 'jquery',
                        $: 'jquery',
                        'window.jQuery': 'jquery',
                        vue: 'Vue',
                        window: 'window',
                    },

                    ...buildStrategy,

                    entryFileNames: 'assets/js/[name].[hash].js',
                    compact: true,
                },
            },
        },
    }
})
