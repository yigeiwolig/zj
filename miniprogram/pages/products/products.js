var QQMapWX = require('../../utils/qqmap-wx-jssdk.js'); 
var qqmapsdk = new QQMapWX({
    key: 'WYWBZ-ZFY3G-WLKQV-QOD5M-2S6EJ-CSF7Z' // 你的Key
});

// --- 图标数据 (保持你原本的数据) ---
// 1. 维修中心 (工具箱图标 - 更直观地表示维修)
// 维修中心图标 (方案3：MT核心芯片 - 四面引脚，精密主控感)
const iconRepair = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48IS0tIExpbmVzIChQaW5zKSA6IFVwL0Rvd24gLS0+PHBhdGggZD0iTTE2IDVWMTFNMjQgNVYxMU0zMiA1VjExTTE2IDM3VjQzTTI0IDM3VjQzTTMyIDM3VjQzIiBzdHJva2U9IiM1NDZFN0EiIHN0cm9rZS13aWR0aD0iMyIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PCEtLSBMaW5lcyAoUGlucykgOiBMZWZ0L1JpZ2h0IC0tPjxwYXRoIGQ9Ik01IDE2SDExTTUgMjRIMTFNNSAzMkgxMU0zNyAxNkg0M00zNyAyNEg0M00zNyAzMkg0MyIgc3Ryb2tlPSIjNTQ2RTdBIiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPjwhLS0gQ2hpcCBCb2R5IC0tPjxyZWN0IHg9IjExIiB5PSIxMSIgd2lkdGg9IjI2IiBoZWlnaHQ9IjI2IiByeD0iNCIgZmlsbD0iIzI2MzIzOCIvPjwhLS0gTVQgTG9nbyAoV2hpdGUpIC0tPjx0ZXh0IHg9IjI0IiB5PSIyOSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmb250LXdlaWdodD0iOTAwIiBmaWxsPSIjRkZGRkZGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5NVDwvdGV4dD48L3N2Zz4=";
// 2. 附近门店 (方案 A: 标准雷达 - 扫描扇区+红点定位)
const iconStore = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyNCIgY3k9IjI0IiByPSIyMiIgZmlsbD0iI0U4RjVFOSIvPjxjaXJjbGUgY3g9IjI0IiBjeT0iMjQiIHI9IjE0IiBzdHJva2U9IiM4MUM3ODQiIHN0cm9rZS13aWR0aD0iMS41IiBvcGFjaXR5PSIwLjUiLz48Y2lyY2xlIGN4PSIyNCIgY3k9IjI0IiByPSI2IiBzdHJva2U9IiM4MUM3ODQiIHN0cm9rZS13aWR0aD0iMS41IiBvcGFjaXR5PSIwLjUiLz48cGF0aCBkPSJNMjQgNFY0NCIgc3Ryb2tlPSIjODFDNzg0IiBzdHJva2Utd2lkdGg9IjEiIG9wYWNpdHk9IjAuMyIvPjxwYXRoIGQ9Ik00IDI0SDQ0IiBzdHJva2U9IiM4MUM3ODQiIHN0cm9rZS13aWR0aD0iMSIgb3BhY2l0eT0iMC4zIi8+PHBhdGggZD0iTTI0IDI0TDQ2IDI0QTIyIDIyIDAgMCAwIDI0IDJWMjRaIiBmaWxsPSIjNjZCQjZBIiBvcGFjaXR5PSIwLjMiLz48Y2lyY2xlIGN4PSIzNiIgY3k9IjE0IiByPSIzIiBmaWxsPSIjRkY1MjUyIi8+PGNpcmNsZSBjeD0iMzYiIGN5PSIxNCIgcj0iNSIgc3Ryb2tlPSIjRkY1MjUyIiBzdHJva2Utd2lkdGg9IjEiIG9wYWNpdHk9IjAuNCIvPjwvc3ZnPg==";
// 3. 安装教程 (方案 B: 专业蓝 - 科技/精密感)
const iconInstall = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNNyAxMEM3IDguODkgNy44OSA4IDkgOEgyN0MyOC4xIDggMjkgOC44OSAyOSAxMFYyMEg3VjEwWiIgZmlsbD0iIzY0QjVGNSIvPjxwYXRoIGQ9Ik0yNSAyMEwyMiAzOEgxMEwxMyAyMEgyNVoiIGZpbGw9IiMxRTg4RTUiLz48cmVjdCB4PSI4IiB5PSIzOCIgd2lkdGg9IjE2IiBoZWlnaHQ9IjYiIHJ4PSIyIiBmaWxsPSIjMTU2NUMwIi8+PHBhdGggZD0iTTI5IDExSDMyVjE5SDI5VjExWiIgZmlsbD0iIzI2MzIzOCIvPjxwYXRoIGQ9Ik0zMiAxMkgzNFYxOEgzMlYxMloiIGZpbGw9IiMzNzQ3NEYiLz48cGF0aCBkPSJNMzQgMTVINDUiIHN0cm9rZT0iIzE1NjVDMCIgc3Ryb2tlLXdpZHRoPSIzIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz48cmVjdCB4PSIxMSIgeT0iMTIiIHdpZHRoPSIxMCIgaGVpZ2h0PSIyIiByeD0iMSIgZmlsbD0id2hpdGUiIGZpbGwtb3BhY2l0eT0iMC40Ii8+PHJlY3QgeD0iMTEiIHk9IjE2IiB3aWR0aD0iOCIgaGVpZ2h0PSIyIiByeD0iMSIgZmlsbD0id2hpdGUiIGZpbGwtb3BhY2l0eT0iMC40Ii8+PC9zdmc+";
const iconOTA = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZD0iTTEyLjAyMyA0QzE1LjU0NiA0IDE4LjUwOCA2LjY0MyAxOS4xMjUgMTAuMTE5QzIxLjM2NiAxMC43NDIgMjMgMTIuNzkzIDIzIDE1LjI1QzIzIDE4LjI4OCAyMC41MzggMjAuNzUgMTcuNSAyMC43NUg2LjVDMy40NjIgMjAuNzUgMSAxOC4yODggMSAxNS4yNUMxIDEyLjMzOCAzLjI1NiA5Ljk1NSA2LjExOSA5Ljc3MUM2LjcwOSA2LjQ4OCA5LjU2MyA0IDEyLjAyMyA0Wk0xMiAxNy41TDggMTMuNUgxMC41VjkuNUgxMy41VjEzLjVIMTZMMTIgMTcuNVoiIGZpbGw9IiMzOEJERjgiLz48L3N2Zz4=";
const iconControl = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImJsYWNrS25vYiIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iIzU1NSIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzAwMCIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxwYXRoIGQ9Ik04IDE0SDQyIiBzdHJva2U9IiNkZGQiIHN0cm9rZS13aWR0aD0iNCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PHBhdGggZD0iTTggMjRINDIiIHN0cm9rZT0iI2RkZCIgc3Ryb2tlLXdpZHRoPSI0IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz48cGF0aCBkPSJNOCAzNEg0MiIgc3Ryb2tlPSIjZGRkIiBzdHJva2Utd2lkdGg9IjQiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPjxjaXJjbGUgY3g9IjMyIiBjeT0iMTQiIHI9IjQiIGZpbGw9InVybCgjYmxhY2tLbm9iKSIvPjxjaXJjbGUgY3g9IjE2IiBjeT0iMjQiIHI9IjQiIGZpbGw9InVybCgjYmxhY2tLbm9iKSIvPjxjaXJjbGUgY3g9IjM2IiBjeT0iMzQiIHI9IjQiIGZpbGw9InVybCgjYmxhY2tLbm9iKSIvPjwvc3ZnPg==";
// 6. 联系方式 (方案 A: 微信绿色气泡 - 带MT文字，使用微信官方绿色 #07C160)
const iconContact = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNNDQgMjRDNDQgMzUuMDQ1NyAzNS4wNDU3IDQ0IDI0IDQ0QzE5Ljk3OTEgNDQgMTYuMjIzIDQyLjgxMjMgMTMuMDY1MiA0MC43NzY2TDQgNDRMNy41NDA0OSAzNS41MDk3QzUuMjg5NDEgMzIuMTgxOCA0IDI4LjI0MzYgNCAyNEM0IDEyLjk1NDMgMTIuOTU0MyA0IDI0IDRDMzUuMDQ1NyA0IDQ0IDEyLjk1NDMgNDQgMjRaIiBmaWxsPSIjMDdDMTYwIi8+PHRleHQgeD0iMjQiIHk9IjMwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTYiIGZvbnQtd2VpZ2h0PSJib2xkIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+TVQ8L3RleHQ+PC9zdmc+";
const iconShowcase = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJncmFkMyIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iIzk1NTBCQiIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzZFNDhBQSIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxwYXRoIGZpbGw9InVybCgjZ3JhZDMpIiBkPSJNOCw1djE0bDExLTdMOCw1eiIvPjwvc3ZnPg==";
const iconProfile = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJncmFkOCIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iIzRGQUNGZSIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzAwRjJGRSIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxwYXRoIGZpbGw9InVybCgjZ3JhZDgpIiBkPSJNMTIsMTkuMkM5LjUsMTkuMiA3LjI5LDE3LjkyIDYsMTZDNi4wMywxNCAxMCwxMi45IDEyLDEyLjlDMTQsMTIuOSAxNy45NywxNCAxOCwxNkMxNi43MSwxNy45MiAxNC41LDE5LjIgMTIsMTkuMk0xMiw1QTMsMyAwIDAsMSAxNSw4QTMsMyAwIDAsMSAxMiwxMUEzLDMgMCAwLDEgOSw4QTMsMyAwIDAsMSAxMiw1TTEyLDJBMTAsMTAgMCAwLDAgMiwxMkExMCwxMCAwIDAsMCAxMiwyMkExMCwxMCAwIDAsMCAyMiwxMkExMCwxMCAwIDAsMCAxMiwyWiIvPjwvc3ZnPg==";
// 3. 产品上新 (打开的礼盒 - 方正盒子，飘逸的丝带)
// ================== 3. 产品上新 (粉色礼盒 + 金色炸裂丝带) ==================
// 惊喜感强，丝带向外喷射，盒子改为粉色
const iconNew = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9InBpbmtCb3giIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiNGRjkzQUMiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiNGRjRCN0QiLz48L2xpbmVhckdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0icmliYm9uR29sZCIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iI0ZGRDU0RiIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iI0ZGNkYwMCIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjwhLS0gQm94IEJvZHkgKFBpbmspIC0tPjxwYXRoIGQ9Ik0xMCAyNEwyNCAzMEwzOCAyNFYzOEwyNCA0NEwxMCAzOFYyNFoiIGZpbGw9InVybCgjcGlua0JveCkiLz48IS0tIFRvcCBmYWNlIChEYXJrZXIgUGluaykgLS0+PHBhdGggZD0iTTEwIDI0TDI0IDE4TDM4IDI0IiBmaWxsPSIjRDMzRTY2Ii8+PCEtLSBCdXJzdGluZyBSaWJib25zIChHb2xkKSAtLT48cGF0aCBkPSJNMjQgMjRDMjQgMTggMjAgMTQgMTYgMTgiIHN0cm9rZT0idXJsKCNyaWJib25Hb2xkKSIgc3Ryb2tlLXdpZHRoPSIzIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz48cGF0aCBkPSJNMjQgMjRDMjYgMTggMzIgMTQgMzYgMTgiIHN0cm9rZT0idXJsKCNyaWJib25Hb2xkKSIgc3Ryb2tlLXdpZHRoPSIzIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz48cGF0aCBkPSJNMjQgMjRDMjQgMTYgMjggMTAgMzIgMTIiIHN0cm9rZT0idXJsKCNyaWJib25Hb2xkKSIgc3Ryb2tlLXdpZHRoPSIzIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz48cGF0aCBkPSJNMjQgMjRDMjQgMTggMjAgMTAgMTYgMTAiIHN0cm9rZT0idXJsKCNyaWJib25Hb2xkKSIgc3Ryb2tlLXdpZHRoPSIzIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz48cGF0aCBkPSJNMjQgMzBWNDQiIHN0cm9rZT0idXJsKCNyaWJib25Hb2xkKSIgc3Ryb2tlLXdpZHRoPSI0IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz48Y2lyY2xlIGN4PSIxNCIgY3k9IjEyIiByPSIyIiBmaWxsPSIjRkZDMTA3Ii8+PGNpcmNsZSBjeD0iMzYiIGN5PSIxMCIgcj0iMiIgZmlsbD0iI0ZGQzEwNyIvPjwvc3ZnPg==";
const iconRank = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJncmFkNiIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iI2ZhNzA5YSIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iI2ZlZTE0MCIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxwYXRoIGZpbGw9InVybCgjZ3JhZDYpIiBkPSJNNCwxOFYxM0g5VjE4SDRNMTAsMThWOUgxNVYxOEgxME0xNiwxOFYxNEgyMVYxOEgxNloiLz48L3N2Zz4=";
const iconShop = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJncmFkNyIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iIzY2N2VlYSIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzc2NGJhMiIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxwYXRoIGZpbGw9InVybCgjZ3JhZDcpIiBkPSJNMTcsMThBMiwyIDAgMCwxIDE5LDIwQTIsMiAwIDAsMSAxNywyMkMxNS44OSwyMiAxNSwyMS4xIDE1LDIwQzE1LDE4Ljg5IDE1Ljg5LDE4IDE3LDE4TTEsMlY0SDJMNi42LDExLjU5TDUuMjQsMTQuMDRDNS4wOSwxNC4zMiA1LDE0LjY1IDUsMTVBMiwyIDAgMCwwIDcsMTdIMTlWMTVINy40MkEwLjI1LDAuMjUgMCAwLDEgNy4xNywxNC43NUM3LjE3LDE0LjcgNy4xOCwxNC42NiA3LjIsMTQuNjNMOC4xLDEzSDE1LjU1QzE2LjMsMTMgMTYuOTYsMTIuNTggMTcuMywxMS45N0wyMC44OCw1LjVDMjAuOTUsNS4zNCAyMSw1LjE3IDIxLDVBMSwxIDAgMCwwIDIwLDRINS4yMUw0LjI3LDJNNywxOEEyLDIgMCAwLDEgOSwyMEEyLDIgMCAwLDEgNywyMkM1Ljg5LDIyIDUsMjEuMSA1LDIwQzUsMTguODkgNS44OSwxOCA3LDE4WiIvPjwvc3ZnPg==";
// ⬆️ 向上箭头 (用于底部触发按钮)
const iconArrowUp = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgNVYxOU01IDEyTDEyIDVNMTkgMTJMMTIgNSIgc3Ryb2tlPSIjMzMzMzMzIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjwvc3ZnPg==";

