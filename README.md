# 스마트 금융 계산기 & 마이페이지

예금, 적금, 대출 상환액을 세후 실수령액 기준으로 간편하게 계산하고 조건별로 비교할 수 있는 모바일 웹 애플리케이션입니다.

## 폴더 구조

```
├── index.html          # 메인 HTML 문서
├── css/
│   └── style.css       # 커스텀 스타일시트
└── js/
    ├── tailwind.config.js  # Tailwind CSS 테마 설정
    └── app.js              # 핵심 계산, 인증, 마이페이지 로직
```

## GitHub Pages 배포 방법

1. 이 저장소의 파일들을 GitHub Repository에 업로드합니다.
2. Repository의 **Settings > Pages** 메뉴로 이동합니다.
3. **Source**에서 `Deploy from a branch`를 선택하고 `main` 브랜치의 `/ (root)` 폴더를 저장합니다.
