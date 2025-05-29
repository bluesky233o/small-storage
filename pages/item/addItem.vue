<template>
	<view class="container">
		<!-- 主要内容区 -->
		<view class="content">
			<!-- 基本信息卡片 -->
			<view class="card">
				<view class="card-header">
					<text class="card-title">基本信息</text>
				</view>
				<view class="card-body">
					<view class="form-item">
						<text class="label required">物品名称</text>
						<input type="text" v-model="formData.name" placeholder="请输入物品名称" class="input"/>
					</view>
					
					<view class="form-item">
						<text class="label required">物品类型</text>
						<input type="text" v-model="formData.type" placeholder="请输入物品类型" class="input"/>
					</view>
					
					<view class="form-item">
						<text class="label">物品介绍</text>
						<textarea v-model="formData.description" placeholder="请输入物品介绍（选填）" class="textarea"/>
					</view>
				</view>
			</view>
			
			<!-- 数量与价格卡片 -->
			<view class="card">
				<view class="card-header">
					<text class="card-title">数量与价格</text>
				</view>
				<view class="card-body">
					<view class="form-row">
						<view class="form-item half">
							<text class="label required">数量</text>
							<input type="number" v-model="formData.quantity" placeholder="请输入数量" class="input"/>
						</view>
						<view class="form-item half">
							<text class="label">单价（元）</text>
							<input type="digit" v-model="formData.price" placeholder="请输入单价" class="input"/>
						</view>
					</view>
					
					<view class="form-item switch-item">
						<text class="label">是否为消耗品</text>
						<switch :checked="formData.isConsumable" @change="onConsumableChange" color="#5985E1" />
					</view>
				</view>
			</view>
			
			<!-- 分类与图标卡片 -->
			<view class="card">
				<view class="card-header">
					<text class="card-title">分类与图标</text>
				</view>
				<view class="card-body">
					<view class="form-item">
						<text class="label required">所在收纳柜</text>
						<template v-if="isFixedStorage">
							<view class="storage-display">{{ getStorageName(formData.storageId) }}</view>
						</template>
						<template v-else>
							<view class="storage-select">
								<input 
									type="text" 
									v-model="storageSearch" 
									placeholder="搜索收纳柜" 
									class="input"
									@focus="showStorageSelect = true"
									@input="filterStorages"
								/>
								<view class="storage-result" v-if="formData.storageId">
									{{ getStorageName(formData.storageId) }}
								</view>
								<view class="storage-dropdown" v-show="showStorageSelect">
									<view 
										v-for="storage in filteredStorages" 
										:key="storage._id"
										class="storage-option"
										@click="selectStorage(storage)"
									>
										{{ storage.name }}
									</view>
								</view>
							</view>
						</template>
					</view>
					
					<view class="form-item">
						<view class="color-picker-wrapper">
							<text class="label required">标签颜色</text>
							<view class="color-picker" @tap="showPickerColorPop">
								<view class="color-preview" :style="{ backgroundColor: formData.typeColor }"></view>
								<text class="color-value">{{formData.typeColor}}</text>
							</view>
						</view>
					</view>
					
					<view class="form-item">
						<text class="label required">物品图标</text>
						<view class="icon-grid">
							<view 
								v-for="(icon, index) in displayIcons" 
								:key="index"
								class="icon-item"
								:class="{'active': formData.selectedIcon === icon}"
								@click="selectIcon(icon)"
							>
								<image :src="'/static/images/item/' + icon" mode="aspectFit" class="icon-image"></image>
							</view>
							<view 
								v-if="icons.length > 5" 
								class="icon-item more"
								:class="{'active': formData.selectedIcon && !displayIcons.includes(formData.selectedIcon)}"
								@click="showIconModal = true"
							>
								<template v-if="formData.selectedIcon && !displayIcons.includes(formData.selectedIcon)">
									<image :src="'/static/images/item/' + formData.selectedIcon" mode="aspectFit" class="icon-image"></image>
								</template>
								<text v-else class="more-text">更多</text>
							</view>
						</view>
					</view>
				</view>
			</view>
			
			<!-- 附加信息卡片 -->
			<view class="card">
				<view class="card-header">
					<text class="card-title">附加信息</text>
				</view>
				<view class="card-body">
					<view class="form-item">
						<text class="label">到期时间</text>
						<view class="date-picker" @click="showDatePicker">
							<text :class="{'placeholder': !formData.expiryDate}">
								{{ formData.expiryDate || '请选择到期时间（选填）' }}
							</text>
						</view>
					</view>
					
					<view class="form-item">
						<text class="label optional">物品图片</text>
						<view class="upload-area" @click="chooseImage">
							<image v-if="formData.image" :src="formData.image" mode="aspectFit" class="preview-image"></image>
							<view v-else class="upload-placeholder">
								<text class="upload-icon">+</text>
								<text class="upload-text">点击上传图片</text>
							</view>
						</view>
					</view>
					
					<view class="form-item checkbox-item" v-if="formData.image">
						<label class="checkbox-label">
							<checkbox :value="formData.useImageAsIcon" @tap="toggleUseImageAsIcon" />
							<text>使用上传的图片作为物品图标</text>
						</label>
					</view>
				</view>
			</view>
		</view>
		
		<!-- 底部按钮 -->
		<view class="footer">
			<button @click="submitForm" class="submit-btn" :loading="loading">确认添加</button>
		</view>
		
		<!-- 日期选择弹窗 -->
		<uni-popup ref="datePopup" type="bottom">
			<view class="popup-date">
				<view class="popup-header">
					<text class="popup-cancel" @click="closeDatePicker">取消</text>
					<text class="popup-title">选择日期</text>
					<text class="popup-confirm" @click="confirmDate">确定</text>
				</view>
				<picker-view 
					class="picker-view" 
					:value="datePickerValue" 
					@change="onDatePickerChange"
					:indicator-style="'height: 88rpx;'"
				>
					<picker-view-column>
						<view class="picker-item" v-for="(year, index) in years" :key="index">{{year}}年</view>
					</picker-view-column>
					<picker-view-column>
						<view class="picker-item" v-for="(month, index) in months" :key="index">{{month}}月</view>
					</picker-view-column>
					<picker-view-column>
						<view class="picker-item" v-for="(day, index) in days" :key="index">{{day}}日</view>
					</picker-view-column>
				</picker-view>
			</view>
		</uni-popup>
		
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
							<image :src="'/static/images/item/' + icon" mode="aspectFit" class="icon-image"></image>
						</view>
					</view>
				</view>
			</view>
		</uni-popup>
		
		<picker-color :isShow="showPickerColor" :bottom="0" @callback="getPickerColor" />
	</view>
