<template>
	<view class="container">
		<!-- 物品基本信息 -->
		<view class="item-info">
			<view class="item-header">
				<image :src="itemInfo.icon" class="item-icon"></image>
				<view class="item-basic">
					<view class="name">{{itemInfo.name}}</view>
					<view class="info-group">
						<text class="type">{{itemInfo.type}}</text>
						<text class="quantity">数量：{{itemInfo.quantity}}</text>
					</view>
					<view class="info-group">
						<text class="storage">{{itemInfo.storageName}}</text>
					</view>
					<view class="desc">{{itemInfo.description}}</view>
					<view class="dates-row">
						<text>添加：{{itemInfo.createTime}}</text>
						<text v-if="itemInfo.expiryDate">到期：{{itemInfo.expiryDate}}</text>
						<text v-else class="no-date">未设置到期日期</text>
					</view>
				</view>
			</view>
			<!-- 添加用户上传的图片显示 -->
			<view class="item-image" v-if="itemInfo.image">
				<image :src="itemInfo.image" mode="aspectFill" @tap="previewImage"></image>
			</view>
		</view>

		<!-- 数量调整 -->
		<view class="quantity-adjust">
			<view class="section-title">调整数量</view>
			<view class="adjust-form">
				<view class="form-row">
					<view class="form-item-half">
						<text class="label">调整类型</text>
						<view class="radio-group">
							<view :class="['radio-item', adjustType === 'add' ? 'active' : '']" @tap="adjustType = 'add'">增加</view>
							<view :class="['radio-item', adjustType === 'reduce' ? 'active' : '']" @tap="adjustType = 'reduce'">减少</view>
						</view>
					</view>
					<view class="form-item-half">
						<text class="label">调整数量</text>
						<input type="number" v-model="adjustNum" class="input" placeholder="请输入"/>
					</view>
				</view>
				<view class="form-row">
					<view class="form-item-half">
						<text class="label">调整时间</text>
						<picker mode="date" :value="adjustDate" @change="onDateChange" class="picker">
							<view class="picker-text">{{adjustDate}}</view>
						</picker>
					</view>
					<view class="form-item-half">
						<text class="label">调整原因</text>
						<input type="text" v-model="adjustReason" class="input" placeholder="请输入"/>
					</view>
				</view>
				<button class="submit-btn" @tap="submitAdjust">确认调整</button>
			</view>
		</view>

		<!-- 变更日志 -->
		<view class="quantity-logs">
			<view class="section-title">变更记录</view>
			<view class="log-list">
				<view class="log-item" v-for="(log, index) in itemInfo.logs" :key="index">
					<view class="log-header">
						<text class="log-time">{{formatDate(log.createTime)}}</text>
						<text :class="['log-type', log.type]">
							{{log.type === 'add' ? '+' : '-'}}{{log.quantity}}
						</text>
					</view>
					<view class="log-reason">{{log.changeReason || log.remark}}</view>
					<view class="log-remark" v-if="log.remark && log.changeReason">{{log.remark}}</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import { callCloudFunction } from '@/utils/cloud.js'
import { formatDate, formatDateTime } from '@/utils/date.js'

