<template>
	<view class="content">
		<view class="seachbox">
			<view class="search-section">
				<view class="search-input-box">
					<image src="/static/icon/search.png" class="search-icon"></image>
					<input type="text" v-model="searchKey" placeholder="搜索物品" class="search-input" />
				</view>
				<view class="filter-btn" @tap="showFilterPopup">
					<image src="/static/icon/filter.svg" class="filter-icon" :class="{'active': hasFilter}"></image>
				</view>
				<view class="add-btn" @tap="toAddPage">
					<image src="/static/icon/add.png" class="add-icon"></image>
				</view>
			</view>
			<view class="filter-tags" v-if="hasFilter">
				<view class="filter-tag" @tap="toggleConsumableFilter">
					<text>{{consumableFilter === 'consumable' ? '消耗品' : '非消耗品'}}</text>
					<text class="close-icon">×</text>
				</view>
			</view>
		</view>
		
		<view class="itemlist" v-show="itemList.length > 0">
			<view class="item" v-for="(item, index) in itemList" :key="index" @tap="toDetails(item.id)" @longpress="handleLongPress(item)">
				<view class="icon">
					<image :src="item.icon"></image>
				</view>
				<view class="item-content">
					<view class="name">
						<view class="title">{{item.name}}</view>
						<view class="type" :style="{'background-color': item.typeColor + '1A', 'color': item.typeColor}">{{item.type}}</view>
					</view>
					<view class="desc">
						<text>{{item.description}}</text>
						<text class="quantity">数量：{{item.quantity}}</text>
						<text class="price" v-if="item.price">￥{{item.price}}</text>
					</view>
					<view class="storage-name">
						收纳柜：{{item.storageName}}
					</view>
					<view class="dates">
						<text>添加：{{item.addDate}}</text>
						<text style="margin-left: 20rpx;">到期：{{item.reminderDate}}</text>
					</view>
					<view class="dates">
						<text class="last-modified">变动：{{item.lastModified || '-'}}</text>
					</view>
				</view>
			</view>
		</view>

		<!-- 无数据显示 -->
		<view v-show="itemList.length === 0">
			<view class="none-box">
				<view class="none-box-text">
					<view class="emjoy">(˚Δ˚)b</view>
					<view class="text">暂无物品</view>
					<view class="add-new" @tap="toAddPage">添加物品</view>
				</view>
			</view>
		</view>

		<view class="list-footer">
			<view class="load-more" v-if="hasMore">
				<text @tap="loadMore" v-if="!isLoadingMore">加载更多</text>
				<text v-else>加载中...</text>
			</view>
			<view class="no-more" v-else>
				<text>没有更多了</text>
			</view>
			<view class="tip-text">长按物品可删除</view>
		</view>
	</view>
</template>

<script>
import { callCloudFunction } from '@/utils/cloud.js'
import { formatDate } from '@/utils/date.js'

