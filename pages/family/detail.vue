<template>
	<view class="container">
		<!-- 顶部信息卡片 -->
		<view class="header-card">
			<view class="card-content">
				<view class="family-info">
					<text class="family-name">{{familyInfo.name}}</text>
					<text class="create-time">创建于 {{formatDate(familyInfo.create_time)}}</text>
				</view>
				<view class="family-stats">
					<view class="stat-item">
						<text class="stat-value">{{familyInfo.members.length}}</text>
						<text class="stat-label">成员数</text>
					</view>
				</view>
			</view>
		</view>
		
		<!-- 内容区域 -->
		<scroll-view class="content" scroll-y refresher-enabled 
			:refresher-triggered="isRefreshing"
			@refresherrefresh="onRefresh"
		>
			<!-- 成员列表 -->
			<view class="section">
				<view class="section-header">
					<text class="section-title">成员列表</text>
					<view class="header-right" v-if="isOwner">
						<button class="action-btn invite-btn" @tap="handleInvite">
							<text class="btn-icon">+</text>
							<text>邀请成员</text>
						</button>
					</view>
				</view>
				<view class="member-list">
					<view class="member-card" v-for="member in familyInfo.members" :key="member.user_id">
						<view class="member-main">
							<view class="member-avatar" :style="{ backgroundColor: getAvatarColor(member.user_id) }">
								<text>{{getNameInitial(member.nickname)}}</text>
							</view>
							<view class="member-info">
								<text class="member-name">{{member.nickname || '未知用户'}}</text>
								<text class="member-join-time">加入于 {{formatDate(member.join_time)}}</text>
							</view>
						</view>
						<view class="member-actions">
							<text class="role-tag" :class="roleClasses[member.role]">{{getRoleText(member)}}</text>
							<button 
								class="remove-btn" 
								v-if="isOwner && member.user_id !== userInfo.openid"
								@tap.stop="handleRemoveMember(member)"
							>移除</button>
						</view>
					</view>
				</view>
			</view>
		</scroll-view>
		
		<!-- 底部操作区 -->
		<view class="footer">
			<button class="danger-btn" v-if="isOwner" @tap="handleDissolve">解散家庭组</button>
			<button class="quit-btn" v-else @tap="handleQuit">退出家庭组</button>
		</view>
		
		<!-- 邀请码弹窗 -->
		<uni-popup ref="invitePopup" type="dialog">
			<uni-popup-dialog
				mode="base"
				title="邀请码"
				:content="inviteCodeContent"
				:before-close="true"
				confirmText="复制"
				@confirm="copyInviteCode"
				@close="closeInvitePopup"
			></uni-popup-dialog>
		</uni-popup>
	</view>
</template>

<script>
import { callCloudFunction } from '@/utils/cloud.js'
import { formatDate } from '@/utils/date.js'

