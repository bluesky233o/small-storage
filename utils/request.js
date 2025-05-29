// 请求拦截器
const requestInterceptor = async (options) => {
    // 获取token
    const token = uni.getStorageSync('token')
    
    // 添加token和clientInfo
    options.data = {
        ...options.data,
        clientInfo: {
            PLATFORM: process.env.VUE_APP_PLATFORM,
            OS: uni.getSystemInfoSync().platform,
            APPID: process.env.VUE_APP_APPID,
            DEVICEID: uni.getSystemInfoSync().deviceId,
            ...uni.getSystemInfoSync()
        }
    }
    
    // 如果有token，添加到请求头
    if (token) {
        if (!options.header) {
            options.header = {}
        }
        options.header['x-basement-token'] = token
    }
    
    return options
} 