export default {
	data() {
		return {
			id: '',
			itemInfo: {
				icon: '',
				name: '',
				type: '',
				description: '',
				storageName: '',
				quantity: 0,
				createTime: '',
				expiryDate: '',
				logs: []
			},
			adjustType: 'add',
			adjustNum: '',
			adjustDate: '',
			adjustReason: ''
		}
	},
	onLoad(options) {
		if (!options || !options.id) {
			uni.showToast({
				title: '参数错误',
				icon: 'none'
			})
			setTimeout(() => {
				uni.navigateBack()
			}, 1500)
			return
		}
		
		// 获取当前日期
		const now = new Date()
		this.adjustDate = this.formatDate(now)
		
		this.id = options.id
		this.getItemDetail()
	},
	methods: {
		// 获取物品详情
		async getItemDetail() {
			uni.showLoading({
				title: '加载中...',
				mask: true
			})
			
			try {
				const result = await callCloudFunction('item', {
					action: 'detail',
					id: this.id
				})
				
				if (result.code === 0) {
					const createTime = formatDate(result.data.createTime)
					const expiryDate = result.data.expiryDate ? formatDate(result.data.expiryDate) : null
					
					// 处理图标显示
					let icon = result.data.icon
					console.log('icon', result.data.useImageAsIcon)
					if (result.data.useImageAsIcon) {
						// 如果使用图片作为图标,则使用 image 字段
						icon = result.data.image
					}
					
					if (icon && icon.indexOf('cloud://') === 0) {
						// 如果是云存储文件ID，需要获取临时访问链接
						icon = await this.getImageTempUrl(icon)
					} else if (icon && !result.data.useImageAsIcon) {
						// 如果是普通图标且不是使用图片作为图标,添加路径前缀
						icon = `/static/images/item/${icon}`
					}
					
					// 获取变更记录
					const logsResult = await callCloudFunction('item', {
						action: 'getLogList',
						itemId: this.id
					})
					
					const logs = logsResult.code === 0 ? logsResult.data.list : []
					
					this.itemInfo = {
						...result.data,
						createTime,
						expiryDate,
						icon,
						logs: logs.map(log => ({
							...log,
							createTime: formatDateTime(log.createTime)
						}))
					}
				} else {
					uni.showToast({
						title: result.message || '获取失败',
						icon: 'none'
					})
				}
			} catch (error) {
				console.error('获取物品详情失败：', error)
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
		},
		
		onDateChange(e) {
			this.adjustDate = e.detail.value
		},
		
		async submitAdjust() {
			if (!this.adjustNum || this.adjustNum <= 0) {
				uni.showToast({
					title: '请输入有效的调整数量',
					icon: 'none'
				})
				return
			}
			
			if (!this.adjustReason) {
				uni.showToast({
					title: '请输入调整原因',
					icon: 'none'
				})
				return
			}
			
			const adjustNum = Number(this.adjustNum)
			const newQuantity = this.adjustType === 'add' 
				? this.itemInfo.quantity + adjustNum
				: this.itemInfo.quantity - adjustNum
			
			if (newQuantity < 0) {
				uni.showToast({
					title: '减少数量不能大于当前数量',
					icon: 'none'
				})
				return
			}
			
			// 显示loading
			uni.showLoading({
				title: '调整中...',
				mask: true
			})
			
			try {
				const result = await callCloudFunction('item', {
					action: 'updateQuantity',
					id: this.id,
					quantity: adjustNum,
					type: this.adjustType,
					remark: this.adjustReason
				})
				
				if (result.code === 0) {
					// 检查是否归零
					if (newQuantity === 0) {
						uni.hideLoading()
						uni.showModal({
							title: '提示',
							content: '本物品收纳已归零，是否需要移除本物品？',
							success: async (res) => {
								if (res.confirm) {
									await this.deleteItem()
								}
							}
						})
					} else {
						uni.showToast({
							title: '调整成功',
							icon: 'success'
						})
					}
					
					// 重置表单
					this.adjustNum = ''
					this.adjustReason = ''
					// 刷新数据
					this.getItemDetail()
				} else {
					uni.showToast({
						title: result.message || '更新失败',
						icon: 'none'
					})
				}
			} catch (error) {
				console.error('更新物品数量失败：', error)
				uni.showToast({
					title: '更新失败，请稍后重试',
					icon: 'none'
				})
			} finally {
				uni.hideLoading()
			}
		},
		
		// 删除物品
		async deleteItem() {
			uni.showLoading({
				title: '删除中...',
				mask: true
			})
			
			try {
				const result = await callCloudFunction('item', {
					action: 'delete',
					id: this.id
				})
				
				if (result.code === 0) {
					uni.showToast({
						title: '删除成功',
						icon: 'success'
					})
					
					// 标记上一页需要刷新
					const pages = getCurrentPages()
					const prevPage = pages[pages.length - 2]
					if (prevPage) {
						prevPage.$vm.needRefresh = true
					}
					
					setTimeout(() => {
						uni.navigateBack()
					}, 1500)
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
		},
		
		// 预览图片
		previewImage() {
			if (this.itemInfo.image) {
				uni.previewImage({
					urls: [this.itemInfo.image]
				})
			}
		},
		
		// 获取图片临时链接
		async getImageTempUrl(icon) {
			try {
				const { fileList } = await uniCloud.getTempFileURL({
					fileList: [icon]
				})
				if (fileList && fileList[0] && fileList[0].tempFileURL) {
					icon = fileList[0].tempFileURL
				}
				return icon
			} catch (error) {
				console.error('获取图片临时链接失败：', error)
				return icon
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

.item-info {
	background: #fff;
	border-radius: 24rpx;
	padding: 30rpx;
	margin-bottom: 30rpx;
	box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.05);
}

.item-header {
	display: flex;
	align-items: flex-start;
	margin-bottom: 20rpx;
}

.item-icon {
	width: 120rpx;
	height: 120rpx;
	margin-right: 30rpx;
	border-radius: 20rpx;
}

.item-basic {
	flex: 1;
}

.item-basic .name {
	font-size: 36rpx;
	font-weight: bold;
	color: #333;
	margin-bottom: 16rpx;
}

.info-group {
	display: flex;
	align-items: center;
	gap: 16rpx;
	margin-bottom: 12rpx;
}

.type {
	font-size: 24rpx;
	color: #5985E1;
	background: rgba(89,133,225,0.1);
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

.storage {
	font-size: 26rpx;
	color: #666;
}

.desc {
	font-size: 28rpx;
	color: #666;
	margin: 16rpx 0;
	line-height: 1.5;
}

.dates-row {
	display: flex;
	gap: 30rpx;
	font-size: 24rpx;
	color: #999;
}

.dates-row .no-date {
	font-style: italic;
}

.quantity-adjust {
	background: #fff;
	border-radius: 24rpx;
	padding: 30rpx;
	margin-bottom: 30rpx;
	box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.05);
}

.section-title {
	font-size: 32rpx;
	font-weight: bold;
	color: #333;
	margin-bottom: 24rpx;
	padding-bottom: 20rpx;
	border-bottom: 1px solid #f0f0f0;
}

.adjust-form {
	display: flex;
	flex-direction: column;
	gap: 24rpx;
}

.form-row {
	display: flex;
	gap: 24rpx;
}

.form-item-half {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 12rpx;
}

.label {
	font-size: 26rpx;
	color: #666;
}

.radio-group {
	display: flex;
	gap: 16rpx;
}

.radio-item {
	flex: 1;
	text-align: center;
	padding: 16rpx 0;
	border-radius: 12rpx;
	border: 1px solid #ddd;
	font-size: 28rpx;
	color: #666;
	transition: all 0.3s;
}

.radio-item.active {
	background: #5985E1;
	color: #fff;
	border-color: #5985E1;
}

.input {
	border: 1px solid #eee;
	border-radius: 12rpx;
	padding: 16rpx 24rpx;
	font-size: 28rpx;
	background: #f8f8f8;
}

.picker {
	border: 1px solid #eee;
	border-radius: 12rpx;
	padding: 16rpx 24rpx;
	background: #f8f8f8;
}

.picker-text {
	font-size: 28rpx;
	color: #333;
}

.submit-btn {
	width: 400rpx;
	height: 88rpx;
	line-height: 88rpx;
	background: #5985E1;
	border-radius: 44rpx;
	color: #fff;
	font-size: 30rpx;
	margin: 40rpx auto 0;
	text-align: center;
	box-shadow: 0 4rpx 12rpx rgba(89,133,225,0.3);
	transition: all 0.3s;
}

.submit-btn:active {
	transform: scale(0.98);
	box-shadow: 0 2rpx 6rpx rgba(89,133,225,0.3);
}

.quantity-logs {
	background: #fff;
	border-radius: 24rpx;
	padding: 30rpx;
	box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.05);
}

.log-list {
	margin-top: 20rpx;
}

.log-item {
	padding: 24rpx 0;
	border-bottom: 1px solid #f5f5f5;
}

.log-item:last-child {
	border-bottom: none;
}

.log-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 12rpx;
}

.log-time {
	font-size: 24rpx;
	color: #999;
}

.log-type {
	font-size: 28rpx;
	font-weight: bold;
}

.log-type.add {
	color: #52c41a;
}

.log-type.reduce {
	color: #ff4d4f;
}

.log-reason {
	font-size: 26rpx;
	color: #666;
	line-height: 1.4;
}

.log-remark {
	font-size: 24rpx;
	color: #999;
	margin-top: 8rpx;
}

.item-image {
	margin-top: 20rpx;
	border-top: 2rpx solid #f5f5f5;
	padding-top: 20rpx;
}

.item-image image {
	width: 100%;
	height: 300rpx;
	border-radius: 12rpx;
	object-fit: cover;
}
</style>
