const cosUpload = require('../../../utils/cosUpload.js');
const shopImagePrepare = require('../../../utils/shopImagePrepare.js');
const hubNav = require('../../../utils/hubNav.js');

var QQMapWX = require('../../../utils/qqmap-wx-jssdk.js');
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
// 7. 常见问题（浅蓝底 + 蓝色圆润问号，匹配页面风格）
const iconFaq = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjQiIGN5PSIyNCIgcj0iMjQiIGZpbGw9IiNFMUY1RkUiLz4KPHBhdGggZD0iTTE3LjUgMTguNUMxNy41IDE0LjkxMDEgMjAuNDEwMSAxMiAyNCAxMkMyNy41ODk5IDEyIDMwLjUgMTQuOTEwMSAzMC41IDE4LjVDMzAuNSAyMS41IDI3LjUgMjMuNSAyNS41IDI1QzI0LjUgMjUuNzUgMjQgMjYuNSAyNCAyOCIgc3Ryb2tlPSIjMDI4OEQxIiBzdHJva2Utd2lkdGg9IjQiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8Y2lyY2xlIGN4PSIyNCIgY3k9IjM1IiByPSIyLjUiIGZpbGw9IiMwMjg4RDEiLz4KPC9zdmc+";
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

/** 功能入口开关（shop_config 文档），管理员控制各页面是否对用户开放 */
const PRODUCT_FEATURE_FLAGS_DOC = 'productFeatureFlags';
const HUB_HOME_CONFIG_DOC = 'hubHomeConfig';
const FEATURE_FLAGS_LOCAL_KEY = '__products_feature_flags__';
/** 功能列表里「产品上新」卡片 id：仅控制进入 pagenew，不控制 MT 新品推荐弹窗 */
const FEATURE_ID_PAGENEW = 3;

/** 新品弹窗：云端未返回前先占位，保证蒙层第一时间出现 */
const NEW_ARRIVAL_LOADING_ITEM = {
  _id: 'fallback-loading',
  title: '正在加载新品…',
  cover: '',
  coverFull: '',
  coverThumb: '',
  dualCover: false
};

