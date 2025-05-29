<template>
	<view class="container">
		<!-- 提交按钮 -->
		<view class="submit-section">
			<button class="submit-btn" @tap="toSubmitFeedback">提交反馈</button>
		</view>
		
		<!-- 反馈列表 -->
		<view class="feedback-list">
			<view class="feedback-item" v-for="(item, index) in feedbackList" :key="index">
				<view class="feedback-header">
					<text class="feedback-title">{{item.title}}</text>
					<text class="feedback-time">{{formatDate(item.createTime)}}</text>
				</view>
				<view class="feedback-content">{{item.content}}</view>
				<view class="feedback-status" v-if="item.reply">
					<view class="reply-title">官方回复：</view>
					<view class="reply-content">{{item.reply}}</view>
					<view class="reply-time">{{formatDate(item.replyTime)}}</view>
				</view>
			</view>
			
			<!-- 加载更多 -->
			<view class="load-more" v-if="hasMore">
				<text @tap="loadMore" v-if="!isLoadingMore">加载更多</text>
				<text v-else>加载中...</text>
			</view>
			<view class="no-more" v-else-if="feedbackList.length > 0">
				<text>没有更多数据了</text>
			</view>
			<view class="empty" v-if="feedbackList.length === 0">
				<text>暂无反馈记录</text>
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
				feedbackList: [],
				pageSize: 10,
				currentPage: 1,
				hasMore: true,
				isLoadingMore: false,
				loading: false
			}
		},
		onShow() {
			// 如果需要刷新，重新获取数据
			if (this.needRefresh) {
				this.needRefresh = false
				this.currentPage = 1
				this.feedbackList = []
				this.hasMore = true
				this.getFeedbackList()
			}
		},
		onLoad() {
			this.getFeedbackList()
		},
		methods: {
			// 跳转到提交反馈页面
			toSubmitFeedback() {
				uni.navigateTo({
					url: '/pages/feedback/submitFeedback'
				})
			},
			
			// 获取反馈列表
			async getFeedbackList(isLoadMore = false) {
				if (this.loading) return
				
				this.loading = true
				if (!isLoadMore) {
					uni.showLoading({
						title: '加载中...',
						mask: true
					})
				}
				
				try {
					const result = await callCloudFunction('feedback', {
						action: 'list',
						page: this.currentPage,
						pageSize: this.pageSize
					})
					
					if (result.code === 0) {
						const formattedList = result.data.list.map(item => ({
							...item,
							createTime: formatDate(item.createTime),
							replyTime: item.replyTime ? formatDate(item.replyTime) : null
						}))
						
						if (isLoadMore) {
							this.feedbackList = [...this.feedbackList, ...formattedList]
						} else {
							this.feedbackList = formattedList
						}
						
						this.hasMore = formattedList.length === this.pageSize
					} else {
						uni.showToast({
							title: result.message || '获取失败',
							icon: 'none'
						})
					}
				} catch (error) {
					console.error('获取反馈列表失败：', error)
					uni.showToast({
						title: '获取失败，请稍后重试',
						icon: 'none'
					})
				} finally {
					this.loading = false
					if (!isLoadMore) {
						uni.hideLoading()
					}
				}
			},
			
			// 加载更多
			async loadMore() {
				if (this.isLoadingMore || !this.hasMore) return
				
				this.isLoadingMore = true
				this.currentPage++
				await this.getFeedbackList(true)
				this.isLoadingMore = false
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

.submit-section {
	margin-bottom: 30rpx;
}

.submit-btn {
	width: 100%;
	height: 88rpx;
	line-height: 88rpx;
	background: #5985E1;
	border-radius: 44rpx;
	color: #fff;
	font-size: 30rpx;
	text-align: center;
	box-shadow: 0 4rpx 12rpx rgba(89,133,225,0.3);
}

.submit-btn:active {
	transform: scale(0.98);
	box-shadow: 0 2rpx 6rpx rgba(89,133,225,0.3);
}

.feedback-list {
	background: #fff;
	border-radius: 24rpx;
	padding: 20rpx;
	box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.05);
}

.feedback-item {
	padding: 30rpx;
	border-bottom: 1px solid #f5f5f5;
}

.feedback-item:last-child {
	border-bottom: none;
}

.feedback-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 16rpx;
}

.feedback-title {
	font-size: 32rpx;
	font-weight: bold;
	color: #333;
}

.feedback-time {
	font-size: 24rpx;
	color: #999;
}

.feedback-content {
	font-size: 28rpx;
	color: #666;
	line-height: 1.5;
	margin-bottom: 20rpx;
}

.feedback-status {
	background: #f8f8f8;
	padding: 20rpx;
	border-radius: 12rpx;
}

.reply-title {
	font-size: 26rpx;
	color: #333;
	font-weight: bold;
	margin-bottom: 12rpx;
}

.reply-content {
	font-size: 26rpx;
	color: #666;
	line-height: 1.5;
	margin-bottom: 12rpx;
}

.reply-time {
	font-size: 24rpx;
	color: #999;
	text-align: right;
}

.load-more {
	text-align: center;
	padding: 20rpx 0;
}

.load-more text {
	font-size: 28rpx;
	color: #666;
}

.no-more {
	text-align: center;
	padding: 20rpx 0;
	color: #999;
	font-size: 24rpx;
}

.empty {
	text-align: center;
	padding: 40rpx 0;
	color: #999;
	font-size: 28rpx;
}
</style> 