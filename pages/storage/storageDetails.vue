<template>
	<view class="container">
		<!-- 收纳柜基本信息 -->
		<view class="storage-info">
			<view class="storage-header">
				<image :src="storage.icon" class="storage-icon"></image>
				<view class="storage-basic">
					<view class="name">{{storage.name}}</view>
					<view class="info-group">
						<text class="type" :style="{'background-color': storage.typeColor + '1A', 'color': storage.typeColor}">{{storage.type}}</text>
						<text class="quantity">{{storage.itemCount}}件物品</text>
					</view>
					<view class="desc">{{storage.description}}</view>
					<view class="dates-row">
						<text>添加：{{storage.createTime}}</text>
					</view>
				</view>
			</view>
		</view>
		
		<!-- 物品列表 -->
		<view class="items-section">
			<view class="section-header">
				<text class="section-title">收纳物品</text>
				<view class="add-item-btn" @tap="toAddItem">
					<image src="/static/icon/add.png" class="add-icon"></image>
					<text>添加物品</text>
				</view>
			</view>

			<!-- 搜索框 -->
			<view class="search-box">
				<input 
					type="text" 
					v-model="searchKeyword"
					placeholder="搜索物品名称"
					@input="handleSearch"
				/>
			</view>
		
			<view class="item-list">
				<uni-swipe-action>
					<uni-swipe-action-item v-for="(item, index) in itemList" 
						:key="index"
						:right-options="swipeOptions" 
						@click="handleSwipeClick($event, item)"
					>
						<view class="item" @tap="toItemDetail(item)">
							<view class="item-left">
								<image :src="item.icon" class="item-icon"></image>
								<view class="item-info">
									<view class="item-name">{{item.name}}</view>
									<view class="item-type" :style="{'background-color': item.typeColor + '1A', 'color': item.typeColor}">{{item.type}}</view>
									<view class="item-desc">{{item.description}}</view>
								</view>
							</view>
							<view class="item-right">
								<view class="item-quantity">{{item.quantity}}件</view>
								<view class="expiry-date" v-if="item.reminderDate">
									<text :class="{'expired': isExpired(item.reminderDate)}">
										{{isExpired(item.reminderDate) ? '已过期' : '到期'}}：{{item.reminderDate}}
									</text>
								</view>
								<view class="expiry-date no-date" v-else>
									<text>未设置到期日期</text>
								</view>
							</view>
						</view>
					</uni-swipe-action-item>
				</uni-swipe-action>

				<!-- 加载更多 -->
				<view class="load-more" v-if="hasMore">
					<text @tap="loadMore" v-if="!isLoadingMore">加载更多</text>
					<text v-else>加载中...</text>
				</view>
				<view class="no-more" v-else-if="itemList.length > 0">
					<text>没有更多数据了</text>
				</view>
				<view class="empty" v-if="itemList.length === 0">
					<text>暂无物品</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import { callCloudFunction } from '@/utils/cloud.js'
import { formatDate } from '@/utils/date.js'
import uniSwipeAction from '@dcloudio/uni-ui/lib/uni-swipe-action/uni-swipe-action.vue'
import uniSwipeActionItem from '@dcloudio/uni-ui/lib/uni-swipe-action-item/uni-swipe-action-item.vue'

