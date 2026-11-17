// Tailwind CDN(개발용) 경고 메시지만 콘솔에서 숨김
(function () {
    var w = console.warn;
    console.warn = function () {
        if (arguments[0] && String(arguments[0]).indexOf('cdn.tailwindcss.com should not be used in production') > -1) return;
        return w.apply(console, arguments);
    };
})();

window.tailwind = window.tailwind || {};
window.tailwind.config = {
    theme: {
        extend: {
            colors: {
                brand: {
                    50: '#eef2ff',
                    100: '#e0e7ff',
                    500: '#6366f1',
                    600: '#4f46e5',
                    700: '#4338ca',
                }
            },
            fontFamily: {
                sans: ['Inter', 'Apple SD Gothic Neo', 'Malgun Gothic', 'sans-serif'],
            }
        }
    }
};
