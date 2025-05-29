<template>
	<view class="container">
		<view class="version-list">
			<view class="version-item" v-for="(item, index) in versionList" :key="index">
				<view class="version-header">
					<text class="version-number">v{{item.version}}</text>
					<text class="version-time">{{formatDate(item.createTime)}}</text>
				</view>
				<view class="version-content">
					<text class="content-text">{{item.content}}</text>
				</view>
			</view>
			
			<view class="empty" v-if="versionList.length === 0">
				<text>暂无版本记录</text>
			</view>
		</view>
	</view>
</template>

<script>
	import { callCloudFunction } from '@/utils/cloud.js'
	import { formatDate } from '@/utils/date.js'
	
	export default {
		data() {
			return {
				versionList: []
			}
		},
		onLoad() {
			this.getVersionList()
		},
		methods: {
			// 获取版本列表
			async getVersionList() {
				uni.showLoading({
					title: '加载中...',
					mask: true
				})
				
				try {
					const result = await callCloudFunction('version', {
						action: 'list'
					})
					
					if (result.code === 0) {
						this.versionList = result.data
					} else {
						uni.showToast({
							title: result.message || '获取失败',
							icon: 'none'
						})
					}
				} catch (error) {
					console.error('获取版本列表失败：', error)
					uni.showToast({
						title: '获取失败，请稍后重试',
						icon: 'none'
					})
				} finally {
					uni.hideLoading()
				}
			},
			
			formatDate(date) {
				return formatDate(date)
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

.version-list {
	background: #fff;
	border-radius: 24rpx;
	padding: 20rpx;
	box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.05);
}

.version-item {
	padding: 30rpx;
	border-bottom: 1px solid #f5f5f5;
}

.version-item:last-child {
	border-bottom: none;
}

.version-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 16rpx;
}

.version-number {
	font-size: 32rpx;
	font-weight: bold;
	color: #333;
}

.version-time {
	font-size: 24rpx;
	color: #999;
}

.version-content {
	font-size: 28rpx;
	color: #666;
	line-height: 1.5;
}

.content-text {
	white-space: pre-wrap;
}

.empty {
	text-align: center;
	padding: 40rpx 0;
	color: #999;
	font-size: 28rpx;
}
</style> 