// Tailwind CDN(개발용) 경고 메시지만 콘솔에서 숨김
(function(){ var w = console.warn; console.warn = function(){ if (arguments[0] && String(arguments[0]).indexOf('cdn.tailwindcss.com should not be used in production') > -1) return; return w.apply(console, arguments); }; })();
