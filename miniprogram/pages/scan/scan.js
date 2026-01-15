// patched by assistant
// pages/scan/scan.js

// ==========================================
// 1. 定义 Base64 图标资源 (确保稳定显示)
// ==========================================
const iconLock = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMxQzFDMUUiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cmVjdCB4PSIzIiB5PSIxMSIgd2lkdGg9IjE4IiBoZWlnaHQ9IjExIiByeD0iMiIgcnk9IjIiPjwvcmVjdD48cGF0aCBkPSJNNyAxMVY3YTUgNSAwIDAgMSAxMCAwdjQiPjwvcGF0aD48L3N2Zz4=';

// 箭头 (打开)
const iconArrowUp = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMxQzFDMUUiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMTggMTUgMTIgOSA2IDE1Ii8+PC9zdmc+';

// 校准 (水平线+箭头)
const iconCali = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMxRDFEMUYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMjEgMTJhOSA5IDAgMCAwLTktOSA5Ljc1IDkuNzUgMCAwIDAtNi43NCAyLjc0TDMgOCIvPjxwYXRoIGQ9Ik0zIDN2NWg1Ii8+PHBhdGggZD0iTTMgMTJhOSA5IDAgMCAwIDkgOSA5Ljc1IDkuNzUgMCAwIDAgNi43NC0yLjc0TDIxIDE2Ii8+PHBhdGggZD0iTTE2IDIxaDV2LTUiLz48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIyIiBmaWxsPSIjMUQxRDFGIiBzdHJva2U9Im5vbmUiLz48L3N2Zz4=';

// 设置 (简约齿轮)
const iconGear = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMxRDFEMUYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMTIuMjIgMkgxMS43OEEyIDIgMCAwIDAgOS43OCA0LjE4VjQuMzZBMiAyIDAgMCAxIDguNzggNi4wOUw4LjM1IDYuMzRBMiAyIDAgMCAxIDYuMzUgNi4zNEw2LjIgNi4yNkEyIDIgMCAwIDAgMy40NyA2Ljk5TDMuMjUgNy4zN0EyIDIgMCAwIDAgMy45OCAxMC4xTDQuMTMgMTAuMkEyIDIgMCAwIDEgNS4xMyAxMS45MlYxMi40M0EyIDIgMCAwIDEgNC4xMyAxNC4xNUwzLjk4IDE0LjI1QTIgMiAwIDAgMCAzLjI1IDE2Ljk4TDMuNDcgMTcuMzZBMiAyIDAgMCAwIDYuMiAxOC4wOUw2LjM1IDE4LjAxQTIgMiAwIDAgMSA4LjM1IDE4LjAxTDguNzggMTguMjZBMiAyIDAgMCAxIDkuNzggMTkuOThWMjAuMTZBMiAyIDAgMCAwIDExLjc4IDIySDEyLjIyQTIgMiAwIDAgMCAxNC4yMiAxOS44MlYxOS42NGEyIDIgMCAwIDEgMS0xLjczTDE1LjY1IDE3LjY2QTIgMiAwIDAgMSAxNy42NSAxNy42NkwxNy44IDE3Ljc0QTIgMiAwIDAgMCAyMC41MyAxNy4wMUwyMC43NSAxNi42M0EyIDIgMCAwIDAgMjAuMDIgMTMuOUwyMC43NSAxNi42M0EyIDIgMCAwIDAgMjAuMDIgMTMuOUwyMC4xMyAxMy44QTIgMiAwIDAgMSAxOS4xMyAxMi4wOFYxMS41N0EyIDIgMCAwIDEgMjAuMTMgOS44NUwyMC4yOCA5Ljc1QTIgMiAwIDAgMCAyMS4wMSA3LjAyTDIwLjc5IDYuNjRBMiAyIDAgMCAwIDE4LjA2IDUuOTFMMTcuOTEgNi4wMUEyIDIgMCAwIDEgMTUuOTEgNC4yOUwxNS40OCA0LjA0QTIgMiAwIDAgMSAxNC40OCAyLjMyVjIuMTRBMiAyIDAgMCAwIDEyLjIyIDJaIi8+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMyIvPjwvc3ZnPg==';

// 蓝牙小图标 (白色)
const iconBtSmall = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cG9seWxpbmUgcG9pbnRzPSI2LjUgNi41IDE3LjUgMTcuNSAxMiAyMyAxMiAxIDE3LjUgNi41IDYuNSAxNy41Ij48L3BvbHlsaW5lPjwvc3ZnPg==';

// 重置图标 (圆形箭头)
const iconReset = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMxQzFDMUUiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMyAxMkExMiAxMiAwIDAgMSAxNSA0LjA0VjFhMSAxIDAgMCAxIDEuNzA3LS43MDdsNCA0YTEgMSAwIDAgMSAwIDEuNDE0bC00IDRhMSAxIDAgMCAxLTEuNzA3LS43MDdWOC4wNEE5IDkgMCAwIDAgMyAxMkgzWiIvPjxwYXRoIGQ9Ik0yMSAxMkE5IDkgMCAwIDAgOSA4LjA0VjExYTEgMSAwIDAgMS0xLjcwNy43MDdsLTQtNGExIDEgMCAwIDEgMC0xLjQxNGw0LTRhMSAxIDAgMCAxIDEuNzA3LjcwN1Y0LjA0QTEyIDEyIDAgMCAxIDIxIDEySDIxWiIvPjwvc3ZnPg==';

// 小齿轮图标 (用于高级设置)
const iconGearSmall = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMxQzFDMUUiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIyLjUiLz48cGF0aCBkPSJNMTIuNzUgNS41YTEuNzUgMS43NSAwIDAgMSAxLjUgMHYxLjVhMS43NSAxLjc1IDAgMCAxLTEuNSAwdi0xLjVaIi8+PHBhdGggZD0iTTE4LjUgMTJhMS43NSAxLjc1IDAgMCAxLTEuNSAxLjV2MS41YTEuNzUgMS43NSAwIDAgMSAxLjUgMHYtMS41WiIvPjxwYXRoIGQ9Ik0xMS4yNSAxOC41YTEuNzUgMS43NSAwIDAgMSAxLjUgMHYxLjVhMS43NSAxLjc1IDAgMCAxLTEuNSAwdi0xLjVaIi8+PHBhdGggZD0iTTUuNSAxMmExLjc1IDEuNzUgMCAwIDEgMS41LTEuNVY5YTEuNzUgMS43NSAwIDAgMS0xLjUgMHYxLjVaIi8+PHBhdGggZD0iTTEyLjc1IDE4LjVhMS43NSAxLjc1IDAgMCAxIDEuNSAwdjEuNWExLjc1IDEuNzUgMCAwIDEtMS41IDB2LTEuNVoiLz48cGF0aCBkPSJNNS41IDEyYTEuNzUgMS43NSAwIDAgMSAxLjUgMS41VjE1YTEuNzUgMS43NSAwIDAgMS0xLjUgMHYtMS41WiIvPjxwYXRoIGQ9Ik0xOC41IDEyYTEuNzUgMS43NSAwIDAgMS0xLjUtMS41VjlhMS43NSAxLjc1IDAgMCAxIDEuNSAwdjEuNVoiLz48L3N2Zz4=';

// 连接图标 (主页大胶囊用)
const iconConnect = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTUgN0gxN0MyMC4zMTM3IDcgMjMgOS42ODYyOSAyMyAxM0MyMyAxNi4zMTM3IDIwLjMxMzcgMTkgMTcgMTlIMTVNOCAxN0g2QzIuNjg2MjkgMTcgMCAxNC4zMTM3IDAgMTNDMCA5LjY4NjI5IDIuNjg2MjkgNyA2IDdIOE04IDEzSDE2IiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMi41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48L3N2Zz4=';

// 侧边图标 (折叠动画用)
const iconSide = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE0MCIgdmlld0JveD0iMCAwIDIwMCAxNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgICA8IS0tIExlZnQgU3RpY2sgLS0+CiAgICA8cmVjdCB4PSI4NSIgeT0iMjAiIHdpZHRoPSIxMiIgaGVpZ2h0PSIxMDAiIHJ4PSI2IiBmaWxsPSIjMUMxQzFFIiAvPgogICAgPCEtLSBSaWdodCBTdGljayAtLT4KICAgIDxyZWN0IHg9IjEwNSIgeT0iMjAiIHdpZHRoPSIxMiIgaGVpZ2h0PSIxMDAiIHJ4PSI2IiBmaWxsPSIjMUMxQzFFIiAvPgo8L3N2Zz4=';

