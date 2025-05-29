<template>
	<view class="container">
		<view class="form-container">
			<view class="form-item">
				<text class="label required">反馈标题</text>
				<input type="text" v-model="formData.title" placeholder="请输入反馈标题" class="input"/>
			</view>
			
			<view class="form-item">
				<text class="label required">反馈内容</text>
				<textarea v-model="formData.content" placeholder="请详细描述您的问题或建议" class="textarea"/>
			</view>
			
			<button @click="submitForm" class="submit-btn" :disabled="loading">提交反馈</button>
		</view>
	</view>
</template>

<script>
	import { callCloudFunction } from '@/utils/cloud.js'
	
	export default {
		data() {
			return {
				formData: {
					title: '',
					content: ''
				},
				loading: false
			}
		},
		methods: {
			async submitForm() {
				if (!this.formData.title.trim()) {
					uni.showToast({
						title: '请输入反馈标题',
						icon: 'none'
					})
					return
				}
				
				if (!this.formData.content.trim()) {
					uni.showToast({
						title: '请输入反馈内容',
						icon: 'none'
					})
					return
				}
				
				this.loading = true
				uni.showLoading({
					title: '提交中...',
					mask: true
				})
				
				try {
					const result = await callCloudFunction('feedback', {
						action: 'submit',
						title: this.formData.title.trim(),
						content: this.formData.content.trim()
					})
					
					if (result.code === 0) {
						uni.showToast({
							title: '提交成功',
							icon: 'success'
						})
						
						// 设置上一页需要刷新
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
							title: result.message || '提交失败',
							icon: 'none'
						})
					}
				} catch (error) {
					console.error('提交反馈失败：', error)
					uni.showToast({
						title: '提交失败，请稍后重试',
						icon: 'none'
					})
				} finally {
					this.loading = false
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

.form-container {
	background: #fff;
	border-radius: 24rpx;
	padding: 30rpx;
	box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.05);
}

.form-item {
	margin-bottom: 30rpx;
}

.label {
	font-size: 28rpx;
	color: #666;
	margin-bottom: 12rpx;
	display: block;
}

.required::before {
	content: '*';
	color: #ff4d4f;
	margin-right: 4rpx;
}

.input {
	width: 100%;
	height: 88rpx;
	border: 1px solid #eee;
	border-radius: 12rpx;
	padding: 0 24rpx;
	font-size: 28rpx;
	background: #f8f8f8;
	box-sizing: border-box;
}

.textarea {
	width: 100%;
	height: 320rpx;
	border: 1px solid #eee;
	border-radius: 12rpx;
	padding: 24rpx;
	font-size: 28rpx;
	background: #f8f8f8;
	box-sizing: border-box;
}

.submit-btn {
	width: 400rpx;
	height: 88rpx;
	line-height: 88rpx;
	background: #5985E1;
	border-radius: 44rpx;
	color: #fff;
	font-size: 30rpx;
	margin: 60rpx auto 30rpx;
	text-align: center;
	box-shadow: 0 4rpx 12rpx rgba(89,133,225,0.3);
}

.submit-btn:active {
	transform: scale(0.98);
	box-shadow: 0 2rpx 6rpx rgba(89,133,225,0.3);
}

.submit-btn[disabled] {
	opacity: 0.6;
	transform: none;
}
</style> 