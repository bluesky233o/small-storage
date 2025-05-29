<template>
	<view class="container">
		<!-- 搜索框 -->
		<view class="search-box">
			<input 
				type="text" 
				v-model="searchKeyword"
				placeholder="搜索物品名称"
				@input="handleSearch"
				class="search-input"
			/>
		</view>

		<!-- 日志列表 -->
		<view class="log-list">
			<view class="item" v-for="(item, index) in logList" :key="index">
				<view class="item-left">
					<image :src="getItemIcon(item)" class="item-icon"></image>
					<view class="item-info">
						<view class="item-name">{{item.itemName}}</view>
						<view class="item-type" :class="{'add': item.type === 'add', 'reduce': item.type === 'reduce'}">
							{{item.type === 'add' ? '入库' : '出库'}}
						</view>
						<view class="operator">操作人：{{item.operatorName || '未知用户'}}</view>
					</view>
				</view>
				<view class="item-right">
					<view class="item-quantity" :class="{'reduce': item.type === 'reduce'}">{{item.type === 'add' ? '+' : '-'}}{{item.quantity}}件</view>
					<view class="create-time">{{formatDate(item.createTime)}}</view>
				</view>
			</view>
			
			<!-- 加载更多 -->
			<view class="load-more" v-if="hasMore">
				<text @tap="loadMore" v-if="!isLoadingMore">加载更多</text>
				<text v-else>加载中...</text>
			</view>
			<view class="no-more" v-else-if="logList.length > 0">
				<text>没有更多数据了</text>
			</view>
			<view class="empty" v-if="logList.length === 0">
				<text>暂无操作记录</text>
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
				logList: [],
				pageSize: 10,
				currentPage: 1,
				hasMore: true,
				isLoadingMore: false,
				loading: false,
				itemId: '',
				searchKeyword: '',
				searchTimer: null  // 添加防抖定时器
			}
		},
		onLoad(options) {
			if (options.itemId) {
				this.itemId = options.itemId
			}
			this.getLogList()
		},
		methods: {
			// 获取日志列表
			async getLogList(isLoadMore = false) {
				if (this.loading) return;
				
				this.loading = true;
				if (!isLoadMore) {
					uni.showLoading({
						title: '加载中...',
						mask: true
					});
				}
				
				try {
					const result = await callCloudFunction('item', {
						action: 'getLogList',
						page: this.currentPage,
						pageSize: this.pageSize,
						keyword: this.searchKeyword
					});
					
					if (result.code === 0) {
						const formattedLogs = await Promise.all(result.data.list.map(async log => {
							let icon = log.icon;
							if (icon && icon.startsWith('cloud://')) {
								// 如果是云存储文件，获取临时访问链接
								const { fileList } = await uniCloud.getTempFileURL({
									fileList: [icon]
								});
								if (fileList && fileList[0] && fileList[0].tempFileURL) {
									icon = fileList[0].tempFileURL;
								}
							} else if (icon && !icon.startsWith('http')) {
								// 如果是本地图标，添加路径前缀
								icon = `/static/images/item/${icon}`;
							} else if (!icon) {
								// 如果没有图标，使用默认图标
								icon = '/static/images/item/storagebox.svg';
							}
							
							return {
								...log,
								icon
							};
						}));

						if (isLoadMore) {
							this.logList = [...this.logList, ...formattedLogs];
						} else {
							this.logList = formattedLogs;
						}
						
						this.hasMore = formattedLogs.length === this.pageSize;
					} else {
						uni.showToast({
							title: result.message || '获取失败',
							icon: 'none'
						});
					}
				} catch (error) {
					console.error('获取日志列表失败：', error);
					uni.showToast({
						title: '获取失败，请稍后重试',
						icon: 'none'
					});
				} finally {
					this.loading = false;
					if (!isLoadMore) {
						uni.hideLoading();
					}
				}
			},
			
			// 获取物品图标
			getItemIcon(item) {
				if (!item.icon) {
					return '/static/images/item/storagebox.svg';
				}
				return item.icon;
			},
			
			// 加载更多
			async loadMore() {
				if (this.isLoadingMore || !this.hasMore) return
				
				this.isLoadingMore = true
				this.currentPage++
				await this.getLogList(true)
				this.isLoadingMore = false
			},
			
			// 处理搜索
			handleSearch() {
				// 防抖处理
				if (this.searchTimer) {
					clearTimeout(this.searchTimer)
				}
				this.searchTimer = setTimeout(() => {
					this.currentPage = 1
					this.logList = []
					this.hasMore = true
					this.getLogList()
				}, 300)
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
	
	.search-box {
		margin-bottom: 20rpx;
	}
	
	.search-input {
		width: 100%;
		height: 80rpx;
		background: #fff;
		border-radius: 40rpx;
		padding: 0 30rpx;
		font-size: 28rpx;
		box-sizing: border-box;
		box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.05);
	}
	
	.log-list {
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
		padding: 4rpx 20rpx;
		border-radius: 20rpx;
		display: inline-block;
		margin-bottom: 8rpx;
	}
	
	.item-type.add {
		color: #52c41a;
		background: rgba(82,196,26,0.1);
	}
	
	.item-type.reduce {
		color: #ff4d4f;
		background: rgba(255,77,79,0.1);
	}
	
	.operator {
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
		font-weight: bold;
		margin-bottom: 12rpx;
	}
	
	.item-quantity.reduce {
		color: #ff4d4f;
	}
	
	.item-quantity:not(.reduce) {
		color: #52c41a;
	}
	
	.create-time {
		font-size: 24rpx;
		color: #999;
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

