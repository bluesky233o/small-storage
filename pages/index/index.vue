<template>
	<view class="container">
		<!-- 搜索区域 -->
		<view class="search-area">
			<view class="search-bar">
				<text class="icon-search">🔍</text>
				<input 
					type="text" 
					v-model="searchKey" 
					placeholder="搜索收纳柜" 
					class="search-input"
					@confirm="handleSearch"
				/>
			</view>
			<view class="add-button" @tap="toAddPage">
				<text class="icon-add">+</text>
			</view>
		</view>
		
		<!-- 收纳柜列表 -->
		<view 
			class="storage-list" 
			v-if="storageList.length > 0"
		>
			<view class="storage-card" 
				v-for="(storage, index) in storageList" 
				:key="index"
				@tap="toDetails(storage.id)"
				@longpress="handleLongPress(storage)"
			>
				<view class="card-content">
					<view class="icon-wrapper" :style="{ backgroundColor: storage.typeColor + '10' }">
						<image :src="storage.icon" mode="aspectFit" class="storage-icon"></image>
					</view>
					<view class="info-wrapper">
						<view class="title-row">
							<text class="storage-name">{{storage.name}}</text>
							<view class="type-tag" :style="{ 
								backgroundColor: storage.typeColor + '15',
								color: storage.typeColor
							}">{{storage.type}}</view>
						</view>
						<text class="description" v-if="storage.description">{{storage.description}}</text>
						<view class="meta-row">
							<text class="date">{{storage.createTime}}</text>
							<view class="count-badge">
								<text class="count-number">{{storage.itemCount}}</text>
								<text class="count-label">件物品</text>
							</view>
						</view>
					</view>
				</view>
			</view>
			
			<!-- 列表底部 -->
			<view class="list-footer">
				<view class="load-more" v-if="hasMore">
					<text @tap="loadMore" v-if="!isLoadingMore">加载更多</text>
					<text v-else>加载中...</text>
				</view>
				<view class="no-more" v-else>
					<text>没有更多了</text>
				</view>
				<view class="tip-text">长按收纳柜可删除</view>
			</view>
		</view>
		
		<!-- 空状态 -->
		<view class="empty-state" v-else>
			<view class="empty-content">
				<text class="empty-emoji">🏠</text>
				<text class="empty-title">开始整理你的空间</text>
				<text class="empty-desc">创建一个收纳柜，开始记录物品吧</text>
				<button class="create-button" @tap="toAddPage">
					<text class="button-icon">+</text>
					<text>创建收纳柜</text>
				</button>
			</view>
		</view>
	</view>
</template>

<script>
import { checkLogin, toLogin } from '@/utils/auth.js'
import { callCloudFunction } from '@/utils/cloud.js'
import { formatDate } from '@/utils/date.js'

