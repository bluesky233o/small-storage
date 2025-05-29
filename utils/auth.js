// 不需要登录的页面白名单
export const noNeedLogin = [
    "/pages/index/index",
    "/pages/index/list",
    "/pages/index/user",
    "/pages/user/login",
    "/pages/about/about",
    "/pages/version/versionList"
]

// 检查是否需要登录
export function checkNeedLogin(path) {
    if (!path) return false
    return !noNeedLogin.includes(path)
}

// 检查是否登录
export function checkLogin() {
    const token = uni.getStorageSync('token')
    return !!token
}

// 跳转到登录页
export function toLogin(targetUrl) {
    // 如果传入了目标页面路径，直接使用
    if (targetUrl) {
        // 检查目标页面是否需要登录
        if (checkNeedLogin(targetUrl)) {
            uni.setStorageSync('redirect', targetUrl)
        }
    } else {
        // 否则获取当前页面路径
        const pages = getCurrentPages()
        const currentPage = pages[pages.length - 1]
        const url = currentPage ? '/' + currentPage.route : ''
        console.log('当前页面路径:', url)
        
        // 如果当前页面不需要登录，直接返回
        if (!checkNeedLogin(url)) {
            console.log('当前页面不需要登录')
            return
        }
        
        // 保存当前页面路径
        uni.setStorageSync('redirect', url)
    }
    
    uni.navigateTo({
        url: '/pages/user/login'
    })
}

// 获取用户信息
export function getUserInfo() {
    return uni.getStorageSync('userInfo')
}

// 退出登录
export function logout() {
    // 清除本地存储的用户信息和token
    uni.removeStorageSync('userInfo')
    uni.removeStorageSync('token')
    
    // 返回首页
    uni.reLaunch({
        url: '/pages/index/index'
    })
} 