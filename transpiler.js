const path = require('path')
const fs = require('fs-extra')

// 复制云函数目录到编译目录
function copyCloudFunctions() {
    const srcDir = path.resolve(__dirname, 'cloudfunctions')
    const destDir = path.resolve(__dirname, 'unpackage/dist/dev/mp-weixin/cloudfunctions')
    
    // 确保目标目录存在
    fs.ensureDirSync(destDir)
    
    // 复制文件
    fs.copySync(srcDir, destDir, {
        filter: (src) => {
            // 排除 node_modules
            return !src.includes('node_modules')
        }
    })
    
}

// 监听文件变化
function watchCloudFunctions() {
    const chokidar = require('chokidar')
    const watcher = chokidar.watch('cloudfunctions', {
        ignored: /node_modules/,
        persistent: true
    })
    
    watcher
        .on('add', copyCloudFunctions)
        .on('change', copyCloudFunctions)
        .on('unlink', copyCloudFunctions)
}

// 执行复制
copyCloudFunctions()

// 开发模式下监听文件变化
if (process.env.NODE_ENV === 'development') {
    watchCloudFunctions()
} 