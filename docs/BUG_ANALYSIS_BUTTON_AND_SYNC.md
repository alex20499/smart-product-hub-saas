# 编辑页底部按钮裁切 + 保存卡在「同步中」问题分析

## 一、底部按钮被裁切

### 原因分析

1. **视口高度**：抽屉使用 `h-full`（即 `height: 100%`）。在移动端（尤其 iOS Safari），`100%` 的参照是包含块高度，而 `100vh` 是「大视口」高度，会包含地址栏/工具栏区域，导致实际可见区域小于布局高度，底部被裁切。
2. **安全区**：虽有 `pb-[env(safe-area-inset-bottom)]`，但若整体高度已超出可视区域，安全区无法补救。

### 已做修复

- 将抽屉根节点由 `h-full` 改为 **`h-[100dvh] max-h-[100dvh]`**（动态视口高度），确保高度不超过当前可见视口，底部操作栏始终在可视范围内。
- 底部操作栏保留 `pb-[max(0.75rem,env(safe-area-inset-bottom))]`，兼顾安全区与紧凑布局。

---

## 二、贴主图 URL 后点保存卡在「同步中」

### 流程简述

- 用户点「保存」→ `ProductInventory.handleSaveProduct` 内 `setIsSavingEdit(true)` → 调用 `onUpdate`（即 `App.handleProductUpdate`）。
- 主图为 **外部 URL** 时，`handleProductUpdate` **不会**上传图片，只把 `main_image` 写入 Supabase；主图为 **data URL** 时才会先上传再写库。
- 更新使用 `Promise.race([updatePromise, timeoutPromise])`（90s 超时），理论上超时或完成都会进入 `finally`，`setIsSyncing(false)` 会执行；`ProductInventory` 的 `finally` 里会 `setIsSavingEdit(false)`。

### 可能根因

1. **Supabase thenable 与 Promise.race**：Supabase 的 `update().eq()` 返回的是 thenable，在部分环境或版本下与 `Promise.race` 的配合可能异常，导致超时未按预期触发，界面一直不结束。
2. **网络/后端长时间挂起**：请求既不成功也不失败，thenable 一直不 settle，若 race 未正确生效就会一直卡住。
3. **前端无兜底**：若 `onUpdate` 的 Promise 因故永不 resolve/reject，`handleSaveProduct` 的 `finally` 不会执行，`isSavingEdit` 会一直为 true。

### 已做修复

1. **App.tsx**  
   - 用**标准 Promise** 包装 Supabase 的更新调用，再参与 `Promise.race`：
     - `new Promise((resolve, reject) => { supabase.from('products').update(...).eq(...).then(resolve).catch(reject); })`
   - 确保在任何环境下超时都能正确触发，避免「卡在同步中」。

2. **ProductInventory.tsx**  
   - 增加 **92 秒兜底定时器**：在 `handleSaveProduct` 里 `setIsSavingEdit(true)` 后启动一个 92s 的 `setTimeout`，到期强制 `setIsSavingEdit(false)`；在 `try/finally` 里 `clearTimeout(guardTimer)` 并 `setIsSavingEdit(false)`。
   - 即使 `onUpdate` 因极端情况永不结束，92s 后按钮也会恢复，避免界面永久卡住。

---

## 三、验证建议

1. **按钮裁切**：在真机或模拟器上打开产品详情/编辑，使用带地址栏的浏览器（如 iOS Safari），确认底部「保存更改」「永久删除」完全可见且不被裁切。
2. **同步中**：  
   - 仅贴主图 URL 后保存，应能正常结束（成功或失败提示）。  
   - 若网络很慢，最多约 90s 会超时并提示；若出现异常挂起，92s 后按钮至少会恢复可点。
