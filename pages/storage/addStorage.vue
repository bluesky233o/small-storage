<template>
	<view class="container">
		<view class="form-group">
			<!-- 收纳柜名称 -->
			<view class="form-item">
				<text class="label required">收纳柜名称</text>
				<input type="text" v-model="formData.name" placeholder="请输入收纳柜名称" class="input"/>
			</view>
			
			<!-- 收纳柜类型 -->
			<view class="form-item">
				<text class="label required">收纳柜类型</text>
				<input type="text" v-model="formData.type" placeholder="请输入收纳柜类型" class="input"/>
			</view>
			
			<!-- 类型标签颜色 -->
			<view class="form-item">
				<text class="label required">类型标签颜色</text>
				<view class="color-picker" @tap="showPickerColorPop">
					<view class="color-preview" :style="{ backgroundColor: formData.typeColor }"></view>
					<text class="color-value">{{formData.typeColor}}</text>
				</view>
			</view>
			
			<!-- 收纳柜介绍 -->
			<view class="form-item">
				<text class="label">收纳柜介绍</text>
				<textarea v-model="formData.description" placeholder="请输入收纳柜介绍（选填）" class="textarea"/>
			</view>
			
			<!-- 收纳柜图标 -->
			<view class="form-item">
				<text class="label required">选择图标</text>
				<view class="icon-grid">
					<view 
						v-for="(icon, index) in displayIcons" 
						:key="index"
						class="icon-item"
						:class="{'active': formData.selectedIcon === icon}"
						@click="selectIcon(icon)"
					>
						<image :src="icon" mode="aspectFit" class="icon-image"></image>
					</view>
					<view 
						class="icon-item more"
						:class="{'active': formData.selectedIcon && !displayIcons.includes(formData.selectedIcon)}"
						@click="openIconPopup"
					>
						<template v-if="formData.selectedIcon && !displayIcons.includes(formData.selectedIcon)">
							<image :src="formData.selectedIcon" mode="aspectFit" class="icon-image"></image>
						</template>
						<text v-else class="more-text">更多</text>
					</view>
				</view>
			</view>
		</view>
		
		<!-- 提交按钮 -->
		<button class="submit-btn" :loading="loading" @tap="handleSubmit">保存</button>
		
		<!-- 颜色选择器组件 -->
		<picker-color :isShow="showPickerColor" :bottom="0" @callback="getPickerColor" />
		
		<!-- 图标选择弹窗 -->
		<uni-popup ref="iconPopup" type="center" @change="popupChange">
			<view class="icon-popup">
				<view class="popup-header">
					<text class="popup-title">选择图标</text>
					<text class="popup-close" @click="showIconModal = false">×</text>
				</view>
				<view class="popup-content">
					<view class="icon-grid">
						<view 
							v-for="(icon, index) in icons" 
							:key="index"
							class="icon-item"
							:class="{'active': formData.selectedIcon === icon}"
							@click="selectIconAndClose(icon)"
						>
							<image :src="icon" mode="aspectFit" class="icon-image"></image>
						</view>
					</view>
				</view>
			</view>
		</uni-popup>
	</view>
</template>

<script>
import pickerColor from "@/components/helang-pickerColor/helang-pickerColor.vue"
import { callCloudFunction } from '@/utils/cloud.js'
import uniPopup from '@/uni_modules/uni-popup/components/uni-popup/uni-popup.vue'

