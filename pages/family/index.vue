<template>
	<view class="container">
		<!-- 顶部区域 -->
		<view class="header">
			<view class="header-content">
				<text class="title">家庭共享</text>
				<text class="subtitle">与家人一起管理物品</text>
			</view>
			<view class="header-actions">
				<button class="create-btn" @tap="showCreateModal">
					<text class="create-icon">+</text>
					<text>创建家庭组</text>
				</button>
				<button class="join-btn" @tap="showJoinModal">
					<text class="join-icon">⚡</text>
					<text>加入家庭组</text>
				</button>
			</view>
		</view>
		
		<!-- 家庭组列表 -->
		<scroll-view class="content" scroll-y refresher-enabled 
			:refresher-triggered="isRefreshing"
			@refresherrefresh="onRefresh"
		>
			<view class="family-list" v-if="families.length > 0">
				<view class="family-card" v-for="family in families" :key="family._id" @tap="toFamilyDetail(family._id)">
					<view class="card-main">
						<view class="card-header">
							<text class="family-name">{{family.name}}</text>
							<text class="role-tag" :class="roleClasses[getUserRole(family)]">{{getRoleText(family)}}</text>
						</view>
						<view class="card-body">
							<view class="member-avatars">
								<view 
									v-for="(member, index) in family.members.slice(0, 3)" 
									:key="index"
									class="member-avatar"
									:style="{
										backgroundColor: getAvatarColor(index),
										zIndex: 3 - index
									}"
								>
									<text>{{getNameInitial(member.nickname)}}</text>
								</view>
								<view class="member-count" v-if="family.members.length > 3">
									+{{family.members.length - 3}}
								</view>
							</view>
							<view class="card-stats">
								<view class="stat-item">
									<text class="stat-label">成员</text>
									<text class="stat-value">{{family.members.length}}人</text>
								</view>
								<view class="stat-item">
									<text class="stat-label">创建时间</text>
									<text class="stat-value">{{formatDate(family.create_time, 'MM-DD')}}</text>
								</view>
							</view>
						</view>
					</view>
					<view class="card-arrow">
						<image src="/static/icon/right.svg" mode="aspectFit" class="arrow-icon"></image>
					</view>
				</view>
			</view>
			
			<!-- 空状态 -->
			<view class="empty-state" v-else>
				<image src="/static/icon/family-empty.svg" mode="aspectFit" class="empty-icon"></image>
				<text class="empty-title">还没有加入任何家庭组</text>
				<text class="empty-desc">创建或加入一个家庭组，开始与家人共享物品吧</text>
				<button class="empty-btn" @tap="showCreateModal">立即创建</button>
			</view>
		</scroll-view>
		
		<!-- 创建家庭组弹窗 -->
		<uni-popup ref="createPopup" type="dialog">
			<uni-popup-dialog
				mode="input"
				title="创建家庭组"
				placeholder="请输入家庭组名称"
				:before-close="true"
				@confirm="handleCreate"
				@close="closeCreateModal"
			></uni-popup-dialog>
		</uni-popup>
		
		<!-- 加入家庭组弹窗 -->
		<uni-popup ref="joinPopup" type="dialog">
			<uni-popup-dialog
				mode="input"
				title="加入家庭组"
				placeholder="请输入邀请码"
				:before-close="true"
				@confirm="handleJoin"
				@close="closeJoinModal"
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
			families: [],
			isRefreshing: false,
			roleClasses: {
				'owner': 'role-owner',
				'admin': 'role-admin',
				'member': 'role-member'
			}
		}
	},
	onShow() {
		this.loadFamilies()
	},
	onPullDownRefresh() {
		this.loadFamilies().finally(() => {
			uni.stopPullDownRefresh()
		})
	},
	methods: {
		formatDate,
		// 下拉刷新
		async onRefresh() {
			this.isRefreshing = true
			await this.loadFamilies()
			this.isRefreshing = false
		},
		// 加载家庭组列表
		async loadFamilies() {
			try {
				uni.showLoading({
					title: '加载中...'
				})
				
				const result = await callCloudFunction('family', {
					action: 'getMyFamilies'
				})
				
				if (result.code === 0) {
					this.families = result.list || []
				} else {
					uni.showToast({
						title: result.message,
						icon: 'none'
					})
				}
			} catch (error) {
				uni.showToast({
					title: '加载失败',
					icon: 'none'
				})
			} finally {
				uni.hideLoading()
			}
		},
		
		// 显示创建弹窗
		showCreateModal() {
			this.$refs.createPopup.open()
		},
		
		// 关闭创建弹窗
		closeCreateModal() {
			this.$refs.createPopup.close()
		},
		
		// 处理创建
		async handleCreate(value) {
			if (!value.trim()) {
				uni.showToast({
					title: '请输入家庭组名称',
					icon: 'none'
				})
				return
			}
			
			try {
				uni.showLoading({
					title: '创建中...'
				})
				
				const result = await callCloudFunction('family', {
					action: 'create',
					name: value.trim()
				})
				
				if (result.code === 403) {
					uni.hideLoading()
					uni.showModal({
						title: '赞助提示',
						content: '此功能需要赞助后才能使用，每月仅需1元。\n\n如需开通请发送邮件',
						confirmText: '我知道了',
						showCancel: false
					})
					return
				}
				
				if (result.code === 0) {
					uni.showToast({
						title: '创建成功'
					})
					this.closeCreateModal()
					this.loadFamilies()
				} else {
					uni.showToast({
						title: result.message,
						icon: 'none'
					})
				}
			} catch (error) {
				uni.showToast({
					title: '创建失败',
					icon: 'none'
				})
			} finally {
				uni.hideLoading()
			}
		},
		
		// 跳转到详情页
		toFamilyDetail(id) {
			uni.navigateTo({
				url: `/pages/family/detail?id=${id}`
			})
		},
		
		// 获取角色文本
		getRoleText(family) {
			const roleMap = {
				owner: '创建者',
				admin: '管理员',
				member: '成员'
			}
			return roleMap[family.currentUserRole] || '成员'
		},
		
		// 获取用户角色
		getUserRole(family) {
			return family.currentUserRole || 'member'
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
		getAvatarColor(index) {
			const colors = [
				'#5985E1',  // 主色
				'#34C759',  // 绿色
				'#FF9500'   // 橙色
			]
			return colors[index % colors.length]
		},
		
		// 显示加入弹窗
		showJoinModal() {
			this.$refs.joinPopup.open()
		},
		
		// 关闭加入弹窗
		closeJoinModal() {
			this.$refs.joinPopup.close()
		},
		
		// 处理加入
		async handleJoin(code) {
			if (!code.trim()) {
				uni.showToast({
					title: '请输入邀请码',
					icon: 'none'
				})
				return
			}
			
			try {
				uni.showLoading({
					title: '加入中...'
				})
				
				const result = await callCloudFunction('family', {
					action: 'joinFamily',
					invite_code: code.trim()
				})
				
				if (result.code === 0) {
					uni.showToast({
						title: '加入成功'
					})
					this.closeJoinModal()
					this.loadFamilies()
				} else {
					uni.showToast({
						title: result.message,
						icon: 'none'
					})
				}
			} catch (error) {
				uni.showToast({
					title: '加入失败',
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
	display: flex;
	flex-direction: column;
	height: 100vh;
	background-color: #f8f8f8;
}

.header {
	padding: 40rpx 30rpx;
	background: linear-gradient(to right, #5985E1, #3A66C0);
	color: #fff;
	position: relative;
	z-index: 1;
}

.header-content {
	margin-bottom: 30rpx;
}

.header-actions {
	display: flex;
	gap: 20rpx;
}

.title {
	font-size: 44rpx;
	font-weight: bold;
	margin-bottom: 10rpx;
	display: block;
}

.subtitle {
	font-size: 28rpx;
	opacity: 0.9;
}

.create-btn,
.join-btn {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	background: rgba(255,255,255,0.2);
	border: none;
	color: #fff;
	font-size: 28rpx;
	padding: 16rpx 30rpx;
	border-radius: 40rpx;
}

.create-btn::after,
.join-btn::after {
	border: none;
}

.create-icon,
.join-icon {
	font-size: 36rpx;
	margin-right: 10rpx;
}

.content {
	flex: 1;
	position: relative;
	margin-top: -20rpx;
	border-radius: 20rpx 20rpx 0 0;
	background-color: #f8f8f8;
	padding: 30rpx;
	z-index: 2;
}

.family-card {
	background: #fff;
	border-radius: 20rpx;
	padding: 30rpx;
	margin-bottom: 20rpx;
	display: flex;
	align-items: center;
	box-shadow: 0 2rpx 20rpx rgba(0,0,0,0.05);
}

.card-main {
	flex: 1;
}

.card-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 20rpx;
}

.family-name {
	font-size: 32rpx;
	font-weight: bold;
	color: #333;
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

.card-body {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.member-avatars {
	display: flex;
	align-items: center;
}

.member-avatar {
	width: 60rpx;
	height: 60rpx;
	border-radius: 50%;
	border: 4rpx solid #fff;
	margin-right: -15rpx;
	background: #5985E1;
	color: #fff;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 24rpx;
	font-weight: bold;
}

.member-count {
	width: 60rpx;
	height: 60rpx;
	border-radius: 30rpx;
	background: #f0f0f0;
	color: #666;
	font-size: 24rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-left: 10rpx;
	border: 4rpx solid #fff;
}

.card-stats {
	display: flex;
	gap: 30rpx;
}

.stat-item {
	text-align: right;
}

.stat-label {
	font-size: 24rpx;
	color: #999;
	display: block;
}

.stat-value {
	font-size: 26rpx;
	color: #333;
	font-weight: 500;
}

.card-arrow {
	margin-left: 20rpx;
}

.arrow-icon {
	width: 32rpx;
	height: 32rpx;
	opacity: 0.3;
}

.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 100rpx 40rpx;
}

.empty-icon {
	width: 240rpx;
	height: 240rpx;
	margin-bottom: 40rpx;
}

.empty-title {
	font-size: 32rpx;
	color: #333;
	font-weight: bold;
	margin-bottom: 16rpx;
}

.empty-desc {
	font-size: 28rpx;
	color: #999;
	text-align: center;
	margin-bottom: 40rpx;
}

.empty-btn {
	background: #5985E1;
	color: #fff;
	font-size: 30rpx;
	padding: 20rpx 60rpx;
	border-radius: 40rpx;
	border: none;
}

.empty-btn::after {
	border: none;
}
</style> 