// ==========================================
// 2. 设备模型资源 (F1/F2 Pro/Max)
// ==========================================
const iconF1Pro = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE0MCIgdmlld0JveD0iMCAwIDIwMCAxNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3QgeD0iMjUiIHk9IjMwIiB3aWR0aD0iMTUwIiBoZWlnaHQ9IjkwIiByeD0iMTIiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzFDMUMxRSIgc3Ryb2tlLXdpZHRoPSI0Ii8+PHJlY3QgeD0iNDUiIHk9IjQ1IiB3aWR0aD0iMzUiIGhlaWdodD0iOCIgcng9IjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzFDMUMxRSIgc3Ryb2tlLXdpZHRoPSIzIi8+PHJlY3QgeD0iMTIwIiB5PSI0NSIgd2lkdGg9IjM1IiBoZWlnaHQ9IjgiIHJ4PSI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMxQzFDMUUiIHN0cm9rZS13aWR0aD0iMyIvPjx0ZXh0IHg9IjEwMCIgeT0iOTAiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC13ZWlnaHQ9IjkwMCIgZm9udC1zaXplPSIyNCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgZmlsbD0iIzFDMUMxRSIgbGV0dGVyLXNwYWNpbmc9IjMiPk1UPC90ZXh0Pjwvc3ZnPg==';
const iconF1Max = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE0MCIgdmlld0JveD0iMCAwIDIwMCAxNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3QgeD0iMjUiIHk9IjMwIiB3aWR0aD0iMTUwIiBoZWlnaHQ9IjkwIiByeD0iMTIiIGZpbGw9IiMxQzFDMUUiLz48cmVjdCB4PSI0NSIgeT0iNDUiIHdpZHRoPSIzNSIgaGVpZ2h0PSI4IiByeD0iNCIgZmlsbD0iI0ZGRkZGRiIvPjxyZWN0IHg9IjEyMCIgeT0iNDUiIHdpZHRoPSIzNSIgaGVpZ2h0PSI4IiByeD0iNCIgZmlsbD0iI0ZGRkZGRiIvPjx0ZXh0IHg9IjEwMCIgeT0iOTAiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC13ZWlnaHQ9IjkwMCIgZm9udC1zaXplPSIyNCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgZmlsbD0iI0ZGRkZGRiIgbGV0dGVyLXNwYWNpbmc9IjMiPk1UPC90ZXh0Pjwvc3ZnPg==';
const iconF2Pro = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE0MCIgdmlld0JveD0iMCAwIDIwMCAxNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTE1IDMwIEgxOTAgQzE5NSAzMCAxOTUgMzUgMTk1IDM1IFY0OCBDMTk1IDUzIDE5MCA1MyAxOTAgNTMgSDEyMSBWNjkgSDEyMi41IEMxMjcuNSA2OSAxMjcuNSA3NCAxMjcuNSA3NCBWOTQgQzEyNy41IDk5IDEyMi41IDk5IDEyMi41IDk5IEg4Mi41IEM3Ny41IDk5IDc3LjUgOTQgNzcuNSA5NCBWNzQgQzc3LjUgNjkgODIuNSA2OSA4Mi41IDY5IEg4NCBWNTMgSDE1IEMxMCA1MyAxMCA0OCAxMCA0OCBWMzUgQzEwIDMwIDE1IDMwIDE1IDMwIFoiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzFDMUMxRSIgc3Ryb2tlLXdpZHRoPSIzIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PHJlY3QgeD0iMzYiIHk9IjM3IiB3aWR0aD0iMjYiIGhlaWdodD0iOCIgcng9IjUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzFDMUMxRSIgc3Ryb2tlLXdpZHRoPSIzIi8+PHJlY3QgeD0iMTQ1IiB5PSIzOCIgd2lkdGg9IjI1IiBoZWlnaHQ9IjgiIHJ4PSI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMxQzFDMUUiIHN0cm9rZS13aWR0aD0iMyIvPjx0ZXh0IHg9IjEwMi41IiB5PSI3MiIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXdlaWdodD0iOTAwIiBmb250LXNpemU9IjE0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjMUMxQzFFIj48dHNwYW4geD0iMTAyLjUiIGR5PSIwIj5NPC90c3Bhbj48dHNwYW4geD0iMTAyLjUiIGR5PSIxNiI+VDwvdHNwYW4+PC90ZXh0Pjwvc3ZnPg==';
const iconF2Max = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE0MCIgdmlld0JveD0iMCAwIDIwMCAxNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTE1IDMwIEgxOTAgQzE5NSAzMCAxOTUgMzUgMTk1IDM1IFY0OCBDMTk1IDUzIDE5MCA1MyAxOTAgNTMgSDEyMSBWNjkgSDEyMi41IEMxMjcuNSA2OSAxMjcuNSA3NCAxMjcuNSA3NCBWOTQgQzEyNy41IDk5IDEyMi41IDk5IDEyMi41IDk5IEg4Mi41IEM3Ny41IDk5IDc3LjUgOTQgNzcuNSA5NCBWNzQgQzc3LjUgNjkgODIuNSA2OSA4Mi41IDY5IEg4NCBWNTMgSDE1IEMxMCA1MyAxMCA0OCAxMCA0OCBWMzUgQzEwIDMwIDE1IDMwIDE1IDMwIFoiIGZpbGw9IiMxQzFDMUUiLz48cmVjdCB4PSIzNiIgeT0iMzciIHdpZHRoPSIyNiIgaGVpZ2h0PSI4IiByeD0iNSIgZmlsbD0iI0ZGRkZGRiIvPjxyZWN0IHg9IjE0NSIgeT0iMzgiIHdpZHRoPSIyNSIgaGVpZ2h0PSI4IiByeD0iNCIgZmlsbD0iI0ZGRkZGRiIvPjx0ZXh0IHg9IjEwMi41IiB5PSI3MiIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXdlaWdodD0iOTAwIiBmb250LXNpemU9IjE0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjRkZGRkZGIj48dHNwYW4geD0iMTAyLjUiIGR5PSIwIj5NPC90c3Bhbj48dHNwYW4geD0iMTAyLjUiIGR5PSIxNiI+VDwvdHNwYW4+PC90ZXh0Pjwvc3ZnPg==';
// F2 PRO Long 图标（独立）
const iconF2ProLong = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTE1IDI5SDE5MEMxOTUgMjkgMTk1IDM0LjE0NjQgMTk1IDM0LjE0NjRWNDcuNTI2OUMxOTUgNTIuNjczMiAxOTAgNTIuNjczMiAxOTAgNTIuNjczMkgxMjFWMTEwLjVIMTIyLjVDMTMwLjg0NSAxMTAuNSAxMzAuODQ1IDExNy40NiAxMzAuODQ1IDExNy40NlYxMzcuNzI5QzEzMC44NDUgMTQ0LjUgMTIyLjUgMTQ0LjUgMTIyLjUgMTQ0LjVIODIuNUM3NC4xNTQ1IDE0NC41IDc0LjE1NDUgMTM3LjcyOSA3NC4xNTQ1IDEzNy43MjlWMTE3LjQ2Qzc0LjE1NDUgMTEwLjUgODIuNSAxMTAuNSA4Mi41IDExMC41VjUyLjY3MzJIMTVDMTAgNTIuNjczMiAxMCA0Ny41MjY5IDEwIDQ3LjUyNjlWMzQuMTQ2NEMxMCAyOSAxNSAyOSAxNSAyOVoiIHN0cm9rZT0iIzFDMUMxRSIgc3Ryb2tlLXdpZHRoPSIzIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PHBhdGggZD0iTTU2IDM3SDQwQzM3LjIzODYgMzcgMzUgMzguNzkwOSAzNSA0MUMzNSA0My4yMDkxIDM3LjIzODYgNDUgNDAgNDVINTZDNTguNzYxNCA0NSA2MSA0My4yMDkxIDYxIDQxQzYxIDM4Ljc5MDkgNTguNzYxNCAzNyA1NiAzN1oiIHN0cm9rZT0iIzFDMUMxRSIgc3Ryb2tlLXdpZHRoPSIzIi8+PHBhdGggZD0iTTE2NSAzN0gxNDlDMTQ2LjIzOSAzNyAxNDQgMzguNzkwOSAxNDQgNDFDMTQ0IDQzLjIwOTEgMTQ2LjIzOSA0NSAxNDkgNDVIMTY1QzE2Ny43NjEgNDUgMTcwIDQzLjIwOTEgMTcwIDQxQzE3MCAzOC43OTA5IDE2Ny43NjEgMzcgMTY1IDM3WiIgc3Ryb2tlPSIjMUMxQzFFIiBzdHJva2Utd2lkdGg9IjMiLz48cGF0aCBkPSJNODQgODdIMTIxIiBzdHJva2U9IiMxQzFDMUUiIHN0cm9rZS13aWR0aD0iMi41IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz48cGF0aCBkPSJNMTAyLjUgNjRDMTA0LjQzMyA2NCAxMDYgNjIuNDMzIDEwNiA2MC41QzEwNiA1OC41NjcgMTA0LjQzMyA1NyAxMDIuNSA1N0MxMDAuNTY3IDU3IDk5IDU4LjU2NyA5OSA2MC41Qzk5IDYyLjQzMyAxMDAuNTY3IDY0IDEwMi41IDY0WiIgc3Ryb2tlPSIjMUMxQzFFIiBzdHJva2Utd2lkdGg9IjIiLz48cGF0aCBkPSJNMTAyLjUgODJDMTA0LjQzMyA4MiAxMDYgODAuNDMzIDEwNiA3OC41QzEwNiA3Ni41NjcgMTA0LjQzMyA3NSAxMDIuNSA3NUMxMDAuNTY3IDc1IDk5IDc2LjU2NyA5OSA3OC41Qzk5IDgwLjQzMyAxMDAuNTY3IDgyIDEwMi41IDgyWiIgc3Ryb2tlPSIjMUMxQzFFIiBzdHJva2Utd2lkdGg9IjIiLz48cGF0aCBkPSJNMTAyLjUgMTAxQzEwNC40MzMgMTAxIDEwNiA5OS40MzMgMTA2IDk3LjVDMTA2IDk1LjU2NyAxMDQuNDMzIDk0IDEwMi41IDk0QzEwMC41NjcgOTQgOTkgOTUuNTY3IDk5IDk3LjVDOTkgOTkuNDMzIDEwMC41NjcgMTAxIDEwMi41IDEwMVoiIHN0cm9rZT0iIzFDMUMxRSIgc3Ryb2tlLXdpZHRoPSIyIi8+PHBhdGggZD0iTTkwLjMzOTggMTE5LjA5MUg5My4xODQyTDk2LjE4ODUgMTI2LjQySDk2LjMxNjNMOTkuMzIwNiAxMTkuMDkxSDEwMi4xNjVWMTMwSDk5LjkyNzhWMTIyLjlIOTkuODM3M0w5Ny4wMTQxIDEyOS45NDdIOTUuNDkwN0w5Mi42Njc1IDEyMi44NzNIOTIuNTc3VjEzMEg5MC4zMzk4VjExOS4wOTFaTTEwNy4xMjIgMTIwLjk5M1YxMTkuMDkxSDExNi4wODFWMTIwLjk5M0gxMTIuNzQxVjEzMEgxMTAuNDYxVjEyMC45OTNIMTA3LjEyMloiIGZpbGw9IiMxQzFDMUUiLz48L3N2Zz4=';
// F2 MAX Long 图标（独立）
const iconF2MaxLong = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTE1IDI5SDE5MEMxOTUgMjkgMTk1IDM0LjE0NjQgMTk1IDM0LjE0NjRWNDcuNTI2OUMxOTUgNTIuNjczMiAxOTAgNTIuNjczMiAxOTAgNTIuNjczMkgxMjFWMTEwLjVIMTIyLjVDMTMwLjg0NSAxMTAuNSAxMzAuODQ1IDExNy40NiAxMzAuODQ1IDExNy40NlYxMzcuNzI5QzEzMC44NDUgMTQ0LjUgMTIyLjUgMTQ0LjUgMTIyLjUgMTQ0LjVIODIuNUM3NC4xNTQ1IDE0NC41IDc0LjE1NDUgMTM3LjcyOSA3NC4xNTQ1IDEzNy43MjlWMTE3LjQ2Qzc0LjE1NDUgMTEwLjUgODIuNSAxMTAuNSA4Mi41IDExMC41VjUyLjY3MzJIMTVDMTAgNTIuNjczMiAxMCA0Ny41MjY5IDEwIDQ3LjUyNjlWMzQuMTQ2NEMxMCAyOSAxNSAyOSAxNSAyOVoiIGZpbGw9IiMxQzFDMUUiLz48cGF0aCBkPSJNNTYgMzdINDBDMzcuMjM4NiAzNyAzNSAzOC43OTA5IDM1IDQxQzM1IDQzLjIwOTEgMzcuMjM4NiA0NSA0MCA0NUg1NkM1OC43NjE0IDQ1IDYxIDQzLjIwOTEgNjEgNDFDNjEgMzguNzkwOSA1OC43NjE0IDM3IDU2IDM3WiIgZmlsbD0id2hpdGUiLz48cGF0aCBkPSJNMTY1IDM3SDE0OUMxNDYuMjM5IDM3IDE0NCAzOC43OTA5IDE0NCA0MUMxNDQgNDMuMjA5MSAxNDYuMjM5IDQ1IDE0OSA0NUgxNjVDMTY3Ljc2MSA0NSAxNzAgNDMuMjA5MSAxNzAgNDFDMTcwIDM4Ljc5MDkgMTY3Ljc2MSAzNyAxNjUgMzdaIiBmaWxsPSJ3aGl0ZSIvPjxwYXRoIGQ9Ik04NCA4N0gxMjEiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMi41IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz48cGF0aCBkPSJNMTAyLjUgNjRDMTA0LjQzMyA2NCAxMDYgNjIuNDMzIDEwNiA2MC41QzEwNiA1OC41NjcgMTA0LjQzMyA1NyAxMDIuNSA1N0MxMDAuNTY3IDU3IDk5IDU4LjU2NyA5OSA2MC41Qzk5IDYyLjQzMyAxMDAuNTY3IDY0IDEwMi41IDY0WiIgZmlsbD0id2hpdGUiLz48cGF0aCBkPSJNMTAyLjUgODJDMTA0LjQzMyA4MiAxMDYgODAuNDMzIDEwNiA3OC41QzEwNiA3Ni41NjcgMTA0LjQzMyA3NSAxMDIuNSA3NUMxMDAuNTY3IDc1IDk5IDc2LjU2NyA5OSA3OC41Qzk5IDgwLjQzMyAxMDAuNTY3IDgyIDEwMi41IDgyWiIgZmlsbD0id2hpdGUiLz48cGF0aCBkPSJNMTAyLjUgMTAxQzEwNC40MzMgMTAxIDEwNiA5OS40MzMgMTA2IDk3LjVDMTA2IDk1LjU2NyAxMDQuNDMzIDk0IDEwMi41IDk0QzEwMC41NjcgOTQgOTkgOTUuNTY3IDk5IDk3LjVDOTkgOTkuNDMzIDEwMC41NjcgMTAxIDEwMi41IDEwMVoiIGZpbGw9IndoaXRlIi8+PHBhdGggZD0iTTkwLjMzOTggMTE5LjA5MUg5My4xODQyTDk2LjE4ODUgMTI2LjQySDk2LjMxNjNMOTkuMzIwNiAxMTkuMDkxSDEwMi4xNjVWMTMwSDk5LjkyNzhWMTIyLjlIOTkuODM3M0w5Ny4wMTQxIDEyOS45NDdIOTUuNDkwN0w5Mi42Njc1IDEyMi44NzNIOTIuNTc3VjEzMEg5MC4zMzk4VjExOS4wOTFaTTEwNy4xMjIgMTIwLjk5M1YxMTkuMDkxSDExNi4wODFWMTIwLjk5M0gxMTIuNzQxVjEzMEgxMTAuNDYxVjEyMC45OTNIMTA3LjEyMloiIGZpbGw9IndoaXRlIi8+PC9zdmc+';

