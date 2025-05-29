<template>
	<view class="container">
		<view class="about-card">
			<view class="logo-section">
				<image src="/static/logo.png" class="logo" mode="aspectFit"></image>
				<text class="app-name">小小收纳</text>
				<text class="version">v{{version}}</text>
			</view>
			
			<view class="content-section">
				<text class="content">{{content}}</text>
			</view>
		</view>
	</view>
</template>

<script>
	import { callCloudFunction } from '@/utils/cloud.js'
	
	export default {
		data() {
			return {
				version: '',
				content: ''
			}
		},
		onLoad() {
			this.getAboutInfo()
		},
		methods: {
			async getAboutInfo() {
				uni.showLoading({
					title: '加载中...',
					mask: true
				})
				
				try {
					const result = await callCloudFunction('config', {
						action: 'getAbout'
					})
					
					if (result.code === 0) {
						this.version = result.data.version
						this.content = result.data.content
					} else {
						uni.showToast({
							title: result.message || '获取失败',
							icon: 'none'
						})
					}
				} catch (error) {
					console.error('获取关于信息失败：', error)
					uni.showToast({
						title: '获取失败，请稍后重试',
						icon: 'none'
					})
				} finally {
					uni.hideLoading()
				}
			}
		}
	}
</script>

<style>
.container {
	padding: 30rpx;
	background-color: #f5f5f5;
	min-height: 100vh;
}

.about-card {
	background: #fff;
	border-radius: 24rpx;
	padding: 40rpx;
	box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.05);
}

.logo-section {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 40rpx 0;
	border-bottom: 1px solid #f5f5f5;
}

.logo {
	width: 160rpx;
	height: 160rpx;
	margin-bottom: 20rpx;
}

.app-name {
	font-size: 36rpx;
	font-weight: bold;
	color: #333;
	margin-bottom: 12rpx;
}

.version {
	font-size: 24rpx;
	color: #999;
}

.content-section {
	padding: 40rpx 0;
}

.content {
	font-size: 28rpx;
	color: #666;
	line-height: 1.8;
	white-space: pre-wrap;
}
</style> 