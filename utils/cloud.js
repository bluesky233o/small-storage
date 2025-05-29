// import { cloudConfig } from '@/config/index.js'

// 初始化云开发
export function initCloud() {
    // uniCloud 不需要手动初始化
    return true
}

// 调用云函数
export async function callCloudFunction(name, data = {}) {
    try {
        // 获取token
        const token = uni.getStorageSync('token')
        const tokenExpired = uni.getStorageSync('token_expired')
        const refreshToken = uni.getStorageSync('refresh_token')
        
        // 如果token不存在或已过期,并且有refreshToken,则先刷新token
        if ((!token || (tokenExpired && Date.now() > tokenExpired * 1000)) && refreshToken) {
            try {
                const refreshResult = await uniCloud.callFunction({
                    name: 'user',
                    data: {
                        action: 'refreshToken',
                        refreshToken
                    }
                })
                
                if (refreshResult.result.code === 0) {
                    // 更新token
                    uni.setStorageSync('token', refreshResult.result.data.token)
                    uni.setStorageSync('token_expired', refreshResult.result.data.tokenExpired)
                    uni.setStorageSync('refresh_token', refreshResult.result.data.refreshToken)
                } else {
                    // 刷新失败,说明登录已失效,清除token并跳转到登录页
                    uni.removeStorageSync('token')
                    uni.removeStorageSync('token_expired')
                    uni.removeStorageSync('refresh_token')
                    uni.redirectTo({
                        url: '/pages/user/login'
                    })
                    throw new Error('登录已失效,请重新登录')
                }
            } catch (error) {
                console.error('刷新token失败：', error)
                throw error
            }
        }
        
        // 调用业务云函数
        const callOptions = {
            name,
            data: {
                ...data,
                token: uni.getStorageSync('token') // 使用最新的token
            }
        }
        
        const result = await uniCloud.callFunction(callOptions)
        
        // 如果业务接口返回token过期,尝试刷新token并重试一次
        if (result.result.code === 402) {
            const currentRefreshToken = uni.getStorageSync('refresh_token')
            if (currentRefreshToken) {
                try {
                    const refreshResult = await uniCloud.callFunction({
                        name: 'user',
                        data: {
                            action: 'refreshToken',
                            refreshToken: currentRefreshToken
                        }
                    })
                    
                    if (refreshResult.result.code === 0) {
                        // 更新token
                        uni.setStorageSync('token', refreshResult.result.data.token)
                        uni.setStorageSync('token_expired', refreshResult.result.data.tokenExpired)
                        uni.setStorageSync('refresh_token', refreshResult.result.data.refreshToken)
                        
                        // 重试业务请求
                        return await callCloudFunction(name, data)
                    }
                } catch (error) {
                    console.error('刷新token失败：', error)
                }
            }
            
            // 如果刷新失败或没有refreshToken,清除token并跳转登录页
            uni.removeStorageSync('token')
            uni.removeStorageSync('token_expired')
            uni.removeStorageSync('refresh_token')
            uni.redirectTo({
                url: '/pages/user/login'
            })
            throw new Error('登录已失效,请重新登录')
        }
        
        return result.result
    } catch (error) {
        console.error(`调用云函数 ${name} 失败：`, error)
        
        // 如果是token相关错误,清除token并跳转登录页
        if (error.message && (error.message.includes('token') || error.message.includes('TOKEN'))) {
            uni.removeStorageSync('token')
            uni.removeStorageSync('token_expired')
            uni.removeStorageSync('refresh_token')
            uni.redirectTo({
                url: '/pages/user/login'
            })
        }
        throw error
    }
}

// 获取云数据库引用
export function getCollection(name) {
    return uniCloud.database().collection(name)
}

// 上传文件到云存储
export function uploadFile(filePath, cloudPath) {
    return new Promise((resolve, reject) => {
        uniCloud.uploadFile({
            filePath,
            cloudPath,
            success: res => {
                resolve(res.fileID)
            },
            fail: err => {
                reject(err)
            }
        })
    })
}

// 从云存储下载文件
export function downloadFile(fileID) {
    return new Promise((resolve, reject) => {
        uniCloud.downloadFile({
            fileID,
            success: res => {
                resolve(res.tempFilePath)
            },
            fail: err => {
                reject(err)
            }
        })
    })
} 