export default {
	data() {
		return {
			familyId: '',
			familyInfo: {
				name: '',
				create_time: '',
				members: []
			},
			userInfo: null,
			isRefreshing: false,
			roleClasses: {
				'owner': 'role-owner',
				'admin': 'role-admin',
				'member': 'role-member'
			},
			inviteCode: ''
		}
	},
	computed: {
		isOwner() {
			return this.familyInfo.currentUserRole === 'owner'
		},
		inviteCodeContent() {
			if (!this.inviteCode) return ''
			return `邀请码：${this.inviteCode}\n\n有效期7天，仅可使用一次`
		}
	},
	onLoad(options) {
		this.familyId = options.id
		this.userInfo = uni.getStorageSync('userInfo') || {}
		this.loadFamilyInfo()
	},
	onPullDownRefresh() {
		this.loadFamilyInfo().finally(() => {
			uni.stopPullDownRefresh()
		})
	},
	methods: {
		formatDate,
		// 下拉刷新
		async onRefresh() {
			this.isRefreshing = true
			await this.loadFamilyInfo()
			this.isRefreshing = false
		},
		// 加载家庭组信息
		async loadFamilyInfo() {
			try {
				uni.showLoading({
					title: '加载中...'
				})
				
				const token = uni.getStorageSync('token')
				if (!token) {
					uni.showToast({
						title: '请先登录',
						icon: 'none'
					})
					return
				}
				
				const result = await callCloudFunction('family', {
					action: 'getFamilyInfo',
					family_id: this.familyId,
					token
				})
				
				if (result.code === 0 && result.data) {
					this.familyInfo = result.data
				} else {
					uni.showToast({
						title: result.message,
						icon: 'none'
					})
					setTimeout(() => {
						uni.navigateBack()
					}, 1500)
				}
			} catch (error) {
				console.error('加载家庭组信息失败：', error)
				uni.showToast({
					title: '加载失败',
					icon: 'none'
				})
				setTimeout(() => {
					uni.navigateBack()
				}, 1500)
			} finally {
				uni.hideLoading()
			}
		},
		
		// 获取角色文本
		getRoleText(member) {
			const roleMap = {
				owner: '创建者',
				admin: '管理员',
				member: '成员'
			}
			return roleMap[member.role] || '成员'
		},
		
		// 处理邀请
		async handleInvite() {
			try {
				uni.showLoading({
					title: '生成中...',
					mask: true
				})
				
				const result = await callCloudFunction('family', {
					action: 'generateInviteCode',
					family_id: this.familyId
				})
				
				if (result.code === 0) {
					this.inviteCode = result.data.code
					this.$refs.invitePopup.open()
				} else {
					uni.showToast({
						title: result.message || '生成邀请码失败',
						icon: 'none',
						duration: 2000
					})
				}
			} catch (error) {
				console.error('生成邀请码失败：', error)
				uni.showToast({
					title: '生成邀请码失败，请稍后重试',
					icon: 'none',
					duration: 2000
				})
			} finally {
				uni.hideLoading()
			}
		},
		
		// 复制邀请码
		copyInviteCode() {
			uni.setClipboardData({
				data: this.inviteCode,
				success: () => {
					uni.showToast({
						title: '已复制到剪贴板'
					})
					this.closeInvitePopup()
				}
			})
		},
		
		// 关闭邀请码弹窗
		closeInvitePopup() {
			this.$refs.invitePopup.close()
			this.inviteCode = ''
		},
		
		// 处理移除成员
		async handleRemoveMember(member) {
			uni.showModal({
				title: '提示',
				content: `确定要移除成员"${member.nickname || '未知用户'}"吗？`,
				success: async (res) => {
					if (res.confirm) {
						try {
							const result = await callCloudFunction('family', {
								action: 'removeMember',
								family_id: this.familyId,
								user_id: member.user_id
							})
							
							if (result.code === 0) {
								uni.showToast({
									title: '移除成功'
								})
								this.loadFamilyInfo()
							} else {
								uni.showToast({
									title: result.message,
									icon: 'none'
								})
							}
						} catch (error) {
							uni.showToast({
								title: '操作失败',
								icon: 'none'
							})
						}
					}
				}
			})
		},
		
		// 处理退出
		handleQuit() {
			uni.showModal({
				title: '提示',
				content: '确定要退出该家庭组吗？',
				success: async (res) => {
					if (res.confirm) {
						try {
							const result = await callCloudFunction('family', {
								action: 'quit',
								family_id: this.familyId
							})
							
							if (result.code === 0) {
								uni.showToast({
									title: '退出成功'
								})
								uni.navigateBack()
							} else {
								uni.showToast({
									title: result.message,
									icon: 'none'
								})
							}
						} catch (error) {
							uni.showToast({
								title: '退出失败',
								icon: 'none'
							})
						}
					}
				}
			})
		},
		
		// 处理解散
		handleDissolve() {
			uni.showModal({
				title: '警告',
				content: '解散家庭组后无法恢复，是否继续？',
				success: async (res) => {
					if (res.confirm) {
						try {
							const result = await callCloudFunction('family', {
								action: 'dissolve',
								family_id: this.familyId
							})
							
							if (result.code === 0) {
								uni.showToast({
									title: '已解散'
								})
								uni.navigateBack()
							} else {
								uni.showToast({
									title: result.message,
									icon: 'none'
								})
							}
						} catch (error) {
							uni.showToast({
								title: '操作失败',
								icon: 'none'
							})
						}
					}
				}
			})
		},
		
		// 获取昵称首字母或简写
		getNameInitial(nickname) {
			if (!nickname) return '?'
			
			// 如果是中文，取第一个字
			if (/[\u4e00-\u9fa5]/.test(nickname)) {
				return nickname.charAt(0)
			}
			
			// 如果是英文，取首字母大写
			if (/[a-zA-Z]/.test(nickname)) {
				return nickname.charAt(0).toUpperCase()
			}
			
			// 其他情况返回第一个字符
			return nickname.charAt(0)
		},
		
		// 获取头像背景色
		getAvatarColor(userId) {
			const colors = [
				'#5985E1',  // 主色
				'#34C759',  // 绿色
				'#FF9500',  // 橙色
				'#FF3B30',  // 红色
				'#5856D6'   // 紫色
			]
			// 使用用户ID的最后一个字符的ASCII码来选择颜色
			const lastChar = userId.charAt(userId.length - 1)
			const index = lastChar.charCodeAt(0) % colors.length
			return colors[index]
		}
	}
}
</script>