export default {
	components: {
		"picker-color": pickerColor,
		uniPopup
	},
	data() {
		return {
			loading: false,
			showPickerColor: false, // 是否显示颜色选择器
			formData: {
				name: '',
				type: '',
				description: '',
				selectedIcon: '',
				typeColor: '#F4B042',
				addDate: new Date().toISOString().split('T')[0]
			},
			icons: [
				'/static/images/storage/1.svg',
				'/static/images/storage/2.svg',
				'/static/images/storage/3.svg',
				'/static/images/storage/cabinet.svg',
				'/static/images/storage/fridge.svg',
				'/static/images/storage/tv-cabinet.svg',
				'/static/images/storage/wardrobe.svg',
				'/static/images/storage/bookshelf.svg',
				'/static/images/storage/drawer.svg'
			],
			displayIcons: [
				'/static/images/storage/1.svg',
				'/static/images/storage/2.svg',
				'/static/images/storage/3.svg',
				'/static/images/storage/cabinet.svg'
			],
			currentPage: 1,
			pageSize: 6,
			showIconModal: false
		}
	},
	computed: {
		totalPages() {
			return Math.ceil(this.icons.length / this.pageSize)
		}
	},
	methods: {
		// 打开图标选择弹窗
		openIconPopup() {
			this.$refs.iconPopup.open()
		},
		
		// 选择图标
		selectIcon(icon) {
			this.formData.selectedIcon = icon
		},
		
		// 显示颜色选择器
		showPickerColorPop() {
			this.showPickerColor = true
		},
		
		// 获取选择的颜色
		getPickerColor(color) {
			this.showPickerColor = false
			if(color) {
				this.formData.typeColor = color
			}
		},
		
		// 切换图标页面
		changePage(direction) {
			if (direction === 'prev' && this.currentPage > 1) {
				this.currentPage--
			} else if (direction === 'next' && this.currentPage < this.totalPages) {
				this.currentPage++
			}
		},
		
		// 表单提交
		async handleSubmit() {
			// 表单验证
			if (!this.formData.name.trim()) {
				uni.showToast({
					title: '请输入收纳柜名称',
					icon: 'none'
				})
				return
			}
			
			if (!this.formData.type.trim()) {
				uni.showToast({
					title: '请输入收纳柜类型',
					icon: 'none'
				})
				return
			}
			
			if (!this.formData.selectedIcon) {
				uni.showToast({
					title: '请选择图标',
					icon: 'none'
				})
				return
			}
			
			this.loading = true
			uni.showLoading({
				title: '添加中...',
				mask: true
			})
			
			try {
				const result = await callCloudFunction('storage', {
					action: 'add',
					name: this.formData.name,
					type: this.formData.type,
					typeColor: this.formData.typeColor,
					description: this.formData.description || '',
					icon: this.formData.selectedIcon.split('/').pop().replace('.svg', '')
				})
				
				if (result.code === 0) {
					uni.showToast({
						title: '添加成功',
						icon: 'success'
					})
					
					// 标记上一页需要刷新
					const pages = getCurrentPages()
					const prevPage = pages[pages.length - 2]
					if (prevPage) {
						prevPage.$vm.needRefresh = true
					}
					
					// 延迟返回上一页
					setTimeout(() => {
						uni.navigateBack()
					}, 1500)
				} else {
					uni.showToast({
						title: result.message || '添加失败',
						icon: 'none'
					})
				}
			} catch (error) {
				console.error('添加收纳柜失败：', error)
				uni.showToast({
					title: '添加失败，请稍后重试',
					icon: 'none'
				})
			} finally {
				this.loading = false
				uni.hideLoading()
			}
		},
		popupChange(e) {
			if (e.type === 'hide') {
				this.showIconModal = false
			}
		},
		selectIconAndClose(icon) {
			this.formData.selectedIcon = icon
			this.$refs.iconPopup.close()
		}
	}
}
</script>

<style>
.container {
	padding: 30rpx;
}

.form-group {
	background-color: #fff;
	border-radius: 12rpx;
	padding: 20rpx;
	box-sizing: border-box;
	width: 100%;
}

.form-item {
	margin-bottom: 30rpx;
	width: 100%;
	box-sizing: border-box;
}

.label {
	font-size: 28rpx;
	color: #333;
	margin-bottom: 10rpx;
	display: block;
}

.required::before {
	content: '*';
	color: #ff4d4f;
	margin-right: 4rpx;
}

.input {
	width: 100%;
	height: 80rpx;
	border: 1px solid #ddd;
	border-radius: 8rpx;
	padding: 0 20rpx;
	font-size: 28rpx;
	box-sizing: border-box;
}

.textarea {
	width: 100%;
	height: 160rpx;
	border: 1px solid #ddd;
	border-radius: 8rpx;
	padding: 20rpx;
	font-size: 28rpx;
	box-sizing: border-box;
}

.icon-grid {
	display: grid;
	grid-template-columns: repeat(4, 1fr);
	gap: 20rpx;
	margin-top: 20rpx;
}

.icon-item {
	aspect-ratio: 1;
	border: 2rpx solid #eee;
	border-radius: 12rpx;
	padding: 20rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	transition: all 0.3s;
}

.icon-item.active {
	border-color: #F4B042;
	background-color: rgba(244, 176, 66, 0.1);
	transform: scale(1.05);
}

.icon-item.more {
	border-style: dashed;
	color: #999;
}

.icon-image {
	width: 80%;
	height: 80%;
}

.more-text {
	font-size: 28rpx;
	color: #666;
}

.submit-btn {
	margin-top: 40rpx;
	width: 100%;
	height: 88rpx;
	background: #007AFF;
	color: #fff;
	border-radius: 44rpx;
	font-size: 32rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}

.color-picker {
	display: flex;
	align-items: center;
	gap: 20rpx;
	margin-top: 10rpx;
}

.color-preview {
	width: 60rpx;
	height: 60rpx;
	border-radius: 8rpx;
	border: 1px solid #ddd;
	cursor: pointer;
}

.color-value {
	font-size: 28rpx;
	color: #666;
}

.icon-popup {
	background-color: #fff;
	border-radius: 24rpx;
	width: 600rpx;
	max-height: 800rpx;
	padding: 30rpx;
}

.popup-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 30rpx;
}

.popup-title {
	font-size: 32rpx;
	font-weight: bold;
	color: #333;
}

.popup-close {
	font-size: 40rpx;
	color: #999;
	padding: 10rpx;
}

.popup-content {
	max-height: 600rpx;
	overflow-y: auto;
}

.popup-content .icon-grid {
	display: grid;
	grid-template-columns: repeat(4, 1fr);
	gap: 20rpx;
	padding: 10rpx;
}

.popup-content .icon-item {
	aspect-ratio: 1;
	border: 2rpx solid #eee;
	border-radius: 12rpx;
	padding: 20rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	transition: all 0.3s;
}

.popup-content .icon-item.active {
	border-color: #F4B042;
	background-color: rgba(244, 176, 66, 0.1);
	transform: scale(1.05);
}

.popup-content .icon-image {
	width: 80%;
	height: 80%;
}
</style>
