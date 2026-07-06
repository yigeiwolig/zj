// patched by assistant
// pages/scan/scan.js

// ==========================================
// 1. 瀹氫箟 Base64 鍥炬爣璧勬簮 (纭繚绋冲畾鏄剧ず)
// ==========================================
const iconLock = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMxQzFDMUUiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cmVjdCB4PSIzIiB5PSIxMSIgd2lkdGg9IjE4IiBoZWlnaHQ9IjExIiByeD0iMiIgcnk9IjIiPjwvcmVjdD48cGF0aCBkPSJNNyAxMVY3YTUgNSAwIDAgMSAxMCAwdjQiPjwvcGF0aD48L3N2Zz4=';

// 绠ご (鎵撳紑瑙掑害)
const iconArrowUp = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMxQzFDMUUiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMTggMTUgMTIgOSA2IDE1Ii8+PC9zdmc+';

// 缈诲紑锛堢墝闈笅鏀撅級
const iconFlapOpen = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMxQzFDMUUiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNNSA3aDE0Ii8+PHBhdGggZD0iTTggN2wyIDExaDRsMi0xMSIvPjxwYXRoIGQ9Ik0xMiAxOHY0Ii8+PC9zdmc+';

// 鏀惰捣锛堢墝闈㈡敹鍥炶创鍚堬級
const iconFlapFold = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaZWlnaHQ9IjI0IiB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzFDMUMxRSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik01IDdoMTQiLz48cGF0aCBkPSJNMTIgNHY0Ii8+PHBhdGggZD0ibTkgNi41IDMgLTMgMyAzIi8+PHBhdGggZD0iTTggN2g4djEyaC04eiIvPjwvc3ZnPg==';

// 鏍″噯 (姘村钩绾?绠ご)
const iconCali = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMxRDFEMUYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMjEgMTJhOSA5IDAgMCAwLTktOSA5Ljc1IDkuNzUgMCAwIDAtNi43NCAyLjc0TDMgOCIvPjxwYXRoIGQ9Ik0zIDN2NWg1Ii8+PHBhdGggZD0iTTMgMTJhOSA5IDAgMCAwIDkgOSA5Ljc1IDkuNzUgMCAwIDAgNi43NC0yLjc0TDIxIDE2Ii8+PHBhdGggZD0iTTE2IDIxaDV2LTUiLz48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIyIiBmaWxsPSIjMUQxRDFGIiBzdHJva2U9Im5vbmUiLz48L3N2Zz4=';

// 璁剧疆 (绠€绾﹂娇杞?
const iconGear = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMxRDFEMUYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMTIuMjIgMkgxMS43OEEyIDIgMCAwIDAgOS43OCA0LjE4VjQuMzZBMiAyIDAgMCAxIDguNzggNi4wOUw4LjM1IDYuMzRBMiAyIDAgMCAxIDYuMzUgNi4zNEw2LjIgNi4yNkEyIDIgMCAwIDAgMy40NyA2Ljk5TDMuMjUgNy4zN0EyIDIgMCAwIDAgMy45OCAxMC4xTDQuMTMgMTAuMkEyIDIgMCAwIDEgNS4xMyAxMS45MlYxMi40M0EyIDIgMCAwIDEgNC4xMyAxNC4xNUwzLjk4IDE0LjI1QTIgMiAwIDAgMCAzLjI1IDE2Ljk4TDMuNDcgMTcuMzZBMiAyIDAgMCAwIDYuMiAxOC4wOUw2LjM1IDE4LjAxQTIgMiAwIDAgMSA4LjM1IDE4LjAxTDguNzggMTguMjZBMiAyIDAgMCAxIDkuNzggMTkuOThWMjAuMTZBMiAyIDAgMCAwIDExLjc4IDIySDEyLjIyQTIgMiAwIDAgMCAxNC4yMiAxOS44MlYxOS42NGEyIDIgMCAwIDEgMS0xLjczTDE1LjY1IDE3LjY2QTIgMiAwIDAgMSAxNy42NSAxNy42NkwxNy44IDE3Ljc0QTIgMiAwIDAgMCAyMC41MyAxNy4wMUwyMC43NSAxNi42M0EyIDIgMCAwIDAgMjAuMDIgMTMuOUwyMC43NSAxNi42M0EyIDIgMCAwIDAgMjAuMDIgMTMuOUwyMC4xMyAxMy44QTIgMiAwIDAgMSAxOS4xMyAxMi4wOFYxMS41N0EyIDIgMCAwIDEgMjAuMTMgOS44NUwyMC4yOCA5Ljc1QTIgMiAwIDAgMCAyMS4wMSA3LjAyTDIwLjc5IDYuNjRBMiAyIDAgMCAwIDE4LjA2IDUuOTFMMTcuOTEgNi4wMUEyIDIgMCAwIDEgMTUuOTEgNC4yOUwxNS40OCA0LjA0QTIgMiAwIDAgMSAxNC40OCAyLjMyVjIuMTRBMiAyIDAgMCAwIDEyLjIyIDJaIi8+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMyIvPjwvc3ZnPg==';

// 钃濈墮灏忓浘鏍?(鐧借壊)
const iconBtSmall = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cG9seWxpbmUgcG9pbnRzPSI2LjUgNi41IDE3LjUgMTcuNSAxMiAyMyAxMiAxIDE3LjUgNi41IDYuNSAxNy41Ij48L3BvbHlsaW5lPjwvc3ZnPg==';

// 楹﹀厠椋?(璇煶鎺у埗)
const iconMic = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMxQzFDMUUiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMTIgMmEzIDMgMCAwIDAtMyAzdjdhMyAzIDAgMCAwIDYgMFY1YTMzIDAgMCAwLTEyLTNaIi8+PHBhdGggZD0iTTE5IDEwdjJhNyA3IDAgMCAxLTE0IDB2LTIiLz48bGluZSB4MT0iMTIiIHgyPSIxMiIgeTE9IjE5IiB5Mj0iMjIiLz48L3N2Zz4=';

// 閲嶇疆鍥炬爣 (鍦嗗舰绠ご)
const iconReset = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMxQzFDMUUiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMyAxMkExMiAxMiAwIDAgMSAxNSA0LjA0VjFhMSAxIDAgMCAxIDEuNzA3LS43MDdsNCA0YTEgMSAwIDAgMSAwIDEuNDE0bC00IDRhMSAxIDAgMCAxLTEuNzA3LS43MDdWOC4wNEE5IDkgMCAwIDAgMyAxMkgzWiIvPjxwYXRoIGQ9Ik0yMSAxMkE5IDkgMCAwIDAgOSA4LjA0VjExYTEgMSAwIDAgMS0xLjcwNy43MDdsLTQtNGExIDEgMCAwIDEgMC0xLjQxNGw0LTRhMSAxIDAgMCAxIDEuNzA3LjcwN1Y0LjA0QTEyIDEyIDAgMCAxIDIxIDEySDIxWiIvPjwvc3ZnPg==';

// 灏忛娇杞浘鏍?(鐢ㄤ簬楂樼骇璁剧疆)
const iconGearSmall = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMxQzFDMUUiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIyLjUiLz48cGF0aCBkPSJNMTIuNzUgNS41YTEuNzUgMS43NSAwIDAgMSAxLjUgMHYxLjVhMS43NSAxLjc1IDAgMCAxLTEuNSAwdi0xLjVaIi8+PHBhdGggZD0iTTE4LjUgMTJhMS43NSAxLjc1IDAgMCAxLTEuNSAxLjV2MS41YTEuNzUgMS43NSAwIDAgMSAxLjUgMHYtMS41WiIvPjxwYXRoIGQ9Ik0xMS4yNSAxOC41YTEuNzUgMS43NSAwIDAgMSAxLjUgMHYxLjVhMS43NSAxLjc1IDAgMCAxLTEuNSAwdi0xLjVaIi8+PHBhdGggZD0iTTUuNSAxMmExLjc1IDEuNzUgMCAwIDEgMS41LTEuNVY5YTEuNzUgMS43NSAwIDAgMS0xLjUgMHYxLjVaIi8+PHBhdGggZD0iTTEyLjc1IDE4LjVhMS43NSAxLjc1IDAgMCAxIDEuNSAwdjEuNWExLjc1IDEuNzUgMCAwIDEtMS41IDB2LTEuNVoiLz48cGF0aCBkPSJNNS41IDEyYTEuNzUgMS43NSAwIDAgMSAxLjUgMS41VjE1YTEuNzUgMS43NSAwIDAgMS0xLjUgMHYtMS41WiIvPjxwYXRoIGQ9Ik0xOC41IDEyYTEuNzUgMS43NSAwIDAgMS0xLjUtMS41VjlhMS43NSAxLjc1IDAgMCAxIDEuNSAwdjEuNVoiLz48L3N2Zz4=';

// 杩炴帴鍥炬爣 (涓婚〉澶ц兌鍥婄敤)
const iconConnect = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTUgN0gxN0MyMC4zMTM3IDcgMjMgOS42ODYyOSAyMyAxM0MyMyAxNi4zMTM3IDIwLjMxMzcgMTkgMTcgMTlIMTVNOCAxN0g2QzIuNjg2MjkgMTcgMCAxNC4zMTM3IDAgMTNDMCA5LjY4NjI5IDIuNjg2MjkgNyA2IDdIOE04IDEzSDE2IiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMi41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48L3N2Zz4=';

// 渚ц竟鍥炬爣 (鎶樺彔鍔ㄧ敾鐢?
const iconSide = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE0MCIgdmlld0JveD0iMCAwIDIwMCAxNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgICA8IS0tIExlZnQgU3RpY2sgLS0+CiAgICA8cmVjdCB4PSI4NSIgeT0iMjAiIHdpZHRoPSIxMiIgaGVpZ2h0PSIxMDAiIHJ4PSI2IiBmaWxsPSIjMUMxQzFFIiAvPgogICAgPCEtLSBSaWdodCBTdGljayAtLT4KICAgIDxyZWN0IHg9IjEwNSIgeT0iMjAiIHdpZHRoPSIxMiIgaGVpZ2h0PSIxMDAiIHJ4PSI2IiBmaWxsPSIjMUMxQzFFIiAvPgo8L3N2Zz4=';

// ==========================================
// 2. 璁惧妯″瀷璧勬簮 (F1/F2 Pro/Max)
// ==========================================
const iconF1Pro = '/images/mt-f1-pro.svg';
const iconF1Max = '/images/mt-f1-max.svg';
const iconF1ProMax = '/images/mt-f1-pro-max.svg';
const iconF2Pro = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE0MCIgdmlld0JveD0iMCAwIDIwMCAxNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTE1IDMwIEgxOTAgQzE5NSAzMCAxOTUgMzUgMTk1IDM1IFY0OCBDMTk1IDUzIDE5MCA1MyAxOTAgNTMgSDEyMSBWNjkgSDEyMi41IEMxMjcuNSA2OSAxMjcuNSA3NCAxMjcuNSA3NCBWOTQgQzEyNy41IDk5IDEyMi41IDk5IDEyMi41IDk5IEg4Mi41IEM3Ny41IDk5IDc3LjUgOTQgNzcuNSA5NCBWNzQgQzc3LjUgNjkgODIuNSA2OSA4Mi41IDY5IEg4NCBWNTMgSDE1IEMxMCA1MyAxMCA0OCAxMCA0OCBWMzUgQzEwIDMwIDE1IDMwIDE1IDMwIFoiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzFDMUMxRSIgc3Ryb2tlLXdpZHRoPSIzIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PHJlY3QgeD0iMzYiIHk9IjM3IiB3aWR0aD0iMjYiIGhlaWdodD0iOCIgcng9IjUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzFDMUMxRSIgc3Ryb2tlLXdpZHRoPSIzIi8+PHJlY3QgeD0iMTQ1IiB5PSIzOCIgd2lkdGg9IjI1IiBoZWlnaHQ9IjgiIHJ4PSI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMxQzFDMUUiIHN0cm9rZS13aWR0aD0iMyIvPjx0ZXh0IHg9IjEwMi41IiB5PSI3MiIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXdlaWdodD0iOTAwIiBmb250LXNpemU9IjE0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjMUMxQzFFIj48dHNwYW4geD0iMTAyLjUiIGR5PSIwIj5NPC90c3Bhbj48dHNwYW4geD0iMTAyLjUiIGR5PSIxNiI+VDwvdHNwYW4+PC90ZXh0Pjwvc3ZnPg==';
const iconF2Max = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE0MCIgdmlld0JveD0iMCAwIDIwMCAxNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTE1IDMwIEgxOTAgQzE5NSAzMCAxOTUgMzUgMTk1IDM1IFY0OCBDMTk1IDUzIDE5MCA1MyAxOTAgNTMgSDEyMSBWNjkgSDEyMi41IEMxMjcuNSA2OSAxMjcuNSA3NCAxMjcuNSA3NCBWOTQgQzEyNy41IDk5IDEyMi41IDk5IDEyMi41IDk5IEg4Mi41IEM3Ny41IDk5IDc3LjUgOTQgNzcuNSA5NCBWNzQgQzc3LjUgNjkgODIuNSA2OSA4Mi41IDY5IEg4NCBWNTMgSDE1IEMxMCA1MyAxMCA0OCAxMCA0OCBWMzUgQzEwIDMwIDE1IDMwIDE1IDMwIFoiIGZpbGw9IiMxQzFDMUUiLz48cmVjdCB4PSIzNiIgeT0iMzciIHdpZHRoPSIyNiIgaGVpZ2h0PSI4IiByeD0iNSIgZmlsbD0iI0ZGRkZGRiIvPjxyZWN0IHg9IjE0NSIgeT0iMzgiIHdpZHRoPSIyNSIgaGVpZ2h0PSI4IiByeD0iNCIgZmlsbD0iI0ZGRkZGRiIvPjx0ZXh0IHg9IjEwMi41IiB5PSI3MiIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXdlaWdodD0iOTAwIiBmb250LXNpemU9IjE0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjRkZGRkZGIj48dHNwYW4geD0iMTAyLjUiIGR5PSIwIj5NPC90c3Bhbj48dHNwYW4geD0iMTAyLjUiIGR5PSIxNiI+VDwvdHNwYW4+PC90ZXh0Pjwvc3ZnPg==';
// F2 MAX Long 鍥炬爣锛堢嫭绔嬶級
const iconF2MaxLong = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTE1IDI5SDE5MEMxOTUgMjkgMTk1IDM0LjE0NjQgMTk1IDM0LjE0NjRWNDcuNTI2OUMxOTUgNTIuNjczMiAxOTAgNTIuNjczMiAxOTAgNTIuNjczMkgxMjFWMTEwLjVIMTIyLjVDMTMwLjg0NSAxMTAuNSAxMzAuODQ1IDExNy40NiAxMzAuODQ1IDExNy40NlYxMzcuNzI5QzEzMC44NDUgMTQ0LjUgMTIyLjUgMTQ0LjUgMTIyLjUgMTQ0LjVIODIuNUM3NC4xNTQ1IDE0NC41IDc0LjE1NDUgMTM3LjcyOSA3NC4xNTQ1IDEzNy43MjlWMTE3LjQ2Qzc0LjE1NDUgMTEwLjUgODIuNSAxMTAuNSA4Mi41IDExMC41VjUyLjY3MzJIMTVDMTAgNTIuNjczMiAxMCA0Ny41MjY5IDEwIDQ3LjUyNjlWMzQuMTQ2NEMxMCAyOSAxNSAyOSAxNSAyOVoiIGZpbGw9IiMxQzFDMUUiLz48cGF0aCBkPSJNNTYgMzdINDBDMzcuMjM4NiAzNyAzNSAzOC43OTA5IDM1IDQxQzM1IDQzLjIwOTEgMzcuMjM4NiA0NSA0MCA0NUg1NkM1OC43NjE0IDQ1IDYxIDQzLjIwOTEgNjEgNDFDNjEgMzguNzkwOSA1OC43NjE0IDM3IDU2IDM3WiIgZmlsbD0id2hpdGUiLz48cGF0aCBkPSJNMTY1IDM3SDE0OUMxNDYuMjM5IDM3IDE0NCAzOC43OTA5IDE0NCA0MUMxNDQgNDMuMjA5MSAxNDYuMjM5IDQ1IDE0OSA0NUgxNjVDMTY3Ljc2MSA0NSAxNzAgNDMuMjA5MSAxNzAgNDFDMTcwIDM4Ljc5MDkgMTY3Ljc2MSAzNyAxNjUgMzdaIiBmaWxsPSJ3aGl0ZSIvPjxwYXRoIGQ9Ik04NCA4N0gxMjEiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMi41IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz48cGF0aCBkPSJNMTAyLjUgNjRDMTA0LjQzMyA2NCAxMDYgNjIuNDMzIDEwNiA2MC41QzEwNiA1OC41NjcgMTA0LjQzMyA1NyAxMDIuNSA1N0MxMDAuNTY3IDU3IDk5IDU4LjU2NyA5OSA2MC41Qzk5IDYyLjQzMyAxMDAuNTY3IDY0IDEwMi41IDY0WiIgZmlsbD0id2hpdGUiLz48cGF0aCBkPSJNMTAyLjUgODJDMTA0LjQzMyA4MiAxMDYgODAuNDMzIDEwNiA3OC41QzEwNiA3Ni41NjcgMTA0LjQzMyA3NSAxMDIuNSA3NUMxMDAuNTY3IDc1IDk5IDc2LjU2NyA5OSA3OC41Qzk5IDgwLjQzMyAxMDAuNTY3IDgyIDEwMi41IDgyWiIgZmlsbD0id2hpdGUiLz48cGF0aCBkPSJNMTAyLjUgMTAxQzEwNC40MzMgMTAxIDEwNiA5OS40MzMgMTA2IDk3LjVDMTA2IDk1LjU2NyAxMDQuNDMzIDk0IDEwMi41IDk0QzEwMC41NjcgOTQgOTkgOTUuNTY3IDk5IDk3LjVDOTkgOTkuNDMzIDEwMC41NjcgMTAxIDEwMi41IDEwMVoiIGZpbGw9IndoaXRlIi8+PHBhdGggZD0iTTkwLjMzOTggMTE5LjA5MUg5My4xODQyTDk2LjE4ODUgMTI2LjQySDk2LjMxNjNMOTkuMzIwNiAxMTkuMDkxSDEwMi4xNjVWMTMwSDk5LjkyNzhWMTIyLjlIOTkuODM3M0w5Ny4wMTQxIDEyOS45NDdIOTUuNDkwN0w5Mi42Njc1IDEyMi44NzNIOTIuNTc3VjEzMEg5MC4zMzk4VjExOS4wOTFaTTEwNy4xMjIgMTIwLjk5M1YxMTkuMDkxSDExNi4wODFWMTIwLjk5M0gxMTIuNzQxVjEzMEgxMTAuNDYxVjEyMC45OTNIMTA3LjEyMloiIGZpbGw9IndoaXRlIi8+PC9zdmc+';
// F2 Ultra 鍥炬爣锛圫VG 鐭㈤噺锛屼换鎰忕缉鏀炬竻鏅帮級
const iconF2Ultra = '/images/mt-f2-ultra.svg';
// F3 妯増 MT 鏁存満鏍囷細Max 瀹炲績 / Pro 绾挎潯锛堟簮鏂囦欢 images/mt-f3-machine-*.svg锛屽彲鐩存帴鏇挎崲涓轰綘鐨勫師 SVG锛?const iconF3Pro = '/images/mt-f3-machine-pro.svg';
const iconF3Max = '/images/mt-f3-machine-max.svg';
const iconCanLearn = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE0MCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3QgeD0iMjAiIHk9IjMwIiB3aWR0aD0iMTYwIiBoZWlnaHQ9IjEwMCIgcng9IjE2IiBzdHJva2U9IiMxQzFDMUUiIHN0cm9rZS13aWR0aD0iNCIvPjx0ZXh0IHg9IjEwMCIgeT0iNzAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIzNiIgZm9udC13ZWlnaHQ9IjcwMCIgZmlsbD0iIzFEMDFDRiIgdGV4dC1hbmNob3I9Im1pZGRsZSI+Q0FOPC90ZXh0Pjx0ZXh0IHg9IjEwMCIgeT0iMTA4IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZTdiviIgZmlsbD0iIzZCNzI4MCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+T0JEPC90ZXh0Pjwvc3ZnPg==';

// 灏忓菇鐏靛浘鏍囷紙鐫佺溂 - 寮€鍚殣钄芥ā寮忥級
const iconGhostOpen = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMjAgMTFWMTlDMjAgMjAuNiAxOCAyMS41IDE3IDIwLjVMMTYgMTkuNUwxNCAyMS41QzEzLjIgMjIuMyAxMiAyMS44IDEyIDIwLjhWMjAuOEMxMiAyMS44IDEwLjggMjIuMyAxMCAyMS41TDggMTkuNUw3IDIwLjVDNiAyMS41IDQgMjAuNiA0IDE5VjExQzQgNi41OCA3LjU4IDMgMTIgM0MxNi40MiAzIDIwIDYuNTggMjAgMTFaIiBmaWxsPSJ3aGl0ZSIgc3Ryb2tlPSJibGFjayIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48Y2lyY2xlIGN4PSI5IiBjeT0iMTEiIHI9IjEuNSIgZmlsbD0iYmxhY2siLz48Y2lyY2xlIGN4PSIxNSIgY3k9IjExIiByPSIxLjUiIGZpbGw9ImJsYWNrIi8+PC9zdmc+';

// 灏忓菇鐏靛浘鏍囷紙闂溂 - 閫€鍑洪殣钄芥ā寮忥級
const iconGhostClose = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMjAgMTFWMTlDMjAgMjAuNiAxOCAyMS41IDE3IDIwLjVMMTYgMTkuNUwxNCAyMS41QzEzLjIgMjIuMyAxMiAyMS44IDEyIDIwLjhWMjAuOEMxMiAyMS44IDEwLjggMjIuMyAxMCAyMS41TDggMTkuNUw3IDIwLjVDNiAyMS41IDQgMjAuNiA0IDE5VjExQzQgNi41OCA3LjU4IDMgMTIgM0MxNi40MiAzIDIwIDYuNTggMjAgMTFaIiBmaWxsPSJ3aGl0ZSIgc3Ryb2tlPSJibGFjayIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48bGluZSB4MT0iNy41IiB5MT0iMTEiIHgyPSIxMC41IiB5Mj0iMTEiIHN0cm9rZT0iYmxhY2siIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PGxpbmUgeDE9IjEzLjUiIHkxPSIxMSIgeDI9IjE2LjUiIHkyPSIxMSIgc3Ryb2tlPSJibGFjayIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz48L3N2Zz4=';

// ==========================================
// 钃濈墮杩炴帴宸ュ叿绫?(浣犳彁渚涚殑浠ｇ爜铻嶅悎)
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
    
    // 璁惧淇℃伅
    this.device = null;
    this.lastConnectedDevice = null;
    this._manualDisconnect = false;
    this._disconnectIntentManual = false;
    this._closingConnection = false;
    this._disconnectNotified = false;
    this._closeSuppressedAt = {};
    this._connListenerSetup = false;
    this.serviceId = '';
    this.characteristicId = '';      
    this.characteristicId2 = '';     
    this.serviceIdf0 = '';
    this.characteristicId01 = '';    
    this.characteristicId02 = '';    
    
    // 鍥炶皟鍑芥暟
    this.onDeviceFound = null;       
    this.onConnecting = null;        // 鏂板锛氳繛鎺ヤ腑鍥炶皟
    this.onLinkEstablished = null;   // BLE 鐗╃悊閾捐矾宸插缓绔嬶紙鏃╀簬鏈嶅姟鍙戠幇锛?    this.onConnected = null;
    this.onConnectFailed = null;         
    this.onDisconnected = null;      
    this.onDataReceived = null;      
    this.onError = null;             
  }

  initBluetoothAdapter() {
    return new Promise((resolve, reject) => {
      // 鍏堟鏌ョ郴缁熻摑鐗欐槸鍚﹀紑鍚?      this.api.getBluetoothAdapterState({
        success: (res) => {
          if (!res.available) {
            reject(new Error('绯荤粺钃濈墮鏈紑鍚紝璇峰厛寮€鍚郴缁熻摑鐗?));
            return;
          }
          // 钃濈墮宸插紑鍚紝鍒濆鍖栭€傞厤鍣?          this.api.openBluetoothAdapter({
            success: (res) => {
              this.api.onBluetoothAdapterStateChange((res) => {
                console.log('钃濈墮閫傞厤鍣ㄧ姸鎬佸彉鍖?, res);
              });
              resolve(res);
            },
            fail: (err) => {
            // 濡傛灉鐢ㄦ埛鎷掔粷钃濈墮鎺堟潈锛屾彁绀哄幓璁剧疆涓紑鍚?            if (err && err.errMsg && err.errMsg.includes('auth deny')) {
              // 馃敶 浣跨敤鍥炶皟鏂瑰紡锛岃Page灞傚鐞嗗脊绐?              if (this.onError) {
                this.onError({ 
                  type: 'auth_deny',
                  message: '钃濈墮鏉冮檺琚嫆缁?,
                  detail: '璇峰湪绯荤粺璁剧疆涓紑鍚摑鐗欙紝骞跺厑璁稿皬绋嬪簭浣跨敤钃濈墮鍔熻兘銆?
              });
              }
            }
              if (this.onError) this.onError(err);
              reject(err);
            }
          });
        },
        fail: (err) => {
          // 濡傛灉getBluetoothAdapterState澶辫触锛岀洿鎺ュ皾璇昽penBluetoothAdapter
          // 杩欏彲鑳芥槸鍥犱负閫傞厤鍣ㄨ繕鏈垵濮嬪寲
          this.api.openBluetoothAdapter({
            success: (res) => {
              this.api.onBluetoothAdapterStateChange((res) => {
                console.log('钃濈墮閫傞厤鍣ㄧ姸鎬佸彉鍖?, res);
              });
              resolve(res);
            },
            fail: (err) => {
              // 濡傛灉鏄潈闄愰敊璇紝鎻愪緵鏇村弸濂界殑鎻愮ず
              if (err.errMsg && err.errMsg.includes('auth deny')) {
                // 馃敶 浣跨敤鍥炶皟鏂瑰紡锛岃Page灞傚鐞嗗脊绐?                if (this.onError) {
                  this.onError({ 
                    type: 'auth_deny',
                    message: '钃濈墮鍔熻兘涓嶅彲鐢?,
                    detail: '璇风‘淇濓細\n1. 绯荤粺钃濈墮宸插紑鍚痋n2. 宸叉巿鏉冨皬绋嬪簭浣跨敤钃濈墮鍔熻兘\n\n鍙湪鎵嬫満璁剧疆涓鏌ユ潈闄?
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

      // 鑷姩杩炴帴閫昏緫锛歂B寮€澶翠紭鍏?      if (!this.hasConnected && device.name && device.name.startsWith('NB')) {
        if (this.openTimer) {
          clearTimeout(this.openTimer);
          this.openTimer = null;
        }
        this.hasConnected = true;
        // 璁剧疆杩炴帴涓姸鎬?        if (this.onConnecting) this.onConnecting(device);
        this.connectDevice(device); // 鍐呴儴浼歴topScan
        return;
      }
    });
  }

  connectDevice(device) {
    // UI Loading 宸茬粡鍦?Page 灞傞潰澶勭悊浜嗭紝杩欓噷鍙鐞嗛€昏緫
    this.stopScan();
    
    return new Promise((resolve, reject) => {
      this.api.createBLEConnection({
        deviceId: device.deviceId,
        success: (res) => {
          this.device = device;
          this.lastConnectedDevice = device;
          if (device.deviceId && this._closeSuppressedAt) {
            delete this._closeSuppressedAt[device.deviceId];
          }
          this.isScanning = false;
          this._ensureConnectionStateListener();
          if (this.onLinkEstablished) this.onLinkEstablished(device);

          setTimeout(() => {
            this.discoverServices().then(() => {
              if (this.onConnected) this.onConnected(device);
              resolve(device);
            }).catch((err) => {
              console.warn('[BLE] discoverServices failed', err);
              const manual = !!this._manualDisconnect;
              this._manualDisconnect = false;
              if (this.onConnectFailed) this.onConnectFailed(err, device, { manual });
              reject(err);
            });
          }, 800);
        },
        fail: (err) => {
          this.isScanning = false;
          if (this.onConnectFailed) this.onConnectFailed(err, device, { manual: false });
          if (this.onError) this.onError(err);
          reject(err);
        }
      });
    });
  }

  _suppressCloseForDevice(deviceId) {
    if (!deviceId) return;
    this._closeSuppressedAt[deviceId] = Date.now();
  }

  _isCloseSuppressed(deviceId) {
    const t = deviceId && this._closeSuppressedAt[deviceId];
    return !!(t && (Date.now() - t) < 5000);
  }

  _notifyDisconnected(payload) {
    if (this._disconnectNotified) return;
    this._disconnectNotified = true;
    setTimeout(() => {
      this._disconnectNotified = false;
    }, 400);
    if (this.onDisconnected) this.onDisconnected(payload);
  }

  _ensureConnectionStateListener() {
    if (this._connListenerSetup) return;
    this._connListenerSetup = true;
    this.api.onBLEConnectionStateChange((res) => {
      const activeId = (this.device && this.device.deviceId)
        || (this.lastConnectedDevice && this.lastConnectedDevice.deviceId);
      if (!activeId || res.deviceId !== activeId) return;
      if (res.connected) {
        if (this._bleStateDropTimer) {
          clearTimeout(this._bleStateDropTimer);
          this._bleStateDropTimer = null;
        }
        return;
      }
      if (this._bleStateDropTimer) return;
      const disconnectedDevice = this.device
        ? { ...this.device }
        : (this.lastConnectedDevice ? { ...this.lastConnectedDevice } : null);
      const deviceId = res.deviceId;
      this._bleStateDropTimer = setTimeout(() => {
        this._bleStateDropTimer = null;
        const initiatedByUs = this._disconnectIntentManual || this._manualDisconnect;
        if (initiatedByUs || this._closingConnection || this._isCloseSuppressed(deviceId)) {
          return;
        }
        this.probeLinkAlive(deviceId).then((alive) => {
          if (alive) return;
          this._manualDisconnect = false;
          this.device = null;
          this.hasConnected = false;
          this._notifyDisconnected({
            unexpected: true,
            device: disconnectedDevice,
            source: 'state_change'
          });
        });
      }, 2800);
    });
  }

  probeLinkAlive(deviceId) {
    if (!deviceId) return Promise.resolve(false);
    if (typeof this.api.getBLEConnectionState === 'function') {
      return new Promise((resolve) => {
        this.api.getBLEConnectionState({
          deviceId,
          success: (res) => resolve(!!res.connected),
          fail: () => resolve(false)
        });
      });
    }
    return new Promise((resolve) => {
      this.api.getConnectedBluetoothDevices({
        services: this.serviceId ? [this.serviceId] : ['0000FFF0-0000-1000-8000-00805F9B34FB'],
        success: (res) => {
          const list = (res && res.devices) || [];
          resolve(list.some((d) => d.deviceId === deviceId));
        },
        fail: () => resolve(false)
      });
    });
  }

  disconnect(manual = true) {
    const wasManual = !!manual;
    this._manualDisconnect = wasManual;
    this._disconnectIntentManual = wasManual;
    const device = this.device || this.lastConnectedDevice;
    const deviceId = device && device.deviceId;
    const disconnectedDevice = device ? { ...device } : null;
    const finish = () => {
      this._closingConnection = false;
      this._disconnectIntentManual = false;
      this.device = null;
      this.hasConnected = false;
      this._manualDisconnect = false;
      this._notifyDisconnected({
        unexpected: !wasManual,
        device: disconnectedDevice,
        source: 'disconnect'
      });
    };
    if (!deviceId) {
      finish();
      return;
    }
    if (this._closingConnection) return;
    if (this._isCloseSuppressed(deviceId)) {
      finish();
      return;
    }
    this._closingConnection = true;
    this.probeLinkAlive(deviceId).then((alive) => {
      if (!alive) {
        this._suppressCloseForDevice(deviceId);
        finish();
        return;
      }
      this._suppressCloseForDevice(deviceId);
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        finish();
      };
      this.api.closeBLEConnection({
        deviceId,
        success: done,
        fail: done
      });
    });
  }

  discoverServices() {
    return new Promise((resolve, reject) => {
      if (!this.device) {
        reject(new Error('璁惧鏈繛鎺?));
        return;
      }
      this.api.getBLEDeviceServices({
        deviceId: this.device.deviceId,
        success: (res) => {
          const services = res.services || [];
          for (let i = 0; i < services.length; i++) {
            const service = services[i];
            const serviceUuid = service.uuid.toString().toUpperCase();
            if (serviceUuid.includes('FFF0')) {
              this.serviceId = service.uuid;
              this.discoverCharacteristics(this.serviceId).then(resolve).catch(reject);
              return;
            }
          }
          resolve();
        },
        fail: reject
      });
    });
  }

  discoverCharacteristics(serviceId) {
    return new Promise((resolve, reject) => {
      if (!this.device) {
        reject(new Error('璁惧鏈繛鎺?));
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
        // 濡傛灉娌℃湁鐗瑰緛鍊硷紝闈欓粯澶辫触鍗冲彲锛屼笉涓柇娴佺▼
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
             // 鎺ユ敹鏁版嵁閫昏緫
             if (this.onDataReceived) this.onDataReceived(res.value);
          });
          resolve(res);
        },
        fail: reject
      });
    });
  }
}

function isF2LongType(type) {
  return type === 'Long' || type === 'Max Long';
}

function isF1UltraType(type) {
  return type === 'Ultra' || type === 'ultra' || type === 'Pro Max';
}

function isF1UltraModel(model) {
  return !!(model && model.name === 'F1' && isF1UltraType(model.type));
}

function isMaxControlLayoutType(type) {
  return type === 'Max' || isF2LongType(type) || isF1UltraType(type) || type === 'Ultra';
}

function isF2MaxModel(model) {
  if (!model) return false;
  return model.name === 'F2' && (model.type === 'Max' || isF2LongType(model.type));
}

/** F2 Max / Long锛堥潪 Ultra锛夛細鍥轰欢鏈夌姸鎬佸寘浣嗘棤 Ultra 绾у洖璇绘牎楠岋紝婊戝潡浠嶅簲闅忕偣鍑?鐘舵€佸寘鏇存柊 */
function isF2UltraModel(model) {
  if (!model) return false;
  return model.name === 'F2' && model.type === 'Ultra';
}

function isF3MaxModel(model) {
  return !!(model && model.name === 'F3' && model.type === 'Max');
}

/** F1 Ultra / F2 Ultra / F3 Max锛氬悓娆炬帶鍒朵腑蹇冨崱鐗囷紙鐘舵€佸渾鐜€佺洿鎺с€佸嚭琛屾ā寮忕瓑锛?*/
function isMtUltraCardModel(model) {
  return isF1UltraModel(model) || isF2UltraModel(model) || isF3MaxModel(model);
}

function mtUltraCardLabel(model) {
  if (isF1UltraModel(model)) return 'F1 ULTRA';
  if (isF2UltraModel(model)) return 'F2 ULTRA';
  if (isF3MaxModel(model)) return 'F3 MAX';
  return '';
}

/** Pin2/Pin5 纭欢瀹炴椂鐩戞祴锛氫粎 F1 Ultra銆丗2 Ultra銆丗3 MAX */
function isHwPinMonitorModel(model) {
  return isMtUltraCardModel(model);
}

function buildF2ServoSpeedUi(rawSpeed) {
  const v = Math.min(100, Math.max(10, Math.round(Number(rawSpeed))));
  return { f2ServoSpeed: v };
}

function f2ServoSpeedFromTouchX(touchX, sliderLeft, sliderWidth) {
  if (!sliderWidth) return null;
  const relativeX = touchX - sliderLeft;
  const v = Math.round(10 + (relativeX / sliderWidth) * 90);
  return Math.min(100, Math.max(10, v));
}

function isF2MaxSeriesModel(model) {
  return isF2MaxModel(model) || isF2UltraModel(model);
}

function buildF2StealthUiFlags(model, settingState, bleLinked) {
  if (!isMtUltraCardModel(model)) {
    return {
      f2StealthStatusVisible: false,
      f2StealthBleControlVisible: false
    };
  }
  const linked = !!bleLinked;
  return {
    f2StealthStatusVisible: linked,
    f2StealthBleControlVisible: linked
  };
}

function resolveF2BleLinkedForUi(pageData) {
  const d = pageData || {};
  if (d.remoteAssistRole === 'admin' && d.remoteAssistSessionStatus === 'active') {
    return !!d.remoteSessionBleConnected;
  }
  return !!d.isConnected;
}

/** F1/F2 Ultra銆丗3 MAX锛堝悓娆惧浐浠讹級鍙?F2 绯伙細鎵撳紑瑙掑害璧拌嚜瀹氫箟鍔熻兘 / 瀹屽叏鎵撳紑 / 寰€涓婃敹 / 寰€涓?*/
function usesF2StyleOpenAngleBle(model) {
  if (!model) return false;
  return isMtUltraCardModel(model) || model.name === 'F2';
}

function resolveOpenAngleBtnText(model) {
  if (!model) return '90掳';
  if (isMtUltraCardModel(model)) return '90掳';
  if (model.name && model.name.includes('F1')) return '180掳';
  return '90掳';
}

function openAngleInternalToDisplayDeg(model, internal) {
  const v = parseInt(internal, 10);
  if (isNaN(v)) return 0;
  if (!model || !usesF2StyleOpenAngleBle(model)) {
    return Math.max(0, Math.min(180, v));
  }
  if (isMtUltraCardModel(model)) {
    const cap = openAngleSyncMaxDeg(model, 170);
    return Math.max(0, Math.min(cap, v));
  }
  if (v <= 90) return Math.round(v * 30 / 90);
  return Math.round(30 + (v - 90) * 60 / 70);
}

function openAngleStickRotateDeg(model, internal) {
  return 180 - openAngleInternalToDisplayDeg(model, internal);
}

function openAnglePresetBleCommand(model, angle) {
  if (!model) return '';
  if (usesF2StyleOpenAngleBle(model)) {
    if (angle === 90) return '鑷畾涔夊姛鑳?;
    if (angle === 160 || angle === 180) return '瀹屽叏鎵撳紑';
    return '';
  }
  if (model.name === 'F1') {
    if (angle === 90) return '90搴?;
    if (angle === 180) return '180搴?;
  }
  return '';
}

function openAngleSyncMaxDeg(model, fallbackMax) {
  if (isMtUltraCardModel(model)) return OPEN_ANGLE_ULTRA_SYNC_MAX_DEG;
  return fallbackMax != null ? fallbackMax : 180;
}

function openAngleSwipeMaxDeg(model, fallbackMax) {
  if (isMtUltraCardModel(model)) return OPEN_ANGLE_ULTRA_SWIPE_MAX_DEG;
  return openAngleSyncMaxDeg(model, fallbackMax);
}

function openAngleSlideBleCommands(model) {
  if (usesF2StyleOpenAngleBle(model)) {
    if (isMtUltraCardModel(model)) {
      return { increase: '寰€涓?, decrease: '寰€涓婃敹' };
    }
    return { increase: '寰€涓婃敹', decrease: '寰€涓? };
  }
  if (model.name === 'F1') {
    return { increase: '寰€涓婃敹', decrease: '寰€涓嬫斁' };
  }
  return null;
}

function isF2MaxLikeControl(model) {
  if (!model) return false;
  return isF2MaxSeriesModel(model) || isMtUltraCardModel(model);
}

function isF2MaxDelayPowerModel(model) {
  return isMtUltraCardModel(model);
}

function isF2MaxStatusBleModel(model) {
  // 鐘舵€佸寘鐩戝惉锛欶2 MAX 绯绘晠闅?楂樼骇閰嶇疆 + 闇€纭欢鐩戞祴鐨?Ultra / F3 MAX
  return isF2MaxSeriesModel(model) || isF1UltraModel(model) || isF3MaxModel(model);
}

const F2_DELAY_POWER_RISK_MINUTES = 240; // 瓒呰繃 4 灏忔椂鎵嶆彁绀哄彲鑳戒簭鐢?const F2_DELAY_POWER_RISK_SUFFIX = '銆€鍙兘鏈変簭鐢甸闄?;

function buildF2DelayPowerOffOption(label, minutes) {
  const risk = minutes > F2_DELAY_POWER_RISK_MINUTES;
  return {
    label,
    minutes,
    risk,
    pickerLabel: risk ? `${label}${F2_DELAY_POWER_RISK_SUFFIX}` : label
  };
}

const F2_DELAY_POWER_OFF_OPTIONS = [
  buildF2DelayPowerOffOption('鍏抽棴锛堝叧閽ュ寵浠呬繚鎸?0绉掞級', 0),
  buildF2DelayPowerOffOption('5鍒嗛挓锛堢郴缁熼粯璁わ級', 5),
  buildF2DelayPowerOffOption('30鍒嗛挓', 30),
  buildF2DelayPowerOffOption('1灏忔椂', 60),
  buildF2DelayPowerOffOption('2灏忔椂', 120),
  buildF2DelayPowerOffOption('4灏忔椂', 240),
  buildF2DelayPowerOffOption('12灏忔椂', 720),
  buildF2DelayPowerOffOption('48灏忔椂', 2880)
];

const F2_ULTRA_FACTORY_RESET_STEPS = [
  { text: '姝ｅ湪鍏抽棴鍫佃浆妫€娴?, data: '鍏抽棴鍫佃浆妫€娴?, sendTimes: 2, interval: 500, delayNext: 2000 },
  { text: '姝ｅ湪鍏抽棴鐢垫満妫€娴?, data: '鍏抽棴鐢垫満妫€娴?, sendTimes: 2, interval: 500, delayNext: 2000 },
  { text: '姝ｅ湪璁剧疆寮€鏈轰綅缃笂缈?, data: '寮€鏈轰笅缈?, sendTimes: 2, interval: 500, delayNext: 2000 },
  { text: '姝ｅ湪璁剧疆鍏虫満浣嶇疆鏀跺洖', data: '鎵撳紑鏀跺洖', sendTimes: 2, interval: 500, delayNext: 2000 },
  { text: '姝ｅ湪璁剧疆闅愯斀妯″紡鍏佽鎸夐挳', data: '鍏佽鎸夐挳閫€鍑?, sendTimes: 2, interval: 500, delayNext: 2000 },
  { text: '姝ｅ湪寮€鍚钩婊戞ā寮?, data: '寮€鍚钩婊?, sendTimes: 2, interval: 500, delayNext: 2000 },
  { text: '姝ｅ湪鍏抽棴鍑鸿妯″紡', data: '鍏抽棴鍑鸿', sendTimes: 2, interval: 500, delayNext: 2000 },
  { text: '姝ｅ湪璁剧疆寤舵椂鏂數涓哄叧闂?, data: '寤舵椂鏂數0', sendTimes: 2, interval: 500, delayNext: 2000 },
  { text: '姝ｅ湪鑷姩璋冨钩锛岃鐢ㄦ墜杩涜闃绘尅', data: '鑷姩璋冨钩', sendTimes: 2, interval: 500, delayNext: 0, isLeveling: true, isFinal: true }
];

/** F3 MAX 鏃犲钩婊戞ā寮忥紝鍑哄巶璁剧疆璺宠繃銆屽紑鍚钩婊戙€?*/
const F3_MAX_FACTORY_RESET_STEPS = F2_ULTRA_FACTORY_RESET_STEPS.filter(
  (step) => step.data !== '寮€鍚钩婊?
);

function f2DelayPowerOffIndexByMinutes(minutes) {
  const idx = F2_DELAY_POWER_OFF_OPTIONS.findIndex((o) => o.minutes === minutes);
  return idx >= 0 ? idx : 0;
}

const F2_TRAVEL_HOLD_OPTIONS = [
  { label: '1 鍒嗛挓', minutes: 1 },
  { label: '2 鍒嗛挓', minutes: 2 },
  { label: '3 鍒嗛挓锛堥粯璁わ級', minutes: 3 },
  { label: '5 鍒嗛挓', minutes: 5 },
  { label: '7 鍒嗛挓', minutes: 7 },
  { label: '10 鍒嗛挓', minutes: 10 },
  { label: '15 鍒嗛挓', minutes: 15 },
  { label: '20 鍒嗛挓', minutes: 20 },
  { label: '30 鍒嗛挓', minutes: 30 }
];

const F2_TRAVEL_DURATION_OPTIONS = [
  { label: '3 灏忔椂', hours: 3 },
  { label: '6 灏忔椂', hours: 6 },
  { label: '12 灏忔椂锛堥粯璁わ級', hours: 12 },
  { label: '24 灏忔椂', hours: 24 },
  { label: '48 灏忔椂', hours: 48 }
];

const F2_TRAVEL_KEYOFF_OPTIONS = [
  { label: '淇濇寔锛堝叧閽ュ寵涓嶅姩锛屽紑閽ュ寵涓嬬炕锛?, retract: false, cmd: '鍑鸿閽ュ寵淇濇寔' },
  { label: '鏀跺洖锛堝叧閽ュ寵鏀惰捣锛屽紑閽ュ寵涓嬬炕锛?, retract: true, cmd: '鍑鸿閽ュ寵鏀跺洖' }
];

function f2TravelKeyOffIndexByRetract(retract) {
  const idx = F2_TRAVEL_KEYOFF_OPTIONS.findIndex((o) => o.retract === !!retract);
  return idx >= 0 ? idx : 0;
}

function f2TravelHoldIndexByMin(minutes) {
  const idx = F2_TRAVEL_HOLD_OPTIONS.findIndex((o) => o.minutes === minutes);
  return idx >= 0 ? idx : 2;
}

function f2TravelDurationIndexByHours(hours) {
  const idx = F2_TRAVEL_DURATION_OPTIONS.findIndex((o) => o.hours === hours);
  return idx >= 0 ? idx : 2;
}

// 钃濈墮鍐欏叆闃熷垪锛氫笂涓€鏉″啓鎴愬姛鍚庡啀绛?gap 鎵嶅彂涓嬩竴鏉★紝閬垮厤涓插彛绮樺寘瀵艰嚧鎸囦护涔辩爜
const BLE_SEND_GAP_MS = 320;
const BLE_ANGLE_STEP_GAP_MS = 300;
const OPEN_ANGLE_TICKS_PER_GESTURE = 3;
const OPEN_ANGLE_RAPID_SWIPE_WINDOW_MS = 2500;
/** 棰勮鐐瑰嚮鍚?UI 鍋囧悓姝ユ椂闀匡紙涓嶈璁惧瑙掑害锛?*/
const OPEN_ANGLE_FAKE_SYNC_MS = 750;
/** 娉㈣疆璺熸墜锛氭墜鎸?px 鈫?杞ㄩ亾 px锛? 鈮?1:1锛屾瘡 tickWidthPx 杩?1 鏍硷級 */
const OPEN_ANGLE_RULER_SENSITIVITY = 1;
/** 鍚屾 Ultra 鍥轰欢锛歎I 鍚屾涓婇檺 170掳锛屾嫧杞彲缁х画婊戝埌 180掳 鍙戣摑鐗?*/
const OPEN_ANGLE_ULTRA_SYNC_MAX_DEG = 170;
const OPEN_ANGLE_ULTRA_SWIPE_MAX_DEG = 180;
/** 鎶樺彔鑸垫満瑙掞紙鍥轰欢 item4锛夛細0~180锛岄粯璁?150 瀵瑰簲 foldGap=20 */
const FOLD_SERVO_ANGLE_DEFAULT = 150;
const FOLD_SERVO_ANGLE_MIN = 0;
const FOLD_SERVO_ANGLE_MAX = 180;
const FOLD_GAP_BASE = 20;
const FOLD_GAP_PER_DEG = 2;

function foldGapFromServoAngle(angle) {
  const v = Math.max(
    FOLD_SERVO_ANGLE_MIN,
    Math.min(FOLD_SERVO_ANGLE_MAX, parseInt(angle, 10) || FOLD_SERVO_ANGLE_DEFAULT)
  );
  return Math.max(0, Math.min(400, FOLD_GAP_BASE + (FOLD_SERVO_ANGLE_DEFAULT - v) * FOLD_GAP_PER_DEG));
}


const { PRODUCT_DETAIL_OPTIONS } = require('../../../utils/productModels.js');

const ADMIN_BIND_MODEL_OPTIONS = PRODUCT_DETAIL_OPTIONS;

const {
  loadStoredNumLeds,
  saveStoredNumLeds,
  DEFAULT_NUM_LEDS
} = require('../../../utils/canRuntimeConfig.js');
const screenshotExempt = require('../../../utils/screenshotAdminExempt.js');
const { parseF2StatusLine, buildF2FaultModalPayload, buildF2AdvUiUpdates, buildF2FlapPanelUpdates, buildF2ConnectModalQueue, buildF2HwMonitorUpdates, buildF3HeightMonitorUpdates, buildF3HeightSettingsUpdates, packetMatchesBleVerify, F2_FAULT_ACK_CMD, buildTravelModeTip, formatF3HeightMm } = require('../../../utils/f2FaultReport.js');
const f2VoiceBridge = require('../../../utils/f2VoiceBridge.js');
const {
  scanModelToProductKey,
  productKeyToScanModel,
  isRemoteAssistProduct,
  callRemoteAssist,
  collectDeviceState,
  buildStatePatch
} = require('../../../utils/remoteAssist.js');

const REMOTE_ASSIST_STORAGE_KEY = 'remote_assist_local_v1';


Page({
  data: {
    models: [
      { id: 1, name: 'F1', type: 'Pro', tag: 'SERIES 1', icon: iconF1Pro, status: 'active' },
      { id: 2, name: 'F1', type: 'Max', tag: 'SERIES 1', icon: iconF1Max, status: 'next' },
      { id: 8, name: 'F1', type: 'Ultra', tag: 'SERIES 1', icon: iconF1ProMax, status: 'hidden' },
      { id: 3, name: 'F2', type: 'Pro', tag: 'SERIES 2', icon: iconF2Pro, status: 'hidden' },
      { id: 4, name: 'F2', type: 'Max', tag: 'SERIES 2', icon: iconF2Max, status: 'hidden' },
      { id: 9, name: 'F2', type: 'Ultra', tag: 'SERIES 2', icon: iconF2Ultra, status: 'hidden' },
      { id: 5, name: 'F2', type: 'Long', tag: 'SERIES 2', icon: iconF2MaxLong, status: 'hidden' },
      { id: 6, name: 'F3', type: 'Pro', tag: 'SERIES 3', icon: iconF3Pro, status: 'hidden' },
      { id: 7, name: 'F3', type: 'Max', tag: 'SERIES 3', icon: iconF3Max, status: 'hidden' },
      { id: 100, name: 'CAN', type: 'Learn', tag: 'OBD DEBUG', icon: iconCanLearn, status: 'hidden', canLearn: true },
    ],
    currentIndex: 0,

    isDraggingModel: false,
    modelDragOffset: 0,
    nextCardOffsetPercent: 85,
    prevCardOffsetPercent: -85,
    modelActiveScale: 1.08,
    modelSideScale: 0.86,
    nextModelScale: 0.86,
    prevModelScale: 0.86,
    activeCardOpacity: 1,
    nextCardOpacity: 0.9,
    prevCardOpacity: 0.9,

    showDetail: false,
    detailEnterAnim: false,
    detailMode: 'main',
    currentModel: null,
    sideIcon: iconSide,
    connectIcon: iconConnect,
    editType: 'fold', 

    // === 鏉冮檺鎺у埗 ===
    isAuthorized: false, // 瀵嗙爜楠岃瘉涓€娆″悗鏈夋晥
    isAdmin: false, // 绠＄悊鍛樿韩浠?
    // === 杩滅▼鍗忓姪 ===
    uiBleConnected: false,
    remoteAssistCardEnabled: true,
    remoteAssistPendingForCard: false,
    remoteAssistPendingForCurrentCard: 0,
    remoteAssistPendingSessionId: '',
    remoteAssistSessionId: '',
    remoteAssistSessionStatus: '',
    remoteAssistSessionProductKey: '',
    remoteAssistRole: '',
    remoteAssistUserAccepted: false,
    remoteSessionBleConnected: false,
    remoteAssistCapsuleActive: false,
    remoteAssistPendingSessions: [],
    remoteAssistPendingCount: 0,
    showRemoteAssistPickModal: false,
    remoteAssistLastCmdAt: 0,
    remoteAssistDebugLogs: [],
    remoteAssistConsentVisible: false,

    screenshotHourlyCount: 0,
    screenshotDailyCount: 0,

    // === 寮圭獥鎺у埗 ===
    showPasswordModal: false, 
    showTutorialModal: false, 
    showKeyModal: false,     
    showDisconnectTip: false,
    showApproachTip: false,  // 鏂板锛氶潬杩戣溅杈嗘彁绀?    
    // 鏂板锛氳摑鐗欐湭寮€鍚彁绀哄脊绐?    showBluetoothAlert: false,
    bluetoothAlertClosing: false, // 钃濈墮鎻愮ず寮圭獥閫€鍑哄姩鐢讳腑

    // 绠＄悊鍛?SN 棰勭櫥璁板脊绐?    showAdminSnModal: false,
    adminSnModalClosing: false,
    adminSnModalMode: '', // confirm_new | change_model
    adminSnModalSn: '',
    adminSnModalTargetModel: '',
    adminSnModalExistingModel: '',
    adminSnRegisterSubmitting: false,
    adminSnShowModelPicker: false,
    adminBindModelOptions: ADMIN_BIND_MODEL_OPTIONS,
    /** 绠＄悊鍛樻湰浼氳瘽宸茬粦瀹?SN锛堜笌褰撳墠鍗＄墖鍨嬪彿鏃犲叧锛?*/
    adminRegisteredSn: '',
    adminRegisteredModel: '',
    currentConnectedRawSn: '',
    /** 鍞悗鎹㈡満锛氬緟閫夊伐鍗曞垪琛ㄤ笌閫変腑椤?*/
    showAdminRepairPicker: false,
    adminRepairPickerClosing: false,
    adminAwaitingRepairs: [],
    adminSelectedRepairId: '',
    adminSelectedRepair: null,
    /** 钃濈墮鎰忓鏂紑鍚庤嚜鍔ㄩ噸杩?*/
    isBleAutoReconnecting: false,
    bleReconnectAttempt: 0,
    /** CAN Learn 娴嬭瘯锛氱伅甯︽€荤伅鐝犳暟 */
    canLearnNumLeds: String(DEFAULT_NUM_LEDS),
    
    // 鏂板锛氳嚜鍔ㄦ牎鍑嗕腑寮圭獥
    showCalibratingModal: false,
    calibratingModalClosing: false, // 鏍″噯寮圭獥閫€鍑哄姩鐢讳腑
    calibratingBtnDisabled: true, // 鏍″噯寮圭獥鎸夐挳绂佺敤鐘舵€?
    // 鎵撳紑瑙掑害锛氬揩閫熻繛婊戞椂鎻愮ず钃濈墮浠嶅湪鍙戦€?    showOpenAngleSendingModal: false,
    openAngleSendingModalClosing: false,
    openAngleSendingBtnDisabled: true,
    /** 鎵撳紑瑙掑害锛氶潪闃诲鎻愮ず鏉★紙浠?UI 鎻愮ず锛屼笉鎸℃搷浣滐級 */
    showOpenAngleSendHint: false,
    
    // 寮圭獥閫€鍑哄姩鐢荤姸鎬?    passwordModalClosing: false, // 瀵嗙爜寮圭獥閫€鍑哄姩鐢讳腑
    tutorialModalClosing: false, // 鏁欑▼寮圭獥閫€鍑哄姩鐢讳腑
    keyModalClosing: false, // 閽ュ寵寮圭獥閫€鍑哄姩鐢讳腑
    
    // 鏂板锛氳鍏堣繛鎺ヨ摑鐗欐彁绀猴紙灏忚兌鍥婃牱寮忥級
    showConnectBluetoothTip: false,
    
    // 馃敶 鏂板锛歄TA鎻愮ず
    showOtaTip: false,
    
    // 鏂板锛氳繛鎺ョ姸鎬?    isConnecting: false,      // 姝ｅ湪杩炴帴涓?    isNavigatingToOta: false, // 姝ｅ湪璺宠浆鍒癘TA椤甸潰锛堥槻姝㈤噸澶嶈烦杞級

    // 銆愭柊澧炪€戝脊绐楁寜閽攣瀹氱姸鎬侊紙闃茶瑙︼級
    modalBtnDisabled: false,
    
    // 馃敶 鏂板锛氭墍鏈夊脊绐楃殑鍊掕鏃剁浉鍏虫暟鎹?    passwordBtnLocked: true,
    passwordBtnText: '纭 (2s)',
    tutorialBtnLocked: true,
    tutorialBtnText: '鐭ラ亾浜?(2s)',
    keyBtnLocked: true,
    keyBtnText: '纭 (2s)',
    angleHintBtnLocked: true,
    angleHintBtnText: '鐭ラ亾浜?(2s)',
    
    passwordInput: '',        
    pendingEditType: '',      

    // === 鍔ㄧ敾鐘舵€?(绾㈢幆鏁欑▼) ===
    animLightOn: true,        
    animIsPressing: false,    
    animText: '',             
    tutorialTimer: null,
    
    // === 鎶樺彔椤靛紩瀵肩姸鎬?===
    isLightOn: true,          // 鎶樺彔椤垫寚绀虹伅鐘舵€侊紙true=绾紝false=榛戯級
    showFoldInlineHint: false, // 馃敶 鎶樺彔椤典笂婊戞彁绀烘樉绀虹姸鎬?    foldHintOffset: 0,         // 馃敶 鎶樺彔椤垫彁绀哄亸绉婚噺锛堢敤浜庡姩鐢伙級
    showFoldFineTuneHint: false, // 馃敶 涓婃粦婕旂ず缁撴潫鍚庯細璋冨ぇ/璋冨皬澶氬嚮鎻愮ず
    
    // === 鎵撳紑瑙掑害椤靛紩瀵肩姸鎬?===
    openAngleTutorialTimer: null,
    openAngleAnimLightOn: false,    // 鎵撳紑瑙掑害鍔ㄧ敾锛氭寚绀虹伅鐘舵€侊紙false=鐏帮紝true=绾級
    openAngleAnimIsPressing: false, // 鎵撳紑瑙掑害鍔ㄧ敾锛氭槸鍚︽鍦ㄦ寜涓?    openAngleAnimText: '鐐瑰嚮杞︽妸鎸夐敭\n浣挎寚绀虹伅浜?, // 鎵撳紑瑙掑害鍔ㄧ敾锛氭彁绀烘枃瀛?    openAngleLightOn: false,        // 鎵撳紑瑙掑害椤甸潰锛氭寚绀虹伅鎸夐挳鐘舵€侊紙false=鐏帮紝true=绾級      

    // === 鍔ㄧ敾鐘舵€?(鍏抽挜鍖? ===
    keyAnimState: 'red',      // 'red' | 'grey'
    keyLoopTimer: null,       // 鍏抽挜鍖欏姩鐢诲惊鐜畾鏃跺櫒

    isConnected: false,
    isScanning: false, // 鏄惁姝ｅ湪鎵弿
    connectedDeviceName: '',
    touchStartX: 0,
    detailSwipeStartX: 0,
    detailSwipeStartY: 0,
    detailSwipeTracking: false,
    detailOpenGuardUntil: 0,
    blockDetailTouch: false,
    
    // 瑙掑害鎺у埗锛堟棫鏃嬭浆鑷備粛淇濈暀缁欐姌鍙犻€昏緫浣跨敤锛?    angleMode: '90', 
    angleRotation: 180, 

    // 鎶樺彔闂磋窛锛堢敱 foldServoAngle 鏄犲皠锛屼笌鍥轰欢 item4 闄愪綅 0~180 瀵归綈锛?    foldGap: 20,
    foldServoAngle: FOLD_SERVO_ANGLE_DEFAULT,
    
    // 馃敶 璋冩暣鎸夐挳婊戝姩鐩稿叧锛堟姌鍙犺搴﹂〉锛?    adjustSlideOffset: 0,        // 婊戝潡鐨勫瀭鐩村亸绉婚噺锛坧x锛?    adjustSlideActive: false,    // 鏄惁婵€娲伙紙婊戝姩鍚庢樉绀哄綊闆讹級
    adjustTouchStartY: 0,        // 瑙︽懜寮€濮嬫椂鐨?Y 鍧愭爣
    adjustHasMoved: false,       // 鏄惁鍙戠敓浜嗘粦鍔紙鐢ㄤ簬鍖哄垎鐐瑰嚮鍜屾粦鍔級
    adjustSnap: false,           // 鎵嬪姩妯″紡锛氭澗鎵嬪悗鍥炲脊/璐村悎鏃讹紝缁欎竴涓『婊戣繃娓″姩鐢?    foldDemoPlaying: false,      // 鏄惁姝ｅ湪鎾斁"鑷姩涓婃粦璋冩暣"婕旂ず锛堟挱鏀炬椂绂佺敤鎵嬪姩婊戝姩锛?    isAdjustDemo: false,         // 璋冩暣鎸夐挳褰撳墠鏄惁澶勫湪"婕旂ず鍔ㄧ敾"妯″紡锛堟湁杩囨浮锛夛紝鎵嬪姩婊戝姩鏃朵负 false

    angleBtnText: '90掳', // F1=180掳锛孎2 绯诲垪 UI 鏄剧ず 90掳锛堝唴閮ㄤ粛 160锛?
    // 鎵撳紑瑙掑害锛氭爣灏?& 鏁板€兼樉绀虹浉鍏?    isCalibrated: false,          // 鏄惁宸查€氳繃 90/160(180) 鎸夐挳婵€娲绘牎鍑?    openAngleUiActive: false,     // 鏄惁宸茬偣棰勮/棣栨鎷ㄨ疆锛氭湭婵€娲绘椂娉㈣疆鍙姩銆佸彲鍙戣摑鐗欙紝妫嶅瓙/鏁板瓧涓嶆洿鏂?    statusText: '绛夊緟鍚屾',      // 鐘舵€佹枃瀛楋紙鎵撳紑瑙掑害涓?UI 鍋囧悓姝ワ紝涓嶈璁惧锛?    currentAngle: 0,              // 褰撳墠瑙掑害鏁板€?(0~maxAngle)
    ticks: [],                    // 娉㈡氮灏哄埢搴︽暟缁?    activeIndex: 0,               // 褰撳墠楂樹寒鍒诲害绱㈠紩
    translateX: 0,                // 娉㈡氮灏轰綅绉?(px)
    transition: 'none',           // 娉㈡氮灏鸿繃娓″姩鐢?    lastEmitTime: 0,              // 娉㈡氮灏烘粦鍔ㄨ妭娴佹椂闂存埑

    // 鈽呪槄鈽?寮曞寮圭獥鐩稿叧鏁版嵁
    hasShownF1Guide: false, // 涓撻棬鐢ㄤ簬璁板繂 F1 绯诲垪鏄惁宸茬粡寮圭獥杩?    showAngleHint: false,   // 鎺у埗寮圭獥鏄剧ず

    // 銆愭柊澧炪€戞帶鍒跺叏鏂颁骇鍝佹彁绀哄脊绐?    showNewProductHint: false, // 鎺у埗寮圭獥鏄剧ず
    newProductBtnLocked: true, // 鎸夐挳鏄惁閿佸畾
    newProductBtnText: '鐭ラ亾浜?(2s)', // 鎸夐挳鏂囨

    // === 鏂板锛氶珮绾ц缃浉鍏虫暟鎹?===
    showSettingsModal: false, // 鎺у埗楂樼骇璁剧疆寮圭獥
    toastClass: '',           // 鎺у埗 Toast 鍔ㄧ敾
    
    // 鍥炬爣鏁版嵁缁戝畾
    icons: {
      lock: iconLock,
      arrowUp: iconArrowUp,
      cali: iconCali,
      gear: iconGear,
      reset: iconReset,
      gearSmall: iconGearSmall,
      ghostOpen: iconGhostOpen,
      ghostClose: iconGhostClose,
      flapOpen: iconFlapOpen,
      flapFold: iconFlapFold,
      btSmall: iconBtSmall,
      mic: iconMic
    },

    f2ControlPanelOpen: true,
    flapPanelState: 'unknown',
    flapPanelStateText: '鐘舵€佹湭鐭?,
    flapMotionDir: '',
    flapGaugeSnap: false,
    showF2DemoModal: false,
    f2DemoRunning: false,
    f2DemoStatusText: '',
    
    // 婊戝潡鐘舵€侊紙杩炴帴鍚庣敱璁惧鐘舵€佸寘瑕嗙洊锛?    settingState: {
      faultDetect: 'left',
      selfRepair: 'left',
      powerOn: 'right',
      shutdown: 'left',
      travelMode: 'left',
      smoothMode: 'right',
      stealthBtnExit: 'left'
    },

    f2StealthStatusVisible: false,
    f2StealthBleControlVisible: false,

    delayPowerOffOptions: F2_DELAY_POWER_OFF_OPTIONS,
    delayPowerOffIndex: 0,
    delayPowerOffTip: '璇锋牴鎹數鐡跺閲忛€夋嫨',
    f2TravelModeOn: false,
    travelHoldOptions: F2_TRAVEL_HOLD_OPTIONS,
    travelDurationOptions: F2_TRAVEL_DURATION_OPTIONS,
    travelHoldIndex: 2,
    travelDurationIndex: 2,
    travelKeyOffOptions: F2_TRAVEL_KEYOFF_OPTIONS,
    travelKeyOffIndex: 0,
    travelHoldMin: 3,
    travelDurationHours: 12,
    travelModeTip: buildTravelModeTip(3, 12, false),
    f2TravelReadbackText: '璇诲彇涓€?,
    f2DelayPowerReadbackText: '璇诲彇涓€?,
    f2HwMonitorVisible: false,
    f2KeyOn: null,
    f2BtnPressed: null,
    f2KeyStatusText: '鈥?,
    f2BtnStatusText: '鈥?,
    f3HeightMonitorVisible: false,
    f3HeightMm: null,
    f3HeightText: '鈥?,
    f3HeightLive: false,
    f3DangerMm: 0,
    f3BaseMm: 0,
    f3DangerInput: '',
    f3BaseInput: '',
    f3DangerReadback: '鏈缃?,
    f3BaseReadback: '鏈缃?,
    f3HeightConfigModeOn: false,
    f3CalCountdown: 0,
    f3DangerBlocked: false,
    f3PlateItm: null,
    f3HeightConfigLocked: false,
    f3ShowCalOverlay: false,
    f3CalStep: '',
    f3CalBranch: '',
    f3CalTitle: 'F3 鑷姩鏍″噯',
    f3CalDesc: '',
    f3CalTargetLabel: '',
    f3CalLiveText: '',
    f3CalMedianText: '',
    f3CalResultText: '',
    f3CalStatusText: '',
    f3CalShowHoldModal: false,
    f3CalTranslateX: 0,
    f3CalRulerTransition: 'none',
    f3CalTicks: [],
    f3CalPadTicks: [],
    ...buildF2ServoSpeedUi(100),
    f2SpeedSliderWidth: 0,
    f2SpeedSliderLeft: 0,
    
    // === 鎸囩ず鐏‘璁ゅ脊绐楋紙璋冩暣鎸夐挳鐢級===
    showIndicatorCheckModal: false,      // 鏄惁鏄剧ず鎸囩ず鐏鏌ュ脊绐?    indicatorCheckModalClosing: false,   // 寮圭獥鍏抽棴鍔ㄧ敾鐘舵€?    pendingSendData: null,               // 寰呭彂閫佺殑鏁版嵁 { sendText, type }
    hasShownSettingsIndicatorModal: false, // 馃敶 鏍囪鏄惁宸茬粡鏄剧ず杩囬珮绾ц缃殑鎸囩ず鐏脊绐楋紙姣忔鎵撳紑楂樼骇璁剧疆閲嶇疆锛?    
    // === 闅愯斀妯″紡鐩稿叧 ===
    showStealthTutorial: false, // 鏄惁鏄剧ず闅愯斀妯″紡鏁欏
    stealthTutorialMode: 'enter', // 鏁欏妯″紡锛?enter'=杩涘叆, 'exit'=閫€鍑?    
    // === 鍑哄巶璁剧疆鐩稿叧 ===
    showFactoryResetModal: false, // 鏄惁鏄剧ず鍑哄巶璁剧疆寮圭獥
    factoryResetStep: 0, // 褰撳墠姝ラ锛?=鎵撳紑鏀跺洖, 1=寮€鍚嚜妫€, 2=寮€鏈轰笂缈? 3=鑷姩璋冨钩
    factoryResetSteps: [
      { text: '姝ｅ湪鎵撳紑鑷姩鏀跺洖', data: '鎵撳紑鏀跺洖', sendTimes: 2, interval: 500, delayNext: 2000 },
      { text: '姝ｅ湪寮€鍚嚜妫€', data: '寮€鍚嚜妫€', sendTimes: 2, interval: 500, delayNext: 2000 },
      { text: '姝ｅ湪鎵撳紑寮€鏈虹墝涓婄炕', data: '寮€鏈轰笂缈?, sendTimes: 2, interval: 500, delayNext: 2000 },
      { text: '姝ｅ湪鑷姩璋冨钩锛岃鐢ㄦ墜杩涜闃绘尅', data: '鑷姩璋冨钩', sendTimes: 2, interval: 500, delayNext: 0, isLeveling: true }
    ],
    stealthAnimPressing: false, // 鎸夐挳鏄惁鎸変笅
    stealthAnimLight: false,    // 鐏厜鐘舵€侊紙鐢ㄤ簬闂儊锛?    stealthAnimText: '璇峰湪杞︽妸涓奬n闀挎寜鎸夐敭 3 绉?, // 鎻愮ず鏂囧瓧
    stealthAnimTextColor: 'black', // 鏂囧瓧棰滆壊
    stealthAnimTextScale: 1, // 鏂囧瓧缂╂斁锛堢敤浜庡姩鐢伙級
    stealthTutorialBtnDisabled: true, // 鎸夐挳鏄惁绂佺敤
    stealthTutorialTimer: null, // 鍔ㄧ敾瀹氭椂鍣?    stealthBlinkInterval: null, // 闂儊瀹氭椂鍣?    stealthTextBlinkInterval: null, // 鏂囧瓧闂儊瀹氭椂鍣紙鐢ㄤ簬閫€鍑烘ā寮忓悗5娆★級
  },

  onLoad(options) {
    // 馃敶 璁＄畻瀵艰埅鏍忛珮搴︼紙閫傞厤鎵€鏈夋満鍨嬶級
    this.calcNavBarInfo();
    const app = getApp();
    if (app && app.globalData && app.globalData.updatePageVisit) {
      app.globalData.updatePageVisit('scan');
    }
    
    // 鍒濆鍖栧綋鍓嶆ā鍨嬶紙鏀寔浠?products 鍏滃簳鎭㈠鍒版寚瀹氬崱鐗囷級
    this._scanPerfDebug = false;
    this._scanPerf = {
      moveEvents: 0,
      moveSetDataCostTotal: 0,
      moveSetDataCostMax: 0,
      moveLastLogAt: 0
    };
    this._detailClosing = false;
    let restoreIndex = 0;
    if (options && options.restoreIndex !== undefined) {
      const parsed = parseInt(options.restoreIndex, 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed < this.data.models.length) {
        restoreIndex = parsed;
      }
    }
    const currentModel = this.data.models[restoreIndex] || this.data.models[0];
    this.setData({
      canLearnNumLeds: String(loadStoredNumLeds())
    });
    this.setData({ currentModel });
    // 纭繚棣栧睆鐘舵€侊細active/next/prev锛屼笖涓嶅惊鐜?    this.updateCardStatus(restoreIndex);
    if (this._scanPerfDebug) {
      console.log('[scan-perf] onLoad init done', {
        restoreIndex,
        modelCount: this.data.models.length
      });
    }

    this.ble = new BLEHelper(wx);
    this.initScreenshotProtection();
    this._registerF2VoiceBridge();
    
    // 閲嶇疆璺宠浆鏍囪
    this.setData({ isNavigatingToOta: false });
    
    this.ble.onConnecting = (device) => {
      if (device) this._lastBleDevice = device;
      this.setData({
        isScanning: false,
        isConnecting: true
      });
    };

    this.ble.onLinkEstablished = (device) => {
      if (device) this._lastBleDevice = device;
      const rawName = device.name || device.localName || '';
      const numMatch = rawName.replace(/[^0-9]/g, '');
      const finalName = numMatch ? `MT-ID:${numMatch}` : rawName;
      // 鐗╃悊閾捐矾宸插缓绔嬶紝浣嗙壒寰佸€煎皻鏈彂鐜板畬姣曪紝淇濇寔銆屾鍦ㄨ繛鎺ャ€?      this.setData({
        isConnecting: true,
        isScanning: false,
        connectedDeviceName: finalName || this.data.connectedDeviceName
      });
      this._startBleLinkWatch();
    };

    this.ble.onConnected = async (device) => {
      const rawName = device.name || device.localName || '';
      const normalizedSn = this.normalizeSnFromBluetoothName(rawName);
      this._lastBleDevice = device;
      this._activeBleDeviceId = device.deviceId || '';
      this._bleReconnectStoppedByUser = false;
      this._clearBleReconnectTimers();

      // 鐗瑰緛鍊?notify 宸插氨缁紝椤诲湪鏍￠獙浜戝嚱鏁?OTA 涔嬪墠鎸備笂鐩戝惉锛屽惁鍒欓鍖呯姸鎬佷細涓㈠け
      if (isF2MaxStatusBleModel(this.data.currentModel)) {
        this._setupF2FaultBleListener();
      }

      const numMatch = rawName.replace(/[^0-9]/g, '');
      const finalName = numMatch ? `MT-ID:${numMatch}` : rawName;

      // 绯荤粺 BLE 宸茶繛閫氾細鍏堟洿鏂?UI锛岄伩鍏嶄簯鍑芥暟/OTA 鏍￠獙鏈熼棿涓€鐩村崱鍦ㄣ€屾鍦ㄨ繛鎺ャ€?      this._applyBleLinkUi({
        isConnected: true,
        isScanning: false,
        isConnecting: false,
        isBleAutoReconnecting: false,
        bleReconnectAttempt: 0,
        connectedDeviceName: finalName,
        currentConnectedRawSn: normalizedSn || ''
      }, () => {
        this._scheduleRemoteStatePush();
        this._bleConnectGraceUntil = Date.now() + 8000;
        this._bleConnProbeFailStreak = 0;
        this._bleGattProbeFailStreak = 0;
        this._startBleLinkWatch();
      });

      try {
        if (normalizedSn) {
          await this.ensureAdminPrivilegeForSnFlow();
        }

        if (normalizedSn && !this.data.isAdmin) {
          const snOk = await this._checkConnectedSnAllowed(normalizedSn);
          if (!snOk) {
            this.ble.disconnect(true);
            this._applyBleLinkUi({
              isConnected: false,
              isScanning: false,
              isConnecting: false,
              isBleAutoReconnecting: false
            });
            return;
          }
        }

        const hasOtaRecord = await this.checkOtaConnection(device.deviceId);

        if (!hasOtaRecord) {
          console.log('鉂?[onConnected] 璁惧鏈繘琛孫TA鍗囩骇锛屾柇寮€杩炴帴');
          this.ble.disconnect(true);
          this._applyBleLinkUi({
            isConnected: false,
            isScanning: false,
            isConnecting: false,
            isBleAutoReconnecting: false
          });
          this.showOtaRequiredTip();
          return;
        }

        if (normalizedSn && this.data.isAdmin) {
          await this._maybeShowAdminRepairPickerThenSn(normalizedSn);
        }

        this._publishBleToVoiceBridge(true);
        this._flushPendingBleIntent();
      } catch (err) {
        console.error('鉂?[onConnected] 杩炴帴鍚庢牎楠屽け璐?, err);
        this.ble.disconnect(true);
        this._applyBleLinkUi({
          isConnected: false,
          isScanning: false,
          isConnecting: false,
          isBleAutoReconnecting: false
        });
        this._showCustomToast('杩炴帴鏍￠獙澶辫触锛岃閲嶈瘯', 'none', 2200);
      }
    };
    this.ble.onConnectFailed = (err, device, opts) => {
      const manual = !!(opts && opts.manual);
      if (device) this._lastBleDevice = device;
      const shouldReconnect = !manual && !this._bleReconnectStoppedByUser && this._lastBleDevice;
      this._applyBleLinkUi({
        isConnected: false,
        isScanning: false,
        isConnecting: false,
        ...(shouldReconnect ? {} : { isBleAutoReconnecting: false })
      }, () => {
        if (shouldReconnect) this._requestBleAutoReconnect('connect_failed');
      });
    };
    this.ble.onError = (err) => {
      this.setData({ isScanning: false, isConnecting: false });
      
      // 馃敶 澶勭悊钃濈墮鏉冮檺閿欒锛屼娇鐢ㄨ嚜瀹氫箟寮圭獥
      if (err && err.type === 'auth_deny') {
        this._showCustomModal({
          title: err.message || '钃濈墮鏉冮檺琚嫆缁?,
          content: err.detail || '璇峰湪绯荤粺璁剧疆涓紑鍚摑鐗欙紝骞跺厑璁稿皬绋嬪簭浣跨敤钃濈墮鍔熻兘銆?,
          showCancel: false,
          confirmText: '鐭ラ亾浜?
        });
      }
      // 鍙互鍦ㄨ繖閲屽仛蹇呰鐨勯敊璇笂鎶ユ垨闈欓粯澶勭悊
    };
    this.ble.onDisconnected = (meta) => {
      this._stopBleLinkWatch();
      this.onBleDisconnected(meta);
    };

    this.ble._ensureConnectionStateListener();
    if (!this._bleAdapterListenerSetup) {
      this._bleAdapterListenerSetup = true;
    wx.onBluetoothAdapterStateChange((res) => {
      if (!res.available && (this.data.isConnected || this.data.uiBleConnected)) {
        this._handleBleLinkLost('adapter_off');
      }
    });
    }
    this._adminSessionRegisteredSn = '';
    this._adminSessionRegisteredModel = '';
    this._adminSnMismatchHintShown = false;
    this._lastBleDevice = null;
    this._activeBleDeviceId = '';
    this._bleReconnectTimer = null;
    this._bleReconnectStoppedByUser = false;
    this._bleScanTimeoutTimer = null;
    this._bleSendQueue = [];
    this._bleSendDraining = false;
    this._openAngleFullSwipeTimes = [];

    // 璁＄畻 px 姣斾緥 (CSS bar瀹藉害6px + 闂磋窛14px = 20px)
    // 馃敶 鑾峰彇鐘舵€佹爮楂樺害锛堝凡鍦?onLoad 涓缃繃锛岃繖閲屾棤闇€閲嶅澹版槑 winInfo锛?    // 鐩存帴澶嶇敤 onLoad 涓啓鍏ョ殑 statusBarHeight锛岄伩鍏嶉噸澶嶅０鏄庡彉閲?    // const winInfo2 = wx.getWindowInfo();
    // this.setData({ statusBarHeight: winInfo2.statusBarHeight || 44 });
    
    const sys = wx.getSystemInfoSync();
    // 娉ㄦ剰锛欳SS涓娇鐢ㄧ殑鏄痯x鍗曚綅锛屾墍浠ョ洿鎺ヨ绠梡x
    this.tickWidthPx = 20; // 姣忎釜鍒诲害鎬诲搴?0px

    // 鍒濆鍖栦綅缃?(鏍规嵁褰撳墠鏈哄瀷)
    const isF1Legacy = currentModel.name.includes('F1') && !isMtUltraCardModel(currentModel);
    this.maxAngle = isF1Legacy ? 180 : 170;

    // 鐢熸垚鍒诲害鏁版嵁
    const count = (this.maxAngle - 0) / 2 + 1;
    const ticks = new Array(Math.floor(count)).fill(0);
    this.setData({ ticks });

    // 寮哄埗鏇存柊涓€娆¤鍥惧埌 0搴?    this.updateRuler(0, false);
    
    // 馃敶 绠＄悊鍛樻鏌ュ欢鍚庡埌棣栧抚鍚庯紝閬垮厤棣栧睆杩涘叆鍗￠】
    setTimeout(() => {
      this.checkAdminPrivilege();
      this._refreshRemoteAssistCardFlags();
    }, 80);
  },

  // ================== 绠＄悊鍛樻潈闄愭鏌?==================
  async checkAdminPrivilege() {
    const ADMIN_CACHE_KEY = '__scan_admin_privilege_cache__';
    const ADMIN_CACHE_TTL = 10 * 60 * 1000; // 10鍒嗛挓缂撳瓨锛屽噺灏戝弽澶嶈繘椤佃姹?
    // 鍏堢敤鏈湴缂撳瓨绉掑洖濉紝閬垮厤棣栧睆绛夊緟浜戠鏌ヨ
    try {
      const cache = wx.getStorageSync(ADMIN_CACHE_KEY);
      if (cache && typeof cache.isAdmin === 'boolean' && cache.ts && (Date.now() - cache.ts < ADMIN_CACHE_TTL)) {
        if (this.data.isAdmin !== cache.isAdmin) {
          this.setData({ isAdmin: cache.isAdmin }, () => {
            if (cache.isAdmin) {
              this._refreshRemoteAssistCardFlags();
              this._startRemoteAssistPendingPoll();
            }
          });
        } else if (cache.isAdmin) {
          this._startRemoteAssistPendingPoll();
        }
        return;
      }
    } catch (e) {}

    try {
      const res = await wx.cloud.callFunction({ name: 'login' });
      const myOpenid = res.result.openid;
      const db = wx.cloud.database();
      let adminCheck = await db.collection('guanliyuan').where({ openid: myOpenid }).get();
      // 濡傛灉闆嗗悎閲屽苟娌℃湁鎵嬪姩淇濆瓨 openid 瀛楁锛屽垯浣跨敤绯荤粺瀛楁 _openid 鍐嶆煡涓€娆?      if (adminCheck.data.length === 0) {
        adminCheck = await db.collection('guanliyuan').where({ _openid: myOpenid }).get();
      }
      if (adminCheck.data.length > 0) {
        this.setData({ isAdmin: true }, () => {
          this._refreshRemoteAssistCardFlags();
          this._startRemoteAssistPendingPoll();
        });
        screenshotExempt.markGuanliyuanCache(true);
        screenshotExempt.allowScreenCaptureIfExempt();
        try {
          wx.setStorageSync(ADMIN_CACHE_KEY, { isAdmin: true, ts: Date.now() });
        } catch (e) {}
        console.log('[scan.js] 韬唤楠岃瘉鎴愬姛锛氬悎娉曠鐞嗗憳');
      } else {
        this.setData({ isAdmin: false });
        try {
          wx.setStorageSync(ADMIN_CACHE_KEY, { isAdmin: false, ts: Date.now() });
        } catch (e) {}
        console.log('[scan.js] 鏈湪绠＄悊鍛樼櫧鍚嶅崟涓?);
      }
    } catch (err) {
      console.error('[scan.js] 鏉冮檺妫€鏌ュけ璐?, err);
      // 璇锋眰澶辫触鏃朵笉寮哄埗鏀逛负 false锛屼紭鍏堢淮鎸佸綋鍓嶆€侊紝閬垮厤缃戠粶鎶栧姩瀵艰嚧鏉冮檺闂儊
    }
  },

  onShow() {
    // 馃敶 淇锛氫粠 OTA 椤甸潰杩斿洖鍚庯紝鎸夐渶鍏抽棴涓嶅簲璇ユ樉绀虹殑寮圭獥骞舵仮澶嶉〉闈㈢姸鎬?    // 鍙噸缃綋鍓嶄负 true 鐨勭姸鎬侊紝鍑忓皯棣栧抚 setData 璐熻浇
    const resetPatch = {};
    const closeFlags = [
      'showPasswordModal',
      'showTutorialModal',
      'showKeyModal',
      'showDisconnectTip',
      'showApproachTip',
      'showCalibratingModal',
      'showOpenAngleSendingModal',
      'showConnectBluetoothTip',
      'showOtaTip',
      'showIndicatorCheckModal',
      'showStealthTutorial',
      'showFactoryResetModal',
      'showAngleHint',
      'showNewProductHint',
      'showBluetoothAlert',
      'isNavigatingToOta',
      'passwordModalClosing',
      'tutorialModalClosing',
      'keyModalClosing',
      'indicatorCheckModalClosing',
      'calibratingModalClosing',
      'openAngleSendingModalClosing',
      'bluetoothAlertClosing',
      // 鍏滃簳锛氶槻姝?detail-touch-guard 鍋跺彂娈嬬暀瀵艰嚧鏁撮〉鏃犳硶瑙︽懜
      'blockDetailTouch',
      'locked'
    ];
    closeFlags.forEach((k) => {
      if (this.data[k]) resetPatch[k] = false;
    });
    if (Object.keys(resetPatch).length) {
      this.setData(resetPatch);
    }
    
    // 纭繚椤甸潰澶勪簬姝ｅ父鐘舵€侊紙涓嶆槸缂栬緫妯″紡锛岄櫎闈炵敤鎴锋鍦ㄧ紪杈戯級
    // 濡傛灉褰撳墠鍦ㄧ紪杈戞ā寮忥紝淇濇寔缂栬緫妯″紡锛涘惁鍒欑‘淇濇槸涓绘ā寮?    if (this.data.detailMode === 'edit' && !this.data.currentModel) {
      // 濡傛灉缂栬緫妯″紡浣嗘病鏈夊綋鍓嶆ā鍨嬶紝鍙兘鏄姸鎬佸紓甯革紝閲嶇疆涓轰富妯″紡
      this.setData({ detailMode: 'main' });
    }
    
    // 馃敶 濡傛灉楂樼骇璁剧疆寮圭獥鏄墦寮€鐨勶紝閲嶆柊鏄剧ず鎻愮ず Toast
    if (this.data.showSettingsModal) {
      this.showToast();
    }
    
    // 馃敶 鎶婇潪棣栧睆鍏抽敭浠诲姟寤跺悗锛岄伩鍏嶁€滅偣杩涙帶鍒朵腑蹇冨崱涓€涓嬧€?    setTimeout(() => {
      const app = getApp();
      if (app && app.startQiangliCheck) {
        app.startQiangliCheck();
      }
      if (wx.getScreenRecordingState) {
        wx.getScreenRecordingState({
          success: (res) => {
            if (res.state === 'on' || res.recording) {
              if (!screenshotExempt.isScreenshotBanExempt(this)) {
                this.handleIntercept('record');
              }
            }
          }
        });
      }
    }, 120);

    if (this.data.isConnected && !isF2MaxStatusBleModel(this.data.currentModel)) {
      this._tickBleLinkWatch();
      if (!this._bleLinkWatchTimer) this._startBleLinkWatch();
    }

    this._resumeRemoteAssistPollers();
    this._restoreRemoteAssistLocal();
    this._ensureDetailLayerVisible();
    if (this.data.isAdmin) {
      this._pollRemoteAssistPending();
    }

    console.log('鉁?[onShow] 椤甸潰鐘舵€佸凡鎭㈠');
  },

  initScreenshotProtection() {
    if (screenshotExempt.isScreenshotBanExempt(this)) {
      screenshotExempt.allowScreenCaptureIfExempt();
      return;
    }
    try {
      if (wx.setVisualEffectOnCapture) {
        wx.setVisualEffectOnCapture({
          visualEffect: 'hidden',
          success: () => console.log('[scan] 馃洝锔?setVisualEffectOnCapture 宸插紑鍚?)
        });
      }
    } catch (e) {
      console.warn('[scan] setVisualEffectOnCapture 涓嶅彲鐢?', e);
    }

    try {
      this._onCaptureScreenHandler = () => this.handleIntercept('screenshot');
      wx.onUserCaptureScreen(this._onCaptureScreenHandler);
    } catch (e) {
      console.warn('[scan] onUserCaptureScreen 涓嶅彲鐢?', e);
    }

    try {
      if (wx.onUserScreenRecord) {
        this._onScreenRecordHandler = () => this.handleIntercept('record');
        wx.onUserScreenRecord(this._onScreenRecordHandler);
      }
    } catch (e) {
      console.warn('[scan] onUserScreenRecord 涓嶅彲鐢?', e);
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

  _getScreenshotEvents() {
    try {
      const events = wx.getStorageSync('__scan_screenshot_events__');
      return Array.isArray(events) ? events : [];
    } catch (e) {
      return [];
    }
  },

  _saveScreenshotEvents(events) {
    try {
      wx.setStorageSync('__scan_screenshot_events__', events);
    } catch (e) {}
  },

  _recordScreenshotEvent() {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const events = this._getScreenshotEvents().filter((ts) => typeof ts === 'number' && ts >= oneDayAgo);
    events.push(now);
    this._saveScreenshotEvents(events);
    const hourlyCount = events.filter((ts) => ts >= oneHourAgo).length;
    const dailyCount = events.length;
    this.setData({
      screenshotHourlyCount: hourlyCount,
      screenshotDailyCount: dailyCount
    });
    return { now, hourlyCount, dailyCount };
  },

  async _reportScreenshotRisk(stats) {
    try {
      await wx.cloud.callFunction({
        name: 'reportScreenshotRisk',
        data: {
          page: 'scan',
          hourlyCount: stats.hourlyCount,
          dailyCount: stats.dailyCount
        }
      });
      console.log('[scan] 宸蹭笂鎶ユ埅鍥鹃闄╁緟瀹℃牳闃熷垪', stats);
    } catch (e) {
      console.warn('[scan] 涓婃姤鎴浘椋庨櫓澶辫触:', e);
    }
  },

  async _banForCapture(type) {
    wx.setStorageSync('is_user_banned', true);
    if (type === 'screenshot') {
      wx.setStorageSync('is_screenshot_banned', true);
    }
    const sysInfo = wx.getSystemInfoSync();
    wx.cloud.callFunction({
      name: 'banUserByScreenshot',
      data: {
        type,
        banPage: 'scan',
        deviceInfo: sysInfo.system || '',
        phoneModel: sysInfo.model || ''
      }
    }).catch((err) => {
      console.error('[scan] 灏佺浜戝嚱鏁拌皟鐢ㄥけ璐?', err);
    });
    wx.reLaunch({ url: `/pages/blocked/blocked?type=${type === 'record' ? 'record' : 'screenshot'}` });
  },

  async handleIntercept(type) {
    if (screenshotExempt.isScreenshotBanExempt(this)) return;

    if (type === 'record') {
      await this._banForCapture('record');
      return;
    }

    const stats = this._recordScreenshotEvent();
    // 鎴浘鍙戠敓鍗充笂鎶ュ彲鐤戦槦鍒楋紝渚涚鐞嗗憳鍦ㄢ€滃彲鐤戜汉鍛樺鐞嗏€濋噷鎵嬪姩鏃犺/灏佺
    await this._reportScreenshotRisk(stats);
    // 1灏忔椂鍐呭墠2娆″厑璁革紝绗?娆¤捣鐩存帴灏佺
    if (stats.hourlyCount > 2) {
      await this._banForCapture('screenshot');
      return;
    }

    // 鏃ョ疮璁′俊鎭粛鏇存柊鍦ㄩ槦鍒椾腑锛屼究浜庣鐞嗗憳鍒ゆ柇椋庨櫓绋嬪害
    if (stats.dailyCount >= 3) return;
  },

  onHide() {
    this._stopRemoteAssistPollers();
    this._stopF2DemoMode(false);
    this._clearF3CalTimer();
    // 鍏滃簳锛氳嫢璇︽儏涓诲眰琚郴缁熸墜鍔垮甫璧帮紝璁板綍鎭㈠淇℃伅缁?products onShow 浣跨敤
    try {
      if (this.data.showDetail && this.data.detailMode === 'main') {
        wx.setStorageSync('__scan_recover_payload__', {
          ts: Date.now(),
          index: this.data.currentIndex || 0
        });
      }
    } catch (e) {}

    // 馃敶 鍋滄瀹氭椂妫€鏌?    const app = getApp();
    if (app && app.stopQiangliCheck) {
      app.stopQiangliCheck();
    }

    if (this._foldFineTuneHintTimer) {
      clearTimeout(this._foldFineTuneHintTimer);
      this._foldFineTuneHintTimer = null;
    }
  },

  onUnload() {
    this._clearF3CalTimer();
    // 馃敶 鍋滄瀹氭椂妫€鏌?    const app = getApp();
    if (app && app.stopQiangliCheck) {
      app.stopQiangliCheck();
    }
    
    // 鍋滄鎵€鏈夊姩鐢诲惊鐜?    this.stopTutorialLoop();
    this.stopOpenAngleTutorialLoop();
    this.stopStealthAnim();
    if (this._detailBlockTimer) {
      clearTimeout(this._detailBlockTimer);
      this._detailBlockTimer = null;
    }
    // 閲婃斁寮圭獥寤惰繜瀹氭椂鍣?    if (this.modalDelayTimer) clearTimeout(this.modalDelayTimer);
    if (this._foldFineTuneHintTimer) {
      clearTimeout(this._foldFineTuneHintTimer);
      this._foldFineTuneHintTimer = null;
    }
    if (this.ble) {
      this._stopBleLinkWatch();
      this.stopBleAutoReconnect(false, true);
      this.ble.disconnect(true);
    }
    if (typeof this._teardownScreenshotProtection === 'function') {
      this._teardownScreenshotProtection();
    }
    f2VoiceBridge.clearBridge();
    this._stopF2DemoMode(false);
    this._stopRemoteAssistPollers();
  },

  preventBubble() { return; },

  // ===============================================
  // 杩滅▼鍗忓姪
  // ===============================================
  _getRemoteAssistModel() {
    if (this.data.showDetail && this.data.currentModel) {
      return this.data.currentModel;
    }
    return this.data.models[this.data.currentIndex] || null;
  },

  _remoteStatePatchChanged(patch) {
    const data = this.data;
    return Object.keys(patch).some((k) => {
      const next = patch[k];
      const cur = data[k];
      if (next && typeof next === 'object') {
        try {
          return JSON.stringify(cur) !== JSON.stringify(next);
        } catch (e) {
          return cur !== next;
        }
      }
      return cur !== next;
    });
  },

  _isRemoteAssistAdminActive() {
    return this.data.remoteAssistRole === 'admin' &&
      !!this.data.remoteAssistSessionId &&
      this.data.remoteAssistSessionStatus === 'active';
  },

  _isRemoteAssistUserSessionActive() {
    return this.data.remoteAssistRole === 'user' &&
      !!this.data.remoteAssistSessionId &&
      this.data.remoteAssistSessionStatus === 'active' &&
      !!this.data.remoteAssistUserAccepted;
  },

  /** 杩滃崗涓婃姤鐢細閬垮厤閾捐矾鎺㈡祴璇姤瀵艰嚧浜戠 bleConnected 闂柇 */
  _getRemoteAssistPushBleConnected() {
    if (this._isBleLinked()) {
      this._remoteAssistBlePushTrueAt = Date.now();
      return true;
    }
    const graceMs = this._isRemoteAssistUserSessionActive() ? 8000 : 3000;
    if (this._remoteAssistBlePushTrueAt &&
        Date.now() - this._remoteAssistBlePushTrueAt < graceMs) {
      return true;
    }
    return false;
  },

  /** 鎶€甯堢灞曠ず鐢細杩炵画澶氭璇诲埌 false 鎵嶆樉绀烘柇寮€ */
  _resolveAdminRemoteBleConnected(session) {
    const raw = !!(session && session.bleConnected);
    if (raw) {
      this._adminRemoteBleFalseStreak = 0;
      return true;
    }
    this._adminRemoteBleFalseStreak = (this._adminRemoteBleFalseStreak || 0) + 1;
    if (this.data.remoteSessionBleConnected && this._adminRemoteBleFalseStreak < 5) {
      return true;
    }
    return false;
  },

  _formatRemoteAssistLogTime(ts) {
    const d = new Date(ts || Date.now());
    const p = (n) => (n < 10 ? `0${n}` : `${n}`);
    return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  },

  _remoteAssistLogLabel(status) {
    const map = {
      sending: '鍙戦€佷腑',
      ok: '宸查€佽揪',
      fail: '閫佽揪澶辫触',
      enqueue_fail: '鍏ラ槦澶辫触',
      coalesced: '宸插悎骞?,
      timeout: '鏈敹鍒板洖浼?
    };
    return map[status] || status;
  },

  _getRemoteAssistDebugLogs() {
    if (this._raDebugLogsMem && this._raDebugLogsMem.length) return this._raDebugLogsMem;
    return this.data.remoteAssistDebugLogs || [];
  },

  _setRemoteAssistDebugLogs(logs) {
    this._raDebugLogsMem = logs;
    this.setData({ remoteAssistDebugLogs: logs });
  },

  _resetRemoteAssistDebugLogsMem() {
    this._raDebugLogsMem = null;
  },

  _remoteAssistLogCmdMatch(logCmd, rawCmd) {
    if (!logCmd || !rawCmd) return false;
    const base = String(logCmd).split(' 脳')[0].trim();
    return base === rawCmd || logCmd === rawCmd;
  },

  _syncRemoteAssistDebugLogsFromSession(session) {
    if (!session) return null;
    const commands = session.commands || [];
    const fb = session.lastCmdFeedback;
    let logs = [...this._getRemoteAssistDebugLogs()];
    let changed = false;
    let lastAt = this.data.remoteAssistLastCmdAt || 0;
    const now = Date.now();

    const touch = (commandId, cmd, ok, at) => {
      if (!commandId) return;
      const ts = at || now;
      const status = ok ? 'ok' : 'fail';
      const label = this._remoteAssistLogLabel(status);
      let idx = logs.findIndex((l) => l.id === commandId);
      if (idx < 0 && cmd) {
        idx = logs.findIndex((l) => l.status === 'sending' && this._remoteAssistLogCmdMatch(l.cmd, cmd));
      }
      if (idx < 0) return;
      if (logs[idx].status === status && logs[idx].id === commandId) return;
      logs[idx] = {
        ...logs[idx],
        id: commandId,
        status,
        label,
        time: this._formatRemoteAssistLogTime(ts)
      };
      changed = true;
      if (ts > lastAt) lastAt = ts;
    };

    if (fb && fb.commandId) touch(fb.commandId, fb.cmd, fb.ok !== false, fb.at);
    commands.forEach((c) => {
      if (!c || !c.id) return;
      if (c.status === 'done') touch(c.id, c.cmd, true, c.ackAt);
      else if (c.status === 'failed') touch(c.id, c.cmd, false, c.ackAt);
    });

    logs = logs.map((l) => {
      if (l.status !== 'sending' || !l.enqueueAt) return l;
      if (now - l.enqueueAt < 8000) return l;
      changed = true;
      return {
        ...l,
        status: 'timeout',
        label: this._remoteAssistLogLabel('timeout')
      };
    });

    if (!changed) return null;
    this._raDebugLogsMem = logs;
    return { remoteAssistDebugLogs: logs, remoteAssistLastCmdAt: lastAt };
  },

  _pushRemoteAssistDebugLog(entry) {
    const logs = [entry, ...this._getRemoteAssistDebugLogs()];
    if (logs.length > 30) logs.length = 30;
    this._setRemoteAssistDebugLogs(logs);
  },

  _patchRemoteAssistDebugLog(findId, updates) {
    const logs = this._getRemoteAssistDebugLogs().map((l) => (
      l.id === findId ? { ...l, ...updates } : l
    ));
    this._setRemoteAssistDebugLogs(logs);
  },

  _mergeRemoteAssistCmdFeedback(fb) {
    if (!fb || !fb.at) return this._getRemoteAssistDebugLogs();
    const patch = this._syncRemoteAssistDebugLogsFromSession({ lastCmdFeedback: fb, commands: [] });
    if (patch && patch.remoteAssistDebugLogs) return patch.remoteAssistDebugLogs;
    return this._getRemoteAssistDebugLogs();
  },

  _isBleLinked() {
    if (this.data.isConnected) return true;
    // 鍏滃簳锛氳兌鍥婂凡鏄剧ず杩炴帴涓?GATT 灏辩华鏃讹紝閬垮厤 UI/閫昏緫鏍囧織鐭殏涓嶅悓姝?    const ble = this.ble;
    const liveId = ble && ble.device && ble.device.deviceId;
    if (liveId && liveId === this._activeBleDeviceId && ble.serviceId && this._getBleWriteCharacteristicId()) {
      return true;
    }
    return false;
  },

  // 鏄惁鍏佽鐐瑰嚮鎺у埗鍖恒€佽繘鍏ュ瓙椤甸潰绛夛紙绠＄悊鍛樻湭杩炶摑鐗欎篃鍙搷浣?UI锛?  _canControlDevice() {
    if (this.data.isAdmin) return true;
    if (this._isRemoteAssistAdminActive()) return true;
    return this._isBleLinked();
  },

  _shouldSkipIndicatorModal() {
    return this._isRemoteAssistAdminActive();
  },

  _buildRemoteStatePatch(deviceState, options) {
    return buildStatePatch(deviceState, {
      models: this.data.models,
      currentModel: this.data.currentModel,
      ...(options || {})
    });
  },

  _applyRemoteStatePatch(patch, callback) {
    if (!patch || !Object.keys(patch).length) {
      if (callback) callback();
      return;
    }
    if (!this._remoteStatePatchChanged(patch)) {
      if (callback) callback();
      return;
    }
    this.setData(patch, callback);
  },

  _saveRemoteAssistLocal() {
    const {
      remoteAssistRole,
      remoteAssistSessionId,
      remoteAssistSessionStatus,
      remoteAssistSessionProductKey,
      remoteAssistUserAccepted
    } = this.data;
    if (!remoteAssistSessionId || !remoteAssistRole) {
      try { wx.removeStorageSync(REMOTE_ASSIST_STORAGE_KEY); } catch (e) { /* ignore */ }
      return;
    }
    try {
      wx.setStorageSync(REMOTE_ASSIST_STORAGE_KEY, {
        remoteAssistRole,
        remoteAssistSessionId,
        remoteAssistSessionStatus,
        remoteAssistSessionProductKey,
        remoteAssistUserAccepted: !!remoteAssistUserAccepted
      });
    } catch (e) { /* ignore */ }
  },

  _isRemoteAssistUserLocked() {
    return this.data.remoteAssistRole === 'user' &&
      this.data.remoteAssistSessionStatus === 'active' &&
      (!!this.data.remoteAssistUserAccepted || !!this.data.remoteAssistConsentVisible);
  },

  _findModelIndexByProductKey(productKey) {
    const pk = String(productKey || '').trim();
    if (!pk) return -1;
    const target = productKeyToScanModel(pk);
    if (target) {
      const idx = this.data.models.findIndex(
        (m) => !m.canLearn && m.name === target.name && m.type === target.type
      );
      if (idx >= 0) return idx;
    }
    return this.data.models.findIndex((m) => scanModelToProductKey(m) === pk);
  },

  _jumpToCardAndOpenDetail(idx, detailPatch, done) {
    const total = this.data.models.length;
    const safeCurrent = Math.max(0, Math.min(total - 1, Number(idx) || 0));
    const currentModel = this.data.models[safeCurrent];
    if (!currentModel) {
      if (typeof done === 'function') done();
      return;
    }
    const patch = { ...(detailPatch || {}), currentModel };
    this.updateCardStatus(safeCurrent, () => {
      if (!this.data.showDetail) {
        this._openDetailAnimated(patch);
        if (typeof done === 'function') {
          wx.nextTick(done);
        }
        return;
      }
      this._ensureDetailLayerVisible();
      this.setData(patch, () => {
        if (typeof done === 'function') done();
      });
    });
  },

  _ensureDetailLayerVisible() {
    if (!this.data.showDetail) return;
    if (this.data.detailEnterAnim) return;
    this.setData({ detailEnterAnim: true, blockDetailTouch: false });
  },

  _ensureRemoteAssistAdminDetailView(session) {
    const productKey = (session && session.productKey) ||
      this.data.remoteAssistSessionProductKey || '';
    const idx = this._findModelIndexByProductKey(productKey);
    const targetIdx = idx >= 0 ? idx : this.data.currentIndex;
    const currentModel = this.data.models[targetIdx];
    if (!currentModel) return;
    const isF1 = currentModel.name && currentModel.name.includes('F1');
    const bleLinked = !!(session && session.bleConnected) || !!this.data.remoteSessionBleConnected;
    this._jumpToCardAndOpenDetail(targetIdx, {
      angleBtnText: resolveOpenAngleBtnText(currentModel),
      f2ControlPanelOpen: true,
      ...buildF2StealthUiFlags(currentModel, this.data.settingState, bleLinked)
    });
  },

  async _restoreRemoteAssistLocal() {
    if (this.data.remoteAssistSessionId && this.data.remoteAssistRole) return;
    let saved;
    try {
      saved = wx.getStorageSync(REMOTE_ASSIST_STORAGE_KEY);
    } catch (e) {
      return;
    }
    if (!saved || !saved.remoteAssistSessionId || !saved.remoteAssistRole) return;
    try {
      const r = await callRemoteAssist({
        action: 'getSession',
        sessionId: saved.remoteAssistSessionId
      });
      const session = r.session;
      if (!session || session.status === 'ended') {
        try { wx.removeStorageSync(REMOTE_ASSIST_STORAGE_KEY); } catch (e) { /* ignore */ }
        return;
      }
      const productKey = saved.remoteAssistSessionProductKey || session.productKey || '';
      const userAccepted = !!saved.remoteAssistUserAccepted;

      // 鐢ㄦ埛绔細浠呮仮澶嶃€屽凡鍚屾剰涓旇繘琛屼腑銆嶇殑浼氳瘽锛岄伩鍏嶆湭鐐瑰嚮灏卞脊鍑鸿繙鍗忕晫闈?      if (saved.remoteAssistRole === 'user') {
        if (!(session.status === 'active' && userAccepted)) {
          try { wx.removeStorageSync(REMOTE_ASSIST_STORAGE_KEY); } catch (e) { /* ignore */ }
          return;
        }
      }

      const patch = {
        remoteAssistRole: saved.remoteAssistRole,
        remoteAssistSessionId: saved.remoteAssistSessionId,
        remoteAssistSessionStatus: session.status,
        remoteAssistSessionProductKey: productKey,
        remoteAssistUserAccepted: userAccepted,
        remoteSessionBleConnected: !!session.bleConnected,
        remoteAssistConsentVisible: false
      };
      if (saved.remoteAssistRole === 'admin') {
        let idx = this.data.models.findIndex((m) => scanModelToProductKey(m) === productKey);
        if (idx < 0) idx = this.data.currentIndex;
        const currentModel = this.data.models[idx];
        if (currentModel) patch.currentModel = currentModel;
        if (session.deviceSn) patch.currentConnectedRawSn = session.deviceSn;
      }
      this.setData(patch, () => {
        this._syncUiBleConnected();
        if (session.deviceState) this._applyRemoteDeviceState(session.deviceState);
        if (saved.remoteAssistRole === 'user') {
          if (userAccepted) wx.setKeepScreenOn({ keepScreenOn: true });
          this._startRemoteAssistUserPoll();
        } else if (saved.remoteAssistRole === 'admin') {
          this._ensureRemoteAssistAdminDetailView(session);
          this._startRemoteAssistAdminPoll();
        }
      });
    } catch (e) {
      console.warn('[杩滃崗] 鎭㈠浼氳瘽澶辫触', e);
    }
  },

  _executeRemoteAssistCommands(cmds) {
    const list = cmds || [];
    if (!list.length) return Promise.resolve(true);
    let chain = Promise.resolve(true);
    list.forEach((item) => {
      if (!item || !item.cmd) return;
      chain = chain.then((prevOk) => {
        if (!prevOk) return false;
        return this._executeRemoteAssistCommand(item);
      });
    });
    return chain;
  },

  _executeRemoteAssistCommand(item) {
    const times = Math.min(5, Math.max(1, Number(item.times) || 1));
    const interval = Math.max(0, Number(item.interval) || 0);
    const cmd = item.cmd;
    return new Promise((resolve) => {
      if (this.data.remoteAssistRole !== 'user') {
        resolve(false);
        return;
      }
      if (!this._isBleWriteReady()) {
        console.warn('[杩滃崗] 鐢ㄦ埛绔摑鐗欐湭灏辩华锛屾棤娉曞彂閫?', cmd,
          'isConnected=', this.data.isConnected,
          'device=', !!(this.ble && this.ble.device),
          'char=', !!(this.ble && (this.ble.characteristicId2 || this.ble.characteristicId)));
        resolve(false);
        return;
      }
      const gap = Math.max(interval > 0 ? interval : 300, BLE_SEND_GAP_MS);
      for (let i = 0; i < times; i++) {
        this._enqueueBleSend(cmd, gap);
      }
      if ((cmd === '鎵撳紑' || cmd === '鍏抽棴') && isMtUltraCardModel(this.data.currentModel)) {
        this._setFlapPanelStateOptimistic(cmd);
      }
      this._waitBleSendQueueIdle(12000).then((ok) => {
        if (ok) {
          setTimeout(() => this._pushRemoteDeviceState(true), 450);
        }
        resolve(ok);
      });
    });
  },

  _waitBleSendQueueIdle(timeoutMs) {
    return new Promise((resolve) => {
      const started = Date.now();
      const tick = () => {
        if (this.data.remoteAssistRole !== 'user' || !this._isBleWriteReady()) {
          resolve(false);
          return;
        }
        const pending = (this._bleSendQueue && this._bleSendQueue.length) || 0;
        if (!this._bleSendDraining && pending === 0) {
          resolve(true);
          return;
        }
        if (Date.now() - started > timeoutMs) {
          resolve(false);
          return;
        }
        setTimeout(tick, 40);
      };
      tick();
    });
  },

  _recalcRemoteAssistPendingForCard() {
    if (!this.data.isAdmin) return;
    const sessions = this.data.remoteAssistPendingSessions || [];
    const model = this.data.models[this.data.currentIndex];
    const cardKey = model ? scanModelToProductKey(model) : '';
    const cardSessions = cardKey
      ? sessions.filter((s) => s.productKey === cardKey)
      : [];
    const cardPending = cardSessions.length > 0;
    if (cardPending === this.data.remoteAssistPendingForCard &&
        cardSessions.length === (this.data.remoteAssistPendingForCurrentCard || 0)) {
      return;
    }
    this.setData({
      remoteAssistPendingForCard: cardPending,
      remoteAssistPendingForCurrentCard: cardSessions.length
    });
  },

  _refreshRemoteAssistCardFlags() {
    const model = this._getRemoteAssistModel();
    const enabled = isRemoteAssistProduct(model);
    const patch = { remoteAssistCardEnabled: enabled };
    if (!enabled) {
      patch.remoteAssistPendingForCard = false;
      patch.remoteAssistPendingSessionId = '';
    }
    this.setData(patch, () => {
      if (this.data.isAdmin) this._pollRemoteAssistPending();
    });
  },

  _syncUiBleConnected() {
    const isAdminAssist = this.data.remoteAssistRole === 'admin' &&
      this.data.remoteAssistSessionStatus === 'active';
    const connected = !!this.data.isConnected;
    const ui = isAdminAssist ? false : connected;
    const patch = {};
    if (ui !== this.data.uiBleConnected) patch.uiBleConnected = ui;
    // 宸茬ǔ瀹氳繛鎺ユ椂锛屽己鍒舵竻闄ら噸杩?鎵弿 UI锛岄伩鍏嶄笌銆屽凡杩炴帴銆嶅彔鍦ㄤ竴璧?    if (connected) {
      if (this.data.isBleAutoReconnecting) patch.isBleAutoReconnecting = false;
      if (this.data.isScanning) patch.isScanning = false;
      if (this.data.isConnecting) patch.isConnecting = false;
    }
    const capsuleActive = isAdminAssist;
    if (capsuleActive !== this.data.remoteAssistCapsuleActive) {
      patch.remoteAssistCapsuleActive = capsuleActive;
    }
    if (Object.keys(patch).length) this.setData(patch);
  },

  _applyBleLinkUi(patch, callback) {
    const merged = { ...patch };
    const model = this.data.currentModel;
    if (merged.isConnected !== undefined && isF2MaxStatusBleModel(model)) {
      Object.assign(merged, this._resetF2HwMonitorState(!!merged.isConnected, model));
    }
    if (isF2MaxModel(model) || isMtUltraCardModel(model)) {
      const nextData = { ...this.data, ...merged };
      Object.assign(merged, buildF2StealthUiFlags(
        model,
        nextData.settingState,
        resolveF2BleLinkedForUi(nextData)
      ));
    }
    this.setData(merged, () => {
      this._syncUiBleConnected();
      if (callback) callback();
    });
  },

  _isStaleBleDisconnect(meta) {
    const lostId = meta && meta.device && meta.device.deviceId;
    if (!lostId) return false;
    const now = Date.now();
    if (lostId === this._bleDisconnectHandledId &&
      (now - (this._bleDisconnectHandledAt || 0)) < 500) {
      return true;
    }
    const activeId = this._activeBleDeviceId ||
      (this.ble && this.ble.device && this.ble.device.deviceId) || '';
    if (activeId && lostId !== activeId) return true;
    return false;
  },

  _formatRemoteAssistSessionLabel(session) {
    if (!session) return '';
    const sn = session.deviceSn ||
      (session.deviceState && session.deviceState.connectedDeviceName) || '鏈煡璁惧';
    const ble = session.bleConnected ? '宸茶繛钃濈墮' : '鏈繛钃濈墮';
    return `${sn} 路 ${ble}`;
  },

  _stopRemoteAssistPollers() {
    this._remoteAssistUserPollActive = false;
    this._remoteAssistAdminPollActive = false;
    if (this._remoteAssistUserPollTimer) {
      clearTimeout(this._remoteAssistUserPollTimer);
      this._remoteAssistUserPollTimer = null;
    }
    if (this._remoteAssistAdminPollTimer) {
      clearTimeout(this._remoteAssistAdminPollTimer);
      this._remoteAssistAdminPollTimer = null;
    }
    if (this._remoteAssistPendingPollTimer) {
      clearInterval(this._remoteAssistPendingPollTimer);
      this._remoteAssistPendingPollTimer = null;
    }
    if (this._remoteStatePushTimer) {
      clearTimeout(this._remoteStatePushTimer);
      this._remoteStatePushTimer = null;
    }
  },

  _resumeRemoteAssistPollers() {
    if (this.data.remoteAssistSessionId && this.data.remoteAssistRole === 'user') {
      this._startRemoteAssistUserPoll();
    }
    if (this.data.remoteAssistSessionId && this.data.remoteAssistRole === 'admin') {
      this._startRemoteAssistAdminPoll();
    }
    if (this.data.isAdmin) {
      this._startRemoteAssistPendingPoll();
    }
  },

  _startRemoteAssistPendingPoll() {
    if (this._remoteAssistPendingPollTimer) return;
    this._pollRemoteAssistPending();
    this._remoteAssistPendingPollTimer = setInterval(() => {
      this._pollRemoteAssistPending();
    }, 2500);
  },

  async _pollRemoteAssistPending() {
    if (!this.data.isAdmin) return;
    if (this.data.remoteAssistRole === 'admin' && this.data.remoteAssistSessionId) return;
    try {
      const r = await callRemoteAssist({ action: 'hasPending', all: true });
      const sessions = r.sessions || (r.session ? [r.session] : []);
      const model = this._getRemoteAssistModel();
      const cardKey = scanModelToProductKey(model);
      const cardSessions = cardKey
        ? sessions.filter((s) => s.productKey === cardKey)
        : [];
      const firstId = sessions[0] ? sessions[0]._id : '';
      const count = sessions.length;
      const cardPending = cardSessions.length > 0;
      if (
        count === (this.data.remoteAssistPendingCount || 0) &&
        firstId === (this.data.remoteAssistPendingSessionId || '') &&
        cardPending === !!this.data.remoteAssistPendingForCard &&
        cardSessions.length === (this.data.remoteAssistPendingForCurrentCard || 0) &&
        count === (this.data.remoteAssistPendingSessions || []).length
      ) {
        return;
      }
      this.setData({
        remoteAssistPendingForCard: cardPending,
        remoteAssistPendingForCurrentCard: cardSessions.length,
        remoteAssistPendingSessionId: firstId,
        remoteAssistPendingSessions: sessions,
        remoteAssistPendingCount: count
      });
    } catch (e) { /* ignore */ }
  },

  async onUserRemoteAssistTap(e) {
    const ds = e && e.currentTarget && e.currentTarget.dataset;
    const cardModel = (ds && ds.index !== undefined && this.data.models[ds.index])
      ? this.data.models[ds.index]
      : this._getRemoteAssistModel();
    const productKey = scanModelToProductKey(cardModel);
    if (!productKey) return;

    if (this.data.remoteAssistSessionId &&
        this.data.remoteAssistSessionProductKey === productKey) {
      if (this.data.remoteAssistSessionStatus === 'pending') {
        wx.showModal({
          title: '鍙栨秷杩滃崗',
          content: '纭畾鍙栨秷杩滅▼鍗忓姪璇锋眰鍚楋紵',
          success: async (res) => {
            if (res.confirm) await this._endRemoteAssistSession('cancel');
          }
        });
      } else {
        if (this.data.remoteAssistSessionStatus === 'active' && !this.data.remoteAssistUserAccepted) {
          this.setData({ remoteAssistConsentVisible: true });
          return;
        }
        this._showCustomToast('鍗忓姪杩涜涓紝鍙偣涓嬫柟缁撴潫', 'none', 2000);
      }
      return;
    }
    if (!this.data.isConnected) {
      this.setData({ showConnectBluetoothTip: true });
      setTimeout(() => this.setData({ showConnectBluetoothTip: false }), 2000);
      return;
    }
    const model = cardModel;
    try {
      const r = await callRemoteAssist({
        action: 'request',
        productKey,
        productName: model.name,
        productType: model.type,
        bleConnected: this.data.isConnected,
        deviceSn: this.data.currentConnectedRawSn || '',
        deviceState: collectDeviceState(this)
      });
      const status = r.status || 'pending';
      this.setData({
        remoteAssistRole: 'user',
        remoteAssistSessionId: r.sessionId,
        remoteAssistSessionStatus: status,
        remoteAssistSessionProductKey: productKey,
        remoteAssistUserAccepted: false,
        remoteAssistConsentVisible: status === 'active'
      });
      this._saveRemoteAssistLocal();
      wx.setKeepScreenOn({ keepScreenOn: true });
      this._startRemoteAssistUserPoll();
      this._showCustomToast('宸插彂璧疯繙绋嬪崗鍔?, 'success', 1800);
    } catch (err) {
      let msg = err.message || '鍙戣捣澶辫触';
      if (msg.includes('FUNCTION_NOT_FOUND')) {
        msg = '杩滃崗鍔熻兘鏆傛湭寮€鏀?浜戝嚱鏁版湭閮ㄧ讲)';
      } else if (msg.length > 30) {
        msg = msg.substring(0, 30) + '...';
      }
      this._showCustomToast(msg, 'none', 2500);
    }
  },

  async onAdminRemoteAssistTap() {
    if (!this.data.isAdmin) return;
    if (this.data.remoteAssistRole === 'admin' && this.data.remoteAssistSessionId) {
      this._showCustomToast('宸插湪杩滃崗涓?, 'none', 2000);
      return;
    }
    const sessions = this.data.remoteAssistPendingSessions || [];
    if (!sessions.length) {
      this._showCustomToast('鏆傛棤杩滃崗璇锋眰', 'none', 2000);
      await this._pollRemoteAssistPending();
      return;
    }
    if (sessions.length === 1) {
      await this._acceptRemoteAssistSession(sessions[0]._id);
      return;
    }
    this.setData({ showRemoteAssistPickModal: true });
  },

  onCloseRemoteAssistPickModal() {
    this.setData({ showRemoteAssistPickModal: false });
  },

  async onPickRemoteAssistSession(e) {
    const sessionId = e && e.currentTarget && e.currentTarget.dataset &&
      e.currentTarget.dataset.sessionId;
    if (!sessionId) return;
    this.setData({ showRemoteAssistPickModal: false });
    await this._acceptRemoteAssistSession(sessionId);
  },

  async _acceptRemoteAssistSession(sessionId) {
    if (!sessionId) return;
    try {
      const r = await callRemoteAssist({ action: 'accept', sessionId });
      this._enterRemoteAssistAdmin(r.session);
    } catch (err) {
      this._showCustomToast(err.message || '鎺ュ叆澶辫触', 'none', 2200);
      this._pollRemoteAssistPending();
    }
  },

  _enterRemoteAssistAdmin(session) {
    if (!session) return;
    const productKey = session.productKey;
    const idx = this._findModelIndexByProductKey(productKey);
    const targetIdx = idx >= 0 ? idx : this.data.currentIndex;
    const currentModel = this.data.models[targetIdx];
    if (!currentModel) return;
    const isF1 = currentModel.name && currentModel.name.includes('F1');
    const bleLinked = !!session.bleConnected;
    this._resetRemoteAssistDebugLogsMem();
    this.setData({
      remoteAssistRole: 'admin',
      remoteAssistSessionId: session._id,
      remoteAssistSessionStatus: session.status || 'active',
      remoteAssistSessionProductKey: productKey,
      remoteAssistPendingForCard: false,
      remoteAssistPendingSessionId: '',
      remoteAssistPendingSessions: [],
      remoteAssistPendingCount: 0,
      remoteSessionBleConnected: bleLinked,
      remoteAssistLastCmdAt: 0,
      remoteAssistDebugLogs: []
    }, () => {
      this._saveRemoteAssistLocal();
      this._applyRemoteDeviceState(session.deviceState);
      this._syncUiBleConnected();
      this._jumpToCardAndOpenDetail(targetIdx, {
        angleBtnText: resolveOpenAngleBtnText(currentModel),
        f2ControlPanelOpen: true,
        ...buildF2StealthUiFlags(
          currentModel,
          (session.deviceState && session.deviceState.settingState) || this.data.settingState,
          bleLinked
        )
      }, () => {
        this._startRemoteAssistAdminPoll();
      });
    });
  },

  _startRemoteAssistUserPoll() {
    if (this._remoteAssistUserPollActive) return;
    this._remoteAssistUserPollActive = true;
    this._scheduleRemoteAssistUserPoll(0);
  },

  _scheduleRemoteAssistUserPoll(delayMs) {
    if (!this._remoteAssistUserPollActive) return;
    if (this._remoteAssistUserPollTimer) {
      clearTimeout(this._remoteAssistUserPollTimer);
    }
    this._remoteAssistUserPollTimer = setTimeout(() => {
      this._remoteAssistUserPollTimer = null;
      if (!this._remoteAssistUserPollActive) return;
      this._tickRemoteAssistUserPoll().finally(() => {
        if (!this._remoteAssistUserPollActive) return;
        const active = this.data.remoteAssistSessionStatus === 'active' &&
          this.data.remoteAssistUserAccepted;
        this._scheduleRemoteAssistUserPoll(active ? 160 : 700);
      });
    }, delayMs);
  },

  _startRemoteAssistAdminPoll() {
    if (this._remoteAssistAdminPollActive) return;
    this._remoteAssistAdminPollActive = true;
    this._scheduleRemoteAssistAdminPoll(0);
  },

  _scheduleRemoteAssistAdminPoll(delayMs) {
    if (!this._remoteAssistAdminPollActive) return;
    if (this._remoteAssistAdminPollTimer) {
      clearTimeout(this._remoteAssistAdminPollTimer);
    }
    this._remoteAssistAdminPollTimer = setTimeout(() => {
      this._remoteAssistAdminPollTimer = null;
      if (!this._remoteAssistAdminPollActive) return;
      this._tickRemoteAssistAdminPoll().finally(() => {
        if (!this._remoteAssistAdminPollActive) return;
        const hasSending = this._getRemoteAssistDebugLogs().some((l) => l.status === 'sending');
        this._scheduleRemoteAssistAdminPoll(hasSending ? 100 : 280);
      });
    }, delayMs);
  },

  async _tickRemoteAssistUserPoll() {
    const sessionId = this.data.remoteAssistSessionId;
    if (!sessionId || this.data.remoteAssistRole !== 'user') return;
    if (this._remoteAssistUserPollBusy) return;
    this._remoteAssistUserPollBusy = true;
    try {
      const pull = await callRemoteAssist({ action: 'pullCommands', sessionId });

      if (this.data.remoteAssistSessionId !== sessionId) return;

      const session = pull.session;
      if (!session || session.status === 'ended') {
        this._clearRemoteAssistLocal('ended');
        return;
      }

      // 鎶€甯堝凡鎺ュ叆浣嗙敤鎴峰皻鏈悓鎰忥細鍙洿鏂扮姸鎬侊紝涓嶈嚜鍔ㄥ脊鍏ㄥ睆纭
      if (session.status === 'active' && !this.data.remoteAssistUserAccepted) {
        const wasPending = this.data.remoteAssistSessionStatus === 'pending';
        const patch = {};
        if (this.data.remoteAssistSessionStatus !== 'active') {
          patch.remoteAssistSessionStatus = 'active';
          patch.blockDetailTouch = false;
        }
        if (wasPending) {
          patch.remoteAssistConsentVisible = true;
        }
        if (Object.keys(patch).length) {
          this.setData(patch);
          this._saveRemoteAssistLocal();
        }
        return;
      }

      if (session.status !== this.data.remoteAssistSessionStatus) {
        this.setData({
          remoteAssistSessionStatus: session.status,
          blockDetailTouch: session.status === 'active' ? false : this.data.blockDetailTouch
        });
        this._saveRemoteAssistLocal();
        if (session.status === 'active' && this.data.remoteAssistUserAccepted) {
          wx.setKeepScreenOn({ keepScreenOn: true });
        }
      }
      const cmds = pull.commands || [];
      if (cmds.length > 0) {
        const item = cmds[0];
        const execOk = await this._executeRemoteAssistCommand(item);
        if (item && item.id) {
          const feedback = {
            commandId: item.id,
            cmd: item.cmd || '',
            ok: execOk,
            at: Date.now()
          };
          let acked = false;
          for (let i = 0; i < 3 && !acked; i++) {
            try {
              await callRemoteAssist({
                action: 'ackCommand',
                sessionId,
                commandIds: [item.id],
                ok: execOk
              });
              acked = true;
            } catch (e) {
              console.warn('[杩滃崗] ackCommand 澶辫触', i + 1, e);
              if (i < 2) await new Promise((r) => setTimeout(r, 180));
            }
          }
          if (!acked) {
            try {
              await callRemoteAssist({
                action: 'pushState',
                sessionId,
                lastCmdFeedback: feedback,
                bleConnected: this._getRemoteAssistPushBleConnected(),
                deviceSn: this.data.currentConnectedRawSn || '',
                deviceState: collectDeviceState(this)
              });
            } catch (e) {
              console.warn('[杩滃崗] pushState 鍥炰紶鎵ц缁撴灉澶辫触', e);
            }
          }
        }
        if (!execOk) {
          await this._pushRemoteDeviceState(true);
        }
      } else {
        await this._pushRemoteDeviceState(false);
      }
    } catch (e) {
      console.warn('[杩滃崗] 鐢ㄦ埛绔疆璇㈠け璐?, e);
    } finally {
      this._remoteAssistUserPollBusy = false;
    }
  },

  async _tickRemoteAssistAdminPoll() {
    const sessionId = this.data.remoteAssistSessionId;
    if (!sessionId || this.data.remoteAssistRole !== 'admin') return;
    if (this._remoteAssistAdminPollBusy) return;
    this._remoteAssistAdminPollBusy = true;
    try {
      const r = await callRemoteAssist({ action: 'getSession', sessionId });
      
      if (this.data.remoteAssistSessionId !== sessionId) return;
      
      let session = r.session;
      if (!session || session.status === 'ended') {
        let liveSession = session;
        if (!liveSession || liveSession.status === 'ended') {
          await new Promise((resolve) => setTimeout(resolve, 500));
          if (this.data.remoteAssistSessionId !== sessionId) return;
          try {
            const retry = await callRemoteAssist({ action: 'getSession', sessionId });
            liveSession = retry.session;
          } catch (e) {
            liveSession = null;
          }
        }
        if (!liveSession || liveSession.status === 'ended') {
          this._clearRemoteAssistLocal('ended');
          this._showCustomToast('杩滃崗宸茬粨鏉?, 'none', 2000);
          return;
        }
        session = liveSession;
      }
      const patch = {
        remoteSessionBleConnected: this._resolveAdminRemoteBleConnected(session)
      };
      if (session.deviceSn) patch.currentConnectedRawSn = session.deviceSn;
      const logPatch = this._syncRemoteAssistDebugLogsFromSession(session);
      if (logPatch) Object.assign(patch, logPatch);
      const statePatch = this.data.detailMode === 'edit'
        ? {}
        : this._buildRemoteStatePatch(session.deviceState, { forAdmin: true });
      const model = this.data.currentModel;
      if (isF2MaxModel(model) || isMtUltraCardModel(model)) {
        Object.assign(statePatch, buildF2StealthUiFlags(
          model,
          statePatch.settingState || this.data.settingState,
          this._resolveAdminRemoteBleConnected(session)
        ));
      }
      this._applyRemoteStatePatch({ ...patch, ...statePatch }, () => {
        this._syncUiBleConnected();
      });
    } catch (e) {
      console.warn('[杩滃崗] 鎶€甯堢杞澶辫触', e);
    } finally {
      this._remoteAssistAdminPollBusy = false;
    }
  },

  _applyRemoteDeviceState(deviceState) {
    const forAdmin = this.data.remoteAssistRole === 'admin';
    const patch = this._buildRemoteStatePatch(deviceState, { forAdmin });
    if (forAdmin) {
      const model = patch.currentModel || this.data.currentModel;
      if (isF2MaxModel(model) || isMtUltraCardModel(model)) {
        Object.assign(patch, buildF2StealthUiFlags(
          model,
          patch.settingState || this.data.settingState,
          this.data.remoteSessionBleConnected
        ));
      }
    }
    this._applyRemoteStatePatch(patch);
  },

  _scheduleRemoteStatePush() {
    if (this.data.remoteAssistRole !== 'user' || !this.data.remoteAssistSessionId) return;
    if (this._remoteStatePushTimer) return;
    this._remoteStatePushTimer = setTimeout(() => {
      this._remoteStatePushTimer = null;
      this._pushRemoteDeviceState(true);
    }, 250);
  },

  async _pushRemoteDeviceState(force) {
    if (this.data.remoteAssistRole !== 'user' || !this.data.remoteAssistSessionId) return;
    if (this.data.remoteAssistSessionStatus === 'active' && !this.data.remoteAssistUserAccepted) return;
    const ts = Date.now();
    if (!force && this._lastRemoteStatePushMs && ts - this._lastRemoteStatePushMs < 1500) return;
    this._lastRemoteStatePushMs = ts;
    try {
      await callRemoteAssist({
        action: 'pushState',
        sessionId: this.data.remoteAssistSessionId,
        bleConnected: this._getRemoteAssistPushBleConnected(),
        deviceSn: this.data.currentConnectedRawSn || '',
        deviceState: {
          ...collectDeviceState(this),
          bleWriteReady: this._isBleWriteReady()
        }
      });
    } catch (e) {
      console.warn('[杩滃崗] pushState 澶辫触', e);
    }
  },

  async _remoteAssistEnqueueCommand(text, times, interval) {
    if (!this.data.remoteAssistSessionId) return;

    const safeTimes = times || 1;
    const safeInterval = Number.isFinite(Number(interval)) ? Number(interval) : 0;

    const finalTimes = Math.min(5, Math.max(1, safeTimes));
    const dedupeKey = `${text}|${finalTimes}|${safeInterval}`;
    const now = Date.now();
    if (this._lastRemoteEnqueueKey === dedupeKey &&
        now - (this._lastRemoteEnqueueMs || 0) < 350) {
      return;
    }
    this._lastRemoteEnqueueKey = dedupeKey;
    this._lastRemoteEnqueueMs = now;

    const pendingId = `pending_${now}`;
    const cmdLabel = finalTimes > 1 ? `${text} 脳${finalTimes}` : text;
    this._pushRemoteAssistDebugLog({
      id: pendingId,
      time: this._formatRemoteAssistLogTime(now),
      cmd: cmdLabel,
      status: 'sending',
      label: this._remoteAssistLogLabel('sending'),
      enqueueAt: now
    });

    try {
      const r = await callRemoteAssist({
        action: 'enqueueCommand',
        sessionId: this.data.remoteAssistSessionId,
        cmd: text,
        times: finalTimes,
        interval: safeInterval
      });
      const commandId = r.commandId || pendingId;
      if (r.coalesced) {
        this._patchRemoteAssistDebugLog(pendingId, {
          id: commandId,
          status: 'coalesced',
          label: this._remoteAssistLogLabel('coalesced')
        });
      } else {
        this._patchRemoteAssistDebugLog(pendingId, { id: commandId });
      }
      console.log('[杩滃崗] 鎸囦护宸插叆闃?', text, finalTimes, safeInterval);
    } catch (err) {
      console.warn('[杩滃崗] 鍏ラ槦澶辫触', err);
      this._patchRemoteAssistDebugLog(pendingId, {
        status: 'enqueue_fail',
        label: this._remoteAssistLogLabel('enqueue_fail')
      });
      this._showCustomToast(err.message || '杩滃崗鍙戦€佸け璐?, 'none', 2200);
    }
  },

  onAcceptRemoteAssist() {
    if (this.data.remoteAssistRole !== 'user') return;
    if (this.data.remoteAssistUserAccepted) return;
    const sessionId = this.data.remoteAssistSessionId;
    this.setData({
      remoteAssistUserAccepted: true,
      remoteAssistConsentVisible: false,
      blockDetailTouch: false
    }, () => {
      this._saveRemoteAssistLocal();
      wx.setKeepScreenOn({ keepScreenOn: true });
      this._showCustomToast('宸插悓鎰忚繙绋嬪崗鍔?, 'success', 1500);
      if (!sessionId) return;
      callRemoteAssist({
        action: 'pushState',
        sessionId,
        userAccepted: true,
        bleConnected: this._getRemoteAssistPushBleConnected(),
        deviceSn: this.data.currentConnectedRawSn || '',
        deviceState: {
          ...collectDeviceState(this),
          bleWriteReady: this._isBleWriteReady()
        }
      }).catch((e) => {
        console.warn('[杩滃崗] 鍚屾鐢ㄦ埛鍚屾剰鐘舵€佸け璐?, e);
      });
      this._pushRemoteDeviceState(true);
    });
  },

  onRejectRemoteAssist() {
    this.onEndRemoteAssistSession();
  },

  async onEndRemoteAssistSession() {
    if (this._endingRemoteAssist) return;
    this._endingRemoteAssist = true;
    const sessionId = this.data.remoteAssistSessionId;
    // 鍏堝叧鏈湴閬僵锛岄伩鍏嶄簯鍑芥暟澶辫触鏃剁敤鎴疯鍥颁綇
    this._clearRemoteAssistLocal('end');
    this._endingRemoteAssist = false;
    if (!sessionId) return;
    try {
      await callRemoteAssist({ action: 'end', sessionId });
    } catch (e) {
      console.warn('[杩滃崗] 缁撴潫浼氳瘽浜戠澶辫触锛屾湰鍦板凡閫€鍑?, e);
      this._showCustomToast('宸茬粨鏉熷崗鍔?, 'none', 1800);
    }
  },

  async _endRemoteAssistSession(action) {
    if (this._endingRemoteAssist) return;
    this._endingRemoteAssist = true;
    const sessionId = this.data.remoteAssistSessionId;
    const act = action || 'end';
    this._clearRemoteAssistLocal(act);
    this._endingRemoteAssist = false;
    if (!sessionId) return;
    try {
      await callRemoteAssist({ action: act, sessionId });
    } catch (e) {
      console.warn('[杩滃崗] 缁撴潫浼氳瘽浜戠澶辫触锛屾湰鍦板凡閫€鍑?, e);
    }
  },

  _clearRemoteAssistLocal(reason) {
    const wasAdmin = this.data.remoteAssistRole === 'admin';
    this._stopRemoteAssistPollers();
    this._resetRemoteAssistDebugLogsMem();
    this._adminRemoteBleFalseStreak = 0;
    this._remoteAssistBlePushTrueAt = 0;
    try { wx.removeStorageSync(REMOTE_ASSIST_STORAGE_KEY); } catch (e) { /* ignore */ }
    wx.setKeepScreenOn({ keepScreenOn: false });
    this.setData({
      remoteAssistRole: '',
      remoteAssistSessionId: '',
      remoteAssistSessionStatus: '',
      remoteAssistSessionProductKey: '',
      remoteAssistUserAccepted: false,
      remoteSessionBleConnected: false,
      remoteAssistCapsuleActive: false,
      remoteAssistConsentVisible: false,
      remoteAssistLastCmdAt: 0,
      remoteAssistDebugLogs: [],
      uiBleConnected: false
    }, () => {
      this._syncUiBleConnected();
      if (wasAdmin) this._pollRemoteAssistPending();
      if (reason === 'ended' && wasAdmin && this.data.showDetail) {
        this._closeDetailAnimated();
      }
    });
  },

  // ===============================================
  // 闅愯斀妯″紡鏁欏閫昏緫
  // ===============================================
  
  // 1. 鐐瑰嚮鍏ュ彛锛氭樉绀烘暀瀛﹀脊绐楋紙杩涘叆妯″紡锛?  openStealthTutorial() {
    this.openStealthTutorialWithMode('enter');
  },

  // 1-1. 鏄剧ず閫€鍑洪殣钄芥ā寮忔暀瀛﹀脊绐?  openExitStealthTutorial() {
    this.openStealthTutorialWithMode('exit');
  },

  // 1-2. 閫氱敤鎵撳紑鏁欏寮圭獥鍑芥暟
  openStealthTutorialWithMode(mode) {
    // 闃叉鈥滅偣鍑昏繘鍏ユ帶鍒跺彴鈥濆悗鍑虹幇鐐瑰嚮閫忎紶锛岃鎵撳紑鏁欏寮圭獥
    if (Date.now() < (this._controlTapLockUntil || this.data.detailOpenGuardUntil || 0)) return;
    const isEnter = mode === 'enter';
    // 姝ラ1锛氱涓€甯э紙鍒濆鐘舵€侊級
    this.setData({ 
      showStealthTutorial: true,
      stealthTutorialMode: mode,
      stealthAnimPressing: false,  // 鎸夐挳锛氭湭鎸変笅
      stealthAnimLight: false,     // 鐏厜锛氱孩鑹诧紙涓嶄寒锛?      stealthAnimText: isEnter ? '璇峰湪杞︽妸涓奬n闀挎寜鎸夐敭 3 绉? : '闀挎寜杞︽妸鎸夐挳\n8 绉?,
      stealthAnimTextColor: 'black', // 鏂囧瓧棰滆壊锛氶粦鑹?      stealthAnimTextScale: 1, // 鏂囧瓧缂╂斁锛氭甯?      stealthTutorialBtnDisabled: true // 鎸夐挳绂佺敤
    });
    
    // 绗竴甯у仠鐣欐椂闂达細杩涘叆妯″紡5绉掞紝閫€鍑烘ā寮?绉?    const firstFrameDuration = isEnter ? 5000 : 2000;
    setTimeout(() => {
      this.step2_ButtonPress();
    }, firstFrameDuration);
  },

  // 2. 鍏抽棴鏁欏寮圭獥
  closeStealthTutorial() {
    this.stopStealthAnim();
    this.setData({ 
      showStealthTutorial: false,
      stealthTutorialMode: 'enter',
      stealthAnimPressing: false,
      stealthAnimLight: false,
      stealthAnimText: '璇峰湪杞︽妸涓奬n闀挎寜鎸夐敭 3 绉?,
      stealthAnimTextColor: 'black',
      stealthAnimTextScale: 1,
      stealthTutorialBtnDisabled: true
    });
  },

  // ===============================================
  // 馃敶 鍑哄巶璁剧疆鍔熻兘锛團1 MAX / F2 PRO / F2 MAX 绯诲垪锛?  // ===============================================
  handleFactoryReset() {
    if (Date.now() < (this._controlTapLockUntil || 0)) return;
    console.log('馃敡 [绠＄悊鍛榏 鐐瑰嚮鍑哄巶璁剧疆鎸夐挳');
    
    // 妫€鏌ユ槸鍚︿负绠＄悊鍛?    if (!this.data.isAdmin) {
      this._showCustomToast('闇€瑕佺鐞嗗憳鏉冮檺', 'none', 2000);
      return;
    }
    
    // 妫€鏌ユ槸鍚︿负鏀寔鍑哄巶璁剧疆鐨勬満鍨?    const currentModel = this.data.currentModel || {};
    const name = currentModel.name || '';
    const type = currentModel.type || '';

    const isMtUltra = isMtUltraCardModel(currentModel);
    const isF2MaxSeries = isF2MaxSeriesModel(currentModel);
    const isF2ProSeries = name.includes('F2') && type === 'Pro';
    const isF1Max = name.includes('F1') && type === 'Max';
    const isF1Pro = name.includes('F1') && type === 'Pro';
    const isSupported = isMtUltra || isF2MaxSeries || isF2ProSeries || isF1Max || isF1Pro;
    
    if (!isSupported) {
      this._showCustomToast('浠呮敮鎸?F1/F2/F3 宸插垪鍑虹殑鍑哄巶璁剧疆鏈哄瀷', 'none', 2000);
      return;
    }
    
    // 闇囧姩鍙嶉
    wx.vibrateShort({ type: 'light' });
    
    // 寮€濮嬪嚭鍘傝缃祦绋?    this.startFactoryReset();
  },

  // 寮€濮嬪嚭鍘傝缃祦绋?  startFactoryReset() {
    const currentModel = this.data.currentModel || {};
    const name = currentModel.name || '';
    const type = currentModel.type || '';

    const isF2MaxSeries = isF2MaxSeriesModel(currentModel);
    const isF2ProSeries = name.includes('F2') && type === 'Pro';
    const isF1Max = name.includes('F1') && type === 'Max';
    const isF1Pro = name.includes('F1') && type === 'Pro';

    let steps = [];

    if (isF3MaxModel(currentModel)) {
      steps = F3_MAX_FACTORY_RESET_STEPS.slice();
    } else if (isMtUltraCardModel(currentModel)) {
      steps = F2_ULTRA_FACTORY_RESET_STEPS.slice();
    } else if (isF2MaxSeries) {
      // F2 MAX / Long锛氬師鏉ョ殑鍥涙娴佺▼锛堟渶鍚庝竴姝ュ甫鑷姩璋冨钩鍔ㄧ敾 + 纭閿級
      // 鍏ㄧ▼鑷姩鎾斁锛岀敤鎴峰彧鍦ㄦ渶鍚庝竴姝ョ偣鍑荤‘璁ょ粨鏉?      steps = [
        { text: '姝ｅ湪鎵撳紑鑷姩鏀跺洖', data: '鎵撳紑鏀跺洖', sendTimes: 2, interval: 500, delayNext: 2000 },
        { text: '姝ｅ湪寮€鍚嚜妫€', data: '寮€鍚嚜妫€', sendTimes: 2, interval: 500, delayNext: 2000 },
        { text: '姝ｅ湪鎵撳紑寮€鏈虹墝涓婄炕', data: '寮€鏈轰笂缈?, sendTimes: 2, interval: 500, delayNext: 2000 },
        { text: '姝ｅ湪鑷姩璋冨钩锛岃鐢ㄦ墜杩涜闃绘尅', data: '鑷姩璋冨钩', sendTimes: 2, interval: 500, delayNext: 0, isLeveling: true, isFinal: true }
      ];
    } else if (isF1Max) {
      // F1 MAX锛?      // 鍦ㄢ€滃垵濮嬪寲瑙掑害锛堟姌鍙犵偣褰掗浂锛夆€濅箣鍓嶏紝鍏堣缃€滃叧鏈轰綅缃?鏀跺洖鈥濓紙鍙戦€佲€滄墦寮€鏀跺洖鈥濓級
      // 涔嬪悗鍐嶈繘鍏ュ師鏈夊垵濮嬪寲娴佺▼锛岀涓€姝ヤ粛闇€鐢ㄦ埛鐐瑰嚮纭
      steps = [
        {
          text: '姝ｅ湪璁剧疆鍏虫満浣嶇疆涓烘敹鍥?,
          data: '鎵撳紑鏀跺洖',
          sendTimes: 2,
          interval: 500,
          delayNext: 2000
        },
        {
          text: '鍒濆鍖栬搴︿腑',
          data: '鍒濆鍖栬搴?,
          sendTimes: 2,
          interval: 500,
          delayNext: 0,          // 绛夊緟鐢ㄦ埛鐐瑰嚮纭
          showConfirm: true
        },
        {
          text: '璇烽暱鎸夋寜閽?绉?,
          data: null,
          sendTimes: 0,
          interval: 0,
          delayNext: 3000
        },
        {
          text: '鏂紑缁嗙孩绾?,
          data: null,
          sendTimes: 0,
          interval: 0,
          delayNext: 3000
        },
        {
          text: '璇疯瀵熶富鏉挎槸涓嶆槸杩樼户缁寒鐏?,
          data: null,
          sendTimes: 0,
          interval: 0,
          delayNext: 0,
          isFinal: true
        }
      ];
    } else if (isF2ProSeries) {
      // F2 PRO锛?      // 鏂囨鎷嗘垚澶氬彞锛屾瘡鍙ュ崟鐙樉绀?3 绉掞紝
      // 绗竴姝ュ彂閫佲€滃垵濮嬪寲瑙掑害鈥濓紝骞朵笖闇€瑕佺敤鎴风偣鍑烩€滅‘璁も€濆悗鎵嶈繘鍏ヤ笅涓€姝?      steps = [
        { 
          text: '鍒濆鍖栬搴︿腑',
          data: '鍒濆鍖栬搴?,
          sendTimes: 2,
          interval: 500,
          delayNext: 0,          // 馃敶 涓嶈嚜鍔ㄨ烦鍒颁笅涓€姝ワ紝绛夊緟鐢ㄦ埛鐐瑰嚮纭
          showConfirm: true      // 鍒濆鍖栬搴﹂樁娈典篃闇€瑕佺‘璁ら敭
        },
        { 
          text: '璇烽暱鎸夋寜閽?绉?,
          data: null,
          sendTimes: 0,
          interval: 0,
          delayNext: 3000
        },
        { 
          text: '鏂紑缁嗙孩绾?,
          data: null,
          sendTimes: 0,
          interval: 0,
          delayNext: 3000
        },
        { 
          text: '璇疯瀵熶富鏉挎槸涓嶆槸杩樼户缁寒鐏?,
          data: null,
          sendTimes: 0,
          interval: 0,
          delayNext: 0,
          isFinal: true
        }
      ];
    } else if (isF1Pro) {
      // F1 PRO锛氬彧鍙戦€佷竴娆♀€滃垵濮嬪寲瑙掑害鈥濓紝骞剁珛鍗虫樉绀哄甫纭閿?      steps = [
        {
          text: '鍒濆鍖栬搴︿腑',
          data: '鍒濆鍖栬搴?,
          sendTimes: 2,
          interval: 500,
          delayNext: 0,
          isFinal: true
        }
      ];
    } else {
      // 鍏滃簳锛氫娇鐢ㄩ粯璁ゆ楠わ紙涓嶅お鍙兘璧板埌杩欓噷锛?      steps = this.data.factoryResetSteps || [];
    }

    // 閲嶇疆姝ラ骞舵樉绀哄脊绐?    this.setData({
      showFactoryResetModal: true,
      factoryResetStep: 0,
      factoryResetSteps: steps
    });

    // 鎵ц鎵€鏈夋楠?    this.executeFactoryResetStep(0);
  },

  // 鎵ц鍑哄巶璁剧疆姝ラ
  executeFactoryResetStep(stepIndex) {
    // 濡傛灉鐢ㄦ埛宸茬粡鎵嬪姩涓柇锛堝叧闂脊绐楋級锛屼笉鍐嶇户缁悗缁楠?    if (!this.data.showFactoryResetModal) {
      console.log('鈴?[鍑哄巶璁剧疆] 寮圭獥宸插叧闂紝涓柇鍚庣画姝ラ');
      return;
    }
    const steps = this.data.factoryResetSteps || [];
    if (stepIndex >= steps.length) {
      // 鎵€鏈夋楠ゅ畬鎴愶紝淇濇寔寮圭獥鏄剧ず锛岀瓑寰呯敤鎴风偣鍑荤‘璁?      console.log('鉁?[鍑哄巶璁剧疆] 鎵€鏈夋楠ゅ畬鎴?);
      return;
    }

    const step = steps[stepIndex] || {};
    
    // 鏇存柊褰撳墠姝ラ
    this.setData({
      factoryResetStep: stepIndex
    });

    this.setData({
      factoryResetStep: stepIndex
    });

    const data = step.data;
    const sendTimes = step.sendTimes != null ? step.sendTimes : 2;
    const interval = step.interval != null ? step.interval : 500;
    const delayNext = step.delayNext != null ? step.delayNext : 2000;

    if (data) {
      console.log(`馃摛 [鍑哄巶璁剧疆] 姝ラ ${stepIndex + 1}: ${data}锛堣繛缁?{sendTimes}娆★紝闂撮殧${interval}ms锛塦);
      this.sendDataMultiple(data, sendTimes, interval);
    } else {
      console.log(`鈩癸笍 [鍑哄巶璁剧疆] 姝ラ ${stepIndex + 1}: 浠呮彁绀猴紝鏃犻渶鍙戦€佹暟鎹甡);
    }

    // 濡傛灉鏄?F1 MAX / F2 PRO 绯诲垪鐨勭涓€姝ワ紙闇€瑕佺‘璁わ級锛屾垨鏍囪涓?isFinal 鐨勬楠わ細
    // 涓嶈嚜鍔ㄨ繘鍏ヤ笅涓€姝ワ紝绛夊緟鐢ㄦ埛鐐瑰嚮鈥滅‘璁も€?    if (step.showConfirm || step.isFinal || delayNext <= 0 || stepIndex >= steps.length - 1) {
      console.log('鈩癸笍 [鍑哄巶璁剧疆] 褰撳墠姝ラ绛夊緟鐢ㄦ埛纭鎴栧凡鏄渶鍚庝竴姝?);
      return;
    }

    // 鍏朵粬姝ラ锛氬欢杩熷悗鑷姩鎵ц涓嬩竴姝?    setTimeout(() => {
      this.executeFactoryResetStep(stepIndex + 1);
    }, delayNext);
  },

  // 纭鍑哄巶璁剧疆瀹屾垚
  confirmFactoryReset() {
    const steps = this.data.factoryResetSteps || [];
    const currentIndex = this.data.factoryResetStep || 0;
    const currentStep = steps[currentIndex] || {};

    // 濡傛灉鏄渶缁堟楠わ紙isFinal锛夛紝鐐瑰嚮纭鍏抽棴寮圭獥
    if (currentStep.isFinal || currentIndex >= steps.length - 1) {
      this.setData({
        showFactoryResetModal: false,
        factoryResetStep: 0
      });
      console.log('鉁?[鍑哄巶璁剧疆] 鐢ㄦ埛纭瀹屾垚锛屽叧闂脊绐?);
      return;
    }

    // 鍏朵粬甯︾‘璁ら敭鐨勬楠わ紙渚嬪锛氬垵濮嬪寲瑙掑害涓級锛?    // 鐐瑰嚮纭鍚庤繘鍏ヤ笅涓€姝?    const nextIndex = currentIndex + 1;
    console.log(`鈩癸笍 [鍑哄巶璁剧疆] 鐢ㄦ埛纭姝ラ ${currentIndex + 1}锛岃繘鍏ユ楠?${nextIndex + 1}`);
    this.executeFactoryResetStep(nextIndex);
  },

  // 馃敶 鏂板锛氱敤鎴蜂富鍔ㄤ腑鏂嚭鍘傝缃紙鍙充笂瑙?X锛?  cancelFactoryReset() {
    console.log('鈴?[鍑哄巶璁剧疆] 鐢ㄦ埛鐐瑰嚮鍏抽棴锛岀珛鍗充腑鏂墍鏈夋楠?);
    this.setData({
      showFactoryResetModal: false,
      factoryResetStep: 0
    });
    // 涓嶉渶瑕侀澶栨竻鐞嗗畾鏃跺櫒锛歟xecuteFactoryResetStep 浼氬湪涓嬫妫€鏌ュ埌 showFactoryResetModal=false 鍚庤嚜鍔ㄥ仠姝?  },

  // 姝ラ2锛氭寜閽寜涓?  step2_ButtonPress() {
    this.stopStealthAnim();
    
    const isEnter = this.data.stealthTutorialMode === 'enter';
    const pressDuration = isEnter ? 3000 : 8000; // 杩涘叆3绉掞紝閫€鍑?绉?    const pressText = isEnter ? '闀挎寜鎸夐挳3绉? : '闀挎寜杞︽妸鎸夐挳8绉?;
    
    this.setData({
      stealthAnimPressing: true,  // 鎸夐挳锛氭寜涓?      stealthAnimLight: true,     // 鐏厜锛氱孩鑹诧紙浜級
      stealthAnimText: pressText
    });
    
    // 鏍规嵁妯″紡浣跨敤涓嶅悓鐨勬椂闂村悗杩涘叆姝ラ4锛堥棯鐑侊級
    this.stealthTutorialTimer = setTimeout(() => {
      this.step4_StartBlinking();
    }, pressDuration);
  },

  // 姝ラ4锛氱伅闂儊
  step4_StartBlinking() {
    const isEnter = this.data.stealthTutorialMode === 'enter';
    const blinkTimes = isEnter ? 3 : 5; // 杩涘叆闂儊3娆★紝閫€鍑洪棯鐑?娆?    const totalBlinks = blinkTimes * 2; // 姣忔闂儊闇€瑕?娆″垏鎹紙浜啋鐏級
    const blinkInterval = isEnter ? 200 : 500; // 杩涘叆0.2绉掞紝閫€鍑?.5绉?    const halfPoint = isEnter ? 3 : 5; // 闂儊涓€鍗婄殑鐐癸細杩涘叆3娆″垏鎹紝閫€鍑?娆″垏鎹?    
    // 鎸夐挳鍥炲埌绗竴甯х姸鎬侊紝璁剧疆闂儊鏂囧瓧
    this.setData({
      stealthAnimPressing: false, // 鎸夐挳锛氭湭鎸変笅锛堝洖鍒扮涓€甯э級
      stealthAnimLight: false,     // 鐏厜锛氱孩鑹诧紙涓嶄寒锛?      stealthAnimText: `鎸夐挳闂儊${blinkTimes}娆
    });
    
    let blinkCount = 0;
    
    // 鐏厜闂儊瀹氭椂鍣紙涓€鐩翠繚鎸?.5绉掗棿闅旓級
    this.stealthBlinkInterval = setInterval(() => {
      blinkCount++;
      
      // 鍒囨崲鐏厜鐘舵€?      this.setData({ 
        stealthAnimLight: !this.data.stealthAnimLight 
      });
      
      // 閫€鍑烘ā寮忥細闂儊涓€鍗婃椂锛屾枃瀛楁敼鎴愮孩鑹?璇锋澗寮€鎵嬫寚锛侊紒"锛屽苟寮€濮嬫枃瀛楅棯鐑?      if (!isEnter && blinkCount === halfPoint) {
        this.setData({
          stealthAnimText: '璇锋澗寮€鎵嬫寚锛侊紒',
          stealthAnimTextColor: 'red'
        });
        // 寮€濮嬫枃瀛楅棯鐑侊紙鐖嗛棯锛?.1绉掗棿闅旓級
        this.stealthTextBlinkInterval = setInterval(() => {
          this.setData({
            stealthAnimTextColor: this.data.stealthAnimTextColor === 'red' ? 'transparent' : 'red'
          });
        }, 100); // 鏂囧瓧闂儊闂撮殧0.1绉?      }
      
      // 闂儊瀹屾垚鍚?      if (blinkCount >= totalBlinks) {
        clearInterval(this.stealthBlinkInterval);
        this.stealthBlinkInterval = null;
        // 鍋滄鏂囧瓧闂儊
        if (this.stealthTextBlinkInterval) {
          clearInterval(this.stealthTextBlinkInterval);
          this.stealthTextBlinkInterval = null;
        }
        // 鎭㈠鏂囧瓧棰滆壊涓虹孩鑹?        if (!isEnter) {
          this.setData({
            stealthAnimTextColor: 'red'
          });
        }
        // 姝ラ5锛氶棯鐑佸畬鎴?        this.step5_Complete();
      }
    }, blinkInterval);
  },

  // 姝ラ5锛氶棯鐑佸畬鎴?  step5_Complete() {
    const isEnter = this.data.stealthTutorialMode === 'enter';
    
    this.setData({
      stealthAnimPressing: false, // 鎸夐挳锛氭湭鎸変笅
      stealthAnimLight: false,    // 鐏厜锛氱孩鑹诧紙涓嶄寒锛?      stealthAnimText: isEnter ? '宸茶繘鍏ラ殣钄芥ā寮? : '姝ゆ椂閫€鍑?,
      stealthAnimTextColor: 'black', // 淇濇寔榛戣壊
      stealthAnimTextScale: 1 // 姝ｅ父澶у皬
    });
    
    if (isEnter) {
      // 杩涘叆妯″紡锛?绉掑悗杩涘叆姝ラ6锛堣鍛婏級
      this.stealthTutorialTimer = setTimeout(() => {
        this.step6_Warning();
      }, 3000);
    } else {
      // 閫€鍑烘ā寮忥細4绉掑悗鐩存帴鍚敤鎸夐挳
      this.stealthTutorialTimer = setTimeout(() => {
        this.setData({
          stealthTutorialBtnDisabled: false
        });
      }, 4000);
    }
  },

  // 姝ラ6锛氳鍛婃彁绀猴紙绾㈣壊鏂囧瓧锛屾斁澶х缉灏?娆★級
  step6_Warning() {
    // 鏇存柊鏂囧瓧涓鸿鍛婏紝棰滆壊鏀逛负绾㈣壊
    this.setData({
      stealthAnimText: '璇锋敞鎰廫n涓嶈兘寮€鍚妯″紡闀挎椂闂村仠鏀撅紒锛?,
      stealthAnimTextColor: 'red'
    });
    
    // 鏀惧ぇ缂╁皬鍔ㄧ敾锛?娆★級
    let scaleCount = 0;
    const animateScale = () => {
      // 鏀惧ぇ鍒?.2鍊?      this.setData({ stealthAnimTextScale: 1.2 });
      
      setTimeout(() => {
        // 缂╁皬鍥?鍊?        this.setData({ stealthAnimTextScale: 1 });
        scaleCount++;
        
        if (scaleCount < 2) {
          // 濡傛灉杩樻病瀹屾垚2娆★紝缁х画涓嬩竴娆?          setTimeout(() => {
            animateScale();
          }, 300); // 闂撮殧300ms
        } else {
          // 鍔ㄧ敾瀹屾垚锛屽惎鐢ㄦ寜閽?          this.setData({
            stealthTutorialBtnDisabled: false
          });
        }
      }, 300); // 鏀惧ぇ鎸佺画鏃堕棿300ms
    };
    
    // 寮€濮嬬涓€娆″姩鐢?    setTimeout(() => {
      animateScale();
    }, 200);
  },

  // 鍋滄鍔ㄧ敾
  stopStealthAnim() {
    if (this.stealthTutorialTimer) {
      clearTimeout(this.stealthTutorialTimer);
      this.stealthTutorialTimer = null;
    }
    if (this.stealthBlinkInterval) {
      clearInterval(this.stealthBlinkInterval);
      this.stealthBlinkInterval = null;
    }
    if (this.stealthTextBlinkInterval) {
      clearInterval(this.stealthTextBlinkInterval);
      this.stealthTextBlinkInterval = null;
    }
  },

  // ===============================================
  // 銆愭柊澧炪€戝脊绐楅槻璇Е鏍稿績閫昏緫
  // ===============================================
  setModalDelay() {
    // 1. 绔嬪嵆閿佸畾
    this.setData({ modalBtnDisabled: true });
    
    // 2. 娓呴櫎鏃у畾鏃跺櫒 (闃叉棰戠箒瑙﹀彂鍐茬獊)
    if (this.modalDelayTimer) clearTimeout(this.modalDelayTimer);

    // 3. 1.5 绉掑悗瑙ｉ攣
    this.modalDelayTimer = setTimeout(() => {
      this.setData({ modalBtnDisabled: false });
    }, 1500);
  },

  scanModelToProductModel(model) {
    if (!model) return '';
    const name = model.name || '';
    const type = model.type || '';
    if (name === 'F1' && type === 'Pro') return 'F1 PRO';
    if (name === 'F1' && type === 'Max') return 'F1 MAX';
    if (name === 'F1' && isF1UltraType(type)) return 'F1 ULTRA';
    if (name === 'F2' && type === 'Pro') return 'F2 PRO';
    if (name === 'F2' && type === 'Max') return 'F2 MAX';
    if (name === 'F2' && isF2LongType(type)) return 'F2 Long';
    if (name === 'F2' && type === 'Ultra') return 'F2 ULTRA';
    if (name === 'F3' && type === 'Pro') return 'F3 PRO';
    if (name === 'F3' && type === 'Max') return 'F3 MAX';
    return `${name} ${type}`.trim();
  },

  normalizeSnFromBluetoothName(rawName) {
    const upper = String(rawName || '').trim().toUpperCase();
    if (!upper.startsWith('NB')) return '';
    const suffix = upper.replace(/^NB-?/, '').replace(/\s+/g, '');
    if (!suffix) return '';
    return `MT-${suffix}`;
  },

  async ensureAdminPrivilegeForSnFlow() {
    const ADMIN_CACHE_KEY = '__scan_admin_privilege_cache__';
    const ADMIN_CACHE_TTL = 10 * 60 * 1000;
    try {
      const cache = wx.getStorageSync(ADMIN_CACHE_KEY);
      if (cache && typeof cache.isAdmin === 'boolean' && cache.ts && (Date.now() - cache.ts < ADMIN_CACHE_TTL)) {
        if (this.data.isAdmin !== cache.isAdmin) {
          this.setData({ isAdmin: cache.isAdmin });
        }
        return;
      }
    } catch (e) {}
    await this.checkAdminPrivilege();
  },

  _markAdminDeviceRegistered(sn, registeredModel) {
    const model = String(registeredModel || '').trim();
    this._adminSessionRegisteredSn = sn || '';
    this._adminSessionRegisteredModel = model;
    const patch = { adminRegisteredSn: sn || '' };
    if (model) patch.adminRegisteredModel = model;
    this.setData(patch);
  },

  async maybeShowAdminSnRegisterModal(normalizedSn) {
    const model =
      this.data.currentModel ||
      this.data.models[this.data.currentIndex] ||
      null;
    const productModel = this.scanModelToProductModel(model);
    if (!productModel) {
      console.warn('[scan] 鏃犳硶瑙ｆ瀽浜у搧鍨嬪彿锛岃烦杩囩粦瀹氬脊绐?, model);
      return;
    }

    if (this._adminSessionRegisteredSn && this._adminSessionRegisteredSn === normalizedSn) {
      return;
    }

    try {
      const res = await wx.cloud.callFunction({
        name: 'adminRegisterSn',
        data: {
          action: 'check',
          sn: normalizedSn,
          productModel
        }
      });
      const r = res.result || {};
      if (!r.success) return;

      if (!r.showDialog) {
        if (r.reason === 'already_registered' && r.sn) {
          this._markAdminDeviceRegistered(r.sn, r.registeredModel);
        }
        return;
      }

      this.setData({
        showAdminSnModal: true,
        adminSnModalClosing: false,
        adminSnModalMode: r.mode || 'confirm_new',
        adminSnModalSn: r.sn || normalizedSn,
        adminSnModalTargetModel: r.targetModel || productModel,
        adminSnModalExistingModel: r.existingModel || '',
        adminSnRegisterSubmitting: false,
        adminSnShowModelPicker: false
      });
    } catch (err) {
      console.error('[scan] adminRegisterSn check failed', err);
    }
  },

  closeAdminSnModal() {
    this.setData({ adminSnModalClosing: true, adminSnRegisterSubmitting: false });
    setTimeout(() => {
      this.setData({
        showAdminSnModal: false,
        adminSnModalClosing: false,
        adminSnModalMode: '',
        adminSnModalSn: '',
        adminSnModalTargetModel: '',
        adminSnModalExistingModel: '',
        adminSnRegisterSubmitting: false,
        adminSnShowModelPicker: false
      });
    }, 420);
  },

  cancelAdminSnModal() {
    if (this.data.adminSnRegisterSubmitting) return;
    this.closeAdminSnModal();
  },

  /** 宸茬粦瀹氬叾浠栧瀷鍙锋椂锛氭部鐢ㄥ師缁戝畾锛屼笉闅忓綋鍓嶅崱鐗囨敼鍨嬪彿 */
  confirmAdminSnKeepBinding() {
    if (this.data.adminSnRegisterSubmitting) return;
    const sn = this.data.currentConnectedRawSn || this.data.adminSnModalSn;
    const model = this.data.adminSnModalExistingModel || this.data.adminRegisteredModel;
    if (sn) this._markAdminDeviceRegistered(sn, model);
    this.closeAdminSnModal();
    this._showCustomToast(`宸叉部鐢?${model || '鍘?} 缁戝畾`, 'none', 2000);
  },

  /** 鍨嬪彿涓嶄竴鑷达細鍒囨崲涓哄綋鍓嶅崱鐗囧瀷鍙?*/
  confirmAdminSnSwitchBinding() {
    if (this.data.adminSnRegisterSubmitting) return;
    const target = this.data.adminSnModalTargetModel;
    if (!target) return;
    this._submitAdminSnRegister(target, true);
  },

  openAdminSnOtherModelPicker() {
    if (this.data.adminSnRegisterSubmitting) return;
    this.setData({ adminSnShowModelPicker: true });
  },

  closeAdminSnModelPicker() {
    if (this.data.adminSnRegisterSubmitting) return;
    this.setData({ adminSnShowModelPicker: false });
  },

  onAdminSnPickOtherModel(e) {
    if (this.data.adminSnRegisterSubmitting) return;
    const picked = e.currentTarget.dataset.model;
    if (!picked) return;
    this.setData({ adminSnShowModelPicker: false });
    this._submitAdminSnRegister(picked, this.data.adminSnModalMode === 'change_model');
  },

  async confirmAdminSnRegister() {
    if (this.data.adminSnRegisterSubmitting) return;
    const { adminSnModalTargetModel } = this.data;
    if (!adminSnModalTargetModel) return;
    await this._submitAdminSnRegister(adminSnModalTargetModel, false);
  },

  async _submitAdminSnRegister(productModel, isUpdate) {
    if (this.data.adminSnRegisterSubmitting) return;
    const { adminSnModalSn, adminSnModalMode, currentConnectedRawSn, adminSelectedRepairId } = this.data;
    const sn = currentConnectedRawSn || adminSnModalSn;
    if (!sn || !productModel) return;

    // 宸查€夊敭鍚庡伐鍗曪細璧版崲鏈?SN 鏇挎崲锛堢户鎵胯川淇濓紝鏃ф満鎶ュ簾锛?    if (adminSelectedRepairId) {
      await this._completeDeviceReplacementIfNeeded(sn, productModel);
      return;
    }

    const needUpdate =
      isUpdate || adminSnModalMode === 'change_model';

    this.setData({ adminSnRegisterSubmitting: true });

    try {
      const res = await wx.cloud.callFunction({
        name: 'adminRegisterSn',
        data: {
          action: needUpdate ? 'update_model' : 'register',
          sn,
          productModel,
          deviceName: sn
        }
      });
      const r = res.result || {};
      if (r.success) {
        this._markAdminDeviceRegistered(sn, productModel);
        this._showCustomToast(r.msg || '缁戝畾鎴愬姛', 'success', 2000);
        this.closeAdminSnModal();
      } else {
        this._showCustomToast(r.msg || '鎿嶄綔澶辫触', 'none', 2500);
        this.setData({ adminSnRegisterSubmitting: false });
      }
    } catch (err) {
      console.error('[scan] adminRegisterSn register failed', err);
      this._showCustomToast('缃戠粶寮傚父锛岃閲嶈瘯', 'none', 2500);
      this.setData({ adminSnRegisterSubmitting: false });
    }
  },

  onAdminSnSwitchDevice() {
    if (this.data.adminSnRegisterSubmitting) return;
    this.closeAdminSnModal();
    this.handleDisconnect();
    setTimeout(() => {
      this.handleConnect();
    }, 500);
  },

  // ===============================================
  // 钃濈墮杩炴帴浜や簰 (淇敼鐗?
  // ===============================================
  async handleConnect() {
    if (Date.now() < (this._controlTapLockUntil || 0)) return;

    // 鑷姩閲嶈繛涓細鐐瑰嚮鑳跺泭 鈫?鍋滄閲嶈繛骞剁珛鍗宠繘鍏ユ墜鍔ㄦ壂鎻忥紙鏃犻渶鍐嶇偣绗簩娆★級
    if (this.data.isBleAutoReconnecting) {
      this.stopBleAutoReconnect(false, true);
    }

    // 闃叉閲嶅鐐瑰嚮锛氬鏋滃凡杩炴帴銆佹鍦ㄨ繛鎺ャ€佹鍦ㄨ烦杞埌OTA椤甸潰锛屽垯鐩存帴杩斿洖
    if (this.data.remoteAssistCapsuleActive) {
      this._showCustomToast('杩滃崗涓紝璇烽€氳繃涓婃柟缁撴潫杩滃崗', 'none', 2000);
      return;
    }
    if (this.data.isConnected || this.data.isConnecting || this.data.isNavigatingToOta) {
      return;
    }

    // 鐢ㄦ埛涓诲姩杩炴帴锛氭壂鎻忔湡闂翠笉鑷姩閲嶈繛涓婁竴鍙拌澶囷紝閬垮厤鎹㈡満鍚庝粛鍗″湪銆屾鍦ㄩ噸杩炪€?    this._bleReconnectStoppedByUser = true;
    this._clearBleReconnectTimers();
    this._startBleScanSession();
  },

  _startBleScanSession() {
    if (this._bleScanTimeoutTimer) {
      clearTimeout(this._bleScanTimeoutTimer);
      this._bleScanTimeoutTimer = null;
    }

    const isAutoReconnect = !!this.data.isBleAutoReconnecting;

    // 鑷姩閲嶈繛鏃惰烦杩囥€岄潬杩戣溅杈嗐€嶆彁绀猴紝绔嬪嵆鎵弿
    if (!isAutoReconnect) {
      this.setData({ showApproachTip: true });
      setTimeout(() => { this.setData({ showApproachTip: false }); }, 2000);
    }

    this.setData({ isScanning: true, isConnecting: false });

    // 3. 鍒濆鍖栬摑鐗欓€傞厤鍣?    this.ble.initBluetoothAdapter()
      .then(() => { 
        this.ble.startScan(); 
        
        this._bleScanTimeoutTimer = setTimeout(() => {
          if (!this.data.isConnected && this.data.isScanning) {
            this.ble.stopScan();
            if (this.data.isBleAutoReconnecting) {
              this.setData({ isScanning: false, isConnecting: false });
              this.startBleAutoReconnect();
              return;
            }
            if (!this.data.isBleAutoReconnecting) {
              this.setData({ isScanning: false, isConnecting: false });
            }
          }
        }, isAutoReconnect ? 8000 : 15000);
      })
      .catch((err) => {
        console.error("钃濈墮鍒濆鍖栧け璐?, err);
        
        this.setData({ 
          isScanning: false,
          isConnecting: false,
          isBleAutoReconnecting: false,
          showBluetoothAlert: true
        });
        
        this.setModalDelay();
        wx.vibrateLong(); 
      });
  },

  stopBleAutoReconnect(showTip, markUserStopped) {
    this._clearBleReconnectTimers();
    if (markUserStopped) this._bleReconnectStoppedByUser = true;
    if (this.ble) this.ble.stopScan();
    this._applyBleLinkUi({
      isBleAutoReconnecting: false,
      isScanning: false,
      isConnecting: false,
      bleReconnectAttempt: 0
    });
    if (showTip) {
      this._showCustomToast('宸插仠姝㈤噸杩?, 'none', 1500);
    }
  },

  _clearBleReconnectTimers() {
    if (this._bleReconnectTimer) {
      clearTimeout(this._bleReconnectTimer);
      this._bleReconnectTimer = null;
    }
    if (this._bleScanTimeoutTimer) {
      clearTimeout(this._bleScanTimeoutTimer);
      this._bleScanTimeoutTimer = null;
    }
  },

  startBleAutoReconnect() {
    this._requestBleAutoReconnect('start');
  },

  _requestBleAutoReconnect(reason) {
    if (this._bleReconnectStoppedByUser || !this._lastBleDevice) return;
    if (this.data.isConnected || this.data.uiBleConnected) return;

    if (this._bleReconnectTimer) {
      clearTimeout(this._bleReconnectTimer);
      this._bleReconnectTimer = null;
    }

    const attempt = (this.data.bleReconnectAttempt || 0) + 1;
    if (attempt > 5) {
      this.stopBleAutoReconnect(false, false);
      this.setData({ showDisconnectTip: true });
      setTimeout(() => this.setData({ showDisconnectTip: false }), 2000);
      return;
    }

    console.log('[BLE] schedule auto reconnect', { reason, attempt });

    this.setData({
      isBleAutoReconnecting: true,
      isScanning: true,
      isConnecting: false,
      showDisconnectTip: false,
      bleReconnectAttempt: attempt
    });

    const sinceLost = Date.now() - (this._lastBleLinkLostAt || 0);
    const lostCooldown = sinceLost < 4000 ? (4000 - sinceLost) : 0;
    const delayMs = Math.max(
      attempt === 1 ? 800 : Math.min(3000, 500 + (attempt - 1) * 400),
      lostCooldown
    );
    this._bleReconnectTimer = setTimeout(() => {
      this._bleReconnectTimer = null;
      if (this._bleReconnectStoppedByUser || this.data.isConnected) return;
      this._attemptBleReconnect();
    }, delayMs);
  },

  _attemptBleReconnect() {
    const dev = this._lastBleDevice;
    this.ble.initBluetoothAdapter()
      .then(() => {
        if (this._bleReconnectStoppedByUser || this.data.isConnected) return;
        if (!dev || !dev.deviceId) {
          this._startBleScanSession();
          return;
        }
        this.setData({ isConnecting: true, isScanning: false });
        return this.ble.connectDevice(dev).catch((err) => {
          console.warn('[BLE] direct reconnect connect failed', err);
          this.setData({ isConnecting: false });
        });
      })
      .catch((err) => {
        console.warn('[BLE] direct reconnect init failed', err);
        if (!this._bleReconnectStoppedByUser && !this.data.isConnected) {
          this.setData({ isConnecting: false });
          this._requestBleAutoReconnect('init_failed');
        }
      });
  },

  async _checkConnectedSnAllowed(normalizedSn) {
    try {
      const res = await wx.cloud.callFunction({
        name: 'deviceReplacement',
        data: { action: 'checkSn', sn: normalizedSn }
      });
      const r = res.result || {};
      if (r.success && r.ok === false) {
        this._showCustomToast(r.msg || '璇ヨ澶囦笉鍙敤', 'none', 2800);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('[scan] checkSn failed', err);
      return true;
    }
  },

  async _loadAwaitingReplacementRepairs() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'deviceReplacement',
        data: { action: 'listAwaiting' }
      });
      const r = res.result || {};
      if (r.success && Array.isArray(r.data)) return r.data;
    } catch (err) {
      console.warn('[scan] listAwaiting failed', err);
    }
    return [];
  },

  async _maybeShowAdminRepairPickerThenSn(normalizedSn) {
    const awaiting = await this._loadAwaitingReplacementRepairs();
    if (awaiting.length > 0) {
      this.setData({
        showAdminRepairPicker: true,
        adminRepairPickerClosing: false,
        adminAwaitingRepairs: awaiting,
        adminSelectedRepairId: '',
        adminSelectedRepair: null
      });
      this._pendingAdminSnAfterRepair = normalizedSn;
      return;
    }
    await this.maybeShowAdminSnRegisterModal(normalizedSn);
  },

  closeAdminRepairPicker() {
    this.setData({ adminRepairPickerClosing: true });
    setTimeout(() => {
      this.setData({
        showAdminRepairPicker: false,
        adminRepairPickerClosing: false,
        adminAwaitingRepairs: []
      });
      const pendingSn = this._pendingAdminSnAfterRepair;
      this._pendingAdminSnAfterRepair = '';
      if (pendingSn) this.maybeShowAdminSnRegisterModal(pendingSn);
    }, 320);
  },

  onPickAdminRepair(e) {
    const id = e.currentTarget.dataset.id;
    const item = (this.data.adminAwaitingRepairs || []).find((r) => r._id === id);
    if (!item) return;
    this.setData({
      adminSelectedRepairId: id,
      adminSelectedRepair: item
    });
  },

  confirmAdminRepairPick() {
    const { adminSelectedRepairId, adminSelectedRepair } = this.data;
    if (!adminSelectedRepairId || !adminSelectedRepair) {
      this._showCustomToast('璇烽€夋嫨鍞悗宸ュ崟', 'none', 2000);
      return;
    }
    const pendingSn = this._pendingAdminSnAfterRepair;
    this._pendingAdminSnAfterRepair = '';
    this.setData({
      showAdminRepairPicker: false,
      adminRepairPickerClosing: false
    });
    if (pendingSn) {
      this.maybeShowAdminSnRegisterModal(pendingSn);
    }
  },

  skipAdminRepairPick() {
    this.setData({
      adminSelectedRepairId: '',
      adminSelectedRepair: null
    });
    this.closeAdminRepairPicker();
  },

  async _completeDeviceReplacementIfNeeded(sn, productModel) {
    const repairId = this.data.adminSelectedRepairId;
    if (!repairId) return false;

    this.setData({ adminSnRegisterSubmitting: true });
    try {
      const res = await wx.cloud.callFunction({
        name: 'deviceReplacement',
        data: {
          action: 'complete',
          repairId,
          newSn: sn,
          productModel
        }
      });
      const r = res.result || {};
      if (r.success) {
        this._markAdminDeviceRegistered(sn, r.productModel || productModel);
        this.setData({
          adminSelectedRepairId: '',
          adminSelectedRepair: null
        });
        this._showCustomToast(r.msg || '鎹㈡満瀹屾垚锛岀敤鎴?SN 宸叉洿鏂?, 'success', 2500);
        this.closeAdminSnModal();
        return true;
      }
      this._showCustomToast(r.msg || '鎹㈡満澶辫触', 'none', 2800);
      this.setData({ adminSnRegisterSubmitting: false });
      return false;
    } catch (err) {
      console.error('[scan] complete replacement failed', err);
      this._showCustomToast('鎹㈡満澶辫触锛岃閲嶈瘯', 'none', 2500);
      this.setData({ adminSnRegisterSubmitting: false });
      return false;
    }
  },

  handleDisconnect() {
    if (this.data.remoteAssistRole === 'admin' && this.data.remoteAssistSessionId) {
      this.onEndRemoteAssistSession();
      return;
    }
    this.stopBleAutoReconnect(false, true);
    this._bleReconnectStoppedByUser = true;
    this._stopBleLinkWatch();
    if (this.ble) {
      this.ble.stopScan();
      this.ble.disconnect(true);
    } else if (this.data.isConnected) {
      this.onBleDisconnected({ unexpected: false, device: this._lastBleDevice });
    }
  },

  // 鏂板锛氬叧闂摑鐗欐彁绀哄脊绐楋紙甯︽敹缂╅€€鍑哄姩鐢伙級
  closeBluetoothAlert() {
    if (this.data.modalBtnDisabled) return; // 闃茶瑙︼細杩樺湪閿佸畾涓?    this.setData({ bluetoothAlertClosing: true });
    setTimeout(() => {
      this.setData({ 
        showBluetoothAlert: false,
        bluetoothAlertClosing: false
      });
    }, 420);
  },


  // 鐩戝惉鏂紑 (F2 浠呴潬寰俊 onBLEConnectionStateChange锛屼笉鍋氫富鍔ㄨ疆璇㈤伩鍏嶈埖鏈鸿繍杞椂璇垽鏂繛)
  _startBleLinkWatch() {
    this._stopBleLinkWatch();
    this._f2LastBleRxAt = Date.now();
    if (isF2MaxStatusBleModel(this.data.currentModel)) {
      return;
    }
    this._bleLinkWatchTick = 0;
    this._tickBleLinkWatch();
    this._bleLinkWatchTimer = setInterval(() => {
      this._tickBleLinkWatch();
    }, 250);
  },

  _stopBleLinkWatch() {
    if (this._bleLinkWatchTimer) {
      clearInterval(this._bleLinkWatchTimer);
      this._bleLinkWatchTimer = null;
    }
  },

  _tickBleLinkWatch() {
    if (!this.data.isConnected) {
      this._stopBleLinkWatch();
      return;
    }
    const ble = this.ble;
    const deviceId = ble && ble.device && ble.device.deviceId;
    if (!deviceId) return;

    // 鍒氳繛涓婃暟绉掑唴涓嶅仛涓诲姩鎺㈡祴锛岄伩鍏?GATT/杩炴帴鎬?API 璇姤瀵艰嚧閲嶈繛椋庢毚
    if (Date.now() < (this._bleConnectGraceUntil || 0)) return;

    this._bleLinkWatchTick = (this._bleLinkWatchTick || 0) + 1;
    const remoteUser = this._isRemoteAssistUserSessionActive();
    const slowWatch = remoteUser && (this._bleLinkWatchTick % 8 !== 0);

    if (!slowWatch) {
      if (typeof wx.getBLEConnectionState === 'function') {
        wx.getBLEConnectionState({
          deviceId,
          success: (res) => {
            if (res.connected) {
              this._bleConnProbeFailStreak = 0;
              return;
            }
            this._bleConnProbeFailStreak = (this._bleConnProbeFailStreak || 0) + 1;
            if (this._bleConnProbeFailStreak >= 8) {
              this._bleConnProbeFailStreak = 0;
              this._handleBleLinkLost('connection_state');
            }
          },
          fail: () => {
            // API 澶辫触涓嶇瓑浜庢柇杩?          }
        });
      }
    }

    if (slowWatch) return;

    // F2 鐘舵€佸寘鐢卞浐浠跺績璺充笂鎶ワ紱涓嶅啀鐢?getBLEDeviceServices 鎺㈡祴锛屾瀬鏄撹鍒ゆ柇杩?    if (isF2MaxStatusBleModel(this.data.currentModel)) {
      this._bleGattProbeFailStreak = 0;
      return;
    }

    if (this._f2LastBleRxAt) {
      const staleMs = Date.now() - this._f2LastBleRxAt;
      if (staleMs > 12000) {
        wx.getBLEDeviceServices({
          deviceId,
          success: () => {
            this._bleGattProbeFailStreak = 0;
          },
          fail: () => {
            this._bleGattProbeFailStreak = (this._bleGattProbeFailStreak || 0) + 1;
            if (this._bleGattProbeFailStreak >= 5 && !remoteUser) {
              this._bleGattProbeFailStreak = 0;
              this._handleBleLinkLost('gatt_probe');
            }
          }
        });
      } else {
        this._bleGattProbeFailStreak = 0;
      }
    }
  },

  _handleBleLinkLost(source) {
    if (this._bleLinkLostPending) return;
    if (this.ble && this.ble._closingConnection) return;
    if (!this.data.isConnected && !(this.ble && this.ble.device)) return;

    const dev = (this.ble && this.ble.device) || this._lastBleDevice;
    const deviceId = dev && dev.deviceId;
    if (!deviceId) return;

    const activeId = this._activeBleDeviceId || deviceId;
    if (deviceId !== activeId) return;

    this._bleLinkLostPending = true;
    const finishLost = () => {
      console.warn('[BLE] link lost:', source);
      this._lastBleLinkLostAt = Date.now();
      this._stopBleLinkWatch();
      if (this.ble) {
        this.ble._suppressCloseForDevice(deviceId);
        this.ble._manualDisconnect = false;
        this.ble._disconnectIntentManual = false;
        this.ble.device = null;
        this.ble.hasConnected = false;
        this.ble._notifyDisconnected({
          unexpected: true,
          device: dev,
          source: 'link_lost_' + source
        });
      } else {
        this.onBleDisconnected({ unexpected: true, device: dev, source });
      }
      setTimeout(() => {
        this._bleLinkLostPending = false;
      }, 300);
    };

    const confirmAndFinish = () => {
      if (this.ble && typeof this.ble.probeLinkAlive === 'function') {
        this.ble.probeLinkAlive(deviceId).then((alive) => {
          if (alive) {
            this._bleLinkLostPending = false;
            return;
          }
          if (this._isRemoteAssistUserSessionActive()) {
            setTimeout(() => {
              this.ble.probeLinkAlive(deviceId).then((alive2) => {
                if (alive2) {
                  this._bleLinkLostPending = false;
                  return;
                }
                finishLost();
              });
            }, 600);
            return;
          }
          finishLost();
        });
        return;
      }
      finishLost();
    };

    confirmAndFinish();
  },

  onBleDisconnected(meta) {
    const info = meta || {};
    if (this._isStaleBleDisconnect(info)) {
      console.log('[BLE] ignore stale disconnect', info.device && info.device.deviceId);
      return;
    }
    if (info.device && info.device.deviceId) {
      this._bleDisconnectHandledId = info.device.deviceId;
      this._bleDisconnectHandledAt = Date.now();
    }

    const unexpected = !!info.unexpected;
    if (info.device) this._lastBleDevice = info.device;
    this._activeBleDeviceId = '';

    this._publishBleToVoiceBridge(false);
    this._teardownF2FaultBleListener();
    this._clearBleSendQueue();

    const src = String(info.source || '');
    const probeFalsePositive = src.indexOf('link_lost_gatt_probe') >= 0
      || src.indexOf('link_lost_connection_state') >= 0;
    const shouldReconnect = unexpected
      && !probeFalsePositive
      && !this._bleReconnectStoppedByUser
      && this._lastBleDevice;

    this._applyBleLinkUi({
      isConnected: false,
      isConnecting: false,
      isScanning: false,
      showDisconnectTip: !unexpected && !this.data.isBleAutoReconnecting
    }, () => {
      this._scheduleRemoteStatePush();
      if (shouldReconnect) {
        if (!this.data.isBleAutoReconnecting) {
          this.setData({ bleReconnectAttempt: 0 });
        }
        this._requestBleAutoReconnect('disconnected');
      } else if (!this.data.isBleAutoReconnecting) {
        setTimeout(() => {
          this.setData({ showDisconnectTip: false });
        }, 1500);
      }
    });
  },

  // 馃敶 妫€鏌ユ寚瀹氳澶囨槸鍚︽湁OTA杩炴帴璁板綍锛堟牴鎹澶嘔D鍒ゆ柇锛?  async checkOtaConnection(deviceId) {
    try {
      // 馃敶 绠＄悊鍛樿烦杩?OTA 妫€鏌ワ紝鐩存帴鏀捐
      if (this.data.isAdmin) {
        console.log('馃攳 [checkOtaConnection] 绠＄悊鍛樻ā寮忥紝璺宠繃 OTA 鏍￠獙');
        return true;
      }
      
      // 瀵逛簬 F2 LONG 绯诲垪璁惧锛團2 Max Long锛夛紝鏃犻渶寮哄埗OTA锛岀洿鎺ユ斁琛?      const cur = this.data.currentModel || {};
      const isF2Long = cur.name === 'F2' && cur.type && cur.type.indexOf('Long') !== -1;
      if (isF2Long) {
        console.log('馃攳 [checkOtaConnection] 褰撳墠涓?F2 LONG 绯诲垪锛岃烦杩?OTA 鏍￠獙');
        return true;
      }
      
      if (!deviceId) {
        console.warn('鈿狅笍 [checkOtaConnection] 璁惧ID涓嶅瓨鍦?);
        return false;
      }
      
      console.log('馃攳 [checkOtaConnection] 妫€鏌ヨ澶嘔D:', deviceId);
      
      // 鏌ヨ浜戠鏁版嵁搴擄細鏌ユ壘璇ヨ澶囨槸鍚︽湁OTA璁板綍
      const db = wx.cloud.database();
      const res = await db.collection('ota_connections')
        .where({ deviceId: deviceId })
        .get();
      
      console.log('馃攳 [checkOtaConnection] 鏌ヨ缁撴灉:', {
        deviceId: deviceId,
        count: res.data.length,
        records: res.data
      });
      
      // 濡傛灉鏈夎褰曪紝杩斿洖true锛涘惁鍒欒繑鍥瀎alse
      const hasRecord = res.data.length > 0;
      console.log('馃攳 [checkOtaConnection] 璁惧鏄惁鏈塐TA璁板綍:', hasRecord);
      return hasRecord;
    } catch (err) {
      console.error('鉂?[checkOtaConnection] 妫€鏌ュけ璐?', err);
      // 濡傛灉鏌ヨ澶辫触锛屼负浜嗗畨鍏ㄨ捣瑙侊紝杩斿洖false鎷掔粷杩炴帴
      return false;
    }
  },

  // 馃敶 鏄剧ず闇€瑕丱TA鍗囩骇鐨勬彁绀猴紙浣跨敤toast鏍峰紡锛?  showOtaRequiredTip() {
    // 濡傛灉宸茬粡鍦ㄨ烦杞腑锛岀洿鎺ヨ繑鍥烇紝闃叉閲嶅璺宠浆
    if (this.data.isNavigatingToOta) {
      return;
    }
    
    // 璁剧疆璺宠浆鏍囪锛岄槻姝㈤噸澶嶇偣鍑?    this.setData({ isNavigatingToOta: true });
    
    // 鏄剧ず鎻愮ず锛堜娇鐢╰oast鏍峰紡锛?    this.setData({ showOtaTip: true });
    
    // 2.5绉掑悗鑷姩璺宠浆鍒癘TA椤甸潰
    setTimeout(() => {
      this.setData({ showOtaTip: false });
      wx.navigateTo({ 
        url: '/package-biz/pages/ota/ota',
        success: () => {
          // 璺宠浆鎴愬姛鍚庯紝閲嶇疆鏍囪锛堝湪椤甸潰杩斿洖鏃朵細閲嶆柊璁剧疆锛?          console.log('鉁?宸茶烦杞埌OTA椤甸潰');
        },
        fail: (err) => {
          console.error('璺宠浆澶辫触:', err);
          // 璺宠浆澶辫触鏃堕噸缃爣璁帮紝鍏佽閲嶈瘯
          this.setData({ isNavigatingToOta: false });
          this._showCustomToast('璇峰厛杩涜OTA鍗囩骇', 'none');
        }
      });
    }, 2500);
  },

  // ===============================================
  // 椤甸潰浜や簰
  // ===============================================
  onTouchStartMain(e) {
    if (this._isRemoteAssistUserLocked()) return;
    if (this._isSwipeAnimating) return;
    if (e.changedTouches.length > 0) {
      if (this._scanPerfDebug) {
        this._scanPerf.moveEvents = 0;
        this._scanPerf.moveSetDataCostTotal = 0;
        this._scanPerf.moveSetDataCostMax = 0;
        this._scanPerf.moveLastLogAt = Date.now();
        console.log('[scan-perf] touchStart', {
          x: e.changedTouches[0].clientX,
          currentIndex: this.data.currentIndex
        });
      }
      this.setData({
        touchStartX: e.changedTouches[0].clientX,
        isDraggingModel: true,
        modelDragOffset: 0
      });
    }
  },

  onTouchMoveMain(e) {
    if (this._isRemoteAssistUserLocked()) return;
    if (this._isSwipeAnimating) return;
    if (!this.data.isDraggingModel) return;
    if (!e.touches || !e.touches.length) return;

    const touchCurrentX = e.touches[0].clientX;
    const startX = this.data.touchStartX;
    let diff = touchCurrentX - startX;

    const maxDrag = 250;
    if (diff > maxDrag) diff = maxDrag;
    if (diff < -maxDrag) diff = -maxDrag;

    const dragRatio = Math.min(1, Math.abs(diff) / maxDrag);
    let nextCardOffset = 85;
    let prevCardOffset = -85;
    let activeScale = 1.08;
    let nextModelScale = 0.86;
    let prevModelScale = 0.86;
    let activeCardOpacity = 1;
    let nextCardOpacity = 0.9;
    let prevCardOpacity = 0.9;
    if (diff < 0) {
      nextCardOffset = 85 - dragRatio * 85;
      activeScale = 1.08 - dragRatio * 0.2;
      nextModelScale = 0.86 + dragRatio * 0.2;
      activeCardOpacity = 1 - dragRatio * 0.34;
      nextCardOpacity = 0.86 + dragRatio * 0.14;
      prevCardOffset = -108;
      prevCardOpacity = 0;
    } else if (diff > 0) {
      prevCardOffset = -85 + dragRatio * 85;
      activeScale = 1.08 - dragRatio * 0.2;
      prevModelScale = 0.86 + dragRatio * 0.2;
      activeCardOpacity = 1 - dragRatio * 0.34;
      prevCardOpacity = 0.86 + dragRatio * 0.14;
      nextCardOffset = 108;
      nextCardOpacity = 0;
    }

    const setDataStart = Date.now();
    this.setData({
      modelDragOffset: diff,
      nextCardOffsetPercent: nextCardOffset,
      prevCardOffsetPercent: prevCardOffset,
      modelActiveScale: activeScale,
      modelSideScale: 0.86,
      nextModelScale,
      prevModelScale,
      activeCardOpacity,
      nextCardOpacity,
      prevCardOpacity
    }, () => {
      if (!this._scanPerfDebug) return;
      const cost = Date.now() - setDataStart;
      const perf = this._scanPerf;
      perf.moveEvents += 1;
      perf.moveSetDataCostTotal += cost;
      if (cost > perf.moveSetDataCostMax) perf.moveSetDataCostMax = cost;

      const now = Date.now();
      if (now - perf.moveLastLogAt >= 350) {
        const avg = perf.moveEvents ? (perf.moveSetDataCostTotal / perf.moveEvents).toFixed(2) : '0.00';
        console.log('[scan-perf] move window', {
          events: perf.moveEvents,
          avgSetDataCostMs: Number(avg),
          maxSetDataCostMs: perf.moveSetDataCostMax,
          dragOffset: diff,
          nextCardOffset: Number(nextCardOffset.toFixed(2)),
          prevCardOffset: Number(prevCardOffset.toFixed(2))
        });
        perf.moveEvents = 0;
        perf.moveSetDataCostTotal = 0;
        perf.moveSetDataCostMax = 0;
        perf.moveLastLogAt = now;
      }
    });
  },

  onTouchEnd(e) {
    if (this._isRemoteAssistUserLocked()) return;
    if (this._isSwipeAnimating) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchEndX - this.data.touchStartX;
    const threshold = 80;

    const needSwipe = Math.abs(diff) >= threshold;
    const direction = diff > 0 ? 'prev' : 'next';
    const total = this.data.models.length;
    const canSwipe = direction === 'next'
      ? this.data.currentIndex < total - 1
      : this.data.currentIndex > 0;

    this.setData({ isDraggingModel: false });

    if (!needSwipe || !canSwipe) {
      this.setData({
        modelDragOffset: 0,
        nextCardOffsetPercent: 85,
        prevCardOffsetPercent: -85,
        modelActiveScale: 1.08,
        modelSideScale: 0.86,
        nextModelScale: 0.86,
        prevModelScale: 0.86,
        activeCardOpacity: 1,
        nextCardOpacity: 0.9,
        prevCardOpacity: 0.9
      });
      if (this._scanPerfDebug) {
        console.log('[scan-perf] touchEnd(no-swipe)', { diff, threshold });
      }
      return;
    }

    this._animateSwipeOutAndSwitch(direction);
    if (this._scanPerfDebug) {
      console.log('[scan-perf] touchEnd(swipe)', { diff, direction });
    }
  },

  _animateSwipeOutAndSwitch(direction) {
    if (this._isSwipeAnimating) return;
    this._isSwipeAnimating = true;

    const isNext = direction === 'next';
    this.setData({
      modelDragOffset: isNext ? -420 : 420,
      nextCardOffsetPercent: isNext ? 0 : 108,
      prevCardOffsetPercent: isNext ? -108 : 0,
      modelActiveScale: 0.82,
      nextModelScale: isNext ? 1.08 : 0.86,
      prevModelScale: isNext ? 0.86 : 1.08,
      activeCardOpacity: 0.06,
      nextCardOpacity: isNext ? 1 : 0,
      prevCardOpacity: isNext ? 0 : 1
    });

    setTimeout(() => {
      this.swipe(direction);
      this._isSwipeAnimating = false;
    }, 110);
  },

  swipe(direction) {
    let current = this.data.currentIndex;
    const total = this.data.models.length;
    if (direction === 'next') {
      if (current < total - 1) current += 1;
    } else if (current > 0) {
      current -= 1;
    }
    this.updateCardStatus(current);
  },

  updateCardStatus(current, done) {
    const updateStart = Date.now();
    const total = this.data.models.length;
    const prevCurrent = this.data.currentIndex;
    const safeCurrent = Math.max(0, Math.min(total - 1, current));
    const getStatus = (index, cur) => {
      if (index === cur) return 'active';
      if (index === cur + 1 && cur + 1 < total) return 'next';
      if (index === cur - 1 && cur - 1 >= 0) return 'prev';
      return 'hidden';
    };

    const affected = new Set([prevCurrent, prevCurrent - 1, prevCurrent + 1, safeCurrent, safeCurrent - 1, safeCurrent + 1]);
    const patch = {
      currentIndex: safeCurrent,
      modelDragOffset: 0,
      nextCardOffsetPercent: 85,
      prevCardOffsetPercent: -85,
      modelActiveScale: 1.08,
      modelSideScale: 0.86,
      nextModelScale: 0.86,
      prevModelScale: 0.86,
      activeCardOpacity: 1,
      nextCardOpacity: 0.9,
      prevCardOpacity: 0.9
    };
    affected.forEach((idx) => {
      if (idx < 0 || idx >= total) return;
      patch[`models[${idx}].status`] = getStatus(idx, safeCurrent);
    });
    this.setData(patch, () => {
      if (this._scanPerfDebug) {
        console.log('[scan-perf] updateCardStatus', {
          from: prevCurrent,
          to: safeCurrent,
          affectedCount: Object.keys(patch).filter((k) => k.startsWith('models[')).length,
          setDataCostMs: Date.now() - updateStart
        });
      }
      this._refreshRemoteAssistCardFlags();
      this._recalcRemoteAssistPendingForCard();
      if (typeof done === 'function') done(safeCurrent);
    });
  },
  onDetailSwipeStart(e) {
    if (!this.data.showDetail || this.data.detailMode !== 'main') return;
    if (!e.touches || !e.touches.length) return;
    const t = e.touches[0];
    this.setData({
      detailSwipeStartX: t.clientX,
      detailSwipeStartY: t.clientY,
      detailSwipeTracking: true
    });
  },

  onDetailSwipeMove(e) {
    if (!this.data.detailSwipeTracking) return;
    if (!this.data.showDetail || this.data.detailMode !== 'main') return;
    if (!e.touches || !e.touches.length) return;
    const t = e.touches[0];
    const dx = t.clientX - this.data.detailSwipeStartX;
    const dy = t.clientY - this.data.detailSwipeStartY;
    // 鍨傜洿婊戝姩鏄庢樉鏃讹紝鍙栨秷鏈杩斿洖鎵嬪娍锛岄伩鍏嶄笌椤甸潰鍐呴儴浜や簰鍐茬獊
    if (Math.abs(dy) > 40 && Math.abs(dy) > Math.abs(dx)) {
      this.setData({ detailSwipeTracking: false });
    }
  },

  onDetailSwipeEnd(e) {
    if (this._isRemoteAssistUserLocked()) return;
    if (!this.data.detailSwipeTracking) return;
    this.setData({ detailSwipeTracking: false });
    if (!this.data.showDetail || this.data.detailMode !== 'main') return;
    if (!e.changedTouches || !e.changedTouches.length) return;
    const t = e.changedTouches[0];
    const startX = this.data.detailSwipeStartX;
    const dx = t.clientX - this.data.detailSwipeStartX;
    const dy = t.clientY - this.data.detailSwipeStartY;
    // 宸﹁竟缂樹紭鍏堬細浠庡睆骞曟渶宸︿晶杞绘壂鏃讹紝闄嶄綆瑙﹀彂闃堝€硷紝鏇磋创杩戠郴缁熻繑鍥炴墜鍔?    const isEdgeSwipe = startX <= 28;
    const threshold = isEdgeSwipe ? 40 : 70;
    // 璇︽儏灞傛敮鎸佸乏鍙虫í婊戣繑鍥炲浘浜岋紙浣犱範鎯乏婊戜篃鍙Е鍙戯級
    if (Math.abs(dx) > threshold && Math.abs(dy) < 50) {
      this._closeDetailAnimated();
    }
  },

  onTapCard(e) {
    if (Date.now() < (this._controlTapLockUntil || 0)) return;
    const index = parseInt(e.currentTarget.dataset.index, 10);
    if (index !== this.data.currentIndex) {
      this.updateCardStatus(index);
    }
  },

  _openDetailAnimated(patch = {}) {
    const guardMs = 480;
    this._detailClosing = false;
    this._controlTapLockUntil = Date.now() + guardMs;
    if (this._detailEnterTimer) clearTimeout(this._detailEnterTimer);
    if (this._detailCloseTimer) clearTimeout(this._detailCloseTimer);
    if (this._detailBlockTimer) clearTimeout(this._detailBlockTimer);
    this.setData({
      detailEnterAnim: false,
      showDetail: true,
      detailMode: 'main',
      showStealthTutorial: false,
      f2ControlPanelOpen: false,
      detailOpenGuardUntil: Date.now() + guardMs,
      blockDetailTouch: true,
      ...patch,
      ...(patch.currentModel
        ? {
            f3HeightMonitorVisible: isF3MaxModel(patch.currentModel),
            ...(this.data.isConnected
              ? this._resetF2HwMonitorState(true, patch.currentModel)
              : {
                  f3HeightText: '璇峰厛杩炴帴钃濈墮',
                  f3HeightLive: false
                })
          }
        : {})
    });
    wx.nextTick(() => {
      this._detailEnterTimer = setTimeout(() => {
        this._detailEnterTimer = null;
        if (this.data.showDetail) {
          this.setData({ detailEnterAnim: true });
        }
      }, 24);
    });
    this._detailBlockTimer = setTimeout(() => {
      this.setData({ blockDetailTouch: false });
      this._detailBlockTimer = null;
    }, guardMs);
    this._refreshRemoteAssistCardFlags();
    if (this.data.isAdmin) this._startRemoteAssistPendingPoll();
  },

  _closeDetailAnimated(extraPatch = {}) {
    if (this._detailClosing) return;
    this._detailClosing = true;
    const guardMs = 360;
    this._controlTapLockUntil = Date.now() + guardMs;
    if (this._detailEnterTimer) clearTimeout(this._detailEnterTimer);
    if (this._detailCloseTimer) clearTimeout(this._detailCloseTimer);
    this.setData({ detailEnterAnim: false, blockDetailTouch: false });
    this._detailCloseTimer = setTimeout(() => {
      this._detailCloseTimer = null;
      this._detailClosing = false;
      this.setData({
        showDetail: false,
        detailMode: 'main',
        f2ControlPanelOpen: false,
        ...extraPatch
      });
    }, guardMs);
  },

  openDetail(e) {
    if (this._isRemoteAssistUserLocked()) return;
    const index = parseInt(e.currentTarget.dataset.index);
    const currentModel = this.data.models[index];
    if (currentModel && currentModel.canLearn) {
      wx.navigateTo({ url: '/package-app/pages/can-learn/can-learn' });
      return;
    }
    this.updateCardStatus(index);
    this._openDetailAnimated({
      currentModel,
      angleBtnText: resolveOpenAngleBtnText(currentModel)
    });
  },

  // 馃敶 璁＄畻瀵艰埅鏍忛珮搴︼紙鏍囧噯鏂规硶锛岄€傞厤鎵€鏈夋満鍨嬶級
  calcNavBarInfo() {
    try {
      const menuButton = wx.getMenuButtonBoundingClientRect();
      const windowInfo = wx.getWindowInfo();
      const statusBarHeight = windowInfo.statusBarHeight || 44;
      const gap = menuButton.top - statusBarHeight;
      const navBarHeight = (gap * 2) + menuButton.height;
      this.setData({ statusBarHeight, navBarHeight });
    } catch (e) {
      // 闄嶇骇鏂规锛氫娇鐢ㄩ粯璁ゅ€?      this.setData({ statusBarHeight: 44, navBarHeight: 44 });
    }
  },

  goBack() {
    if (this._isRemoteAssistUserLocked()) {
      this._showCustomToast('杩滃崗杩涜涓紝璇峰厛缁撴潫鍗忓姪', 'none', 2000);
      return;
    }
    if (this.data.showDetail) {
      if (this.data.detailMode === 'edit') {
        this.setData({ detailMode: 'main' });
      } else {
        this._closeDetailAnimated();
        // 鏂紑杩炴帴鍙€?        // if (this.data.isConnected) this.ble.disconnect(); 
      }
    } else {
      const pageBack = require('../../../utils/pageBack.js');
      pageBack.popOrHub();
    }
  },

  onBackPress() {
    this.goBack();
    return true;
  },

  // ===============================================
  // 杩涘叆缂栬緫妯″紡 (鍏ュ彛鍒嗗彂)
  // ===============================================
  enterEdit(e) {
    if (Date.now() < (this._controlTapLockUntil || 0)) return;
    // 鏈繛鎺ヤ笖闈炶繙鍗忔妧甯堟椂涓嶅彲杩涘叆缂栬緫
    if (!this._canControlDevice()) {
      // 鏄剧ず"璇峰厛杩炴帴钃濈墮"灏忚兌鍥婃彁绀?      this.setData({ showConnectBluetoothTip: true });
      // 2绉掑悗鑷姩闅愯棌
      setTimeout(() => {
        this.setData({ showConnectBluetoothTip: false });
      }, 2000);
      return;
    }
    
    const type = e.currentTarget.dataset.type;
    this.setData({ pendingEditType: type });

    if (type === 'fold') {
      // 绠＄悊鍛樻棤闇€杈撳叆瀵嗙爜锛岀洿鎺ユ斁琛岋紙骞堕『甯︽爣璁版巿鏉冿紝閬垮厤鍚庣画閲嶅鍒ゆ柇锛?      if (this.data.isAdmin) {
        if (!this.data.isAuthorized) {
          this.setData({ isAuthorized: true });
        }
        this.showTutorial('fold');
      } else if (!this.data.isAuthorized) {
        // 鏅€氱敤鎴凤細瀵嗙爜 -> 鏁欑▼ -> 鐣岄潰
        this.openPasswordModal();
      } else {
        this.showTutorial('fold');
      }
    } else if (type === 'open') {
      // 鎵撳紑瑙掑害锛氱洿鎺ュ垵濮嬪寲锛堥伩鍏嶉噸澶?setData 瑙﹀彂鍙岄噸灞傚垏鎹㈠鑷撮棯灞忥級
      this.initOpenMode();
    }
  },

  showTutorial(type) {
    // 濡傛灉瀵嗙爜寮圭獥杩樺湪鏄剧ず锛屽厛鍏抽棴瀹冿紙甯﹂€€鍑哄姩鐢伙級
    if (this.data.showPasswordModal) {
      this.setData({ passwordModalClosing: true });
      setTimeout(() => {
        this.setData({ 
          showPasswordModal: false,
          passwordModalClosing: false,
          showTutorialModal: true
        });
        this.startTutorialLoop(type);
        this.startTutorialCountdown();
      }, 420);
    } else {
      this.setData({
        showTutorialModal: true
      });
      this.startTutorialLoop(type);
      this.startTutorialCountdown();
    }
  },

  // ===============================================
  // 瀵嗙爜閫昏緫
  // ===============================================
  onPasswordInput(e) {
    this.setData({ passwordInput: e.detail.value });
  },

  confirmPassword() {
    if (this.data.passwordBtnLocked) return; // 馃敶 鍊掕鏃堕攣瀹氫腑

    if (this.data.passwordInput === '1234') {
      this.setData({ 
        isAuthorized: true, // 鎺堟潈鎴愬姛锛屼笅娆′笉鐢ㄥ瘑鐮?        passwordModalClosing: true 
      });
      // 瀵嗙爜姝ｇ‘鍚庯紝绛夊緟閫€鍑哄姩鐢诲畬鎴愬啀杩涘叆鎶樺彔鏁欑▼
      setTimeout(() => {
        this.setData({ 
          showPasswordModal: false,
          passwordModalClosing: false
        });
        this.showTutorial('fold');
      }, 420);
    } else {
      this._showCustomToast('瀵嗙爜閿欒', 'none');
      this.setData({ passwordInput: '' });
    }
  },

  cancelPassword() {
    this.setData({ passwordModalClosing: true });
    setTimeout(() => {
      this.setData({ 
        showPasswordModal: false,
        passwordModalClosing: false
      });
    }, 420);
  },

  // ===============================================
  // 鏁欑▼鍔ㄧ敾寰幆 (绾㈢幆)
  // ===============================================
  startTutorialLoop(type) {
    this.stopTutorialLoop();

    let startState, endState;

    if (type === 'fold') {
      // 鎶樺彔锛氱伅浜?-> 鎸変笅 -> 鐏伃
      startState = { light: true, text: '鐐瑰嚮杞︽妸鎸夐敭\n浣挎寚绀虹伅鐏? };
      endState = { light: false, text: '鎸囩ず鐏伃' };
    } else {
      // 鎵撳紑锛氱伅鐏?-> 鎸変笅 -> 鐏寒
      startState = { light: false, text: '鐐瑰嚮杞︽妸鎸夐敭\n浣挎寚绀虹伅浜? };
      endState = { light: true, text: '鎸囩ず鐏寒' };
    }

    // 绗竴甯?    this.setData({
      animLightOn: startState.light,
      animIsPressing: false,
      animText: startState.text
    });

    const loop = () => {
      // 1. 绛夊緟1绉?      const timer1 = setTimeout(() => {
        this.setData({ animIsPressing: true }); // 妯℃嫙鎸変笅

        // 2. 鎸変笅0.3绉掑悗鍙樺寲
        const timer2 = setTimeout(() => {
          this.setData({
            animLightOn: endState.light,
            animText: endState.text,
            animIsPressing: false
          });

          // 3. 淇濇寔缁撴灉 2绉?          const timer3 = setTimeout(() => {
            // 閲嶇疆
            this.setData({
              animLightOn: startState.light,
              animText: startState.text
            });
            // 4. 閲嶇疆鍚庣瓑寰?绉掑惊鐜?            const timer4 = setTimeout(loop, 1000);
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

  // 鏁欑▼纭鎸夐挳锛堝甫鏀剁缉閫€鍑哄姩鐢伙級
  finishTutorial() {
    if (this.data.tutorialBtnLocked) return; // 馃敶 鍊掕鏃堕攣瀹氫腑

    this.stopTutorialLoop();
    const type = this.data.pendingEditType || 'fold';
    this.setData({ tutorialModalClosing: true });
    setTimeout(() => {
      this.setData({
        showTutorialModal: false,
        detailMode: 'edit',
        editType: type,
        tutorialModalClosing: false
      });

      // 馃敶 濡傛灉鏄姌鍙犳ā寮忥紝鍚姩涓婃粦鎻愮ず鍔ㄧ敾
      if (type === 'fold') {
        this.initFoldMode();
        this.startFoldInlineHint();
      }
    }, 420);

    // 鏁欑▼缁撴潫鍚庯紝濡傛灉鏄?鎵撳紑瑙掑害"锛屽垵濮嬪寲鏂扮殑鍒诲害妯″紡
    if (type === 'open') {
      this.initOpenMode();
    }
  },

  // ===============================================
  // 瀹屾垚璁剧疆 & 鍏抽挜鍖欏姩鐢?  // ===============================================
  // ===============================================
  // 瀹屾垚璁剧疆 & 鍏抽挜鍖欏姩鐢?(淇敼锛氬惊鐜挱鏀?
  // ===============================================
  exitEdit() {
    this.stopOpenAngleTutorialLoop();
    if (this._foldFineTuneHintTimer) {
      clearTimeout(this._foldFineTuneHintTimer);
      this._foldFineTuneHintTimer = null;
    }
    // 鎵撳紑瑙掑害鍦烘櫙锛氱洿鎺ラ€€鍑虹紪杈戯紝閬垮厤鈥滃叧閽ュ寵鍊掕鏃跺脊绐椻€濆鑷村崱浣忔劅
    if (this.data.editType === 'open') {
      if (this.data.keyLoopTimer) {
        clearTimeout(this.data.keyLoopTimer);
      }
      this.setData({
        showKeyModal: false,
        keyModalClosing: false,
        keyBtnLocked: false,
        showFoldFineTuneHint: false,
        showAngleHint: false,
        showOpenAngleSendingModal: false,
        openAngleSendingModalClosing: false,
        openAngleSendingBtnDisabled: true,
        detailMode: 'main'
      });
      this._openAngleFullSwipeTimes = [];
      this._clearOpenAngleBleState();
      return;
    }

    // 鎶樺彔鍦烘櫙淇濇寔鍘熸湁娴佺▼锛氬畬鎴愯缃?-> 鍏抽挜鍖欐彁绀?    this.setData({ showKeyModal: true, showFoldFineTuneHint: false });
    this.startKeyAnimLoop();
    this.startKeyCountdown();
  },

  startKeyAnimLoop() {
    // 娓呴櫎鏃у畾鏃跺櫒
    if (this.data.keyLoopTimer) clearTimeout(this.data.keyLoopTimer);

    const loop = () => {
      // 1. 鍏抽挜鍖?(绾?-> 鐏?
      this.setData({ keyAnimState: 'red' });
      
      // 1绉掑悗鍙樼伆
      this.data.keyLoopTimer = setTimeout(() => {
        this.setData({ keyAnimState: 'grey' });
        
        // 鍐嶈繃1绉掞紝閲嶇疆涓虹孩锛屽紑濮嬩笅涓€娆″惊鐜?        this.data.keyLoopTimer = setTimeout(() => {
          loop();
        }, 1500); // 鐏扮姸鎬佸仠鐣?.5绉?        
      }, 1000); // 绾㈢姸鎬佸仠鐣?绉?    };

    loop();
  },

  confirmKeyOff() {
    if (this.data.keyBtnLocked) return; // 馃敶 鍊掕鏃堕攣瀹氫腑

    // 鍋滄寰幆
    if (this.data.keyLoopTimer) clearTimeout(this.data.keyLoopTimer);
    this.setData({ keyModalClosing: true });
    setTimeout(() => {
      this.setData({ 
        showKeyModal: false, 
        detailMode: 'main',
        keyModalClosing: false
      });
    }, 420);
  },

  initFoldMode() {
    this._foldAdjustActive = false;
    const ang = this._lastBleFoldServoAngle != null
      ? this._lastBleFoldServoAngle
      : FOLD_SERVO_ANGLE_DEFAULT;
    this._syncFoldUiFromServoAngle(ang);
  },

  _syncFoldUiFromServoAngle(angle) {
    const ang = Math.max(
      FOLD_SERVO_ANGLE_MIN,
      Math.min(FOLD_SERVO_ANGLE_MAX, parseInt(angle, 10) || FOLD_SERVO_ANGLE_DEFAULT)
    );
    this.setData({
      foldServoAngle: ang,
      foldGap: foldGapFromServoAngle(ang)
    });
  },

  _trySyncAngleEditorsFromBle(parsed) {
    if (!parsed || parsed.ang == null || this._rulerTouchActive) return;
    if (this.data.detailMode !== 'edit') return;

    const ang = parseInt(parsed.ang, 10);
    if (!Number.isFinite(ang)) return;

    if (parsed.itm === 0 || parsed.itm === 2) {
      this._lastBleFoldServoAngle = Math.max(
        FOLD_SERVO_ANGLE_MIN,
        Math.min(FOLD_SERVO_ANGLE_MAX, ang)
      );
    }

    if (this.data.editType === 'fold' && (parsed.itm === 0 || this._foldAdjustActive)) {
      const foldAng = this._lastBleFoldServoAngle;
      if (foldAng != null && foldAng !== this.data.foldServoAngle) {
        this._syncFoldUiFromServoAngle(foldAng);
      }
    }
  },

  // ===============================================
  // 鎵撳紑瑙掑害锛氭柊鍒诲害 & 妫嶅瓙鎺у埗閫昏緫
  // ===============================================

  // 鍒濆鍖栨墦寮€瑙掑害妯″紡
  // ===============================================
  // 鍒濆鍖栨墦寮€瑙掑害妯″紡 (寮哄埗姣忔閮藉脊绐?
  // ===============================================
  initOpenMode() {
    const model = this.data.currentModel || {};
    const isMtUltra = isMtUltraCardModel(model);
    const isF1 = model.name && model.name.includes('F1');
    const isF1Legacy = isF1 && !isMtUltra;
    const isF2MaxSeries = isF2MaxSeriesModel(model);
    
    this.maxAngle = isF1Legacy ? 180 : 170;
    const swipeMaxDeg = openAngleSwipeMaxDeg(model, this.maxAngle);
    const statusText = (isMtUltra || model.name === 'F2')
      ? '鐐瑰嚮90搴︽垨30搴﹀悓姝ョ敾闈?
      : (isF1Legacy ? '鐐瑰嚮180搴︽垨90搴﹀悓姝ョ敾闈? : '鐐瑰嚮棰勮瑙掑害鍚屾鐢婚潰');
    
    // 鐢熸垚鍒诲害鏁版嵁
    const count = (swipeMaxDeg - 0) / 2 + 1;
    const ticks = new Array(Math.floor(count)).fill(0);
    
    // 馃敶 淇锛氫竴娆℃€ц缃墍鏈夌姸鎬侊紝骞剁‘淇?transition 涓?'none'锛岄槻姝㈡畫鐣欏姩鐢?    // 杩欐牱妫嶅瓙浼氱珛鍗虫樉绀轰负 0 搴︼紙姘村钩鐘舵€侊級锛屼笉浼氭湁浠庝箣鍓嶇姸鎬佽烦杞殑鍔ㄧ敾
    this.setData({
      detailMode: 'edit',
      editType: 'open',
      // 娓呯悊鎶樺彔椤垫彁绀?婊戝潡娈嬬暀鐘舵€侊紝閬垮厤鍒囧埌鎵撳紑瑙掑害鏃剁煭鏆傞湶鍑轰笂涓€椤靛厓绱?      showFoldInlineHint: false,
      showFoldFineTuneHint: false,
      foldHintOffset: 0,
      adjustSlideOffset: 0,
      adjustSlideActive: false,
      isAdjustDemo: false,
      foldDemoPlaying: false,
      ticks: ticks,
      statusText,
      openAngleUiActive: false,
      currentAngle: 0,
      angleMode: '', // 淇濇寔涓虹┖锛岃妫嶅瓙鏄剧ず涓?0 搴︼紙姘村钩鐘舵€侊級
      angleRotation: 180, 
      activeIndex: 0,
      translateX: 0,
      transition: 'none' // 馃敶 鍏抽敭锛氱鐢ㄥ姩鐢伙紝闃叉娈嬬暀鐨?transition 瀵艰嚧闂儊
    });
    this._openAngleFullSwipeTimes = [];
    this._clearOpenAngleBleState();
    
    // 淇敼锛欶1 绯诲垪 & F2 MAX 绯诲垪銆愭瘡娆°€戣繘鍏ラ兘寮瑰嚭鎵撳紑瑙掑害寮曞寮圭獥
    if (isF1Legacy || isF2MaxSeries || isMtUltra) {
       this.setData({ showAngleHint: true });
       this.startOpenAngleTutorialLoop();
       // 馃敶 鍚姩鍊掕鏃?       this.startAngleHintCountdown();
    } else {
       this.setData({ showAngleHint: false });
    }
  },

  // ===============================================
  // 鍒囨崲棰勮瑙掑害 (F2 鐐瑰嚮160璺宠浆锛屼絾鑳芥粦鍒?70)
  // ===============================================
  switchAngle(e) {
    if (!this._canControlDevice()) {
      this._showCustomToast('鏈繛鎺ヨ摑鐗?, 'none', 2000);
      return;
    }
    
    const angle = parseInt(e.currentTarget.dataset.angle);
    
    // 榛樿鐩爣灏辨槸鐐瑰嚮鐨勮搴?    let targetDeg = angle;

    // 鐗规畩閫昏緫锛氬鏋滄槸 F2鏈哄瀷 (maxAngle=170)锛岀偣鍑荤殑鏄?160 鎸夐挳
    // 姝ゆ椂鐩爣鏄?160锛岃€屼笉鏄?maxAngle(170)
    // 宸茬粡鍦?wxml 浼犲弬 data-angle="160" 浜嗭紝鎵€浠ヨ繖閲岀洿鎺ョ敤 angle 鍗冲彲

    if (this._openAngleFakeSyncTimer) {
      clearTimeout(this._openAngleFakeSyncTimer);
      this._openAngleFakeSyncTimer = null;
    }

    const currentModel = this.data.currentModel;

    this.data.openAngleUiActive = true;
    this.setData({
      angleMode: angle.toString(),
      openAngleUiActive: true,
      statusText: '鍚屾涓€?
    }, () => {
      const presetCmd = openAnglePresetBleCommand(currentModel, angle);
      if (presetCmd && this._canControlDevice()) {
        if (usesF2StyleOpenAngleBle(currentModel)) {
          console.log(`馃摛 [钃濈墮] 鎵撳紑瑙掑害棰勮 ${angle}掳 鈫?"${presetCmd}" x2`);
          this._commitBleCommandAfterUi({
            sendText: presetCmd,
            times: 2,
            interval: 500,
            verify: null,
            label: '鎵撳紑瑙掑害'
          });
        } else {
          console.log(`馃摛 [钃濈墮] 鎵撳紑瑙掑害棰勮 ${angle}掳 鈫?"${presetCmd}"`);
          this._commitBleCommandAfterUi({
            sendText: presetCmd,
            times: 1,
            interval: 300,
            verify: null,
            label: '鎵撳紑瑙掑害'
          });
        }
      }
    });

    this.updateRuler(targetDeg, true);
    this._openAngleFakeSyncTimer = setTimeout(() => {
      this._openAngleFakeSyncTimer = null;
      if (this.data.editType === 'open' && this.data.openAngleUiActive) {
        this.setData({ statusText: '宸插悓姝? });
      }
    }, OPEN_ANGLE_FAKE_SYNC_MS);
    wx.vibrateShort({ type: 'light' });
  },

  // ===============================================
  // 鏇存柊鏍囧昂涓庤鍥?(淇 Bug锛氱‘淇濅紶閫掓纭搴︾粰鎸夐挳閫昏緫)
  // ===============================================
  updateRuler(deg, animate) {
    const syncMax = openAngleSyncMaxDeg(this.data.currentModel, this.maxAngle);
    if (deg < 0) deg = 0;
    if (deg > syncMax) deg = syncMax;

    const index = this._clampOpenAngleIndex(Math.round(deg / 2), 'sync');
    deg = index * 2;
    const trans = this._indexToOpenAngleTranslate(index);
    this._rulerTranslateX = trans;

    // 妫嶅瓙瑙嗚锛欶2 鎸?UI 鏄剧ず瑙掑害绠楀す瑙掞紙90掳 棰勮 鈫?涓ゆ澶硅 90掳锛?    const visualRot = openAngleStickRotateDeg(this.data.currentModel, deg);

    this.setData({
      currentAngle: deg,
      activeIndex: index,
      translateX: trans,
      transition: animate ? 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none',
      angleRotation: visualRot
    });
    
    // 鍏抽敭淇锛氬皢褰撳墠鐨勭湡瀹炶搴?(deg) 浼犵粰鎸夐挳鍒ゆ柇閫昏緫
    // 涔嬪墠鍙兘浼犱簡 visualRot 瀵艰嚧閫昏緫鍙嶄簡
    this.updateAngleText(deg);
  },

  // ===============================================
  // 瑙︽懜浜や簰鏍稿績淇 (鐗╃悊椹卞姩鍔ㄧ敾)
  // ===============================================

  _openAngleSyncMaxIndex() {
    const deg = openAngleSyncMaxDeg(this.data.currentModel, this.maxAngle);
    return Math.round(deg / 2);
  },

  _openAngleSwipeMaxIndex() {
    const deg = openAngleSwipeMaxDeg(this.data.currentModel, this.maxAngle);
    return Math.round(deg / 2);
  },

  _clampOpenAngleIndex(idx, mode) {
    const maxIdx = mode === 'swipe'
      ? this._openAngleSwipeMaxIndex()
      : this._openAngleSyncMaxIndex();
    const n = Math.round(idx);
    if (n < 0) return 0;
    if (n > maxIdx) return maxIdx;
    return n;
  },

  _indexToOpenAngleTranslate(idx, mode) {
    return -(this._clampOpenAngleIndex(idx, mode || 'sync') * this.tickWidthPx);
  },

  _openAngleIndexFromTranslate(trans, mode) {
    return this._clampOpenAngleIndex(
      Math.round(-(trans || 0) / this.tickWidthPx),
      mode || 'sync'
    );
  },

  _openAngleRulerMinTranslate() {
    return this._indexToOpenAngleTranslate(this._openAngleSwipeMaxIndex(), 'swipe');
  },

  _clampOpenAngleTranslate(trans) {
    if (trans > 0) return 0;
    const minT = this._openAngleRulerMinTranslate();
    if (trans < minT) return minT;
    return trans;
  },

  _clearOpenAngleBleState() {
    if (this._openAngleFakeSyncTimer) {
      clearTimeout(this._openAngleFakeSyncTimer);
      this._openAngleFakeSyncTimer = null;
    }
  },

  // ===============================================
  // 瑙︽懜寮€濮?  // ===============================================
  onTouchStart(e) {
    this._rulerTouchActive = true;
    const touchX = e.touches[0].clientX;
    this.touchStartX = touchX;
    this.startTranslateX = this.data.translateX || 0;
    this._rulerTranslateX = this.startTranslateX;

    const startIndex = this._openAngleIndexFromTranslate(this.startTranslateX, 'swipe');
    this.lastVibrateIndex = startIndex;
    this._rulerGestureStartIndex = startIndex;
    this._rulerGestureEndIndex = startIndex;
  },

  // ===============================================
  // 瑙︽懜绉诲姩锛氭瘡杩?1 鏍煎彂 1 鏉¤摑鐗欙紱UI 鍚屾璺熸墜
  // 浠庡彸寰€宸︽嫧 = 瑙掑害澧炲ぇ 鈫?寰€涓婃敹锛涗粠宸﹀線鍙虫嫧 = 瑙掑害鍑忓皬 鈫?寰€涓?  // ===============================================
  onTouchMove(e) {
    if (!e.touches || !e.touches.length) return;
    const touchX = e.touches[0].clientX;
    if (this.touchStartX == null) {
      this.onTouchStart(e);
      return;
    }

    const diff = (touchX - this.touchStartX) * OPEN_ANGLE_RULER_SENSITIVITY;
    const newTranslateX = this._clampOpenAngleTranslate(this.startTranslateX + diff);
    this._rulerTranslateX = newTranslateX;

    this.setData({
      translateX: newTranslateX,
      transition: 'none'
    });

    const swipeIndex = this._openAngleIndexFromTranslate(newTranslateX, 'swipe');
    const prevSwipeIndex = this.lastVibrateIndex;
    const isOpenMode = this.data.editType === 'open';
    const slideCmds = isOpenMode ? openAngleSlideBleCommands(this.data.currentModel) : null;
    const canSend = this._canControlDevice();

    if (swipeIndex !== prevSwipeIndex) {
      wx.vibrateShort({ type: 'light' });
      this.lastVibrateIndex = swipeIndex;
      this._rulerGestureEndIndex = swipeIndex;

      if (isOpenMode && slideCmds && canSend) {
        const step = Math.abs(swipeIndex - prevSwipeIndex);
        const cmd = swipeIndex > prevSwipeIndex ? slideCmds.increase : slideCmds.decrease;
        console.log(`馃摛 [钃濈墮] 鎵撳紑瑙掑害 ${step} 鏍?鈫?"${cmd}" x${step}`);
        this._enqueueBleSendBurst(cmd, step, BLE_ANGLE_STEP_GAP_MS);

        if (!this.data.openAngleUiActive) {
          if (this._openAngleFakeSyncTimer) {
            clearTimeout(this._openAngleFakeSyncTimer);
            this._openAngleFakeSyncTimer = null;
          }
          const syncIdx = Math.min(swipeIndex, this._openAngleSyncMaxIndex());
          this.setData({
            openAngleUiActive: true,
            statusText: '璋冭妭涓?,
            currentAngle: syncIdx * 2,
            activeIndex: syncIdx
          });
          this.updateAngleText(syncIdx * 2);
        }
      }
    }

    if (!isOpenMode) return;
    if (!this.data.openAngleUiActive) return;

    const syncMaxIdx = this._openAngleSyncMaxIndex();
    const syncIndex = Math.min(swipeIndex, syncMaxIdx);
    const displayAngle = syncIndex * 2;

    this.setData({
      currentAngle: displayAngle,
      activeIndex: syncIndex
    });
    this.updateAngleText(displayAngle);
  },

  onRulerTouchEnd() {
    this._rulerTouchActive = false;
    if (this.data.editType !== 'open') return;
    this.touchStartX = null;
    const startIndex = this._rulerGestureStartIndex;
    const endIndex = this._rulerGestureEndIndex != null
      ? this._rulerGestureEndIndex
      : this._openAngleIndexFromTranslate(this.data.translateX || 0, 'swipe');
    if (startIndex == null) return;
    const tickMoved = Math.abs(endIndex - startIndex);
    if (tickMoved >= OPEN_ANGLE_TICKS_PER_GESTURE) {
      this._recordOpenAngleFullSwipe();
    }
    this._rulerGestureStartIndex = null;
    this._rulerGestureEndIndex = null;

    const swipeIdx = this._openAngleIndexFromTranslate(this.data.translateX || 0, 'swipe');
    this.lastVibrateIndex = swipeIdx;

    if (this.data.openAngleUiActive) {
      const syncIdx = Math.min(swipeIdx, this._openAngleSyncMaxIndex());
      const syncDeg = syncIdx * 2;
      this.setData({
        currentAngle: syncDeg,
        activeIndex: syncIdx,
        angleRotation: openAngleStickRotateDeg(this.data.currentModel, syncDeg)
      });
      this.updateAngleText(syncDeg);
      // Ultra 绛夋満鍨嬶細瓒呰繃 UI 鍚屾涓婇檺浠嶄繚鐣欐尝杞綅缃紝浠呮瀛?鏁板瓧鍋滃湪 170掳
      if (swipeIdx <= this._openAngleSyncMaxIndex()) {
        const trans = this._indexToOpenAngleTranslate(swipeIdx, 'swipe');
        this._rulerTranslateX = trans;
        if (trans !== this.data.translateX) {
          this.setData({ translateX: trans, transition: 'none' });
        }
      }
    } else {
      // 鏈偣棰勮锛氭澗鎵嬪悗娉㈣疆鍋滃湪褰撳墠鏍硷紝涓嶅洖寮瑰埌 0
      const trans = this._indexToOpenAngleTranslate(swipeIdx, 'swipe');
      this._rulerTranslateX = trans;
      if (trans !== this.data.translateX) {
        this.setData({ translateX: trans, transition: 'none' });
      }
    }
  },

  _recordOpenAngleFullSwipe() {
    const now = Date.now();
    if (!this._openAngleFullSwipeTimes) this._openAngleFullSwipeTimes = [];
    this._openAngleFullSwipeTimes.push(now);
    this._openAngleFullSwipeTimes = this._openAngleFullSwipeTimes.filter(
      (t) => now - t <= OPEN_ANGLE_RAPID_SWIPE_WINDOW_MS
    );
    if (this._openAngleFullSwipeTimes.length >= 2) {
      this._openAngleFullSwipeTimes = [];
      this._showOpenAngleSendingModal();
    }
  },

  _showOpenAngleSendingModal() {
    if (this._openAngleSendHintTimer) {
      clearTimeout(this._openAngleSendHintTimer);
      this._openAngleSendHintTimer = null;
    }
    this.setData({ showOpenAngleSendHint: true });
    this._openAngleSendHintTimer = setTimeout(() => {
      this._openAngleSendHintTimer = null;
      this.setData({ showOpenAngleSendHint: false });
    }, 2200);
  },

  closeOpenAngleSendingModal() {
    if (this._openAngleSendHintTimer) {
      clearTimeout(this._openAngleSendHintTimer);
      this._openAngleSendHintTimer = null;
    }
    this.setData({ showOpenAngleSendHint: false });
  },

  _onBleSendQueueIdle() {
    if (this._f3HeightBleTxActive) {
      this._f3HeightBleTxActive = false;
      if (typeof this._f3HeightBleTxIdleCb === 'function') {
        const cb = this._f3HeightBleTxIdleCb;
        this._f3HeightBleTxIdleCb = null;
        cb();
      }
    }
  },

  _f3CancelHeightCharTimers() {
    if (this._f3HeightCharTimers && this._f3HeightCharTimers.length) {
      this._f3HeightCharTimers.forEach((t) => clearTimeout(t));
    }
    this._f3HeightCharTimers = [];
  },

  _f3WaitBleQueueIdle(maxWaitMs) {
    const maxWait = maxWaitMs || 15000;
    const deadline = Date.now() + maxWait;
    return new Promise((resolve) => {
      const tick = () => {
        if ((!this._bleSendQueue || !this._bleSendQueue.length) && !this._bleSendDraining) {
          resolve();
          return;
        }
        if (Date.now() >= deadline) {
          resolve();
          return;
        }
        setTimeout(tick, 80);
      };
      tick();
    });
  },

  /** 閫愬瓧绗﹀叆闃熷彂閫侊細闈?BLE 闃熷垪鏈韩鎺掑簭+绛夊緟鍐欏叆缁撴灉锛岃€屼笉鏄?setTimeout锛?   * 杩欐牱 _clearBleSendQueue 鎵嶈兘鐪熸鎵撴柇锛屼笉浼氬拰涓嬩竴鏉″懡浠ょ殑瀛楃浜ゅ弶銆?*/
  _f3EnqueueHeightCmdChars(cmd) {
    const text = String(cmd || '').replace(/#$/, '') + '#';
    const parts = text.split('');
    this._f3HeightBleTxActive = true;
    parts.forEach((ch) => this._enqueueBleSend(ch, 280));
    console.log(`[_f3EnqueueHeightCmdChars] 閫愬瓧绗﹀叆闃?${parts.length} 涓? ${text}`);
  },

  /** 甯﹁嚜鍔ㄩ噸璇曠殑楂樺害鍐欏叆锛欱LE 鍋跺彂涓㈠瓧绗︽椂锛屽浐浠舵牎楠屽拰浼氭嫆缁濋敊璇暟鎹紝
   * 杩欓噷妫€娴嬩笉鍒扮‘璁ゅ洖璇诲氨鑷姩閲嶅彂锛岃€屼笉鏄鐢ㄦ埛鑷繁鍙戠幇澶辫触鍐嶆墜鍔ㄧ偣銆?*/
  _f3SubmitHeightMmRetrying(kind, units, options) {
    const opts = options || {};
    const maxAttempts = opts.maxAttempts || 4;
    const ackTimeout = opts.ackTimeout || 6000;
    const label = kind === 'danger' ? '鍗遍櫓楂樺害' : '妫€娴嬮珮搴?;
    const seq = (this._f3HeightWriteSeq || 0) + 1;
    this._f3HeightWriteSeq = seq;
    let attempt = 0;

    const trySend = () => {
      if (this._f3HeightWriteSeq !== seq) return;
      attempt++;
      console.log(`[${label}] 绗?{attempt}/${maxAttempts}娆″彂閫?${units}mm`);
      if (attempt === 1 && !opts.quiet) {
        this._showCustomToast(`姝ｅ湪鍐欏叆${label} ${units} mm鈥, 'none', 1500);
      }
      const ok = this._f3SubmitHeightMm(kind, units, {
        silent: true,
        ackTimeout,
        onAck: () => {
          if (this._f3HeightWriteSeq !== seq) return;
          console.log(`[${label}] 绗?{attempt}娆＄‘璁ゆ垚鍔焋);
          if (!opts.quiet) {
            this._showCustomToast(`${label}宸插啓鍏?${units} mm`, 'none', 1800);
            wx.vibrateShort({ type: 'light' });
          }
          if (typeof opts.onDone === 'function') opts.onDone(true);
        },
        onFail: () => {
          if (this._f3HeightWriteSeq !== seq) return;
          if (attempt < maxAttempts) {
            console.warn(`[${label}] 绗?{attempt}娆℃湭纭锛屽噯澶囬噸璇昤);
            setTimeout(trySend, 1200);
          } else {
            console.error(`[${label}] 閲嶈瘯${maxAttempts}娆′粛鏈‘璁);
            if (!opts.quiet) this._showCustomToast(`${label}鍐欏叆澶辫触锛岃閲嶆柊鐐瑰啓鍏, 'none', 2600);
            if (typeof opts.onDone === 'function') opts.onDone(false);
          }
        }
      });
      if (!ok) {
        if (attempt < maxAttempts) {
          setTimeout(trySend, 1200);
        } else if (!opts.quiet) {
          this._showCustomToast(`${label}鍙戦€佸け璐, 'none', 2000);
          if (typeof opts.onDone === 'function') opts.onDone(false);
        }
      }
    };

    trySend();
  },

  _f3HeightWriteWithAck(kind, units) {
    return new Promise((resolve, reject) => {
      this._f3SubmitHeightMmRetrying(kind, units, {
        maxAttempts: 4,
        ackTimeout: 6000,
        quiet: true,
        onDone: (ok) => {
          if (ok) setTimeout(resolve, 800);
          else reject(new Error(`${kind} failed after retries`));
        }
      });
    });
  },

  // ===============================================
  // 3. 寰皟閫昏緫 (鏍稿績淇)
  // ===============================================
  handleAdjust(e) {
    if (!this._canControlDevice()) {
      this._showCustomToast('鏈繛鎺ヨ摑鐗?, 'none', 2000);
      return;
    }
    
    const action = e.currentTarget.dataset.action; 
    const editType = this.data.editType || (this.data.detailMode === 'edit' ? this.data.editType : 'open');

    wx.vibrateShort({ type: 'light' });

    // --- A. 鎶樺彔妯″紡 (淇濇寔涓嶅彉) ---
    if (editType === 'fold' || e.currentTarget.dataset.mode === 'fold') {
      let foldAng = this.data.foldServoAngle;
      if (!Number.isFinite(foldAng)) foldAng = FOLD_SERVO_ANGLE_DEFAULT;

      // 馃敶 F1/F2 PRO/MAX锛氭姌鍙犳ā寮忔椂鍙戦€佸搴旀暟鎹?      const currentModel = this.data.currentModel;
      const isF1 = currentModel && currentModel.name && currentModel.name.includes('F1');
      const isF2 = currentModel && currentModel.name && currentModel.name.includes('F2');
      const isF1OrF2 = isF1 || isF2;
      
      // 璋冭瘯鏃ュ織
      console.log('馃攳 [璋冭瘯] 鎶樺彔妯″紡鎸夐挳:', {
        action,
        editType,
        isF1,
        isF2,
        isF1OrF2,
        isConnected: this.data.isConnected,
        modelName: currentModel?.name
      });
      
      if (action === 'left' || action === 'fine-tune-up') {
        if (foldAng > FOLD_SERVO_ANGLE_MIN) foldAng--;
      } else if (action === 'right' || action === 'fine-tune-down') {
        if (foldAng < FOLD_SERVO_ANGLE_MAX) foldAng++;
      } else if (action === 'adjust') {
        // 馃敶 璋冩暣鎸夐挳锛氬彂閫?璋冩暣鎶樺彔瑙掑害"
        console.log('馃攳 [璋冭瘯] 璋冩暣鎸夐挳琚偣鍑?, {
          isF1,
          isF2,
          isF1OrF2,
          isConnected: this.data.isConnected,
          modelName: currentModel?.name
        });
        if (isF1OrF2) {
          if (this._shouldSkipIndicatorModal()) {
            console.log('馃摛 [杩滃崗] 鍙戦€?璋冩暣鎶樺彔瑙掑害"');
            this._foldAdjustActive = true;
            this.sendDataMultiple('璋冩暣鎶樺彔瑙掑害', 1, 300);
          } else if (this._canControlDevice()) {
            this.setData({
              showIndicatorCheckModal: true,
              indicatorCheckModalClosing: false,
              pendingSendData: {
                type: 'adjust',
                sendText: '璋冩暣鎶樺彔瑙掑害'
              }
            });
            console.log('馃攳 [钃濈墮] 鍑嗗鍙戦€?璋冩暣鎶樺彔瑙掑害"锛岀瓑寰呯敤鎴风‘璁?);
          } else {
            console.log('鉂?[钃濈墮] 鏈繛鎺ワ紝鏃犳硶鍙戦€?璋冩暣鎶樺彔瑙掑害"');
            this._showCustomToast('钃濈墮鏈繛鎺?, 'none', 2000);
          }
        } else {
          console.log('鉂?[璋冭瘯] 涓嶆槸 F1/F2 鏈哄瀷锛屼笉鍙戦€?);
          this._showCustomToast('褰撳墠鏈哄瀷涓嶆敮鎸?, 'none', 2000);
        }
      } else if (action === 'zero') {
        foldAng = FOLD_SERVO_ANGLE_DEFAULT;
        // 馃敶 褰掗浂鎸夐挳锛氬彂閫?鍒濆鍖栬搴?
        console.log('馃攳 [璋冭瘯] 褰掗浂鎸夐挳琚偣鍑?, {
          isF1,
          isF2,
          isF1OrF2,
          isConnected: this.data.isConnected,
          isAdmin: this.data.isAdmin,
          modelName: currentModel?.name
        });
        if (isF1OrF2) {
          if (this._canControlDevice()) {
            // 馃敶 鎸変綘鐨勮姹傦細褰掗浂涔熷彂閫?2 娆★紝闂撮殧 0.5 绉?            console.log('馃摛 [钃濈墮] 鍙戦€?鍒濆鍖栬搴?锛堣繛缁?娆★紝闂撮殧0.5绉掞級');
            this.sendDataMultiple('鍒濆鍖栬搴?, 2, 500);
          } else {
            console.log('鉂?[钃濈墮] 鏈繛鎺ワ紝鏃犳硶鍙戦€?鍒濆鍖栬搴?');
            this._showCustomToast('钃濈墮鏈繛鎺?, 'none', 2000);
          }
        } else {
          console.log('鉂?[璋冭瘯] 涓嶆槸 F1/F2 鏈哄瀷锛屼笉鍙戦€?);
          this._showCustomToast('褰撳墠鏈哄瀷涓嶆敮鎸?, 'none', 2000);
        }
        // 馃敶 鐐瑰嚮褰掗浂鍚庯紝閲嶇疆婊戝姩鐘舵€侊紙甯?snap 鍥炲脊鍔ㄧ敾锛?        this.resetAdjustSlider(false);
      }

      const gap = foldGapFromServoAngle(foldAng);
      const isFineTune = action === 'left' || action === 'fine-tune-up'
        || action === 'right' || action === 'fine-tune-down';

      if (isFineTune && isF1OrF2 && this._canControlDevice()) {
        const sendText = (action === 'left' || action === 'fine-tune-up') ? '璋冨ぇ' : '璋冨皬';
        this.setData({ foldServoAngle: foldAng, foldGap: gap }, () => {
          const sendTune = () => {
            console.log(`馃摛 [钃濈墮] 鍙戦€?${sendText}"`);
            this._commitBleCommandAfterUi({
              sendText,
              times: 1,
              interval: 200,
              verify: null,
              label: '鎶樺彔寰皟'
            });
          };
          if (!this._foldAdjustActive) {
            this._foldAdjustActive = true;
            console.log('馃摛 [钃濈墮] 鎶樺彔寰皟锛氬厛鍙戙€岃皟鏁存姌鍙犺搴︺€?);
            this.sendDataMultiple('璋冩暣鎶樺彔瑙掑害', 1, 200);
            setTimeout(sendTune, 280);
          } else {
            sendTune();
          }
        });
        return;
      }

      this.setData({ foldServoAngle: foldAng, foldGap: gap });
      return;
    }

    // --- B. 鎵撳紑妯″紡 (90~270 宸︿晶鍖哄煙) ---
    let currentRot = this.data.angleRotation;
    let newRot = currentRot;
    const degStep = 3; 

    // 宸﹂敭: 澧炲姞瑙掑害 (寰€宸?涓婃姮) -> 閫愭笎闈犺繎 180 (90搴﹂璁?
    if (action === 'fine-tune-down') {
      newRot += degStep;
    } 
    // 鍙抽敭: 鍑忓皬瑙掑害 (寰€鍙?涓嬫斁) -> 閫愭笎闈犺繎 90 (180搴﹂璁?
    else if (action === 'fine-tune-up') {
      newRot -= degStep;
    }

    // 鑼冨洿闄愬埗
    if (newRot < 90) newRot = 90;
    if (newRot > 270) newRot = 270;

    // 灏?CSS 鏃嬭浆瑙掑害杞崲涓哄疄闄呰搴?    const actualAngle = 180 - newRot;

    this.setData({ angleRotation: newRot });
    
    // 鍏抽敭锛氭瘡娆″井璋冮兘妫€鏌ヤ竴娆¤搴︼紝鍐冲畾鍝釜鎸夐挳浜?    // 浼犲叆瀹為檯瑙掑害锛岃€屼笉鏄?CSS 鏃嬭浆瑙掑害
    this.updateAngleText(actualAngle); 
  },

  // ===============================================
  // 瀹炴椂鏇存柊鎸夐挳鐘舵€?(淇敼锛氬彧鏈夊垰濂?0/180/160鎵嶄寒)
  // ===============================================
  updateAngleText(currentAngle) {
    if (!this.data.openAngleUiActive) return;

    const model = this.data.currentModel;
    const isF1Legacy = model && model.name && model.name.includes('F1') && !isMtUltraCardModel(model);
    let activeMode = '';

    const tolerance = 2;

    if (Math.abs(currentAngle - 90) <= tolerance) {
      activeMode = '90';
    } else {
      if (isF1Legacy) {
        if (Math.abs(currentAngle - 180) <= tolerance) activeMode = '180';
      } else {
        if (Math.abs(currentAngle - 160) <= tolerance) activeMode = '160';
      }
    }

    if (this.data.angleMode !== activeMode) {
      this.setData({ angleMode: activeMode });
    }
  },


  // 鍏抽棴绗竴涓彁绀猴紙180搴︽彁绀猴級
  dismissHint() {
    if (this.data.angleHintBtnLocked) return; // 馃敶 鍊掕鏃堕攣瀹氫腑
    this.stopOpenAngleTutorialLoop();
    this.setData({ showAngleHint: false }); 

    // ==========================================
    // 銆愭帴鍔涢€昏緫銆戝鏋滄満鍨嬫槸 F1PRO/MAX锛岀揣鎺ョ潃鏄剧ず绗簩涓脊绐?    // 馃敶 淇敼锛氬彧寮逛竴娆★紝浣跨敤鏈湴瀛樺偍璁板綍
    // ==========================================
    const currentModel = this.data.currentModel;
    const currentName = currentModel.name || '';
    const currentType = currentModel.type || '';
    
    // 鍒ゆ柇鏄惁鍖呭惈 F1PRO 鎴?F1MAX (杞ぇ鍐欐瘮杈冩洿绋冲Ε)
    const nameUpper = currentName.toUpperCase();
    const typeUpper = currentType.toUpperCase();
    
    if (nameUpper.includes('F1') && (typeUpper.includes('PRO') || typeUpper.includes('MAX'))) {
      // 馃敶 妫€鏌ユ湰鍦板瓨鍌紝濡傛灉宸茬粡寮硅繃灏变笉寮逛簡
      const hasShown = wx.getStorageSync('hasShownNewProductHint_F1');
      if (!hasShown) {
        // 寤惰繜 200ms 璁╃涓€涓脊绐楁秷澶卞姩鐢绘挱瀹岋紝鍐嶅脊绗簩涓?        setTimeout(() => {
          this.openNewProductHint();
        }, 200);
      }
    }
  },

  // ===============================================
  // 鎵撳紑瑙掑害鏁欑▼鍔ㄧ敾寰幆锛堢伆鑹?-> 鐐瑰嚮 -> 绾㈣壊浜捣锛?  // ===============================================
  startOpenAngleTutorialLoop() {
    this.stopOpenAngleTutorialLoop();

    // 鎵撳紑瑙掑害锛氱伆鑹?-> 鎸変笅 -> 绾㈣壊浜捣
    const startState = { light: false, text: '鐐瑰嚮杞︽妸鎸夐敭\n浣挎寚绀虹伅浜? };
    const endState = { light: true, text: '鎸囩ず鐏寒' };

    // 绗竴甯э細鐏拌壊鐘舵€?    this.setData({
      openAngleAnimLightOn: startState.light,
      openAngleAnimIsPressing: false,
      openAngleAnimText: startState.text
    });

    const loop = () => {
      // 1. 绛夊緟1绉?      const timer1 = setTimeout(() => {
        this.setData({ openAngleAnimIsPressing: true }); // 妯℃嫙鎸変笅

        // 2. 鎸変笅0.3绉掑悗鍙樺寲
        const timer2 = setTimeout(() => {
          this.setData({
            openAngleAnimLightOn: endState.light,
            openAngleAnimText: endState.text,
            openAngleAnimIsPressing: false
          });

          // 3. 淇濇寔缁撴灉 2绉?          const timer3 = setTimeout(() => {
            // 閲嶇疆
            this.setData({
              openAngleAnimLightOn: startState.light,
              openAngleAnimText: startState.text
            });
            // 4. 閲嶇疆鍚庣瓑寰?绉掑惊鐜?            const timer4 = setTimeout(loop, 1000);
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
  // 鎵撳紑瑙掑害椤甸潰锛氬垏鎹㈡寚绀虹伅鐘舵€?  // ===============================================
  toggleOpenAngleLight() {
    // 鍋滄鍔ㄧ敾寰幆锛岄伩鍏嶅共鎵扮敤鎴锋搷浣?    this.stopOpenAngleTutorialLoop();
    
    const newState = !this.data.openAngleLightOn;
    this.setData({
      openAngleLightOn: newState,
      // 鍚屾椂鏇存柊鍔ㄧ敾鐘舵€侊紝纭繚瑙嗚涓€鑷?      openAngleAnimLightOn: newState,
      openAngleAnimText: newState ? '鎸囩ず鐏凡浜? : '鐐瑰嚮浣挎寚绀虹伅浜?
    });
    // 娣诲姞闇囧姩鍙嶉
    wx.vibrateShort({ type: 'light' });
  },

  // ===============================================
  // 馃敶 鑷姩鏍″噯鍔熻兘
  // ===============================================
  handleAutoCalibrate() {
    if (Date.now() < (this._controlTapLockUntil || 0)) return;
    if (!this._canControlDevice()) {
      this.setData({ showConnectBluetoothTip: true });
      setTimeout(() => {
        this.setData({ showConnectBluetoothTip: false });
      }, 2000);
      return;
    }

    const currentModel = this.data.currentModel;

    if (isF3MaxModel(currentModel)) {
      this.onF3StartAutoCal();
      return;
    }

    const isF2 = currentModel && currentModel.name && currentModel.name.includes('F2');
    const isMtUltra = isMtUltraCardModel(currentModel);

    if (!isF2 && !isMtUltra) return;

    if (!this._isBleWriteReady()) {
      this._showCustomToast('钃濈墮鏈氨缁紝璇风◢鍊欏啀璇?, 'none', 2000);
      return;
    }

    console.log('馃摛 [钃濈墮] 鍙戦€?鑷姩璋冨钩"');
    this.sendDataMultiple('鑷姩璋冨钩', 2, 500);

    this.setData({
      showCalibratingModal: true,
      calibratingBtnDisabled: true
    });

    setTimeout(() => {
      this.setData({ calibratingBtnDisabled: false });
    }, 3000);
  },
  
  // 馃敶 鍏抽棴鏍″噯寮圭獥锛堝甫鏀剁缉閫€鍑哄姩鐢伙級
  closeCalibratingModal() {
    // 濡傛灉鎸夐挳绂佺敤锛屼笉鍏佽鍏抽棴
    if (this.data.calibratingBtnDisabled) {
      return;
    }
    
    this.setData({ calibratingModalClosing: true });
    setTimeout(() => {
      this.setData({ 
        showCalibratingModal: false,
        calibratingModalClosing: false,
        calibratingBtnDisabled: true // 閲嶇疆鎸夐挳鐘舵€?      });
    }, 420);
  },
  
  // 馃敶 闃绘鑳屾櫙婊氬姩锛堢┖鍑芥暟锛岀敤浜?catchtouchmove锛?  preventMove() {
    return false;
  },
  noop() {},

  onCanLearnNumLedsInput(e) {
    const raw = e.detail.value;
    this.setData({ canLearnNumLeds: raw });
    if (String(raw).trim() === '' || !Number.isFinite(Number(raw))) return;
    saveStoredNumLeds(raw);
  },

  onCanLearnNumLedsBlur() {
    const n = saveStoredNumLeds(this.data.canLearnNumLeds);
    this.setData({ canLearnNumLeds: String(n) });
  },


  // ===============================================
  // 鏂板锛氶珮绾ц缃氦浜掗€昏緫
  // ===============================================

  // F2 ULTRA 钃濈墮杩滅▼鎺у埗 + 璇煶椤垫ˉ鎺?  _registerF2VoiceBridge() {
    f2VoiceBridge.registerBridge({
      sendCommand: (cmd) => {
        if (!this._canControlDevice()) return;
        const model = this.data.currentModel;
        const afterSend = () => {
          if (!this._isBleLinked()) return;
          const verify = isMtUltraCardModel(model) && (cmd === '鎵撳紑' || cmd === '鍏抽棴')
            ? { type: 'flap', cmd }
            : null;
          this._commitBleCommandAfterUi({
            sendText: cmd,
            times: (cmd === '鎵撳紑' || cmd === '鍏抽棴') ? 1 : 2,
            interval: 500,
            verify,
            label: '璇煶鎺у埗'
          });
        };
        if (cmd === '鎵撳紑' || cmd === '鍏抽棴') {
          this._setFlapPanelStateOptimistic(cmd, afterSend);
        } else {
          afterSend();
        }
        wx.vibrateShort({ type: 'light' });
      },
      canInteract: () => this._canControlDevice(),
      isBleLinked: () => this._isBleLinked(),
      isAdmin: () => !!this.data.isAdmin,
      getFlapState: () => ({
        flapPanelState: this.data.flapPanelState,
        flapPanelStateText: this.data.flapPanelStateText
      })
    });
  },

  _publishFlapToVoiceBridge(state, text) {
    if (!isMtUltraCardModel(this.data.currentModel)) return;
    f2VoiceBridge.publish({
      type: 'flap',
      flapPanelState: state,
      flapPanelStateText: text
    });
  },

  _patchFlapGaugeSnap(updates) {
    if (!updates || updates.flapPanelState === undefined) return updates;
    const prev = this.data.flapPanelState;
    const next = updates.flapPanelState;
    if (prev === next) return updates;
    const stable = (s) => s === 'open' || s === 'closed' || s === 'stealth' || s === 'fault';
    if (prev === 'moving' && stable(next)) {
      updates.flapGaugeSnap = true;
    } else if (next === 'moving' && (stable(prev) || prev === 'unknown')) {
      updates.flapGaugeSnap = true;
    }
    return updates;
  },

  _releaseFlapGaugeSnap() {
    if (!this.data.flapGaugeSnap) return;
    wx.nextTick(() => {
      setTimeout(() => {
        if (this.data.flapGaugeSnap) {
          this.setData({ flapGaugeSnap: false });
        }
      }, 32);
    });
  },

  _setFlapPanelData(patch, done) {
    const updates = this._patchFlapGaugeSnap({ ...(patch || {}) });
    this.setData(updates, () => {
      if (updates.flapGaugeSnap) this._releaseFlapGaugeSnap();
      if (typeof done === 'function') done();
    });
  },

  _publishBleToVoiceBridge(connected) {
    f2VoiceBridge.publish({ type: 'connection', connected: !!connected });
  },

  _setFlapPanelStateOptimistic(cmd, afterUiReady) {
    if (!isMtUltraCardModel(this.data.currentModel)) {
      if (typeof afterUiReady === 'function') afterUiReady();
      return;
    }
    const done = typeof afterUiReady === 'function' ? afterUiReady : null;
    if (cmd === '鎵撳紑') {
      this._setFlapPanelData({ flapPanelState: 'moving', flapPanelStateText: '鎵撳紑涓?, flapMotionDir: 'open' }, () => {
        this._publishFlapToVoiceBridge('moving', '鎵撳紑涓?);
        this._f2MotionGraceUntil = Date.now() + 12000;
        if (done) done();
      });
    } else if (cmd === '鍏抽棴') {
      this._setFlapPanelData({ flapPanelState: 'moving', flapPanelStateText: '鏀跺洖涓?, flapMotionDir: 'close' }, () => {
        this._publishFlapToVoiceBridge('moving', '鏀跺洖涓?);
        this._f2MotionGraceUntil = Date.now() + 12000;
        if (done) done();
      });
    } else if (done) {
      done();
    }
  },

  _resetFlapPanelState() {
    this.setData({
      flapPanelState: 'unknown',
      flapPanelStateText: '鐘舵€佹湭鐭?
    });
    this._publishFlapToVoiceBridge('unknown', '鐘舵€佹湭鐭?);
  },

  handleVoiceControl() {
    if (Date.now() < (this._controlTapLockUntil || 0)) return;
    if (this._f2DemoActive) {
      this._showCustomToast('婕旂ず杩涜涓紝璇峰厛鍋滄', 'none', 1800);
      return;
    }

    const model = this.data.currentModel;
    if (!isMtUltraCardModel(model)) {
      return;
    }
    if (!this._canControlDevice()) {
      this.setData({ showConnectBluetoothTip: true });
      setTimeout(() => this.setData({ showConnectBluetoothTip: false }), 2000);
      return;
    }

    wx.navigateTo({
      url: '/package-app/pages/voice-control/voice-control'
    });
  },

  toggleF2ControlPanel() {
    const nextOpen = !this.data.f2ControlPanelOpen;
    this.setData({ f2ControlPanelOpen: nextOpen }, () => {
      if (nextOpen && isMtUltraCardModel(this.data.currentModel)) {
        setTimeout(() => this._measureF2SpeedSlider(), 120);
      }
    });
  },

  handleF2RemoteControl(e) {
    if (Date.now() < (this._controlTapLockUntil || 0)) return;
    if (this._f2DemoActive) {
      this._showCustomToast('婕旂ず杩涜涓紝璇峰厛鍋滄', 'none', 1800);
      return;
    }
    const cmd = e.currentTarget.dataset.cmd;
    if (!cmd) return;

    const model = this.data.currentModel;
    if (!isMtUltraCardModel(model)) {
      return;
    }
    if (!this._canControlDevice()) {
      this.setData({ showConnectBluetoothTip: true });
      setTimeout(() => this.setData({ showConnectBluetoothTip: false }), 2000);
      return;
    }
    if (this._isRemoteAssistAdminActive() && !this.data.remoteSessionBleConnected) {
      this._showCustomToast('鐢ㄦ埛钃濈墮鏈繛鎺ワ紝鏃犳硶鎺у埗', 'none', 2200);
      return;
    }
    if ((cmd === '鎵撳紑' || cmd === '鍏抽棴') && this.data.flapPanelState === 'stealth') {
      this._showCustomToast('闅愯斀妯″紡涓紝璇峰厛閫€鍑?, 'none', 2000);
      return;
    }
    if (cmd === '鎵撳紑' && isF3MaxModel(model) && this.data.f3DangerBlocked) {
      this._showCustomToast('璺濆湴闈㈣繃杩戯紝绂佹缈诲紑', 'none', 2200);
      return;
    }

    console.log(`馃摛 [钃濈墮] F2 杩滅▼鎺у埗鍙戦€?${cmd}"`);
    const afterSend = () => {
      const verify = isMtUltraCardModel(model) && (cmd === '鎵撳紑' || cmd === '鍏抽棴')
        ? { type: 'flap', cmd }
        : null;
      this._commitBleCommandAfterUi({
        sendText: cmd,
        times: 1,
        interval: 500,
        verify,
        label: '杩滅▼鎺у埗'
      });
      wx.vibrateShort({ type: 'light' });
    };
    if (!this._isRemoteAssistAdminActive() && (cmd === '鎵撳紑' || cmd === '鍏抽棴')) {
      this._setFlapPanelStateOptimistic(cmd, afterSend);
    } else {
      afterSend();
    }
  },

  openF2DemoModal() {
    if (!isMtUltraCardModel(this.data.currentModel)) return;
    if (!this._canControlDevice()) {
      this.setData({ showConnectBluetoothTip: true });
      setTimeout(() => this.setData({ showConnectBluetoothTip: false }), 2000);
      return;
    }
    this.setData({
      showF2DemoModal: true,
      f2DemoRunning: false,
      f2DemoStatusText: ''
    });
  },

  closeF2DemoModal() {
    if (this._f2DemoActive) return;
    this.setData({ showF2DemoModal: false });
  },

  startF2DemoMode() {
    if (!isMtUltraCardModel(this.data.currentModel) || !this._canControlDevice()) return;
    this._f2DemoActive = true;
    this._f2DemoAwaitStable = null;
    this.setData({
      f2DemoRunning: true,
      f2DemoStatusText: '婕旂ず杩涜涓紝缈绘澘灏嗚嚜鍔ㄥ惊鐜紑鍏斥€?
    });
    const state = this.data.flapPanelState;
    const firstCmd = state === 'open' ? '鍏抽棴' : '鎵撳紑';
    this._sendF2DemoCommand(firstCmd);
    const target = firstCmd === '鎵撳紑' ? 'open' : 'closed';
    if (state === target) {
      this._onF2DemoFlapStable(state);
    }
  },

  stopF2DemoMode() {
    this._stopF2DemoMode(true);
  },

  _stopF2DemoMode(homeFold) {
    const wasActive = this._f2DemoActive;
    this._f2DemoActive = false;
    this._f2DemoAwaitStable = null;
    this.setData({
      showF2DemoModal: false,
      f2DemoRunning: false,
      f2DemoStatusText: ''
    });
    if (homeFold && wasActive && this.data.isConnected && isMtUltraCardModel(this.data.currentModel)) {
      this._setFlapPanelStateOptimistic('鍏抽棴');
      this.sendDataMultiple('鍏抽棴', 2, 500);
      wx.vibrateShort({ type: 'light' });
    }
  },

  _sendF2DemoCommand(cmd) {
    if (!this._f2DemoActive) return;
    if (!this._isBleLinked() && !this.data.isAdmin) return;
    this._f2DemoAwaitStable = cmd === '鎵撳紑' ? 'open' : 'closed';
    this._setFlapPanelStateOptimistic(cmd);
    if (this._isBleLinked()) {
      this.sendDataMultiple(cmd, 2, 500);
    } else if (this.data.isAdmin) {
      setTimeout(() => {
        if (!this._f2DemoActive) return;
        this._onF2DemoFlapStable(cmd === '鎵撳紑' ? 'open' : 'closed');
      }, 1200);
    }
    this.setData({
      f2DemoStatusText: cmd === '鎵撳紑' ? '姝ｅ湪鎵撳紑鈥? : '姝ｅ湪鍏抽棴鈥?
    });
  },

  _onF2DemoFlapStable(state) {
    if (!this._f2DemoActive) return;
    if (state === 'stealth') {
      this._stopF2DemoMode(true);
      return;
    }
    if (state !== 'open' && state !== 'closed') return;
    if (!this._f2DemoAwaitStable || state !== this._f2DemoAwaitStable) return;
    const nextCmd = state === 'open' ? '鍏抽棴' : '鎵撳紑';
    this._f2DemoAwaitStable = null;
    this._sendF2DemoCommand(nextCmd);
  },

  _measureF2SpeedSlider() {
    const query = wx.createSelectorQuery().in(this);
    query.select('#f2SpeedSliderRail').boundingClientRect((rect) => {
      if (rect && rect.width) {
        this.setData({
          f2SpeedSliderWidth: rect.width,
          f2SpeedSliderLeft: rect.left
        });
      }
    }).exec();
  },

  onF2ServoSpeedTouchStart(e) {
    if (Date.now() < (this._controlTapLockUntil || 0)) return;
    this._f2SpeedDragFrom = this.data.f2ServoSpeed;
    this.onF2ServoSpeedTouch(e);
  },

  onF2ServoSpeedTouch(e) {
    if (Date.now() < (this._controlTapLockUntil || 0)) return;
    const touchX = e.touches[0].clientX;
    const { f2SpeedSliderWidth, f2SpeedSliderLeft } = this.data;
    if (!f2SpeedSliderWidth) {
      this._measureF2SpeedSlider();
      return;
    }
    const v = f2ServoSpeedFromTouchX(touchX, f2SpeedSliderLeft, f2SpeedSliderWidth);
    if (v == null || v === this.data.f2ServoSpeed) return;
    this.setData(buildF2ServoSpeedUi(v));
    if (v % 5 === 0) {
      wx.vibrateShort({ type: 'light' });
    }
  },

  onF2ServoSpeedTouchEnd(e) {
    if (Date.now() < (this._controlTapLockUntil || 0)) return;
    const touch = e.changedTouches && e.changedTouches[0];
    const { f2SpeedSliderWidth, f2SpeedSliderLeft } = this.data;
    let v = this.data.f2ServoSpeed;
    if (touch && f2SpeedSliderWidth) {
      const fromTouch = f2ServoSpeedFromTouchX(touch.clientX, f2SpeedSliderLeft, f2SpeedSliderWidth);
      if (fromTouch != null) {
        v = fromTouch;
        this.setData(buildF2ServoSpeedUi(v));
      }
    }
    if (v === this._f2SpeedDragFrom) return;
    this._commitF2ServoSpeed(v);
  },

  _applyF2ServoSpeed(rawValue) {
    const model = this.data.currentModel;
    if (!isMtUltraCardModel(model)) return;

    const v = Math.min(100, Math.max(10, Math.round(Number(rawValue))));
    if (!Number.isFinite(v)) return;
    if (v === this.data.f2ServoSpeed) return;

    this.setData(buildF2ServoSpeedUi(v));
    this._commitF2ServoSpeed(v);
  },

  _commitF2ServoSpeed(v) {
    const model = this.data.currentModel;
    if (!isMtUltraCardModel(model)) return;

    const speed = Math.min(100, Math.max(10, Math.round(Number(v))));
    if (!Number.isFinite(speed)) return;

    try {
      wx.setStorageSync('f2_servo_speed', speed);
    } catch (err) { /* ignore */ }

    if (!this._canControlDevice()) {
      this.setData({ showConnectBluetoothTip: true });
      setTimeout(() => this.setData({ showConnectBluetoothTip: false }), 2000);
      return;
    }

    console.log(`馃摛 [钃濈墮] F2 璋冮€?${speed}%`);
    this._commitBleCommandAfterUi({
      sendText: `璋冮€?{speed}`,
      times: 2,
      interval: 400,
      verify: { type: 'speed', value: speed },
      label: '璋冮€?
    });
    wx.vibrateShort({ type: 'light' });
  },

  onF3DangerInput(e) {
    this.setData({ f3DangerInput: (e.detail && e.detail.value) || '' });
  },

  onF3BaseInput(e) {
    this.setData({ f3BaseInput: (e.detail && e.detail.value) || '' });
  },

  _clearF3CalTimer() {
    if (this._f3CalTimer) {
      clearInterval(this._f3CalTimer);
      this._f3CalTimer = null;
    }
    if (this._f3CalLiveTimer) {
      clearInterval(this._f3CalLiveTimer);
      this._f3CalLiveTimer = null;
    }
    if (this._f3CalRestoreTimer) {
      clearTimeout(this._f3CalRestoreTimer);
      this._f3CalRestoreTimer = null;
    }
    this._f3CalSampling = false;
    this._f3CalReadings = [];
    this._f3CalLastSamplePushAt = 0;
    this._f3CalWritingHeights = false;
  },

  _f3CalMedian(readings) {
    const arr = (readings || []).filter((n) => Number.isFinite(n) && n > 0);
    if (!arr.length) return 0;
    const sorted = arr.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2
      ? sorted[mid]
      : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  },

  /** 鍘绘帀鏄庢樉鍋忎綆鐨勮剰鐐癸紙濡?HGT:67 娣峰叆 HGT:670锛夛紝鍐嶅彇鏈€灏忓€?*/
  _f3CalMin(readings) {
    const arr = (readings || []).filter((n) => Number.isFinite(n) && n > 0);
    if (!arr.length) return 0;
    const sorted = arr.slice().sort((a, b) => a - b);
    const med = sorted[Math.floor(sorted.length / 2)];
    const floor = Math.max(10, Math.round(med * 0.85));
    const trusted = sorted.filter((n) => n >= floor);
    return trusted.length ? trusted[0] : sorted[0];
  },

  _f3CalFormatLive(units) {
    const n = Math.round(Number(units));
    if (!Number.isFinite(n) || n <= 0) return '鈥?;
    return this._f3FormatHeightMm(n) || `${n} mm`;
  },

  _f3CalRefreshLive(mm) {
    if (!this._f3CalSampling) return;
    const live = this._f3CalFormatLive(mm);
    this.setData({ f3CalLiveText: live });
  },

  _f3CalPushReading(mm) {
    if (!this._f3CalSampling) return;
    const n = Math.round(Number(mm));
    if (!Number.isFinite(n) || n <= 0) return;
    this._f3CalReadings.push(n);
    const patch = { f3CalLiveText: this._f3CalFormatLive(n) };
    const step = this.data.f3CalStep;
    if (step === 'sample2') {
      patch.f3CalMedianText = this._f3CalFormatLive(this._f3CalMin(this._f3CalReadings));
    } else if (this._f3CalReadings.length >= 3) {
      patch.f3CalMedianText = this._f3CalFormatLive(this._f3CalMedian(this._f3CalReadings));
    }
    this.setData(patch);
  },

  _f3CalTryPushSample(mm) {
    const n = Math.round(Number(mm));
    if (!Number.isFinite(n) || n <= 0) return;
    this._f3CalRefreshLive(n);
    const now = Date.now();
    if (now - (this._f3CalLastSamplePushAt || 0) < 900) return;
    this._f3CalLastSamplePushAt = now;
    this._f3CalPushReading(n);
  },

  _f3CalSendFoldCmd(tag, times = 1) {
    if (!this._isBleLinked()) return;
    if (this._f3CalWritingHeights) return;
    const n = Math.max(1, Number(times) || 1);
    if (tag === 'U' || tag === 'D') {
      const cmd = tag === 'U' ? 'F3FU#' : 'F3FD#';
      this._enqueueBleSendBurst(cmd, n, 120);
      return;
    }
    // F3FR 鏄箓绛夋搷浣滐紙閲嶅鎵ц缁撴灉涓€鏍凤級锛屽彂涓ら亶鎻愰珮鍒拌揪鐜囷紝鎶靛尽鍋跺彂涓㈠寘
    if (tag === 'R') {
      this._enqueueBleSend('F3FR#', 250);
      this._enqueueBleSend('F3FR#', 250);
      return;
    }
  },

  onF3CalFoldNudge(e) {
    if (this.data.f3CalStep !== 'wheel') return;
    const dir = e.currentTarget.dataset.dir;
    if (dir !== 'up' && dir !== 'down') return;
    this._f3CalSendFoldCmd(dir === 'up' ? 'U' : 'D', 1);
    wx.vibrateShort({ type: 'light' });
  },

  _f3CalStartSample(stepAfter, onDone) {
    this._f3CalSampling = true;
    this._f3CalReadings = [];
    this._f3CalLastSamplePushAt = 0;
    let left = 5;
    const initMm = Math.round(Number(this.data.f3HeightMm)) || 0;
    const initLive = initMm > 0 ? this._f3CalFormatLive(initMm) : '鈥?;
    this.setData({
      f3CalStep: stepAfter === 'sample1' ? 'sample1' : 'sample2',
      f3CalCountdown: left,
      f3CalLiveText: initLive,
      f3CalMedianText: '',
      f3CalStatusText: stepAfter === 'sample1' ? '姝ｅ湪妫€娴嬪熀鍑嗛珮搴︹€? : '姝ｅ湪閲囬泦鏍囧畾鏁版嵁鈥?
    });
    if (initMm > 0) this._f3CalPushReading(initMm);
    if (this._f3CalLiveTimer) clearInterval(this._f3CalLiveTimer);
    this._f3CalLiveTimer = setInterval(() => {
      if (!this._f3CalSampling) return;
      const mm = Math.round(Number(this.data.f3HeightMm)) || 0;
      if (mm > 0) this._f3CalRefreshLive(mm);
    }, 250);
    this._f3CalTimer = setInterval(() => {
      const live = Math.round(Number(this.data.f3HeightMm)) || 0;
      if (live > 0) this._f3CalTryPushSample(live);
      left -= 1;
      if (left > 0) {
        this.setData({ f3CalCountdown: left });
        return;
      }
      clearInterval(this._f3CalTimer);
      this._f3CalTimer = null;
      if (this._f3CalLiveTimer) {
        clearInterval(this._f3CalLiveTimer);
        this._f3CalLiveTimer = null;
      }
      this._f3CalSampling = false;
      const readings = this._f3CalReadings.slice();
      const median = this._f3CalMedian(readings);
      const minimum = this._f3CalMin(readings);
      if (typeof onDone === 'function') onDone({ median, minimum, readings });
    }, 1000);
  },

  _f3CalDismissWizard() {
    this._clearF3CalTimer();
    this._f3CalBranch = '';
    this._f3CalH0Units = 0;
    this.setData({
      f3ShowCalOverlay: false,
      f3CalShowHoldModal: false,
      f3CalStep: '',
      f3CalBranch: '',
      f3CalTitle: '鑷姩鏍囧畾',
      f3CalDesc: '',
      f3CalTargetLabel: '',
      f3CalLiveText: '',
      f3CalMedianText: '',
      f3CalResultText: '',
      f3CalStatusText: '',
      f3CalCountdown: 0
    });
  },

  /** 鏍囧畾缁撴潫锛氬叧鎺夐伄缃┿€佹墦寮€楂樼骇璁剧疆銆佸～鍏ラ珮搴︼紝淇濇寔娴嬮珮閰嶇疆妯″紡 */
  _f3CalReleaseForManualWrite(safeMmText, dangerMmText) {
    this._clearF3CalTimer();
    this._f3CalBranch = '';
    this._f3CalH0Units = 0;
    this.setData({
      f3ShowCalOverlay: false,
      f3CalShowHoldModal: false,
      f3CalStep: '',
      f3CalResultText: '',
      f3CalStatusText: '',
      f3BaseInput: safeMmText ? String(safeMmText) : this.data.f3BaseInput,
      f3DangerInput: dangerMmText ? String(dangerMmText) : this.data.f3DangerInput,
      showSettingsModal: true
    });
  },

  _f3CalAbortWithToast(toastText) {
    this._f3CalDismissWizard();
    if (toastText) this._showCustomToast(toastText, 'none', 2500);
  },

  _f3CalEnterWheelStep(branch) {
    const isA = branch === 'A';
    this._f3CalBranch = branch;
    this._f3CalRulerLastIndex = 0;
    this.setData({
      f3CalStep: 'wheel',
      f3CalBranch: branch,
      f3CalTitle: isA ? '鍒嗘敮 A锛氱焊鏉挎爣瀹? : '鍒嗘敮 B锛氭寜鍘嬫爣瀹?,
      f3CalDesc: isA
        ? `棣栨璇绘暟 ${this._f3CalFormatLive(this._f3CalH0Units)}锛堜綆浜?400 mm锛夈€傛粦鍔ㄦ尝杞垨鐐规寜閽井璋冪煭灏俱€俙
        : `棣栨璇绘暟 ${this._f3CalFormatLive(this._f3CalH0Units)}锛堜笉浣庝簬 400 mm锛夈€傛粦鍔ㄦ尝杞垨鐐规寜閽井璋冪煭灏俱€俙,
      f3CalStatusText: '鐐硅皟澶?璋冨皬鍚庣煭灏惧簲绔嬪埢寰姩锛涘畬鎴愬悗鐐广€屾垜宸茬粡鍑嗗濂戒簡銆?,
      f3CalTicks: new Array(46).fill(0),
      f3CalPadTicks: new Array(20).fill(0),
      f3CalTranslateX: 0,
      f3CalRulerTransition: 'none'
    });
  },

  _f3CalClampRulerTranslate(trans) {
    const maxIdx = 25;
    const minT = -(maxIdx * (this.tickWidthPx || 20));
    if (trans > 0) return 0;
    if (trans < minT) return minT;
    return trans;
  },

  _f3CalIndexFromTranslate(trans) {
    return Math.round(-(trans || 0) / (this.tickWidthPx || 20));
  },

  onF3CalRulerTouchStart(e) {
    if (this.data.f3CalStep !== 'wheel') return;
    const touchX = e.touches[0].clientX;
    this._f3CalTouchStartX = touchX;
    this._f3CalStartTranslateX = this.data.f3CalTranslateX || 0;
    this._f3CalRulerLastIndex = this._f3CalIndexFromTranslate(this._f3CalStartTranslateX);
  },

  onF3CalRulerTouchMove(e) {
    if (this.data.f3CalStep !== 'wheel' || !e.touches || !e.touches.length) return;
    if (this._f3CalTouchStartX == null) {
      this.onF3CalRulerTouchStart(e);
      return;
    }
    const diff = (e.touches[0].clientX - this._f3CalTouchStartX) * OPEN_ANGLE_RULER_SENSITIVITY;
    const newTrans = this._f3CalClampRulerTranslate(this._f3CalStartTranslateX + diff);
    this.setData({ f3CalTranslateX: newTrans, f3CalRulerTransition: 'none' });
    const idx = this._f3CalIndexFromTranslate(newTrans);
    const prev = this._f3CalRulerLastIndex;
    if (idx !== prev) {
      const step = Math.abs(idx - prev);
      const tag = idx > prev ? 'U' : 'D';
      this._f3CalSendFoldCmd(tag, step);
      this._f3CalRulerLastIndex = idx;
      wx.vibrateShort({ type: 'light' });
    }
  },

  onF3CalRulerTouchEnd() {
    this._f3CalTouchStartX = null;
    this._f3CalStartTranslateX = null;
  },

  _f3CalAfterSample1(result) {
    const median = result && typeof result === 'object' ? result.median : result;
    if (!median) {
      this._f3CalAbortWithToast('鏈噰鍒版湁鏁堥珮搴︼紝璇锋鏌ヤ紶鎰熷櫒鍚庨噸璇?);
      return;
    }
    this._f3CalH0Units = median;
    const branch = median < 400 ? 'A' : 'B';
    this._f3CalEnterWheelStep(branch);
  },

  _f3CalAfterRestore() {
    const branch = this._f3CalBranch;
    if (branch === 'A') {
      this.setData({
        f3CalStep: 'cardboard',
        f3CalTitle: '鏀剧疆绾告澘',
        f3CalDesc: '璇峰皢绾告澘鎴栧钩鏉挎斁鍦ㄧ墝鐨勬渶涓嬫部锛屼笌鐗屼繚鎸佹按骞冲榻愶紝澶ц嚧浼颁竴涓嬭窛绂诲嵆鍙€?,
        f3CalStatusText: '鎽嗗ソ鍚庣偣鍑讳笅鏂规寜閽?
      });
      return;
    }
    this.setData({
      f3CalStep: 'compress',
      f3CalTitle: '鎸夊帇鍘嬬缉',
      f3CalDesc: '璇锋寜鍘嬪悗灏撅紝鎴栬浇浜鸿杞儙鍘嬩笅閬块渿锛屾ā鎷熷彲鑳芥墦鍒拌疆鑳庣殑楂樺害銆?,
      f3CalStatusText: '鍑嗗濂藉悗鐐瑰嚮銆屽紑濮嬮噰闆嗐€?
    });
  },

  _f3CalFinishWithSample(result) {
    const dangerUnits = Math.round(Number(result && typeof result === 'object' ? result.minimum : result));
    const baseUnits = Math.round(Number(this._f3CalH0Units));
    if (!dangerUnits || dangerUnits < 10) {
      this._f3CalAbortWithToast('鏈噰鍒版湁鏁堥珮搴︼紝璇烽噸璇?);
      return;
    }
    const dangerMmText = this._f3FormatMmInput(dangerUnits);
    const safeMmText = baseUnits > 0 ? this._f3FormatMmInput(baseUnits) : '';
    this.setData({
      f3CalStep: 'done',
      f3CalTitle: '鏍囧畾瀹屾垚',
      f3CalResultText: safeMmText
        ? `瀹夊叏 ${safeMmText} mm 路 鍗遍櫓 ${dangerMmText} mm`
        : `鍗遍櫓楂樺害 ${dangerMmText} mm`,
      f3CalStatusText: '姝ｅ湪鍐欏叆璁惧鈥?,
      f3BaseInput: safeMmText || this.data.f3BaseInput,
      f3DangerInput: dangerMmText
    });
    this._f3CalCommitHeightWrites(baseUnits, dangerUnits, safeMmText, dangerMmText);
  },

  /** 鑷姩鏍囧畾锛氬厛鍏冲脊绐椼€佸紑璁剧疆锛屽啀涓庢墜鍔ㄥ啓鍏ュ畬鍏ㄧ浉鍚屽湴鍙?DA/TB */
  _f3CalCommitHeightWrites(baseUnits, dangerUnits, safeMmText, dangerMmText) {
    console.log(`[鑷姩鏍囧畾] 鍐欏叆 base=${baseUnits}mm danger=${dangerUnits}mm`);
    this._f3CancelHeightCharTimers();
    this._clearBleSendQueue();
    this._f3CalReleaseForManualWrite(safeMmText, dangerMmText);
    this._showCustomToast('鏍囧畾瀹屾垚锛屾鍦ㄥ悗鍙板啓鍏ヨ澶団€?, 'none', 2200);

    const run = async () => {
      await this._f3WaitBleQueueIdle(6000);
      await new Promise((r) => setTimeout(r, 2000));

      try {
        console.log(`[鑷姩鏍囧畾] 鍐?danger ${dangerUnits}`);
        await this._f3HeightWriteWithAck('danger', dangerUnits);
        await this._f3WaitBleQueueIdle(8000);
        await new Promise((r) => setTimeout(r, 5000));

        if (baseUnits > 0) {
          console.log(`[鑷姩鏍囧畾] 鍐?base ${baseUnits}`);
          await this._f3HeightWriteWithAck('base', baseUnits);
          await this._f3WaitBleQueueIdle(5000);
        }

        this._showCustomToast('鏍囧畾鏁版嵁宸插啓鍏ヨ澶?, 'none', 2000);
        setTimeout(() => {
          this._f3SetHeightConfigMode(false, { clearQueue: false });
        }, 1500);
      } catch (e) {
        console.error('[鑷姩鏍囧畾] 鍐欏叆鏈畬鎴?, e);
        this._showCustomToast('鑷姩鍐欏叆鏈畬鎴愶紝璇风偣銆屽啓鍏ャ€嶆寜閽?, 'none', 3500);
      }
    };

    setTimeout(() => run().catch((err) => {
      console.error('[鑷姩鏍囧畾] 寮傚父', err);
      this._showCustomToast('璇峰湪楂樼骇璁剧疆閲屾墜鍔ㄧ偣鍐欏叆', 'none', 3500);
    }), 800);
  },

  _f3CalStartWizard() {
    if (!this._canControlDevice() || !this._isBleLinked()) {
      this._showCustomToast('璇峰厛杩炴帴钃濈墮', 'none', 2000);
      return;
    }
    this._clearF3CalTimer();
    this._f3CalBranch = '';
    this._f3CalH0Units = 0;
    this.setData({
      f3ShowCalOverlay: true,
      f3CalShowHoldModal: false,
      f3CalStep: 'sample1',
      f3CalTitle: 'F3 鑷姩鏍″噯 路 棣栨妫€娴?,
      f3CalDesc: '璇峰皢杞﹁締鎵舵銆佺珯绋筹紝淇濇寔鐗岀収鏋跺叧闂€?,
      f3CalTargetLabel: 'A 鍗遍櫓楂樺害',
      f3CalStatusText: '5 绉掑唴鍙栦腑闂村€间綔涓哄垽鏂緷鎹?
    });
    this._f3CalStartSample('sample1', (result) => this._f3CalAfterSample1(result));
  },

  onF3StartAutoCal() {
    if (!isF3MaxModel(this.data.currentModel)) return;
    if (!this._canControlDevice() || !this._isBleLinked()) {
      this._showCustomToast('璇峰厛杩炴帴钃濈墮', 'none', 2000);
      return;
    }
    const start = () => this._f3CalStartWizard();
    if (!this.data.f3HeightConfigModeOn) {
      this._f3SetHeightConfigMode(true);
      setTimeout(start, 1600);
      return;
    }
    start();
  },

  onF3CalCancel() {
    this._f3CalSendFoldCmd('R');
    this._f3CalDismissWizard();
  },

  onF3CalReady() {
    if (this.data.f3CalStep !== 'wheel') return;
    this.setData({
      f3CalStep: 'restoring',
      f3CalTitle: '鎭㈠鎶樺彔瑙?,
      f3CalStatusText: '鐭熬姝ｅ湪鍥炲埌姝ｅ父瑙掑害锛坕tem4锛夆€?
    });
    this._f3CalSendFoldCmd('R');
    if (this._f3CalRestoreTimer) clearTimeout(this._f3CalRestoreTimer);
    this._f3CalRestoreTimer = setTimeout(() => {
      this._f3CalRestoreTimer = null;
      this._f3CalAfterRestore();
    }, 2200);
  },

  onF3CalCardboardKnow() {
    if (this.data.f3CalStep !== 'cardboard') return;
    this.setData({ f3CalShowHoldModal: true });
  },

  onF3CalHoldConfirm() {
    if (!this.data.f3CalShowHoldModal) return;
    this.setData({
      f3CalShowHoldModal: false,
      f3CalTitle: '閲囬泦鏍囧畾鏁版嵁',
      f3CalDesc: '璇蜂繚鎸佺焊鏉挎按骞筹紝涓嶈绉诲姩鎴栨檭鍔ㄣ€?,
      f3CalStatusText: '5 绉掑唴鍙栨渶灏忓€间綔涓哄嵄闄╅珮搴?
    });
    this._f3CalStartSample('sample2', (result) => this._f3CalFinishWithSample(result));
  },

  onF3CalCompressStart() {
    if (this.data.f3CalStep !== 'compress') return;
    this.setData({
      f3CalTitle: '閲囬泦鏍囧畾鏁版嵁',
      f3CalDesc: '璇蜂繚鎸佹寜鍘嬫垨杞戒汉鐘舵€侊紝涓嶈鏉惧紑銆?,
      f3CalStatusText: '5 绉掑唴鍙栨渶灏忓€间綔涓哄嵄闄╅珮搴?
    });
    this._f3CalStartSample('sample2', (result) => this._f3CalFinishWithSample(result));
  },

  _parseF3HeightMmInput(raw) {
    let s = String(raw || '').trim();
    s = s.replace(/[\uFF10-\uFF19]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xFF10 + 0x30));
    s = s.replace(/[^\d]/g, '');
    if (!s) return NaN;
    const mm = Math.round(Number(s));
    if (!Number.isFinite(mm)) return NaN;
    return mm;
  },

  /** 鏁板瓧浣嶄箣鍜?mod 100锛?浣嶈ˉ闆躲€傜敤浜庨檮鍔犳牎楠屽拰锛孊LE 涓㈠瓧绗?涓插瓧绗︽椂鍑犱箮蹇呯劧瀵逛笉涓婏紝
   * 鍥轰欢鏍￠獙澶辫触浼氱洿鎺ヤ涪寮冭鏉″懡浠わ紝涓嶄細璇啓鎴愬埆鐨勯珮搴︺€?*/
  _f3DigitChecksum(digits) {
    let sum = 0;
    for (let i = 0; i < digits.length; i++) {
      const code = digits.charCodeAt(i) - 48;
      if (code >= 0 && code <= 9) sum += code;
    }
    return String(sum % 100).padStart(2, '0');
  },

  _f3HeightStorageCmd(kind, storageUnits) {
    const tag = kind === 'danger' ? 'DA' : 'TB';
    const mm = Math.round(Number(storageUnits));
    if (!Number.isFinite(mm) || mm < 10 || mm > 3000) return '';
    const mmText = String(mm);
    const checksum = this._f3DigitChecksum(mmText);
    const cmd = `${tag}${mmText}S${checksum}`;
    console.log(`[楂樺害鍛戒护] ${kind} mm=${mm} cmd=${cmd}`);
    return cmd;
  },

  _f3SubmitHeightMm(kind, storageUnits, options) {
    console.log(`[_f3SubmitHeightMm] 寮€濮? kind=${kind}, storageUnits=${storageUnits}, options=`, options);
    const units = Math.max(10, Math.min(3000, Math.round(Number(storageUnits))));
    console.log(`[_f3SubmitHeightMm] units (clamped) = ${units}, isFinite=${Number.isFinite(units)}`);
    if (!Number.isFinite(units)) {
      console.error('[_f3SubmitHeightMm] 杩斿洖false: units涓嶆槸鏈夐檺鏁?);
      return false;
    }
    const mmText = this._f3FormatMmInput(units);
    console.log(`[_f3SubmitHeightMm] mmText=${mmText}`);
    const label = kind === 'danger' ? '鍗遍櫓楂樺害' : '妫€娴嬮珮搴?;
    const cmd = this._f3HeightStorageCmd(kind, units);
    console.log(`[_f3SubmitHeightMm] cmd=${cmd}`);
    if (!cmd) {
      console.error('[_f3SubmitHeightMm] 杩斿洖false: _f3HeightStorageCmd杩斿洖绌?);
      return false;
    }
    const patch = kind === 'danger'
      ? { f3DangerInput: mmText }
      : { f3BaseInput: mmText };
    this.setData(patch);
    const result = this._sendF3HeightBleCmd(cmd, label, kind, units, mmText, options);
    console.log(`[_f3SubmitHeightMm] _sendF3HeightBleCmd杩斿洖: ${result}`);
    return result;
  },

  _f3FormatHeightMm(mm) {
    const n = Math.round(Number(mm));
    if (!Number.isFinite(n) || n <= 0) return '';
    return `${n} mm`;
  },

  _f3FormatMmInput(mm) {
    const n = Math.round(Number(mm));
    if (!Number.isFinite(n) || n <= 0) return '';
    return String(n);
  },

  _f3SetHeightConfigMode(on, options) {
    const opts = options || {};
    if (!isF3MaxModel(this.data.currentModel)) return;
    if (!this._canControlDevice() || !this._isBleLinked()) {
      this._showCustomToast('璇峰厛杩炴帴钃濈墮', 'none', 2000);
      return;
    }
    this.setData({ f3HeightConfigModeOn: !!on });
    this._f3CfgReadyAt = on ? (Date.now() + 1500) : 0;
    
    // 閫€鍑洪厤缃ā寮忔椂娓呴櫎鍙戦€侀攣瀹?    if (!on) {
      this._f3HeightSendLockUntil = 0;
      console.log('[_f3SetHeightConfigMode] 閫€鍑洪厤缃ā寮忥紝娓呴櫎鍙戦€侀攣瀹?);
    }
    
    if (opts.clearQueue !== false) this._clearBleSendQueue();
    if (!on && this.data.f3ShowCalOverlay && !opts.keepCalOverlay) this._f3CalDismissWizard();
    this.sendData(on ? 'M1#' : 'M0#', 1000);
    this._showCustomToast(on ? '宸茶繘鍏ユ祴楂橀厤缃ā寮忥紝璇风◢鍊欏啀鍐欏叆' : '宸查€€鍑烘祴楂橀厤缃ā寮?, 'none', 1800);
  },

  onF3EnterHeightConfigMode() {
    this._f3SetHeightConfigMode(true);
  },

  onF3ExitHeightConfigMode() {
    this._f3SetHeightConfigMode(false);
  },

  _sendF3HeightBleCmd(sendText, label, kind, expectedUnits, mmText, options) {
    console.log(`[_sendF3HeightBleCmd] 寮€濮? sendText=${sendText}, label=${label}, kind=${kind}`);
    const opts = options || {};
    if (!this._canControlDevice() || !this._isBleLinked()) {
      console.error('[_sendF3HeightBleCmd] 杩斿洖false: 鏈繛鎺ヨ摑鐗?);
      this._showCustomToast('璇峰厛杩炴帴钃濈墮', 'none', 2000);
      return false;
    }
    if (!this.data.f3HeightConfigModeOn) {
      console.error('[_sendF3HeightBleCmd] 杩斿洖false: 鏈繘鍏ラ厤缃ā寮?);
      this._showCustomToast('璇峰厛鐐广€岃繘鍏ユ祴楂橀厤缃ā寮忋€?, 'none', 2200);
      return false;
    }
    if (Date.now() < (this._f3CfgReadyAt || 0)) {
      console.error('[_sendF3HeightBleCmd] 杩斿洖false: 閰嶇疆妯″紡鏈氨缁?);
      this._showCustomToast('閰嶇疆妯″紡鍒氳繘鍏ワ紝璇?1 绉掑悗鍐嶇偣', 'none', 1800);
      return false;
    }
    if (Date.now() < (this._f3HeightSendLockUntil || 0)) {
      console.error('[_sendF3HeightBleCmd] 杩斿洖false: 鍙戦€佽閿佸畾');
      this._showCustomToast('鍙戦€佽繃蹇紝璇风◢鍊?, 'none', 1200);
      return false;
    }
    const cmd = String(sendText || '').replace(/#$/, '') + '#';
    console.log(`[_sendF3HeightBleCmd] 鏈€缁堝懡浠? ${cmd}`);
    const units = Math.round(Number(expectedUnits));
    const displayMm = mmText || this._f3FormatMmInput(units);
    const charCount = cmd.length;
    const charSendMs = charCount * 280 + 1500;
    this._f3HeightSendLockUntil = Date.now() + charSendMs;
      if (kind && Number.isFinite(units)) {
      this._f3HeightWritePending = {
        kind,
        units,
        expire: Date.now() + (opts.ackTimeout || 12000),
        onAck: typeof opts.onAck === 'function' ? opts.onAck : null,
        onFail: typeof opts.onFail === 'function' ? opts.onFail : null
      };
      console.log('[_sendF3HeightBleCmd] 璁剧疆pending:', this._f3HeightWritePending);
      if (!opts.onAck) {
        const readback = formatF3HeightMm(units);
        const optimistic = kind === 'danger'
          ? { f3DangerMm: units, f3DangerReadback: readback }
          : { f3BaseMm: units, f3BaseReadback: readback };
        this.setData(optimistic);
        console.log('[_sendF3HeightBleCmd] 涔愯鏇存柊UI:', optimistic);
      }
    }
    console.log(`馃摛 [钃濈墮] ${label || '娴嬮珮閰嶇疆'} 鍙戦€併€?{cmd}銆?${displayMm} mm)`);
    this._f3CancelHeightCharTimers();
    this._clearBleSendQueue();
    this._f3EnqueueHeightCmdChars(cmd);
    
    if (!opts.silent) {
      this._showCustomToast(`宸插彂閫?${displayMm} mm`, 'none', 1800);
      wx.vibrateShort({ type: 'light' });
    }
    console.log('[_sendF3HeightBleCmd] 杩斿洖true: 鍛戒护宸插畨鎺掑彂閫?);
    return true;
  },

  onF3SendDangerHeight() {
    const raw = String(this.data.f3DangerInput || '').trim();
    const mm = this._parseF3HeightMmInput(raw);
    if (!Number.isFinite(mm) || mm < 10 || mm > 3000) {
      this._showCustomToast('鍗遍櫓楂樺害璇疯緭鍏?10鈥?000 mm', 'none', 2000);
      return;
    }
    this._f3SubmitHeightMmRetrying('danger', mm);
  },

  onF3SendBaseHeight() {
    const raw = String(this.data.f3BaseInput || '').trim();
    const mm = this._parseF3HeightMmInput(raw);
    if (!Number.isFinite(mm) || mm < 10 || mm > 3000) {
      this._showCustomToast('妫€娴嬮珮搴﹁杈撳叆 10鈥?000 mm', 'none', 2000);
      return;
    }
    this._f3SubmitHeightMmRetrying('base', mm);
  },

  // 鎵撳紑璁剧疆寮圭獥
  openSettings() {
    if (Date.now() < (this._controlTapLockUntil || 0)) return;
    // 馃敶 妫€鏌ヨ摑鐗欒繛鎺ョ姸鎬侊細鏈繛鎺ユ椂涓嶅厑璁镐娇鐢紙绠＄悊鍛橀櫎澶栵級
    if (!this._canControlDevice()) {
      // 鏄剧ず"璇峰厛杩炴帴钃濈墮"灏忚兌鍥婃彁绀?      this.setData({ showConnectBluetoothTip: true });
      // 2绉掑悗鑷姩闅愯棌
      setTimeout(() => {
        this.setData({ showConnectBluetoothTip: false });
      }, 2000);
      return;
    }
    
    // 鏉冮檺鏍￠獙锛氬彧鏈?Max 鏈哄瀷鍙互鎵撳紑
    // F1 Max: 鍙互鎵撳紑锛屼絾閮ㄥ垎鍔熻兘闅愯棌
    // F2 Max: 鍙互鎵撳紑锛屽叏鍔熻兘
    // F2 Max Long: 鍙互鎵撳紑锛屽叏鍔熻兘
    const model = this.data.currentModel;
    if (!model || !isMaxControlLayoutType(model.type)) {
      return; // Pro 鏈哄瀷鐐瑰嚮鏃犳晥
    }

    const storedMinutes = wx.getStorageSync('f2_delayPowerOffMinutes');
    let delayPowerOffIndex = this.data.delayPowerOffIndex;
    if (!this.data.isConnected) {
      if (Number.isFinite(Number(storedMinutes))) {
        delayPowerOffIndex = f2DelayPowerOffIndexByMinutes(Number(storedMinutes));
      } else {
        const storedIdx = wx.getStorageSync('f2_delayPowerOffIndex');
        if (Number.isFinite(Number(storedIdx))) {
          delayPowerOffIndex = Math.min(Number(storedIdx), F2_DELAY_POWER_OFF_OPTIONS.length - 1);
        }
      }
    }

    // 馃敶 閲嶇疆鎸囩ず鐏脊绐楁爣璁帮紝姣忔鎵撳紑楂樼骇璁剧疆閮介噸缃?    const settingsPatch = {
      showSettingsModal: true,
      hasShownSettingsIndicatorModal: false,
      delayPowerOffIndex
    };
    if (isF3MaxModel(model)) {
      settingsPatch.f3HeightConfigLocked = false;
    }
    if (isMtUltraCardModel(model) && !isF3MaxModel(model)) {
      let travelHoldIndex = 2;
      let travelDurationIndex = 2;
      try {
        const storedHold = wx.getStorageSync('f2_travel_hold_min');
        if (Number.isFinite(Number(storedHold))) {
          travelHoldIndex = f2TravelHoldIndexByMin(Number(storedHold));
        }
        const storedDur = wx.getStorageSync('f2_travel_duration_hours');
        if (Number.isFinite(Number(storedDur))) {
          travelDurationIndex = f2TravelDurationIndexByHours(Number(storedDur));
        }
      } catch (e) { /* ignore */ }
      const holdMin = F2_TRAVEL_HOLD_OPTIONS[travelHoldIndex].minutes;
      const durH = F2_TRAVEL_DURATION_OPTIONS[travelDurationIndex].hours;
      Object.assign(settingsPatch, {
        travelHoldIndex,
        travelDurationIndex,
        travelHoldMin: holdMin,
        travelDurationHours: durH,
        travelModeTip: buildTravelModeTip(holdMin, durH, this.data.f2TravelModeOn)
      });
    }
    this.setData(settingsPatch);
    this.showToast();
  },

  onDelayPowerOffChange(e) {
    if (this.data.f2TravelModeOn) {
      this._showCustomToast('鍑鸿妯″紡宸插紑鍚紝璇峰厛鍏抽棴鍑鸿妯″紡', 'none', 2200);
      return;
    }
    const model = this.data.currentModel;
    if (!isF2MaxDelayPowerModel(model)) return;
    if (!this._canControlDevice()) {
      this.setData({ showConnectBluetoothTip: true });
      setTimeout(() => this.setData({ showConnectBluetoothTip: false }), 2000);
      return;
    }

    const idx = Number(e.detail.value);
    const opt = this.data.delayPowerOffOptions[idx];
    if (!opt) return;

    const sendText = `寤舵椂鏂數${opt.minutes}`;
    wx.setStorageSync('f2_delayPowerOffIndex', idx);
    wx.setStorageSync('f2_delayPowerOffMinutes', opt.minutes);
    this.setData({ delayPowerOffIndex: idx }, () => {
      console.log(`馃摛 [钃濈墮] F2 ULTRA 璁剧疆寤舵椂鏂數: ${sendText}`);
      this._commitBleCommandAfterUi({
        sendText,
        times: 1,
        interval: 500,
        verify: isMtUltraCardModel(model) ? { type: 'delayPower', minutes: opt.minutes } : null,
        label: '寤舵椂鏂數'
      });
    });
    wx.vibrateShort({ type: 'light' });
  },

  onTravelHoldChange(e) {
    const model = this.data.currentModel;
    if (!isMtUltraCardModel(model)) return;
    if (!this._canControlDevice()) {
      this.setData({ showConnectBluetoothTip: true });
      setTimeout(() => this.setData({ showConnectBluetoothTip: false }), 2000);
      return;
    }
    const idx = Number(e.detail.value);
    const opt = this.data.travelHoldOptions[idx];
    if (!opt) return;
    const sendText = `鍑鸿淇濇寔${opt.minutes}`;
    const durH = this.data.travelDurationHours || 12;
    wx.setStorageSync('f2_travel_hold_min', opt.minutes);
    this.setData({
      travelHoldIndex: idx,
      travelHoldMin: opt.minutes,
      travelModeTip: buildTravelModeTip(opt.minutes, durH, this.data.f2TravelModeOn)
    }, () => {
      this._commitBleCommandAfterUi({
        sendText,
        times: 1,
        interval: 500,
        verify: null,
        label: '鍑鸿淇濇寔'
      });
    });
    wx.vibrateShort({ type: 'light' });
  },

  onTravelDurationChange(e) {
    const model = this.data.currentModel;
    if (!isMtUltraCardModel(model)) return;
    if (!this._canControlDevice()) {
      this.setData({ showConnectBluetoothTip: true });
      setTimeout(() => this.setData({ showConnectBluetoothTip: false }), 2000);
      return;
    }
    const idx = Number(e.detail.value);
    const opt = this.data.travelDurationOptions[idx];
    if (!opt) return;
    const sendText = `鍑鸿鏃堕暱${opt.hours}`;
    const holdMin = this.data.travelHoldMin || 3;
    wx.setStorageSync('f2_travel_duration_hours', opt.hours);
    this.setData({
      travelDurationIndex: idx,
      travelDurationHours: opt.hours,
      travelModeTip: buildTravelModeTip(holdMin, opt.hours, this.data.f2TravelModeOn)
    }, () => {
      this._commitBleCommandAfterUi({
        sendText,
        times: 1,
        interval: 500,
        verify: null,
        label: '鍑鸿鏃堕暱'
      });
    });
    wx.vibrateShort({ type: 'light' });
  },

  onTravelKeyOffChange(e) {
    const model = this.data.currentModel;
    if (!isMtUltraCardModel(model)) return;
    if (!this._canControlDevice()) {
      this.setData({ showConnectBluetoothTip: true });
      setTimeout(() => this.setData({ showConnectBluetoothTip: false }), 2000);
      return;
    }
    const idx = Number(e.detail.value);
    const opt = (this.data.travelKeyOffOptions || F2_TRAVEL_KEYOFF_OPTIONS)[idx];
    if (!opt) return;
    const holdMin = this.data.travelHoldMin || 3;
    const durH = this.data.travelDurationHours || 12;
    wx.setStorageSync('f2_travel_keyoff_retract', opt.retract ? 1 : 0);
    this.setData({
      travelKeyOffIndex: idx,
      travelModeTip: buildTravelModeTip(holdMin, durH, this.data.f2TravelModeOn, opt.retract)
    }, () => {
      this._commitBleCommandAfterUi({
        sendText: opt.cmd,
        times: 1,
        interval: 500,
        verify: null,
        label: '鍑鸿鍏抽挜鍖?
      });
    });
    wx.vibrateShort({ type: 'light' });
  },

  closeSettings() {
    this.setData({ showSettingsModal: false });
    // 鍏抽棴鏃舵竻闄?Toast
    this.setData({ toastClass: '' });
  },

  // 馃敶 鏂板锛氱‘璁ゅ彂閫佹暟鎹紙鎸囩ず鐏‘璁ゅ脊绐楋級
  confirmSendData() {
    if (!this.data.pendingSendData) {
      console.warn('鈿狅笍 [钃濈墮] 娌℃湁寰呭彂閫佺殑鏁版嵁');
      return;
    }

    const { type, sendText, key, targetVal, label } = this.data.pendingSendData;
    const currentModel = this.data.currentModel;
    const isF2Ble = isF2MaxLikeControl(currentModel);
    
    // 鍏抽棴寮圭獥
    this.setData({ 
      showIndicatorCheckModal: false,
      indicatorCheckModalClosing: true
    });

    // 寤惰繜涓€涓嬪啀鍙戦€侊紝璁╁脊绐楀叧闂姩鐢诲畬鎴?    setTimeout(() => {
      this.setData({ 
        indicatorCheckModalClosing: false,
        pendingSendData: null
      });

      if (type === 'adjust') {
        this._foldAdjustActive = true;
        this._commitBleCommandAfterUi({
          sendText,
          times: 1,
          interval: 300,
          verify: null,
          label: '鎶樺彔璋冩暣'
        });
      } else if (type === 'settings') {
        const modelName = label || (isMtUltraCardModel(currentModel)
          ? mtUltraCardLabel(currentModel)
          : (isF2Ble
            ? (isF2LongType(currentModel.type) ? 'F2 Long' : 'F2 MAX')
            : 'F1 MAX'));
        if (isMtUltraCardModel(currentModel)) {
          this._commitBleCommandAfterUi({
            sendText,
            times: 1,
            interval: 500,
            verify: this._buildSettingBleVerify(key, targetVal),
            label: modelName
          });
        } else {
          console.log(`馃摛 [钃濈墮] ${modelName} 鍙戦€併€?{sendText}銆嶏紙杩炵画3娆★紝闂撮殧0.5绉掞級`);
          this.sendDataMultiple(sendText, 3, 500);
          wx.vibrateShort({ type: 'light' });
        }
      }
    }, 300);
  },

  // Toast 鍔ㄧ敾鎺у埗
  showToast() {
    // 閲嶇疆鍔ㄧ敾
    this.setData({ toastClass: '' }, () => {
      setTimeout(() => {
        this.setData({ toastClass: 'pop' });
      }, 300);
      
      // 3.5绉掑悗鑷姩娑堝け
      setTimeout(() => {
        this.setData({ toastClass: '' });
      }, 3800);
    });
  },

  // ===============================================
  // 淇锛氭粦鍧楃偣鍑婚€昏緫 (鐐瑰乏鍘诲乏锛岀偣鍙冲幓鍙?
  // ===============================================
  handleMagClick(e) {
    const key = e.currentTarget.dataset.key;
    const targetVal = e.currentTarget.dataset.val;

    if (!key || !targetVal) return;

    const currentModel = this.data.currentModel;
    const newState = { ...this.data.settingState, [key]: targetVal };

    const isMtUltra = isMtUltraCardModel(currentModel);
    const isF2Ble = isF2MaxSeriesModel(currentModel) || isMtUltra;
    const isF1Max = currentModel &&
                    currentModel.name && currentModel.name.includes('F1') &&
                    currentModel.type === 'Max';

    const stealthUi = isMtUltra
      ? buildF2StealthUiFlags(
        currentModel,
        newState,
        resolveF2BleLinkedForUi({ ...this.data, settingState: newState })
      )
      : {};

    const sendText = this._resolveMagSettingSendText(
      key, targetVal, isF2Ble, isMtUltra, isF1Max
    );
    const sendLabel = isMtUltra
      ? mtUltraCardLabel(currentModel)
      : (isF2Ble ? 'F2 MAX' : (isF1Max ? 'F1 MAX' : ''));

    const afterUiReady = () => {
      if ((isF2Ble || isF1Max) && sendText) {
        this._queueMagSettingSend(sendText, key, targetVal, sendLabel);
      }
      wx.vibrateShort({ type: 'light' });
      console.log(`Setting ${key} set to: ${targetVal}`);
    };

    this.setData({ settingState: newState, ...stealthUi }, () => {
      if (isMtUltra) {
        try {
          wx.setStorageSync('f2_ultra_adv_settingState', newState);
        } catch (e) { /* ignore */ }
      }
      afterUiReady();
    });
  },

  // 銆愭柊澧炪€戞墦寮€鍏ㄦ柊浜у搧鎻愮ず & 寮€濮嬪€掕鏃?  openNewProductHint() {
    this.setData({ 
      showNewProductHint: true,
      newProductBtnLocked: true,
      newProductBtnText: '鐭ラ亾浜?(2s)'
    });

    let timeLeft = 2;
    const timer = setInterval(() => {
      timeLeft--;
      if (timeLeft > 0) {
        this.setData({ newProductBtnText: `鐭ラ亾浜?(${timeLeft}s)` });
      } else {
        clearInterval(timer);
        this.setData({ 
          newProductBtnLocked: false,
          newProductBtnText: '鐭ラ亾浜?
        });
      }
    }, 1000);
  },

  // 銆愭柊澧炪€戝叧闂叏鏂颁骇鍝佹彁绀?  closeNewProductHint() {
    if (this.data.newProductBtnLocked) return; // 閿佸畾涓笉鍙偣
    this.setData({ showNewProductHint: false });
    // 馃敶 璁板綍鍒版湰鍦板瓨鍌紝琛ㄧず宸茬粡寮硅繃锛屼笅娆′笉鍐嶅脊
    wx.setStorageSync('hasShownNewProductHint_F1', true);
  },

  // ===============================================
  // 馃敶 鎵€鏈夊脊绐楃殑鍊掕鏃跺嚱鏁?  // ===============================================

  // 瀵嗙爜寮圭獥鍊掕鏃?  openPasswordModal() {
    // 鍏滃簳锛氱鐞嗗憳涓嶅脊瀵嗙爜锛岀洿鎺ヨ繘鍏ユ暀绋?    if (this.data.isAdmin) {
      if (!this.data.isAuthorized) {
        this.setData({ isAuthorized: true });
      }
      this.showTutorial('fold');
      return;
    }

    this.setData({ 
      showPasswordModal: true, 
      passwordInput: '',
      passwordBtnLocked: true,
      passwordBtnText: '纭 (2s)'
    });
    
    let timeLeft = 2;
    const timer = setInterval(() => {
      timeLeft--;
      if (timeLeft > 0) {
        this.setData({ passwordBtnText: `纭 (${timeLeft}s)` });
      } else {
        clearInterval(timer);
        this.setData({ 
          passwordBtnLocked: false,
          passwordBtnText: '纭'
        });
      }
    }, 1000);
  },

  // 鏁欑▼寮圭獥鍊掕鏃?  startTutorialCountdown() {
    this.setData({ 
      tutorialBtnLocked: true,
      tutorialBtnText: '鐭ラ亾浜?(2s)'
    });
    
    let timeLeft = 2;
    const timer = setInterval(() => {
      timeLeft--;
      if (timeLeft > 0) {
        this.setData({ tutorialBtnText: `鐭ラ亾浜?(${timeLeft}s)` });
      } else {
        clearInterval(timer);
        this.setData({ 
          tutorialBtnLocked: false,
          tutorialBtnText: '鐭ラ亾浜?
        });
      }
    }, 1000);
  },

  // 鍏抽挜鍖欏脊绐楀€掕鏃?  startKeyCountdown() {
    this.setData({ 
      keyBtnLocked: true,
      keyBtnText: '纭 (2s)'
    });
    
    let timeLeft = 2;
    const timer = setInterval(() => {
      timeLeft--;
      if (timeLeft > 0) {
        this.setData({ keyBtnText: `纭 (${timeLeft}s)` });
      } else {
        clearInterval(timer);
        this.setData({ 
          keyBtnLocked: false,
          keyBtnText: '纭'
        });
      }
    }, 1000);
  },

  // 鎵撳紑瑙掑害鎻愮ず寮圭獥鍊掕鏃?  startAngleHintCountdown() {
    this.setData({ 
      angleHintBtnLocked: true,
      angleHintBtnText: '鐭ラ亾浜?(2s)'
    });
    
    let timeLeft = 2;
    const timer = setInterval(() => {
      timeLeft--;
      if (timeLeft > 0) {
        this.setData({ angleHintBtnText: `鐭ラ亾浜?(${timeLeft}s)` });
      } else {
        clearInterval(timer);
        this.setData({ 
          angleHintBtnLocked: false,
          angleHintBtnText: '鐭ラ亾浜?
        });
      }
    }, 1000);
  },

  // ===============================================
  // 馃敶 鎶樺彔椤典笂婊戞彁绀哄姩鐢?  // ===============================================
  
  startFoldInlineHint() {
    if (this._foldFineTuneHintTimer) {
      clearTimeout(this._foldFineTuneHintTimer);
      this._foldFineTuneHintTimer = null;
    }

    // 寮€濮嬫挱鏀捐嚜鍔ㄦ紨绀猴細鎻愮ず + 璋冩暣鎸夐挳鑷姩涓婃粦
    // 鎾斁鏈熼棿鍙攣瀹?璋冩暣"杩欎釜婊戝潡锛岄〉闈㈠叾瀹冨尯鍩熶粛鍙偣鍑?    this.setData({
      showFoldInlineHint: true,
      foldDemoPlaying: true,
      isAdjustDemo: true,        // 寮€鍚紨绀烘ā寮?鈫?鏈夎繃娓″姩鐢?      adjustSlideOffset: 0,
      adjustSlideActive: false,
      foldHintOffset: 0,
      showFoldFineTuneHint: false
    });

    // 1锛夌煭鏆傚睍绀烘彁绀哄悗绔嬪埢婕旂ず涓婃粦锛堝師 2s 鍋忎箙锛屾敼涓虹害 0.65s锛?    setTimeout(() => {
      // 2锛夎"璋冩暣"鎸夐挳鑷姩涓婃粦鍒伴攣瀹氫綅缃紝闇插嚭涓嬮潰鐨?褰掗浂"
      this.setData({
        adjustSlideOffset: -80,   // 涓庢墜鍔ㄩ攣瀹氶珮搴︿竴鑷达紝琛岀▼鐣ョ煭鏇撮『鐣?        adjustSlideActive: true,
        foldHintOffset: -50       // 鎻愮ず鏉′篃涓€璧峰線涓婃彁涓€浜涳紝璁╂枃瀛楀拰绠ご璺熺潃"璋冩暣"璧?      });

      // 3锛夊啀鍋滅暀绾?2.5 绉掞紝鐒跺悗鎸夐挳鍥炲埌搴曢儴銆佹彁绀烘贰鍑恒€佽В闄ら攣瀹?      setTimeout(() => {
        // 鍏堣鎸夐挳甯﹀姩鐢昏惤鍥炲埌搴曢儴
        this.resetAdjustSlider(true);

        // 鍚屾椂娣″嚭鎻愮ず & 鍏抽棴婕旂ず妯″紡
        this.setData({
          showFoldInlineHint: false,
          foldDemoPlaying: false,
          foldHintOffset: 0
        });

        // 4锛夋紨绀哄畬鍏ㄧ粨鏉熷悗鍐嶅嚭鐜扮浜屾鎻愮ず锛堝湪銆岃皟鏁淬€嶆寜閽涓婃柟锛夛紝甯﹀叆鍦哄姩鐢?        setTimeout(() => {
          this.setData({ showFoldFineTuneHint: true });

          // 5锛夎ˉ鍏呮彁绀烘樉绀?3 绉掑悗鑷姩娑堝け
          this._foldFineTuneHintTimer = setTimeout(() => {
            this.setData({ showFoldFineTuneHint: false });
            this._foldFineTuneHintTimer = null;
          }, 3000);
        }, 400);
      }, 2500);
    }, 650);
  },

  // ===============================================
  // 馃敶 璋冩暣鎸夐挳婊戝姩閫昏緫
  // ===============================================
  
  // 婊戝姩寮€濮?  onAdjustSlideStart(e) {
    // 鍙湪鎶樺彔妯″紡涓嬬敓鏁?    if (this.data.editType !== 'fold') return;

    this.setData({
      adjustTouchStartY: e.touches[0].clientY,
      adjustHasMoved: false // 鏍囪鏄惁鍙戠敓浜嗘粦鍔?    });
  },

  // 婊戝姩绉诲姩
  onAdjustSlideMove(e) {
    // 鍙湪鎶樺彔妯″紡涓嬬敓鏁?    if (this.data.editType !== 'fold') return;

    const currentY = e.touches[0].clientY;
    const startY = this.data.adjustTouchStartY;
    let moveY = currentY - startY;

    // 鏍囪宸插彂鐢熸粦鍔紙绉诲姩瓒呰繃 5px 鎵嶇畻婊戝姩锛?    if (Math.abs(moveY) > 5) {
      this.setData({ adjustHasMoved: true });
    }

    // 1. 鍙湁寰€涓婃粦鎵嶇敓鏁?(moveY < 0)
    // 濡傛灉寰€涓嬫粦锛屽己鍒跺綊0
    if (moveY > 0) moveY = 0;

    // 2. 闄愬埗鏈€澶т笂婊戣窛绂?(姣斿 120px)
    if (moveY < -120) moveY = -120;

    // 3. 婵€娲婚槇鍊硷細婊戣繃 -60px 灏辨樉绀哄綊闆?    const isActive = moveY < -60;

    this.setData({
      adjustSlideOffset: moveY,
      adjustSlideActive: isActive
    });
  },

  // 婊戝姩缁撴潫
  onAdjustSlideEnd(e) {
    // 鍙湪鎶樺彔妯″紡涓嬬敓鏁?    if (this.data.editType !== 'fold') return;
    
    const currentOffset = this.data.adjustSlideOffset;
    const hasMoved = this.data.adjustHasMoved;
    
    // 濡傛灉娌℃粦鍔紙鍙槸鐐瑰嚮锛夛紝涓嶅鐞嗭紝璁╃偣鍑讳簨浠惰Е鍙?    if (!hasMoved) {
      this.setData({ adjustHasMoved: false });
      return;
    }
    
    // 閿佸畾闃堝€硷細鏉炬墜鏃讹紝濡傛灉婊戣繃浜?-60px锛屽氨鍋滃湪绌轰腑鏄剧ず褰掗浂
    const lockThreshold = -60;
    const lockPosition = -100; // 鍋滃湪 -100px 鐨勯珮搴?
    if (currentOffset < lockThreshold) {
      // 鍋滀綇锛屾樉绀哄綊闆讹紙甯?snap 鍔ㄧ敾锛?      this.setData({
        adjustSnap: true,
        adjustSlideOffset: lockPosition,
        adjustSlideActive: true
      });

      if (this._canControlDevice()) {
        this._foldAdjustActive = true;
        console.log('馃摛 [钃濈墮] 涓婃粦璋冩暣锛氬彂閫併€岃皟鏁存姌鍙犺搴︺€?);
        this.sendDataMultiple('璋冩暣鎶樺彔瑙掑害', 1, 300);
      }
      
      // 鍔ㄧ敾缁撴潫鍚庡叧闂?snap 绫?      setTimeout(() => {
        this.setData({ adjustSnap: false });
      }, 200);
    } else {
      // 娌℃粦鍒颁綅锛屽脊鍥炲幓锛堝甫 snap 鍔ㄧ敾锛?      this.setData({
        adjustSnap: true,
        adjustSlideOffset: 0,
        adjustSlideActive: false
      });
    
      // 鍔ㄧ敾缁撴潫鍚庡叧闂?snap 绫?    setTimeout(() => {
      this.setData({ adjustSnap: false });
      }, 200);
    }

    // 閲嶇疆婊戝姩鏍囪
    this.setData({ adjustHasMoved: false });
  },

  // 馃敶 璋冩暣鎸夐挳鐐瑰嚮浜嬩欢锛堝綋娌℃湁婊戝姩鏃惰Е鍙戯級
  onAdjustClick(e) {
    // 鍙湪鎶樺彔妯″紡涓嬬敓鏁?    if (this.data.editType !== 'fold') return;
    
    // 濡傛灉鍙戠敓浜嗘粦鍔紝涓嶈Е鍙戠偣鍑?    if (this.data.adjustHasMoved) {
      return;
    }
    
    // 馃敶 鐩存帴璋冪敤 handleAdjust锛屽彂閫?璋冩暣鎶樺彔瑙掑害"
    this.handleAdjust({ currentTarget: { dataset: { action: 'adjust', mode: 'fold' } } });
  },

  // 閲嶇疆婊戝姩鐘舵€侊紙鐐瑰嚮褰掗浂鍚庤皟鐢級
  resetAdjustSlider(fromDemo = false) {
    if (fromDemo) {
      // 馃敶 浠庢紨绀烘ā寮忓洖钀斤細淇濇寔 isAdjustDemo 绫伙紝璁╁姩鐢诲钩婊?    this.setData({
      adjustSlideOffset: 0,
      adjustSlideActive: false
    });

      // 绛夊姩鐢荤粨鏉熷悗鍐嶅叧闂?demo class锛岄伩鍏嶄腑閫斿崱椤?      setTimeout(() => {
        this.setData({ isAdjustDemo: false });
      }, 300);
    } else {
      // 馃敶 浠庢墜鍔ㄤ笂婊?鐐瑰嚮褰掗浂鍥炶惤锛氬惎鐢?snap 绫伙紙蹇€熷洖寮癸級
    this.setData({
        adjustSnap: true,
      adjustSlideOffset: 0,
        adjustSlideActive: false
    });

      // 鍔ㄧ敾缁撴潫鍚庡叧闂?snap 绫?    setTimeout(() => {
        this.setData({ adjustSnap: false });
      }, 200); // snap 鍔ㄧ敾鏄?0.18s
    }
  },

  // ===============================================
  // 钃濈墮鍙戦€佹暟鎹柟娉曪紙鍩轰簬浣犳彁渚涚殑閫昏緫锛?  // ===============================================
  
  // 瀛楃涓茶浆ArrayBuffer锛圲TF-8缂栫爜锛?  stringToArrayBuffer(str) {
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

  _getBleWriteCharacteristicId() {
    const ble = this.ble;
    if (!ble) return '';
    return ble.characteristicId2 || ble.characteristicId || '';
  },

  _isBleWriteReady() {
    const ble = this.ble;
    if (!ble || !ble.device || !ble.serviceId) return false;
    if (!this._isBleLinked()) return false;
    return !!this._getBleWriteCharacteristicId();
  },

  writeBleDataPromise(arrayBuffer) {
    const ble = this.ble;
    const charId = this._getBleWriteCharacteristicId();
    if (!ble || !ble.device || !ble.serviceId || !charId) {
      return Promise.resolve(false);
    }
    return new Promise((resolve) => {
      wx.writeBLECharacteristicValue({
        deviceId: ble.device.deviceId,
        serviceId: ble.serviceId,
        characteristicId: charId,
        value: arrayBuffer,
        success: () => resolve(true),
        fail: (err) => {
          console.log('鉂?[钃濈墮] 鍙戦€佸け璐?', err.errMsg);
          resolve(false);
        }
      });
    });
  },

  _buildSettingBleVerify(key, targetVal) {
    if (!isMtUltraCardModel(this.data.currentModel)) return null;
    if (!key || !targetVal) return null;
    if (key === 'selfRepair') {
      return { type: 'setting', key, targetVal };
    }
    if (key === 'faultDetect') {
      return { type: 'setting', key, targetVal };
    }
    return { type: 'setting', key, targetVal };
  },

  /** 鏍￠獙绛夊緟鏈熼棿锛屼笉璁╄澶囧洖璇昏鐩栫敤鎴峰垰鐐圭殑 UI */
  _stripConflictingBleReadback(updates) {
    const verify = this._bleVerifyPending;
    const heightPending = this._f3HeightWritePending;
    if (heightPending && updates && Date.now() < heightPending.expire) {
      const mmKey = heightPending.kind === 'danger' ? 'f3DangerMm' : 'f3BaseMm';
      const rbKey = heightPending.kind === 'danger' ? 'f3DangerReadback' : 'f3BaseReadback';
      const incoming = updates[mmKey];
      console.log(`[鍥炶鏍￠獙] kind=${heightPending.kind} expect=${heightPending.units} incoming=${incoming} mmKey=${mmKey}`);
      if (incoming !== undefined && incoming !== null && Math.round(Number(incoming)) === heightPending.units) {
        console.log('[鍥炶鏍￠獙] 鉁?鍖归厤鎴愬姛');
        const onAck = heightPending.onAck;
        this._f3HeightWritePending = null;
        this._f3HeightSendLockUntil = 0;
        if (typeof onAck === 'function') onAck();
      } else if (incoming !== undefined) {
        console.log('[鍥炶鏍￠獙] 鉁?涓嶅尮閰嶏紝鍒犻櫎鍥炶');
        delete updates[mmKey];
        delete updates[rbKey];
      }
    } else if (heightPending && Date.now() >= heightPending.expire) {
      console.log('[鍥炶鏍￠獙] 瓒呮椂');
      const onFail = heightPending.onFail;
      this._f3HeightWritePending = null;
      this._f3HeightSendLockUntil = 0;
      if (typeof onFail === 'function') onFail();
    }
    if (!verify || !updates) return updates;
    if (verify.type === 'setting') {
      delete updates.settingState;
      if (verify.key === 'travelMode') {
        delete updates.f2TravelModeOn;
        delete updates.delayPowerOffTip;
        delete updates.travelModeTip;
        delete updates.f2TravelReadbackText;
      }
      if (verify.key === 'shutdown' || verify.key === 'faultDetect' || verify.key === 'selfRepair'
        || verify.key === 'powerOn'
        || verify.key === 'smoothMode' || verify.key === 'stealthBtnExit') {
        delete updates.f2TravelReadbackText;
        delete updates.f2DelayPowerReadbackText;
      }
    }
    if (verify.type === 'speed') {
      delete updates.f2ServoSpeed;
    }
    if (verify.type === 'delayPower') {
      delete updates.delayPowerOffIndex;
      delete updates.f2DelayPowerReadbackText;
    }
    if (verify.type === 'flap') {
      delete updates.flapPanelState;
      delete updates.flapPanelStateText;
      delete updates.flapMotionDir;
    }
    return updates;
  },

  /** UI 宸叉洿鏂板悗鍐嶅彂 BLE锛涢潪 Ultra 鏃犲洖璇绘牎楠岋紝Ultra 鍥炶涓嶄竴鑷翠細閲嶅彂 */
  _commitBleCommandAfterUi(intent) {
    if (!intent || !intent.sendText) return;
    this._pendingBleIntent = {
      sendText: intent.sendText,
      times: intent.times != null ? intent.times : 3,
      interval: intent.interval != null ? intent.interval : 500,
      verify: intent.verify || null,
      label: intent.label || ''
    };
    this._bleVerifyRetryCount = 0;
    if (!this._canControlDevice()) {
      this.setData({ showConnectBluetoothTip: true });
      setTimeout(() => this.setData({ showConnectBluetoothTip: false }), 2000);
      return;
    }
    const ultra = isMtUltraCardModel(this.data.currentModel);
    this._bleVerifyPending = ultra && intent.verify ? intent.verify : null;
    const { sendText, times, interval, label } = this._pendingBleIntent;
    console.log(`馃摛 [钃濈墮] ${label} 鍙戦€併€?{sendText}銆嵜?{times}`);
    this.sendDataMultiple(sendText, times, interval);
  },

  _flushPendingBleIntent() {
    const intent = this._pendingBleIntent;
    if (!intent || !intent.sendText) return;
    if (!this._canControlDevice()) return;
    console.log('馃摛 [钃濈墮] 閲嶈繛鍚庤ˉ鍙?, intent.sendText);
    this._bleVerifyRetryCount = 0;
    const ultra = isMtUltraCardModel(this.data.currentModel);
    this._bleVerifyPending = ultra && intent.verify ? intent.verify : null;
    this.sendDataMultiple(intent.sendText, intent.times || 3, intent.interval || 500);
  },

  _checkBleVerifyFromReadback(parsed) {
    if (!isMtUltraCardModel(this.data.currentModel)) return;
    if (!this._bleVerifyPending || !parsed) return;
    if (packetMatchesBleVerify(parsed, this._bleVerifyPending)) {
      this._bleVerifyPending = null;
      this._bleVerifyRetryCount = 0;
      return;
    }
    const retries = this._bleVerifyRetryCount || 0;
    if (retries >= 2) return;
    this._bleVerifyRetryCount = retries + 1;
    const intent = this._pendingBleIntent;
    if (!intent || !this._canControlDevice()) return;
    console.warn(`馃摛 [钃濈墮] 鍥炶涓嶄竴鑷达紝閲嶅彂(${this._bleVerifyRetryCount}/2)`, intent.sendText);
    setTimeout(() => {
      if (this._canControlDevice() && this._pendingBleIntent === intent) {
        this.sendDataMultiple(intent.sendText, intent.times || 3, intent.interval || 500);
      }
    }, 500);
  },

  _resolveMagSettingSendText(key, targetVal, isF2Ble, isMtUltra, isF1Max) {
    if (isF2Ble) {
      if (key === 'faultDetect') {
        if (isMtUltra) {
          return targetVal === 'left' ? '寮€鍚牭杞娴? : (targetVal === 'right' ? '鍏抽棴鍫佃浆妫€娴? : '');
        }
        return targetVal === 'left' ? '寮€鍚嚜妫€' : (targetVal === 'right' ? '鍏抽棴鑷' : '');
      }
      if (key === 'selfRepair' && isMtUltra) {
        return targetVal === 'left' ? '寮€鍚數鏈烘娴? : (targetVal === 'right' ? '鍏抽棴鐢垫満妫€娴? : '');
      }
      if (key === 'powerOn') {
        if (isMtUltra) {
          // 鍚屾 Ultra 鍥轰欢锛歎I 宸?涓婄炕/鍙?涓嬬炕锛屼笌鍥轰欢鎸囦护宸﹀彸瀵硅皟
          return targetVal === 'left' ? '寮€鏈轰笅缈? : (targetVal === 'right' ? '寮€鏈轰笂缈? : '');
        }
        return targetVal === 'left' ? '寮€鏈轰笂缈? : (targetVal === 'right' ? '寮€鏈轰笅缈? : '');
      }
      if (key === 'shutdown') {
        return targetVal === 'left' ? '鎵撳紑鏀跺洖' : (targetVal === 'right' ? '鍏抽棴鏀跺洖' : '');
      }
      if (key === 'travelMode' && isMtUltra) {
        return targetVal === 'left' ? '鍏抽棴鍑鸿' : (targetVal === 'right' ? '寮€鍚嚭琛? : '');
      }
      if (key === 'smoothMode' && isMtUltra) {
        return targetVal === 'left' ? '寮€鍚钩婊? : (targetVal === 'right' ? '鍏抽棴骞虫粦' : '');
      }
      if (key === 'stealthBtnExit' && isMtUltra) {
        return targetVal === 'left' ? '鍏佽鎸夐挳閫€鍑? : (targetVal === 'right' ? '绂佹鎸夐挳閫€鍑? : '');
      }
    }
    if (isF1Max) {
      if (key === 'powerOn') {
        return targetVal === 'left' ? '寮€鏈轰笂缈? : (targetVal === 'right' ? '寮€鏈轰笅缈? : '');
      }
      if (key === 'shutdown') {
        return targetVal === 'left' ? '鎵撳紑鏀跺洖' : (targetVal === 'right' ? '鍏抽棴鏀跺洖' : '');
      }
    }
    return '';
  },

  _queueMagSettingSend(sendText, key, targetVal, label) {
    if (!sendText) return;
    if (!this.data.hasShownSettingsIndicatorModal && !this._shouldSkipIndicatorModal()) {
      this.setData({
        showIndicatorCheckModal: true,
        indicatorCheckModalClosing: false,
        hasShownSettingsIndicatorModal: true,
        pendingSendData: {
          type: 'settings',
          sendText,
          key,
          targetVal,
          label
        }
      });
      return;
    }
    const isUltra = isMtUltraCardModel(this.data.currentModel);
    if (!isUltra) {
      console.log(`馃摛 [钃濈墮] ${label || '楂樼骇璁剧疆'} 鍙戦€併€?{sendText}銆嶏紙杩炵画3娆★紝闂撮殧0.5绉掞級`);
      this.sendDataMultiple(sendText, 3, 500);
      wx.vibrateShort({ type: 'light' });
      return;
    }
    this._commitBleCommandAfterUi({
      sendText,
      times: 1,
      interval: 500,
      verify: this._buildSettingBleVerify(key, targetVal),
      label: label || '楂樼骇璁剧疆'
    });
  },

  _clearBleSendQueue() {
    this._f3CancelHeightCharTimers();
    this._bleSendQueue = [];
    this._bleSendDraining = false;
    this._f3HeightBleTxActive = false;
    this._onBleSendQueueIdle();
  },

  _enqueueBleSend(text, gapAfterMs = BLE_SEND_GAP_MS) {
    if (!text) return;
    if (!this._bleSendQueue) this._bleSendQueue = [];
    this._bleSendQueue.push({ text, gapAfterMs });
    this._drainBleSendQueue();
  },

  _enqueueBleSendBurst(text, count, gapAfterMs = BLE_ANGLE_STEP_GAP_MS) {
    const n = Math.max(0, Number(count) || 0);
    for (let i = 0; i < n; i++) {
      this._enqueueBleSend(text, gapAfterMs);
    }
  },

  _drainBleSendQueue() {
    if (this._bleSendDraining) return;
    if (!this._bleSendQueue || !this._bleSendQueue.length) return;

    const runNext = () => {
      if (!this._bleSendQueue || !this._bleSendQueue.length) {
        this._bleSendDraining = false;
        this._onBleSendQueueIdle();
        return;
      }
      if (!this._isBleWriteReady()) {
        this._bleSendDraining = false;
        return;
      }
      const item = this._bleSendQueue.shift();
      const arrayBuffer = this.stringToArrayBuffer(item.text);
      this.writeBleDataPromise(arrayBuffer).then((ok) => {
        if (!ok) {
          this._bleSendDraining = false;
          return;
        }
        if (this._bleSendQueue.length) {
          setTimeout(runNext, item.gapAfterMs || BLE_SEND_GAP_MS);
        } else {
          this._bleSendDraining = false;
          this._onBleSendQueueIdle();
        }
      });
    };

    this._bleSendDraining = true;
    runNext();
  },

  // 鏍稿績鍙戦€佹柟娉?  writeBleData(arrayBuffer) {
    if (!this._isBleWriteReady()) {
      console.log('鉂?[钃濈墮] 璁惧鏈繛鎺ユ垨鐗瑰緛鍊兼湭鎵惧埌');
      return false;
    }
    const ble = this.ble;
    wx.writeBLECharacteristicValue({
      deviceId: ble.device.deviceId,
      serviceId: ble.serviceId,
      characteristicId: this._getBleWriteCharacteristicId(),
      value: arrayBuffer,
      success: (res) => {
        console.log('鉁?[钃濈墮] 鍙戦€佹垚鍔?', res.errMsg);
      },
      fail: (err) => {
        console.log('鉂?[钃濈墮] 鍙戦€佸け璐?', err.errMsg);
      }
    });
    return true;
  },

  // 鍙戦€佸瓧绗︿覆鏁版嵁锛堢粡闃熷垪涓茶鍐欏嚭锛岄伩鍏?BLE 杩炲彂绮樺寘锛?  sendData(text, gapAfterMs) {
    if (this.data.remoteAssistRole === 'admin' && this.data.remoteAssistSessionId) {
      // 閫氳繃 _remoteAssistEnqueueCommand 涓户鍙戦€?      // 闃叉濡傛灉璋冪敤鏂硅嚜韬凡缁忔湁寰幆鎴栭噸璇曪紝杩欓噷鍐嶆帓闃熶細鍫嗙Н
      this._remoteAssistEnqueueCommand(text, 1, 0);
      return;
    }
    if (!this._isBleLinked()) return;
    this._enqueueBleSend(text, gapAfterMs != null ? gapAfterMs : BLE_SEND_GAP_MS);
  },

  // 杩炵画鍙戦€佸娆★紙鐢ㄤ簬 Max 鐗堟湰锛夛紝鍚屾牱璧伴槦鍒楅棿闅斿彂閫?  sendDataMultiple(text, times = 3, interval = 300) {
    if (this.data.remoteAssistRole === 'admin' && this.data.remoteAssistSessionId) {
      // 閬垮厤 enqueueCommand 鍜?timeout 宓屽瀵艰嚧鎸囦护涔樻柟鐖嗙偢
      // 鐩存帴浜ょ粰杩滃崗浜戠闃熷垪鍘诲惊鐜彂閫?      this._remoteAssistEnqueueCommand(text, times, interval);
      return;
    }
    if (!this._isBleLinked()) return;
    const gap = Math.max(interval, BLE_SEND_GAP_MS);
    for (let i = 0; i < times; i++) {
      this._enqueueBleSend(text, gap);
    }
  },

  // ===============================================
  // 馃敶 缁熶竴鐨勮嚜瀹氫箟寮圭獥鏂规硶锛堟浛鎹㈡墍鏈?wx.showModal 鍜?wx.showToast锛?  // ===============================================
  
  // 馃敶 缁熶竴鐨勮嚜瀹氫箟 Toast 鏂规硶锛堟浛鎹㈡墍鏈?wx.showToast锛?  _showCustomToast(title, icon = 'none', duration = 2000) {
    // 灏濊瘯鑾峰彇缁勪欢锛屾渶澶氶噸璇?娆?    const tryShow = (attempt = 0) => {
      const toast = this.selectComponent('#custom-toast');
      if (toast && toast.showToast) {
        toast.showToast({ title, icon, duration });
      } else if (attempt < 3) {
        // 寤惰繜閲嶈瘯
        setTimeout(() => tryShow(attempt + 1), 100 * (attempt + 1));
      } else {
        // 鏈€缁堥檷绾?        console.warn('[scan] custom-toast 缁勪欢鏈壘鍒帮紝浣跨敤闄嶇骇鏂规');
        wx.showToast({ title, icon, duration });
      }
    };
    tryShow();
  },

  // 馃敶 缁熶竴鐨勮嚜瀹氫箟 Modal 鏂规硶锛堟浛鎹㈡墍鏈?wx.showModal锛?  _showCustomModal(options) {
    // 灏濊瘯鑾峰彇缁勪欢锛屾渶澶氶噸璇?娆?    const tryShow = (attempt = 0) => {
      const toast = this.selectComponent('#custom-toast');
      if (toast && toast.showModal) {
        toast.showModal({
          title: options.title || '鎻愮ず',
          content: options.content || '',
          showCancel: options.showCancel !== false,
          confirmText: options.confirmText || '纭畾',
          cancelText: options.cancelText || '鍙栨秷',
          titleClass: options.titleClass || '',
          success: options.success
        });
      } else if (attempt < 3) {
        // 寤惰繜閲嶈瘯
        setTimeout(() => tryShow(attempt + 1), 100 * (attempt + 1));
      } else {
        // 鏈€缁堥檷绾?        console.warn('[scan] custom-toast 缁勪欢鏈壘鍒帮紝浣跨敤闄嶇骇鏂规');
        wx.showModal(options);
      }
    };
    tryShow();
  },

  _arrayBufferToUtf8(buffer) {
    const arr = new Uint8Array(buffer);
    let out = '';
    for (let i = 0; i < arr.length; i++) {
      out += String.fromCharCode(arr[i]);
    }
    return out;
  },

  _resetF2HwMonitorState(connected, model) {
    const m = model || this.data.currentModel;
    const isF3 = isF3MaxModel(m);
    return {
      f2HwMonitorVisible: connected && isHwPinMonitorModel(m),
      f2KeyOn: null,
      f2BtnPressed: null,
      f2KeyStatusText: '鈥?,
      f2BtnStatusText: '鈥?,
      f3HeightMonitorVisible: isF3,
      f3HeightMm: null,
      f3HeightText: connected ? '璇诲彇涓€? : '璇峰厛杩炴帴钃濈墮',
      f3HeightLive: false,
      f3DangerMm: 0,
      f3BaseMm: 0,
      f3DangerInput: '',
      f3BaseInput: '',
      f3DangerReadback: connected ? '璇诲彇涓€? : '鏈缃?,
      f3BaseReadback: connected ? '璇诲彇涓€? : '鏈缃?,
      f3CalCountdown: 0,
      f3PlateItm: null,
      f3DangerBlocked: false,
      f3HeightConfigLocked: false,
      f3ShowCalOverlay: false,
      f3CalStep: '',
      f3CalBranch: '',
      f3CalTitle: '鑷姩鏍囧畾',
      f3CalDesc: '',
      f3CalTargetLabel: '',
      f3CalLiveText: '',
      f3CalMedianText: '',
      f3CalResultText: '',
      f3CalStatusText: '',
      f3CalShowHoldModal: false
    };
  },

  _f2FaultAckStorageKey() {
    const sn = this.data.currentConnectedRawSn
      || this.normalizeSnFromBluetoothName(this.data.connectedDeviceName || '')
      || this.data.connectedDeviceName
      || 'default';
    return `f2_fault_ack_${sn}`;
  },

  _isF2FaultErrAcked(err) {
    const e = parseInt(err, 10) || 0;
    if (e <= 0) return true;
    try {
      return String(wx.getStorageSync(this._f2FaultAckStorageKey())) === String(e);
    } catch (ex) {
      return false;
    }
  },

  _markF2FaultErrAcked(err) {
    const e = parseInt(err, 10) || 0;
    if (e <= 0) return;
    try {
      wx.setStorageSync(this._f2FaultAckStorageKey(), String(e));
    } catch (ex) { /* ignore */ }
  },

  _clearF2FaultErrAcked() {
    try {
      wx.removeStorageSync(this._f2FaultAckStorageKey());
    } catch (ex) { /* ignore */ }
  },

  _setupF2FaultBleListener() {
    this._f2BleRxLine = '';
    this._f2LastFaultKey = '';
    this._f2FaultConnectPending = true;
    this._f2AdvSyncPending = true;
    this._f2ForceStatusSyncPending = true;
    if (!this.ble) return;
    this.ble.onDataReceived = (buffer) => this._onF2BleDataReceived(buffer);
    const connectPatch = {
      f2TravelReadbackText: '璇诲彇涓€?,
      f2DelayPowerReadbackText: '璇诲彇涓€?,
      flapPanelState: 'unknown',
      flapPanelStateText: '鍚屾涓€?,
      ...this._resetF2HwMonitorState(true)
    };
    this.setData(connectPatch);
  },

  _teardownF2FaultBleListener() {
    this._stopF2DemoMode(false);
    this._f2BleRxLine = '';
    this._f2LastFaultKey = '';
    this._f2FaultConnectPending = false;
    this._f2AdvSyncPending = false;
    this._f2ForceStatusSyncPending = false;
    if (this.ble) this.ble.onDataReceived = null;
    this._resetFlapPanelState();
    this.setData({
      f2TravelReadbackText: '璇诲彇涓€?,
      f2DelayPowerReadbackText: '璇诲彇涓€?,
      ...this._resetF2HwMonitorState(false)
    });
  },

  _onF2BleDataReceived(buffer) {
    if (!buffer || !isF2MaxStatusBleModel(this.data.currentModel)) return;
    this._f2LastBleRxAt = Date.now();
    this._f2BleRxLine += this._arrayBufferToUtf8(buffer);
    const parts = this._f2BleRxLine.split('\n');
    this._f2BleRxLine = parts.pop() || '';
    parts.forEach((line) => {
      const trimmed = (line || '').trim();
      if (!trimmed) return;
      this._handleF2BleStatusLine(trimmed);
    });
  },

  _handleF2BleStatusLine(line) {
    const trimmed = (line || '').trim();
    const parsed = parseF2StatusLine(trimmed);
    if (!parsed) return;
    const forcePopup = !!this._f2FaultConnectPending;
    if (forcePopup) this._f2FaultConnectPending = false;

    if ((parsed.err || 0) === 0) {
      this._clearF2FaultErrAcked();
    }

    if (forcePopup) {
      let queue = buildF2ConnectModalQueue(parsed);
      if ((parsed.err || 0) > 0 && this._isF2FaultErrAcked(parsed.err)) {
        queue = queue.filter((p) => p.kind !== 'error');
      }
      if (queue.length) this._showF2ConnectModalQueue(queue);
      this._f2LastFaultKey = `${parsed.err}:${parsed.wrn}`;
    } else if ((parsed.wrn || 0) > 0) {
      this._maybeShowF2FaultPopup(0, parsed.wrn, false);
    } else {
      this._f2LastFaultKey = '0:0';
    }
    this._syncF2StatusFromPacket(parsed);
  },

  _syncF2StatusFromPacket(parsed) {
    if (!isF2MaxStatusBleModel(this.data.currentModel)) return;
    const model = this.data.currentModel;
    const isUltra = isMtUltraCardModel(model);
    const forceFull = !!this._f2ForceStatusSyncPending;
    const forceAdv = forceFull || !!this._f2AdvSyncPending;
    const updates = buildF2AdvUiUpdates(parsed, {
      isMtUltraCard: isUltra,
      currentState: this.data.settingState,
      delayPowerOffOptions: this.data.delayPowerOffOptions,
      force: forceAdv,
      currentUi: {
        f2TravelModeOn: this.data.f2TravelModeOn,
        delayPowerOffIndex: this.data.delayPowerOffIndex,
        f2TravelReadbackText: this.data.f2TravelReadbackText,
        f2DelayPowerReadbackText: this.data.f2DelayPowerReadbackText,
        travelHoldMin: this.data.travelHoldMin,
        travelDurationHours: this.data.travelDurationHours,
        travelModeTip: this.data.travelModeTip
      }
    });

    if (updates.travelHoldMin != null && isUltra) {
      updates.travelHoldIndex = f2TravelHoldIndexByMin(updates.travelHoldMin);
      try { wx.setStorageSync('f2_travel_hold_min', updates.travelHoldMin); } catch (e) { /* ignore */ }
    }
    if (updates.travelDurationHours != null && isUltra) {
      updates.travelDurationIndex = f2TravelDurationIndexByHours(updates.travelDurationHours);
      try { wx.setStorageSync('f2_travel_duration_hours', updates.travelDurationHours); } catch (e) { /* ignore */ }
    }

    if (forceAdv) {
      this._f2AdvSyncPending = false;
    }

    if (isUltra) {
      Object.assign(updates, buildF2FlapPanelUpdates(parsed, {
        flapPanelState: this.data.flapPanelState,
        flapPanelStateText: this.data.flapPanelStateText,
        flapMotionDir: this.data.flapMotionDir
      }, { force: forceFull }));

      if (updates.flapPanelState === 'moving') {
        this._f2MotionGraceUntil = Date.now() + 8000;
      } else if (updates.flapPanelState === 'open' || updates.flapPanelState === 'closed' || updates.flapPanelState === 'fault') {
        this._f2MotionGraceUntil = 0;
      }

      if (this._f2DemoActive && updates.flapPanelState !== undefined) {
        this._onF2DemoFlapStable(updates.flapPanelState);
      }

      if (parsed.spd !== null && parsed.spd >= 10 && parsed.spd <= 100) {
        if (forceAdv || parsed.spd !== this.data.f2ServoSpeed) {
          Object.assign(updates, buildF2ServoSpeedUi(parsed.spd));
          try {
            wx.setStorageSync('f2_servo_speed', parsed.spd);
          } catch (e) { /* ignore */ }
        }
      }
    } else {
      delete updates.f2TravelModeOn;
      delete updates.travelModeTip;
      delete updates.travelHoldMin;
      delete updates.travelHoldIndex;
      delete updates.travelDurationHours;
      delete updates.travelDurationIndex;
      delete updates.travelKeyOffIndex;
      delete updates.f2TravelReadbackText;
      delete updates.f2DelayPowerReadbackText;
      delete updates.delayPowerOffIndex;
      delete updates.delayPowerOffTip;
    }

    Object.assign(updates, buildF2HwMonitorUpdates(parsed, {
      f2KeyOn: this.data.f2KeyOn,
      f2BtnPressed: this.data.f2BtnPressed,
      force: forceFull
    }));

    Object.assign(updates, buildF3HeightMonitorUpdates(parsed, {
      f3HeightMm: this.data.f3HeightMm,
      force: forceFull
    }));

    if (this._f3CalSampling) {
      let liveMm = null;
      if (updates.f3HeightMm != null) {
        liveMm = Math.round(Number(updates.f3HeightMm));
      } else if (parsed.hgt != null && parsed.hgt !== undefined) {
        liveMm = Math.round(Number(parsed.hgt));
      } else if (this.data.f3HeightMm != null) {
        liveMm = Math.round(Number(this.data.f3HeightMm));
      }
      if (liveMm > 0) {
        updates.f3CalLiveText = this._f3CalFormatLive(liveMm);
      }
    }

    Object.assign(updates, buildF3HeightSettingsUpdates(parsed, {
      f3DangerMm: this.data.f3DangerMm,
      f3BaseMm: this.data.f3BaseMm,
      f3HeightConfigModeOn: this.data.f3HeightConfigModeOn,
      force: forceFull || !!this._f3HeightWritePending
    }));

    if (isF3MaxModel(this.data.currentModel)) {
      const itm = parsed.itm;
      if (itm === 0 || itm === 1 || itm === 2) {
        updates.f3PlateItm = itm;
      }
      updates.f3HeightConfigLocked = false;
      if (itm === 1 || itm === 2) {
        updates.f3HeightLive = false;
      } else if (itm === 0 && (parsed.hgt === null || parsed.hgt === undefined)) {
        updates.f3HeightLive = false;
        if (forceFull || this.data.f3HeightMm == null) {
          updates.f3HeightText = '璇诲彇涓€?;
        }
      }
      if (this.data.f3ShowCalOverlay && this._f3CalSampling) {
        let hgtMm = null;
        if (parsed.hgt != null && parsed.hgt !== undefined) {
          const p = Math.round(Number(parsed.hgt));
          if (p > 0) hgtMm = p;
        }
        if (hgtMm == null && updates.f3HeightMm != null) {
          const u = Math.round(Number(updates.f3HeightMm));
          if (u > 0) hgtMm = u;
        }
        if (hgtMm != null) this._f3CalTryPushSample(hgtMm);
      }
    }

    if (forceFull) {
      this._f2ForceStatusSyncPending = false;
    }

    this._trySyncAngleEditorsFromBle(parsed);

    if (!isHwPinMonitorModel(this.data.currentModel)) {
      delete updates.f2KeyOn;
      delete updates.f2BtnPressed;
      delete updates.f2KeyStatusText;
      delete updates.f2BtnStatusText;
      delete updates.f2HwMonitorVisible;
    }

    if (!isF3MaxModel(this.data.currentModel)) {
      delete updates.f3HeightMm;
      delete updates.f3HeightText;
      delete updates.f3HeightLive;
      delete updates.f3HeightMonitorVisible;
      delete updates.f3DangerMm;
      delete updates.f3BaseMm;
      delete updates.f3DangerReadback;
      delete updates.f3BaseReadback;
      delete updates.f3CalCountdown;
      delete updates.f3DangerBlocked;
      delete updates.f3HeightConfigLocked;
      delete updates.f3PlateItm;
      delete updates.f3ShowCalOverlay;
      delete updates.f3CalTargetLabel;
    }

    if (updates._f3CalJustFinished) {
      delete updates._f3CalJustFinished;
    }
    const f3CalDismissToast = updates._f3CalDismissToast;
    if (f3CalDismissToast) delete updates._f3CalDismissToast;

    if (Object.keys(updates).length) {
      this._stripConflictingBleReadback(updates);
    }

    if (Object.keys(updates).length) {
      if (isUltra) {
        const nextState = updates.settingState || this.data.settingState;
        Object.assign(updates, buildF2StealthUiFlags(
          model,
          nextState,
          resolveF2BleLinkedForUi({ ...this.data, ...updates, settingState: nextState })
        ));
      }
      this._patchFlapGaugeSnap(updates);
      const shouldReleaseGaugeSnap = !!updates.flapGaugeSnap;
      const f3CalJustFinished = !!updates._f3CalJustFinished;
      if (f3CalJustFinished) delete updates._f3CalJustFinished;
      this.setData(updates, () => {
        if (shouldReleaseGaugeSnap) this._releaseFlapGaugeSnap();
        if (updates.f3ShowCalOverlay === false) this._clearF3CalTimer();
        if (f3CalDismissToast) {
          this._clearF3CalTimer();
          this._showCustomToast(f3CalDismissToast.text, f3CalDismissToast.type || 'none', f3CalDismissToast.duration || 2000);
        }
      });
      if (isUltra && updates.flapPanelState !== undefined) {
        this._publishFlapToVoiceBridge(
          updates.flapPanelState,
          updates.flapPanelStateText != null
            ? updates.flapPanelStateText
            : this.data.flapPanelStateText
        );
      }
      this._scheduleRemoteStatePush();
      if (isUltra && updates.settingState) {
        try {
          wx.setStorageSync('f2_ultra_adv_settingState', updates.settingState);
        } catch (e) { /* ignore */ }
      }
      if (updates.delayPowerOffIndex !== undefined) {
        const opt = this.data.delayPowerOffOptions[updates.delayPowerOffIndex];
        if (opt) {
          try {
            wx.setStorageSync('f2_delayPowerOffIndex', updates.delayPowerOffIndex);
            wx.setStorageSync('f2_delayPowerOffMinutes', opt.minutes);
          } catch (e) { /* ignore */ }
        }
      }
    }
    this._checkBleVerifyFromReadback(isUltra ? parsed : null);
  },

  _maybeShowF2FaultPopup(err, wrn, forcePopup) {
    const key = `${err}:${wrn}`;
    if (!err && !wrn) {
      this._f2LastFaultKey = key;
      return;
    }
    if (!forcePopup && key === this._f2LastFaultKey) return;
    this._f2LastFaultKey = key;

    const showWarn = () => {
      const warnPayload = buildF2FaultModalPayload(0, wrn);
      if (warnPayload) this._showF2FaultModal(warnPayload);
    };

    const errPayload = buildF2FaultModalPayload(err, 0);
    if (errPayload) {
      this._showF2FaultModal(errPayload, () => {
        if (wrn > 0) showWarn();
      });
    } else if (wrn > 0) {
      showWarn();
    }
  },

  _showF2ConnectModalQueue(queue) {
    const list = Array.isArray(queue) ? queue : [];
    const showNext = (idx) => {
      if (idx >= list.length) return;
      this._showF2FaultModal(list[idx], () => showNext(idx + 1));
    };
    showNext(0);
  },

  _showF2FaultModal(payload, afterClose) {
    this._showCustomModal({
      title: payload.title,
      content: payload.content,
      showCancel: false,
      confirmText: '鐭ラ亾浜?,
      titleClass: payload.kind === 'warn' ? 'warn' : (payload.kind === 'error' ? 'error' : (payload.kind === 'info' ? 'info' : '')),
      success: () => {
        if (payload.kind === 'error' && payload.errCode > 0) {
          this._markF2FaultErrAcked(payload.errCode);
          this._ackF2FaultReportToDevice();
        }
        if (typeof afterClose === 'function') afterClose();
      }
    });
  },

  _ackF2FaultReportToDevice() {
    if (!this._isBleLinked()) return;
    this.sendData(F2_FAULT_ACK_CMD, 80);
  },
});
