<template>
	<view class="container">
		<!-- 用户信息卡片 -->
		<view class="user-card">
			<view class="avatar-section">
				<button class="avatar-button" open-type="chooseAvatar" @chooseavatar="onChooseAvatar">
					<image class="avatar" :src="userInfo.avatar" mode="aspectFill"></image>
				</button>
				<view class="user-info">
					<view class="nickname-section">
						<view class="nickname-wrapper">
							<input class="nickname-input" :class="{ 'show-input': showInput }" placeholder="请输入昵称" @blur="onNicknameChange" :value="userInfo.nickname"/>
							<view class="nickname-display" @tap="showNicknameInput" :class="{ 'hide-display': showInput }">
								<text class="nickname-text">{{userInfo.nickname || '未设置'}}</text>
								<image src="/static/icon/edit.svg" class="edit-icon" mode="aspectFit"></image>
							</view>
						</view>
					</view>
					<view class="user-meta">
						<text class="join-date">加入时间：{{userInfo.joinDate || '-'}}</text>
						<view class="premium-info" v-if="userInfo.premium === 1">
							<view class="premium-tag">赞助</view>
							<text class="premium-expire">{{formatExpireTime}}</text>
						</view>
					</view>
				</view>
			</view>
			
			<!-- 统计信息 -->
			<view class="stats">
				<view class="stat-item">
					<text class="number">{{userInfo.storageCount}}</text>
					<text class="label">收纳柜</text>
				</view>
				<view class="stat-divider"></view>
				<view class="stat-item">
					<text class="number">{{userInfo.itemCount}}</text>
					<text class="label">收纳物</text>
				</view>
			</view>
		</view>
		
		<!-- 功能区 -->
		<view class="function-section">
			<!-- 数据管理 -->
			<view class="function-card">
				<view class="card-header">
					<text class="card-title">数据管理</text>
				</view>
				<view class="card-content">
					<view class="grid-list">
						<view class="grid-item" @tap="toItemLog">
							<image src="/static/icon/record.svg" class="grid-icon"></image>
							<text class="grid-text">出入记录</text>
						</view>
						<view class="grid-item" @tap="toItemValidity">
							<image src="/static/icon/validity.svg" class="grid-icon"></image>
							<text class="grid-text">有效期检测</text>
						</view>
						<view class="grid-item" @tap="handleExportData">
							<image src="/static/icon/export.svg" class="grid-icon"></image>
							<text class="grid-text">数据导出</text>
						</view>
						<view class="grid-item" @tap="toFamilyShare">
							<image src="/static/icon/family.svg" class="grid-icon"></image>
							<text class="grid-text">家庭共享</text>
						</view>
						<view class="grid-item disabled">
							<image src="/static/icon/analysis.svg" class="grid-icon"></image>
							<text class="grid-text">物品分析</text>
							<text class="coming-soon">敬请期待</text>
						</view>
						<view class="grid-item disabled">
							<image src="/static/icon/tag.svg" class="grid-icon"></image>
							<text class="grid-text">标签管理</text>
							<text class="coming-soon">敬请期待</text>
						</view>
					</view>
				</view>
			</view>
			
			<!-- 系统设置 -->
			<view class="function-card">
				<view class="card-header">
					<text class="card-title">系统设置</text>
				</view>
				<view class="card-content">
					<view class="menu-list">
						<view class="menu-item" @tap="toFeedback">
							<view class="menu-left">
								<image src="/static/icon/feedback.svg" class="menu-icon"></image>
								<text class="menu-text">意见反馈</text>
							</view>
							<image src="/static/icon/right.svg" class="arrow-icon"></image>
						</view>
						<view class="menu-item" @tap="toVersion">
							<view class="menu-left">
								<image src="/static/icon/version.svg" class="menu-icon"></image>
								<text class="menu-text">版本记录</text>
							</view>
							<image src="/static/icon/right.svg" class="arrow-icon"></image>
						</view>
						<view class="menu-item" @tap="toAbout">
							<view class="menu-left">
								<image src="/static/icon/about.svg" class="menu-icon"></image>
								<text class="menu-text">关于本软件</text>
							</view>
							<image src="/static/icon/right.svg" class="arrow-icon"></image>
						</view>
					</view>
				</view>
			</view>
		</view>

		<!-- 退出登录按钮 -->
		<view class="logout-section">
			<button class="logout-btn" @tap="handleLogout">退出登录</button>
		</view>
	</view>
