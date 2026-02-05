# 弹窗Bug检查报告

## 🔍 发现的潜在Bug

### 1. **showAutoToast 没有互斥处理** ⚠️
**位置**: `miniprogram/pages/my/my.js`
- **问题**: `showAutoToast` 方法没有调用 `_closeAllPopups()`，可能会和其他弹窗重叠
- **影响**: 当 `showAutoToast` 显示时，如果同时有 `showCopySuccessModal` 或其他弹窗，会重叠显示
- **代码位置**: 第3912-3922行

### 2. **app.js 的 hideKnownPagePopups 没有包含 autoToast** ⚠️
**位置**: `miniprogram/app.js`
- **问题**: `hideKnownPagePopups` 函数只关闭了 `showCustomSuccessModal`, `showCopySuccessModal` 等，但没有关闭 `autoToast.show`
- **影响**: 当全局 `wx.showToast/showModal/showLoading` 被调用时，不会关闭 my 页面的 `autoToast`，可能重叠
- **代码位置**: 第188-195行

### 3. **call.js 中直接 setData，没有统一方法** ⚠️
**位置**: `miniprogram/pages/call/call.js`
- **问题**: 直接 `setData({ showCopySuccessModal: true })`，没有统一的方法（类似 my 页面的 `_showCopySuccessOnce()`）
- **影响**: 代码不够统一，维护困难
- **代码位置**: 第92, 144, 171行

### 4. **index.js 中直接 setData，没有统一方法** ⚠️
**位置**: `miniprogram/pages/index/index.js`
- **问题**: 直接 `setData({ showCopySuccessModal: true })`，没有统一的方法
- **影响**: 代码不够统一，维护困难
- **代码位置**: 第329行

### 5. **blocked.js 中直接 setData，没有统一方法** ⚠️
**位置**: `miniprogram/pages/blocked/blocked.js`
- **问题**: 直接 `setData({ showCopySuccessModal: true })`，没有统一的方法
- **影响**: 代码不够统一，维护困难
- **代码位置**: 第312行

### 6. **showAutoToast 可能和 custom-toast 重叠** ⚠️
**位置**: `miniprogram/pages/my/my.js`
- **问题**: `showAutoToast` 使用的是 my 页面自己的 `auto-toast` 弹窗系统，而 `showToast` 使用的是全局 `custom-toast` 组件
- **影响**: 如果同时调用 `showAutoToast` 和 `wx.showToast`，可能会重叠显示
- **代码位置**: 第3912行

---

## ✅ 已正确实现的部分

1. **custom-toast 组件内部互斥** ✅
   - `showToast/showModal/showLoading` 内部已实现互斥

2. **页面级别的 _closeAllPopups** ✅
   - my/index/blocked/call 页面都有 `_closeAllPopups()` 方法

3. **app.js 的 hideKnownPagePopups** ✅
   - 已实现关闭大部分页面弹窗

4. **图标隐藏** ✅
   - 所有弹窗的图标都已隐藏

5. **文字动画** ✅
   - 所有弹窗的文字都有轻微弹跳动画

---

## 🎯 需要修复的Bug

### 优先级1（可能重叠）
1. **showAutoToast 添加互斥处理**
2. **app.js 的 hideKnownPagePopups 添加 autoToast**

### 优先级2（代码统一）
3. **call/index/blocked 页面统一使用方法**

---

## 📝 建议修复方案

1. **修复 showAutoToast 互斥**:
   ```javascript
   showAutoToast(title = '提示', content = '') {
     this._closeAllPopups(); // 添加这行
     // ... 其余代码
   }
   ```

2. **修复 app.js hideKnownPagePopups**:
   ```javascript
   const knownFlags = [
     'showCustomSuccessModal',
     'customSuccessModalClosing',
     'showCopySuccessModal',
     'showShareCodeGenerateModal',
     'showConfirmModal',
     'showModal',
     'autoToast.show', // 添加这行
     'autoToastClosing' // 添加这行
   ];
   ```

3. **统一 call/index/blocked 的复制弹窗方法**:
   - 可以创建统一的 `_showCopySuccessOnce()` 方法