export default {
	data() {
		return {
			searchKey: '',
			storageList: [],
			pageSize: 10,
			currentPage: 1,
			hasMore: true,
			isLoadingMore: false
		}
	},
	onLoad() {
		if (!checkLogin()) {
			toLogin()
			return
		}
		this.getStorageList()
	},
	onShow() {
		this.refreshList()
	},
	// 添加页面触底生命周期
	onReachBottom() {
		if (this.hasMore && !this.isLoadingMore) {
			this.loadMore()
		}
	},
	methods: {
		refreshList() {
			this.currentPage = 1
			this.hasMore = true
			this.getStorageList()
		},
		
		async getStorageList(isLoadMore = false) {
			if (this.isLoadingMore) return
			
			this.isLoadingMore = true
			if (!isLoadMore) {
				uni.showLoading({
					title: '加载中...',
					mask: true
				})
			}
			
			try {
				const result = await callCloudFunction('storage', {
					action: 'list',
					page: this.currentPage,
					pageSize: this.pageSize,
					keyword: this.searchKey
				})
				
				if (result.code === 0) {
					const formattedStorages = await Promise.all((result.data.list || []).map(async storage => {
						let icon = storage.icon
						if (icon.startsWith('cloud://')) {
							const { fileList } = await uniCloud.getTempFileURL({
								fileList: [icon]
							})
							if (fileList && fileList[0] && fileList[0].tempFileURL) {
								icon = fileList[0].tempFileURL
							}
						} else {
							icon = icon.startsWith('/') ? icon : `/static/images/storage/${icon}.svg`
						}
						
						return {
							id: storage._id,
							icon,
							name: storage.name,
							type: storage.type,
							typeColor: storage.typeColor || '#5985E1',
							description: storage.description,
							itemCount: storage.itemCount || 0,
							createTime: formatDate(storage.createTime)
						}
					}))

					if (isLoadMore) {
						this.storageList = [...this.storageList, ...formattedStorages]
					} else {
						this.storageList = formattedStorages
					}

					this.hasMore = formattedStorages.length === this.pageSize
				} else {
					uni.showToast({
						title: result.message || '获取收纳柜列表失败',
						icon: 'none'
					})
				}
			} catch (error) {
				console.error('获取收纳柜列表失败：', error)
				uni.showToast({
					title: '获取收纳柜列表失败，请稍后重试',
					icon: 'none'
				})
			} finally {
				this.isLoadingMore = false
				if (!isLoadMore) {
					uni.hideLoading()
				}
			}
		},
		
		handleSearch() {
			if (this.searchTimer) {
				clearTimeout(this.searchTimer)
			}
			this.searchTimer = setTimeout(() => {
				this.refreshList()
			}, 300)
		},
		
		async loadMore() {
			if (this.isLoadingMore || !this.hasMore) return
			this.currentPage++
			await this.getStorageList(true)
		},
		
		toAddPage() {
			uni.navigateTo({
				url: "/pages/storage/addStorage"
			})
		},
		
		toDetails(id) {
			uni.navigateTo({
				url: "/pages/storage/storageDetails?id=" + id
			})
		},
		
		handleLongPress(storage) {
			uni.showModal({
				title: '删除确认',
				content: `确定要删除收纳柜"${storage.name}"吗？`,
				success: async (res) => {
					if (res.confirm) {
						try {
							uni.showLoading({
								title: '删除中...',
								mask: true
							})
							
							const result = await callCloudFunction('storage', {
								action: 'delete',
								id: storage.id
							})
							
							if (result.code === 0) {
								uni.showToast({
									title: '删除成功',
									icon: 'success'
								})
								this.refreshList()
							} else {
								uni.showToast({
									title: result.message || '删除失败',
									icon: 'none'
								})
							}
						} catch (error) {
							console.error('删除收纳柜失败：', error)
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
	watch: {
		searchKey() {
			this.handleSearch()
		}
	}
}
</script>

<style>
.container {
	min-height: 100vh;
	background-color: #f8f9fa;
	position: relative;
}

/* 搜索区域样式 */
.search-area {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	z-index: 100;
	padding: 24rpx 30rpx;
	background: rgba(255,255,255,0.95);
	backdrop-filter: blur(10px);
	display: flex;
	align-items: center;
	gap: 20rpx;
	box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.02);
}

.search-bar {
	flex: 1;
	height: 80rpx;
	background: #f1f3f5;
	border-radius: 40rpx;
	display: flex;
	align-items: center;
	padding: 0 30rpx;
	transition: all 0.3s;
}

.search-bar:active {
	background: #e9ecef;
}

.icon-search {
	font-size: 32rpx;
	margin-right: 16rpx;
	opacity: 0.5;
}

.search-input {
	flex: 1;
	font-size: 28rpx;
	color: #495057;
}

.add-button {
	width: 80rpx;
	height: 80rpx;
	background: linear-gradient(135deg, #5985E1, #3A66C0);
	border-radius: 24rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 4rpx 12rpx rgba(89,133,225,0.2);
	transition: all 0.3s;
}

.add-button:active {
	transform: scale(0.95);
}

.icon-add {
	color: #fff;
	font-size: 40rpx;
	font-weight: 300;
}

/* 列表区域样式 */
.storage-list {
	padding: 144rpx 30rpx 30rpx;
	box-sizing: border-box;
	min-height: 100vh;
}

.storage-card {
	background: #ffffff;
	border-radius: 24rpx;
	margin-bottom: 24rpx;
	box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.04);
	transition: all 0.3s;
	overflow: hidden;
}

.storage-card:active {
	transform: scale(0.98);
	background: #fafbfc;
}

.card-content {
	padding: 30rpx;
	display: flex;
	gap: 24rpx;
}

.icon-wrapper {
	width: 120rpx;
	height: 120rpx;
	border-radius: 20rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.storage-icon {
	width: 70%;
	height: 70%;
}

.info-wrapper {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 12rpx;
}

.title-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16rpx;
}

.storage-name {
	font-size: 32rpx;
	font-weight: 600;
	color: #212529;
	flex: 1;
}

.type-tag {
	font-size: 24rpx;
	padding: 6rpx 20rpx;
	border-radius: 24rpx;
	font-weight: 500;
}

.description {
	font-size: 26rpx;
	color: #868e96;
	line-height: 1.5;
}

.meta-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-top: 8rpx;
}

.date {
	font-size: 24rpx;
	color: #adb5bd;
}

.count-badge {
	background: rgba(89,133,225,0.08);
	padding: 6rpx 16rpx;
	border-radius: 20rpx;
	display: flex;
	align-items: center;
	gap: 4rpx;
}

.count-number {
	color: #5985E1;
	font-size: 26rpx;
	font-weight: 600;
}

.count-label {
	color: #5985E1;
	font-size: 24rpx;
}

/* 列表底部样式 */
.list-footer {
	padding: 30rpx 0;
	text-align: center;
}

.load-more text, .no-more text {
	font-size: 26rpx;
	color: #868e96;
	background: #f1f3f5;
	padding: 12rpx 30rpx;
	border-radius: 30rpx;
}

.tip-text {
	font-size: 24rpx;
	color: #adb5bd;
	margin-top: 16rpx;
}

/* 空状态样式 */
.empty-state {
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	width: 100%;
	padding: 0 60rpx;
	box-sizing: border-box;
	text-align: center;
}

.empty-emoji {
	font-size: 80rpx;
	margin-bottom: 24rpx;
	display: block;
}

.empty-title {
	font-size: 36rpx;
	color: #495057;
	font-weight: 600;
	margin-bottom: 12rpx;
	display: block;
}

.empty-desc {
	font-size: 28rpx;
	color: #868e96;
	margin-bottom: 40rpx;
	display: block;
}

.create-button {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 8rpx;
	background: linear-gradient(135deg, #5985E1, #3A66C0);
	color: #fff;
	padding: 24rpx 48rpx;
	border-radius: 40rpx;
	font-size: 30rpx;
	font-weight: 500;
	box-shadow: 0 4rpx 12rpx rgba(89,133,225,0.2);
	border: none;
}

.create-button:active {
	transform: scale(0.98);
}

.button-icon {
	font-size: 32rpx;
	font-weight: 300;
}
</style>