// ==========================================
// 蓝牙连接工具类 (你提供的代码融合)
// ==========================================
class BLEHelper {
  constructor(api = wx) {
    this.api = api; 
    this.bleList = [];
    this.hasConnected = false;
    this.isScanning = false;
    this.autoScanInterval = null;
    this.openTimer = null;
    this.openCandidate = null;
    
    // 设备信息
    this.device = null;
    this.serviceId = '';
    this.characteristicId = '';      
    this.characteristicId2 = '';     
    this.serviceIdf0 = '';
    this.characteristicId01 = '';    
    this.characteristicId02 = '';    
    
    // 回调函数
    this.onDeviceFound = null;       
    this.onConnecting = null;        // 新增：连接中回调
    this.onConnected = null;         
    this.onDisconnected = null;      
    this.onDataReceived = null;      
    this.onError = null;             
  }

  initBluetoothAdapter() {
    return new Promise((resolve, reject) => {
      // 先检查系统蓝牙是否开启
      this.api.getBluetoothAdapterState({
        success: (res) => {
          if (!res.available) {
            reject(new Error('系统蓝牙未开启，请先开启系统蓝牙'));
            return;
          }
          // 蓝牙已开启，初始化适配器
          this.api.openBluetoothAdapter({
            success: (res) => {
              this.api.onBluetoothAdapterStateChange((res) => {
                console.log('蓝牙适配器状态变化', res);
              });
              resolve(res);
            },
            fail: (err) => {
            // 如果用户拒绝蓝牙授权，提示去设置中开启
            if (err && err.errMsg && err.errMsg.includes('auth deny')) {
              // 🔴 使用回调方式，让Page层处理弹窗
              if (this.onError) {
                this.onError({ 
                  type: 'auth_deny',
                  message: '蓝牙权限被拒绝',
                  detail: '请在系统设置中开启蓝牙，并允许小程序使用蓝牙功能。'
                });
              }
            }
              if (this.onError) this.onError(err);
              reject(err);
            }
          });
        },
        fail: (err) => {
          // 如果getBluetoothAdapterState失败，直接尝试openBluetoothAdapter
          // 这可能是因为适配器还未初始化
          this.api.openBluetoothAdapter({
            success: (res) => {
              this.api.onBluetoothAdapterStateChange((res) => {
                console.log('蓝牙适配器状态变化', res);
              });
              resolve(res);
            },
            fail: (err) => {
              // 如果是权限错误，提供更友好的提示
              if (err.errMsg && err.errMsg.includes('auth deny')) {
                // 🔴 使用回调方式，让Page层处理弹窗
                if (this.onError) {
                  this.onError({ 
                    type: 'auth_deny',
                    message: '蓝牙功能不可用',
                    detail: '请确保：\n1. 系统蓝牙已开启\n2. 已授权小程序使用蓝牙功能\n\n可在手机设置中检查权限'
                  });
                }
              }
              if (this.onError) this.onError(err);
              reject(err);
            }
          });
        }
      });
    });
  }

  startScan(options = {}) {
    const { powerLevel = 'high', allowDuplicatesKey = true } = options;
    this.isScanning = true;
    this.hasConnected = false;
    this.bleList = [];

    this.api.startBluetoothDevicesDiscovery({
      powerLevel: powerLevel,
      allowDuplicatesKey: allowDuplicatesKey,
      success: (res) => {
        this.setupDeviceFoundListener();
      },
      fail: (err) => {
        this.isScanning = false;
        if (this.onError) this.onError(err);
      }
    });
  }

  stopScan() {
    this.api.stopBluetoothDevicesDiscovery();
    this.isScanning = false;
    if (this.autoScanInterval) {
      clearInterval(this.autoScanInterval);
      this.autoScanInterval = null;
    }
  }

  setupDeviceFoundListener() {
    this.api.onBluetoothDeviceFound((res) => {
      const device = res.devices[0];
      if (!device) return;

      const index = this.bleList.findIndex(item => item.deviceId === device.deviceId);
      if (index === -1) {
        this.bleList.push(device);
      } else {
        this.bleList.splice(index, 1, device);
      }
      
      if (this.onDeviceFound) {
        this.onDeviceFound(this.bleList);
      }

      // 自动连接逻辑：NB开头优先
      if (!this.hasConnected && device.name && device.name.startsWith('NB')) {
        if (this.openTimer) {
          clearTimeout(this.openTimer);
          this.openTimer = null;
        }
        this.hasConnected = true;
        // 设置连接中状态
        if (this.onConnecting) this.onConnecting();
        this.connectDevice(device); // 内部会stopScan
        return;
      }
    });
  }

  connectDevice(device) {
    // UI Loading 已经在 Page 层面处理了，这里只处理逻辑
    this.stopScan();
    
    return new Promise((resolve, reject) => {
      this.api.createBLEConnection({
        deviceId: device.deviceId,
        success: (res) => {
          this.device = device;
          this.isScanning = false;
          
          setTimeout(() => {
            this.discoverServices().then(() => {
              if (this.onConnected) this.onConnected(device);
              resolve(device);
            }).catch(reject);
          }, 1500);
        },
        fail: (err) => {
          this.isScanning = false;
          if (this.onError) this.onError(err);
          reject(err);
        }
      });
    });
  }

  disconnect() {
    if (this.device) {
      this.api.closeBLEConnection({
        deviceId: this.device.deviceId,
        success: () => {
          this.device = null;
          this.hasConnected = false;
          if (this.onDisconnected) this.onDisconnected();
        }
      });
    }
  }

  discoverServices() {
    return new Promise((resolve, reject) => {
      if (!this.device) {
        reject(new Error('设备未连接'));
        return;
      }
      this.api.getBLEDeviceServices({
        deviceId: this.device.deviceId,
        success: (res) => {
          res.services.forEach(service => {
            const serviceUuid = service.uuid.toString().toUpperCase();
            if (serviceUuid.includes('FFF0')) {
              this.serviceId = service.uuid;
              this.discoverCharacteristics(this.serviceId).then(resolve).catch(reject);
            }
          });
          // 如果没有找到特定服务，也resolve以便不卡流程（视实际硬件而定）
          resolve(); 
        },
        fail: reject
      });
    });
  }

  discoverCharacteristics(serviceId) {
    return new Promise((resolve, reject) => {
      if (!this.device) {
        reject(new Error('设备未连接'));
        return;
      }
      this.api.getBLEDeviceCharacteristics({
        deviceId: this.device.deviceId,
        serviceId: serviceId,
        success: (res) => {
          res.characteristics.forEach(char => {
            const charUuid = char.uuid.toUpperCase();
            if (charUuid.includes('FF1')) this.characteristicId = char.uuid;
            if (charUuid.includes('FF2')) this.characteristicId2 = char.uuid;
          });
          if (serviceId === this.serviceId) {
            this.enableNotify().then(resolve).catch(reject);
          } else {
            resolve();
          }
        },
        fail: reject
      });
    });
  }

  enableNotify() {
    return new Promise((resolve, reject) => {
      if (!this.device || !this.serviceId || !this.characteristicId) {
        // 如果没有特征值，静默失败即可，不中断流程
        resolve(); 
        return;
      }
      this.api.notifyBLECharacteristicValueChange({
        state: true,
        deviceId: this.device.deviceId,
        serviceId: this.serviceId,
        characteristicId: this.characteristicId,
        success: (res) => {
          this.api.onBLECharacteristicValueChange((res) => {
             // 接收数据逻辑
             if (this.onDataReceived) this.onDataReceived(res.value);
          });
          this.api.onBLEConnectionStateChange((res) => {
            if (res.deviceId === this.device.deviceId && !res.connected) {
              this.device = null;
              if (this.onDisconnected) this.onDisconnected();
            }
          });
          resolve(res);
        },
        fail: reject
      });
    });
  }
}