</template>

<script>
	import pickerColor from "@/components/helang-pickerColor/helang-pickerColor.vue"
	import { callCloudFunction } from '@/utils/cloud.js'
	
	const ITEM_ICONS = [
		'storagebox.svg',
		'boxers.svg',
		'cap.svg',
		'daily.svg',
		'dress.svg',
		'make-up.svg',
		'pants.svg',
		'purse.svg',
		'rings.svg',
		'skirt.svg',
		'wash.svg',
		'drink.svg',
		'seasoning.svg',
		'snack.svg',
		'vegetable.svg'

	];
	
	export default {
		components: {
			"picker-color": pickerColor
		},
		data() {
			const currentDate = new Date()
			const currentYear = currentDate.getFullYear()
			return {
				showPickerColor: false, // 是否显示颜色选择器
				formData: {
					name: '',
					description: '',
					type: '',
					typeColor: '#5985E1',
					expiryDate: '',
					image: '', // 图片文件ID
					imageUrl: '', // 图片临时访问链接
					selectedIcon: '',
					useImageAsIcon: false,
					storageId: '',
					quantity: 1,
					unit: '',
					price: '',
					isConsumable: false, // 添加isConsumable字段
				},
				datePickerValue: [0, 0, 0],
				years: Array.from({length: 10}, (_, i) => currentYear + i),
				months: Array.from({length: 12}, (_, i) => i + 1),
				days: Array.from({length: 31}, (_, i) => i + 1),
				tempDate: null,
				icons: ITEM_ICONS,
				storages: [], // 收纳柜列表
				filteredStorages: [],
				storageSearch: '',
				showStorageSelect: false,
				showIconModal: false,
				loading: false,
				isFixedStorage: false, // 是否是固定收纳柜（从收纳柜详情页进入）
			}
		},
		computed: {
			displayIcons() {
				return this.icons.slice(0, 5);
			}
		},
		onLoad(options) {
			if (options.storageId) {
				this.formData.storageId = options.storageId
				this.isFixedStorage = true // 如果传入了 storageId，说明是从收纳柜详情页进入
			}
			// 如果不是固定收纳柜，才需要获取收纳柜列表
			if (!this.isFixedStorage) {
				this.getStorageList()
			} else {
				// 如果是固定收纳柜，只获取当前收纳柜的信息
				this.getStorageInfo(options.storageId)
			}
		},
		methods: {
			selectIcon(icon) {
				this.formData.selectedIcon = icon;
			},
			selectIconAndClose(icon) {
				this.selectIcon(icon);
				this.showIconModal = false;
			},
			popupChange(e) {
				if (!e.show) {
					this.showIconModal = false;
				}
			},
			showDatePicker() {
				if (this.formData.expiryDate) {
					const date = new Date(this.formData.expiryDate)
					const yearIndex = this.years.indexOf(date.getFullYear())
					const monthIndex = date.getMonth()
					const dayIndex = date.getDate() - 1
					this.datePickerValue = [yearIndex, monthIndex, dayIndex]
				} else {
					const now = new Date()
					this.datePickerValue = [0, now.getMonth(), now.getDate() - 1]
				}
				// 初始化临时日期
				const values = this.datePickerValue
				const year = this.years[values[0]]
				const month = this.months[values[1]]
				const day = this.days[values[2]]
				this.tempDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
				
				this.$refs.datePopup.open()
			},
			closeDatePicker() {
				this.$refs.datePopup.close()
				this.tempDate = null
			},
			onDatePickerChange(e) {
				const values = e.detail.value
				const year = this.years[values[0]]
				const month = this.months[values[1]]
				const day = this.days[values[2]]
				
				// 更新临时日期
				this.tempDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
				// 同时更新 datePickerValue
				this.datePickerValue = values
			},
			confirmDate() {
				if (this.tempDate) {
					this.formData.expiryDate = this.tempDate
					this.$forceUpdate() // 强制更新视图
				}
				this.closeDatePicker()
			},
			filterStorages() {
				if (!this.storageSearch) {
					this.filteredStorages = [...this.storages]
					return
				}
				this.filteredStorages = this.storages.filter(storage => 
					storage.name.toLowerCase().includes(this.storageSearch.toLowerCase())
				)
			},
			selectStorage(storage) {
				this.formData.storageId = storage._id
				this.showStorageSelect = false
			},
			getStorageName(id) {
				const storage = this.storages.find(s => s._id === id)
				return storage ? storage.name : ''
			},
			async chooseImage() {
				try {
					const { tempFiles } = await uni.chooseImage({
						count: 1,
						sizeType: ['compressed'],
						sourceType: ['album', 'camera']
					});
					
					if (!tempFiles || tempFiles.length === 0) {
						return;
					}
					
					const tempFile = tempFiles[0];
					
					// 显示上传中
					uni.showLoading({
						title: '上传中...',
						mask: true
					});
					
					// 压缩图片
					const compressedFile = await this.compressImage(tempFile.path);
					
					// 转换为base64
					const base64 = await this.pathToBase64(compressedFile);
					
					// 获取文件扩展名
					const fileType = tempFile.path.split('.').pop().toLowerCase();
					
					// 上传到云存储
					const result = await this.uploadImage(compressedFile);
					
					if (result.code === 0) {
						this.formData.image = result.data.fileID;
						this.formData.imageUrl = result.data.tempFileURL;
					} else {
						uni.showToast({
							title: result.message || '上传失败',
							icon: 'none'
						});
					}
				} catch (error) {
					console.error('选择或上传图片失败：', error);
					uni.showToast({
						title: '上传失败，请重试',
						icon: 'none'
					});
				} finally {
					uni.hideLoading();
				}
			},
			
			// 压缩图片
			async compressImage(path) {
				return new Promise((resolve, reject) => {
					uni.compressImage({
						src: path,
						quality: 80,
						success: res => resolve(res.tempFilePath),
						fail: err => reject(err)
					});
				});
			},
			
			// 路径转base64
			async pathToBase64(path) {
				return new Promise((resolve, reject) => {
					uni.getFileSystemManager().readFile({
						filePath: path,
						encoding: 'base64',
						success: res => resolve('data:image/jpeg;base64,' + res.data),
						fail: err => reject(err)
					});
				});
			},
			
			// 上传图片
			async uploadImage(tempFilePath) {
				try {
					const cloudPath = `item-images/${Date.now()}-${Math.random().toString(36).substr(2)}.${tempFilePath.match(/\.(\w+)$/)[1]}`
					const uploadResult = await uniCloud.uploadFile({
						cloudPath,
						filePath: tempFilePath,
						cloudPathAsRealPath:true
					})
					
					return {
						code: 0,
						data: {
							fileID: uploadResult.fileID
						}
					}
				} catch (error) {
					console.error('上传图片失败：', error)
					return {
						code: 1,
						message: '上传图片失败'
					}
				}
			},
			
			// 切换是否使用上传图片作为图标
			toggleUseImageAsIcon() {
				this.formData.useImageAsIcon = !this.formData.useImageAsIcon;
			},
			
			// 处理消耗品开关变化
			onConsumableChange(e) {
				this.formData.isConsumable = e.detail.value;
			},
			
			// 提交表单
			async submitForm() {
				if (!this.formData.name) {
					uni.showToast({
						title: '请输入物品名称',
						icon: 'none'
					});
					return;
				}
				
				if (!this.formData.type) {
					uni.showToast({
						title: '请输入物品类型',
						icon: 'none'
					});
					return;
				}
				
				if (!this.formData.storageId) {
					uni.showToast({
						title: '请选择所在收纳柜',
						icon: 'none'
					});
					return;
				}
				
				if (!this.formData.useImageAsIcon && !this.formData.selectedIcon) {
					uni.showToast({
						title: '请选择物品图标',
						icon: 'none'
					});
					return;
				}
				
				try {
					uni.showLoading({
						title: '添加中...',
						mask: true
					});
					
					const params = {
						action: 'add',
						name: this.formData.name,
						quantity: Number(this.formData.quantity),
						unit: this.formData.unit,
						price: this.formData.price ? Number(this.formData.price) : 0,
						description: this.formData.description,
						type: this.formData.type,
						typeColor: this.formData.typeColor,
						expiryDate: this.formData.expiryDate,
						storageId: this.formData.storageId,
						icon: this.formData.useImageAsIcon ? this.formData.image : this.formData.selectedIcon,
						image: this.formData.image,
						useImageAsIcon: this.formData.useImageAsIcon,
						isConsumable: this.formData.isConsumable
					}
					
					const result = await callCloudFunction('item', params);
					
					if (result.code === 0) {
						uni.showToast({
							title: '添加成功',
							icon: 'success'
						});
						
						// 修改返回和刷新逻辑
						setTimeout(() => {
							const pages = getCurrentPages();
							const prevPage = pages[pages.length - 2];
							
							// 先设置需要刷新的标记
							if (prevPage) {
								// 设置上一页的数据需要刷新
								prevPage.$vm.needRefresh = true;
							}
							
							// 返回上一页
							uni.navigateBack({
								success: () => {
									// 确保返回完成后再触发刷新
									if (prevPage && prevPage.$vm.refreshData) {
										prevPage.$vm.refreshData();
									}
								}
							});
						}, 1500);
					} else {
						uni.showToast({
							title: result.message || '添加失败',
							icon: 'none'
						});
					}
				} catch (error) {
					console.error('添加物品失败：', error);
					uni.showToast({
						title: '添加失败，请重试',
						icon: 'none'
					});
				} finally {
					uni.hideLoading();
				}
			},
			showPickerColorPop() {
				this.showPickerColor = true;
			},
			getPickerColor(color) {
				this.showPickerColor = false;
				if(color) {
					this.formData.typeColor = color;
				}
			},
			// 获取收纳柜列表
			async getStorageList() {
				try {
					const result = await callCloudFunction('item', {
						action: 'getStorageList'
					})
					
					if (result.code === 0) {
						this.storages = result.data
						this.filteredStorages = [...this.storages]
					} else {
						uni.showToast({
							title: result.message || '获取收纳柜列表失败',
							icon: 'none'
						})
					}
				} catch (error) {
					console.error('获取收纳柜列表失败：', error)
					uni.showToast({
						title: '获取收纳柜列表失败',
						icon: 'none'
					})
				}
			},
			// 获取单个收纳柜信息
			async getStorageInfo(storageId) {
				try {
					const result = await callCloudFunction('storage', {
						action: 'detail',
						id: storageId
					})
					
					if (result.code === 0) {
						this.storages = [result.data]
					} else {
						uni.showToast({
							title: result.message || '获取收纳柜信息失败',
							icon: 'none'
						})
					}
				} catch (error) {
					console.error('获取收纳柜信息失败：', error)
					uni.showToast({
						title: '获取收纳柜信息失败',
						icon: 'none'
					})
				}
			},
		},
		watch: {
			showIconModal(val) {
				if (val) {
					this.$refs.iconPopup.open();
				} else {
					this.$refs.iconPopup.close();
				}
			},
			'formData.image'(val) {
				if (!val) {
					this.formData.useImageAsIcon = false;
				}
			}
		}
	}
