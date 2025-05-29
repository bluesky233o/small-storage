// 格式化日期为 yyyy-MM-dd 格式
export function formatDate(date) {
    if (!date) return '-'
    if (typeof date === 'string') {
        date = new Date(date)
    }
    if (isNaN(date.getTime())) return '-'
    
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

// 格式化日期时间为 yyyy-MM-dd HH:mm:ss 格式
export function formatDateTime(date) {
    if (!date) return '-'
    if (typeof date === 'string') {
        date = new Date(date)
    }
    if (isNaN(date.getTime())) return '-'
    
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
} 