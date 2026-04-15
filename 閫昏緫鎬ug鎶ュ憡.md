# 逻辑性Bug报告

## 🔴 严重问题

### 1. **双重弹窗冲突** ⚠️⚠️⚠️
**位置**: `app.js` 第278行 + 所有页面的 `setClipboardData` success 回调

**问题描述**:
- `app.js` 的 `wx.setClipboardData` 拦截器在复制**前**就显示 `custom-toast` 的 "内容已复制"（第278行）
- 但页面代码（如 `my.js` 的 `copyReturnAddress`、`copyUserAddress`、`copyOrderAddress`、`copyData`）在 `success` 回调中又调用了 `_showCopySuccessOnce()`
- 这会导致**两个弹窗同时显示**：
  1. `app.js` 的 `custom-toast` 显示 "内容已复制"
  2. 页面的 `showCopySuccessModal` 也显示 "内容已复制"

**影响**: 用户会看到两个重叠的"内容已复制"弹窗

**修复方案**:
- 方案A：移除 `app.js` 中的自动显示，让页面自己控制
- 方案B：移除页面中的 `_showCopySuccessOnce()`，统一使用 `app.js` 的 `custom-toast`
- 方案C：在 `app.js` 中检查是否有页面自定义弹窗，如果有就不显示 `custom-toast`

---

### 2. **copyShareCodeFromModal 重复关闭** ⚠️
**位置**: `miniprogram/pages/my/my.js` 第2525-2528行

**问题描述**:
```javascript
// 🔴 关闭分享码生成弹窗，显示"内容已复制"弹窗（互斥）
this._closeAllPopups();  // 第1次关闭
this.setData({ showShareCodeGenerateModal: false });
this.updateModalState();
this._showCopySuccessOnce();  // 内部又会调用 _closeAllPopups()，第2次关闭
```

**影响**: 重复调用，效率低，但不会导致bug

**修复方案**: 移除第2525行的 `_closeAllPopups()`，因为 `_showCopySuccessOnce()` 内部已经调用了

---

### 3. **_showCopySuccessOnce 的 setTimeout 没有清理** ⚠️
**位置**: 所有页面的 `_showCopySuccessOnce()` 方法

**问题描述**:
- 如果快速连续调用 `_showCopySuccessOnce()`（比如用户快速点击复制按钮），会有多个 `setTimeout` 同时存在
- 这可能导致：
  1. 第一个弹窗还没关闭，第二个弹窗就打开了
  2. 多个 `setTimeout` 同时执行 `setData({ showCopySuccessModal: false })`，状态混乱

**影响**: 快速连续操作时，弹窗状态可能不一致

**修复方案**: 在 `_showCopySuccessOnce()` 中保存 `setTimeout` 的 ID，如果再次调用时先清理之前的定时器

---

### 4. **app.js 和页面弹窗的优先级不明确** ⚠️
**位置**: `app.js` 第278行 + 页面 `_showCopySuccessOnce()`

**问题描述**:
- `app.js` 在复制**前**就显示弹窗（抢占时机）
- 页面的 `success` 回调是**异步**的，可能在 `app.js` 弹窗显示后才执行
- 如果页面调用 `_showCopySuccessOnce()`，会关闭 `custom-toast` 并显示 `showCopySuccessModal`
- 但 `custom-toast` 可能还在动画中，导致视觉上的闪烁

**影响**: 用户体验不佳，可能看到弹窗闪烁

**修复方案**: 统一使用一种弹窗方式，不要混用

---

## 🟡 次要问题

### 5. **updateModalState 调用时机** ⚠️
**位置**: `miniprogram/pages/my/my.js` 第2527行

**问题描述**:
- `copyShareCodeFromModal` 中在 `_showCopySuccessOnce()` **之前**调用了 `updateModalState()`
- 但 `_showCopySuccessOnce()` 会改变 `showCopySuccessModal` 的状态
- 应该在 `_showCopySuccessOnce()` **之后**调用 `updateModalState()`

**影响**: `hasModalOpen` 状态可能不准确

**修复方案**: 调整调用顺序，或在 `_showCopySuccessOnce()` 内部调用 `updateModalState()`

---

## 📝 建议修复优先级

1. **优先级1（严重）**: 修复双重弹窗冲突（问题1）
2. **优先级2（重要）**: 修复 `_showCopySuccessOnce` 的定时器清理（问题3）
3. **优先级3（优化）**: 修复重复关闭（问题2）
4. **优先级4（优化）**: 修复 `updateModalState` 调用时机（问题5）