</script>

<style>
/* 基础样式 */
.container {
	display: flex;
	flex-direction: column;
	min-height: 100vh;
	background-color: #f6f7fb;
	padding-bottom: calc(120rpx + env(safe-area-inset-bottom));
}

.content {
	flex: 1;
	padding: 24rpx;
}

/* 卡片样式 */
.card {
	background: #ffffff;
	border-radius: 24rpx;
	margin-bottom: 24rpx;
	box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.02);
	overflow: hidden;
	transform: translateZ(0);
}

.card-header {
	padding: 28rpx 32rpx;
	border-bottom: 2rpx solid #f5f6fa;
}

.card-title {
	font-size: 30rpx;
	font-weight: 600;
	color: #333333;
}

.card-body {
	padding: 32rpx;
}

/* 表单项样式 */
.form-item {
	margin-bottom: 28rpx;
}

.form-item:last-child {
	margin-bottom: 0;
}

.form-row {
	display: flex;
	gap: 24rpx;
	margin-bottom: 28rpx;
}

.half {
	flex: 1;
	margin-bottom: 0;
}

.label {
	font-size: 28rpx;
	color: #666666;
	margin-bottom: 16rpx;
	display: block;
	font-weight: 500;
}

.required::before {
	content: '*';
	color: #ff4d4f;
	margin-right: 8rpx;
}

