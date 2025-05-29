import CryptoJS from 'crypto-js'

class EncryptionUtil {
    /**
     * 获取加密密钥
     * @returns {string|null} 返回加密密钥，如果未设置则返回null
     */
    static getEncryptionKey() {
        return uni.getStorageSync('encryption_key') || null
    }

    /**
     * 检查是否启用加密模式
     * @returns {boolean}
     */
    static isEncryptionEnabled() {
        return !!this.getEncryptionKey()
    }

    /**
     * AES加密单个字符
     * @param {string} char - 要加密的单个字符
     * @param {string} key - 加密密钥
     * @returns {string} 加密后的字符串
     */
    static encryptChar(char, key) {
        try {
            return CryptoJS.AES.encrypt(char, key).toString()
        } catch (e) {
            console.error('加密字符失败:', e)
            return char
        }
    }

    /**
     * AES解密单个字符
     * @param {string} encryptedChar - 加密后的字符串
     * @param {string} key - 解密密钥
     * @returns {string} 解密后的字符
     */
    static decryptChar(encryptedChar, key) {
        try {
            const bytes = CryptoJS.AES.decrypt(encryptedChar, key)
            return bytes.toString(CryptoJS.enc.Utf8)
        } catch (e) {
            console.error('解密字符失败:', e)
            return encryptedChar
        }
    }

    /**
     * 加密字符串（每个字符单独加密）
     * @param {string} text - 要加密的文本
     * @returns {string} 加密后的文本（空格分隔）
     */
    static encrypt(text) {
        if (!this.isEncryptionEnabled() || !text) {
            return text
        }

        const key = this.getEncryptionKey()
        try {
            // 将字符串拆分为字符数组，分别加密每个字符
            return text.split('')
                .map(char => this.encryptChar(char, key))
                .join(' ')
        } catch (e) {
            console.error('加密文本失败:', e)
            return text
        }
    }

    /**
     * 解密字符串
     * @param {string} encryptedText - 加密后的文本（空格分隔）
     * @returns {string} 解密后的文本
     */
    static decrypt(encryptedText) {
        if (!this.isEncryptionEnabled() || !encryptedText) {
            return encryptedText
        }

        const key = this.getEncryptionKey()
        try {
            // 分割加密后的字符串，解密每个部分
            return encryptedText.split(' ')
                .map(char => this.decryptChar(char, key))
                .join('')
        } catch (e) {
            console.error('解密文本失败:', e)
            return encryptedText
        }
    }

    /**
     * 显示字段（自动判断是否需要解密）
     * @param {string} field - 字段值
     * @returns {string} 处理后的字段值
     */
    static displayField(field) {
        if (!this.isEncryptionEnabled() || !field) {
            return field
        }

        // 尝试解密，如果解密失败则返回原值
        try {
            return this.decrypt(field)
        } catch (e) {
            console.error('字段解密失败:', e)
            return field
        }
    }
}

export default EncryptionUtil 