Page({
  data: {
    models: [
      { id: 1, name: 'F1', type: 'Pro', tag: 'SERIES 1', icon: iconF1Pro, status: 'active' },
      { id: 2, name: 'F1', type: 'Max', tag: 'SERIES 1', icon: iconF1Max, status: 'next' },
      { id: 3, name: 'F2', type: 'Pro', tag: 'SERIES 2', icon: iconF2Pro, status: 'hidden' },
      { id: 4, name: 'F2', type: 'Max', tag: 'SERIES 2', icon: iconF2Max, status: 'hidden' },
      { id: 5, name: 'F2', type: 'Pro Long', tag: 'SERIES 2', icon: iconF2ProLong, status: 'hidden' },
      { id: 6, name: 'F2', type: 'Max Long', tag: 'SERIES 2', icon: iconF2MaxLong, status: 'hidden' },
    ],
    currentIndex: 0,
    
    // 🔴 设备切换滑动相关
    isDraggingModel: false,      // 是否正在拖动设备卡片
    modelDragOffset: 0,         // 设备卡片的拖动偏移量（px）
    nextCardOffsetPercent: 85,   // 下一个卡片的偏移百分比
    prevCardOffsetPercent: -85,  // 上一个卡片的偏移百分比
    modelActiveScale: 1.08,      // 当前卡片缩放
    modelSideScale: 0.86,        // 侧边卡片缩放

    showDetail: false,
    detailMode: 'main',
    currentModel: null,
    sideIcon: iconSide,
    connectIcon: iconConnect,
    editType: 'fold', 

    // === 权限控制 ===
    isAuthorized: false, // 密码验证一次后有效

    // === 弹窗控制 ===
    showPasswordModal: false, 
    showTutorialModal: false, 
    showKeyModal: false,     
    showDisconnectTip: false,
    showApproachTip: false,  // 新增：靠近车辆提示
    
    // 新增：蓝牙未开启提示弹窗
    showBluetoothAlert: false,
    
    // 新增：自动校准中弹窗
    showCalibratingModal: false,
    
    // 新增：请先连接蓝牙提示（小胶囊样式）
    showConnectBluetoothTip: false,
    
    // 🔴 新增：OTA提示
    showOtaTip: false,
    
    // 新增：连接状态
    isConnecting: false,      // 正在连接中
    isNavigatingToOta: false, // 正在跳转到OTA页面（防止重复跳转）

    // 【新增】弹窗按钮锁定状态（防误触）
    modalBtnDisabled: false,
    
    // 🔴 新增：所有弹窗的倒计时相关数据
    passwordBtnLocked: true,
    passwordBtnText: '确认 (2s)',
    tutorialBtnLocked: true,
    tutorialBtnText: '知道了 (2s)',
    keyBtnLocked: true,
    keyBtnText: '确认 (2s)',
    angleHintBtnLocked: true,
    angleHintBtnText: '知道了 (2s)',
    
    passwordInput: '',        
    pendingEditType: '',      

    // === 动画状态 (红环教程) ===
    animLightOn: true,        
    animIsPressing: false,    
    animText: '',             
    tutorialTimer: null,
    
    // === 折叠页引导状态 ===
    isLightOn: true,          // 折叠页指示灯状态（true=红，false=黑）
    
    // === 打开角度页引导状态 ===
    openAngleTutorialTimer: null,
    openAngleAnimLightOn: false,    // 打开角度动画：指示灯状态（false=灰，true=红）
    openAngleAnimIsPressing: false, // 打开角度动画：是否正在按下
    openAngleAnimText: '点击车把按键\n使指示灯亮', // 打开角度动画：提示文字
    openAngleLightOn: false,        // 打开角度页面：指示灯按钮状态（false=灰，true=红）      

    // === 动画状态 (关钥匙) ===
    keyAnimState: 'red',      // 'red' | 'grey'
    keyLoopTimer: null,       // 关钥匙动画循环定时器

    isConnected: false,
    isScanning: false, // 是否正在扫描
    connectedDeviceName: '',
    touchStartX: 0,
    
    // 角度控制（旧旋转臂仍保留给折叠逻辑使用）
    angleMode: '90', 
    angleRotation: 180, 

    // 折叠间距
    foldGap: 20, 
    
    // 🔴 调整按钮滑动相关
    adjustSlideOffset: 0,        // 滑块的垂直偏移量（px）
    adjustSlideActive: false,   // 是否激活（滑动后显示归零）
    adjustTouchStartY: 0,       // 触摸开始时的 Y 坐标
    adjustHasMoved: false,      // 是否发生了滑动（用于区分点击和滑动）

    angleBtnText: '160°', // 角度按钮文本（F1显示180°，F2显示160°）

    // 打开角度：标尺 & 数值显示相关
    isCalibrated: false,          // 是否已通过 90/160(180) 按钮激活校准
    statusText: '等待校准',      // 状态文字
    currentAngle: 0,              // 当前角度数值 (0~maxAngle)
    ticks: [],                    // 波浪尺刻度数组
    activeIndex: 0,               // 当前高亮刻度索引
    translateX: 0,                // 波浪尺位移 (px)
    transition: 'none',           // 波浪尺过渡动画
    lastEmitTime: 0,              // 波浪尺滑动节流时间戳

    // ★★★ 引导弹窗相关数据
    hasShownF1Guide: false, // 专门用于记忆 F1 系列是否已经弹窗过
    showAngleHint: false,   // 控制弹窗显示

    // 【新增】控制全新产品提示弹窗
    showNewProductHint: false, // 控制弹窗显示
    newProductBtnLocked: true, // 按钮是否锁定
    newProductBtnText: '知道了 (2s)', // 按钮文案

    // === 新增：高级设置相关数据 ===
    showSettingsModal: false, // 控制高级设置弹窗
    toastClass: '',           // 控制 Toast 动画
    
    // 图标数据绑定
    icons: {
      lock: iconLock,
      arrowUp: iconArrowUp,
      cali: iconCali,
      gear: iconGear,
      reset: iconReset,
      gearSmall: iconGearSmall,
      btSmall: iconBtSmall
    },
    
    // 滑块状态 (默认 mid)
    settingState: {
      faultDetect: 'mid',
      selfRepair: 'mid',
      powerOn: 'mid',
      shutdown: 'mid'
    }
  },

  onLoad() {
    // 🔴 更新页面访问统计
    const app = getApp();
    if (app && app.globalData && app.globalData.updatePageVisit) {
      app.globalData.updatePageVisit('scan');
    }
    
    // 初始化当前模型
    const currentModel = this.data.models[0];
    this.setData({ currentModel });
    // 确保首屏状态：active/next/prev，且不循环
    this.updateCardStatus(0);

    this.ble = new BLEHelper(wx);
    
    // 重置跳转标记
    this.setData({ isNavigatingToOta: false });
    
    this.ble.onConnecting = () => {
      // 开始连接时设置状态
      this.setData({
        isScanning: false,
        isConnecting: true
      });
    };
    
    this.ble.onConnected = async (device) => {
      // 🔴 连接成功后，检查该设备是否有OTA记录
      const hasOtaRecord = await this.checkOtaConnection(device.deviceId);
      
      if (!hasOtaRecord) {
        // 没有OTA记录，断开连接并提示
        console.log('❌ [onConnected] 设备未进行OTA升级，断开连接');
        this.ble.disconnect();
        this.setData({
          isConnected: false,
          isScanning: false,
          isConnecting: false
        });
        this.showOtaRequiredTip();
        return;
      }
      
      // 提取名称中的数字
      const rawName = device.name || '';
      const numMatch = rawName.replace(/[^0-9]/g, ''); // 只保留数字
      const finalName = numMatch ? `MT-ID:${numMatch}` : rawName;

      this.setData({
        isConnected: true,
        isScanning: false,
        isConnecting: false,
        connectedDeviceName: finalName // 设置格式化后的名称
      });
    };
    this.ble.onError = (err) => {
      this.setData({ isScanning: false });
      
      // 🔴 处理蓝牙权限错误，使用自定义弹窗
      if (err && err.type === 'auth_deny') {
        this._showCustomModal({
          title: err.message || '蓝牙权限被拒绝',
          content: err.detail || '请在系统设置中开启蓝牙，并允许小程序使用蓝牙功能。',
          showCancel: false,
          confirmText: '知道了'
        });
      }
      // 可以在这里做必要的错误上报或静默处理
    };
    this.ble.onDisconnected = () => {
      this.onBleDisconnected(); // 使用统一的断开处理
    };

    // 计算 px 比例 (CSS bar宽度6px + 间距14px = 20px)
    const sys = wx.getSystemInfoSync();
    // 注意：CSS中使用的是px单位，所以直接计算px
    this.tickWidthPx = 20; // 每个刻度总宽度20px

    // 初始化位置 (根据当前机型)
    const isF1 = currentModel.name.includes('F1');
    this.maxAngle = isF1 ? 180 : 160;

    // 生成刻度数据
    const count = (this.maxAngle - 0) / 2 + 1;
    const ticks = new Array(Math.floor(count)).fill(0);
    this.setData({ ticks });

    // 强制更新一次视图到 0度
    this.updateRuler(0, false);
  },

  onUnload() {
    // 停止所有动画循环
    this.stopTutorialLoop();
    this.stopOpenAngleTutorialLoop();
    // 释放弹窗延迟定时器
    if (this.modalDelayTimer) clearTimeout(this.modalDelayTimer);
    if (this.ble) this.ble.disconnect();
    wx.closeBluetoothAdapter();
  },

  preventBubble() { return; },

  // ===============================================
  // 【新增】弹窗防误触核心逻辑
  // ===============================================
  setModalDelay() {
    // 1. 立即锁定
    this.setData({ modalBtnDisabled: true });
    
    // 2. 清除旧定时器 (防止频繁触发冲突)
    if (this.modalDelayTimer) clearTimeout(this.modalDelayTimer);

    // 3. 1.5 秒后解锁
    this.modalDelayTimer = setTimeout(() => {
      this.setData({ modalBtnDisabled: false });
    }, 1500);
  },

  // ===============================================
  // 蓝牙连接交互 (修改版)
  // ===============================================
  async handleConnect() {
    // 防止重复点击：如果已连接、正在连接、正在跳转到OTA页面，则直接返回
    if (this.data.isConnected || this.data.isConnecting || this.data.isNavigatingToOta) {
      return;
    }
    
    // 1. 显示"靠近车辆"提示 (2秒)
    this.setData({ showApproachTip: true });
    setTimeout(() => { this.setData({ showApproachTip: false }); }, 2000);

    // 2. 进入扫描
    this.setData({ isScanning: true, isConnecting: false });

    // 3. 初始化蓝牙适配器
    this.ble.initBluetoothAdapter()
      .then(() => { 
        // --- 蓝牙已开启，开始扫描 ---
        this.ble.startScan(); 
        
        // 设置扫描超时
        setTimeout(() => {
          if (!this.data.isConnected && this.data.isScanning) {
            this.setData({ isScanning: false, isConnecting: false });
            this.ble.stopScan();
            // 这里可以静默，也可以给个轻提示
          }
        }, 15000); 
      })
      .catch((err) => {
        // --- 蓝牙初始化失败 (通常是没开蓝牙) ---
        console.error("蓝牙初始化失败", err);
        
        this.setData({ 
          isScanning: false,       // 停止胶囊的扫描动画
          isConnecting: false,
          showBluetoothAlert: true // 弹出自定义提示框
        });
        
        // 启动防误触延迟
        this.setModalDelay();

        // 震动反馈
        wx.vibrateLong(); 
      });
  },

  handleDisconnect() {
    this.ble.disconnect();
  },

  // 新增：关闭蓝牙提示弹窗
  closeBluetoothAlert() {
    if (this.data.modalBtnDisabled) return; // 防误触：还在锁定中
    this.setData({ showBluetoothAlert: false });
  },


  // 监听断开 (修改：增加 UI 反馈)
  onBleDisconnected() {
    this.setData({ 
      isConnected: false, 
      isScanning: false,
      showDisconnectTip: true // 显示断开提示
    });

    // 1.5秒后隐藏提示
    setTimeout(() => {
      this.setData({ showDisconnectTip: false });
    }, 1500);
  },

  // 🔴 检查指定设备是否有OTA连接记录（根据设备ID判断）
  async checkOtaConnection(deviceId) {
    try {
      if (!deviceId) {
        console.warn('⚠️ [checkOtaConnection] 设备ID不存在');
        return false;
      }
      
      console.log('🔍 [checkOtaConnection] 检查设备ID:', deviceId);
      
      // 查询云端数据库：查找该设备是否有OTA记录
      const db = wx.cloud.database();
      const res = await db.collection('ota_connections')
        .where({ deviceId: deviceId })
        .get();
      
      console.log('🔍 [checkOtaConnection] 查询结果:', {
        deviceId: deviceId,
        count: res.data.length,
        records: res.data
      });
      
      // 如果有记录，返回true；否则返回false
      const hasRecord = res.data.length > 0;
      console.log('🔍 [checkOtaConnection] 设备是否有OTA记录:', hasRecord);
      return hasRecord;
    } catch (err) {
      console.error('❌ [checkOtaConnection] 检查失败:', err);
      // 如果查询失败，为了安全起见，返回false拒绝连接
      return false;
    }
  },

  // 🔴 显示需要OTA升级的提示（使用toast样式）
  showOtaRequiredTip() {
    // 如果已经在跳转中，直接返回，防止重复跳转
    if (this.data.isNavigatingToOta) {
      return;
    }
    
    // 设置跳转标记，防止重复点击
    this.setData({ isNavigatingToOta: true });
    
    // 显示提示（使用toast样式）
    this.setData({ showOtaTip: true });
    
    // 2.5秒后自动跳转到OTA页面
    setTimeout(() => {
      this.setData({ showOtaTip: false });
      wx.navigateTo({ 
        url: '/pages/ota/ota',
        success: () => {
          // 跳转成功后，重置标记（在页面返回时会重新设置）
          console.log('✅ 已跳转到OTA页面');
        },
        fail: (err) => {
          console.error('跳转失败:', err);
          // 跳转失败时重置标记，允许重试
          this.setData({ isNavigatingToOta: false });
          this._showCustomToast('请先进行OTA升级', 'none');
        }
      });
    }, 2500);
  },

  // ===============================================
  // 页面交互
  // ===============================================
  onTouchStartMain(e) {
    if (e.changedTouches.length > 0) {
      this.setData({ 
        touchStartX: e.changedTouches[0].clientX,
        isDraggingModel: true,
        modelDragOffset: 0
      });
    }
  },

  // 🔴 新增：滑动过程中的跟手效果
  onTouchMoveMain(e) {
    if (!this.data.isDraggingModel) return;
    
    const touchCurrentX = e.touches[0].clientX;
    const startX = this.data.touchStartX;
    let diff = touchCurrentX - startX;
    
    // 🔴 1:1 跟手，仅做极限限制
    const maxDrag = 250; // 最大拖动距离，防止拖太远
    if (diff > maxDrag) diff = maxDrag;
    if (diff < -maxDrag) diff = -maxDrag;
    
    // 更跟手：px 转 %，系数 0.20，约等于手指 1px 带动 0.2%
    const nextCardOffset = 85 + diff * 0.2;   // 右滑时 next 向中心靠近
    const prevCardOffset = -85 + diff * 0.2;  // 左滑时 prev 向中心靠近

    // 缩放随拖动插值
    const t = Math.min(1, Math.abs(diff) / maxDrag);
    const activeScale = 1.08 - 0.12 * t; // 1.08 -> 0.96
    const sideScale = 0.86 + 0.12 * t;   // 0.86 -> 0.98
    
    this.setData({ 
      modelDragOffset: diff,
      nextCardOffsetPercent: nextCardOffset,
      prevCardOffsetPercent: prevCardOffset,
      modelActiveScale: activeScale,
      modelSideScale: sideScale
    });
  },

  onTouchEnd(e) {
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchEndX - this.data.touchStartX;
    const threshold = 80; // 更灵敏的切换阈值
    
    // 重置拖动状态
    this.setData({ 
      isDraggingModel: false,
      modelDragOffset: 0,
      nextCardOffsetPercent: 85,
      prevCardOffsetPercent: -85,
      modelActiveScale: 1.08,
      modelSideScale: 0.86
    });
    
    // 判断是否切换
    if (Math.abs(diff) < threshold) {
      // 滑动距离不够，不切换
      return;
    }
    
    // 根据滑动方向切换
    if (diff > 0) {
      this.swipe('prev');
    } else {
      this.swipe('next');
    }
  },

  swipe(direction) {
    let current = this.data.currentIndex;
    const total = this.data.models.length;
    if (direction === 'next') {
      if (current < total - 1) current = current + 1; // 末尾不再循环
    } else {
      if (current > 0) current = current - 1; // 开头不再循环
    }
    this.updateCardStatus(current);
  },

  updateCardStatus(current) {
    const total = this.data.models.length;
    const nextIdx = current + 1 < total ? current + 1 : -1;
    const prevIdx = current - 1 >= 0 ? current - 1 : -1;
    const newModels = this.data.models.map((item, index) => {
      let status = 'hidden';
      if (index === current) status = 'active';
      else if (index === nextIdx) status = 'next';
      else if (index === prevIdx) status = 'prev';
      return { ...item, status };
    });
    this.setData({ 
      models: newModels, 
      currentIndex: current,
      modelDragOffset: 0, // 🔴 切换时重置偏移
      nextCardOffsetPercent: 85,
      prevCardOffsetPercent: -85,
      modelActiveScale: 1.08,
      modelSideScale: 0.86
    });
  },

  onTapCard(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    if (index !== this.data.currentIndex) {
      this.updateCardStatus(index);
    }
  },

  openDetail(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    this.updateCardStatus(index);
    const currentModel = this.data.models[index];
    const isF1 = currentModel && currentModel.name.includes('F1');
    this.setData({
      showDetail: true,
      currentModel: currentModel,
      detailMode: 'main',
      angleBtnText: isF1 ? '180°' : '160°' // 根据机型设置按钮文本
    });
  },

  goBack() {
    if (this.data.showDetail) {
      if (this.data.detailMode === 'edit') {
        this.setData({ detailMode: 'main' });
      } else {
        this.setData({ showDetail: false });
        // 断开连接可选
        // if (this.data.isConnected) this.ble.disconnect(); 
      }
    } else {
      wx.navigateBack();
    }
  },

  // ===============================================
  // 进入编辑模式 (入口分发)
  // ===============================================
  enterEdit(e) {
    // 🔴 检查蓝牙连接状态：未连接时不允许进入编辑模式
    if (!this.data.isConnected) {
      // 显示"请先连接蓝牙"小胶囊提示
      this.setData({ showConnectBluetoothTip: true });
      // 2秒后自动隐藏
      setTimeout(() => {
        this.setData({ showConnectBluetoothTip: false });
      }, 2000);
      return;
    }
    
    const type = e.currentTarget.dataset.type;
    this.setData({ pendingEditType: type });

    if (type === 'fold') {
      // 折叠：需要密码 -> 教程 -> 界面
      if (!this.data.isAuthorized) {
        this.openPasswordModal();
      } else {
        this.showTutorial('fold');
      }
    } else if (type === 'open') {
      // 打开角度：直接进入初始化
      this.setData({
        detailMode: 'edit',
        editType: type,
      });

      this.initOpenMode();
    }
  },

  showTutorial(type) {
    this.setData({
      showPasswordModal: false,
      showTutorialModal: true
    });
    this.startTutorialLoop(type);
    // 🔴 启动倒计时
    this.startTutorialCountdown();
  },

  // ===============================================
  // 密码逻辑
  // ===============================================
  onPasswordInput(e) {
    this.setData({ passwordInput: e.detail.value });
  },

  confirmPassword() {
    if (this.data.passwordBtnLocked) return; // 🔴 倒计时锁定中

    if (this.data.passwordInput === '1234') {
      this.setData({ 
        isAuthorized: true, // 授权成功，下次不用密码
        showPasswordModal: false 
      });
      // 密码正确后，进入折叠教程
      this.showTutorial('fold');
    } else {
      this._showCustomToast('密码错误', 'none');
      this.setData({ passwordInput: '' });
    }
  },

  cancelPassword() {
    this.setData({ showPasswordModal: false });
  },

  // ===============================================
  // 教程动画循环 (红环)
  // ===============================================
  startTutorialLoop(type) {
    this.stopTutorialLoop();

    let startState, endState;

    if (type === 'fold') {
      // 折叠：灯亮 -> 按下 -> 灯灭
      startState = { light: true, text: '点击车把按键\n使指示灯灭' };
      endState = { light: false, text: '指示灯灭' };
    } else {
      // 打开：灯灭 -> 按下 -> 灯亮
      startState = { light: false, text: '点击车把按键\n使指示灯亮' };
      endState = { light: true, text: '指示灯亮' };
    }

    // 第一帧
    this.setData({
      animLightOn: startState.light,
      animIsPressing: false,
      animText: startState.text
    });

    const loop = () => {
      // 1. 等待1秒
      const timer1 = setTimeout(() => {
        this.setData({ animIsPressing: true }); // 模拟按下

        // 2. 按下0.3秒后变化
        const timer2 = setTimeout(() => {
          this.setData({
            animLightOn: endState.light,
            animText: endState.text,
            animIsPressing: false
          });

          // 3. 保持结果 2秒
          const timer3 = setTimeout(() => {
            // 重置
            this.setData({
              animLightOn: startState.light,
              animText: startState.text
            });
            // 4. 重置后等待1秒循环
            const timer4 = setTimeout(loop, 1000);
            this.data.tutorialTimer = timer4;
          }, 2000);
          this.data.tutorialTimer = timer3;

        }, 300);
        this.data.tutorialTimer = timer2;

      }, 1000);
      this.data.tutorialTimer = timer1;
    };

    loop();
  },

  stopTutorialLoop() {
    if (this.data.tutorialTimer) {
      clearTimeout(this.data.tutorialTimer);
      this.data.tutorialTimer = null;
    }
  },

  // 教程确认按钮
  finishTutorial() {
    if (this.data.tutorialBtnLocked) return; // 🔴 倒计时锁定中

    this.stopTutorialLoop();
    const type = this.data.pendingEditType || 'fold';
    this.setData({
      showTutorialModal: false,
      detailMode: 'edit',
      editType: type
    });

    // 教程结束后，如果是"打开角度"，初始化新的刻度模式
    if (type === 'open') {
      this.initOpenMode();
    }
  },

  // ===============================================
  // 完成设置 & 关钥匙动画
  // ===============================================
  // ===============================================
  // 完成设置 & 关钥匙动画 (修改：循环播放)
  // ===============================================
  exitEdit() {
    this.stopOpenAngleTutorialLoop();
    this.setData({ showKeyModal: true });
    
    // 开始循环动画
    this.startKeyAnimLoop();
    
    // 🔴 启动倒计时
    this.startKeyCountdown();
  },

  startKeyAnimLoop() {
    // 清除旧定时器
    if (this.data.keyLoopTimer) clearTimeout(this.data.keyLoopTimer);

    const loop = () => {
      // 1. 关钥匙 (红 -> 灰)
      this.setData({ keyAnimState: 'red' });
      
      // 1秒后变灰
      this.data.keyLoopTimer = setTimeout(() => {
        this.setData({ keyAnimState: 'grey' });
        
        // 再过1秒，重置为红，开始下一次循环
        this.data.keyLoopTimer = setTimeout(() => {
          loop();
        }, 1500); // 灰状态停留1.5秒
        
      }, 1000); // 红状态停留1秒
    };

    loop();
  },

  confirmKeyOff() {
    if (this.data.keyBtnLocked) return; // 🔴 倒计时锁定中

    // 停止循环
    if (this.data.keyLoopTimer) clearTimeout(this.data.keyLoopTimer);
    this.setData({ showKeyModal: false, detailMode: 'main' });
  },

  // ===============================================
  // 打开角度：新刻度 & 棍子控制逻辑
  // ===============================================

  // 初始化打开角度模式
  // ===============================================
  // 初始化打开角度模式 (强制每次都弹窗)
  // ===============================================
  initOpenMode() {
    const isF1 = this.data.currentModel.name.includes('F1');
    
    // F1系列上限180，F2系列上限170
    this.maxAngle = isF1 ? 180 : 170;
    
    // 生成刻度数据
    const count = (this.maxAngle - 0) / 2 + 1;
    const ticks = new Array(Math.floor(count)).fill(0);
    
    // 🔴 修复：一次性设置所有状态，并确保 transition 为 'none'，防止残留动画
    // 这样棍子会立即显示为 0 度（水平状态），不会有从之前状态跳转的动画
    this.setData({
      detailMode: 'edit',
      editType: 'open',
      ticks: ticks,
      statusText: '点击180度或90度同步画面',
      currentAngle: 0,
      angleMode: '', // 保持为空，让棍子显示为 0 度（水平状态）
      angleRotation: 180, 
      activeIndex: 0,
      translateX: 0,
      transition: 'none' // 🔴 关键：禁用动画，防止残留的 transition 导致闪烁
    });
    
    // 修改：F1系列【每次】进入都弹窗，去掉 !hasShownF1Guide 判断
    if (isF1) {
       this.setData({ showAngleHint: true });
       this.startOpenAngleTutorialLoop();
       // 🔴 启动倒计时
       this.startAngleHintCountdown();
    } else {
       this.setData({ showAngleHint: false });
    }
  },

  // ===============================================
  // 切换预设角度 (F2 点击160跳转，但能滑到170)
  // ===============================================
  switchAngle(e) {
    // 🔴 检查蓝牙连接状态
    if (!this.data.isConnected) {
      this._showCustomToast('未连接蓝牙', 'none', 2000);
      return;
    }
    
    const angle = parseInt(e.currentTarget.dataset.angle);
    
    // 默认目标就是点击的角度
    let targetDeg = angle;

    // 特殊逻辑：如果是 F2机型 (maxAngle=170)，点击的是 160 按钮
    // 此时目标是 160，而不是 maxAngle(170)
    // 已经在 wxml 传参 data-angle="160" 了，所以这里直接用 angle 即可

    this.setData({
      statusText: '已校准',
      angleMode: angle.toString()
    });

    // 🔴 F2 PRO/MAX：点击角度按钮时发送对应数据
    const currentModel = this.data.currentModel;
    const isF2 = currentModel && currentModel.name && currentModel.name.includes('F2');
    const isF1 = currentModel && currentModel.name && currentModel.name.includes('F1');
    
    if (isF2 && this.data.isConnected) {
      if (angle === 90) {
        console.log('📤 [蓝牙] F2 发送"自定义功能"');
        this.sendData('自定义功能');
      } else if (angle === 160) {
        console.log('📤 [蓝牙] F2 发送"完全打开"');
        this.sendData('完全打开');
      }
    }
    
    // 🔴 F1 PRO/MAX：点击角度按钮时发送对应数据
    if (isF1 && this.data.isConnected) {
      if (angle === 90) {
        console.log('📤 [蓝牙] F1 发送"90度"');
        this.sendData('90度');
      } else if (angle === 180) {
        console.log('📤 [蓝牙] F1 发送"180度"');
        this.sendData('180度');
      }
    }

    // 跳转到目标角度
    this.updateRuler(targetDeg, true);
    wx.vibrateShort({ type: 'light' });
  },

  // ===============================================
  // 更新标尺与视图 (修复 Bug：确保传递正确角度给按钮逻辑)
  // ===============================================
  updateRuler(deg, animate) {
    if (deg < 0) deg = 0;
    if (deg > this.maxAngle) deg = this.maxAngle;

    // 计算波轮位置
    const index = deg / 2;
    const trans = -(index * this.tickWidthPx);

    // 计算棍子视觉旋转 (180是拉直, 0是折叠)
    const visualRot = 180 - deg;

    this.setData({
      currentAngle: deg,
      activeIndex: Math.round(index),
      translateX: trans,
      transition: animate ? 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none',
      angleRotation: visualRot
    });
    
    // 关键修复：将当前的真实角度 (deg) 传给按钮判断逻辑
    // 之前可能传了 visualRot 导致逻辑反了
    this.updateAngleText(deg);
  },

  // ===============================================
  // 触摸交互核心修复 (物理驱动动画)
  // ===============================================

  // ===============================================
  // 触摸开始
  // ===============================================
  onTouchStart(e) {
    this.touchStartX = e.touches[0].clientX;
    this.startTranslateX = this.data.translateX || 0;
    
    // 记录上一次震动的"物理刻度索引"，而不是角度
    // 这样保证越界后依然能检测到刻度变化
    this.lastVibrateIndex = Math.round(-this.startTranslateX / this.tickWidthPx);
  },

  // ===============================================
  // 触摸移动 (核心修复：限速 + 精确高亮 + 降低灵敏度)
  // ===============================================
  onTouchMove(e) {
    const touchCurrentX = e.touches[0].clientX;
    
    // 计算原始拖动距离
    let diff = touchCurrentX - this.touchStartX;
    
    // 🔴 降低灵敏度：添加灵敏度系数，让滑动更平滑
    // 0.4 表示手指移动 1px，波轮只移动 0.4px，需要移动更多才能滑动一格
    // 可以调整这个值：越小越不灵敏，越大越灵敏（建议范围：0.3-0.6）
    const sensitivity = 0.4;
    diff = diff * sensitivity;
    
    // --- 需求：每次波轮最大只能拨动3格 ---
    // 1格 = 20px (this.tickWidthPx)
    // 3格 = 60px
    const maxDragDistance = 60; 

    // 限制 diff 的范围在 -60 到 60 之间
    // 这意味着手指划得再远，波轮最多也只动 3格的距离
    if (diff > maxDragDistance) diff = maxDragDistance;
    if (diff < -maxDragDistance) diff = -maxDragDistance;
    
    // 1. 物理层：计算位移
    let newTranslateX = this.startTranslateX + diff;

    // 2. 视觉层：立即更新
    this.setData({
      translateX: newTranslateX,
      transition: 'none'
    });

    // 3. 震动层 + 蓝牙发送层
    let rawIndex = Math.round(-newTranslateX / this.tickWidthPx);
    if (rawIndex !== this.lastVibrateIndex) {
      wx.vibrateShort({ type: 'light' });
      
      // 🔴 F2 PRO/MAX：打开角度模式，滑动时发送数据
      const currentModel = this.data.currentModel;
      const isF2 = currentModel && 
                   currentModel.name && currentModel.name.includes('F2');
      const isF1 = currentModel && 
                   currentModel.name && currentModel.name.includes('F1');
      const isOpenMode = this.data.editType === 'open';
      const isConnected = this.data.isConnected;
      
      // F2 PRO/MAX 的滑动发送逻辑
      if (isF2 && isOpenMode && isConnected) {
        // 往右滑动 = rawIndex 减小 → 发送"往上收"
        // 往左滑动 = rawIndex 增大 → 发送"往下"
        if (rawIndex < this.lastVibrateIndex) {
          // 往右滑动
          const diff = this.lastVibrateIndex - rawIndex;
          console.log(`📤 [蓝牙] F2 检测到往右滑动 ${diff} 格，准备发送"往上收"`);
          // 每滑动一格，发送一次"往上收"
          for (let i = 0; i < diff; i++) {
            console.log(`📤 [蓝牙] 发送"往上收" (第${i + 1}次)`);
            this.sendData('往上收');
          }
        } else if (rawIndex > this.lastVibrateIndex) {
          // 往左滑动
          const diff = rawIndex - this.lastVibrateIndex;
          console.log(`📤 [蓝牙] F2 检测到往左滑动 ${diff} 格，准备发送"往下"`);
          // 每滑动一格，发送一次"往下"
          for (let i = 0; i < diff; i++) {
            console.log(`📤 [蓝牙] 发送"往下" (第${i + 1}次)`);
            this.sendData('往下');
          }
        }
      }
      
      // 🔴 F1 PRO/MAX：打开角度模式，滑动时发送数据
      if (isF1 && isOpenMode && isConnected) {
        // 往右滑动 = rawIndex 减小 → 发送"往上收"
        // 往左滑动 = rawIndex 增大 → 发送"往下放"
        if (rawIndex < this.lastVibrateIndex) {
          // 往右滑动
          const diff = this.lastVibrateIndex - rawIndex;
          console.log(`📤 [蓝牙] F1 检测到往右滑动 ${diff} 格，准备发送"往上收"`);
          // 每滑动一格，发送一次"往上收"
          for (let i = 0; i < diff; i++) {
            console.log(`📤 [蓝牙] 发送"往上收" (第${i + 1}次)`);
            this.sendData('往上收');
          }
        } else if (rawIndex > this.lastVibrateIndex) {
          // 往左滑动
          const diff = rawIndex - this.lastVibrateIndex;
          console.log(`📤 [蓝牙] F1 检测到往左滑动 ${diff} 格，准备发送"往下放"`);
          // 每滑动一格，发送一次"往下放"
          for (let i = 0; i < diff; i++) {
            console.log(`📤 [蓝牙] 发送"往下放" (第${i + 1}次)`);
            this.sendData('往下放');
          }
        }
      }
      
      this.lastVibrateIndex = rawIndex;
    }

    // 4. 逻辑层：只有激活后才同步数据
    if (!this.data.angleMode) {
      return;
    }

    // 反推角度
    let rawAngle = (-newTranslateX / this.tickWidthPx) * 2;
    let clampedAngle = rawAngle;
    if (clampedAngle < 0) clampedAngle = 0;
    if (clampedAngle > this.maxAngle) clampedAngle = this.maxAngle;
    
    const displayAngle = Math.round(clampedAngle);

    // 更新数据
    this.setData({
      currentAngle: displayAngle, 
      activeIndex: Math.round(clampedAngle / 2)
    });
    
    // 更新按钮状态
    this.updateAngleText(displayAngle); 
  },

  // ===============================================
  // 3. 微调逻辑 (核心修正)
  // ===============================================
  handleAdjust(e) {
    // 🔴 检查蓝牙连接状态
    if (!this.data.isConnected) {
      this._showCustomToast('未连接蓝牙', 'none', 2000);
      return;
    }
    
    const action = e.currentTarget.dataset.action; 
    const editType = this.data.editType || (this.data.detailMode === 'edit' ? this.data.editType : 'open');

    wx.vibrateShort({ type: 'light' });

    // --- A. 折叠模式 (保持不变) ---
    if (editType === 'fold' || e.currentTarget.dataset.mode === 'fold') {
      let gap = this.data.foldGap;
      const step = 2; 

      // 🔴 F1/F2 PRO/MAX：折叠模式时发送对应数据
      const currentModel = this.data.currentModel;
      const isF1 = currentModel && currentModel.name && currentModel.name.includes('F1');
      const isF2 = currentModel && currentModel.name && currentModel.name.includes('F2');
      const isF1OrF2 = isF1 || isF2;
      
      // 调试日志
      console.log('🔍 [调试] 折叠模式按钮:', {
        action,
        editType,
        isF1,
        isF2,
        isF1OrF2,
        isConnected: this.data.isConnected,
        modelName: currentModel?.name
      });
      
      if (action === 'left' || action === 'fine-tune-up') {
        gap += step;
        if (isF1OrF2 && this.data.isConnected) {
          console.log('📤 [蓝牙] 发送"调大"');
          this.sendData('调大');
        }
      } else if (action === 'right' || action === 'fine-tune-down') {
        gap -= step;
        if (isF1OrF2 && this.data.isConnected) {
          console.log('📤 [蓝牙] 发送"调小"');
          this.sendData('调小');
        }
      } else if (action === 'adjust') {
        // 🔴 调整按钮：发送"调整折叠角度"
        console.log('🔍 [调试] 调整按钮被点击', {
          isF1,
          isF2,
          isF1OrF2,
          isConnected: this.data.isConnected,
          modelName: currentModel?.name
        });
        if (isF1OrF2) {
          if (this.data.isConnected) {
            console.log('📤 [蓝牙] 发送"调整折叠角度"');
            this.sendData('调整折叠角度');
          } else {
            console.log('❌ [蓝牙] 未连接，无法发送"调整折叠角度"');
            this._showCustomToast('蓝牙未连接', 'none', 2000);
          }
        } else {
          console.log('❌ [调试] 不是 F1/F2 机型，不发送');
          this._showCustomToast('当前机型不支持', 'none', 2000);
        }
      } else if (action === 'zero') {
        gap = 20;
        // 🔴 归零按钮：发送"初始化角度"
        console.log('🔍 [调试] 归零按钮被点击', {
          isF1,
          isF2,
          isF1OrF2,
          isConnected: this.data.isConnected,
          modelName: currentModel?.name
        });
        if (isF1OrF2) {
          if (this.data.isConnected) {
            console.log('📤 [蓝牙] 发送"初始化角度"');
            this.sendData('初始化角度');
          } else {
            console.log('❌ [蓝牙] 未连接，无法发送"初始化角度"');
            this._showCustomToast('蓝牙未连接', 'none', 2000);
          }
        } else {
          console.log('❌ [调试] 不是 F1/F2 机型，不发送');
          this._showCustomToast('当前机型不支持', 'none', 2000);
        }
        // 🔴 点击归零后，重置滑动状态
        this.resetAdjustSlider();
      } 

      if (gap < 0) gap = 0;
      if (gap > 400) gap = 400;

      this.setData({ foldGap: gap });
      return;
    }

    // --- B. 打开模式 (90~270 左侧区域) ---
    let currentRot = this.data.angleRotation;
    let newRot = currentRot;
    const degStep = 3; 

    // 左键: 增加角度 (往左/上抬) -> 逐渐靠近 180 (90度预设)
    if (action === 'fine-tune-down') {
      newRot += degStep;
    } 
    // 右键: 减小角度 (往右/下放) -> 逐渐靠近 90 (180度预设)
    else if (action === 'fine-tune-up') {
      newRot -= degStep;
    }

    // 范围限制
    if (newRot < 90) newRot = 90;
    if (newRot > 270) newRot = 270;

    // 将 CSS 旋转角度转换为实际角度
    const actualAngle = 180 - newRot;

    this.setData({ angleRotation: newRot });
    
    // 关键：每次微调都检查一次角度，决定哪个按钮亮
    // 传入实际角度，而不是 CSS 旋转角度
    this.updateAngleText(actualAngle); 
  },

  // ===============================================
  // 实时更新按钮状态 (修改：只有刚好90/180/160才亮)
  // ===============================================
  updateAngleText(currentAngle) {
    const isF1 = this.data.currentModel && this.data.currentModel.name.includes('F1');
    let activeMode = ''; // 默认全灭

    // 容差范围：允许 ±2 度 (方便手指定位，因为完全精准很难)
    // 如果您需要绝对精准，把 2 改为 0
    const tolerance = 2; 

    if (Math.abs(currentAngle - 90) <= tolerance) {
      activeMode = '90';
    } else {
      if (isF1) {
        // F1 匹配 180
        if (Math.abs(currentAngle - 180) <= tolerance) activeMode = '180';
      } else {
        // F2 匹配 160
        if (Math.abs(currentAngle - 160) <= tolerance) activeMode = '160';
      }
    }
    
    // 状态改变才更新
    if (this.data.angleMode !== activeMode) {
      // 如果 activeMode 变为空，说明偏离了特定角度
      // 但我们需要保持"激活"状态(数据同步)，只是按钮不亮
      // 所以这里我们只更新 angleMode 如果它依然是有效的，或者为了熄灭按钮
      
      // 注意：之前的逻辑用 angleMode 判断是否激活同步。
      // 现在需求是：同步开启后，按钮亮灭只代表"是否对准"。
      // 但如果把 angleMode 设为空，onTouchMove 里的同步就会停止。
      
      // 解决方案：我们不应该清空 angleMode，因为它是"同步开关"。
      // 我们的需求是：按钮亮起样式 和 同步开关 分离。
      // 但现在的架构 angleMode 既是开关又是样式。
      
      // 妥协方案：保持 angleMode 有值(比如上次的值)，但在 WXML 里判断样式时增加条件。
      // 或者：既然已经激活了，就不应该把 angleMode 设为空。
      
      // 修正逻辑：
      // 题目说"按钮才会对应的亮起"。
      // 这意味着如果不在 90/160/180，按钮应该是灭的。
      
      // 这里直接setData即可。注意：如果设为空字符串，会断开同步。
      // 所以我们必须引入一个新的变量 isSynced 来控制同步，或者修改 angleMode 的定义。
      
      // 鉴于不改动太大结构：
      // 我们保持 angleMode 有值（为了保持同步），但在 switchAngle 里赋予初始值。
      // 在滑动过程中，只有刚好到位时，我们才把 angleMode 设为 '90'/'180'。
      // 那不到位时设为什么？设为 'active_but_no_highlight' ?
      
      // 让我们简单点：只有到位了才 setData，不到位时，我们设为一个特殊值 'synced'
      // 这样 onTouchMove 里 if(this.data.angleMode) 依然为真 (同步继续)
      // 但 WXML 里的 class="{{angleMode === '90' ? 'active' : ''}}" 就会变假 (按钮熄灭)
      
      this.setData({ angleMode: activeMode || 'synced' });
    }
  },


  // 关闭第一个提示（180度提示）
  dismissHint() {
    if (this.data.angleHintBtnLocked) return; // 🔴 倒计时锁定中
    this.stopOpenAngleTutorialLoop();
    this.setData({ showAngleHint: false }); 

    // ==========================================
    // 【接力逻辑】如果机型是 F1PRO/MAX，紧接着显示第二个弹窗
    // 🔴 修改：只弹一次，使用本地存储记录
    // ==========================================
    const currentModel = this.data.currentModel;
    const currentName = currentModel.name || '';
    const currentType = currentModel.type || '';
    
    // 判断是否包含 F1PRO 或 F1MAX (转大写比较更稳妥)
    const nameUpper = currentName.toUpperCase();
    const typeUpper = currentType.toUpperCase();
    
    if (nameUpper.includes('F1') && (typeUpper.includes('PRO') || typeUpper.includes('MAX'))) {
      // 🔴 检查本地存储，如果已经弹过就不弹了
      const hasShown = wx.getStorageSync('hasShownNewProductHint_F1');
      if (!hasShown) {
        // 延迟 200ms 让第一个弹窗消失动画播完，再弹第二个
        setTimeout(() => {
          this.openNewProductHint();
        }, 200);
      }
    }
  },

  // ===============================================
  // 打开角度教程动画循环（灰色 -> 点击 -> 红色亮起）
  // ===============================================
  startOpenAngleTutorialLoop() {
    this.stopOpenAngleTutorialLoop();

    // 打开角度：灰色 -> 按下 -> 红色亮起
    const startState = { light: false, text: '点击车把按键\n使指示灯亮' };
    const endState = { light: true, text: '指示灯亮' };

    // 第一帧：灰色状态
    this.setData({
      openAngleAnimLightOn: startState.light,
      openAngleAnimIsPressing: false,
      openAngleAnimText: startState.text
    });

    const loop = () => {
      // 1. 等待1秒
      const timer1 = setTimeout(() => {
        this.setData({ openAngleAnimIsPressing: true }); // 模拟按下

        // 2. 按下0.3秒后变化
        const timer2 = setTimeout(() => {
          this.setData({
            openAngleAnimLightOn: endState.light,
            openAngleAnimText: endState.text,
            openAngleAnimIsPressing: false
          });

          // 3. 保持结果 2秒
          const timer3 = setTimeout(() => {
            // 重置
            this.setData({
              openAngleAnimLightOn: startState.light,
              openAngleAnimText: startState.text
            });
            // 4. 重置后等待1秒循环
            const timer4 = setTimeout(loop, 1000);
            this.data.openAngleTutorialTimer = timer4;
          }, 2000);
          this.data.openAngleTutorialTimer = timer3;

        }, 300);
        this.data.openAngleTutorialTimer = timer2;

      }, 1000);
      this.data.openAngleTutorialTimer = timer1;
    };

    loop();
  },

  stopOpenAngleTutorialLoop() {
    if (this.data.openAngleTutorialTimer) {
      clearTimeout(this.data.openAngleTutorialTimer);
      this.data.openAngleTutorialTimer = null;
    }
  },

  // ===============================================
  // 打开角度页面：切换指示灯状态
  // ===============================================
  toggleOpenAngleLight() {
    // 停止动画循环，避免干扰用户操作
    this.stopOpenAngleTutorialLoop();
    
    const newState = !this.data.openAngleLightOn;
    this.setData({
      openAngleLightOn: newState,
      // 同时更新动画状态，确保视觉一致
      openAngleAnimLightOn: newState,
      openAngleAnimText: newState ? '指示灯已亮' : '点击使指示灯亮'
    });
    // 添加震动反馈
    wx.vibrateShort({ type: 'light' });
  },

  // ===============================================
  // 🔴 自动校准功能
  // ===============================================
  handleAutoCalibrate() {
    // 🔴 检查蓝牙连接状态：未连接时不允许使用
    if (!this.data.isConnected) {
      // 显示"请先连接蓝牙"小胶囊提示
      this.setData({ showConnectBluetoothTip: true });
      // 2秒后自动隐藏
      setTimeout(() => {
        this.setData({ showConnectBluetoothTip: false });
      }, 2000);
      return;
    }
    
    const currentModel = this.data.currentModel;
    const isF2 = currentModel && currentModel.name && currentModel.name.includes('F2');
    
    // 只有 F2 PRO/MAX 可以点击
    if (!isF2) return;
    
    console.log('📤 [蓝牙] 发送"自动调平"');
    this.sendData('自动调平');
    
    // 🔴 显示校准中弹窗
    this.setData({ showCalibratingModal: true });
  },
  
  // 🔴 关闭校准弹窗
  closeCalibratingModal() {
    this.setData({ showCalibratingModal: false });
  },
  
  // 🔴 阻止背景滚动
  preventMove() {
    return false;
  },

  // ===============================================
  // 新增：高级设置交互逻辑
  // ===============================================

  // 打开设置弹窗
  openSettings() {
    // 🔴 检查蓝牙连接状态：未连接时不允许使用
    if (!this.data.isConnected) {
      // 显示"请先连接蓝牙"小胶囊提示
      this.setData({ showConnectBluetoothTip: true });
      // 2秒后自动隐藏
      setTimeout(() => {
        this.setData({ showConnectBluetoothTip: false });
      }, 2000);
      return;
    }
    
    // 权限校验：只有 Max 机型可以打开
    // F1 Max: 可以打开，但部分功能隐藏
    // F2 Max: 可以打开，全功能
    // F2 Max Long: 可以打开，全功能
    const model = this.data.currentModel;
    if (!model || (model.type !== 'Max' && model.type !== 'Max Long')) {
      return; // Pro 机型点击无效
    }

    this.setData({ showSettingsModal: true });
    this.showToast();
  },

  closeSettings() {
    this.setData({ showSettingsModal: false });
    // 关闭时清除 Toast
    this.setData({ toastClass: '' });
  },

  // Toast 动画控制
  showToast() {
    // 重置动画
    this.setData({ toastClass: '' }, () => {
      setTimeout(() => {
        this.setData({ toastClass: 'pop' });
      }, 300);
      
      // 3.5秒后自动消失
      setTimeout(() => {
        this.setData({ toastClass: '' });
      }, 3800);
    });
  },

  // ===============================================
  // 修复：滑块点击逻辑 (点左去左，点右去右)
  // ===============================================
  handleMagClick(e) {
    const key = e.currentTarget.dataset.key;
    // 获取用户点的是左边还是右边 (通过 wxml data-val 传入)
    // 注意：使用 e.target 因为点击的是子元素 click-pad
    const targetVal = e.target.dataset.val;

    // 如果没点到热区，或者没有 targetVal，则忽略
    if (!targetVal) return;

    let newState = { ...this.data.settingState };
    newState[key] = targetVal;
    
    this.setData({ settingState: newState });
    
    // 🔴 F2 MAX：高级配置发送对应数据
    const currentModel = this.data.currentModel;
    const isF2Max = currentModel && 
                    currentModel.name && currentModel.name.includes('F2') && 
                    (currentModel.type === 'Max' || currentModel.type === 'Max Long');
    const isF1Max = currentModel && 
                    currentModel.name && currentModel.name.includes('F1') && 
                    currentModel.type === 'Max';
    
    if (isF2Max && this.data.isConnected) {
      let sendText = '';
      
      if (key === 'faultDetect') {
        // 主动故障检测
        if (targetVal === 'left') {
          sendText = '开机自检';
        } else if (targetVal === 'right') {
          sendText = '关闭自检';
        }
      } else if (key === 'powerOn') {
        // 开机位置
        if (targetVal === 'left') {
          sendText = '开机上翻';
        } else if (targetVal === 'right') {
          sendText = '开机下翻';
        }
      } else if (key === 'shutdown') {
        // 关机位置
        if (targetVal === 'left') {
          sendText = '关闭收回';
        } else if (targetVal === 'right') {
          sendText = '关闭收回'; // 用户要求保持也是"关闭收回"
        }
      }
      
      if (sendText) {
        console.log(`📤 [蓝牙] F2 MAX 发送"${sendText}"`);
        this.sendData(sendText);
      }
    }
    
    // 🔴 F1 MAX：高级配置发送对应数据
    if (isF1Max && this.data.isConnected) {
      let sendText = '';
      
      if (key === 'powerOn') {
        // 开机位置
        if (targetVal === 'left') {
          sendText = '开机上翻';
        } else if (targetVal === 'right') {
          sendText = '开机下翻';
        }
      } else if (key === 'shutdown') {
        // 关机位置
        if (targetVal === 'left') {
          sendText = '打开收回'; // 用户要求"收回"=打开收回
        } else if (targetVal === 'right') {
          sendText = '关闭收回'; // 用户要求"保持"=关闭收回
        }
      }
      
      if (sendText) {
        console.log(`📤 [蓝牙] F1 MAX 发送"${sendText}"`);
        this.sendData(sendText);
      }
    }
    
    // 震动反馈
    wx.vibrateShort({ type: 'light' });
    console.log(`Setting ${key} set to: ${targetVal}`);
  },

  // 【新增】打开全新产品提示 & 开始倒计时
  openNewProductHint() {
    this.setData({ 
      showNewProductHint: true,
      newProductBtnLocked: true,
      newProductBtnText: '知道了 (2s)'
    });

    let timeLeft = 2;
    const timer = setInterval(() => {
      timeLeft--;
      if (timeLeft > 0) {
        this.setData({ newProductBtnText: `知道了 (${timeLeft}s)` });
      } else {
        clearInterval(timer);
        this.setData({ 
          newProductBtnLocked: false,
          newProductBtnText: '知道了'
        });
      }
    }, 1000);
  },

  // 【新增】关闭全新产品提示
  closeNewProductHint() {
    if (this.data.newProductBtnLocked) return; // 锁定中不可点
    this.setData({ showNewProductHint: false });
    // 🔴 记录到本地存储，表示已经弹过，下次不再弹
    wx.setStorageSync('hasShownNewProductHint_F1', true);
  },

  // ===============================================
  // 🔴 所有弹窗的倒计时函数
  // ===============================================

  // 密码弹窗倒计时
  openPasswordModal() {
    this.setData({ 
      showPasswordModal: true, 
      passwordInput: '',
      passwordBtnLocked: true,
      passwordBtnText: '确认 (2s)'
    });
    
    let timeLeft = 2;
    const timer = setInterval(() => {
      timeLeft--;
      if (timeLeft > 0) {
        this.setData({ passwordBtnText: `确认 (${timeLeft}s)` });
      } else {
        clearInterval(timer);
        this.setData({ 
          passwordBtnLocked: false,
          passwordBtnText: '确认'
        });
      }
    }, 1000);
  },

  // 教程弹窗倒计时
  startTutorialCountdown() {
    this.setData({ 
      tutorialBtnLocked: true,
      tutorialBtnText: '知道了 (2s)'
    });
    
    let timeLeft = 2;
    const timer = setInterval(() => {
      timeLeft--;
      if (timeLeft > 0) {
        this.setData({ tutorialBtnText: `知道了 (${timeLeft}s)` });
      } else {
        clearInterval(timer);
        this.setData({ 
          tutorialBtnLocked: false,
          tutorialBtnText: '知道了'
        });
      }
    }, 1000);
  },

  // 关钥匙弹窗倒计时
  startKeyCountdown() {
    this.setData({ 
      keyBtnLocked: true,
      keyBtnText: '确认 (2s)'
    });
    
    let timeLeft = 2;
    const timer = setInterval(() => {
      timeLeft--;
      if (timeLeft > 0) {
        this.setData({ keyBtnText: `确认 (${timeLeft}s)` });
      } else {
        clearInterval(timer);
        this.setData({ 
          keyBtnLocked: false,
          keyBtnText: '确认'
        });
      }
    }, 1000);
  },

  // 打开角度提示弹窗倒计时
  startAngleHintCountdown() {
    this.setData({ 
      angleHintBtnLocked: true,
      angleHintBtnText: '知道了 (2s)'
    });
    
    let timeLeft = 2;
    const timer = setInterval(() => {
      timeLeft--;
      if (timeLeft > 0) {
        this.setData({ angleHintBtnText: `知道了 (${timeLeft}s)` });
      } else {
        clearInterval(timer);
        this.setData({ 
          angleHintBtnLocked: false,
          angleHintBtnText: '知道了'
        });
      }
    }, 1000);
  },

  // ===============================================
  // 🔴 调整按钮滑动逻辑
  // ===============================================
  
  // 滑动开始
  onAdjustSlideStart(e) {
    // 只在折叠模式下生效
    if (this.data.editType !== 'fold') return;
    
    this.setData({
      adjustTouchStartY: e.touches[0].clientY,
      adjustHasMoved: false // 标记是否发生了滑动
    });
  },

  // 滑动移动
  onAdjustSlideMove(e) {
    // 只在折叠模式下生效
    if (this.data.editType !== 'fold') return;
    
    const currentY = e.touches[0].clientY;
    const startY = this.data.adjustTouchStartY;
    let moveY = currentY - startY;

    // 标记已发生滑动（移动超过 5px 才算滑动）
    if (Math.abs(moveY) > 5) {
      this.setData({ adjustHasMoved: true });
    }

    // 1. 只有往上滑才生效 (moveY < 0)
    // 如果往下滑，强制归0
    if (moveY > 0) moveY = 0;
    
    // 2. 限制最大上滑距离 (比如 120px)
    if (moveY < -120) moveY = -120;

    // 3. 激活阈值：滑过 -60px 就显示归零
    const isActive = moveY < -60;

    this.setData({
      adjustSlideOffset: moveY,
      adjustSlideActive: isActive
    });
  },

  // 滑动结束
  onAdjustSlideEnd(e) {
    // 只在折叠模式下生效
    if (this.data.editType !== 'fold') return;
    
    const currentOffset = this.data.adjustSlideOffset;
    const hasMoved = this.data.adjustHasMoved;
    
    // 如果没滑动（只是点击），不处理，让点击事件触发
    if (!hasMoved) {
      this.setData({ adjustHasMoved: false });
      return;
    }
    
    // 锁定阈值：松手时，如果滑过了 -60px，就停在空中显示归零
    const lockThreshold = -60;
    const lockPosition = -100; // 停在 -100px 的高度

    if (currentOffset < lockThreshold) {
      // 停住，显示归零
      this.setData({
        adjustSlideOffset: lockPosition,
        adjustSlideActive: true
      });
    } else {
      // 没滑到位，弹回去
      this.setData({
        adjustSlideOffset: 0,
        adjustSlideActive: false
      });
    }
    
    // 重置滑动标记
    this.setData({ adjustHasMoved: false });
  },

  // 🔴 调整按钮点击事件（当没有滑动时触发）
  onAdjustClick(e) {
    // 只在折叠模式下生效
    if (this.data.editType !== 'fold') return;
    
    // 如果发生了滑动，不触发点击
    if (this.data.adjustHasMoved) {
      return;
    }
    
    // 🔴 直接调用 handleAdjust，发送"调整折叠角度"
    this.handleAdjust({ currentTarget: { dataset: { action: 'adjust', mode: 'fold' } } });
  },

  // 重置滑动状态（点击归零后调用）
  resetAdjustSlider() {
    this.setData({
      adjustSlideOffset: 0,
      adjustSlideActive: false
    });
  },

  // ===============================================
  // 蓝牙发送数据方法（基于你提供的逻辑）
  // ===============================================
  
  // 字符串转ArrayBuffer（UTF-8编码）
  stringToArrayBuffer(str) {
    const bytes = [];
    for (let i = 0; i < str.length; i++) {
      const charCode = str.charCodeAt(i);
      if (charCode < 0x80) {
        bytes.push(charCode);
      } else if (charCode < 0x800) {
        bytes.push(0xc0 | (charCode >> 6));
        bytes.push(0x80 | (charCode & 0x3f));
      } else if (charCode < 0xd800 || charCode >= 0xe000) {
        bytes.push(0xe0 | (charCode >> 12));
        bytes.push(0x80 | ((charCode >> 6) & 0x3f));
        bytes.push(0x80 | (charCode & 0x3f));
      } else {
        i++;
        const charCode2 = str.charCodeAt(i);
        const codePoint = 0x10000 + (((charCode & 0x3ff) << 10) | (charCode2 & 0x3ff));
        bytes.push(0xf0 | (codePoint >> 18));
        bytes.push(0x80 | ((codePoint >> 12) & 0x3f));
        bytes.push(0x80 | ((codePoint >> 6) & 0x3f));
        bytes.push(0x80 | (codePoint & 0x3f));
      }
    }
    return new Uint8Array(bytes).buffer;
  },

  // 核心发送方法
  writeBleData(arrayBuffer) {
    if (!this.ble || !this.ble.device || !this.ble.characteristicId2) {
      console.log('❌ [蓝牙] 设备未连接或特征值未找到');
      return;
    }

    wx.writeBLECharacteristicValue({
      deviceId: this.ble.device.deviceId,
      serviceId: this.ble.serviceId,
      characteristicId: this.ble.characteristicId2,
      value: arrayBuffer,
      success: (res) => {
        console.log('✅ [蓝牙] 发送成功:', res.errMsg);
      },
      fail: (err) => {
        console.log('❌ [蓝牙] 发送失败:', err.errMsg);
      }
    });
  },

  // 发送字符串数据
  sendData(text) {
    const arrayBuffer = this.stringToArrayBuffer(text);
    this.writeBleData(arrayBuffer);
  },

  // ===============================================
  // 🔴 统一的自定义弹窗方法（替换所有 wx.showModal 和 wx.showToast）
  // ===============================================
  
  // 🔴 统一的自定义 Toast 方法（替换所有 wx.showToast）
  _showCustomToast(title, icon = 'none', duration = 2000) {
    // 尝试获取组件，最多重试3次
    const tryShow = (attempt = 0) => {
      const toast = this.selectComponent('#custom-toast');
      if (toast && toast.showToast) {
        toast.showToast({ title, icon, duration });
      } else if (attempt < 3) {
        // 延迟重试
        setTimeout(() => tryShow(attempt + 1), 100 * (attempt + 1));
      } else {
        // 最终降级
        console.warn('[scan] custom-toast 组件未找到，使用降级方案');
        wx.showToast({ title, icon, duration });
      }
    };
    tryShow();
  },

  // 🔴 统一的自定义 Modal 方法（替换所有 wx.showModal）
  _showCustomModal(options) {
    // 尝试获取组件，最多重试3次
    const tryShow = (attempt = 0) => {
      const toast = this.selectComponent('#custom-toast');
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
        console.warn('[scan] custom-toast 组件未找到，使用降级方案');
        wx.showModal(options);
      }
    };
    tryShow();
  },
});