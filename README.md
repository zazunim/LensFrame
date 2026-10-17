# 렌즈프레임 (LensFrame) 📸

> **사진의 EXIF 메타데이터를 기반으로 감성적인 액자 프레임을 생성해 주는 초경량 Windows 데스크톱 유틸리티**  
> *A lightweight Windows photo EXIF framing & batch processing desktop utility built with Tauri v2 + React.*

---

## ✨ 주요 기능 (Key Features)

- 🔍 **자동 EXIF 메타데이터 추출 & 수동 편집**: 카메라 기종, 렌즈명, 초점거리(35mm 환산), 조리개(F값), 셔터스피드, ISO, 촬영 일시 자동 인식 및 자유로운 편집
- 🖼️ **8가지 감성 프레임 테마**:
  - `Classic One Line`: 하단 중앙 정갈한 단일 스펙 라인
  - `Modern Two Line`: 좌측 기종/렌즈 + 우측 촬영 파라미터 분할
  - `Shot on Brand`: Sony, Leica, Canon, Nikon, Fujifilm, Apple, Samsung 등 고품질 벡터 로고 뱃지
  - `Polaroid Style`: 아날로그 감성의 넓은 하단 여백 프레임
  - `Minimal Border`: 얇고 세련된 미니멀 프레임
  - `35mm Film`: 아날로그 필름 퍼포레이션 구멍과 오렌지 롤 스탬프
  - `Cinemascope`: 2.39:1 시네마틱 레터박스와 영화 자막 스타일
  - `Just Frame`: 텍스트 없는 순수 전시회 갤러리 액자
- 🔤 **폰트 크기 4단계 조절 (`S` / `M` / `L` / `XL`)**: 사진 여백 비율에 맞춰 원클릭 최적화
- 📂 **드래그 앤 드롭 & 다중 이미지 일괄 처리 (Batch Processing)**:
  - 탐색기에서 사진을 창으로 끌어다 놓으면 즉시 로드 (새로 추가된 사진 자동 포커스)
  - 하단 필름 스트립(Film Strip)으로 개별 사진 선택 및 수정
  - **전체 N장 일괄 ZIP 압축 저장** 지원 (변환 진행률 표시)
- 💾 **프로급 내보내기 설정 (Export Settings)**:
  - 파일 형식 선택: `JPEG` / `PNG (무손실)` / `WebP (고효율 초경량)`
  - 화질 및 압축률 슬라이더 조절 (75% ~ 100%)
  - 해상도 리사이징: 원본 100%, 75%, 50%, **인스타그램 최적화 가로 2048px**
  - 저장 위치 선택 다이얼로그(`다른 이름으로 저장...`) 완벽 연동
- 🌍 **전 세계 6개 국어 지원 (i18n)**:
  - 🇰🇷 한국어 / 🇺🇸 English / 🇯🇵 日本語 / 🇨🇳 简体中文 / 🇪🇸 Español / 🇩🇪 Deutsch (시스템 언어 자동 감지)
- 🎒 **무설치 포터블 단일 실행 파일 (`LensFrame-Portable.exe`)**:
  - 단 10MB 크기, 관리자 권한/설치 과정 없이 USB에 넣고 어디서든 더블 클릭 즉시 실행

---

## 🚀 빠른 시작 (개발 모드)

```bash
# 의존성 설치
npm install

# 1. 웹 개발 서버 실행 (실시간 프리뷰 테스트)
npm run dev:web

# 2. Windows 데스크톱 앱 개발 모드 실행
npm run tauri:dev
```

---

## 📦 포터블 실행 파일 빌드

```bash
npm run build:portable
```
*빌드가 완료되면 `dist-portable/LensFrame-Portable.exe` 및 `.zip` 파일이 생성됩니다.*

---

## 📜 라이선스 (License)

이 프로젝트는 [GNU General Public License v3.0 (GPL-3.0)](LICENSE) 라이선스를 따릅니다.  
기반 오픈소스 프로젝트: [jeonghyeon-net/exif-frame](https://github.com/jeonghyeon-net/exif-frame) (GPL-3.0)
