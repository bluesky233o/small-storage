<template>
	<view class="container">
		<view class="login-card">
			<view class="logo-section">
				<image class="logo" src="/static/logo.png" mode="aspectFit"></image>
				<text class="app-name">一点收纳</text>
				<text class="slogan">让收纳更简单</text>
			</view>
			
			<view class="login-section">
				<!-- #ifdef MP-WEIXIN -->
				<button 
					class="wechat-login-btn" 
					@tap="handleWechatLogin"
					:loading="loading"
				>
					<image class="wechat-icon" src="/static/icon/wechat.png" mode="aspectFit"></image>
					<text>微信一键登录</text>
				</button>
				<!-- #endif -->
				
				<!-- #ifndef MP-WEIXIN -->
				<button 
					class="login-btn" 
					@click="handleLogin"
				>
					<text>一键登录</text>
				</button>
				<!-- #endif -->
			</view>
		</view>
	</view>
</template>

<script>
import { callCloudFunction } from '@/utils/cloud.js'

export default {
	data() {
		return {
			loading: false
		}
	},
	methods: {
		// 处理授权错误
		handleAuthError(error) {
			console.error('授权错误：', error)
			uni.showToast({
				title: '授权失败，请重试',
				icon: 'none'
			})
		},
		
		// 微信小程序登录
		async handleWechatLogin() {
			if (this.loading) return
			
			this.loading = true
			uni.showLoading({
				title: '登录中...',
				mask: true
			})
			
			try {
				// 获取用户信息
				let profileResult = null
				try {
					profileResult = await uni.getUserProfile({
						desc: '用于完善用户资料',
						lang: 'zh_CN'
					})
				} catch (profileError) {
					console.error('获取用户信息失败：', profileError)
					throw new Error('获取用户信息失败，请重试')
				}
				
				// 获取code
				let loginResult = null
				try {
					loginResult = await uni.login({
						provider: 'weixin',
						timeout: 10000
					})
				} catch (loginError) {
					console.error('登录错误：', loginError)
					throw new Error('获取登录凭证失败，请重试')
				}
				
				if (!loginResult || !loginResult.code) {
					throw new Error('获取登录凭证失败')
				}
				
				console.log('登录凭证:', loginResult)
				
				// 调用登录云函数
				const result = await callCloudFunction('user', {
					action: 'login',
					code: loginResult.code,
					userInfo: profileResult.userInfo
				})
				
				console.log('登录结果:', result)
				
				if (result.code === 0) {
					// 保存token到本地
					if (result.data.token) {
						uni.setStorageSync('token', result.data.token)
					}
					if (result.data.tokenExpired) {
						uni.setStorageSync('token_expired', result.data.tokenExpired)
					}
					if (result.data.refreshToken) {
						uni.setStorageSync('refresh_token', result.data.refreshToken)
					}
					
					// 保存用户信息
					const { token, tokenExpired, refreshToken, ...userInfo } = result.data
					uni.setStorageSync('userInfo', userInfo)
					
					uni.showToast({
						title: '登录成功',
						icon: 'success'
					})
					
					// 延迟跳转到首页
					setTimeout(() => {
						uni.reLaunch({
							url: '/pages/index/index'
						})
					}, 1500)
				} else {
					throw new Error(result.message || '登录失败')
				}
			} catch (error) {
				console.error('登录失败：', error)
				uni.showToast({
					title: error.message || '登录失败，请稍后重试',
					icon: 'none'
				})
			} finally {
				this.loading = false
				uni.hideLoading()
			}
		},
		
		// 其他平台登录
		async handleLogin() {
			if (this.loading) return
			
			this.loading = true
			uni.showLoading({
				title: '登录中...',
				mask: true
			})
			
			try {
				// 调用登录云函数
				const result = await callCloudFunction('user', {
					action: 'login'
				})
				
				if (result.code === 0) {
					// 保存token到本地
					if (result.data.token) {
						uni.setStorageSync('token', result.data.token)
					}
					if (result.data.tokenExpired) {
						uni.setStorageSync('token_expired', result.data.tokenExpired)
					}
					if (result.data.refreshToken) {
						uni.setStorageSync('refresh_token', result.data.refreshToken)
					}
					
					// 保存用户信息
					const { token, tokenExpired, refreshToken, ...userInfo } = result.data
					uni.setStorageSync('userInfo', userInfo)
					
					uni.showToast({
						title: '登录成功',
						icon: 'success'
					})
					
					// 延迟跳转到首页
					setTimeout(() => {
						uni.reLaunch({
							url: '/pages/index/index'
						})
					}, 1500)
				} else {
					throw new Error(result.message || '登录失败')
				}
			} catch (error) {
				console.error('登录失败：', error)
				uni.showToast({
					title: error.message || '登录失败，请稍后重试',
					icon: 'none'
				})
			} finally {
				this.loading = false
				uni.hideLoading()
			}
		},
		
		showUserAgreement() {
			uni.navigateTo({
				url: '/pages/agreement/user'
			})
		},
		
		showPrivacyPolicy() {
			uni.navigateTo({
				url: '/pages/agreement/privacy'
			})
		}
	}
}
</script>

<style>
.container {
	min-height: 100vh;
	background-color: #f5f5f5;
	display: flex;
	align-items: flex-start;
	justify-content: center;
	padding: 40rpx;
	padding-top: 15vh;
}

.login-card {
	width: 100%;
	background: #fff;
	border-radius: 24rpx;
	padding: 60rpx 40rpx;
	box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.05);
	box-sizing: border-box;
}

.logo-section {
	display: flex;
	flex-direction: column;
	align-items: center;
	margin-bottom: 80rpx;
}

.logo {
	width: 160rpx;
	height: 160rpx;
	margin-bottom: 30rpx;
}

.app-name {
	font-size: 48rpx;
	font-weight: bold;
	color: #333;
	margin-bottom: 16rpx;
}

.slogan {
	font-size: 28rpx;
	color: #999;
}

.login-section {
	display: flex;
	flex-direction: column;
	align-items: center;
}

.wechat-login-btn {
	width: 100%;
	height: 88rpx;
	background: #07c160;
	border-radius: 44rpx;
	color: #fff;
	font-size: 32rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-bottom: 40rpx;
	border: none;
	padding: 0;
}

.wechat-login-btn:active {
	opacity: 0.9;
}

.wechat-icon {
	width: 40rpx;
	height: 40rpx;
	margin-right: 16rpx;
}

.tips {
	font-size: 24rpx;
	color: #999;
	text-align: center;
}

.tip-text {
	margin: 0 4rpx;
}

.link {
	color: #07c160;
	display: inline-block;
}

.link:active {
	opacity: 0.8;
}

.login-btn {
	width: 100%;
	height: 88rpx;
	background: #5985E1;
	border-radius: 44rpx;
	color: #fff;
	font-size: 32rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-bottom: 40rpx;
	border: none;
	padding: 0;
}

.login-btn:active {
	opacity: 0.9;
}
</style>