Page({
  data: {
    // 🔴 状态栏高度
    statusBarHeight: 44,
    isAuthorized: false,
    
    // 状态控制
    hasEntered: true,       // 默认可见，避免偶发白屏（入场状态未拉起）
    
    isDragging: false,
    dragOffset: 0,
    currentIndex: 0, // 默认选中第0个，即"产品上新"
    skipCardTransition: false, // 返回落位时禁用一帧动画，避免“自动滑动可见”
    
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
    
    // Bento 枢纽分区（由 list 同步生成）
    hubHero: null,
    hubMidNew: null,
    hubMidControl: null,
    hubMinis: [],
    hubMiniGroups: [],
    hubFeatureNew: null,
    hubFeatureCase: null,
    hubFeatureControl: null,
    hubServiceCards: [],
    hubBentoServices: [],
    hubBentoRepair: null,
    hubBentoTutorial: null,
    hubBentoOta: null,
    hubListItems: [],
    hubTabIndex: 0,
    /** 横向轨道偏移：商城为全屏层，0/1 均不偏移轨道 */
    hubTrackTranslatePct: 0,
    /** 商城全屏层 top（px，紧贴分段栏下沿） */
    hubShopLayerTop: 88,
    hubShopEmbedScrollHeight: 0,
    /** 底栏高亮：0=首页区(主页/商城)，1=订单，2=我的 */
    hubBottomBarIndex: 0,
    hubSwiperDuration: 0,
    hubPanelsAnim: false,
    hubShopMounted: false,
    hubOrdersMounted: true,
    hubProfileMounted: true,
    hubShellIsAdmin: false,
    hubCartBadge: 0,
    showHubTabBar: true,
    /** 嵌入订单/我的面板内有全屏弹窗时隐藏底栏 */
    hubShellModalOpen: false,
    hubPageEnterAnim: false,
    hubBanners: [],
    /** 首页「产品上新」独立封面（与 pagenew 列表无关，建议 4:3） */
    hubHomeCoverFileId: '',
    hubHomeCoverDisplay: '',
    hubHomeMediaList: [],
    hubHomeMediaCurrent: 0,
    hubHomeMediaAutoplay: false,
    hubHomeSwiperAutoplay: false,
    /** 管理员：本地开关与云端 shop_config 不一致（用户仍读云端） */
    featureFlagsUnsynced: false,

    // 功能卡顺序：买→装→用→修；排行榜单为其他产品线，默认靠后且默认关闭
    iconArrowUp,
    list: [
      {
        id: 3,
        title: '产品上新',
        en: 'NEW ARRIVALS',
        hint: '查看最新上架与亮点',
        iconSvg: iconNew,
        iconSize: '110rpx',
        pageEnabled: true
      },
      {
        id: 4,
        title: '产品选购',
        en: 'PRODUCTS',
        hint: '浏览配件与实时价格',
        iconSvg: iconShop,
        iconSize: '72rpx',
        pageEnabled: true
      },
      {
        id: 10,
        title: '案例展示',
        en: 'SHOWCASE',
        hint: '真实装车案例参考',
        iconSvg: iconShowcase,
        iconSize: '80rpx',
        pageEnabled: true
      },
      {
        id: 7,
        title: '安装教程',
        en: 'VIDEO GUIDE',
        hint: '分步视频安装教程',
        iconSvg: iconInstall,
        iconSize: '80rpx',
        pageEnabled: true
      },
      {
        id: 1,
        title: '控制中心',
        en: 'CONTROL CENTER',
        hint: '连接设备并调节参数',
        iconSvg: iconControl,
        iconSize: '80rpx',
        pageEnabled: true
      },
      {
        id: 13,
        title: '常见问题',
        en: 'FAQ',
        hint: '按产品查看视频解答',
        iconSvg: iconFaq,
        iconSize: '80rpx',
        pageEnabled: true
      },
      {
        id: 6,
        title: '维修中心',
        en: 'SERVICE & REPAIR',
        hint: '寄修申请与进度查看',
        iconSvg: iconRepair,
        iconSize: '80rpx',
        pageEnabled: true
      },
      {
        id: 12,
        title: '附近门店',
        en: 'NEARBY STORES',
        hint: '查看附近门店导航',
        iconSvg: iconStore,
        iconSize: '80rpx',
        pageEnabled: true
      },
      {
        id: 8,
        title: '联系方式',
        en: 'CONTACT US',
        hint: '客服咨询与联系方式',
        iconSvg: iconContact,
        iconSize: '80rpx',
        pageEnabled: true
      },
      {
        id: 9,
        title: 'OTA升级',
        en: 'SYSTEM UPDATE',
        hint: '在线升级设备固件',
        iconSvg: iconOTA,
        iconSize: '80rpx',
        pageEnabled: true
      },
      {
        id: 5,
        title: '排行榜单',
        en: 'RANKING LIST',
        hint: '热门榜单与排行变化',
        iconSvg: iconRank,
        iconSize: '80rpx',
        pageEnabled: false
      },
      {
        id: 2,
        title: '个人中心',
        en: 'MY PROFILE',
        hint: '订单与账户统一管理',
        iconSvg: iconProfile,
        iconSize: '80rpx',
        pageEnabled: true
      }
    ],

    // 🆕 产品上新弹窗：由 initNewArrivalModal 在有数据时再设为 true，避免先闪空白
    showNewArrivalModal: false,
    newArrivalClosing: false,
    /** 延后一帧再为 true，否则蒙层/卡片首帧 animation 常不触发 */
    newArrivalAnimIn: false,
    newArrivalList: [],
    newArrivalIndex: 0,
    newArrivalHdLoaded: {}
  },

  // 腾讯云 COS / 云开发临时链：追加数据万象缩略参数，显著减小首包（非 COS 域名不追加，避免第三方图 404）
  buildLowQualityUrl(url) {
    if (!url || typeof url !== 'string') return url;
    const u = url.trim();
    if (u.indexOf('http://') !== 0 && u.indexOf('https://') !== 0) return url;
    if (/imageMogr2|imageView2/i.test(u)) return u;
    const host = (() => {
      try {
        return new URL(u).hostname || '';
      } catch (e) {
        return '';
      }
    })();
    const cosLike = /myqcloud\.com$|tcb\.qcloud\.la$|tencentcos\.cn$|file\.myqcloud\.com$/i.test(host)
      || /^cos\.[^.]+\.myqcloud\.com$/i.test(host);
    if (!cosLike) return u;
    const sep = u.indexOf('?') === -1 ? '?' : '&';
    return `${u}${sep}imageMogr2/thumbnail/960x`;
  },

  stripImageProcessParams(url) {
    if (!url || typeof url !== 'string') return url;
    const q = url.indexOf('?');
    if (q === -1) return url;
    const base = url.slice(0, q);
    const parts = url.slice(q + 1).split('&').filter(p => !/^(imageMogr2|imageView2)/i.test(p));
    return parts.length ? `${base}?${parts.join('&')}` : base;
  },

  _isFlagEnabled(val) {
    if (val === undefined || val === null) return true;
    if (val === false || val === 0 || val === '0' || val === 'false') return false;
    if (val === true || val === 1 || val === '1' || val === 'true') return true;
    return !!val;
  },

  _normalizeFlagMap(raw) {
    const src = raw && typeof raw === 'object' ? raw : {};
    const out = {};
    Object.keys(src).forEach((k) => {
      const key = String(k).trim();
      if (!key) return;
      out[key] = this._isFlagEnabled(src[k]);
    });
    return out;
  },

  _extractFlagsFromShopConfigDoc(docData) {
    if (!docData || typeof docData !== 'object') return null;
    if (docData.flags && typeof docData.flags === 'object') {
      return this._normalizeFlagMap(docData.flags);
    }
    if (docData.data && docData.data.flags && typeof docData.data.flags === 'object') {
      return this._normalizeFlagMap(docData.data.flags);
    }
    return null;
  },

  _applyFeatureFlagsToList(list, flags = {}) {
    const normalized = this._normalizeFlagMap(flags);
    return (list || []).map((item) => {
      const key = String(item.id);
      const hasFlag = Object.prototype.hasOwnProperty.call(normalized, key);
      return {
        ...item,
        pageEnabled: hasFlag ? normalized[key] : item.pageEnabled !== false
      };
    });
  },

  /** 首页：选购 + 独立大卡（新品/案例）+ 服务组件卡 */
  _rebuildHubLayout() {
    const list = this.data.list || [];
    const byId = (id) => list.find((i) => Number(i.id) === Number(id)) || null;
    const cardHints = {
      3: 'New Product Arrival',
      10: '改装案例与灵感库',
      1: '连接设备并调节参数',
      7: '分步视频安装教程',
      6: '专业售后预约',
      13: '专业快速解答及自助支持',
      12: '寻找距离最近的服务网点',
      9: '固件在线升级',
      8: '官方客服在线实时技术支持'
    };
    const cardTags = {
      3: 'NEW',
      10: 'FEATURED',
      1: 'DEVICE'
    };

    const arrivals = (this.data.newArrivalList || []).filter(
      (x) => x && x._id && !String(x._id).startsWith('fallback')
    );
    const firstArrival = arrivals[0];
    const fallbackCover = firstArrival
      ? (firstArrival.coverFull || firstArrival.coverThumb || firstArrival.cover || '')
      : '';
    const dedicatedHubCover = String(this.data.hubHomeCoverDisplay || '').trim();
    const mediaList = this.data.hubHomeMediaList || [];
    const firstMediaCover = mediaList.length ? String(mediaList[0].url || '').trim() : '';
    const newCover = dedicatedHubCover || fallbackCover;
    const currentMediaIdx = Math.max(0, Math.min(Number(this.data.hubHomeMediaCurrent) || 0, Math.max(0, mediaList.length - 1)));

    const enrich = (id) => {
      const item = byId(id);
      if (!item) return null;
      return {
        ...item,
        hubDesc: cardHints[id] || item.hint || '',
        hubTag: cardTags[id] || ''
      };
    };

    const hubFeatureNewRaw = enrich(3);
    const hubFeatureNew = hubFeatureNewRaw
      ? { ...hubFeatureNewRaw, hubCover: newCover, hubSubTitle: firstArrival ? firstArrival.title : '探索最新发布' }
      : null;
    if (hubFeatureNew && firstMediaCover) {
      hubFeatureNew.hubCover = firstMediaCover;
    }
    const hubFeatureCase = enrich(10);
    const hubFeatureControl = enrich(1);
    const hubBentoRepair = enrich(6);
    const hubBentoTutorial = enrich(7);
    const hubBentoOta = enrich(9);
    const hubListItems = [13, 12, 8].map((id) => enrich(id)).filter(Boolean);
    const hubBentoServices = hubListItems;

    this.setData({
      hubHero: byId(4),
      hubFeatureNew,
      hubFeatureCase,
      hubFeatureControl,
      hubBentoRepair,
      hubBentoTutorial,
      hubBentoOta,
      hubListItems,
      hubBentoServices,
      hubServiceCards: hubListItems,
      hubHomeMediaCurrent: currentMediaIdx,
      hubMidNew: byId(3),
      hubMidControl: byId(1),
      hubMinis: hubListItems,
      hubMiniGroups: [],
      hubBanners: []
    });
  },

  _setListAndHub(list, extra = {}, callback) {
    this.setData({ list, ...extra }, () => {
      this._rebuildHubLayout();
      if (typeof callback === 'function') callback();
    });
  },

  /** 首页新品大卡封面：不依赖弹窗打开才拉数据 */
  async loadHubHomeConfig() {
    let fileId = '';
    let mediaList = [];
    let mediaAutoplay = false;
    let hasAutoplayFromFn = false;
    try {
      const viaFn = await this._fetchProductFeatureFlagsFromCloudFn();
      if (viaFn && viaFn.hubNewCover) {
        fileId = String(viaFn.hubNewCover).trim();
      }
      if (viaFn && Array.isArray(viaFn.hubNewMediaList)) {
        mediaList = viaFn.hubNewMediaList;
      }
      if (viaFn && viaFn.hubNewMediaAutoplay != null) {
        mediaAutoplay = !!viaFn.hubNewMediaAutoplay;
        hasAutoplayFromFn = true;
      }
      if (wx.cloud && (!fileId || !Array.isArray(mediaList) || !mediaList.length)) {
        if (!this.db) this.db = wx.cloud.database();
        const res = await this.db.collection('shop_config').doc(HUB_HOME_CONFIG_DOC).get();
        const dbCover = String((res.data && res.data.hubNewCover) || '').trim();
        if (!fileId && dbCover) {
          fileId = dbCover;
        }
        if ((!Array.isArray(mediaList) || !mediaList.length) && res && res.data && Array.isArray(res.data.hubNewMediaList)) {
          mediaList = res.data.hubNewMediaList;
        }
        if (!hasAutoplayFromFn && res && res.data && res.data.hubNewMediaAutoplay != null) {
          mediaAutoplay = !!res.data.hubNewMediaAutoplay;
        }
      }
    } catch (e) {
    }
    const cleanedMedia = (mediaList || [])
      .map((item) => {
        const type = item && item.type === 'video' ? 'video' : 'image';
        const url = String((item && item.url) || '').trim();
        if (!url) return null;
        return {
          type,
          url,
          autoplay: type === 'video' ? item.autoplay === true : false
        };
      })
      .filter(Boolean);

    const resolvedMedia = [];
    for (let i = 0; i < cleanedMedia.length; i++) {
      const one = cleanedMedia[i];
      const resolvedUrl = await this._resolveHubCoverDisplayUrl(one.url);
      resolvedMedia.push({ ...one, url: resolvedUrl || one.url });
    }

    if (!fileId && !resolvedMedia.length) {
      if (this.data.hubHomeCoverFileId || this.data.hubHomeCoverDisplay || this.data.hubHomeMediaList.length) {
        this.setData({
          hubHomeCoverFileId: '',
          hubHomeCoverDisplay: '',
          hubHomeMediaList: [],
          hubHomeMediaCurrent: 0,
          hubHomeMediaAutoplay: false
        }, () => {
          this._syncHubHomeSwiperAutoplay();
          this._rebuildHubLayout();
        });
      }
      return;
    }
    if (
      fileId === this.data.hubHomeCoverFileId &&
      this.data.hubHomeCoverDisplay &&
      JSON.stringify(resolvedMedia) === JSON.stringify(this.data.hubHomeMediaList) &&
      mediaAutoplay === this.data.hubHomeMediaAutoplay
    ) {
      return;
    }
    const display = await this._resolveHubCoverDisplayUrl(fileId);
    this.setData({
      hubHomeCoverFileId: fileId,
      hubHomeCoverDisplay: display,
      hubHomeMediaList: resolvedMedia,
      hubHomeMediaCurrent: 0,
      hubHomeMediaAutoplay: !!mediaAutoplay
    }, () => {
      this._syncHubHomeSwiperAutoplay();
      this._rebuildHubLayout();
    });
  },

  async _persistHubHomeCover(fileID, mediaList = this.data.hubHomeMediaList, mediaAutoplay = this.data.hubHomeMediaAutoplay) {
    if (!wx.cloud || !this.data.isAuthorized) return false;
    const hubNewCover = String(fileID || '').trim();
    const hubNewMediaList = (mediaList || []).map((item) => ({
      type: item && item.type === 'video' ? 'video' : 'image',
      url: String((item && item.url) || '').trim(),
      autoplay: item && item.type === 'video' ? item.autoplay === true : false
    })).filter(item => item.url);
    const hubNewMediaAutoplay = !!mediaAutoplay;
    try {
      const res = await wx.cloud.callFunction({
        name: 'setHubHomeConfig',
        data: { hubNewCover, hubNewMediaList, hubNewMediaAutoplay }
      });
      const result = res && res.result;
      if (result && result.success) return true;
    } catch (cfErr) {
      console.error('[products] setHubHomeConfig 失败:', cfErr);
    }
    return false;
  },

  async loadHubNewArrivalsForHome() {
    const app = getApp();
    const cache = app && app.globalData && app.globalData.newArrivalCache;
    const applyList = (rawList) => {
      const list = this.enhanceNewArrivalList(rawList || []);
      if (!list.length) return;
      this.setData({ newArrivalList: list }, () => this._rebuildHubLayout());
    };
    if (cache && cache.list && cache.list.length) {
      applyList(cache.list);
      return;
    }
    try {
      if (!this.db) {
        try { wx.cloud.init({ traceUser: true }); } catch (e) {}
        this.db = wx.cloud.database();
      }
      const res = await this.db.collection('products').limit(8).get();
      const products = res.data || [];
      if (!products.length) return;
      const resolved = await this.resolveProductCoverUrls(products);
      const enhanced = this.enhanceNewArrivalList(resolved);
      if (!enhanced.length) return;
      if (app && app.globalData) {
        app.globalData.newArrivalCache = { list: enhanced, cacheTime: Date.now() };
      }
      applyList(enhanced);
    } catch (e) {
    }
  },

  _saveFeatureFlagsLocalCache(list, syncedToCloud = true) {
    try {
      wx.setStorageSync(FEATURE_FLAGS_LOCAL_KEY, {
        flags: this._buildFeatureFlagsFromList(list),
        ts: Date.now(),
        syncedToCloud: syncedToCloud !== false
      });
    } catch (e) {}
  },

  _readFeatureFlagsLocalCacheEntry() {
    try {
      const cache = wx.getStorageSync(FEATURE_FLAGS_LOCAL_KEY);
      if (cache && cache.flags && cache.ts && Date.now() - cache.ts < 7 * 24 * 60 * 60 * 1000) {
        return cache;
      }
    } catch (e) {}
    return null;
  },

  _readFeatureFlagsLocalCache() {
    const entry = this._readFeatureFlagsLocalCacheEntry();
    return entry ? entry.flags : null;
  },

  _mergeFeatureFlagMaps(cloudFlags = {}, localFlags = {}) {
    const merged = { ...(cloudFlags || {}) };
    Object.keys(localFlags || {}).forEach((key) => {
      merged[key] = localFlags[key];
    });
    return merged;
  },

  _cloudUpdateTimeToMs(updateTime) {
    if (!updateTime) return 0;
    if (updateTime instanceof Date) return updateTime.getTime();
    if (typeof updateTime === 'number') return updateTime;
    if (updateTime.seconds) return updateTime.seconds * 1000;
    return 0;
  },

  _buildFeatureFlagsFromList(list) {
    const flags = {};
    (list || []).forEach((item) => {
      flags[String(item.id)] = this._isFlagEnabled(item.pageEnabled);
    });
    return flags;
  },

  _featureFlagsMatchExpected(cloudFlags, expectedFlags) {
    const cloud = this._normalizeFlagMap(cloudFlags || {});
    const expected = this._normalizeFlagMap(expectedFlags || {});
    const keys = new Set([...Object.keys(cloud), ...Object.keys(expected)]);
    for (const key of keys) {
      const inCloud = Object.prototype.hasOwnProperty.call(cloud, key);
      const inExpected = Object.prototype.hasOwnProperty.call(expected, key);
      if (!inExpected) continue;
      const cloudVal = inCloud ? cloud[key] : true;
      if (cloudVal !== expected[key]) return false;
    }
    return true;
  },

  _syncGlobalFlagsFromList(list) {
    const flags = this._normalizeFlagMap(this._buildFeatureFlagsFromList(list));
    try {
      const app = getApp();
      if (app && app.globalData) {
        app.globalData.productFeatureFlags = flags;
      }
    } catch (e) {}
    return flags;
  },

  _normalizeFeatureId(id) {
    const num = Number(id);
    return Number.isFinite(num) ? num : null;
  },

  _getGlobalProductFeatureFlags() {
    try {
      const app = getApp();
      const flags = app && app.globalData && app.globalData.productFeatureFlags;
      return flags && typeof flags === 'object' ? flags : null;
    } catch (e) {
      return null;
    }
  },

  /** 功能是否开放：以当前页 list.pageEnabled 为准（与抽屉开关一致），global 仅作兜底 */
  _resolveFeatureOpenState(id) {
    const numId = this._normalizeFeatureId(id);
    if (numId == null) return false;
    const key = String(numId);
    const item = (this.data.list || []).find((i) => Number(i.id) === numId);
    if (item != null && item.pageEnabled != null) {
      return this._isFlagEnabled(item.pageEnabled);
    }
    const globalFlags = this._getGlobalProductFeatureFlags();
    if (globalFlags && Object.prototype.hasOwnProperty.call(globalFlags, key)) {
      return this._isFlagEnabled(globalFlags[key]);
    }
    return true;
  },

  _isFeatureEnabledForUser(id) {
    if (this.data.isAuthorized) return true;
    return this._resolveFeatureOpenState(id);
  },

  _notifyFeatureClosed(id) {
    const numId = this._normalizeFeatureId(id);
    const item = (this.data.list || []).find((i) => Number(i.id) === numId);
    const title = (item && item.title) || '该功能';
    this.showAutoToast('提示', `${title}正在开发中，敬请期待`);
  },

  /** MT 新品推荐弹窗：跟随「产品上新」(id=3) 开关，关闭入口则不再弹出 */
  _shouldShowNewArrivalModal() {
    const item = (this.data.list || []).find((i) => Number(i.id) === FEATURE_ID_PAGENEW);
    if (item) return item.pageEnabled !== false;
    const localFlags = this._readFeatureFlagsLocalCache();
    const key = String(FEATURE_ID_PAGENEW);
    if (localFlags && Object.prototype.hasOwnProperty.call(localFlags, key)) {
      return this._isFlagEnabled(localFlags[key]);
    }
    return true;
  },

  _syncNewArrivalModalWithPagenewFlag() {
    if (!this._shouldShowNewArrivalModal() && this.data.showNewArrivalModal) {
      this.closeNewArrivalModal();
    }
  },

  _readAdminPrivilegeCache() {
    const keys = [
      '__pagenew_admin_privilege_cache__',
      '__shop_admin_privilege_cache__',
      '__products_admin_privilege_cache__'
    ];
    const ttl = 10 * 60 * 1000;
    let sawFalse = false;
    for (let i = 0; i < keys.length; i++) {
      try {
        const cache = wx.getStorageSync(keys[i]);
        if (!cache || typeof cache.isAuthorized !== 'boolean' || !cache.ts) continue;
        if (Date.now() - cache.ts >= ttl) continue;
        if (cache.isAuthorized === true) return true;
        sawFalse = true;
      } catch (e) {}
    }
    return sawFalse ? false : null;
  },

  /** 与 shop / pagenew 一致：guanliyuan 白名单 → isAuthorized */
  async checkAdminPrivilege() {
    const ADMIN_CACHE_KEY = '__products_admin_privilege_cache__';
    const cached = this._readAdminPrivilegeCache();
    if (cached === true) {
      if (!this.data.isAuthorized) this.setData({ isAuthorized: true });
      this._syncHubPanelsAuth();
      return;
    }

    if (!wx.cloud) return;
    try {
      const res = await wx.cloud.callFunction({ name: 'login' });
      const myOpenid = (res && res.result && res.result.openid) || '';
      if (!myOpenid) return;
      if (!this.db) this.db = wx.cloud.database();
      let adminCheck = await this.db.collection('guanliyuan').where({ openid: myOpenid }).get();
      if (!adminCheck.data || adminCheck.data.length === 0) {
        adminCheck = await this.db.collection('guanliyuan').where({ _openid: myOpenid }).get();
      }
      const isAuthorized = !!(adminCheck.data && adminCheck.data.length);
      this.setData({ isAuthorized }, () => {
        this._syncHubPanelsAuth();
        this._updateHubShopEmbedScrollHeight();
        this._rebuildHubLayout();
      });
      try {
        wx.setStorageSync(ADMIN_CACHE_KEY, { isAuthorized, ts: Date.now() });
      } catch (e) {}
    } catch (err) {
      console.error('[products] checkAdminPrivilege 失败:', err);
    }
  },

  async _fetchProductFeatureFlagsFromCloudFn() {
    if (!wx.cloud) return null;
    try {
      const res = await wx.cloud.callFunction({ name: 'getProductFeatureFlags' });
      const result = res && res.result;
      if (result && result.success) {
        return {
          flags: result.flags || {},
          updateTime: result.updateTime || null,
          hubNewCover: result.hubNewCover || '',
          hubNewMediaList: Array.isArray(result.hubNewMediaList) ? result.hubNewMediaList : [],
          hubNewMediaAutoplay: result.hubNewMediaAutoplay === true
        };
      }
    } catch (e) {
    }
    return null;
  },

  async loadProductFeatureFlags(force = false) {
    if (this._featureFlagsDirty && !force) return;

    const localEntry = this._readFeatureFlagsLocalCacheEntry();
    const localFlags = localEntry && localEntry.flags ? this._normalizeFlagMap(localEntry.flags) : null;
    const isAdmin = !!this.data.isAuthorized;
    let cloudFlags = null;

    if (wx.cloud) {
      const viaFn = await this._fetchProductFeatureFlagsFromCloudFn();
      if (viaFn && viaFn.flags) {
        cloudFlags = this._normalizeFlagMap(viaFn.flags);
      }
      if (!cloudFlags || !Object.keys(cloudFlags).length) {
        try {
          if (!this.db) this.db = wx.cloud.database();
          const res = await this.db.collection('shop_config').doc(PRODUCT_FEATURE_FLAGS_DOC).get();
          const extracted = this._extractFlagsFromShopConfigDoc(res && res.data);
          if (extracted && Object.keys(extracted).length) {
            cloudFlags = extracted;
          }
        } catch (e) {
        }
      }
    }

    let flagsToApply = {};
    const pendingLocalOnly = isAdmin && localEntry && localEntry.syncedToCloud === false && localFlags;
    if (pendingLocalOnly) {
      flagsToApply = this._normalizeFlagMap(this._mergeFeatureFlagMaps(cloudFlags || {}, localFlags));
    } else if (cloudFlags && Object.keys(cloudFlags).length > 0) {
      flagsToApply = cloudFlags;
    } else if (localFlags) {
      flagsToApply = localFlags;
    }
    if (!Object.keys(flagsToApply).length) {
      this.setData({ featureFlagsUnsynced: !!pendingLocalOnly });
      this._featureFlagsLoaded = true;
      return;
    }

    const list = this._applyFeatureFlagsToList(this.data.list, flagsToApply);
    this._syncGlobalFlagsFromList(pendingLocalOnly ? this._applyFeatureFlagsToList(list, cloudFlags || {}) : list);
    this._setListAndHub(list, { featureFlagsUnsynced: !!pendingLocalOnly }, () => this._syncNewArrivalModalWithPagenewFlag());
    if (!pendingLocalOnly) {
      this._saveFeatureFlagsLocalCache(list, true);
    }
    this._featureFlagsLoaded = true;
  },

  async _persistProductFeatureFlags(list) {
    if (!wx.cloud || !this.data.isAuthorized) return false;
    const flags = this._normalizeFlagMap(this._buildFeatureFlagsFromList(list));
    try {
      const res = await wx.cloud.callFunction({
        name: 'setProductFeatureFlags',
        data: { flags }
      });
      const result = res && res.result;
      if (result && result.success) {
        const verify = await this._fetchProductFeatureFlagsFromCloudFn();
        const cloudFlags = verify && verify.flags ? verify.flags : (result.flags || {});
        if (!this._featureFlagsMatchExpected(cloudFlags, flags)) {
          console.error('[products] 云端回读与开关不一致', { cloudFlags, flags });
          return false;
        }
        this._saveFeatureFlagsLocalCache(list, true);
        this._syncGlobalFlagsFromList(list);
        this.setData({ featureFlagsUnsynced: false });
        return true;
      }
      if (result && result.error) {
        console.error('[products] setProductFeatureFlags:', result.error);
      }
    } catch (cfErr) {
      console.error('[products] setProductFeatureFlags 失败:', cfErr);
    }
    return false;
  },

  async onFeatureFlagChange(e) {
    if (!this.data.isAuthorized) return;
    const id = Number(e.currentTarget.dataset.id);
    const enabled = !!e.detail.value;
    const list = (this.data.list || []).map((item) =>
      (Number(item.id) === id ? { ...item, pageEnabled: enabled } : item)
    );
    this._featureFlagsDirty = true;
    this._saveFeatureFlagsLocalCache(list, false);
    this._setListAndHub(list, {}, () => {
      if (id === FEATURE_ID_PAGENEW) {
        this._syncNewArrivalModalWithPagenewFlag();
      }
    });
    const ok = await this._persistProductFeatureFlags(list);
    if (ok) {
      this._featureFlagsDirty = false;
      this._syncGlobalFlagsFromList(list);
      await this.loadProductFeatureFlags(true);
      const toastTitle = id === FEATURE_ID_PAGENEW && !enabled
        ? '已关闭（入口与新品弹窗均隐藏）'
        : (enabled ? '已同步云端，用户重进首页后生效' : '已关闭');
      wx.showToast({
        title: toastTitle,
        icon: 'none',
        duration: 1800
      });
    } else {
      const reverted = (this.data.list || []).map((item) =>
        (Number(item.id) === id ? { ...item, pageEnabled: !enabled } : item)
      );
      this._setListAndHub(reverted, { featureFlagsUnsynced: true }, () => this._syncGlobalFlagsFromList(reverted));
      try {
        wx.removeStorageSync(FEATURE_FLAGS_LOCAL_KEY);
      } catch (e) {}
      wx.showToast({
        title: '未写入云端，用户仍为旧状态；请部署 setProductFeatureFlags 后重试',
        icon: 'none',
        duration: 3200
      });
    }
  },

  async resolveProductCoverUrls(list = []) {
    if (!list.length) return list;
    const ids = [...new Set(
      list.map(i => i && i.cover).filter(c => c && String(c).indexOf('cloud://') === 0)
    )];
    if (!wx.cloud || !ids.length) return list;
    try {
      const res = await wx.cloud.getTempFileURL({ fileList: ids });
      const map = {};
      (res.fileList || []).forEach(f => {
        if (f.fileID && f.tempFileURL) map[f.fileID] = f.tempFileURL;
      });
      return list.map(item => {
        const c = item.cover;
        if (c && map[c]) return { ...item, cover: map[c] };
        return item;
      });
    } catch (e) {
      return list;
    }
  },

  async _resolveHubCoverDisplayUrl(cover) {
    const raw = String(cover || '').trim();
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;
    if (raw.indexOf('wxfile://') === 0 || /^https?:\/\/tmp/i.test(raw)) return raw;
    if (raw.indexOf('cloud://') === 0) {
      if (wx.cloud && wx.cloud.getTempFileURL) {
        try {
          const resp = await wx.cloud.getTempFileURL({ fileList: [raw] });
          const item = resp && resp.fileList && resp.fileList[0];
          if (item && item.status === 0 && item.tempFileURL) {
            return item.tempFileURL;
          }
          if (item && item.status !== 0) {
          }
        } catch (err) {
        }
      }
      return raw;
    }
    return raw;
  },

  onHubCoverImageError(e) {
    const stored = String(this.data.hubHomeCoverFileId || this.data.hubHomeCoverDisplay || '').trim();
    if (!stored) return;

    if (/^https?:\/\//i.test(stored)) {
      const joiner = stored.indexOf('?') === -1 ? '?' : '&';
      const bust = `${stored}${joiner}rt=${Date.now()}`;
      if (bust !== this.data.hubHomeCoverDisplay) {
        this.setData({ hubHomeCoverDisplay: bust }, () => this._rebuildHubLayout());
      }
      return;
    }

    if (stored.indexOf('cloud://') === 0) {
      this._resolveHubCoverDisplayUrl(stored).then((url) => {
        if (url && url !== this.data.hubHomeCoverDisplay) {
          this.setData({ hubHomeCoverDisplay: url }, () => this._rebuildHubLayout());
        }
      });
    }
  },

  enhanceNewArrivalList(list = []) {
    return (list || []).map(item => {
      if (!item || !item.cover) return item;
      const full = String(item.cover).trim();
      const thumb = this.buildLowQualityUrl(full);
      return {
        ...item,
        cover: full,
        coverFull: full,
        coverThumb: thumb,
        dualCover: thumb !== full
      };
    });
  },

  onNewArrivalHdLoad(e) {
    const idx = Number(e.currentTarget.dataset.index);
    if (Number.isNaN(idx)) return;
    this.setData({ [`newArrivalHdLoaded.${idx}`]: true });
  },

  onNewArrivalThumbError(e) {
    const idx = Number(e.currentTarget.dataset.index);
    if (Number.isNaN(idx) || idx < 0) return;
    const item = (this.data.newArrivalList || [])[idx];
    if (!item || !item.coverFull) return;

    const retryKey = `thumb_${idx}`;
    this._newArrivalRetryMap = this._newArrivalRetryMap || {};
    if ((this._newArrivalRetryMap[retryKey] || 0) >= 1) return;
    this._newArrivalRetryMap[retryKey] = 1;

    const stripped = this.stripImageProcessParams(String(item.coverThumb || ''));
    const fallback = stripped && stripped !== item.coverThumb ? stripped : item.coverFull;
    const thumb = fallback;
    const dual = thumb !== item.coverFull;
    this.setData({
      [`newArrivalList[${idx}].coverThumb`]: thumb,
      [`newArrivalList[${idx}].dualCover`]: dual
    });
  },

  async onNewArrivalImageError(e) {
    const idx = Number(e.currentTarget.dataset.index);
    const kind = e.currentTarget.dataset.kind || 'high';
    if (Number.isNaN(idx) || idx < 0) return;

    const retryKey = `${kind}_${idx}`;
    this._newArrivalRetryMap = this._newArrivalRetryMap || {};
    const tried = this._newArrivalRetryMap[retryKey] || 0;
    if (tried >= 1) return;
    this._newArrivalRetryMap[retryKey] = tried + 1;

    const item = (this.data.newArrivalList || [])[idx];
    if (!item) return;

    const base = item.coverFull || item.cover;
    if (!base) return;

    let nextCover = base;
    try {
      const cover = String(base);
      if (cover.indexOf('cloud://') === 0 && wx.cloud && wx.cloud.getTempFileURL) {
        const resp = await wx.cloud.getTempFileURL({ fileList: [cover] });
        const temp = resp && resp.fileList && resp.fileList[0] && resp.fileList[0].tempFileURL;
        if (temp) {
          nextCover = temp;
        }
      } else if (cover.startsWith('http://') || cover.startsWith('https://')) {
        const joiner = cover.indexOf('?') === -1 ? '?' : '&';
        nextCover = `${cover}${joiner}rt=${Date.now()}`;
      }
    } catch (err) {
    }

    const nextThumb = this.buildLowQualityUrl(nextCover);
    this.setData({
      [`newArrivalList[${idx}].cover`]: nextCover,
      [`newArrivalList[${idx}].coverFull`]: nextCover,
      [`newArrivalList[${idx}].coverThumb`]: nextThumb,
      [`newArrivalList[${idx}].dualCover`]: nextThumb !== nextCover,
      [`newArrivalHdLoaded.${idx}`]: false
    });
  },

  // 记录“从子页面返回后应聚焦的卡片”
  rememberReturnFocus(cardId) {
    const idNum = Number(cardId);
    if (!idNum) return;
    try {
      wx.setStorageSync('__products_return_focus__', {
        cardId: idNum,
        ts: Date.now()
      });
    } catch (e) {}
  },

  _pickTouchClientY(e, phase) {
    const t = e.touches && e.touches[0];
    const c = e.changedTouches && e.changedTouches[0];
    if (phase === 'move') return (t && t.clientY != null ? t : c);
    if (phase === 'start') return (t && t.clientY != null ? t : c);
    return c || t;
  },

  /** 新品弹窗已在展示时，异步刷新列表不要把 swiper 强行拉回第 0 张 */
  _pickNextNewArrivalIndex(newLen) {
    if (!newLen) return 0;
    if (!this.data.showNewArrivalModal) return 0;
    const prev = Number(this.data.newArrivalIndex) || 0;
    return Math.min(Math.max(0, prev), newLen - 1);
  },

  /** wasAlreadyOpen：弹窗已展示且动画已播完则跳过；否则下一帧再挂动画类（避免同帧插入不播） */
  _afterSetNewArrivalVisible(wasAlreadyOpen) {
    if (wasAlreadyOpen && this.data.newArrivalAnimIn) return;
    if (this._newArrivalAnimTimer) clearTimeout(this._newArrivalAnimTimer);
    this.setData({ newArrivalAnimIn: false });
    wx.nextTick(() => {
      this._newArrivalAnimTimer = setTimeout(() => {
        this._newArrivalAnimTimer = null;
        if (!this.data.showNewArrivalModal || this.data.newArrivalClosing) return;
        this.setData({ newArrivalAnimIn: true });
      }, 48);
    });
  },

  /** index 入场后进 products：onLoad 立刻出蒙层，不等卡片入场 1.1s */
  _openNewArrivalFromIndexEarly() {
    if (!this._shouldShowNewArrivalModal()) {
      if (!this._newArrivalFromIndexConsumed && this._consumeNewArrivalFromIndexFlag()) {
        this._newArrivalFromIndexConsumed = true;
      }
      return;
    }
    if (this._newArrivalFromIndexConsumed) return;
    if (!this._consumeNewArrivalFromIndexFlag()) return;
    this._newArrivalFromIndexConsumed = true;
    this.setData({
      showNewArrivalModal: true,
      newArrivalClosing: false,
      newArrivalList: [NEW_ARRIVAL_LOADING_ITEM],
      newArrivalIndex: 0,
      newArrivalAnimIn: false,
      newArrivalHdLoaded: {}
    });
    this._afterSetNewArrivalVisible(false);
    // onLoad 已消费 storage 标记，紧随其后的 onShow 会误判「非 index 首进」并关掉弹窗
    this._skipNewArrivalCloseOnNextShow = true;
    this.initNewArrivalModal();
  },

  _setDeckIndex(idx, extra = {}) {
    const len = (this.data.list && this.data.list.length) || 1;
    let i = Number(idx);
    if (Number.isNaN(i)) i = 0;
    i = ((i % len) + len) % len;
    this._deckCurrentIndex = i;
    this.setData({ currentIndex: i, ...extra });
  },

  async onLoad(options) {
    this.calcNavBarInfo();
    this._deckCurrentIndex = 0;
    if (options && String(options.hubTab) === 'shop') {
      this.setData({
        hubTabIndex: 1,
        hubTrackTranslatePct: 0,
        hubBottomBarIndex: 0,
        hubShopMounted: true,
        hubTrackTranslatePct: 25,
        showHubTabBar: false,
        hubSwiperDuration: 0
      });
    } else {
      const hubTab = options && options.hubTab != null ? Number(options.hubTab) : NaN;
      if (!Number.isNaN(hubTab) && hubTab >= 0 && hubTab <= 2) {
        const panelIndex = hubTab === 0 ? 0 : hubTab + 1;
        const patch = {
          hubTabIndex: panelIndex,
          hubTrackTranslatePct: panelIndex * 25,
          hubBottomBarIndex: hubTab,
          hubSwiperDuration: 0,
          showHubTabBar: panelIndex !== 1
        };
        if (hubTab === 1) patch.hubOrdersMounted = true;
        if (hubTab === 2) patch.hubProfileMounted = true;
        this.setData(patch);
      }
    }
    // 离页递增：作废仍在飞行的异步，防止晚到的云回调再写 __products_return_focus__ / navigateTo
    this._productsLifeSeq = 0;
    // onHide 时记录的页面栈深度；仅 >=2（曾叠子页）时才在 onShow 消费 __products_return_focus__，避免纯 onShow/前后台误消费把叠层拽回
    this._productsReturnFocusLeaveDepth = 0;
    // 🔴 分享码用户访问拦截：如果不是安装教程页面，跳转回去
    const app = getApp();
    if (app.globalData.isShareCodeUser) {
      wx.redirectTo({
        url: '/package-biz/pages/azjc/azjc',
        fail: () => {
          wx.reLaunch({ url: '/package-biz/pages/azjc/azjc' });
        }
      });
      return;
    }

    // 🔴 计算导航栏高度（适配所有机型）
    this.calcNavBarInfo();
    // 🔴 更新页面访问统计
    if (app && app.globalData && app.globalData.updatePageVisit) {
      app.globalData.updatePageVisit('products');
    }
    
    // 🔴 截屏/录屏封禁
    this.initScreenshotProtection();

    const adminCached = this._readAdminPrivilegeCache();
    if (adminCached === true) {
      this.setData({ isAuthorized: true }, () => this._syncHubPanelsAuth());
    }

    // 🔴 极速优化：尽早触发新品弹窗（不等待权限和开关接口），消除 1~2 秒的瀑布流延迟
    if (this._hasPendingNewArrivalFromIndex()) {
      this._openNewArrivalFromIndexEarly();
    }

    // 顺序执行耗时操作，确保权限判定准确，但不再阻塞弹窗
    this.checkAdminPrivilege().then(() => {
      this._syncHubPanelsAuth();
      return this.loadProductFeatureFlags();
    }).catch(() => {});
    this.loadHubHomeConfig().catch(() => {});

    this.checkBanStatus();

    // 仅当全局尚无商城缓存时触发预拉（避免与 app.onLaunch 重复打云；回到本页也不会刷掉已带 renderUrl 的缓存）
    try {
      const sc = app && app.globalData && app.globalData.shopDataCache;
      if (app && typeof app.preloadShopData === 'function' && (!sc || !sc.cacheTime)) {
        app.preloadShopData();
      }
    } catch (e) {}
    
    this._rebuildHubLayout();
    this.loadHubNewArrivalsForHome().catch(() => {});

    setTimeout(() => {
      this.setData({ hasEntered: true });
      this._maybeScheduleNewArrivalFromIndex();
    }, 200);
  },

  /** index 是否刚通过入场动画写入的一次性标记（未消费） */
  _hasPendingNewArrivalFromIndex() {
    try {
      const raw = wx.getStorageSync('__products_new_arrival_from_index__');
      const ts = typeof raw === 'number' ? raw : 0;
      return !!(ts && Date.now() - ts < 60000);
    } catch (e) {
      return false;
    }
  },

  _consumeNewArrivalFromIndexFlag() {
    try {
      const raw = wx.getStorageSync('__products_new_arrival_from_index__');
      wx.removeStorageSync('__products_new_arrival_from_index__');
      const ts = typeof raw === 'number' ? raw : 0;
      return !!(ts && Date.now() - ts < 60000);
    } catch (e) {
      return false;
    }
  },

  /** 仅 index → products 首进且本页入场动画结束后调用一次 */
  _maybeScheduleNewArrivalFromIndex() {
    if (!this._shouldShowNewArrivalModal()) return;
    if (this._newArrivalFromIndexConsumed) return;
    if (!this._consumeNewArrivalFromIndexFlag()) return;
    this._newArrivalFromIndexConsumed = true;
    this._scheduleNewArrivalModal();
  },

  _scheduleNewArrivalModal() {
    if (this._newArrivalTimer) clearTimeout(this._newArrivalTimer);
    this._newArrivalTimer = setTimeout(() => {
      this._newArrivalTimer = null;
      this.initNewArrivalModal();
    }, 0);
  },

  // 🆕 从云端读取 products 集合，显示产品上新弹窗（和 pagenew 复用同一份数据）
  async initNewArrivalModal() {
    if (!this._shouldShowNewArrivalModal()) return;
    if (!this._newArrivalFromIndexConsumed) return;
    try {
      if (!wx.cloud) return;
      const app = getApp();
      if (!app.globalData.newArrivalCache) {
        app.globalData.newArrivalCache = { list: null, cacheTime: 0 };
      }

      const cache = app.globalData.newArrivalCache;
      const now = Date.now();
      const cacheFresh = !!(cache.list && cache.list.length && (now - cache.cacheTime < 5 * 60 * 1000));

      if (cacheFresh) {
        const needsCloud = (cache.list || []).some(
          i => i && i.cover && String(i.cover).indexOf('cloud://') === 0
        );
        if (!needsCloud) {
          const enhancedCacheList = this.enhanceNewArrivalList(cache.list);
          const wasOpen = this.data.showNewArrivalModal;
          const animDone = this.data.newArrivalAnimIn;
          this.setData({
            newArrivalList: enhancedCacheList,
            newArrivalIndex: this._pickNextNewArrivalIndex(enhancedCacheList.length),
            showNewArrivalModal: true,
            newArrivalClosing: false,
            newArrivalHdLoaded: {},
            ...(wasOpen ? {} : { newArrivalAnimIn: false })
          });
          this._afterSetNewArrivalVisible(wasOpen && animDone);
          this.prewarmNewArrivalImages(enhancedCacheList, 2).catch(() => {});
          return;
        }
        const resolvedCache = await this.resolveProductCoverUrls(cache.list);
        const enhancedCacheList = this.enhanceNewArrivalList(resolvedCache);
        const wasOpen2 = this.data.showNewArrivalModal;
        const animDone2 = this.data.newArrivalAnimIn;
        this.setData({
          newArrivalList: enhancedCacheList,
          newArrivalIndex: this._pickNextNewArrivalIndex(enhancedCacheList.length),
          showNewArrivalModal: true,
          newArrivalClosing: false,
          newArrivalHdLoaded: {},
          ...(wasOpen2 ? {} : { newArrivalAnimIn: false })
        });
        this._afterSetNewArrivalVisible(wasOpen2 && animDone2);
        this.prewarmNewArrivalImages(enhancedCacheList, 2).catch(() => {});
        return;
      }

      // 无缓存：先立刻展示蒙层 + 占位，再拉云端（避免「先进页面半天才出弹窗」）
      const wasOpenLoading = this.data.showNewArrivalModal;
      const animDoneLoading = this.data.newArrivalAnimIn;
      this.setData({
        showNewArrivalModal: true,
        newArrivalClosing: false,
        newArrivalList: [NEW_ARRIVAL_LOADING_ITEM],
        newArrivalIndex: this._pickNextNewArrivalIndex(1),
        newArrivalHdLoaded: {},
        ...(wasOpenLoading ? {} : { newArrivalAnimIn: false })
      });
      this._afterSetNewArrivalVisible(wasOpenLoading && animDoneLoading);

      // 确保已初始化云环境（有些场景只在 pagenew 里 init 过）
      if (!this.db) {
        try {
          wx.cloud.init({ traceUser: true });
        } catch (e) {
          // 已初始化过也没关系，忽略错误
        }
        this.db = wx.cloud.database();
      }

      const res = await this.db.collection('products').get();
      const products = (res.data || []).map(item => ({
        ...item,
        jumpNumber: item.jumpNumber || null
      }));
      const resolvedProducts = await this.resolveProductCoverUrls(products);
      const enhancedProducts = this.enhanceNewArrivalList(resolvedProducts);
      if (!enhancedProducts.length) {
        const wasOpenE = this.data.showNewArrivalModal;
        const animDoneE = this.data.newArrivalAnimIn;
        this.setData({
          newArrivalList: [{
            _id: 'fallback-empty',
            title: '新品准备中',
            cover: '',
            coverFull: '',
            coverThumb: '',
            dualCover: false
          }],
          newArrivalIndex: this._pickNextNewArrivalIndex(1),
          showNewArrivalModal: true,
          newArrivalClosing: false,
          newArrivalHdLoaded: {},
          ...(wasOpenE ? {} : { newArrivalAnimIn: false })
        });
        this._afterSetNewArrivalVisible(wasOpenE && animDoneE);
        return;
      }

      app.globalData.newArrivalCache = {
        list: enhancedProducts,
        cacheTime: now
      };
      const wasOpenFinal = this.data.showNewArrivalModal;
      const animDoneFinal = this.data.newArrivalAnimIn;
      this.setData({
        newArrivalList: enhancedProducts,
        newArrivalIndex: this._pickNextNewArrivalIndex(enhancedProducts.length),
        showNewArrivalModal: true,
        newArrivalClosing: false,
        newArrivalHdLoaded: {},
        ...(wasOpenFinal ? {} : { newArrivalAnimIn: false })
      }, () => this._rebuildHubLayout());
      this._afterSetNewArrivalVisible(wasOpenFinal && animDoneFinal);
      // 先展示后预热，避免首开被 await 阻塞导致“弹窗慢”
      this.prewarmNewArrivalImages(enhancedProducts, 2).catch(() => {});
    } catch (err) {
      console.error('[products] 加载新品弹窗数据失败:', err);
      const wasOpenErr = this.data.showNewArrivalModal;
      const animDoneErr = this.data.newArrivalAnimIn;
      this.setData({
        newArrivalList: [{
          _id: 'fallback-error',
          title: '新品加载中',
          cover: '',
          coverFull: '',
          coverThumb: '',
          dualCover: false
        }],
        newArrivalIndex: this._pickNextNewArrivalIndex(1),
        showNewArrivalModal: true,
        newArrivalClosing: false,
        newArrivalHdLoaded: {},
        ...(wasOpenErr ? {} : { newArrivalAnimIn: false })
      });
      this._afterSetNewArrivalVisible(wasOpenErr && animDoneErr);
    }
  },

  // 预热图片：失败不阻塞流程
  async prewarmNewArrivalImages(list, count = 2) {
    const targets = (list || [])
      .map(item => item && (item.coverThumb || item.cover))
      .filter(Boolean)
      .slice(0, count);
    if (!targets.length) return;

    await Promise.all(targets.map(src => new Promise(resolve => {
      wx.getImageInfo({
        src,
        success: () => resolve(),
        fail: () => resolve()
      });
    })));
  },

  // 🆕 弹窗内 swiper 切换
  onNewArrivalChange(e) {
    this.setData({ newArrivalIndex: e.detail.current });
  },

  // 🆕 关闭新品弹窗
  closeNewArrivalModal(done) {
    if (!this.data.showNewArrivalModal || this.data.newArrivalClosing) return;
    this.setData({ newArrivalClosing: true, newArrivalAnimIn: false });
    if (this._newArrivalCloseTimer) clearTimeout(this._newArrivalCloseTimer);
    this._newArrivalCloseTimer = setTimeout(() => {
      this._newArrivalCloseTimer = null;
      this.setData({
        showNewArrivalModal: false,
        newArrivalClosing: false,
        newArrivalAnimIn: false
      });
      if (typeof done === 'function') done();
    }, 400);
  },

  dismissTransientModals() {
    if (this.data.autoToast && this.data.autoToast.show) {
      this.setData({ 'autoToast.show': false });
    }
    if (this.data.showNewArrivalModal && !this.data.newArrivalClosing) {
      this.closeNewArrivalModal();
    }
  },

  // 🆕 弹窗底部“立即跳转”：等同于点击“产品选购”功能卡片
  handleNewArrivalJump() {
    wx.vibrateShort({ type: 'medium' }); // 增强震动反馈
    const go = () => {
      if (!this._isFeatureEnabledForUser(4)) {
        this._notifyFeatureClosed(4);
        return;
      }
      this._openHubShopPanel();
    };
    if (this.data.showNewArrivalModal && !this.data.newArrivalClosing) {
      this.closeNewArrivalModal(go);
    } else {
      go();
    }
  },

  // 🔴 检查封禁状态
  async checkBanStatus() {
    const now = Date.now();
    if (this._lastBanCheckAt && (now - this._lastBanCheckAt < 15 * 1000)) {
      return;
    }
    this._lastBanCheckAt = now;
    try {
      const loginRes = await wx.cloud.callFunction({ name: 'login' });
      const openid = loginRes.result.openid;
      const db = wx.cloud.database();
      
      // 🔴 同时检查 login_logbutton 和 login_logs 两个集合
      const [buttonRes, logRes] = await Promise.all([
        db.collection('login_logbutton')
          .where({ _openid: openid })
          .orderBy('updateTime', 'desc')
          .limit(1)
          .get(),
        db.collection('login_logs')
          .where({ _openid: openid })
          .orderBy('updateTime', 'desc')
          .limit(1)
          .get()
      ]);
      
      // 检查 login_logbutton 集合
      if (buttonRes.data && buttonRes.data.length > 0) {
        const btn = buttonRes.data[0];
        const qiangli = btn.qiangli === true || btn.qiangli === 1 || btn.qiangli === 'true' || btn.qiangli === '1';
        if (qiangli) {
          wx.reLaunch({ url: '/pages/blocked/blocked?type=banned' });
          return;
        }
      }

      // 🔴 同时检查 login_logs 集合（兼容用户在 login_logs 中设置 qiangli 的情况）
      if (logRes.data && logRes.data.length > 0) {
        const log = logRes.data[0];
        const qiangli = log.qiangli === true || log.qiangli === 1 || log.qiangli === 'true' || log.qiangli === '1';
        if (qiangli) {
          wx.reLaunch({ url: '/pages/blocked/blocked?type=banned' });
          return;
        }
      }
      
      // 🔴 关键修复：先检查是否是管理员，管理员豁免封禁检查（但qiangli优先级更高）
      let adminCheck = await db.collection('guanliyuan')
        .where({ openid: openid })
        .limit(1)
        .get();
      if (!adminCheck.data || adminCheck.data.length === 0) {
        adminCheck = await db.collection('guanliyuan')
          .where({ _openid: openid })
          .limit(1)
          .get();
      }
      
      if (adminCheck.data && adminCheck.data.length > 0) {
        if (!this.data.isAuthorized) this.setData({ isAuthorized: true });
        return;
      }

      if (buttonRes.data && buttonRes.data.length > 0) {
        const btn = buttonRes.data[0];
        const rawFlag = btn.isBanned;
        const isBanned = rawFlag === true || rawFlag === 1 || rawFlag === 'true' || rawFlag === '1';
        
        if (isBanned) {
          const banType = btn.banReason === 'screenshot' || btn.banReason === 'screen_record' 
            ? 'screenshot' 
            : (btn.banReason === 'location_blocked' ? 'location' : 'banned');
          wx.reLaunch({ url: `/pages/blocked/blocked?type=${banType}` });
          return;
        }
      }
    } catch (err) {
      const msg = (err.errMsg || err.message || '') + '';
      if (msg.indexOf('access_token') !== -1) {
        return;
      }
      console.error('[products] 检查封禁状态失败:', err);
    }
  },

  onShow() {
    // 兜底：若入场状态异常未拉起，立即恢复可见，避免页面空白
    if (!this.data.hasEntered) {
      this.setData({ hasEntered: true });
    }
    this.loadHubNewArrivalsForHome().catch(() => {});
    this.loadHubHomeConfig().catch(() => {});
    this._refreshHubCartBadge();

    // 从子页返回时清空跟手状态（页面缓存常见）：残留 isDragging / dragOffset 会导致滑不动、松手弹回
    this.touchStartY = 0;
    this.setData({ isDragging: false, dragOffset: 0 });

    let hasReturnFocus = false;

    // 最高优先级：shop(back from jumpNumber) 的一次性强制聚焦
    try {
      const forceFocus = wx.getStorageSync('__products_force_focus_once__');
      const validForceFocus = !!(
        forceFocus &&
        forceFocus.cardId &&
        forceFocus.ts &&
        (Date.now() - forceFocus.ts < 15000)
      );
      if (forceFocus) {
        wx.removeStorageSync('__products_force_focus_once__');
      }
      if (validForceFocus) {
        wx.removeStorageSync('__products_skip_return_focus_once__');
        wx.removeStorageSync('__products_return_focus__');
        const list = this.data.list || [];
        const targetIndex = list.findIndex(item => Number(item.id) === Number(forceFocus.cardId));
        if (targetIndex >= 0 && targetIndex !== Number(this.data.currentIndex)) {
          this._setDeckIndex(targetIndex, {
            newArrivalIndex: 0,
            skipCardTransition: true
          });
          setTimeout(() => {
            this.setData({ skipCardTransition: false });
          }, 80);
        } else {
          this.setData({ newArrivalIndex: 0 });
        }
        hasReturnFocus = true;
      }
    } catch (e) {}

    // pagenew 返回 products 的一次性豁免：忽略自动定位，保持当前卡片不被改写
    let skipReturnFocusOnce = false;
    if (!hasReturnFocus) {
      try {
        const skipPayload = wx.getStorageSync('__products_skip_return_focus_once__');
        skipReturnFocusOnce = !!(
          skipPayload
          && skipPayload.source === 'pagenew_goBack'
          && skipPayload.ts
          && (Date.now() - skipPayload.ts < 8000)
        );
        if (skipPayload) {
          wx.removeStorageSync('__products_skip_return_focus_once__');
        }
        if (skipReturnFocusOnce) {
          wx.removeStorageSync('__products_return_focus__');
        }
      } catch (e) {}
    }

    // 从任意子页面返回时，按记录恢复到对应卡片（全局统一返回体验）
    // 仅当 onHide 时栈深度 >=2（说明当时已打开子页盖住 products）才消费 storage，否则与本页滑动触发的 onShow 混淆会把卡片拽回
    const savedReturnFocusLeaveDepth = this._productsReturnFocusLeaveDepth || 0;
    this._productsReturnFocusLeaveDepth = 0;
    const canApplyStorageReturnFocus = savedReturnFocusLeaveDepth >= 2;
    const returnedFromSubPage = savedReturnFocusLeaveDepth >= 2;

    if (!hasReturnFocus && !skipReturnFocusOnce) {
      try {
        const ret = wx.getStorageSync('__products_return_focus__');
        if (ret && ret.cardId && ret.ts && (Date.now() - ret.ts < 10 * 60 * 1000)) {
          if (canApplyStorageReturnFocus) {
            hasReturnFocus = true;
            wx.removeStorageSync('__products_return_focus__');
            const list = this.data.list || [];
            const targetIndex = list.findIndex(item => Number(item.id) === Number(ret.cardId));
            const patch = { newArrivalIndex: 0 };
            if (targetIndex >= 0 && targetIndex !== Number(this.data.currentIndex)) {
              patch.skipCardTransition = true;
              patch.currentIndex = targetIndex;
              this._deckCurrentIndex = targetIndex;
            }
            this.setData(patch);
            if (patch.skipCardTransition) {
              setTimeout(() => {
                this.setData({ skipCardTransition: false });
              }, 80);
            }
          }
        }
      } catch (e) {}
    }

    // 不再在「无 return_focus」时强制 currentIndex=0：会误伤用户在本页滑到后面的卡片
    // （从子页返回、前后台切换触发 onShow 时，整叠卡片被拉回第一张，体感像「弹回 azjc/首页」）。
    // 需要回到「产品上新」时：由 onLoad / 入口 reLaunch 控制；从子页返回仍走 __products_return_focus__。

    // 兜底恢复：若 scan 详情页被系统侧滑误退到 products，自动回 scan 图二对应卡片
    try {
      const payload = wx.getStorageSync('__scan_recover_payload__');
      if (payload && payload.ts && (Date.now() - payload.ts < 2500)) {
        wx.removeStorageSync('__scan_recover_payload__');
        const idx = Number(payload.index || 0);
        setTimeout(() => {
          wx.reLaunch({
            url: `/package-app/pages/scan/scan?restoreIndex=${idx}`
          });
        }, 30);
        return;
      }
    } catch (e) {}

    // 🔴 兜底：每次回到 PRODUCTS 页，强制关闭所有“全屏遮罩类”UI，防止页面被罩层卡住
    this.setData({
      showLoadingAnimation: false,     // 关闭 loading 遮罩
      'autoToast.show': false,         // 关闭顶部自动提示
      autoToastClosing: false,
      isDrawerOpen: false             // 关闭底部抽屉（对应 drawer-mask）
    });

    // 仅「从子页返回」时关新品弹窗；避免关抽屉/前后台切换误关（与「产品上新」开关无关）
    const pendingFromIndex = this._hasPendingNewArrivalFromIndex();
    const skipCloseOnce = !!this._skipNewArrivalCloseOnNextShow;
    if (skipCloseOnce) this._skipNewArrivalCloseOnNextShow = false;

    if (!pendingFromIndex && !skipCloseOnce && returnedFromSubPage) {
      if (this._newArrivalTimer) {
        clearTimeout(this._newArrivalTimer);
        this._newArrivalTimer = null;
      }
      if (this.data.showNewArrivalModal) {
        this.setData({
          showNewArrivalModal: false,
          newArrivalClosing: false,
          newArrivalAnimIn: false
        });
      }
    }

    const runOnShowChecks = () => {
      // 🔴 启动定时检查 qiangli 强制封禁
      const app = getApp();
      if (app && app.startQiangliCheck) {
        app.startQiangliCheck();
      }
      
      this.checkAdminPrivilege();
      if (!this._featureFlagsDirty) {
        this.loadProductFeatureFlags();
      }
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
    };

    // 统一轻量延后重任务，优先保证首屏响应
    const delay = hasReturnFocus ? 120 : 80;
    setTimeout(runOnShowChecks, delay);
  },

  onUnload() {
    if (this._focusCardTimer) {
      clearInterval(this._focusCardTimer);
      this._focusCardTimer = null;
    }
    if (this._newArrivalAnimTimer) {
      clearTimeout(this._newArrivalAnimTimer);
      this._newArrivalAnimTimer = null;
    }
    if (this._newArrivalCloseTimer) {
      clearTimeout(this._newArrivalCloseTimer);
      this._newArrivalCloseTimer = null;
    }
    this._teardownScreenshotProtection();
  },

  onHide() {
    if (this._newArrivalTimer) {
      clearTimeout(this._newArrivalTimer);
      this._newArrivalTimer = null;
    }
    if (this._focusCardTimer) {
      clearInterval(this._focusCardTimer);
      this._focusCardTimer = null;
    }
    let stackDepth = 1;
    try {
      stackDepth = (getCurrentPages() || []).length;
    } catch (e) {}
    this._productsReturnFocusLeaveDepth = stackDepth;

    // 离开 products（含进入任意子页）后递增，供异步回调检测：不得再写 return_focus / 改栈
    this._productsLifeSeq = (this._productsLifeSeq || 0) + 1;
    // 离开页面前复位，避免缓存实例保留半截手势
    this.touchStartY = 0;
    this.setData({ isDragging: false, dragOffset: 0 });
  },

  // 🔴 初始化截屏/录屏保护
  initScreenshotProtection() {
    // 物理防线：确保录屏、截屏出来的全是黑屏
    if (wx.setVisualEffectOnCapture) {
      wx.setVisualEffectOnCapture({
        visualEffect: 'hidden',
        success: () => {}
      });
    }

    try {
      this._onCaptureScreenHandler = () => this.handleIntercept('screenshot');
      wx.onUserCaptureScreen(this._onCaptureScreenHandler);
    } catch (e) {}

    if (wx.onUserScreenRecord) {
      try {
        this._onScreenRecordHandler = () => this.handleIntercept('record');
        wx.onUserScreenRecord(this._onScreenRecordHandler);
      } catch (e) {}
    }
  },

  _teardownScreenshotProtection() {
    if (this._onCaptureScreenHandler && wx.offUserCaptureScreen) {
      try { wx.offUserCaptureScreen(this._onCaptureScreenHandler); } catch (e) {}
      this._onCaptureScreenHandler = null;
    }
    if (this._onScreenRecordHandler && wx.offUserScreenRecord) {
      try { wx.offUserScreenRecord(this._onScreenRecordHandler); } catch (e) {}
      this._onScreenRecordHandler = null;
    }
  },

  // 🔴 获取位置和设备信息的辅助函数（必须解析出详细地址，带超时保护）
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
      // 🔴 获取当前位置（带超时保护，最多等待 3 秒）
      const locationRes = await Promise.race([
        new Promise((resolve, reject) => {
          wx.getLocation({
            type: 'gcj02',
            success: resolve,
            fail: reject
          });
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('获取定位超时')), 3000)
        )
      ]);

      const lat = locationRes.latitude;
      const lng = locationRes.longitude;
      
      // 🔴 使用带重试机制的逆地理编码获取详细地址（减少超时时间，加快响应）
      const { reverseGeocodeWithRetry } = require('../../../utils/reverseGeocode.js');
      const addressData = await Promise.race([
        reverseGeocodeWithRetry(lat, lng, {
          maxRetries: 2, // 减少重试次数，从 3 次降到 2 次
          timeout: 5000, // 减少单次超时时间，从 10 秒降到 5 秒
          retryDelay: 500 // 减少重试延迟，从 1 秒降到 0.5 秒
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('逆地理编码超时')), 8000)
        )
      ]);

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
    // 🔴 立即跳转到封禁页面（不等待云函数）
    this._jumpToBlocked(type);

    // 🔴 异步调用云函数（不阻塞跳转，带超时保护）
    const sysInfo = wx.getSystemInfoSync();
    const cloudCallTimeout = setTimeout(() => {
    }, 5000);
    
    wx.cloud.callFunction({
      name: 'banUserByScreenshot',
      data: {
        type: type,
        banPage: 'products',
        deviceInfo: sysInfo.system || '',
        phoneModel: sysInfo.model || ''
      },
      success: (res) => {
        clearTimeout(cloudCallTimeout);
      },
      fail: (err) => {
        clearTimeout(cloudCallTimeout);
        console.error('[products] ⚠️ 设置封禁状态失败:', err);
      }
    });

    // 🔴 异步补充位置信息（不阻塞，可选，带超时保护）
    const locationTimeout = setTimeout(() => {
    }, 8000);
    
    Promise.race([
      this._getLocationAndDeviceInfo(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('位置信息获取超时')), 8000))
    ]).then(locationData => {
      clearTimeout(locationTimeout);
      // 再次调用云函数补充位置信息（也带超时）
      const updateTimeout = setTimeout(() => {
      }, 5000);
      
      wx.cloud.callFunction({
        name: 'banUserByScreenshot',
        data: {
          type: type,
          banPage: 'products',
          ...locationData
        },
        success: (res) => {
          clearTimeout(updateTimeout);
        },
        fail: (err) => {
          clearTimeout(updateTimeout);
          console.error('[products] 补充位置信息失败:', err);
        }
      });
    }).catch((err) => {
      clearTimeout(locationTimeout);
      // 位置信息获取失败，不影响，已经设置了封禁状态
    });
  },

  _jumpToBlocked(type) {
    // 🔴 防止重复跳转
    const app = getApp();
    if (app.globalData._isJumpingToBlocked) {
      return;
    }

    // 检查当前页面是否已经是 blocked 页面
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    if (currentPage && currentPage.route === 'pages/blocked/blocked') {
      return;
    }

    app.globalData._isJumpingToBlocked = true;

    wx.reLaunch({
      url: `/pages/blocked/blocked?type=${type}`,
      success: () => {
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
  _deckTouchStartTime: 0,

  onTouchStart(e) {
    const touch = this._pickTouchClientY(e, 'start');
    if (!touch) return;
    this.touchStartY = touch.clientY;
    this._deckTouchStartTime = Date.now();
    // 每次新手势从 0 开始，避免上次未清干净的 dragOffset 叠加导致视觉「弹回」异常
    this.setData({ isDragging: true, dragOffset: 0 });
  },

  onTouchMove(e) {
    if (!this.data.isDragging) return;
    const touch = this._pickTouchClientY(e, 'move');
    if (!touch) return;
    const currentY = touch.clientY;
    const diff = currentY - this.touchStartY;

    // 1:1 跟手，限制最大滑动距离 ±300px 防止拖太远
    let restrictedDiff = diff;
    if (restrictedDiff > 300) restrictedDiff = 300;
    if (restrictedDiff < -300) restrictedDiff = -300;

    this.setData({ dragOffset: restrictedDiff });
  },

  onTouchEnd(e) {
    if (!this.data.isDragging) return;

    const touch = this._pickTouchClientY(e, 'end');
    if (!touch) {
      this.setData({ isDragging: false, dragOffset: 0 });
      return;
    }

    const endY = touch.clientY;
    const diff = endY - this.touchStartY;
    const duration = Math.max(16, Date.now() - (this._deckTouchStartTime || 0));
    const velocity = Math.abs(diff) / duration; // px/ms
    // 原固定 80px 偏大：跟手已经拖到下一张，松手仍判「未过阈值」会整叠弹回上一张
    let threshold = 56;
    if (velocity > 0.45) threshold = 28;
    else if (velocity > 0.28) threshold = 40;

    const len = this.data.list.length;
    const prev = typeof this._deckCurrentIndex === 'number' ? this._deckCurrentIndex : Number(this.data.currentIndex) || 0;
    let newIndex = prev;

    // 往上滑 (diff < 0) -> 看下面的卡片 (index变大，循环)
    if (diff < -threshold) {
      newIndex = (prev + 1) % len;
    } else if (diff > threshold) {
      newIndex = (prev - 1 + len) % len;
    }

    if (newIndex !== prev) {
      wx.vibrateShort({ type: 'light' });
    }
    this._setDeckIndex(newIndex, { isDragging: false, dragOffset: 0 });
  },

  /** 系统打断手势时复位跟手位移，避免卡在 isDragging */
  onTouchCancel() {
    if (!this.data.isDragging) return;
    this.setData({ isDragging: false, dragOffset: 0 });
  },

  onHubFeatureTap(e) {
    const numId = this._normalizeFeatureId(e.currentTarget.dataset.id);
    if (numId == null) return;
    wx.vibrateShort({ type: 'light' });
    if (!this._isFeatureEnabledForUser(numId)) {
      this._notifyFeatureClosed(numId);
      return;
    }
    if (numId === 4) {
      this._openHubShopPanel();
      return;
    }
    this.executeNavigation(numId);
  },

  /** 产品选购 / 顶栏「MT商城」：切到枢纽内商城屏 */
  _openHubShopPanel() {
    this.rememberReturnFocus(4);
    this._setHubTabIndex(1);
  },

  onHubSearchTap() {
    this.toggleDrawer();
  },

  /** 管理员：首页「产品上新」独立封面（换封面 / 清除） */
  onHubAdminCoverTap(e) {
    if (!this.data.isAuthorized) {
      wx.showToast({ title: '需要管理员权限', icon: 'none' });
      return;
    }
    const action = (e.currentTarget.dataset && e.currentTarget.dataset.action) || 'choose';
    if (action === 'clear') {
      this._adminClearHubNewCover();
      return;
    }
    this._adminChooseHubNewMedia();
  },

  _adminChooseHubNewMedia() {
    wx.chooseMedia({
      count: 9,
      mediaType: ['image', 'video'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const files = (res.tempFiles || []).filter(f => f && f.tempFilePath);
        if (!files.length) return;
        this._uploadHubNewMedia(files);
      },
      fail: (err) => {
        const msg = String((err && err.errMsg) || '');
        if (msg.indexOf('cancel') !== -1) return;
        wx.showToast({ title: '无法打开相册', icon: 'none' });
      }
    });
  },

  async _uploadHubNewMedia(files) {
    wx.showLoading({ title: '上传中', mask: true });
    try {
      const uploaded = [];
      const prevLen = (this.data.hubHomeMediaList || []).length;
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const localPath = String(f.tempFilePath || '').trim();
        const type = String(f.fileType || '').toLowerCase() === 'video' ? 'video' : 'image';
        if (!localPath) continue;
        let publicUrl = '';
        if (type === 'video') {
          publicUrl = await cosUpload.uploadVideoToCos(localPath, 'hub/home');
        } else {
          const prepared = await shopImagePrepare.prepareImageFile(localPath, 'hubHome');
          publicUrl = await cosUpload.uploadImageToCos(prepared, 'hub/home');
        }
        if (!publicUrl || !/^https?:\/\//i.test(publicUrl)) continue;
        uploaded.push({
          type,
          url: publicUrl,
          autoplay: type === 'video'
        });
      }
      if (!uploaded.length) throw new Error('upload failed');
      const merged = [...(this.data.hubHomeMediaList || []), ...uploaded].slice(0, 12);
      const cover = merged.length ? merged[0].url : '';
      const ok = await this._persistHubHomeCover(cover, merged, this.data.hubHomeMediaAutoplay);
      if (!ok) throw new Error('save failed');
      this.setData({
        hubHomeCoverFileId: cover,
        hubHomeCoverDisplay: cover,
        hubHomeMediaList: merged,
        hubHomeMediaCurrent: Math.min(prevLen, Math.max(0, merged.length - 1))
      }, () => {
        this._syncHubHomeSwiperAutoplay();
        this._rebuildHubLayout();
        wx.showToast({ title: '媒体已更新', icon: 'success' });
      });
    } catch (e) {
      const msg = String((e && e.message) || (e && e.errMsg) || '');
      wx.showToast({
        title: msg.indexOf('getCosUploadUrl') !== -1 ? '请部署 getCosUploadUrl' : '上传失败',
        icon: 'none',
        duration: 2600
      });
    } finally {
      wx.hideLoading();
    }
  },

  _adminClearHubNewCover() {
    wx.showModal({
      title: '清除首页媒体',
      content: '清除后将使用「产品上新」列表首图作为占位',
      success: async (r) => {
        if (!r.confirm) return;
        const ok = await this._persistHubHomeCover('', [], false);
        if (!ok) {
          wx.showToast({ title: '清除失败', icon: 'none' });
          return;
        }
        this.setData({
          hubHomeCoverFileId: '',
          hubHomeCoverDisplay: '',
          hubHomeMediaList: [],
          hubHomeMediaCurrent: 0,
          hubHomeMediaAutoplay: false
        }, () => {
          this._syncHubHomeSwiperAutoplay();
          this._rebuildHubLayout();
          wx.showToast({ title: '已清除', icon: 'none' });
        });
      }
    });
  },

  onHubHomeMediaSwiperChange(e) {
    const current = Number(e.detail && e.detail.current);
    if (Number.isNaN(current)) return;
    this.setData({ hubHomeMediaCurrent: current }, () => {
      this._syncHubHomeSwiperAutoplay();
    });
  },

  onHubNewCardTouchStart(e) {
    const t = e && e.touches && e.touches[0];
    if (!t) return;
    this._hubNewCardTouch = {
      x: t.clientX,
      y: t.clientY,
      at: Date.now()
    };
  },

  onHubNewCardTouchEnd(e) {
    const start = this._hubNewCardTouch;
    this._hubNewCardTouch = null;
    const t = e && e.changedTouches && e.changedTouches[0];
    if (!start || !t) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    const dt = Date.now() - start.at;
    // 小位移短按 => 视为点击；否则按滑动处理（不跳转）
    if (Math.abs(dx) <= 12 && Math.abs(dy) <= 12 && dt <= 320) {
      this.onHubFeatureTap({ currentTarget: { dataset: { id: 3 } } });
    }
  },

  onHubHomeMediaVideoEnded() {
    if (!this.data.hubHomeMediaAutoplay) return;
    const list = this.data.hubHomeMediaList || [];
    if (list.length <= 1) return;
    const current = Number(this.data.hubHomeMediaCurrent) || 0;
    const next = (current + 1) % list.length;
    this.setData({ hubHomeMediaCurrent: next }, () => {
      this._syncHubHomeSwiperAutoplay();
    });
  },

  _syncHubHomeSwiperAutoplay() {
    const list = this.data.hubHomeMediaList || [];
    const current = Number(this.data.hubHomeMediaCurrent) || 0;
    const item = list[current];
    const isVideo = !!(item && item.type === 'video');
    const autoplay = !!(this.data.hubHomeMediaAutoplay && list.length > 1 && !isVideo);
    if (autoplay !== this.data.hubHomeSwiperAutoplay) {
      this.setData({ hubHomeSwiperAutoplay: autoplay });
    }
  },

  onHubAdminMediaAddTap() {
    if (!this.data.isAuthorized || !this.data.hubShellIsAdmin) return;
    this._adminChooseHubNewMedia();
  },

  async onHubAdminMediaSortTap() {
    if (!this.data.isAuthorized || !this.data.hubShellIsAdmin) return;
    const list = Array.isArray(this.data.hubHomeMediaList) ? [...this.data.hubHomeMediaList] : [];
    if (list.length < 2) {
      this.showAutoToast('提示', '至少两张媒体才能调整顺序');
      return;
    }
    const current = Number(this.data.hubHomeMediaCurrent) || 0;
    const from = Math.max(0, Math.min(current, list.length - 1));
    const options = ['上移一位', '下移一位', '移到最前', '移到最后'];
    let tapIndex = -1;
    try {
      const res = await new Promise((resolve, reject) => {
        wx.showActionSheet({
          itemList: options,
          success: resolve,
          fail: reject
        });
      });
      tapIndex = Number(res && res.tapIndex);
    } catch (e) {
      return;
    }
    if (Number.isNaN(tapIndex) || tapIndex < 0) return;

    const item = list.splice(from, 1)[0];
    if (!item) return;
    let to = from;
    if (tapIndex === 0) {
      to = Math.max(0, from - 1);
    } else if (tapIndex === 1) {
      to = Math.min(list.length, from + 1);
    } else if (tapIndex === 2) {
      to = 0;
    } else if (tapIndex === 3) {
      to = list.length;
    }
    list.splice(to, 0, item);

    const cover = list[0] && list[0].url ? list[0].url : '';
    const ok = await this._persistHubHomeCover(cover, list, this.data.hubHomeMediaAutoplay);
    if (!ok) {
      this.showAutoToast('提示', '保存顺序失败');
      return;
    }
    this.setData({
      hubHomeMediaList: list,
      hubHomeMediaCurrent: Math.max(0, Math.min(to, list.length - 1)),
      hubHomeCoverFileId: cover,
      hubHomeCoverDisplay: cover
    }, () => {
      this._syncHubHomeSwiperAutoplay();
      this._rebuildHubLayout();
    });
    this.showAutoToast('成功', '已调整顺序');
  },

  async onHubAdminMediaAutoplayTap() {
    if (!this.data.isAuthorized || !this.data.hubShellIsAdmin) return;
    const on = !this.data.hubHomeMediaAutoplay;
    this.setData({ hubHomeMediaAutoplay: on }, () => {
      this._syncHubHomeSwiperAutoplay();
    });
    const ok = await this._persistHubHomeCover(
      this.data.hubHomeCoverFileId || (this.data.hubHomeMediaList[0] && this.data.hubHomeMediaList[0].url) || '',
      this.data.hubHomeMediaList,
      on
    );
    if (!ok) {
      this.setData({ hubHomeMediaAutoplay: !on }, () => {
        this._syncHubHomeSwiperAutoplay();
      });
      this.showAutoToast('提示', '自动切卡保存失败');
      return;
    }
    this.showAutoToast('成功', on ? '自动切卡已开启' : '自动切卡已关闭');
  },

  async onHubAdminMediaDeleteCurrent() {
    if (!this.data.isAuthorized || !this.data.hubShellIsAdmin) return;
    const list = Array.isArray(this.data.hubHomeMediaList) ? [...this.data.hubHomeMediaList] : [];
    if (!list.length) return;
    const current = Number(this.data.hubHomeMediaCurrent) || 0;
    const idx = Math.max(0, Math.min(current, list.length - 1));
    list.splice(idx, 1);
    const cover = list[0] && list[0].url ? list[0].url : '';
    const ok = await this._persistHubHomeCover(cover, list, this.data.hubHomeMediaAutoplay);
    if (!ok) {
      this.showAutoToast('提示', '删除失败');
      return;
    }
    this.setData({
      hubHomeMediaList: list,
      hubHomeMediaCurrent: Math.max(0, Math.min(idx, list.length - 1)),
      hubHomeCoverFileId: cover,
      hubHomeCoverDisplay: cover
    }, () => {
      this._syncHubHomeSwiperAutoplay();
      this._rebuildHubLayout();
    });
    this.showAutoToast('成功', '已删除当前媒体');
  },

  onHubAdminModeToggle() {
    if (!this.data.isAuthorized) return;
    const next = !this.data.hubShellIsAdmin;
    this.setData({ hubShellIsAdmin: next }, () => {
      this._syncHubPanelsAdmin(next);
      this._rebuildHubLayout();
      this.showAutoToast('提示', next ? '已进入管理员模式' : '已退出管理员模式');
    });
  },

  async onHubHomeMediaAutoplayChange(e) {
    if (!this.data.isAuthorized) return;
    const on = !!(e.detail && e.detail.value);
    this.setData({ hubHomeMediaAutoplay: on }, () => {
      this._syncHubHomeSwiperAutoplay();
    });
    const ok = await this._persistHubHomeCover(
      this.data.hubHomeCoverFileId || (this.data.hubHomeMediaList[0] && this.data.hubHomeMediaList[0].url) || '',
      this.data.hubHomeMediaList,
      on
    );
    if (!ok) {
      this.setData({ hubHomeMediaAutoplay: !on }, () => {
        this._syncHubHomeSwiperAutoplay();
      });
      wx.showToast({ title: '保存失败', icon: 'none' });
    }
  },

  onHubBannerTap() {
    wx.vibrateShort({ type: 'light' });
    if (!this._isFeatureEnabledForUser(3)) {
      this._notifyFeatureClosed(3);
      return;
    }
    this.executeNavigation(3);
  },

  // 跳转逻辑
  executeNavigation(id) {
    const numId = this._normalizeFeatureId(id);
    const open = this._resolveFeatureOpenState(numId);
    if (numId == null) return;

    if (!open) {
      this._notifyFeatureClosed(numId);
      return;
    }
    
    const app = getApp();
    const isShareCodeUser = app.globalData.isShareCodeUser || false;

    // 🔴 分享码用户：主页按钮点击直接进入安装教程
    if (isShareCodeUser) {
      wx.navigateTo({
        url: '/package-biz/pages/azjc/azjc',
        animationType: 'none',
        success: () => {
        },
        fail: (err) => {
          console.error('[products] 跳转失败:', err);
        }
      });
      return;
    }
    
    // 联系方式直接跳转
    if (numId === 8) {
      this.rememberReturnFocus(numId);
      wx.navigateTo({ 
        url: '/package-biz/pages/call/call',
        animationType: 'none',
        success: function() {
        },
        fail: (err) => {
          this.showAutoToast('提示', '跳转失败: ' + JSON.stringify(err));
        }
      });
      return;
    }

    // 🔴 安装教程：跳转前进行权限检查
    if (numId === 7) {
      this.checkTutorialAccess();
      return;
    }

    let target = '';
    // 根据 ID 匹配跳转路径
    switch (numId) {
      case 3: target = '/package-biz/pages/pagenew/pagenew'; break; // 产品上新
      case 4: // 产品选购 → 商城（顶栏「MT商城」同路径，横向切屏）
        this._openHubShopPanel();
        return;
      case 10: target = '/package-app/pages/case/case'; break;      // 案例展示
      case 5: target = '/package-biz/pages/paihang/paihang'; break; // 排行榜单
      case 1: target = '/package-app/pages/scan/scan'; break;       // 控制中心
      case 9: target = '/package-biz/pages/ota/ota'; break;         // OTA升级
      case 6: target = '/package-biz/pages/shouhou/shouhou'; break; // 维修中心
      case 12: target = '/package-biz/pages/home/home'; break;       // 附近门店
      case 13: target = '/package-app/pages/faq/faq'; break;         // 常见问题
      case 2: target = '/package-app/pages/profile/profile'; break;
      // 其他待开发...
      default: target = ''; break;
    }
    
    if (target) {
      this.rememberReturnFocus(numId);
      wx.navigateTo({
        url: target,
        animationType: 'none',
        fail: (err) => {
          console.error('[products] navigateTo fail:', target, err);
          this.showAutoToast('提示', '页面打开失败，请稍后重试');
        }
      });
    } else {
      this.showAutoToast('提示', '该功能暂未开放');
    }
  },

  // 🔴 检查安装教程访问权限（异步；须与离页/重复点击协调，避免晚回调再写 return_focus 把卡片打回上一张）
  async checkTutorialAccess() {
    const gen = (this._tutorialCheckGen = (this._tutorialCheckGen || 0) + 1);
    const startLife = this._productsLifeSeq || 0;
    const stillOk = () =>
      gen === this._tutorialCheckGen && (this._productsLifeSeq || 0) === startLife;

    this.showMyLoading('验证权限中...');

    try {
      if (!stillOk()) {
        this.hideMyLoading();
        return;
      }

      const db = wx.cloud.database();
      const _ = db.command;

      // 1. 获取当前用户 openid
      const { result: { openid } } = await wx.cloud.callFunction({ name: 'login' });
      if (!stillOk()) {
        this.hideMyLoading();
        return;
      }

      // 2. 检查管理员
      let adminCheck = await db.collection('guanliyuan').where({ openid: openid }).count();
      if (adminCheck.total === 0) {
        adminCheck = await db.collection('guanliyuan').where({ _openid: openid }).count();
      }
      if (!stillOk()) {
        this.hideMyLoading();
        return;
      }

      if (adminCheck.total > 0) {
        // 是管理员：直接放行
        this.hideMyLoading();
        if (!stillOk()) return;
        this.rememberReturnFocus(7);
        wx.navigateTo({ url: '/package-biz/pages/azjc/azjc', animationType: 'none' });
        return;
      }

      // 3. 检查是否有订单（任何状态的订单）
      const allOrdersRes = await db.collection('shop_orders').where({
        _openid: openid
      }).get();
      if (!stillOk()) {
        this.hideMyLoading();
        return;
      }

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

      if (!stillOk()) {
        this.hideMyLoading();
        return;
      }

      const hasDevice = deviceCheck1.total > 0 || deviceCheck2.total > 0;
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
      // 🔴 新逻辑（修复）：
      // 1. 如果绑定了设备（不管有没有订单或订单状态）-> 直接放行
      if (hasDevice) {
        this.hideMyLoading();
        if (!stillOk()) return;
        this.rememberReturnFocus(7);
        wx.navigateTo({ url: '/package-biz/pages/azjc/azjc', animationType: 'none' });
        return;
      }

      // 2. 🔴 关键修复：如果有已确认收货的订单 -> 直接放行（不需要绑定设备）
      if (confirmedOrders.length > 0) {
        this.hideMyLoading();
        if (!stillOk()) return;
        this.rememberReturnFocus(7);
        wx.navigateTo({ url: '/package-biz/pages/azjc/azjc', animationType: 'none' });
        return;
      }

      // 3. 如果有未确认收货的订单 -> 提示先确认收货
      if (realPendingOrders.length > 0) {
        this.hideMyLoading();
        if (!stillOk()) return;
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
        this.hideMyLoading();
        if (!stillOk()) return;
        this._showCustomModal({
          title: '提示',
          content: '请前往个人中心-我的订单\n确认收货后解锁教程',
          showCancel: false,
          confirmText: '知道了'
        });
        return;
      }

      // 5. 其他情况（理论上不应该到这里，但保留兜底逻辑）
      this.hideMyLoading();
      if (!stillOk()) return;
      this._showCustomModal({
        title: '提示',
        content: '请前往个人中心-我的订单\n确认收货后解锁教程',
        showCancel: false,
        confirmText: '知道了'
      });

    } catch (err) {
      console.error('权限检查异常', err);
      this.hideMyLoading();
      if (!stillOk()) return;
      this._showCustomModal({
        title: '提示',
        content: '权限验证失败，请重试',
        showCancel: false,
        confirmText: '知道了'
      });
    }
  },
  
  // 🔴 计算导航栏高度（标准方法，适配所有机型）
  calcNavBarInfo() {
    try {
      const menuButton = wx.getMenuButtonBoundingClientRect();
      const windowInfo = wx.getWindowInfo();
      const statusBarHeight = windowInfo.statusBarHeight || 44;
      const gap = menuButton.top - statusBarHeight;
      const navBarHeight = (gap * 2) + menuButton.height;
      const rpx = (windowInfo.windowWidth || 375) / 750;
      const segmentBodyPx = Math.round((128 + 28) * rpx);
      const hubShopLayerTop = statusBarHeight + segmentBodyPx;
      const adminBarPx = this.data.isAuthorized ? Math.round(72 * rpx) : 0;
      const hubShopEmbedScrollHeight = Math.max(
        320,
        Math.floor((windowInfo.windowHeight || 667) - hubShopLayerTop - adminBarPx)
      );
      this.setData({
        statusBarHeight,
        navBarHeight,
        hubShopLayerTop,
        hubShopEmbedScrollHeight
      });
    } catch (e) {
      this.setData({
        statusBarHeight: 44,
        navBarHeight: 44,
        hubShopLayerTop: 88,
        hubShopEmbedScrollHeight: 560
      });
    }
  },

  _updateHubShopEmbedScrollHeight() {
    try {
      const win = wx.getWindowInfo();
      const rpx = (win.windowWidth || 375) / 750;
      const top = this.data.hubShopLayerTop || 88;
      const adminBarPx = this.data.isAuthorized ? Math.round(72 * rpx) : 0;
      const h = Math.max(320, Math.floor((win.windowHeight || 667) - top - adminBarPx));
      if (h !== this.data.hubShopEmbedScrollHeight) {
        this.setData({ hubShopEmbedScrollHeight: h });
      }
    } catch (e) {}
  },
  
  goBack() {
    const hubNav = require('../../../utils/hubNav.js');
    hubNav.goHome();
  },

  onHubSegmentSwitch(e) {
    const segment = e.detail && e.detail.segment;
    if (!segment) return;
    wx.vibrateShort({ type: 'light' });
    if (segment === 'home') {
      this._setHubTabIndex(0);
      return;
    }
    if (segment === 'shop') {
      if (!this._isFeatureEnabledForUser(4)) {
        this._notifyFeatureClosed(4);
        return;
      }
      this._openHubShopPanel();
    }
  },

  _syncHubPanelsAuth() {
    const authorized = !!this.data.isAuthorized;
    ['#hubShopPanel', '#hubOrdersPanel', '#hubProfilePanel'].forEach((sel) => {
      const panel = this.selectComponent(sel);
      if (panel && typeof panel.setData === 'function') {
        panel.setData({ isAuthorized: authorized, shellAuthorized: authorized });
      }
    });
    this._updateHubShopEmbedScrollHeight();
  },

  _syncHubPanelsAdmin(isAdmin) {
    const admin = !!isAdmin;
    ['#hubShopPanel', '#hubOrdersPanel', '#hubProfilePanel'].forEach((sel) => {
      const panel = this.selectComponent(sel);
      if (panel && typeof panel.setData === 'function') {
        panel.setData({ isAdmin: admin, shellAdmin: admin });
      }
    });
  },

  onHubAdminChange(e) {
    const isAdmin = !!(e.detail && e.detail.isAdmin);
    this.setData({ hubShellIsAdmin: isAdmin }, () => {
      this._syncHubPanelsAdmin(isAdmin);
      this._rebuildHubLayout();
    });
  },

  _refreshHubPanel(tabIndex) {
    if (tabIndex === 1) {
      this._updateHubShopEmbedScrollHeight();
      return;
    }
    const sel = tabIndex === 2 ? '#hubOrdersPanel' : tabIndex === 3 ? '#hubProfilePanel' : '';
    if (!sel) return;
    const panel = this.selectComponent(sel);
    if (!panel) return;
    if (tabIndex === 2 && typeof panel.loadMyOrdersPromise === 'function') {
      panel.loadMyOrdersPromise().catch(() => {});
      if (typeof panel.loadHubCartFromCache === 'function') {
        panel.loadHubCartFromCache();
      }
      return;
    }
    if (tabIndex === 3 && typeof panel.loadMyActivitiesPromise === 'function') {
      panel.loadMyActivitiesPromise().catch(() => {});
      return;
    }
    if (typeof panel.onShow === 'function') {
      panel.onShow();
    }
  },

  _refreshHubCartBadge() {
    let count = 0;
    try {
      const cart = wx.getStorageSync('my_cart') || [];
      count = Array.isArray(cart) ? cart.length : 0;
    } catch (e) {}
    if (count !== this.data.hubCartBadge) {
      this.setData({ hubCartBadge: count });
    }
  },

  onHubHomeCartTap() {
    this._setHubTabIndex(2);
  },

  _dismissHubShopOverlays() {
    try {
      const shop = this.selectComponent('#hubShopPanel');
      if (!shop || typeof shop._dismissShopOverlaysAfterPay !== 'function') return;
      shop._dismissShopOverlaysAfterPay();
    } catch (e) {}
  },

  _setHubTabIndex(idx) {
    if (idx == null) return;
    const expectedPct = idx * 25;
    const curPct = this.data.hubTrackTranslatePct || 0;
    if (idx === this.data.hubTabIndex && expectedPct === curPct) return;
    if (idx >= 2) {
      this._dismissHubShopOverlays();
    }
    const hubBottomBarIndex = idx <= 1 ? 0 : idx - 1;
    const prevTrackPct = this.data.hubTrackTranslatePct || 0;
    const hubTrackTranslatePct = idx * 25;
    const trackMoves = prevTrackPct !== hubTrackTranslatePct;
    const contentPatch = {
      hubTabIndex: idx,
      hubTrackTranslatePct,
      hubBottomBarIndex,
      showHubTabBar: idx !== 1
    };
    if (idx === 0) {
      this._refreshHubCartBadge();
    }
    /* 仅离开订单/我的时关闭管理模式；进入订单 Tab 不再强制关掉，避免「管理」点了又被重置 */
    if (idx === 0 || idx === 1) {
      contentPatch.hubShellIsAdmin = false;
    }
    if (idx === 1) contentPatch.hubShopMounted = true;
    if (idx === 2) contentPatch.hubOrdersMounted = true;
    if (idx === 3) contentPatch.hubProfileMounted = true;

    const afterContent = () => {
      if (idx === 0 || idx === 1) {
        this._syncHubPanelsAdmin(false);
      }
      const delay = trackMoves ? 340 : 0;
      setTimeout(() => {
        if (idx >= 1 && idx <= 3) this._refreshHubPanel(idx);
      }, delay);
    };

    const clearAnimTimer = () => {
      if (this._hubPanelsAnimTimer) clearTimeout(this._hubPanelsAnimTimer);
      this._hubPanelsAnimTimer = setTimeout(() => {
        this.setData({ hubPanelsAnim: false });
        this._hubPanelsAnimTimer = null;
      }, 360);
    };

    /* 先挂上 transition 类，下一帧再改 translate，横滑动画才能生效 */
    if (trackMoves) {
      this.setData({ hubPanelsAnim: true }, () => {
        wx.nextTick(() => {
          this.setData(contentPatch, afterContent);
        });
      });
      clearAnimTimer();
      return;
    }

    this.setData({ ...contentPatch, hubPanelsAnim: false }, afterContent);
  },

  onHubTabSwitch(e) {
    const tab = e.detail && e.detail.tab;
    if (!tab) return;
    const map = { home: 0, orders: 2, profile: 3 };
    const idx = map[tab];
    if (idx == null) return;
    this._setHubTabIndex(idx);
  },

  onHubShellModal(e) {
    const open = !!(e.detail && e.detail.open);
    if (this.data.hubShellModalOpen !== open) {
      this.setData({ hubShellModalOpen: open });
    }
  },

  onHubPanelsTouchStart(e) {
    if (this.data.hubTabIndex !== 0) return;
    const t = e.touches && e.touches[0];
    if (!t) return;
    this._hubTouchStartX = t.clientX;
    this._hubTouchStartY = t.clientY;
  },

  onHubPanelsTouchEnd(e) {
    const cur = this.data.hubTabIndex;
    // 仅首页支持横滑切面板，订单/我的一律禁用，避免误触
    if (cur !== 0) return;
    const t = e.changedTouches && e.changedTouches[0];
    if (!t || this._hubTouchStartX == null) return;
    const dx = t.clientX - this._hubTouchStartX;
    const dy = t.clientY - (this._hubTouchStartY || 0);
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0 && cur < 3) {
      this._setHubTabIndex(cur + 1);
    } else if (dx > 0 && cur > 0) {
      this._setHubTabIndex(cur - 1);
    }
  },
  
  // 【新增】自动消失提示（无按钮，3秒后自动消失）
  // 空函数，用于阻止事件冒泡和滚动
  noop() {},

  // 【新增】检查是否有未完成的寄回订单
  async checkUnfinishedReturn() {
    const now = Date.now();
    if (this._lastUnfinishedReturnCheckAt && (now - this._lastUnfinishedReturnCheckAt < 15 * 1000)) {
      return;
    }
    this._lastUnfinishedReturnCheckAt = now;
    try {
      const db = wx.cloud.database();
      const { result: { openid } } = await wx.cloud.callFunction({ name: 'login' });
      db.collection('shouhou_repair')
      .where({
        needReturn: true,
        _openid: openid
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
                  url: '/package-app/pages/profile/profile',
                  animationType: 'none',
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
        const msg = (err.errMsg || err.message || '') + '';
        if (msg.indexOf('access_token') !== -1) {
          return;
        }
        console.error('检查寄回订单失败:', err);
        // 检查失败不显示错误，避免影响用户体验
      });
    } catch (err) {
      console.error('检查寄回订单失败:', err);
    }
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
        wx.showModal(options);
      }
    };
    tryShow();
  },

  // ================= 底部抽屉交互 =================

  // 切换抽屉状态
  toggleDrawer() {
    const willOpen = !this.data.isDrawerOpen;
    this.setData({ isDrawerOpen: willOpen });
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

  // 抽屉内点击：直接进入对应功能
  onFunctionTap(e) {
    const id = this._normalizeFeatureId(e.currentTarget.dataset.id);
    wx.vibrateShort({ type: 'light' });

    if (id == null) return;

    if (!this._isFeatureEnabledForUser(id)) {
      this._notifyFeatureClosed(id);
      return;
    }

    this.closeDrawer();
    this.executeNavigation(id);
  },

  // 快捷栏定位：自动滑到对应卡片（不立即跳转）
  focusCardById(id) {
    const list = this.data.list || [];
    if (!list.length) return;

    const targetIndex = list.findIndex(item => Number(item.id) === Number(id));
    if (targetIndex < 0) return;

    const currentIndex = typeof this._deckCurrentIndex === 'number'
      ? this._deckCurrentIndex
      : (Number(this.data.currentIndex) || 0);
    if (currentIndex === targetIndex) return;

    // 若已存在定位动画，先清理
    if (this._focusCardTimer) {
      clearInterval(this._focusCardTimer);
      this._focusCardTimer = null;
    }

    // 循环列表，选择最短方向移动，做出“快速自动滑动”效果
    const len = list.length;
    const forwardSteps = (targetIndex - currentIndex + len) % len;
    const backwardSteps = (currentIndex - targetIndex + len) % len;
    const step = forwardSteps <= backwardSteps ? 1 : -1;
    let idx = currentIndex;

    this._focusCardTimer = setInterval(() => {
      idx = (idx + step + len) % len;
      this._deckCurrentIndex = idx;
      this.setData({ currentIndex: idx });

      if (idx === targetIndex) {
        clearInterval(this._focusCardTimer);
        this._focusCardTimer = null;
      }
    }, 70);
  },

  onBackPress() {
    if (this.data.showNewArrivalModal && !this.data.newArrivalClosing) {
      this.closeNewArrivalModal();
      return true;
    }
    if (this.data.hubTabIndex && this.data.hubTabIndex !== 0) {
      this._setHubTabIndex(0);
      return true;
    }
    const pageBack = require('../../../utils/pageBack.js');
    pageBack.popOrHub();
    return true;
  }
});