.input {
	width: 100%;
	height: 88rpx;
	background: #f8f9fd;
	border-radius: 12rpx;
	padding: 0 24rpx;
	font-size: 28rpx;
	color: #333333;
	transition: all 0.3s ease;
}

.input:focus {
	background: #f0f5ff;
	box-shadow: 0 0 0 2rpx rgba(89,133,225,0.2);
}

.textarea {
	width: 100%;
	height: 180rpx;
	background: #f8f9fd;
	border-radius: 12rpx;
	padding: 20rpx 24rpx;
	font-size: 28rpx;
	color: #333333;
	transition: all 0.3s ease;
}

.textarea:focus {
	background: #f0f5ff;
	box-shadow: 0 0 0 2rpx rgba(89,133,225,0.2);
}

/* 开关项样式 */
.switch-item {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 16rpx 0;
}

/* 存储选择样式 */
.storage-select {
	position: relative;
}

.storage-result {
	margin-top: 12rpx;
	font-size: 28rpx;
	color: #5985E1;
	font-weight: 500;
}

.storage-dropdown {
	position: absolute;
	top: 100%;
	left: 0;
	width: 100%;
	background: #ffffff;
	border-radius: 12rpx;
	box-shadow: 0 8rpx 24rpx rgba(0,0,0,0.08);
	z-index: 100;
	margin-top: 8rpx;
	max-height: 400rpx;
	overflow-y: auto;
}

