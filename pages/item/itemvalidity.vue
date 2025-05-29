<template>
	<view class="container">
		<!-- 搜索和筛选区域 -->
		<view class="filter-box">
			<view class="search-box">
				<image src="/static/icon/search.png" class="search-icon"></image>
				<input type="text" v-model="keyword" placeholder="搜索物品" class="search-input" @input="handleSearch"/>
			</view>
			<view class="days-filter">
				<text :class="{'active': days === 7}" @tap="setDays(7)">7天</text>
				<text :class="{'active': days === 30}" @tap="setDays(30)">30天</text>
				<text :class="{'active': days === 90}" @tap="setDays(90)">90天</text>
			</view>
		</view>
		
		<!-- 有效期列表 -->
		<view class="validity-list">
			<view class="item" v-for="(item, index) in itemList" :key="index" @tap="toItemDetail(item)">
				<view class="item-left">
					<image :src="item.icon" class="item-icon"></image>
					<view class="item-info">
						<view class="item-name">{{item.name}}</view>
						<view class="item-type">{{item.type}}</view>
						<view class="storage-name">{{item.storageName}}</view>
					</view>
				</view>
				<view class="item-right">
					<view class="item-quantity">{{item.quantity}}件</view>
					<view class="expiry-date" :class="{'expired': isExpired(item.expiryDate)}">
						{{isExpired(item.expiryDate) ? '已过期' : '到期'}}：{{formatDate(item.expiryDate)}}
					</view>
				</view>
			</view>
			
			<!-- 加载更多 -->
			<view class="load-more" v-if="hasMore">
				<text @tap="loadMore" v-if="!isLoadingMore">加载更多</text>
				<text v-else>加载中...</text>
			</view>
			<view class="no-more" v-else-if="itemList.length > 0">
				<text>没有更多数据了</text>
			</view>
			<view class="empty" v-if="itemList.length === 0">
				<text>暂无即将过期的物品</text>
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
				itemList: [],
				pageSize: 10,
				currentPage: 1,
				hasMore: true,
				isLoadingMore: false,
				loading: false,
				keyword: '',  // 搜索关键词
				days: 30,    // 天数筛选
				searchTimer: null  // 用于防抖
			}
		},
		onLoad() {
			this.getValidityList()
		},
		methods: {
			// 处理搜索
			handleSearch() {
				if (this.searchTimer) {
					clearTimeout(this.searchTimer)
				}
				this.searchTimer = setTimeout(() => {
					this.currentPage = 1
					this.getValidityList()
				}, 300)
			},
			
			// 设置天数
			setDays(days) {
				this.days = days
				this.currentPage = 1
				this.getValidityList()
			},
			
			// 获取有效期列表
			async getValidityList(isLoadMore = false) {
				if (this.loading) return
				
				this.loading = true
				if (!isLoadMore) {
					uni.showLoading({
						title: '加载中...',
						mask: true
					})
				}
				
				try {
					const result = await callCloudFunction('item', {
						action: 'getValidityList',
						page: this.currentPage,
						pageSize: this.pageSize,
						days: this.days,
						keyword: this.keyword
					})
					
					if (result.code === 0) {
						const formattedItems = await Promise.all(result.data.list.map(async item => {
							let icon = item.icon
							if (item.useImageAsIcon) {
								icon = item.image
							}
							
							if (icon.startsWith('cloud://')) {
								// 如果是云存储文件，获取临时访问链接
								const { fileList } = await uniCloud.getTempFileURL({
									fileList: [icon]
								})
								if (fileList && fileList[0] && fileList[0].tempFileURL) {
									icon = fileList[0].tempFileURL
								}
							} else if (!item.useImageAsIcon) {
								// 如果是本地图标且不是使用图片作为图标，添加路径前缀
								icon = `/static/images/item/${icon}`
							}
							
							return {
								...item,
								icon
							}
						}))

						if (isLoadMore) {
							this.itemList = [...this.itemList, ...formattedItems]
						} else {
							this.itemList = formattedItems
						}
						
						this.hasMore = formattedItems.length === this.pageSize
					} else {
						uni.showToast({
							title: result.message || '获取失败',
							icon: 'none'
						})
					}
				} catch (error) {
					console.error('获取有效期列表失败：', error)
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
				await this.getValidityList(true)
				this.isLoadingMore = false
			},
			
			// 跳转到物品详情
			toItemDetail(item) {
				uni.navigateTo({
					url: `/pages/item/itemDetails?id=${item._id}`
				})
			},
			
			// 判断是否过期
			isExpired(date) {
				if (!date) return false
				return new Date(date) < new Date()
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
	
	.filter-box {
		margin-bottom: 30rpx;
	}
	
	.search-box {
		display: flex;
		align-items: center;
		background: #fff;
		border-radius: 24rpx;
		padding: 20rpx;
		margin-bottom: 20rpx;
		box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.05);
	}
	
	.search-icon {
		width: 40rpx;
		height: 40rpx;
		margin-right: 20rpx;
	}
	
	.search-input {
		flex: 1;
		font-size: 28rpx;
		color: #333;
	}
	
	.days-filter {
		display: flex;
		background: #fff;
		border-radius: 24rpx;
		padding: 20rpx;
		box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.05);
	}
	
	.days-filter text {
		flex: 1;
		text-align: center;
		font-size: 28rpx;
		color: #666;
		padding: 10rpx 0;
		border-radius: 8rpx;
		transition: all 0.3s;
	}
	
	.days-filter text.active {
		color: #5985E1;
		background: rgba(89,133,225,0.1);
	}
	
	.validity-list {
		background: #fff;
		border-radius: 24rpx;
		padding: 20rpx;
		box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.05);
	}
	
	.item {
		display: flex;
		justify-content: space-between;
		padding: 30rpx 20rpx;
		border-bottom: 1px solid #f5f5f5;
		transition: all 0.3s;
	}
	
	.item:active {
		background-color: #f9f9f9;
	}
	
	.item:last-child {
		border-bottom: none;
	}
	
	.item-left {
		display: flex;
		gap: 24rpx;
		flex: 1;
	}
	
	.item-icon {
		width: 88rpx;
		height: 88rpx;
		border-radius: 16rpx;
	}
	
	.item-info {
		flex: 1;
	}
	
	.item-name {
		font-size: 30rpx;
		color: #333;
		margin-bottom: 12rpx;
	}
	
	.item-type {
		font-size: 24rpx;
		color: #5985E1;
		background: rgba(89,133,225,0.1);
		padding: 4rpx 20rpx;
		border-radius: 20rpx;
		display: inline-block;
		margin-bottom: 8rpx;
	}
	
	.storage-name {
		font-size: 26rpx;
		color: #666;
	}
	
	.item-right {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
	}
	
	.item-quantity {
		font-size: 28rpx;
		color: #5985E1;
		font-weight: bold;
		margin-bottom: 12rpx;
	}
	
	.expiry-date {
		font-size: 24rpx;
		color: #ff9800;
	}
	
	.expiry-date.expired {
		color: #ff4d4f;
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