</template>

<script>
import { callCloudFunction } from '@/utils/cloud.js'
import { formatDate } from '@/utils/date.js'

export default {
	data() {
		return {
			userInfo: {
				avatar: '/static/default-avatar.svg',
				nickname: '未登录',
				storageCount: 0,
				itemCount: 0,
				premium: 0,
				premiumExpireTime: null
			},
			showInput: false,
			showEncryptModal: false,
			encryptKey: '',
			isLoading: false
		}
	},
	onShow() {
		this.loadUserInfo()
	},
	computed: {
		formatExpireTime() {
			if (!this.userInfo.premiumExpireTime) return ''
			const expireDate = new Date(this.userInfo.premiumExpireTime)
			const year = expireDate.getFullYear()
			const month = String(expireDate.getMonth() + 1).padStart(2, '0')
			const day = String(expireDate.getDate()).padStart(2, '0')
			return `有效期至 ${year}-${month}-${day}`
		}
	},
	methods: {
		async loadUserInfo() {
			try {
				// 先从本地获取用户信息并显示
				const localUserInfo = uni.getStorageSync('userInfo')
				if (localUserInfo) {
					this.userInfo = {
						...this.userInfo,
						...localUserInfo,
						avatar: localUserInfo.avatar || '/static/default-avatar.svg',
					}
				}
				
				// 获取token
				const token = uni.getStorageSync('token')
				if (!token) {
					uni.reLaunch({
						url: '/pages/login/login'
					})
					return
				}
				
				// 显示加载提示
				uni.showLoading({
					title: '更新中...',
					mask: false
				})
				
				// 并行获取用户信息和统计数据
				const [userResult, statisticsResult] = await Promise.all([
					callCloudFunction('user', {
						action: 'info'
					}),
					callCloudFunction('item', {
						action: 'getStatistics'
					})
				])
				
				if (userResult.code === 0) {
					const userInfo = userResult.data
					if (userInfo.avatar && userInfo.avatar.startsWith('cloud://')) {
						const { fileList } = await uniCloud.getTempFileURL({
							fileList: [userInfo.avatar]
						})
						if (fileList && fileList[0] && fileList[0].tempFileURL) {
							userInfo.avatar = fileList[0].tempFileURL
						}
					}
					
					// 更新显示和本地存储
					this.userInfo = {
						...userInfo,
						avatar: userInfo.avatar || '/static/default-avatar.svg',
						storageCount: statisticsResult.code === 0 ? statisticsResult.data.storageCount : 0,
						itemCount: statisticsResult.code === 0 ? statisticsResult.data.itemCount : 0,
						joinDate: userInfo.createTime ? formatDate(userInfo.createTime) : '-',
						premium: userInfo.premium || 0,
						premiumExpireTime: userInfo.premiumExpireTime ? formatDate(userInfo.premiumExpireTime) : null
					}
					
					// 更新本地存储
					uni.setStorageSync('userInfo', userInfo)
				}
			} catch (error) {
				console.error('获取用户信息失败：', error)
				if (!this.userInfo.nickname || this.userInfo.nickname === '未登录') {
					uni.showToast({
						title: '获取用户信息失败，请稍后重试',
						icon: 'none'
					})
				}
			} finally {
				uni.hideLoading()
			}
		},
		toItemLog() {
			uni.navigateTo({
				url: '/pages/item/itemlog'
			})
		},
		toItemValidity() {
			uni.navigateTo({
				url: '/pages/item/itemvalidity'
			})
		},
		toFeedback() {
			uni.navigateTo({
				url: '/pages/feedback/feedbackList'
			})
		},
		toVersion() {
			uni.navigateTo({
				url: '/pages/version/versionList'
			})
		},
		toAbout() {
			uni.navigateTo({
				url: '/pages/about/about'
			})
		},
		async toFamilyShare() {
			uni.showLoading({
					title: '加载中...',
					mask: true
			})
			try {
				const result = await callCloudFunction('family', {
					action: 'getMyFamilies'
				})
				uni.hideLoading()
				if (result.code === 403) {
					uni.showModal({
						title: '赞助提示',
						content: '此功能需要赞助后才能使用，每月仅需1元。\n\n如需开通请发送邮件',
						confirmText: '我知道了',
						showCancel: false
					})
					return
				}
				
				if (result.code === 0) {
					uni.navigateTo({
						url: '/pages/family/index'
					})
				} else {
					uni.showToast({
						title: result.message,
						icon: 'none'
					})
				}
			} catch (error) {
				console.error('跳转失败：', error)
				uni.showToast({
					title: '跳转失败',
					icon: 'none'
				})
			}
		},
		// 处理数据导出
		async handleExportData() {
			uni.showModal({
				title: '提示',
				content: '数据导出需要一定时间，导出过程中请勿关闭小程序，是否继续？',
				success: async (res) => {
					if (res.confirm) {
						uni.showLoading({
							title: '导出中...',
							mask: true
						})
						
						try {
							// 获取数据
							const result = await callCloudFunction('item', {
								action: 'list',
								page: 1,
								pageSize: 1000 // 设置较大的数值以获取所有数据
							})
							
							if (result.code === 0 && result.data.items) {
								// 生成CSV内容
								let csvContent = '\ufeff' // 添加 BOM 头，解决中文乱码
								csvContent += '物品名称,所属收纳柜,数量,单位,单价,物品类型,到期时间,创建时间,物品介绍\n'
								
								result.data.items.forEach(item => {
									const row = [
										item.name,
										item.storageName,
										item.quantity,
										item.unit,
										item.price,
										item.type,
										item.expiryDate ? formatDate(item.expiryDate) : '',
										formatDate(item.createTime),
										item.description
									].map(field => {
										if (field === null || field === undefined) return ''
										field = String(field)
										// 处理字段中的逗号和换行符
										if (field.includes(',') || field.includes('\n') || field.includes('"')) {
											return `"${field.replace(/"/g, '""')}"`
										}
										return field
									}).join(',')
									
									csvContent += row + '\n'
								})
								
								// 生成文件名
								const fileName = `storage_data_${formatDate(new Date())}.csv`
								
								// 获取文件系统管理器
								const fs = wx.getFileSystemManager()
								const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`
								
								try {
									// 写入文件
									fs.writeFileSync(filePath, csvContent, 'utf8')
									
									uni.hideLoading()
									
									// 保存文件到本地
									wx.saveFile({
										tempFilePath: filePath,
										success: function(res) {
											const savedFilePath = res.savedFilePath
											// 打开文件
											wx.openDocument({
												filePath: savedFilePath,
												fileType: 'csv',
												showMenu: true,
												success: function() {
													console.log('文件打开成功')
												},
												fail: function(error) {
													console.error('打开文件失败：', error)
													uni.showModal({
														title: '导出成功',
														content: '文件已保存到手机，请使用WPS、Excel等应用打开查看',
														showCancel: false
													})
												}
											})
										},
										fail: function(error) {
											console.error('保存文件失败：', error)
											uni.showModal({
												title: '导出成功',
												content: '文件已保存到：' + filePath + '\n\n请在手机文件管理器中查看',
												showCancel: false
											})
										}
									})
									
								} catch (err) {
									console.error('写入文件失败：', err)
									throw new Error('文件保存失败')
								}
							} else {
								throw new Error('获取数据失败')
							}
						} catch (error) {
							console.error('导出数据失败：', error)
							uni.showToast({
								title: error.message || '导出失败，请稍后重试',
								icon: 'none'
							})
							uni.hideLoading()
						}
					}
				}
			})
		},
		async handleLogout() {
			try {
				// 清除本地存储的用户信息和token
				uni.removeStorageSync('userInfo')
				uni.removeStorageSync('token')
				
				// 重置用户信息
				this.userInfo = {
					avatar: '/static/default-avatar.svg',
					nickname: '未登录',
					storageCount: 0,
					itemCount: 0,
					premium: 0,
					premiumExpireTime: null
				}
				
				uni.showToast({
					title: '已退出登录',
					icon: 'success'
				})
				
				// 延迟跳转到登录页
				setTimeout(() => {
					uni.reLaunch({
						url: '/pages/user/login'
					})
				}, 1500)
			} catch (error) {
				console.error('退出登录失败：', error)
				uni.showToast({
					title: '退出登录失败，请稍后重试',
					icon: 'none'
				})
			}
		},
		showEncryptSetting() {
			this.showEncryptModal = true
		},
		hideEncryptModal() {
			this.showEncryptModal = false
			this.encryptKey = ''
		},
		async saveEncryptKey() {
			if (!this.encryptKey.trim()) {
				uni.showToast({
					title: '请输入加密密钥',
					icon: 'none'
				})
				return
			}
			
			try {
				this.isLoading = true
				const result = await callCloudFunction('user', {
					action: 'updateEncryptKey',
					encryptKey: this.encryptKey.trim()
				})
				
				if (result.code === 0) {
					uni.showToast({
						title: '加密密钥设置成功',
						icon: 'success'
					})
					this.hideEncryptModal()
				} else {
					uni.showToast({
						title: result.message || '设置加密密钥失败',
						icon: 'none'
					})
				}
			} catch (error) {
				console.error('设置加密密钥失败：', error)
				uni.showToast({
					title: '设置加密密钥失败，请稍后重试',
					icon: 'none'
				})
			} finally {
				this.isLoading = false
			}
		},
		async onChooseAvatar(e) {
			const { avatarUrl } = e.detail 
			
			try {
				uni.showLoading({
					title: '更新中...',
					mask: true
				})
				
				// 更新用户信息到云数据库
				const result = await callCloudFunction('user', {
					action: 'updateUserInfo',
					avatarUrl
				})
				
				if (result.code === 0) {
					// 更新本地存储的用户信息
					const localUserInfo = uni.getStorageSync('userInfo') || {}
					localUserInfo.avatar = avatarUrl
					uni.setStorageSync('userInfo', localUserInfo)
					
					// 更新页面显示
					this.userInfo.avatar = avatarUrl
					
					uni.showToast({
						title: '头像更新成功',
						icon: 'success'
					})
				} else {
					uni.showToast({
						title: result.message || '头像更新失败',
						icon: 'none'
					})
				}
			} catch (error) {
				console.error('更新头像失败：', error)
				uni.showToast({
					title: '更新失败',
					icon: 'none'
				})
			} finally {
				uni.hideLoading()
			}
		},
		
		// 显示昵称输入框
		showNicknameInput() {
			this.showInput = true
			// 使用 nextTick 确保 DOM 更新后再获取焦点
			this.$nextTick(() => {
				// 使用 uni-app 的方式获取元素并设置焦点
				const query = uni.createSelectorQuery().in(this)
				query.select('.nickname-input').boundingClientRect(data => {
					if (data) {
						uni.createSelectorQuery().in(this)
							.select('.nickname-input')
							.fields({
								context: true,
								size: true,
							}, res => {
								res && res.node && res.node.focus()
							})
							.exec()
					}
				}).exec()
			})
		},
		
		// 处理昵称修改
		async onNicknameChange(e) {
			this.showInput = false
			
			const nickname = e.detail.value
			if (!nickname || nickname === this.userInfo.nickname) return
			
			try {
				uni.showLoading({
					title: '更新中...',
					mask: true
				})
				
				// 更新用户信息到云数据库
				const result = await callCloudFunction('user', {
					action: 'updateUserInfo',
					nickname
				})
				
				if (result.code === 0) {
					// 更新本地存储的用户信息
					const localUserInfo = uni.getStorageSync('userInfo') || {}
					localUserInfo.nickname = nickname
					uni.setStorageSync('userInfo', localUserInfo)
					
					// 更新页面显示
					this.userInfo.nickname = nickname
					
					uni.showToast({
						title: '昵称更新成功',
						icon: 'success'
					})
				} else {
					uni.showToast({
						title: result.message || '昵称更新失败',
						icon: 'none'
					})
				}
			} catch (error) {
				console.error('更新昵称失败：', error)
				uni.showToast({
					title: '更新失败',
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

/* 用户卡片样式 */
.user-card {
	background: #fff;
	border-radius: 24rpx;
	padding: 40rpx;
	margin-bottom: 30rpx;
	box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.08);
}

.avatar-section {
	display: flex;
	align-items: flex-start;
	margin-bottom: 40rpx;
}

.avatar-button {
	padding: 0;
	background: none;
	border: none;
	width: 140rpx;
	height: 140rpx;
	margin-right: 30rpx;
	position: relative;
}

.avatar-button::after {
	border: none;
}

.avatar {
	width: 140rpx;
	height: 140rpx;
	border-radius: 70rpx;
	background: #f0f0f0;
	box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.1);
}

.user-info {
	flex: 1;
	padding-top: 10rpx;
}

.nickname-section {
	display: flex;
	align-items: center;
	gap: 16rpx;
	margin-bottom: 16rpx;
}

.nickname-wrapper {
	position: relative;
	display: inline-block;
}

.nickname-input {
	font-size: 40rpx;
	font-weight: bold;
	color: #333;
	padding: 0;
	display: none;
	width: 100%;
	background: #f8f8f8;
	padding: 10rpx 20rpx;
	border-radius: 8rpx;
}

.nickname-input.show-input {
	display: block;
}

.nickname-display {
	display: flex;
	align-items: center;
	gap: 12rpx;
	padding: 10rpx 0;
}

.nickname-display.hide-display {
	display: none;
}

.nickname-text {
	font-size: 40rpx;
	font-weight: bold;
	color: #333;
}

.edit-icon {
	width: 32rpx;
	height: 32rpx;
	opacity: 0.5;
}

.nickname-display:active {
	opacity: 0.7;
}

.user-meta {
	display: flex;
	flex-direction: column;
	gap: 8rpx;
}

.join-date, .premium-expire {
	font-size: 24rpx;
	color: #999;
}

.stats {
	display: flex;
	justify-content: space-around;
	align-items: center;
	padding: 30rpx 20rpx 10rpx;
	margin-top: 20rpx;
	border-top: 1px solid #f5f5f5;
}

.stat-item {
	flex: 1;
	text-align: center;
}

.stat-divider {
	width: 2rpx;
	height: 50rpx;
	background: #f0f0f0;
	margin: 0 20rpx;
}

.number {
	font-size: 48rpx;
	font-weight: bold;
	color: #5985E1;
	display: block;
	margin-bottom: 8rpx;
}

.label {
	font-size: 26rpx;
	color: #999;
}

/* 功能区样式 */
.function-section {
	margin-bottom: 30rpx;
}

.function-card {
	background: #fff;
	border-radius: 24rpx;
	margin-bottom: 30rpx;
	box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.05);
	overflow: hidden;
}

.card-header {
	padding: 30rpx;
	border-bottom: 1px solid #f5f5f5;
}

.card-title {
	font-size: 32rpx;
	font-weight: bold;
	color: #333;
}

.card-content {
	padding: 30rpx;
}

/* 网格列表样式 */
.grid-list {
	display: grid;
	grid-template-columns: repeat(4, 1fr);
	gap: 20rpx;
}

.grid-item {
	display: flex;
	flex-direction: column;
	align-items: center;
	position: relative;
	padding: 20rpx 0;
}

.grid-item.disabled {
	opacity: 0.6;
}

.grid-icon {
	width: 64rpx;
	height: 64rpx;
	margin-bottom: 12rpx;
}

.grid-text {
	font-size: 24rpx;
	color: #333;
}

.coming-soon {
	position: absolute;
	top: 0;
	right: 0;
	font-size: 20rpx;
	color: #fff;
	background: #ff4d4f;
	padding: 4rpx 8rpx;
	border-radius: 8rpx;
	transform: scale(0.8);
	transform-origin: right top;
}

/* 菜单列表样式 */
.menu-list {
	display: flex;
	flex-direction: column;
}

.menu-item {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 30rpx 0;
	border-bottom: 1px solid #f5f5f5;
}

.menu-item:last-child {
	border-bottom: none;
}

.menu-left {
	display: flex;
	align-items: center;
}

.menu-icon {
	width: 40rpx;
	height: 40rpx;
	margin-right: 20rpx;
}

.menu-text {
	font-size: 28rpx;
	color: #333;
}

.arrow-icon {
	width: 32rpx;
	height: 32rpx;
	opacity: 0.3;
}

/* 退出登录按钮样式 */
.logout-section {
	padding: 0 40rpx;
	margin-top: 60rpx;
}

.logout-btn {
	width: 100%;
	height: 88rpx;
	line-height: 88rpx;
	background: #ff4d4f;
	color: #fff;
	font-size: 32rpx;
	border-radius: 44rpx;
	text-align: center;
}

.logout-btn:active {
	opacity: 0.8;
}

.premium-info {
	display: flex;
	align-items: center;
	gap: 12rpx;
	margin-top: 8rpx;
}

.premium-tag {
	background: linear-gradient(135deg, #FFD700, #FFA500);
	color: #fff;
	font-size: 22rpx;
	padding: 4rpx 12rpx;
	border-radius: 8rpx;
	box-shadow: 0 2rpx 6rpx rgba(255, 165, 0, 0.2);
}

.premium-expire {
	font-size: 24rpx;
	color: #999;
}
</style>