<style>
.container {
	display: flex;
	flex-direction: column;
	height: 100vh;
	background-color: #f8f8f8;
}

.header-card {
	background: linear-gradient(to right, #5985E1, #3A66C0);
	color: #fff;
	padding: 40rpx 30rpx 60rpx;
	position: relative;
	z-index: 1;
}

.card-content {
	background: rgba(255,255,255,0.1);
	border-radius: 20rpx;
	padding: 30rpx;
}

.family-info {
	margin-bottom: 30rpx;
}

.family-name {
	font-size: 40rpx;
	font-weight: bold;
	margin-bottom: 10rpx;
	display: block;
}

.create-time {
	font-size: 24rpx;
	opacity: 0.8;
}

.family-stats {
	display: flex;
	align-items: center;
}

.stat-item {
	flex: 1;
	text-align: center;
}

.stat-value {
	font-size: 40rpx;
	font-weight: bold;
	margin-bottom: 8rpx;
	display: block;
}

.stat-label {
	font-size: 24rpx;
	opacity: 0.8;
}

.stat-divider {
	width: 2rpx;
	height: 60rpx;
	background: rgba(255,255,255,0.2);
}

.content {
	flex: 1;
	position: relative;
	margin-top: -20rpx;
	border-radius: 20rpx 20rpx 0 0;
	background-color: #f8f8f8;
	z-index: 2;
}

.section {
	background: #fff;
	border-radius: 20rpx;
	margin: 20rpx;
	padding: 30rpx;
}

.section-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 30rpx;
}

.section-title {
	font-size: 32rpx;
	font-weight: bold;
	color: #333;
}

.header-right {
	display: flex;
	gap: 20rpx;
}

.action-btn {
	display: flex;
	align-items: center;
	font-size: 26rpx;
	padding: 12rpx 30rpx;
	border-radius: 30rpx;
	border: none;
	line-height: 1;
}

.btn-icon {
	font-size: 28rpx;
	margin-right: 8rpx;
}

.action-btn::after {
	border: none;
}

.invite-btn {
	background: #5985E1;
	color: #fff;
}

.member-card {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 20rpx 0;
	border-bottom: 1rpx solid #f5f5f5;
}

.member-card:last-child {
	border-bottom: none;
}

.member-main {
	display: flex;
	align-items: center;
	flex: 1;
}

.member-avatar {
	width: 80rpx;
	height: 80rpx;
	border-radius: 40rpx;
	margin-right: 20rpx;
	background: #5985E1;
	color: #fff;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 32rpx;
	font-weight: bold;
}

.member-info {
	flex: 1;
}

.member-name {
	font-size: 30rpx;
	color: #333;
	margin-bottom: 8rpx;
	display: block;
}

.member-join-time {
	font-size: 24rpx;
	color: #999;
}

.member-actions {
	display: flex;
	align-items: center;
	gap: 20rpx;
}

.role-tag {
	font-size: 22rpx;
	padding: 4rpx 16rpx;
	border-radius: 20rpx;
}

.role-owner {
	background-color: #FF9500;
	color: #fff;
}

.role-admin {
	background-color: #34C759;
	color: #fff;
}

.role-member {
	background-color: #8E8E93;
	color: #fff;
}

.remove-btn {
	font-size: 24rpx;
	color: #FF3B30;
	background: none;
	padding: 0;
	margin: 0;
	line-height: 1;
}

.remove-btn::after {
	border: none;
}

.footer {
	padding: 30rpx;
	background: #fff;
}

.danger-btn {
	background: #FF3B30;
	color: #fff;
	font-size: 32rpx;
	padding: 20rpx;
	border-radius: 10rpx;
	border: none;
}

.quit-btn {
	background: #FF9500;
	color: #fff;
	font-size: 32rpx;
	padding: 20rpx;
	border-radius: 10rpx;
	border: none;
}

.danger-btn::after,
.quit-btn::after {
	border: none;
}
</style> 