.storage-option {
	padding: 24rpx;
	font-size: 28rpx;
	color: #333333;
	border-bottom: 2rpx solid #f5f6fa;
	transition: all 0.3s ease;
}

.storage-option:last-child {
	border-bottom: none;
}

.storage-option:active {
	background: #f0f5ff;
}

/* 颜色选择器样式 */
.color-picker-wrapper {
	display: flex;
	justify-content: space-between;
	align-items: center;
	background: #f8f9fd;
	padding: 0 24rpx;
	height: 88rpx;
	border-radius: 12rpx;
}

.color-picker-wrapper .label {
	margin-bottom: 0;
}

.color-picker {
	display: flex;
	align-items: center;
	gap: 16rpx;
	padding: 12rpx 16rpx;
	border-radius: 8rpx;
	transition: all 0.3s ease;
}

.color-picker:active {
	background: rgba(0,0,0,0.05);
}

.color-preview {
	width: 48rpx;
	height: 48rpx;
	border-radius: 8rpx;
	border: 2rpx solid #f0f0f0;
}

.color-value {
	font-size: 28rpx;
	color: #666666;
	min-width: 100rpx;
}

/* 图标网格样式 */
.icon-grid {
	display: grid;
	grid-template-columns: repeat(5, 1fr);
	gap: 20rpx;
}