Page({
  data: {
    // 🔴 状态栏高度
    statusBarHeight: 44,
    
    // 状态控制
    hasEntered: false,      // 控制入场动画启动
    
    isDragging: false,
    dragOffset: 0,
    currentIndex: 0, // 默认选中第0个，即"产品上新"
    
    // 【新增】自动消失提示（无按钮，2秒后自动消失）
    autoToast: { show: false, title: '', content: '' },
    autoToastClosing: false, // 自动提示退出动画中
    
    // 🔴 自定义加载动画
    showLoadingAnimation: false,
    
    // 【新增】底部抽屉控制
    isDrawerOpen: false,

    // 【新增】按钮动画控制
    isTriggerBtnVisible: false, // 按钮是否可见（弹起）
    isTriggerBtnFaded: false,   // 按钮是否变淡沉下
    
    // 按照你的要求 1-12 顺序排列
    // === 在这里单独调整每个图标的大小 ===
    iconArrowUp, // ⬆️ 注册新图标
    list: [
      { 
        id: 3, 
        title: '产品上新', 
        en: 'NEW ARRIVALS', 
        iconSvg: iconNew, 
        iconSize: '110rpx' // <---【在这里改】因为是发散的丝带，给最大
      },
      { 
        id: 4, 
        title: '产品选购', 
        en: 'PRODUCTS', 
        iconSvg: iconShop, 
        iconSize: '72rpx'  // <---【在这里改】实心购物车，稍微改小显得精致
      },
      { 
        id: 10, 
        title: '案例展示', 
        en: 'SHOWCASE', 
        iconSvg: iconShowcase, 
        iconSize: '80rpx'  // <---【在这里改】标准大小
      },
      { 
        id: 5, 
        title: '排行榜单', 
        en: 'RANKING LIST', 
        iconSvg: iconRank, 
        iconSize: '80rpx' 
      },
      { 
        id: 9, 
        title: 'OTA升级', 
        en: 'SYSTEM UPDATE', 
        iconSvg: iconOTA, 
        iconSize: '80rpx' 
      },
      { 
        id: 8, 
        title: '联系方式', 
        en: 'CONTACT US', 
        iconSvg: iconContact, 
        iconSize: '80rpx' 
      },
      { 
        id: 1, 
        title: '控制中心', 
        en: 'CONTROL CENTER', 
        iconSvg: iconControl, 
        iconSize: '80rpx' 
      },
      { 
        id: 7, 
        title: '安装教程', 
        en: 'VIDEO GUIDE', 
        iconSvg: iconInstall, 
        iconSize: '80rpx' 
      },
      { 
        id: 6, 
        title: '维修中心', 
        en: 'SERVICE & REPAIR', 
        iconSvg: iconRepair, 
        iconSize: '80rpx' 
      },
      { 
        id: 12, 
        title: '附近门店', 
        en: 'NEARBY STORES', 
        iconSvg: iconStore, 
        iconSize: '80rpx' 
      },
      { 
        id: 2, 
        title: '个人中心', 
        en: 'MY PROFILE', 
        iconSvg: iconProfile, 
        iconSize: '80rpx' 
      }
    ]
  },

  onLoad() {
    // 🔴 分享码用户访问拦截：如果不是安装教程页面，跳转回去
    const app = getApp();
    if (app.globalData.isShareCodeUser) {
      console.log('[products] 分享码用户尝试访问其他页面，跳转回安装教程');
      wx.redirectTo({
        url: '/pages/azjc/azjc',
        fail: () => {
          wx.reLaunch({ url: '/pages/azjc/azjc' });
        }
      });
      return;
    }

    // 🔴 获取状态栏高度
    const winInfo = wx.getWindowInfo();
    this.setData({ statusBarHeight: winInfo.statusBarHeight || 44 });
    
    // 🔴 更新页面访问统计
    if (app && app.globalData && app.globalData.updatePageVisit) {
      app.globalData.updatePageVisit('products');
    }
    
    // 🔴 截屏/录屏封禁
    this.initScreenshotProtection();
    
    // 🔴 检查封禁状态（确保重启后也能拦截）
    this.checkBanStatus();
    
    // 1. 进页面 300ms 后触发入场
    setTimeout(() => {
      this.setData({ hasEntered: true });

      // 2. 再延迟 800ms (等卡片动画稳定)，让底部按钮弹上来
      setTimeout(() => {
        this.setData({ isTriggerBtnVisible: true });

        // 3. 按钮弹起后等待 3000ms，然后变淡沉下
        setTimeout(() => {
          // 只有当抽屉没打开时才变淡
          if (!this.data.isDrawerOpen) {
            this.setData({ isTriggerBtnFaded: true });
          }
        }, 3000);

      }, 800);

    }, 300);
  },

  // 🔴 检查封禁状态
  async checkBanStatus() {
    try {
      const loginRes = await wx.cloud.callFunction({ name: 'login' });
      const openid = loginRes.result.openid;
      const db = wx.cloud.database();
      
      const buttonRes = await db.collection('login_logbutton')
        .where({ _openid: openid })
        .orderBy('updateTime', 'desc')
        .limit(1)
        .get();
      
      if (buttonRes.data && buttonRes.data.length > 0) {
        const btn = buttonRes.data[0];
        
        // 🔴 最高优先级：检查强制封禁按钮 qiangli
        const qiangli = btn.qiangli === true || btn.qiangli === 1 || btn.qiangli === 'true' || btn.qiangli === '1';
        if (qiangli) {
          console.log('[products] ⚠️ 检测到强制封禁按钮 qiangli 已开启，无视一切放行，直接封禁');
          wx.reLaunch({ url: '/pages/blocked/blocked?type=banned' });
          return; // 强制封禁，直接返回，不执行后续任何检查
        }
      }
      
      // 🔴 关键修复：先检查是否是管理员，管理员豁免封禁检查（但qiangli优先级更高）
      const adminCheck = await db.collection('guanliyuan')
        .where({ openid: openid })
        .limit(1)
        .get();
      
      if (adminCheck.data && adminCheck.data.length > 0) {
        console.log('[products] ✅ 检测到管理员身份，豁免封禁检查');
        return; // 管理员直接返回，不检查封禁状态
      }
      
      if (buttonRes.data && buttonRes.data.length > 0) {
        const btn = buttonRes.data[0];
        const rawFlag = btn.isBanned;
        const isBanned = rawFlag === true || rawFlag === 1 || rawFlag === 'true' || rawFlag === '1';
        
        if (isBanned) {
          console.log('[products] 检测到封禁状态，跳转到封禁页');
          const banType = btn.banReason === 'screenshot' || btn.banReason === 'screen_record' 
            ? 'screenshot' 
            : (btn.banReason === 'location_blocked' ? 'location' : 'banned');
          wx.reLaunch({ url: `/pages/blocked/blocked?type=${banType}` });
          return;
        }
      }
    } catch (err) {
      console.error('[products] 检查封禁状态失败:', err);
    }
  },

  onShow() {
    // 🔴 启动定时检查 qiangli 强制封禁
    const app = getApp();
    if (app && app.startQiangliCheck) {
      app.startQiangliCheck();
    }
    
    // 🔴 检查封禁状态
    this.checkBanStatus();
    
    // 🔴 检查未完成的寄回订单
    this.checkUnfinishedReturn();
    
    // 🔴 检查录屏状态
    if (wx.getScreenRecordingState) {
      wx.getScreenRecordingState({
        success: (res) => {
          if (res.state === 'on' || res.recording) {
            this.handleIntercept('record');
          }
        }
      });
    }
  },

  // 🔴 初始化截屏/录屏保护
  initScreenshotProtection() {
    // 物理防线：确保录屏、截屏出来的全是黑屏
    if (wx.setVisualEffectOnCapture) {
      wx.setVisualEffectOnCapture({
        visualEffect: 'hidden',
        success: () => console.log('[products] 🛡️ 硬件级防偷拍锁定')
      });
    }

    // 截屏监听
    wx.onUserCaptureScreen(() => {
      this.handleIntercept('screenshot');
    });

    // 录屏监听
    if (wx.onUserScreenRecord) {
      wx.onUserScreenRecord(() => {
        this.handleIntercept('record');
      });
    }
  },

  // 🔴 获取位置和设备信息的辅助函数（必须解析出详细地址）
  async _getLocationAndDeviceInfo() {
    const sysInfo = wx.getSystemInfoSync();
    const deviceInfo = {
      deviceInfo: sysInfo.system || '',
      phoneModel: sysInfo.model || ''
    };
    
    // 尝试从缓存获取位置信息
    const cachedLocation = wx.getStorageSync('last_location');
    if (cachedLocation && cachedLocation.province && cachedLocation.city) {
      // 如果缓存中有完整的地址信息，直接使用
      return {
        ...cachedLocation,
        ...deviceInfo
      };
    }
    
    try {
      // 获取当前位置
      const locationRes = await new Promise((resolve, reject) => {
        wx.getLocation({
          type: 'gcj02',
          success: resolve,
          fail: reject
        });
      });

      const lat = locationRes.latitude;
      const lng = locationRes.longitude;
      
      // 🔴 使用带重试机制的逆地理编码获取详细地址
      const { reverseGeocodeWithRetry } = require('../../utils/reverseGeocode.js');
      const addressData = await reverseGeocodeWithRetry(lat, lng, {
        maxRetries: 3,
        timeout: 10000,
        retryDelay: 1000
      });

      return {
        ...addressData,
        ...deviceInfo
      };
    } catch (err) {
      console.error('[products] 获取位置信息失败:', err);
      // 获取定位失败，尝试使用缓存的位置信息
      if (cachedLocation) {
        return {
          ...cachedLocation,
          ...deviceInfo
        };
      } else {
        // 完全失败，只返回设备信息
        return deviceInfo;
      }
    }
  },

  // 🔴 处理截屏/录屏拦截
  async handleIntercept(type) {
    // 🔴 关键修复：立即清除本地授权状态，防止第二次截屏时被自动放行
    wx.removeStorageSync('has_permanent_auth');
    
    // 标记封禁（本地存储）
    wx.setStorageSync('is_user_banned', true);
    if (type === 'screenshot') {
      wx.setStorageSync('is_screenshot_banned', true);
    }

    console.log('[products] 🔴 截屏/录屏检测，立即跳转');
    
    // 🔴 立即跳转到封禁页面（不等待云函数）
    this._jumpToBlocked(type);

    // 🔴 异步调用云函数（不阻塞跳转）
    const sysInfo = wx.getSystemInfoSync();
    wx.cloud.callFunction({
      name: 'banUserByScreenshot',
      data: {
        type: type,
        banPage: 'products',
        deviceInfo: sysInfo.system || '',
        phoneModel: sysInfo.model || ''
      },
      success: (res) => {
        console.log('[products] ✅ 设置封禁状态成功:', res);
      },
      fail: (err) => {
        console.error('[products] ⚠️ 设置封禁状态失败:', err);
      }
    });

    // 🔴 异步补充位置信息（不阻塞，可选）
    this._getLocationAndDeviceInfo().then(locationData => {
      wx.cloud.callFunction({
        name: 'banUserByScreenshot',
        data: {
          type: type,
          banPage: 'products',
          ...locationData
        },
        success: (res) => {
          console.log('[products] 补充位置信息成功，类型:', type, '结果:', res);
        },
        fail: (err) => {
          console.error('[products] 补充位置信息失败:', err);
        }
      });
    }).catch(() => {
      // 位置信息获取失败，不影响，已经设置了封禁状态
      console.log('[products] 位置信息获取失败，但封禁状态已设置');
    });
  },

  _jumpToBlocked(type) {
    // 🔴 防止重复跳转
    const app = getApp();
    if (app.globalData._isJumpingToBlocked) {
      console.log('[products] 正在跳转中，忽略重复跳转请求');
      return;
    }

    // 检查当前页面是否已经是 blocked 页面
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    if (currentPage && currentPage.route === 'pages/blocked/blocked') {
      console.log('[products] 已在 blocked 页面，无需重复跳转');
      return;
    }

    app.globalData._isJumpingToBlocked = true;

    wx.reLaunch({
      url: `/pages/blocked/blocked?type=${type}`,
      success: () => {
        console.log('[products] 跳转到 blocked 页面成功');
        setTimeout(() => {
          app.globalData._isJumpingToBlocked = false;
        }, 2000);
      },
      fail: (err) => {
        console.error('[products] 跳转失败:', err);
        app.globalData._isJumpingToBlocked = false;
        wx.exitMiniProgram();
      }
    });
  },

  // === 1:1 跟手滑动 ===
  touchStartY: 0,

  onTouchStart(e) {
    this.touchStartY = e.changedTouches[0].clientY;
    this.setData({ isDragging: true });
  },

  onTouchMove(e) {
    if (!this.data.isDragging) return;
    const currentY = e.changedTouches[0].clientY;
    const diff = currentY - this.touchStartY;
    
    // 1:1 跟手，限制最大滑动距离 ±300px 防止拖太远
    let restrictedDiff = diff;
    if (restrictedDiff > 300) restrictedDiff = 300;
    if (restrictedDiff < -300) restrictedDiff = -300;

    // 直接 1:1 跟手，方向与手指保持一致
    this.setData({ dragOffset: restrictedDiff });
  },

  onTouchEnd(e) {
    if (!this.data.isDragging) return;
    
    const endY = e.changedTouches[0].clientY;
    const diff = endY - this.touchStartY;
    const threshold = 80; // 滑过约 1/3 卡片高度即切换
    
    const len = this.data.list.length;
    let newIndex = this.data.currentIndex;

    // 往上滑 (diff < 0) -> 看下面的卡片 (index变大，循环)
    if (diff < -threshold) {
      newIndex = (newIndex + 1) % len;
    } 
    // 往下滑 (diff > 0) -> 看上面的卡片 (index变小，循环)
    else if (diff > threshold) {
      newIndex = (newIndex - 1 + len) % len;
    }

    this.setData({
      isDragging: false,
      dragOffset: 0,
      currentIndex: newIndex
    });

    if (newIndex !== this.data.currentIndex) {
      wx.vibrateShort({ type: 'light' });
    }
  },

  onCardTap(e) {
    const { index, id, title } = e.currentTarget.dataset;
    const idx = parseInt(index);

    if (this.data.currentIndex !== idx) {
      // 如果点的不是当前中间的，就切换过去
      this.setData({ currentIndex: idx });
    } else {
      // 如果点的是中间的，就跳转
      wx.vibrateShort({ type: 'light' });
      this.executeNavigation(id);
    }
  },

  // 跳转逻辑
  executeNavigation(id) {
    console.log('点击的ID:', id);
    
    const app = getApp();
    const isShareCodeUser = app.globalData.isShareCodeUser || false;

    // 🔴 分享码用户：主页按钮点击直接进入安装教程
    if (isShareCodeUser) {
      wx.navigateTo({
        url: '/pages/azjc/azjc',
        success: () => {
          console.log('[products] 分享码用户跳转到安装教程');
        },
        fail: (err) => {
          console.error('[products] 跳转失败:', err);
        }
      });
      return;
    }
    
    // 联系方式直接跳转
    if (id === 8) {
      wx.navigateTo({ 
        url: '/pages/call/call',
        success: function() {
          console.log('联系方式跳转成功');
        },
        fail: (err) => {
          console.log('联系方式跳转失败:', err);
          this.showAutoToast('提示', '跳转失败: ' + JSON.stringify(err));
        }
      });
      return;
    }

    // 🔴 安装教程：跳转前进行权限检查
    if (id === 7) {
      this.checkTutorialAccess();
      return;
    }

    let target = '';
    // 根据 ID 匹配跳转路径
    switch (id) {
      case 3: target = '/pages/pagenew/pagenew'; break; // 产品上新
      case 4: target = '/pages/shop/shop'; break;        // 产品选购
      case 10: target = '/pages/case/case'; break;      // 案例展示
      case 5: target = '/pages/paihang/paihang'; break; // 排行榜单
      case 1: target = '/pages/scan/scan'; break;       // 控制中心
      case 9: target = '/pages/ota/ota'; break;         // OTA升级
      case 6: target = '/pages/shouhou/shouhou'; break; // 维修中心
      case 12: target = '/pages/home/home'; break;       // 附近门店
      case 2: target = '/pages/my/my'; break;           // 我的信息 -> my 页面
      // 其他待开发...
      default: target = ''; break;
    }
    
    if (target) {
      wx.navigateTo({ url: target });
    } else {
      this.showAutoToast('提示', '该功能暂未开放');
    }
  },

  // 🔴 检查安装教程访问权限
  async checkTutorialAccess() {
    this.showMyLoading('验证权限中...');
    
    try {
      const db = wx.cloud.database();
      const _ = db.command;
      
      // 1. 获取当前用户 openid
      const { result: { openid } } = await wx.cloud.callFunction({ name: 'login' });

      // 2. 检查管理员
      let adminCheck = await db.collection('guanliyuan').where({ openid: openid }).count();
      if (adminCheck.total === 0) {
        adminCheck = await db.collection('guanliyuan').where({ _openid: openid }).count();
      }
      
      if (adminCheck.total > 0) {
        // 是管理员：直接放行
        this.hideMyLoading();
        wx.navigateTo({ url: '/pages/azjc/azjc' });
        return; 
      }

      // 3. 检查是否有订单（任何状态的订单）
      const allOrdersRes = await db.collection('shop_orders').where({
        _openid: openid
      }).get();

      // 4. 检查是否绑定了设备（使用 openid 字段，因为 bindDevice 云函数存储的是 openid）
      // 🔴 修复：同时检查 openid 和 _openid，确保兼容不同的数据格式
      // 🔴 必须检查 isActive: true，只有审核通过的设备才算绑定成功
      let deviceCheck1 = await db.collection('sn').where({
        openid: openid,
        isActive: true
      }).count();
      
      let deviceCheck2 = await db.collection('sn').where({
        _openid: openid,
        isActive: true
      }).count();
      
      const hasDevice = deviceCheck1.total > 0 || deviceCheck2.total > 0;
      
      console.log('[checkTutorialAccess] 设备检查结果:', {
        openid: openid.substring(0, 10) + '...',
        deviceCheck1: deviceCheck1.total,
        deviceCheck2: deviceCheck2.total,
        hasDevice
      });

      // 🔴 修改逻辑：检查订单状态
      // 过滤出真正未确认收货的订单（status 是 1 或 'SHIPPED'，且不是 'SIGNED' 或 'COMPLETED'）
      const realPendingOrders = allOrdersRes.data.filter(order => {
        const status = order.status;
        const realStatus = order.realStatus;
        // 只统计真正未确认收货的订单
        return (status === 1 || status === 'SHIPPED') 
            && status !== 'SIGNED' && status !== 'COMPLETED'
            && realStatus !== 'SIGNED' && realStatus !== 'COMPLETED';
      });

      // 🔴 检查是否有已确认收货的订单
      const confirmedOrders = allOrdersRes.data.filter(order => {
        const status = order.status;
        const realStatus = order.realStatus;
        // 已确认收货的订单：status 或 realStatus 是 'SIGNED' 或 'COMPLETED'
        return status === 'SIGNED' || status === 'COMPLETED' 
            || realStatus === 'SIGNED' || realStatus === 'COMPLETED';
      });

      console.log('[checkTutorialAccess] 订单检查结果:', {
        totalOrders: allOrdersRes.data.length,
        pendingOrders: realPendingOrders.length,
        confirmedOrders: confirmedOrders.length,
        orders: allOrdersRes.data.map(o => ({ id: o.orderId, status: o.status, realStatus: o.realStatus }))
      });

      // 🔴 新逻辑（修复）：
      // 1. 如果绑定了设备（不管有没有订单或订单状态）-> 直接放行
      if (hasDevice) {
        console.log('[checkTutorialAccess] ✅ 用户已绑定设备，直接放行');
        this.hideMyLoading();
        wx.navigateTo({ url: '/pages/azjc/azjc' });
        return; 
      }

      // 2. 🔴 关键修复：如果有已确认收货的订单 -> 直接放行（不需要绑定设备）
      if (confirmedOrders.length > 0) {
        console.log('[checkTutorialAccess] ✅ 用户有已确认收货的订单，直接放行');
        this.hideMyLoading();
        wx.navigateTo({ url: '/pages/azjc/azjc' });
        return;
      }

      // 3. 如果有未确认收货的订单 -> 提示先确认收货
      if (realPendingOrders.length > 0) {
        console.log('[checkTutorialAccess] ⚠️ 有未确认收货的订单:', realPendingOrders.length);
        this.hideMyLoading();
        this._showCustomModal({
          title: '提示',
          content: '请前往个人中心-我的订单\n确认收货后解锁教程',
          showCancel: false,
          confirmText: '知道了'
        });
        return;
      }

      // 4. 既没订单也没绑定设备 -> 显示提示（只给这种情况）
      // 🔴 这个提示只显示给：没下过单，并且没绑定设备的用户
      if (allOrdersRes.data.length === 0 && !hasDevice) {
        console.log('[checkTutorialAccess] ⚠️ 既没订单也没绑定设备');
        this.hideMyLoading();
        this._showCustomModal({
          title: '提示',
          content: '请前往个人中心-我的订单\n确认收货后解锁教程',
          showCancel: false,
          confirmText: '知道了'
        });
        return;
      }

      // 5. 其他情况（理论上不应该到这里，但保留兜底逻辑）
      console.log('[checkTutorialAccess] ⚠️ 未知情况，拒绝访问');
      this.hideMyLoading();
      this._showCustomModal({
        title: '提示',
        content: '请前往个人中心-我的订单\n确认收货后解锁教程',
        showCancel: false,
        confirmText: '知道了'
      });

    } catch (err) {
      console.error('权限检查异常', err);
      this.hideMyLoading();
      this._showCustomModal({
        title: '提示',
        content: '权限验证失败，请重试',
        showCancel: false,
        confirmText: '知道了'
      });
    }
  },
  
  goBack() { 
    wx.reLaunch({ url: '/pages/index/index' }); 
  },
  
  // 【新增】自动消失提示（无按钮，3秒后自动消失）
  // 空函数，用于阻止事件冒泡和滚动
  noop() {},

  // 【新增】检查是否有未完成的寄回订单
  checkUnfinishedReturn() {
    const db = wx.cloud.database();
    db.collection('shouhou_repair')
      .where({
        needReturn: true
      })
      .get()
      .then(checkRes => {
        // 过滤出未完成且用户未录入运单号的订单
        const unfinishedReturns = (checkRes.data || []).filter(item => 
          !item.returnCompleted && !item.returnTrackingId
        );
        
        if (unfinishedReturns.length > 0) {
          // 有未完成的寄回订单，显示提示
          this._showCustomModal({
            title: '提示',
            content: '检测到您有一笔未完成的售后，未寄回维修配件，请先处理完成',
            showCancel: true,
            confirmText: '去处理',
            cancelText: '稍后',
            success: (res) => {
              if (res.confirm) {
                // 跳转到个人中心
                wx.navigateTo({ 
                  url: '/pages/my/my',
                  fail: (err) => {
                    console.error('[checkUnfinishedReturn] 跳转失败:', err);
                    this.showAutoToast('提示', '跳转失败，请手动进入个人中心');
                  }
                });
              }
            }
          });
        }
      })
      .catch(err => {
        console.error('检查寄回订单失败:', err);
        // 检查失败不显示错误，避免影响用户体验
      });
  },

  // 【新增】自动消失提示（无按钮，2秒后自动消失，带收缩退出动画）
  showAutoToast(title = '提示', content = '') {
    // 如果已有toast在显示，先关闭它
    if (this.data.autoToast.show) {
      this._closeAutoToastWithAnimation();
      setTimeout(() => {
        this._showAutoToastInternal(title, content);
      }, 420);
    } else {
      this._showAutoToastInternal(title, content);
    }
  },

  // 内部方法：显示自动提示
  _showAutoToastInternal(title, content) {
    this.setData({
      'autoToast.show': true,
      'autoToast.title': title,
      'autoToast.content': content,
      autoToastClosing: false
    });
    // 2秒后自动消失（带退出动画）
    setTimeout(() => {
      this._closeAutoToastWithAnimation();
    }, 2000);
  },

  // 关闭自动提示（带收缩退出动画）
  _closeAutoToastWithAnimation() {
    if (!this.data.autoToast.show) return;
    this.setData({ autoToastClosing: true });
    setTimeout(() => {
      this.setData({ 
        'autoToast.show': false,
        autoToastClosing: false
      });
    }, 420);
  },

  // 🔴 统一的自定义 Loading 显示方法（替换所有 wx.showLoading 和 getApp().showLoading）
  showMyLoading(title = '加载中...') {
    this.setData({
      showLoadingAnimation: true
    });
  },

  // 🔴 统一的自定义 Loading 隐藏方法（替换所有 wx.hideLoading 和 getApp().hideLoading）
  hideMyLoading() {
    this.setData({
      showLoadingAnimation: false
    });
  },

  // 🔴 辅助函数：获取 custom-toast 组件并调用（优先使用缓存的实例）
  _getCustomToast() {
    // 优先使用缓存的实例
    if (this._customToastInstance) {
      return this._customToastInstance;
    }
    // 如果缓存不存在，尝试获取
    const toast = this.selectComponent('#custom-toast');
    if (toast) {
      this._customToastInstance = toast; // 缓存实例
      return toast;
    }
    return null;
  },

  // 🔴 统一的自定义 Toast 方法（替换所有 wx.showToast）
  _showCustomToast(title, icon = 'none', duration = 2000) {
    // 尝试获取组件，最多重试3次
    const tryShow = (attempt = 0) => {
      const toast = this._getCustomToast();
      if (toast && toast.showToast) {
        toast.showToast({ title, icon, duration });
      } else if (attempt < 3) {
        // 延迟重试
        setTimeout(() => tryShow(attempt + 1), 100 * (attempt + 1));
      } else {
        // 最终降级
        console.warn('[products] custom-toast 组件未找到，使用降级方案');
        wx.showToast({ title, icon, duration });
      }
    };
    tryShow();
  },

  // 🔴 统一的自定义 Modal 方法（替换所有 wx.showModal，除了 editable 的情况）
  _showCustomModal(options) {
    // 如果 editable 为 true，使用原生（因为自定义组件不支持输入框）
    if (options.editable) {
      return wx.showModal(options);
    }
    
    // 尝试获取组件，最多重试3次
    const tryShow = (attempt = 0) => {
      const toast = this._getCustomToast();
      if (toast && toast.showModal) {
        toast.showModal({
          title: options.title || '提示',
          content: options.content || '',
          showCancel: options.showCancel !== false,
          confirmText: options.confirmText || '确定',
          cancelText: options.cancelText || '取消',
          success: options.success
        });
      } else if (attempt < 3) {
        // 延迟重试
        setTimeout(() => tryShow(attempt + 1), 100 * (attempt + 1));
      } else {
        // 最终降级
        console.warn('[products] custom-toast 组件未找到，使用降级方案');
        wx.showModal(options);
      }
    };
    tryShow();
  },

  // ================= 底部抽屉交互 =================

  // 切换抽屉状态
  toggleDrawer() {
    this.setData({ isDrawerOpen: !this.data.isDrawerOpen });
  },

  // 关闭抽屉
  closeDrawer() {
    this.setData({ 
      isDrawerOpen: false,
      // 关闭抽屉后，按钮恢复显示，并直接进入变淡沉下状态（不打扰用户）
      isTriggerBtnVisible: true,
      isTriggerBtnFaded: true 
    });
  },

  // 触摸开始（只在把手区域触发）
  onDrawerTouchStart(e) {
    this.drawerTouchStartY = e.changedTouches[0].clientY;
    this.drawerTouchStartTime = Date.now();
  },

  // 触摸移动（用于实时判断滑动方向）
  onDrawerTouchMove(e) {
    // 可以在这里添加实时反馈，但暂时不处理，避免影响滚动
  },

  // 触摸结束（只在把手区域触发）
  onDrawerTouchEnd(e) {
    if (!this.drawerTouchStartY) return;
    
    const touchEndY = e.changedTouches[0].clientY;
    const touchEndTime = Date.now();
    const diff = touchEndY - this.drawerTouchStartY;
    const duration = touchEndTime - this.drawerTouchStartTime;
    
    // 计算滑动速度 (px/ms)
    const velocity = Math.abs(diff) / duration;
    
    // 🔴 优化：只在把手区域响应，提高关闭阈值
    // 1. 增加关闭阈值：从 50px 增加到 100px
    // 2. 添加速度判断：快速滑动 (> 0.3 px/ms) 时降低阈值到 80px
    
    // 上滑 (diff < -100) -> 展开（提高阈值）
    if (diff < -100 && !this.data.isDrawerOpen) {
      this.setData({ isDrawerOpen: true });
    }
    // 下滑关闭：需要满足以下条件
    // 1. 下滑距离 > 100px（或快速滑动时 > 80px）
    // 2. 抽屉已打开
    else if (this.data.isDrawerOpen) {
      const threshold = velocity > 0.3 ? 80 : 100; // 快速滑动时降低阈值
      if (diff > threshold) {
        this.setData({ isDrawerOpen: false });
      }
    }
    
    // 清理
    this.drawerTouchStartY = null;
    this.drawerTouchStartTime = null;
  },

  // 点击功能卡片
  onFunctionTap(e) {
    const id = e.currentTarget.dataset.id;
    // 添加震动反馈
    wx.vibrateShort({ type: 'light' });
    this.executeNavigation(id);
  }
});
