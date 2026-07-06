const svg = `<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
<circle cx="24" cy="24" r="22" fill="#E1F5FE"/>
<path d="M18 19C18 15.6863 20.6863 13 24 13C27.3137 13 30 15.6863 30 19C30 22 27.5 23.5 25.5 25C24.5 25.75 24 26.5 24 28" stroke="#03A9F4" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
<circle cx="24" cy="35" r="2.5" fill="#03A9F4"/>
</svg>`;
console.log('data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64'));