.icon-item {
	aspect-ratio: 1;
	background: #f8f9fd;
	border-radius: 16rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	transition: all 0.3s ease;
	padding: 20rpx;
	border: 2rpx solid transparent;
}

.icon-item.active {
	background: #f0f5ff;
	border-color: #5985E1;
}

.icon-image {
	width: 75%;
	height: 75%;
}

.more-text {
	font-size: 24rpx;
	color: #999999;
}

/* 上传区域样式 */
.upload-area {
	width: 240rpx;
	height: 240rpx;
	background: #f8f9fd;
	border-radius: 16rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	overflow: hidden;
	transition: all 0.3s ease;
}

.upload-area:active {
	background: #f0f5ff;
}

.upload-placeholder {
	display: flex;
	flex-direction: column;
	align-items: center;
	color: #999999;
}

.upload-icon {
	font-size: 48rpx;
	margin-bottom: 12rpx;
}

.upload-text {
	font-size: 26rpx;
}

.preview-image {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

/* 底部按钮样式 */
.footer {
	position: fixed;
	bottom: 0;
	left: 0;
	right: 0;
	padding: 24rpx 32rpx;
	padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
	background: rgba(255,255,255,0.98);
	backdrop-filter: blur(10px);
	box-shadow: 0 -4rpx 16rpx rgba(0,0,0,0.04);
	z-index: 99;
}

.submit-btn {
	width: 100%;
	height: 88rpx;
	background: linear-gradient(135deg, #5985E1, #3A66C0);
	border-radius: 44rpx;
	color: #ffffff;
	font-size: 32rpx;
	font-weight: 600;
	display: flex;
	align-items: center;
	justify-content: center;
	transition: all 0.3s ease;
	border: none;
}

.submit-btn:active {
	transform: scale(0.98);
	opacity: 0.9;
}

/* 弹窗样式 */
.popup-date {
	background-color: #ffffff;
	border-radius: 24rpx 24rpx 0 0;
	overflow: hidden;
}

.popup-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 28rpx 32rpx;
	border-bottom: 2rpx solid #f5f6fa;
}

.popup-title {
	font-size: 32rpx;
	font-weight: 600;
	color: #333333;
}

.popup-cancel, .popup-confirm {
	font-size: 28rpx;
	padding: 0 20rpx;
}

.popup-cancel {
	color: #999999;
}

.popup-confirm {
	color: #5985E1;
	font-weight: 500;
}

.picker-view {
	width: 100%;
	height: 480rpx;
}

.picker-item {
	line-height: 88rpx;
	text-align: center;
	font-size: 32rpx;
	color: #333333;
}

/* 图标选择弹窗样式 */
.icon-popup {
	background-color: #ffffff;
	border-radius: 24rpx;
	width: 640rpx;
	max-height: 800rpx;
	overflow: hidden;
}

.popup-content {
	padding: 32rpx;
	max-height: 700rpx;
	overflow-y: auto;
}

.popup-content .icon-grid {
	grid-template-columns: repeat(4, 1fr);
	gap: 24rpx;
}

.popup-content .icon-item {
	padding: 24rpx;
}

.popup-close {
	font-size: 48rpx;
	color: #999999;
	padding: 0 20rpx;
	line-height: 1;
}

/* 复选框样式 */
.checkbox-item {
	margin-top: 20rpx;
}

.checkbox-label {
	display: flex;
	align-items: center;
	gap: 12rpx;
	font-size: 28rpx;
	color: #666666;
}
</style>