export default {
	components: {
		uniSwipeAction,
		uniSwipeActionItem
	},
	data() {
		return {
			id: '',          // 收纳柜ID
			storage: {},     // 收纳柜信息
			itemList: [],    // 物品列表
			loading: false,
			needRefresh: false, // 是否需要刷新
			searchKeyword: '', // 搜索关键词
			pageSize: 10,     // 每页数量
			currentPage: 1,   // 当前页码
			hasMore: true,    // 是否还有更多数据
			isLoadingMore: false, // 是否正在加载更多
			swipeOptions: [{
				text: '删除',
				style: {
					backgroundColor: '#ff4d4f'
				}
			}]
		}
	},
	onLoad(options) {
		if (options.id) {
			this.id = options.id
			this.getStorageDetail()
		}
	},
	onShow() {
		// 如果需要刷新，重新获取数据
		if (this.needRefresh) {
			this.needRefresh = false;
			// 重置页码和列表数据
			this.currentPage = 1;
			this.itemList = [];
			this.hasMore = true;
			this.getStorageDetail();
		}
	},
	methods: {
		// 获取收纳柜详情
		async getStorageDetail() {
			if (this.loading) return
			
			this.loading = true
			uni.showLoading({
				title: '加载中...',
				mask: true
			})
			
			try {
				const result = await callCloudFunction('storage', {
					action: 'detail',
					id: this.id
				})
				
				if (result.code === 0) {
					// 处理图标路径
					let icon = result.data.icon
					if (icon.startsWith('cloud://')) {
						// 如果是云存储文件，获取临时访问链接
						const { fileList } = await uniCloud.getTempFileURL({
							fileList: [icon]
						})
						if (fileList && fileList[0] && fileList[0].tempFileURL) {
							icon = fileList[0].tempFileURL
						}
					} else {
						// 如果是本地图标，添加路径前缀和后缀
						icon = icon.startsWith('/') ? icon : `/static/images/storage/${icon}.svg`
					}
					
					this.storage = {
						...result.data,
						createTime: formatDate(result.data.createTime),
						icon
					}
					// 获取物品列表
					await this.getItemList()
				} else {
					uni.showToast({
						title: result.message || '获取失败',
						icon: 'none'
					})
				}
			} catch (error) {
				console.error('获取收纳柜详情失败：', error)
				uni.showToast({
					title: '获取失败，请稍后重试',
					icon: 'none'
				})
			} finally {
				this.loading = false
				uni.hideLoading()
			}
		},
		
		// 获取物品列表
		async getItemList(isLoadMore = false) {
			try {
				const result = await callCloudFunction('item', {
					action: 'list',
					storageId: this.id,
					page: this.currentPage,
					pageSize: this.pageSize,
					keyword: this.searchKeyword
				})
				
				if (result.code === 0) {
					const formattedItems = await Promise.all(result.data.items.map(async item => {
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
							reminderDate: item.expiryDate ? formatDate(item.expiryDate) : '',
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
						title: result.message || '获取物品列表失败',
						icon: 'none'
					})
				}
			} catch (error) {
				console.error('获取物品列表失败：', error)
				uni.showToast({
					title: '获取物品列表失败，请稍后重试',
					icon: 'none'
				})
			}
		},
		
		// 跳转到添加物品页面
		toAddItem() {
			uni.navigateTo({
				url: `/pages/item/addItem?storageId=${this.id}`
			})
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
		
		// 获取物品图标
		getItemIcon(item) {
			if (item.useImageAsIcon && item.image) {
				return item.image;
			}
			return item.icon ? `/static/images/item/${item.icon}` : '/static/images/item/default.svg';
		},
		
		// 预览图片
		previewImage(image) {
			if (image) {
				uni.previewImage({
					urls: [image]
				});
			}
		},
		
		// 处理左滑删除
		async handleSwipeClick(e, item) {
			if (e.index === 0) { // 删除操作
				uni.showModal({
					title: '提示',
					content: '确定要删除该物品吗？',
					success: async (res) => {
						if (res.confirm) {
							uni.showLoading({
								title: '删除中...',
								mask: true
							})
							
							try {
								const result = await callCloudFunction('item', {
									action: 'delete',
									id: item._id
								})
								
								if (result.code === 0) {
									uni.showToast({
										title: '删除成功',
										icon: 'success'
									})
									// 刷新列表
									this.currentPage = 1
									await this.getStorageDetail()
								} else {
									uni.showToast({
										title: result.message || '删除失败',
										icon: 'none'
									})
								}
							} catch (error) {
								console.error('删除物品失败：', error)
								uni.showToast({
									title: '删除失败，请稍后重试',
									icon: 'none'
								})
							} finally {
								uni.hideLoading()
							}
						}
					}
				})
			}
		},

		// 处理搜索
		handleSearch() {
			this.currentPage = 1
			this.itemList = []
			this.hasMore = true
			this.getItemList()
		},

		// 加载更多
		async loadMore() {
			if (this.isLoadingMore || !this.hasMore) return
			
			this.isLoadingMore = true
			this.currentPage++
			await this.getItemList(true)
			this.isLoadingMore = false
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

.storage-info {
	background: #fff;
	border-radius: 24rpx;
	padding: 30rpx;
	margin-bottom: 30rpx;
	box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.05);
}

.storage-header {
	display: flex;
	align-items: flex-start;
	margin-bottom: 20rpx;
}

.storage-icon {
	width: 120rpx;
	height: 120rpx;
	margin-right: 30rpx;
	border-radius: 20rpx;
}

.storage-basic {
	flex: 1;
	padding: 6rpx 0;
}

.storage-basic .name {
	font-size: 36rpx;
	font-weight: bold;
	color: #333;
	margin-bottom: 16rpx;
}

.info-group {
	display: flex;
	align-items: center;
	gap: 20rpx;
	margin-bottom: 16rpx;
}

.type {
	font-size: 24rpx;
	padding: 4rpx 20rpx;
	border-radius: 20rpx;
}

.quantity {
	font-size: 24rpx;
	color: #5985E1;
	background: rgba(89,133,225,0.1);
	padding: 4rpx 20rpx;
	border-radius: 20rpx;
}

.desc {
	font-size: 28rpx;
	color: #666;
	margin-bottom: 16rpx;
	line-height: 1.5;
}

.dates-row {
	display: flex;
	gap: 30rpx;
	font-size: 24rpx;
	color: #999;
	margin-top: 10rpx;
}

.items-section {
	background: #fff;
	border-radius: 24rpx;
	padding: 30rpx;
	box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.05);
}

.section-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 30rpx;
	padding-bottom: 20rpx;
	border-bottom: 1px solid #f0f0f0;
}

.section-title {
	font-size: 32rpx;
	font-weight: bold;
	color: #333;
}

.add-item-btn {
	display: flex;
	align-items: center;
	gap: 8rpx;
	padding: 12rpx 24rpx;
	background: rgba(89,133,225,0.1);
	border-radius: 30rpx;
	transition: all 0.3s;
}

.add-item-btn:active {
	background: rgba(89,133,225,0.2);
}

.add-item-btn .add-icon {
	width: 28rpx;
	height: 28rpx;
}

.add-item-btn text {
	font-size: 26rpx;
	color: #5985E1;
}

.item-list {
	display: flex;
	flex-direction: column;
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
	padding: 4rpx 20rpx;
	border-radius: 20rpx;
	display: inline-block;
}

.item-desc {
	font-size: 28rpx;
	color: #666;
	margin-bottom: 16rpx;
	line-height: 1.5;
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
	color: #999;
	margin-bottom: 12rpx;
}

.expiry-date.expired {
	color: #ff0000;
}

.expiry-date.no-date {
	color: #999;
}

.search-box {
	margin-bottom: 20rpx;
	padding: 0 20rpx;
}

.search-box input {
	background: #f5f5f5;
	height: 70rpx;
	border-radius: 35rpx;
	padding: 0 30rpx;
	font-size: 28rpx;
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