export default {
	data() {
		return {
			searchKey: '',
			itemList: [],
			pageSize: 10,
			currentPage: 1,
			hasMore: true,
			isLoadingMore: false,
			consumableFilter: 'all', // 'all' | 'consumable' | 'non-consumable'
			hasFilter: false
		}
	},
	onLoad() {
		this.getItemList()
	},
	onShow() {
		// 每次显示页面时刷新数据
		this.refreshList()
	},
	onReachBottom() {
		// 触底加载更多
		if (this.hasMore && !this.isLoadingMore) {
			this.loadMore()
		}
	},
	methods: {
		// 刷新列表
		refreshList() {
			this.currentPage = 1
			this.hasMore = true
			this.getItemList()
		},
		
		// 获取物品列表
		async getItemList(isLoadMore = false) {
			if (this.isLoadingMore) return
			
			this.isLoadingMore = true
			if (!isLoadMore) {
				uni.showLoading({
					title: '加载中...',
					mask: true
				})
			}
			
			try {
				const result = await callCloudFunction('item', {
					action: 'list',
					page: this.currentPage,
					pageSize: this.pageSize,
					keyword: this.searchKey,
					isConsumable: this.consumableFilter === 'all' ? undefined : this.consumableFilter === 'consumable'
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
							id: item._id,
							icon,
							name: item.name,
							type: item.type,
							typeColor: item.typeColor || '#5985E1',
							description: item.description,
							addDate: formatDate(item.createTime),
							reminderDate: item.expiryDate ? formatDate(item.expiryDate) : '-',
							storageName: item.storageName || '未知收纳柜',
							quantity: item.quantity,
							price: item.price,
							lastModified: item.updateTime ? formatDate(item.updateTime) : '-'
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
			} finally {
				this.isLoadingMore = false
				if (!isLoadMore) {
					uni.hideLoading()
				}
			}
		},
		
		// 搜索处理
		handleSearch() {
			// 防抖处理
			if (this.searchTimer) {
				clearTimeout(this.searchTimer)
			}
			this.searchTimer = setTimeout(() => {
				this.refreshList()
			}, 300)
		},
		
		// 加载更多
		async loadMore() {
			if (this.isLoadingMore || !this.hasMore) return
			this.currentPage++
			await this.getItemList(true)
		},
		
		toAddPage() {
			uni.navigateTo({
				url: "/pages/item/addItem"
			})
		},
		
		toDetails(id) {
			uni.navigateTo({
				url: "/pages/item/itemDetails?id=" + id
			})
		},
		
		// 长按处理
		handleLongPress(item) {
			uni.showModal({
				title: '删除确认',
				content: `确定要删除物品"${item.name}"吗？`,
				success: async (res) => {
					if (res.confirm) {
						try {
							uni.showLoading({
								title: '删除中...',
								mask: true
							})
							
							const result = await callCloudFunction('item', {
								action: 'delete',
								id: item.id
							})
							
							if (result.code === 0) {
								uni.showToast({
									title: '删除成功',
									icon: 'success'
								})
								// 刷新列表
								this.refreshList()
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
		},
		
		showFilterPopup() {
			uni.showActionSheet({
				itemList: ['全部物品', '消耗品', '非消耗品'],
				success: (res) => {
					switch(res.tapIndex) {
						case 0:
							this.consumableFilter = 'all'
							this.hasFilter = false
							break
						case 1:
							this.consumableFilter = 'consumable'
							this.hasFilter = true
							break
						case 2:
							this.consumableFilter = 'non-consumable'
							this.hasFilter = true
							break
					}
					this.refreshList()
				}
			})
		},
		
		toggleConsumableFilter() {
			this.consumableFilter = 'all'
			this.hasFilter = false
			this.refreshList()
		}
	},
	watch: {
		searchKey() {
			this.handleSearch()
		}
	}
}
</script>

<style>
	.content {
		padding: 30rpx;
		background-color: #f5f5f5;
		min-height: 100vh;
	}
	
	.seachbox {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		background-color: rgba(255, 255, 255, 0.98);
		padding: 20rpx 30rpx;
		z-index: 999;
		backdrop-filter: blur(10px);
		box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04);
		box-sizing: border-box;
	}
	
	.search-section {
		display: flex;
		align-items: center;
		gap: 16rpx;
	}
	
	.search-input-box {
		display: flex;
		align-items: center;
		background-color: #f1f3f5;
		border-radius: 16rpx;
		padding: 16rpx 24rpx;
		flex: 1;
		transition: all 0.3s;
	}
	
	.search-input-box:active {
		background-color: #e9ecef;
	}
	
	.search-icon {
		width: 32rpx;
		height: 32rpx;
		margin-right: 16rpx;
		opacity: 0.5;
	}
	
	.search-input {
		flex: 1;
		border: none;
		background: none;
		font-size: 28rpx;
		color: #495057;
	}
	
	.filter-btn, .add-btn {
		width: 80rpx;
		height: 80rpx;
		border-radius: 16rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.3s;
	}
	
	.filter-btn {
		background-color: #f1f3f5;
	}
	
	.filter-btn:active {
		background-color: #e9ecef;
	}
	
	.add-btn {
		background: linear-gradient(135deg, #5985E1, #3A66C0);
		box-shadow: 0 4rpx 12rpx rgba(89,133,225,0.2);
	}
	
	.add-btn:active {
		transform: scale(0.95);
		opacity: 0.9;
	}
	
	.filter-icon {
		width: 32rpx;
		height: 32rpx;
		opacity: 0.5;
	}
	
	.filter-icon.active {
		opacity: 1;
		color: #5985E1;
	}
	
	.add-icon {
		width: 32rpx;
		height: 32rpx;
		filter: brightness(0) invert(1);
	}
	
	.filter-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 12rpx;
		margin-top: 16rpx;
		padding: 0 4rpx;
	}
	
	.filter-tag {
		display: inline-flex;
		align-items: center;
		gap: 8rpx;
		background-color: rgba(89,133,225,0.1);
		color: #5985E1;
		font-size: 24rpx;
		padding: 8rpx 16rpx;
		border-radius: 12rpx;
	}
	
	.filter-tag .close-icon {
		font-size: 28rpx;
		opacity: 0.6;
	}
	
	.itemlist {
		margin-top: 132rpx;
		display: flex;
		flex-direction: column;
		gap: 24rpx;
	}
	
	.itemlist .item {
		background: #fff;
		border-radius: 24rpx;
		padding: 30rpx;
		box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.05);
		display: flex;
		align-items: flex-start;
		transition: all 0.3s;
	}
	
	.itemlist .item:active {
		transform: scale(0.98);
		background-color: #fafafa;
	}
	
	.itemlist .item .icon {
		width: 120rpx;
		height: 120rpx;
		border-radius: 20rpx;
		overflow: hidden;
		margin-right: 30rpx;
		flex-shrink: 0;
		background: #f8f8f8;
	}
	
	.itemlist .item .icon image {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	
	.itemlist .item .item-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 16rpx;
		padding: 6rpx 0;
	}
	
	.itemlist .item .item-content .name {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 16rpx;
	}
	
	.itemlist .item .item-content .name .title {
		font-size: 32rpx;
		font-weight: bold;
		color: #333;
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	
	.itemlist .item .item-content .name .type {
		font-size: 22rpx;
		padding: 4rpx 16rpx;
		border-radius: 20rpx;
		flex-shrink: 0;
		max-width: 160rpx;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	
	.itemlist .item .item-content .desc {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 12rpx;
		font-size: 26rpx;
		color: #666;
		line-height: 1.5;
	}
	
	.itemlist .item .item-content .desc text {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	
	.itemlist .item .item-content .desc text:first-child {
		flex: 1;
		min-width: 200rpx;
	}
	
	.itemlist .item .item-content .desc .quantity,
	.itemlist .item .item-content .desc .price {
		color: #5985E1;
		background: rgba(89,133,225,0.1);
		padding: 2rpx 16rpx;
		border-radius: 16rpx;
		font-size: 22rpx;
		flex-shrink: 0;
		max-width: 140rpx;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	
	.itemlist .item .item-content .storage-name {
		font-size: 26rpx;
		color: #666;
	}
	
	.itemlist .item .item-content .dates {
		font-size: 24rpx;
		color: #999;
	}
	
	.itemlist .item .item-content .dates .last-modified {
		color: #ff9800;
	}
	
	.none-box {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 100%;
		text-align: center;
		padding: 0 30rpx;
		box-sizing: border-box;
	}
	
	.none-box .none-box-text .emjoy {
		font-size: 80rpx;
		color: #999;
		margin-bottom: 20rpx;
	}
	
	.none-box .none-box-text .text {
		font-size: 32rpx;
		color: #666;
		margin-bottom: 60rpx;
	}
	
	.none-box .add-new {
		display: inline-block;
		width: 400rpx;
		height: 88rpx;
		line-height: 88rpx;
		background: #5985E1;
		border-radius: 44rpx;
		color: #fff;
		font-size: 30rpx;
		box-shadow: 0 4rpx 12rpx rgba(89,133,225,0.3);
		transition: all 0.3s;
	}
	
	.none-box .add-new:active {
		transform: scale(0.98);
		box-shadow: 0 2rpx 6rpx rgba(89,133,225,0.3);
	}

	.list-footer {
		padding: 30rpx 0;
		text-align: center;
	}

	.load-more text, .no-more text {
		font-size: 26rpx;
		color: #868e96;
		background: #f8f9fa;
		padding: 12rpx 30rpx;
		border-radius: 30rpx;
	}

	.tip-text {
		font-size: 24rpx;
		color: #adb5bd;
		text-align: center;
		margin-top: 16rpx;
	}
</style>
