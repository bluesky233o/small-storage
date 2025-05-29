<script>
import { checkNeedLogin, checkLogin, toLogin } from '@/utils/auth.js'

export default {
	onLaunch: function() {
	},
	onShow: function() {
		// 添加路由拦截器
		uni.addInterceptor('navigateTo', {
			invoke: this.routeInterceptor.bind(this)
		})
		uni.addInterceptor('redirectTo', {
			invoke: this.routeInterceptor.bind(this)
		})
		uni.addInterceptor('reLaunch', {
			invoke: this.routeInterceptor.bind(this)
		})
	},
	onHide: function() {
	},
	// 全局导航守卫
	async onPageNotFound(res) {
		uni.redirectTo({
			url: '/pages/index/index'
		})
	},
	globalData: {
		
	},
	methods: {
		routeInterceptor(e) {
			// 获取目标页面路径
			const url = e.url
			const targetPage = url.split('?')[0]
			
			// 检查是否需要登录
			if (checkNeedLogin(targetPage)) {
				// 需要登录则检查是否已登录
				if (!checkLogin()) {
					toLogin(targetPage)
					return false
				}
			}
			
			return true
		}
	}
}
</script>

<style>
	/*每个页面公共css */
	@import './static/styles/global.css';
</style>
